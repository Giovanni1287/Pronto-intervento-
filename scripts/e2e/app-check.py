#!/usr/bin/env python3
"""
Test nel browser delle aree riservate (Chrome headless + Playwright).
1) Build normale (backend NON configurato): le aree dichiarano di non essere attive.
2) Build di test con URL Supabase fittizio: le risposte del backend sono SIMULATE
   SOLO in questo test tramite intercettazione di rete, per verificare i flussi
   dell'interfaccia (nessun dato finto viene mai incluso nel sito).
Aggiunge l'esito a reports/test-report.md.
"""
import json, os, re, subprocess, time
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PORT = 4392
BASE = f'http://localhost:{PORT}'
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
MOCK = 'https://mock.supabase.test'
# funzionalità tutte attive SOLO nella build di test con backend simulato (Prompt 9)
ALL_FLAGS = '{"customer_registration":true,"customer_login":true,"family":true,"business":true,"hotel":true,"corporate":true,"protected_work":true,"online_purchases":true,"mypos":true,"technician_dashboard":true,"pronto_ai":true,"pronto_seo":true,"notifications":true}'
results = []
def rec(g, n, ok, d=''): results.append((g, n, bool(ok), str(d)))

def build(env_extra):
    subprocess.run(['node', 'scripts/build.js'], cwd=ROOT, env={**os.environ, **env_extra}, check=True, stdout=subprocess.DEVNULL)

def serve():
    return subprocess.Popen(['node', 'scripts/serve.js'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT), 'SERVE_CSP_EXTRA': MOCK}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# ------------------------------------------------------------------ dati del backend simulato
U_CLIENT, U_ADMIN, U_TECH = 'u-client', 'u-admin', 'u-tech'
INT = {'id': 'i1', 'number': 'INT-2026-TEST01', 'status': 'verified', 'completed_at': '2026-11-10T10:00:00Z', 'scheduled_at': '2026-11-10T08:00:00Z',
       'service': {'name': 'Spurgo lavandini', 'category': {'name': 'Idraulica'}}, 'property': {'address_line': 'Via Test 1', 'city': 'Roma'},
       'report': {'work_description': 'Pulizia sifone e sondatura del tratto a muro', 'materials': []}}
STATE = {'role': 'customer', 'calls': [], 'payment_status': 'pending', 'b2b_role': 'company_admin'}
U_B2B = 'u-b2b'
ACC = {'id': 'acc1', 'legal_name': 'Hotel Alfa Srl', 'kind': 'hotel', 'vat_number': '01234567897', 'pec': 'alfa@pec.test', 'sdi_code': 'ABC1234', 'billing_address': 'Via Alfa 1', 'billing_city': 'Roma', 'billing_postal_code': '00100', 'active': True,
       'locations': [{'count': 2}], 'members': [{'count': 2}]}
LOCS = [{'id': 'l1', 'account_id': 'acc1', 'code': 'HTL-01', 'name': 'Hotel Alfa Centro', 'address_line': 'Via Alfa 1', 'city': 'Roma', 'kind': 'hotel', 'contact_name': 'Sara', 'contact_phone': '06000', 'active': True},
        {'id': 'l2', 'account_id': 'acc1', 'code': 'HTL-02', 'name': 'Hotel Alfa Prati', 'address_line': 'Via Alfa 2', 'city': 'Roma', 'kind': 'hotel', 'contact_name': None, 'contact_phone': None, 'active': True}]
B2B_REQ = {'id': 'r1', 'number': 'RIB-2026-TEST01', 'account_id': 'acc1', 'location_id': 'l1', 'contract_id': 'k1', 'category_id': 'idraulica', 'problem_type': 'Scarico lento', 'declared_urgency': 'normal',
           'description': 'Lavabo camera 12 lento', 'status': 'submitted', 'created_by': U_B2B, 'created_at': '2026-11-16T09:00:00Z', 'scheduled_at': None, 'account': {'legal_name': 'Hotel Alfa Srl'}, 'settlement': None}
CTR = {'id': 'k1', 'number': 'CTR-2026-TEST01', 'status': 'awaiting_client', 'line': 'hotel', 'starts_at': None, 'ends_at': None, 'payment_plan': 'annual', 'quarterly_approved': False, 'auto_renew': False, 'account': {'legal_name': 'Hotel Alfa Srl', 'kind': 'hotel'}}
CTR_VIEW = {'number': 'CTR-2026-TEST01', 'status': 'awaiting_client', 'line': 'hotel', 'version': 1, 'versionStatus': 'approved', 'versionId': 'kv1', 'priceNetCents': 490000, 'vatRate': 22, 'durationMonths': 12,
            'terms': {'benefits': {'callFee': 8, 'maintenanceMinutes': 720, 'scheduledVisits': 4}}, 'locations': [{'id': 'l1', 'code': 'HTL-01', 'name': 'Hotel Alfa Centro'}]}

def handler_factory(page_state):
    def handle(route):
        req = route.request
        u = urlparse(req.url); path = u.path; m = req.method
        body = None
        try: body = json.loads(req.post_data) if req.post_data else None
        except Exception: body = req.post_data
        STATE['calls'].append((m, path + ('?' + u.query if u.query else ''), body))
        uid = {'customer': U_CLIENT, 'admin': U_ADMIN, 'technician': U_TECH, 'b2b': U_B2B}[STATE['role']]
        def ok(data, status=200): return route.fulfill(status=status, content_type='application/json', body=json.dumps(data))
        if path == '/auth/v1/otp': return ok({})
        if path == '/auth/v1/verify': return ok({'access_token': 'tok', 'refresh_token': 'ref', 'expires_in': 3600})
        if path == '/auth/v1/user': return ok({'id': uid, 'email': 'utente@test.local'})
        if path == '/auth/v1/logout': return ok({})
        t = path.replace('/rest/v1/', '')
        # ---------------- B2B (simulazione dell'isolamento RLS: il referente di sede vede solo HTL-01)
        site_only = STATE['role'] == 'b2b' and STATE['b2b_role'] in ('site_contact', 'limited_user')
        if t == 'business_members' and m == 'GET': return ok([{'id': 'm1', 'account_id': 'acc1', 'role': STATE['b2b_role'], 'location_ids': ['l1'], 'account': {'id': 'acc1', 'legal_name': 'Hotel Alfa Srl', 'kind': 'hotel'}}])
        if t == 'business_accounts': return ok([ACC])
        if t == 'business_locations': return ok(LOCS[:1] if site_only else LOCS)
        if t == 'business_intervention_requests': return ok([B2B_REQ])
        if t == 'business_contracts': return ok([] if site_only else [CTR])
        if t == 'business_contract_locations': return ok([{'location_id': 'l1', 'contract_id': 'k1', 'location': LOCS[0]}])
        if t == 'business_contract_versions': return ok([{'id': 'kv1', 'version': 1, 'status': 'draft', 'price_net_cents': 490000, 'duration_months': 12, 'labor_cost_per_hour_cents': 3000, 'travel_cost_per_visit_cents': 2000, 'other_costs_cents': 0, 'terms': CTR_VIEW['terms'], 'internal_cost_cents': None, 'margin_pct': None, 'margin_warning': None, 'client_accepted_at': None}])
        if t == 'b2b_leads': return ok([{'id': 'ld1', 'number': 'LEAD-2026-TEST01', 'segment': 'hotel', 'company_name': 'Hotel Beta', 'contact_name': 'Bruno', 'email': 'b@beta.test', 'phone': '0600', 'locations_count': 2, 'zone': 'Roma', 'services': ['idraulica'], 'needs': 'Manutenzione camere', 'inspection_requested': True, 'status': 'new', 'notes': [], 'account_id': None, 'next_reminder_at': None, 'created_at': '2026-11-16T09:00:00Z'}])
        if t == 'business_quotes': return ok([{'id': 'q1', 'number': 'PRV-2026-TEST01', 'status': 'draft', 'title': 'Manutenzione 2 strutture', 'line': 'hotel', 'account_id': 'acc1', 'valid_until': '2026-12-17', 'net_cents': 0, 'labor_cost_per_hour_cents': 3000, 'travel_cost_per_visit_cents': 2000, 'other_costs_cents': 0, 'included_minutes': 0, 'included_visits': 0, 'duration_months': 12, 'payment_plan': 'annual', 'payment_terms': 'Pagamento annuale anticipato.', 'locations_covered': [], 'items': [], 'account': {'legal_name': 'Hotel Alfa Srl'}, 'margin_pct': None, 'internal_cost_cents': None}])
        if t in ('business_installments', 'maintenance_visits', 'business_request_events', 'service_reports', 'business_benefit_balances', 'technician_assignments', 'maintenance_checklists'): return ok([])
        if t == 'rpc/business_balances': return ok([])
        if t == 'rpc/business_quotes_list': return ok([])
        if t == 'rpc/business_contract_view': return ok(CTR_VIEW)
        if t == 'rpc/business_members_list': return ok([{'id': 'm1', 'role': STATE['b2b_role'], 'location_ids': ['l1'], 'active': True, 'full_name': 'Anna Direzione', 'email': 'anna@hotel-alfa.test'}])
        if t == 'rpc/create_business_requests': return ok([{'number': f'RIB-2026-N{i}'} for i, _ in enumerate(body.get('p_locations', []))])
        if t == 'profiles' and m == 'GET':
            if 'role=eq.customer' in u.query: return ok([{'id': U_CLIENT, 'full_name': 'Maria Bianchi', 'email': 'm@test.local', 'phone': '', 'marketing_consent': False, 'created_at': '2026-11-01', 'properties': [{'id': 'p1', 'address_line': 'Via Test 1', 'city': 'Roma'}]}])
            return ok([{'id': uid, 'role': 'customer' if STATE['role'] == 'b2b' else STATE['role'], 'full_name': 'Utente Test', 'email': 'utente@test.local', 'phone': '', 'marketing_consent': False}])
        if t == 'properties': return ok([{'id': 'p1', 'address_line': 'Via Test 1', 'city': 'Roma', 'postal_code': '00100'}])
        if t == 'contracts': return ok([{'id': 'c1', 'status': 'active', 'price_cents': 84900, 'starts_at': '2026-11-17', 'ends_at': '2027-11-17', 'snapshot': {'plan_name': 'Family Spurgo Plus'}, 'customer': {'full_name': 'Maria Bianchi'}}])
        if t == 'protected_purchases': return ok([])
        if t == 'entitlement_balances': return ok([{'contract_id': 'c1', 'purchase_id': None, 'type': 'intervention', 'remaining': 2}])
        if t == 'interventions':
            if STATE['role'] == 'technician': return ok([{**INT, 'status': 'scheduled', 'customer_id': U_CLIENT, 'customer': {'full_name': 'Maria Bianchi', 'phone': '333'}}])
            if STATE['role'] == 'admin' and 'select=status' in u.query: return ok([{'status': 'completed', 'service': {'category': {'name': 'Idraulica'}}}])
            if STATE['role'] == 'admin': return ok([{**INT, 'status': 'completed', 'customer': {'full_name': 'Maria Bianchi'}, 'technician_id': None, 'certificates': [], 'report': [{'work_description': 'Pulizia sifone', 'materials': [], 'technical_notes': None, 'duration_minutes': 40}]}])
            return ok([INT])
        if t == 'certificates': return ok([{'number': 'PIR-2026-7K4Q-9M2X', 'revision': 1, 'status': 'valid', 'issued_at': '2026-11-12', 'intervention_id': 'i1'}])
        if t in ('disputes', 'assistance_requests', 'scheduled_checks', 'promotions', 'audit_log', 'payments_x'): return ok([])
        if t == 'payments':
            if 'order_id=eq.' in u.query: return ok([{'status': STATE['payment_status'], 'amount_cents': 84900}])
            return ok([])
        if t == 'plans' and 'line=eq.family&select=id,name,active' in u.query:
            return ok([{'id': 'family-spurgo-plus', 'name': 'Family Spurgo Plus', 'active': True, 'owner_approved': STATE.get('sales', False), 'legal_reviewed': STATE.get('sales', False),
                        'versions': [{'id': 'v1', 'status': 'published', 'price_cents': 84900, 'vat_rate': 22, 'duration_months': 12, 'visits': 2, 'interventions': 2, 'checkups': 0, 'max_minutes': 60,
                                      'call_fee_included': True, 'materials_included': False, 'extra_labor_discount_pct': 15, 'included': ['2 spurghi ordinari fino a 60 minuti'], 'exclusions': ['Smaltimento rifiuti speciali']}]}])
        if t == 'plans':
            if 'line=eq.protected' in u.query and STATE['role'] == 'customer':
                return ok([{'id': 'protected-plus', 'name': 'Lavoro Protetto Plus', 'versions': [{'price_cents': 14900, 'duration_months': 12, 'included': ['1 visita preventiva'], 'status': 'published'}]}])
            return ok([{'id': 'family-spurgo-plus', 'name': 'Family Spurgo Plus', 'variant': 'standard', 'active': True, 'owner_approved': False, 'legal_reviewed': False, 'versions': [{'id': 'v1', 'version': 1, 'status': 'published', 'price_cents': 84900}, {'id': 'v2', 'version': 2, 'status': 'draft', 'price_cents': 84900}]}])
        if t == 'plan_versions' and m == 'GET':
            return ok([{'id': 'v2', 'plan_id': 'family-spurgo-plus', 'version': 2, 'status': STATE.get('vstatus', 'draft'), 'approved_at': '2026-11-18T10:00:00Z', 'approval_note': 'approvato dal titolare (test)', 'price_cents': 84900, 'duration_months': 12, 'visits': 2, 'interventions': 2, 'checkups': 0, 'max_minutes': 60, 'extra_labor_discount_pct': 15, 'included': ['2 spurghi'], 'exclusions': ['Smaltimento'], 'plan': {'name': 'Family Spurgo Plus', 'line': 'family'}}])
        if m == 'PATCH': return ok([{}])
        if t.startswith('rpc/'):
            fn = t[4:]
            if fn == 'create_dispute': return ok({'number': 'SEG-2026-ABC123', 'status': 'received'})
            if fn == 'publish_plan_version': return ok({'id': 'v2', 'status': 'published'})
            if fn == 'approve_plan_version': STATE['vstatus'] = 'approved'; return ok({'id': 'v2', 'status': 'approved'})
            if fn == 'submit_intervention_report': return ok({'id': 'r1'})
            return ok({})
        if t in ('company_settings',): return ok([{'id': 1, 'data': {'company_name': 'Pronto Intervento Roma', 'terms_version_family': 'bozza-2026-11'}, 'sales_enabled': STATE.get('sales', False)}])
        # ---------------- pagamenti (dashboard)
        if t == 'rpc/payments_report': return ok({'collectedGross': 84900, 'collectedNet': 69590, 'refunded': 0, 'reversed': 0, 'invoiced': 0, 'pendingGross': 14945, 'needsReview': 1,
            'activations': {'family_contract': 1}, 'failedAttempts': 0, 'cancelledAttempts': 1, 'expiring60': 0, 'byLine': {'family': {'gross': 84900, 'net': 69590}}, 'recurringNet': {'family': 69590, 'business': 0, 'hotel': 0, 'corporate': 0}})
        if t == 'orders' and STATE['role'] == 'admin':
            return ok([{'id': 'o1', 'number': 'ORD-ABCDEFGHJKMN', 'kind': 'family_contract', 'status': 'paid', 'description': 'PRONTO+ Family Spurgo Plus', 'net_cents': 69590, 'vat_cents': 15310, 'gross_cents': 84900,
                        'paid_cents': 84900, 'refunded_cents': 0, 'created_at': '2026-11-17T10:00:00Z', 'customer': {'full_name': 'Maria Bianchi'}, 'account': None, 'snapshot': {},
                        'tx': [{'provider': 'mypos', 'provider_ref': 'TRN-1', 'type': 'purchase', 'method': 'card', 'amount_cents': 84900, 'status': 'verified'}], 'inv': []},
                       {'id': 'o2', 'number': 'ORD-PQRSTVWXYZ12', 'kind': 'service', 'status': 'awaiting_payment', 'description': 'Intervento INT-2026-TEST01', 'net_cents': 12250, 'vat_cents': 2695, 'gross_cents': 14945,
                        'paid_cents': 0, 'refunded_cents': 0, 'created_at': '2026-11-17T11:00:00Z', 'customer': None, 'account': None, 'snapshot': {'customerName': 'Maria Bianchi'}, 'link_expires_at': '2026-12-01', 'tx': [], 'inv': []}])
        if t in ('payment_refunds', 'payment_reconciliation', 'business_intervention_requests_x'): return ok([])
        if t == 'rpc/create_service_order': return ok({'id': 'o3', 'number': 'ORD-NEWORDER1234', 'gross_cents': 14945, 'description': 'Intervento INT-2026-TEST01'})
        if t == 'rpc/issue_payment_link': return ok({'token': 'T' * 32, 'order_number': 'ORD-NEWORDER1234', 'expires_at': '2026-12-01'})
        if t in ('service_categories',): return ok([{'id': 'idraulica', 'name': 'Idraulica', 'active': True, 'services': [{'id': 'idraulica/spurgo-lavandini', 'name': 'Spurgo lavandini', 'active': True}]}])
        if t in ('technicians', 'services'): return ok([{'id': 't1', 'display_name': 'Luca Tecnico', 'name': 'Spurgo lavandini'}])
        return ok([])
    return handle

def fn_handler(route):
    u = urlparse(route.request.url)
    req = route.request
    body = None
    try: body = json.loads(req.post_data) if req.post_data else None
    except Exception: body = None
    STATE['calls'].append((req.method, u.path + '?' + u.query, body))
    def ok(data, status=200): return route.fulfill(status=status, content_type='application/json', body=json.dumps(data))
    if 'certificate-verify' in u.path:
        n = parse_qs(u.query).get('n', [''])[0]
        if n == 'PIR-2026-7K4Q-9M2X':
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'found': True, 'number': n, 'status': 'valid', 'revision': 1, 'valid': True, 'integrity': True, 'issuedAt': '2026-11-12', 'companyName': 'Pronto Intervento Roma', 'categoryName': 'Idraulica', 'serviceName': 'Spurgo lavandini', 'workDate': '2026-11-10', 'city': 'Roma', 'payloadHashShort': 'abcdef0123456789'}))
        return route.fulfill(status=404, content_type='application/json', body=json.dumps({'found': False}))
    if STATE.get('pay'):
        order = {'id': '7f1c2a10-0000-4000-8000-000000000001', 'number': 'ORD-ABCDEFGHJKMN', 'kind': 'service', 'status': 'awaiting_payment', 'description': 'Intervento INT-2026-TEST01 — Spurgo lavandini',
                 'product': 'Intervento INT-2026-TEST01 — Spurgo lavandini', 'netCents': 12250, 'vatCents': 2695, 'grossCents': 14945, 'paidCents': 0, 'termsVersion': 'bozza-2026-11', 'termsAccepted': False,
                 'canPay': True, 'customerName': 'Maria Bianchi', 'expiresAt': '2026-12-01T00:00:00Z',
                 'items': [{'description': 'Manodopera', 'quantity': 1.5, 'vatRate': 22, 'netCents': 6750, 'vatCents': 1485, 'grossCents': 8235}, {'description': 'Sifone', 'quantity': 2, 'vatRate': 22, 'netCents': 2500, 'vatCents': 550, 'grossCents': 3050},
                           {'description': 'Trasferta', 'quantity': 1, 'vatRate': 22, 'netCents': 3000, 'vatCents': 660, 'grossCents': 3660}]}
        if 'order-summary' in u.path:
            if req.headers.get('x-payment-link') != 'T' * 32 and 'id=' not in u.query: return ok({'error': 'invalid'}, 404)
            return ok({'order': order})
        if 'order-create' in u.path:
            return ok({'order': {**order, 'id': '7f1c2a10-0000-4000-8000-000000000002', 'kind': 'family_contract', 'grossCents': 84900, 'termsVersion': 'bozza-2026-11'}}, 201)
        if 'checkout-create' in u.path:
            amount = '149.45' if (body or {}).get('token') else '849.00'
            return ok({'orderId': 'ORD-ABCDEFGHJKMN', 'amountCents': 0, 'checkout': {'action': 'https://www.mypos.com/vmp/checkout-test', 'method': 'POST',
                       'params': {'IPCmethod': 'IPCPurchase', 'Amount': amount, 'OrderID': 'ORD-ABCDEFGHJKMN', 'Signature': 'TEST'}}})
        if 'payment-status' in u.path:
            STATE['polls'] = STATE.get('polls', 0) + 1
            paid = STATE['polls'] >= STATE.get('paid_after', 99)
            return ok({'number': 'ORD-ABCDEFGHJKMN', 'status': 'paid' if paid else 'awaiting_payment', 'grossCents': 84900, 'paidCents': 84900 if paid else 0, 'kind': 'family_contract',
                       'description': 'PRONTO+ Family Spurgo Plus', 'attemptStatus': 'returned', 'activation': {'type': 'family_contract', 'activatedAt': '2026-11-17T10:00:00Z'} if paid else None})
    return route.fulfill(status=503, content_type='application/json', body='{"error":"not_configured"}')

def new_page(browser, w=1280, h=900, logged=True):
    ctx = browser.new_context(viewport={'width': w, 'height': h})
    if logged:
        ctx.add_init_script("localStorage.setItem('pir.session', JSON.stringify({access_token:'tok',refresh_token:'ref',expires_at:Math.floor(Date.now()/1000)+3600}))")
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda c: errs.append(c.text) if c.type == 'error' and 'Failed to load resource' not in c.text else None)
    pg.route(f'{MOCK}/**', handler_factory(STATE))
    pg.route('**/.netlify/functions/**', fn_handler)
    pg.route('https://www.mypos.com/**', lambda r: (STATE.__setitem__('mypos_post', r.request.post_data), r.fulfill(status=200, content_type='text/html', body='<h1>MYPOS SANDBOX (simulato nel test)</h1>'))[1])
    pg.on('dialog', lambda d: d.accept('approvato dal titolare (test)') if d.type == 'prompt' else d.accept())
    return ctx, pg, errs

def overflow(pg): return pg.evaluate('document.documentElement.scrollWidth') - pg.viewport_size['width']

# ================================================================== 1. backend non configurato
build({})
srv = serve(); time.sleep(0.7)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    ctx, pg, errs = new_page(b, logged=False)
    for path, label in [('/area-cliente/', 'Area cliente'), ('/area-cliente/i-miei-interventi/', 'Area cliente'), ('/admin/', 'Dashboard amministrativa'), ('/area-tecnico/', 'Area tecnico'), ('/area-business/', 'Area Business'), ('/checkout/', 'Acquisto'), ('/paga/', 'Pagamento'), ('/pagamento/verifica/?ordine=ORD-ABCDEFGHJKMN', 'Verifica')]:
        pg.goto(BASE + path, wait_until='networkidle')
        txt = pg.inner_text('#app')
        rec('Senza backend', f'{path}: dichiara "non ancora attiva", nessun dato mostrato', 'non ancora attiva' in txt and 'Maria' not in txt, txt[:80])
    pg.unroute('**/.netlify/functions/**')
    pg.goto(BASE + '/certificato/?n=PIR-2026-7K4Q-9M2X', wait_until='networkidle'); pg.wait_for_timeout(300)
    rec('Senza backend', '/certificato/: verifica dichiarata non attiva (nessun esito inventato)', 'non è ancora attivo' in pg.inner_text('#app'))
    rec('Senza backend', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close(); b.close()
srv.terminate()

# ================================================================== 2. backend simulato nel test
build({'PUBLIC_SUPABASE_URL': MOCK, 'PUBLIC_SUPABASE_ANON_KEY': 'anon-test-key', 'BUILD_TEST_FLAGS': ALL_FLAGS})
srv = serve(); time.sleep(0.7)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])

    # --- login con codice
    STATE.update(role='customer', calls=[])
    ctx, pg, errs = new_page(b, logged=False)
    pg.goto(BASE + '/area-cliente/', wait_until='networkidle')
    pg.fill('#login-email', 'maria@test.local'); pg.click('form.app-login button[type=submit]'); pg.wait_for_timeout(300)
    pg.fill('#login-code', '123456'); pg.click('.app-login__code button'); pg.wait_for_timeout(800)
    rec('Accesso cliente', 'login senza password (OTP) e apertura panoramica', 'Panoramica' in pg.inner_text('#app') and any(c[1] == '/auth/v1/verify' for c in STATE['calls']))
    rec('Accesso cliente', 'piano Family con prestazioni residue', 'Family Spurgo Plus' in pg.inner_text('#app') and 'Interventi: 2' in pg.inner_text('#app'))
    rec('Accesso cliente', 'consenso marketing NON preselezionato', pg.eval_on_selector('#mkt', 'e => !e.checked'))
    rec('Accesso cliente', 'nessuna chiave privilegiata nella pagina', 'service' not in pg.content().lower().split('app-config')[1][:300])
    ctx.close()

    # --- i miei interventi: segnalazione senza piano, offerta non preselezionata
    STATE.update(role='customer', calls=[])
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/area-cliente/i-miei-interventi/', wait_until='networkidle'); pg.wait_for_timeout(500)
    card = pg.inner_text('.app-int')
    rec('Interventi cliente', 'scheda con numero, data, categoria, servizio, descrizione, documenti, stato', all(x in card for x in ['INT-2026-TEST01', 'Spurgo lavandini', 'Idraulica', 'Pulizia sifone', 'PIR-2026-7K4Q-9M2X', 'Verificato']))
    rec('Interventi cliente', 'pulsante segnalazione difetto presente SENZA piano a pagamento', pg.is_visible('text=Segnala un difetto o contesta il lavoro'))
    rec('Interventi cliente', 'richiesta servizio aggiuntivo NON disponibile senza piano attivo', not pg.is_visible('text=Richiedi visita di controllo'))
    pg.click('text=Segnala un difetto o contesta il lavoro')
    pg.fill('.app-subform textarea', 'Lo scarico rallenta di nuovo dopo due giorni'); pg.click('.app-subform button[type=submit]'); pg.wait_for_timeout(400)
    call = [c for c in STATE['calls'] if c[1].endswith('rpc/create_dispute')]
    rec('Interventi cliente', 'segnalazione inviata con intervento e descrizione corretti', call and call[0][2] == {'p_intervention': 'i1', 'p_description': 'Lo scarico rallenta di nuovo dopo due giorni'} and 'SEG-2026-ABC123' in pg.inner_text('#app'))
    pg.goto(BASE + '/area-cliente/i-miei-interventi/', wait_until='networkidle'); pg.wait_for_timeout(400)
    pg.click('text=Valuta Lavoro Protetto (facoltativo)')
    rec('Lavoro Protetto', 'offerta: nessun piano preselezionato', pg.eval_on_selector_all('.app-plan input', 'els => els.length > 0 && els.every(e => !e.checked)'))
    rec('Lavoro Protetto', 'offerta: condizioni da accettare esplicitamente (casella non spuntata)', pg.eval_on_selector('.app-subform input[type=checkbox]', 'e => !e.checked'))
    rec('Lavoro Protetto', 'offerta: avviso sulle tutele di legge', 'restano valide anche senza acquistare' in pg.inner_text('.app-subform'))
    rec('Lavoro Protetto', 'vendita non attiva: nessun pulsante di pagamento', not pg.is_visible('text=Procedi al pagamento') and 'non è ancora attiva' in pg.inner_text('.app-subform'))
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(200)
    rec('Responsive', 'i miei interventi a 390px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
    rec('Interventi cliente', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()

    # --- pagamento: il ritorno dal gateway non conferma nulla
    STATE.update(role='customer', calls=[], payment_status='pending')
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/area-cliente/pagamento/?esito=ritorno&ordine=ORD-ABCDEFGHJKMN', wait_until='networkidle'); pg.wait_for_timeout(800)
    rec('Pagamenti', 'ritorno dal gateway con pagamento non confermato: "verifica in corso", mai "confermato"', 'Verifica del pagamento in corso' in pg.inner_text('#app') and 'Pagamento confermato' not in pg.inner_text('#app'))
    STATE['payment_status'] = 'paid'; pg.wait_for_timeout(3500)
    rec('Pagamenti', 'conferma mostrata solo quando il server registra il pagamento', 'Pagamento confermato' in pg.inner_text('#app'))
    ctx.close()

    # --- admin
    STATE.update(role='customer', calls=[])
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/admin/', wait_until='networkidle'); pg.wait_for_timeout(400)
    rec('Accesso amministratore', 'utente cliente: dashboard negata', 'Accesso non autorizzato' in pg.inner_text('#app'))
    ctx.close()
    STATE.update(role='admin', calls=[])
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/admin/', wait_until='networkidle'); pg.wait_for_timeout(500)
    links = pg.eval_on_selector_all('.app-side a', 'els => els.map(e => e.textContent)')
    rec('Accesso amministratore', 'amministratore: 21 sezioni (12 esistenti con Pagamenti e incassi, Richiedi pagamento, 8 B2B)', len(links) == 21, links)
    visited = []
    for k in ['catalogo', 'family', 'clienti', 'contratti', 'interventi', 'lavoro-protetto', 'richieste', 'pagamenti', 'report', 'impostazioni',
              'richiedi-pagamento', 'b2b-clienti', 'b2b-listini', 'b2b-contratti', 'b2b-preventivi', 'b2b-richieste', 'b2b-calendario', 'b2b-lead', 'b2b-ricavi']:
        pg.goto(BASE + '/admin/#' + k); pg.wait_for_timeout(350)
        visited.append((k, 'Errore' not in pg.inner_text('#admin-main') and len(pg.inner_text('#admin-main')) > 40))
    rec('Dashboard', 'tutte le sezioni si caricano senza errori', all(v for _, v in visited), [k for k, v in visited if not v])
    pg.goto(BASE + '/admin/#prezzi'); pg.wait_for_timeout(500)
    pg.fill('.app-card input[inputmode=decimal]', '479,00')
    STATE['calls'].clear()
    pg.click('text=Salva e approva'); pg.wait_for_timeout(700)
    patch = [c for c in STATE['calls'] if c[0] == 'PATCH' and 'plan_versions' in c[1]]
    appr = [c for c in STATE['calls'] if c[1].endswith('rpc/approve_plan_version')]
    rec('Gestione prezzi', 'modifica della bozza: prezzo convertito in centesimi (47900)', patch and patch[0][2]['price_cents'] == 47900, patch[:1])
    rec('Gestione prezzi', 'Prompt 9: approvazione del titolare con nota prima della pubblicazione', appr and appr[0][2] == {'p_version': 'v2', 'p_note': 'approvato dal titolare (test)'}, appr[:1])
    rec('Gestione prezzi', 'versione approvata non più modificabile (nessun campo prezzo, solo Pubblica / Riapri)', pg.is_visible('text=Riapri come bozza') and not pg.is_visible('text=Salva bozza'))
    pg.click('button:has-text("Pubblica")'); pg.wait_for_timeout(600)
    pub = [c for c in STATE['calls'] if c[1].endswith('rpc/publish_plan_version')]
    rec('Gestione prezzi', 'pubblicazione tramite funzione dedicata (dopo conferma)', pub and pub[0][2] == {'p_version': 'v2'})
    STATE['vstatus'] = 'draft'
    pg.goto(BASE + '/admin/#interventi'); pg.wait_for_timeout(400)
    rec('Interventi admin', 'intervento completato: azione "Verifica dati" prima del certificato', pg.is_visible('text=Verifica dati') and not pg.is_visible('text=Emetti certificato'))
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(200)
    rec('Responsive', 'dashboard a 390px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
    rec('Dashboard', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()

    # --- dashboard B2B: contratto con avviso di margine, lead, richieste
    STATE.update(role='admin', calls=[])
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/admin/#b2b-contratti', wait_until='networkidle'); pg.wait_for_timeout(500)
    pg.click('summary:has-text("CTR-2026-TEST01")'); pg.wait_for_timeout(500)
    rec('Dashboard B2B', 'contratto: bozza con costi interni e approvazione', pg.is_visible('text=Costi interni stimati') and pg.is_visible('text=Salva e approva'))
    pg.goto(BASE + '/admin/#b2b-richieste', wait_until='networkidle'); pg.wait_for_timeout(500)
    rec('Dashboard B2B', 'richieste filtrabili per azienda, sede, categoria, stato e data', pg.eval_on_selector_all('#admin-main .app-inline select, #admin-main .app-inline input[type=date]', 'els => els.length') >= 6 and 'RIB-2026-TEST01' in pg.inner_text('#admin-main'))
    STATE['calls'].clear()
    pg.click('#admin-main button:has-text("In valutazione")'); pg.wait_for_timeout(400)
    tr = [c for c in STATE['calls'] if c[1].endswith('rpc/transition_business_request')]
    rec('Dashboard B2B', 'transizione di stato tramite funzione validata dal backend', tr and tr[0][2]['p_to'] == 'under_review', tr[:1])
    pg.goto(BASE + '/admin/#b2b-lead', wait_until='networkidle'); pg.wait_for_timeout(400)
    rec('Dashboard B2B', 'lead B2B con 8 stati selezionabili', pg.eval_on_selector('#admin-main .app-int select', 'e => e.options.length') == 8 and 'LEAD-2026-TEST01' in pg.inner_text('#admin-main'))
    pg.goto(BASE + '/admin/#b2b-preventivi', wait_until='networkidle'); pg.wait_for_timeout(400)
    rec('Dashboard B2B', 'preventivi: avviso che non attivano contratti', 'NON attivano alcun contratto' in pg.inner_text('#admin-main'))
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(200)
    rec('Responsive', 'dashboard B2B a 390px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
    rec('Dashboard B2B', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()

    # --- area Business: amministratore aziendale
    STATE.update(role='b2b', b2b_role='company_admin', calls=[])
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/area-business/', wait_until='networkidle'); pg.wait_for_timeout(600)
    tabs = pg.eval_on_selector_all('.app-tabs a', 'els => els.map(e => e.textContent)')
    rec('Area Business', 'amministratore aziendale: 7 sezioni, contratti inclusi', len(tabs) == 7 and 'Contratti e pagamenti' in tabs, tabs)
    pg.goto(BASE + '/area-business/#richieste'); pg.wait_for_timeout(600)
    pg.check('#loc-l1'); pg.check('#loc-l2')
    pg.select_option('#business-main form select >> nth=0', 'idraulica')
    pg.fill('#business-main form input[maxlength="120"]', 'Scarico lento')
    pg.fill('#business-main form textarea', 'Lavabi lenti nelle camere del secondo piano')
    pg.fill('#business-main form input[type=tel]', '06 1234567')
    STATE['calls'].clear()
    pg.click('text=Invia la richiesta'); pg.wait_for_timeout(500)
    cr = [c for c in STATE['calls'] if c[1].endswith('rpc/create_business_requests')]
    rec('Area Business', 'richiesta multisede: una chiamata con entrambe le sedi, categoria e recapito', cr and cr[0][2]['p_locations'] == ['l1', 'l2'] and cr[0][2]['p_category'] == 'idraulica' and cr[0][2]['p_contact_phone'] == '06 1234567', cr[:1])
    rec('Area Business', 'conferma con i numeri restituiti dal server', 'RIB-2026-N0' in pg.inner_text('#business-main'))
    pg.goto(BASE + '/area-business/#contratti'); pg.wait_for_timeout(600)
    STATE['calls'].clear()
    pg.click('text=Accetta il contratto'); pg.wait_for_timeout(300)
    rec('Area Business', 'accettazione bloccata senza conferma esplicita delle condizioni', not [c for c in STATE['calls'] if 'accept_business_contract_version' in c[1]])
    pg.fill('input[aria-label="Nome e cognome del firmatario"]', 'Anna Direzione'); pg.check('#agree-k1'); pg.click('text=Accetta il contratto'); pg.wait_for_timeout(400)
    acc = [c for c in STATE['calls'] if c[1].endswith('rpc/accept_business_contract_version')]
    rec('Area Business', 'accettazione del contratto con firmatario tramite funzione dedicata', acc and acc[0][2] == {'p_version': 'kv1', 'p_signer_name': 'Anna Direzione'}, acc[:1])
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(200)
    rec('Responsive', 'area Business a 390px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
    rec('Area Business', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()

    # --- area Business: referente di sede (permessi ridotti)
    STATE.update(role='b2b', b2b_role='site_contact', calls=[])
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/area-business/#richieste', wait_until='networkidle'); pg.wait_for_timeout(600)
    tabs = pg.eval_on_selector_all('.app-tabs a', 'els => els.map(e => e.textContent)')
    rec('Area Business', 'referente di sede: niente contratti e pagamenti', 'Contratti e pagamenti' not in tabs, tabs)
    rec('Area Business', 'referente di sede: solo la sede assegnata selezionabile', pg.eval_on_selector_all('#business-main form .chip-group input', 'els => els.length') == 1)
    pg.goto(BASE + '/area-business/#azienda'); pg.wait_for_timeout(500)
    rec('Area Business', 'referente di sede: dati di fatturazione non modificabili, nessuna gestione referenti', pg.eval_on_selector('#business-main input[type=email]', 'e => e.disabled') and not pg.is_visible('text=Salva referente'))
    rec('Area Business', 'nessun errore JavaScript (referente)', not errs, errs[:2])
    ctx.close()


    # --- checkout premium Family: prezzo dal catalogo, condizioni obbligatorie, pagamento sul checkout myPOS
    STATE.update(role='customer', calls=[], sales=True, pay=True)
    ctx, pg, errs = new_page(b, w=390, h=844)
    pg.goto(BASE + '/checkout/?piano=family-spurgo-plus', wait_until='networkidle'); pg.wait_for_timeout(600)
    txt = pg.inner_text('#app').replace('\xa0', ' ').replace('\u202f', ' ')
    rec('Checkout', 'riepilogo: pacchetto, prestazioni, esclusioni, durata, prezzo con IVA, condizioni', all(x in txt for x in ['PRONTO+ Family Spurgo Plus', '2 spurghi ordinari', 'Esclusioni', '12 mesi', '849 €', 'IVA', 'Condizioni contrattuali']), txt[:200])
    rec('Checkout', 'casella delle condizioni non preselezionata', pg.eval_on_selector('#co-terms', 'e => !e.checked'))
    pg.click('.co-pay'); pg.wait_for_timeout(300)
    rec('Checkout', 'senza condizioni accettate: nessun ordine creato', not any('order-create' in c[1] for c in STATE['calls']) and 'accettare le condizioni' in pg.inner_text('#app'))
    rec('Responsive', 'checkout a 390px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
    pg.check('#co-terms'); STATE['calls'].clear()
    pg.click('.co-pay'); pg.wait_for_timeout(1200)
    oc = [c for c in STATE['calls'] if 'order-create' in c[1]]
    cc = [c for c in STATE['calls'] if 'checkout-create' in c[1]]
    rec('Checkout', 'ordine creato dal backend senza importi dal browser', oc and oc[0][2] == {'kind': 'family', 'planId': 'family-spurgo-plus', 'propertyId': 'p1'}, oc[:1])
    rec('Checkout', 'avvio del pagamento con accettazione e versione delle condizioni', cc and cc[0][2] == {'orderId': '7f1c2a10-0000-4000-8000-000000000002', 'acceptTerms': True, 'termsVersion': 'bozza-2026-11'}, cc[:1])
    rec('Checkout', 'reindirizzamento al checkout ospitato myPOS con parametri firmati dal server (nessun dato di carta nel sito)', 'MYPOS SANDBOX' in pg.content() and 'Amount=849.00' in (STATE.get('mypos_post') or ''))
    rec('Checkout', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()

    # --- vendita non attiva: pulsante disattivato
    STATE.update(role='customer', calls=[], sales=False, pay=True)
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/checkout/?piano=family-spurgo-plus', wait_until='networkidle'); pg.wait_for_timeout(500)
    rec('Checkout', 'pacchetto non approvato o vendita non attiva: acquisto impossibile', pg.eval_on_selector('.co-pay', 'e => e.disabled') and 'non ancora attiva' in pg.inner_text('#app'))
    ctx.close()

    # --- pagine di esito: mai "confermato" senza verifica del backend
    STATE.update(role='customer', calls=[], pay=True, polls=0, paid_after=3)
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/pagamento/verifica/?ordine=ORD-ABCDEFGHJKMN&tentativo=8f1c2a10-0000-4000-8000-000000000001', wait_until='domcontentloaded'); pg.wait_for_timeout(500)
    rec('Esito pagamento', 'ritorno dal checkout: "verifica in corso", non confermato', 'Verifica del pagamento in corso' in pg.inner_text('#app') and 'confermato' not in pg.url)
    first = [c for c in STATE['calls'] if 'payment-status' in c[1]][0][1]
    rec('Esito pagamento', 'il ritorno aggiorna solo il tentativo (esito=returned)', 'esito=returned' in first and 'tentativo=' in first, first)
    pg.wait_for_timeout(7000)
    rec('Esito pagamento', 'conferma mostrata solo dopo la verifica del backend', '/pagamento/confermato/' in pg.url and 'Pagamento confermato' in pg.inner_text('#app'), pg.url)
    rec('Esito pagamento', 'tessera digitale e ricevuta (non fattura) dopo l’attivazione', 'PRONTO' in pg.inner_text('.co-member') and 'non è una fattura' in pg.inner_text('#app'))
    STATE.update(polls=0, paid_after=99)
    pg.goto(BASE + '/pagamento/confermato/?ordine=ORD-ABCDEFGHJKMN', wait_until='domcontentloaded'); pg.wait_for_timeout(800)
    rec('Esito pagamento', 'pagina "confermato" aperta senza pagamento verificato: rimanda alla verifica', '/pagamento/verifica/' in pg.url, pg.url)
    pg.goto(BASE + '/pagamento/annullato/?ordine=ORD-ABCDEFGHJKMN&tentativo=8f1c2a10-0000-4000-8000-000000000001', wait_until='networkidle'); pg.wait_for_timeout(400)
    rec('Esito pagamento', 'pagamento annullato: nessun addebito confermato', 'nessun addebito' in pg.inner_text('#app') and any('esito=cancelled' in c[1] for c in STATE['calls']))
    for st, txt in [('in-attesa', 'in attesa di conferma'), ('non-riuscito', 'non è andata a buon fine')]:
        pg.goto(BASE + f'/pagamento/{st}/?ordine=ORD-ABCDEFGHJKMN', wait_until='networkidle'); pg.wait_for_timeout(400)
        rec('Esito pagamento', f'pagina "{st}" dedicata', txt in pg.inner_text('#app'))
    rec('Esito pagamento', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()

    # --- link di pagamento (intervento singolo) senza account
    STATE.update(role='customer', calls=[], pay=True)
    ctx, pg, errs = new_page(b, w=390, h=844, logged=False)
    pg.goto(BASE + '/paga/#t=' + 'T' * 32, wait_until='networkidle'); pg.wait_for_timeout(600)
    txt = pg.inner_text('#app').replace('\xa0', ' ').replace('\u202f', ' ')
    rec('Link di pagamento', 'riepilogo voci, IVA e totale; token rimosso dall’indirizzo', all(x in txt for x in ['Manodopera', 'Trasferta', '149,45 €']) and '#t=' not in pg.url, pg.url)
    sumcall = [c for c in STATE['calls'] if 'order-summary' in c[1]][0]
    rec('Link di pagamento', 'token mai nella query string', 'T' * 32 not in sumcall[1])
    rec('Responsive', 'link di pagamento a 390px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
    pg.check('#co-terms'); pg.click('.co-pay'); pg.wait_for_timeout(1000)
    cc = [c for c in STATE['calls'] if 'checkout-create' in c[1]]
    rec('Link di pagamento', 'checkout avviato con token e accettazione', cc and cc[0][2].get('token') == 'T' * 32 and cc[0][2].get('acceptTerms') is True and 'Amount=149.45' in (STATE.get('mypos_post') or ''))
    rec('Link di pagamento', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()

    # --- dashboard: pagamenti e incassi, richiedi pagamento
    STATE.update(role='admin', calls=[], pay=False)
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/admin/#pagamenti', wait_until='networkidle'); pg.wait_for_timeout(700)
    txt = pg.inner_text('#admin-main')
    rec('Pagamenti e incassi', 'incassi, netto IVA, rimborsi, fatturato, da incassare e ricavi ricorrenti distinti', all(x in txt for x in ['Incassi registrati', 'al netto dell’IVA', 'Rimborsi', 'Fatturato', 'Da incassare', 'Ricavi ricorrenti contrattualizzati']))
    rec('Pagamenti e incassi', 'riferimenti myPOS, filtri per periodo, CSV e riconciliazione', 'TRN-1' in txt and pg.locator('#admin-main input[type=date]').count() >= 2 and 'Esporta CSV' in txt and 'Riconciliazione con myPOS' in txt)
    pg.goto(BASE + '/admin/#richiedi-pagamento', wait_until='networkidle'); pg.wait_for_timeout(600)
    pg.fill('#admin-main tbody tr:nth-child(1) [data-k=price]', '45'); pg.fill('#admin-main tbody tr:nth-child(1) [data-k=qty]', '1,5')
    pg.fill('#admin-main tbody tr:nth-child(2) [data-k=price]', '12,50'); pg.fill('#admin-main tbody tr:nth-child(2) [data-k=qty]', '2')
    pg.fill('#admin-main tbody tr:nth-child(3) [data-k=price]', '30')
    rec('Richiedi pagamento', 'anteprima del totale (ricalcolato poi dal server)', '149,45 €' in pg.inner_text('#admin-main').replace('\xa0', ' ').replace('\u202f', ' '))
    STATE['calls'].clear()
    pg.click('text=Crea e genera il collegamento'); pg.wait_for_timeout(600)
    cso = [c for c in STATE['calls'] if c[1].endswith('rpc/create_service_order')]
    rec('Richiedi pagamento', 'voci inviate in centesimi con aliquota; collegamento /paga/#t= mostrato una volta', cso and cso[0][2]['p_items'][0] == {'kind': 'labor', 'description': 'Manodopera', 'quantity': 1.5, 'unitNetCents': 4500, 'vatRate': 22}
        and pg.locator('input[value*="/paga/#t="]').count() == 1, cso[:1])
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(200)
    rec('Responsive', 'richiedi pagamento a 390px: nessun overflow', overflow(pg) <= 1, overflow(pg))
    rec('Pagamenti e incassi', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()

    # --- tecnico
    STATE.update(role='technician', calls=[], pay=False)
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/area-tecnico/', wait_until='networkidle'); pg.wait_for_timeout(400)
    pg.fill('.app-subform textarea >> nth=0', 'Pulizia sifone e sondatura del tratto a muro')
    pg.fill('.app-subform textarea >> nth=1', 'Guarnizione 40 mm x 1')
    pg.fill('.app-subform input[type=number]', '45')
    pg.click('text=Registra come completato'); pg.wait_for_timeout(500)
    call = [c for c in STATE['calls'] if c[1].endswith('rpc/submit_intervention_report')]
    rec('Registrazione interventi', 'tecnico: rapporto con descrizione, materiali e durata', call and call[0][2]['p_materials'] == [{'name': 'Guarnizione 40 mm', 'qty': 1}] and call[0][2]['p_minutes'] == 45)
    ctx.close()

    # --- verifica certificato
    STATE.update(role='customer', calls=[])
    ctx, pg, errs = new_page(b, logged=False)
    pg.goto(BASE + '/certificato/?n=PIR-2026-7K4Q-9M2X', wait_until='networkidle'); pg.wait_for_timeout(400)
    txt = pg.inner_text('#app')
    rec('Verifica certificati', 'certificato valido mostrato con dati non personali', 'Certificato valido' in txt and 'Roma' in txt and 'Maria' not in txt and 'Via Test' not in txt)
    pg.fill('#cert-n', 'PIR-2026-ZZZZ-ZZZZ'); pg.click('.app-verify button'); pg.wait_for_timeout(300)
    rec('Verifica certificati', 'numero inesistente: esito negativo', 'Nessun certificato' in pg.inner_text('#app'))
    pg.fill('#cert-n', 'falso'); pg.click('.app-verify button'); pg.wait_for_timeout(200)
    rec('Verifica certificati', 'formato non valido: rifiutato senza chiamate', 'Formato non valido' in pg.inner_text('#app'))
    ctx.close()
    b.close()
srv.terminate()

# ripristina la build standard
build({})

ok = sum(1 for r in results if r[2])
md = f"\n## Test nel browser — aree riservate (Playwright, backend simulato solo nel test)\n\nEseguito: {time.strftime('%Y-%m-%dT%H:%M:%S')} · `python3 scripts/e2e/app-check.py`\n\n**Esito: {ok}/{len(results)} superati.**\n\n| Esito | Gruppo | Controllo | Dettaglio |\n|---|---|---|---|\n"
for g, n, o, d in results:
    md += f"| {'✅' if o else '❌'} | {g} | {n} | {d.replace('|', '/')[:200] if not o else ''} |\n"
rp = ROOT / 'reports/test-report.md'
text = rp.read_text() if rp.exists() else ''
text = re.sub(r'\n## Test nel browser — aree riservate[\s\S]*?(?=\n## |\Z)', '', text)
rp.write_text(text.rstrip() + '\n' + md)
print(f'Aree riservate: {ok}/{len(results)} superati')
for g, n, o, d in results:
    if not o: print(f'  ✖ {g} — {n}: {d}')
raise SystemExit(0 if ok == len(results) else 1)
