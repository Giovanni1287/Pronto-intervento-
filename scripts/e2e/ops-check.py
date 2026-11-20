#!/usr/bin/env python3
"""
Test nel browser della CENTRALE OPERATIVA (Prompt 5) — Chrome headless + Playwright.
1) Build normale (backend NON configurato): le nuove aree dichiarano di non essere attive.
2) Build di test con URL Supabase fittizio: le risposte del backend sono SIMULATE
   SOLO in questo test (intercettazione di rete) per verificare i flussi dell'interfaccia.
   I dati qui sotto sono fittizi e non vengono mai inclusi nel sito.
Verifica anche il responsive (390 e 1440 px) e salva screenshot in reports/screenshots/p5-*.jpg.
Aggiunge l'esito a reports/test-report.md.
"""
import json, os, re, subprocess, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PORT = 4393
BASE = f'http://localhost:{PORT}'
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
MOCK = 'https://mock.supabase.test'
# funzionalità tutte attive SOLO nella build di test con backend simulato (Prompt 9)
ALL_FLAGS = '{"customer_registration":true,"customer_login":true,"family":true,"business":true,"hotel":true,"corporate":true,"protected_work":true,"online_purchases":true,"mypos":true,"technician_dashboard":true,"pronto_ai":true,"pronto_seo":true,"notifications":true}'
SHOTS = ROOT / 'reports/screenshots'
results = []
def rec(g, n, ok, d=''): results.append((g, n, bool(ok), str(d)))

def build(env_extra):
    subprocess.run(['node', 'scripts/build.js'], cwd=ROOT, env={**os.environ, **env_extra}, check=True, stdout=subprocess.DEVNULL)
def serve():
    return subprocess.Popen(['node', 'scripts/serve.js'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT), 'SERVE_CSP_EXTRA': MOCK}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

# ------------------------------------------------------------------ dati SIMULATI (solo test)
now = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)
monday = (now - timedelta(days=now.weekday())).replace(hour=8)
iso = lambda d: d.isoformat().replace('+00:00', 'Z')
INT_ID = '11111111-1111-4111-8111-111111111111'
JOB_ID = '22222222-2222-4222-8222-222222222222'
T1 = '33333333-3333-4333-8333-333333333333'
STATE = {'role': 'admin', 'calls': []}
ROLE_UID = {'admin': 'u-admin', 'operator': 'u-oper', 'technician': 'u-tech', 'customer': 'u-cust'}

DASH = {'period': {}, 'received': 14, 'waiting': 5, 'toSchedule': 3, 'scheduled': 1, 'technicianAssigned': 4, 'inProgress': 2, 'completed': 2, 'toInvoice': 1,
        'paymentsPending': 1, 'postRequests': 1, 'covered': 2, 'reportsToReview': 1, 'possibleDuplicates': 1, 'extraWorksPending': 1, 'basis': 'Conteggi calcolati sui dati presenti nel database (nessun dato dimostrativo).'}
STATS = {'period': {'from': '2026-10-18', 'to': '2026-11-17'}, 'today': 3, 'week': 9, 'month': 21, 'unassigned': 6, 'completed': 7, 'avgTakeChargeMinutes': 42, 'avgCompletionHours': 30.5,
         'collectedCents': 158600, 'unpaid': 2, 'byCategory': [{'category': 'Idraulica', 'count': 8}, {'category': 'Elettrica', 'count': 3}],
         'byTechnician': [{'technician': 'Tecnico Prova', 'assigned': 6, 'completed': 4}], 'prontoPlus': {'coveragesConsumed': 2, 'familyUsages': 2, 'protectedUsages': 1, 'b2bUsages': 3, 'byPlan': [{'plan': 'Family Spurgo Plus', 'count': 2}]},
         'basis': 'Dati reali del database nel periodo selezionato.', 'costs': {'closedInterventions': 3, 'revenueNetCents': 39000, 'operatingCostCents': 30100, 'withoutCostData': 1, 'marginCents': 8900, 'estimate': True}}
QUEUE = [
    {'sourceKind': 'intervention', 'id': INT_ID, 'number': 'RIC-2026-PROVA1', 'createdAt': iso(now - timedelta(hours=3)), 'source': 'homepage', 'kind': 'intervention', 'status': 'new', 'statusLabel': 'Nuova richiesta',
     'customer': 'Cliente Prova', 'phone': '06 0000001', 'city': 'Roma', 'categoryId': 'idraulica', 'category': 'Idraulica', 'service': 'Spurgo lavandini', 'urgency': 'emergency', 'priority': 'normal',
     'scheduledAt': None, 'technician': None, 'covered': True, 'paymentState': 'not_defined', 'paymentStateLabel': 'Importi non definiti', 'duplicate': False, 'possibleDuplicate': True},
    {'sourceKind': 'business_request', 'id': '44444444-4444-4444-8444-444444444444', 'number': 'RIB-2026-PROVA2', 'createdAt': iso(now - timedelta(days=1)), 'source': 'hotel', 'kind': 'intervention', 'status': 'in_review',
     'statusLabel': 'In valutazione', 'customer': 'Struttura Prova · Sede 1', 'phone': '06 0000002', 'city': 'Roma', 'categoryId': 'idraulica', 'category': 'Idraulica', 'service': None, 'urgency': 'normal', 'priority': 'normal',
     'scheduledAt': None, 'technician': None, 'covered': True, 'paymentState': 'not_defined', 'paymentStateLabel': 'Importi non definiti', 'duplicate': False, 'possibleDuplicate': False}]
ECON = {'intervention_id': INT_ID, 'agreed_price_cents': None, 'call_fee_cents': 4000, 'labor_cents': 9000, 'materials_cents': 1550, 'equipment_rental_cents': 0, 'travel_cents': 0, 'disposal_cents': 3000,
        'external_costs_cents': 0, 'covered_cents': 4000, 'discount_cents': 550, 'deposit_cents': 0, 'vat_rate': 22, 'subtotal_cents': 17550, 'taxable_cents': 13000, 'vat_cents': 2860, 'total_cents': 15860,
        'status': 'draft', 'price_locked': False, 'order_id': None, 'notes': None}
DETAIL = {
    'intervention': {'id': INT_ID, 'number': 'RIC-2026-PROVA1', 'op_status': 'new', 'statusLabel': 'Nuova richiesta', 'source': 'homepage', 'kind': 'intervention', 'created_at': iso(now - timedelta(hours=3)),
                     'category_id': 'idraulica', 'service_id': 'idraulica/spurgo-lavandini', 'categoryName': 'Idraulica', 'serviceName': 'Spurgo lavandini', 'contact_name': 'Cliente Prova', 'contact_phone': '06 0000001',
                     'contact_email': 'cliente@example.test', 'address_line': 'Via di Prova 1', 'city': 'Roma', 'postal_code': '00100', 'description': 'Lavandino che non scarica', 'declared_urgency': 'emergency',
                     'priority': 'normal', 'intake': {'requestType': 'intervento'}, 'operatorName': None, 'customer_id': None, 'contract_id': None, 'scheduled_at': None, 'scheduled_end_at': None, 'slot_label': None, 'duplicate_of': None},
    'allowedTransitions': ['in_review', 'awaiting_quote', 'to_schedule', 'cancelled'],
    'history': [{'to': 'new', 'toLabel': 'Nuova richiesta', 'at': iso(now - timedelta(hours=3)), 'actorRole': 'anon', 'note': 'Richiesta dal sito (homepage)'}],
    'events': [{'kind': 'created', 'data': {'source': 'homepage'}, 'at': iso(now - timedelta(hours=3)), 'actorRole': 'anon'},
               {'kind': 'duplicate', 'data': {'candidates': [{'number': 'RIC-2026-PROVA0'}]}, 'at': iso(now - timedelta(hours=3)), 'actorRole': 'anon'}],
    'notes': [], 'assignments': [], 'reschedules': [],
    'duplicates': [{'id': '55555555-5555-4555-8555-555555555555', 'number': 'RIC-2026-PROVA0', 'reasons': ['stesso telefono', 'stessa categoria']}],
    'report': None, 'reportVersions': [], 'reportMissing': ['rapporto di intervento'], 'materials': [], 'time': [], 'photos': [], 'approvals': [],
    'notifications': [{'event': 'request_created', 'status': 'not_sent', 'channel': 'email', 'at': iso(now), 'error': 'Nessun provider di notifica configurato'}],
    'coverage': {'applicable': False, 'reason': 'Richiesta senza cliente registrato: nessun abbonamento verificabile', 'contracts': [], 'coverages': [], 'note': ''},
    'permissions': {'manage': True, 'assign': True, 'close': True, 'approveReports': True, 'economics': True, 'approveEconomics': True, 'internalCosts': True, 'payments': True},
    'economics': {'economics': ECON, 'paymentState': 'to_define', 'paymentStateLabel': 'Scheda economica in bozza', 'quotedCents': 13000, 'invoicedCents': 0, 'collectedCents': 0, 'orders': [], 'extraWorks': [],
                  'internal': None, 'expenses': [], 'workedMinutes': 150, 'suggestedTechnicianCostCents': 7000, 'internalCostCents': 0, 'revenueNetCents': 13000, 'marginCents': 13000, 'marginPct': 100}}
CHECK = {'ok': False, 'hard': [], 'blocking': [{'code': 'overlap', 'message': 'Sovrapposizione con RIC-2026-PROVA9 (20/11 09:00–11:00)'}],
         'warnings': [{'code': 'urgent', 'message': 'Richiesta urgente: nessuna regola di assegnazione automatica approvata, decisione manuale'}]}
CAL = [{'assignmentId': 'a1', 'kind': 'intervento', 'targetId': INT_ID, 'targetKind': 'intervention', 'number': 'RIC-2026-PROVA1', 'title': 'Spurgo lavandini', 'startsAt': iso(monday + timedelta(days=1, hours=1)),
        'endsAt': iso(monday + timedelta(days=1, hours=3)), 'technicianId': T1, 'technicianName': 'Tecnico Prova', 'categoryId': 'idraulica', 'city': 'Roma', 'status': 'technician_assigned',
        'statusLabel': 'Tecnico assegnato', 'urgent': True, 'customer': 'Cliente Prova', 'slot': '9–11', 'warnings': []},
       {'assignmentId': 'a2', 'kind': 'manutenzione', 'targetId': 'v1', 'targetKind': 'maintenance_visit', 'number': 'Visita trimestrale', 'title': 'Visita trimestrale', 'startsAt': iso(monday + timedelta(days=2, hours=2)),
        'endsAt': iso(monday + timedelta(days=2, hours=4)), 'technicianId': T1, 'technicianName': 'Tecnico Prova', 'categoryId': 'idraulica', 'city': 'Roma', 'status': 'scheduled', 'statusLabel': 'Intervento programmato',
        'urgent': False, 'customer': 'Struttura Prova', 'slot': None, 'warnings': []},
       {'assignmentId': 'a3', 'kind': 'controllo_lavoro_protetto', 'targetId': 'c1', 'targetKind': 'protected_check', 'number': 'Controllo RIC-2026-PROVA0', 'title': 'Controllo post-intervento',
        'startsAt': iso(monday + timedelta(days=3, hours=1)), 'endsAt': iso(monday + timedelta(days=3, hours=2)), 'technicianId': T1, 'technicianName': 'Tecnico Prova', 'categoryId': 'idraulica', 'city': 'Roma',
        'status': 'scheduled', 'statusLabel': 'Intervento programmato', 'urgent': False, 'customer': 'Cliente Prova', 'slot': None, 'warnings': []}]
TECHS = [{'id': T1, 'displayName': 'Tecnico Prova', 'active': True, 'zones': ['Roma'], 'deactivatedAt': None, 'email': 'tecnico@example.test', 'specializations': ['idraulica', 'spurghi'],
          'openAssignments': 2, 'today': 1, 'qualificationsExpiring': 1, 'availabilityConfigured': False}]
TDETAIL = {'id': T1, 'displayName': 'Tecnico Prova', 'active': True, 'zones': ['Roma'], 'deactivatedAt': None, 'deactivatedReason': None, 'email': 'tecnico@example.test', 'specializations': ['idraulica', 'spurghi'],
           'qualifications': [{'id': 'q1', 'kind': 'PROVA-1', 'title': 'Abilitazione di prova', 'issuer': 'Ente di prova', 'reference': 'REF-1', 'specializationId': 'idraulica', 'verifiedAt': iso(now), 'expiresAt': (now + timedelta(days=20)).date().isoformat(), 'status': 'verified', 'revokedReason': None, 'state': 'expiring'}],
           'availability': [{'weekday': 1, 'start': '08:00', 'end': '18:00'}], 'absences': [], 'upcoming': [{'assignmentId': 'a1', 'startsAt': CAL[0]['startsAt'], 'endsAt': CAL[0]['endsAt'], 'number': 'RIC-2026-PROVA1', 'status': 'technician_assigned'}],
           'history': [], 'requirements': [], 'private': {'work_phone': None, 'work_email': None, 'internal_hourly_cost_cents': 2800, 'notes': None}}
JOB = {'id': JOB_ID, 'number': 'RIC-2026-PROVA1', 'kind': 'intervention', 'status': 'technician_assigned', 'statusLabel': 'Tecnico assegnato', 'category': 'Idraulica', 'service': 'Spurgo lavandini',
       'description': 'Lavandino che non scarica', 'addressLine': 'Via di Prova 1', 'city': 'Roma', 'postalCode': '00100', 'startsAt': iso(now + timedelta(hours=1)), 'endsAt': iso(now + timedelta(hours=3)),
       'slot': '9–11', 'priority': 'high', 'urgency': 'high', 'equipment': 'Sonda', 'assignmentNotes': 'Citofono interno 4', 'contactName': 'Cliente Prova', 'contactPhone': '06 0000001',
       'reportStatus': None, 'correctionNote': None, 'covered': False}
JOB_DETAIL = {**JOB, 'notes': [], 'materials': [], 'time': [], 'photos': [], 'extraWorks': [], 'report': None, 'editable': True}
MYREQ = [{'id': INT_ID, 'number': 'RIC-2026-PROVA1', 'createdAt': iso(now - timedelta(days=1)), 'status': 'quote_sent', 'statusLabel': 'Preventivo inviato', 'category': 'Idraulica', 'service': 'Spurgo lavandini',
          'description': 'Serve un preventivo', 'city': 'Roma', 'scheduledAt': None, 'slot': None, 'technicianName': None, 'quote': {'netCents': 12000, 'vatRate': 22, 'grossCents': 14640, 'acceptedAt': None},
          'canAcceptQuote': True, 'canCancel': True, 'extraWorks': [], 'reportNumber': None, 'paymentState': 'not_defined', 'paymentStateLabel': '', 'covered': False,
          'timeline': [{'status': 'new', 'label': 'Nuova richiesta', 'at': iso(now - timedelta(days=1))}, {'status': 'quote_sent', 'label': 'Preventivo inviato', 'at': iso(now)}]}]

def handler(route):
    req = route.request
    u = urlparse(req.url); path = u.path; m = req.method
    try: body = json.loads(req.post_data) if req.post_data else None
    except Exception: body = req.post_data
    STATE['calls'].append((m, path + ('?' + u.query if u.query else ''), body))
    uid = ROLE_UID[STATE['role']]
    def ok(data, status=200): return route.fulfill(status=status, content_type='application/json', body=json.dumps(data))
    if path == '/auth/v1/user': return ok({'id': uid, 'email': 'utente@example.test'})
    if path in ('/auth/v1/logout', '/auth/v1/otp'): return ok({})
    t = path.replace('/rest/v1/', '')
    if t == 'profiles': return ok([{'id': uid, 'role': STATE['role'], 'full_name': 'Utente di prova', 'email': 'utente@example.test'}])
    if t == 'role_permissions': return ok([{'permission': p} for p in ['ops.view', 'ops.manage', 'ops.assign', 'technicians.view', 'economics.view', 'stats.view']])
    if t == 'service_categories': return ok([{'id': 'idraulica', 'name': 'Idraulica'}, {'id': 'elettrica', 'name': 'Elettrica'}])
    if t == 'services': return ok([{'id': 'idraulica/spurgo-lavandini', 'name': 'Spurgo lavandini', 'category_id': 'idraulica'}])
    if t == 'technicians': return ok([{'id': T1, 'display_name': 'Tecnico Prova', 'active': True}])
    if t == 'technician_specializations': return ok([{'id': 'idraulica', 'name': 'Idraulica'}, {'id': 'spurghi', 'name': 'Spurghi'}, {'id': 'elettricita', 'name': 'Elettricità'}])
    if t == 'properties': return ok([{'id': 'p1', 'address_line': 'Via di Prova 1', 'city': 'Roma'}])
    rpc = {'ops_dashboard': DASH, 'ops_stats': STATS, 'ops_queue': QUEUE, 'intervention_detail': DETAIL, 'check_assignment': CHECK, 'assign_intervention': {'assignmentId': 'a9', 'warnings': CHECK['blocking']},
           'suggest_technicians': {'source': 'rules', 'note': 'Suggerimento basato su regole; nessuna assegnazione automatica.', 'items': [{'technicianId': T1, 'name': 'Tecnico Prova', 'score': 65, 'check': CHECK}]},
           'calendar_range': CAL, 'reschedule_appointment': {'ok': True, 'warnings': []}, 'technicians_overview': TECHS, 'technician_detail': TDETAIL, 'set_technician_availability': 5,
           'my_jobs': [JOB], 'my_job': JOB_DETAIL, 'tech_set_status': {'status': 'en_route'}, 'my_requests': MYREQ, 'create_customer_request': {'number': 'RIC-2026-NUOVA1', 'contractLinked': True},
           'customer_accept_quote': {'accepted': True}, 'transition_intervention': {}, 'save_economics': ECON}
    if t.startswith('rpc/'):
        fn = t[4:]
        if STATE['role'] in ('customer',) and fn in ('ops_dashboard', 'ops_queue', 'my_jobs'): return ok({'message': 'Operazione non autorizzata'}, 403)
        return ok(rpc.get(fn, {}))
    return ok([] if m == 'GET' else {})

def fn_handler(route):
    u = urlparse(route.request.url)
    if 'report-verify' in u.path:
        n = parse_qs(u.query).get('n', [''])[0]
        if n == 'RAP-2026-7K4Q9M':
            return route.fulfill(status=200, content_type='application/json', body=json.dumps({'found': True, 'number': n, 'version': 2, 'status': 'approved', 'valid': True, 'integrity': True,
                'approvedAt': '2026-11-17', 'workDate': '2026-11-17', 'categoryName': 'Idraulica', 'city': 'Roma', 'hashShort': 'abcdef0123456789'}))
        return route.fulfill(status=404, content_type='application/json', body=json.dumps({'found': False}))
    return route.fulfill(status=503, content_type='application/json', body='{"error":"not_configured"}')

def new_page(browser, w=1440, h=900, logged=True, mobile=False):
    ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if mobile or w <= 400 else 1, is_mobile=mobile, has_touch=mobile)
    if logged:
        ctx.add_init_script("localStorage.setItem('pir.session', JSON.stringify({access_token:'tok',refresh_token:'ref',expires_at:Math.floor(Date.now()/1000)+3600}))")
    # spia: qualsiasi uso della geolocalizzazione viene registrato
    ctx.add_init_script("window.__geo = 0; if (navigator.geolocation) { navigator.geolocation.getCurrentPosition = () => { window.__geo++; }; navigator.geolocation.watchPosition = () => { window.__geo++; return 0; }; }")
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda c: errs.append(c.text) if c.type == 'error' and 'Failed to load resource' not in c.text else None)
    pg.route(f'{MOCK}/**', handler)
    pg.route('**/.netlify/functions/**', fn_handler)
    pg.on('dialog', lambda d: d.accept('Motivo di prova del test') if d.type == 'prompt' else d.accept())
    return ctx, pg, errs

# larghezza del documento rispetto alla larghezza REALE del dispositivo (con l'emulazione mobile innerWidth si allarga col contenuto)
def overflow(pg): return pg.evaluate('document.documentElement.scrollWidth') - pg.viewport_size['width']
def shot(pg, name, full=False):
    SHOTS.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(SHOTS / f'p5-{name}.jpg'), type='jpeg', quality=62, full_page=full)
def calls(fn): return [c for c in STATE['calls'] if c[1].endswith('rpc/' + fn)]

# ================================================================== 1. backend non configurato
build({})
srv = serve(); time.sleep(0.8)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    ctx, pg, errs = new_page(b, logged=False)
    for path in ['/admin/centrale-operativa/', '/admin/calendario/', '/admin/tecnici/', '/tecnico/', '/area-cliente/richieste/']:
        pg.goto(BASE + path, wait_until='networkidle')
        txt = pg.inner_text('#app')
        rec('Senza backend', f'{path}: dichiara "non ancora attiva", nessun dato mostrato', 'non ancora attiva' in txt and 'RIC-' not in txt, txt[:80])
    pg.unroute('**/.netlify/functions/**')
    pg.goto(BASE + '/rapporto/?n=RAP-2026-7K4Q9M', wait_until='networkidle'); pg.wait_for_timeout(300)
    rec('Senza backend', '/rapporto/: verifica dichiarata non attiva (nessun esito inventato)', 'non è ancora attivo' in pg.inner_text('#app'))
    pg.goto(BASE + '/', wait_until='networkidle')
    rec('Senza backend', 'moduli del sito: invio disattivato e dichiarato (nessuna conferma simulata)', pg.eval_on_selector('form[name=intervento]', 'f => f.dataset.enabled') == 'false')
    rec('Senza backend', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close(); b.close()
srv.terminate()

# ================================================================== 2. backend simulato nel test
build({'PUBLIC_SUPABASE_URL': MOCK, 'PUBLIC_SUPABASE_ANON_KEY': 'anon-test-key', 'BUILD_TEST_FLAGS': ALL_FLAGS})
srv = serve(); time.sleep(0.8)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])

    # --- centrale: amministratore
    STATE.update(role='admin', calls=[])
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/admin/centrale-operativa/', wait_until='networkidle'); pg.wait_for_timeout(700)
    kpis = pg.eval_on_selector_all('.ops-kpi', 'els => els.map(e => e.querySelector(".ops-kpi__label").textContent + "=" + e.querySelector("strong").textContent)')
    rec('Centrale', 'dashboard: 14 indicatori dai dati del backend (nessun numero casuale)', len(kpis) == 14 and 'Richieste in attesa=5' in kpis and 'Pagamenti in sospeso=1' in kpis, kpis[:4])
    need = ['Richieste ricevute', 'Richieste in attesa', 'Da programmare', 'Interventi programmati', 'Tecnici assegnati', 'Interventi in corso', 'Interventi completati', 'Da fatturare',
            'Pagamenti in sospeso', 'Richieste post-intervento', 'Coperti da abbonamenti']
    rec('Centrale', 'card richieste dal Prompt (ricevute, attesa, da programmare, programmati, tecnici, in corso, completati, da fatturare, pagamenti, post-intervento, abbonamenti)',
        all(any(k.startswith(n) for k in kpis) for n in need))
    txt = pg.inner_text('#app')
    rec('Centrale', 'statistiche aziendali: periodo, tempi medi, incassi, per categoria e per tecnico, PRONTO+, costi e margini', all(x in txt for x in
        ['Statistiche aziendali', 'Presa in carico media', 'Completamento medio', 'Incassi registrati', 'Interventi per categoria', 'Interventi per tecnico', 'Utilizzo dei pacchetti PRONTO+', 'Margine di contribuzione stimato']))
    rec('Centrale', 'elenco unificato: richiesta dal sito e richiesta aziendale, urgenza e possibile duplicato evidenziati',
        'RIC-2026-PROVA1' in txt and 'RIB-2026-PROVA2' in txt and 'Emergenza' in txt and 'Possibile duplicato' in txt)
    STATE['calls'].clear()
    pg.select_option('.ops-filters select >> nth=0', 'waiting'); pg.wait_for_timeout(400)
    q = calls('ops_queue')
    rec('Centrale', 'filtro per stato inviato al backend', q and q[-1][2]['p'].get('statuses') == ['new', 'in_review', 'awaiting_quote', 'quote_sent'], q[-1:] )
    shot(pg, 'centrale-desktop')
    pg.click('a:has-text("RIC-2026-PROVA1")'); pg.wait_for_timeout(700)
    txt = pg.inner_text('#app'); low = txt.lower()
    rec('Dettaglio richiesta', 'vista dettagliata: ID, data, cliente, telefono, email, indirizzo, categoria, sottocategoria, descrizione, urgenza, stato, operatore, storico',
        all(x.lower() in low for x in ['RIC-2026-PROVA1', 'Cliente Prova', '06 0000001', 'cliente@example.test', 'Via di Prova 1', 'Idraulica', 'Spurgo lavandini', 'Lavandino che non scarica', 'Emergenza', 'Nuova richiesta', 'Operatore incaricato', 'Storico degli stati']))
    rec('Dettaglio richiesta', 'possibili duplicati mostrati con motivazione', 'RIC-2026-PROVA0' in txt and 'stesso telefono' in txt)
    rec('Dettaglio richiesta', 'urgenza: avviso che non esiste assegnazione automatica', 'nessuna regola di assegnazione automatica' in txt)
    rec('Dettaglio richiesta', 'notifiche: stato "non inviata" senza provider', 'non inviata' in txt)
    pg.select_option('.ops-sec select[aria-label="Tecnico"]', T1)
    STATE['calls'].clear()
    pg.click('button:has-text("Verifica disponibilità")'); pg.wait_for_timeout(500)
    rec('Assegnazione', 'verifica disponibilità: conflitti e avvisi mostrati', 'Sovrapposizione con RIC-2026-PROVA9' in pg.inner_text('#app') and calls('check_assignment'))
    rec('Assegnazione', 'conflitto: richiesta la motivazione per confermare', pg.is_visible('text=Conferma nonostante i conflitti'))
    pg.fill('textarea[placeholder^="Motivazione per confermare"]', 'Urgenza concordata con il cliente')
    pg.click('button:has-text("Assegna intervento")'); pg.wait_for_timeout(600)
    a = calls('assign_intervention')
    rec('Assegnazione', 'ASSEGNA INTERVENTO: richiesta, tecnico, data, fascia, priorità e motivazione inviati al backend',
        a and a[0][2]['p_id'] == INT_ID and a[0][2]['p_technician'] == T1 and a[0][2]['p_start'] and a[0][2]['p_end'] > a[0][2]['p_start'] and a[0][2]['p_override_reason'] == 'Urgenza concordata con il cliente', a[:1])
    STATE['calls'].clear()
    pg.click('button:has-text("→ In valutazione")'); pg.wait_for_timeout(500)
    tr = calls('transition_intervention')
    rec('Stati', 'cambio di stato tramite funzione validata dal backend', tr and tr[0][2]['p_to'] == 'in_review', tr[:1])
    STATE['calls'].clear()
    pg.click('button:has-text("→ Annullato")'); pg.wait_for_timeout(500)
    tr = calls('transition_intervention')
    rec('Stati', 'annullamento con motivazione obbligatoria', tr and tr[0][2]['p_to'] == 'cancelled' and tr[0][2]['p_note'], tr[:1])
    low = pg.inner_text('#app').lower()
    rec('Costi', 'scheda economica: voci richieste, quota PRONTO+, IVA, totale; preventivato, fatturato e incassato distinti',
        all(x.lower() in low for x in ['Diritto di chiamata', 'Manodopera', 'Materiali', 'Noleggio attrezzature', 'Trasferta', 'Smaltimento', 'Costi esterni', 'Quota inclusa PRONTO+', 'Sconti', 'Acconto', 'Preventivato', 'Fatturato', 'Incassato']))
    rec('Costi', 'anteprima del totale calcolata come nel database (158,60 €)', '158,60' in pg.inner_text('.ops-total'), pg.inner_text('.ops-total'))
    rec('Costi', 'costi interni e margine in sezione riservata', pg.is_visible('text=Costi interni e margine (riservato)'))
    shot(pg, 'dettaglio-desktop', full=True)
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(300)
    rec('Responsive', 'dettaglio richiesta a 390px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
    pg.goto(BASE + '/admin/centrale-operativa/', wait_until='networkidle'); pg.wait_for_timeout(700)
    rec('Responsive', 'centrale a 390px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
    shot(pg, 'centrale-mobile')
    rec('Centrale', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()

    # --- operatore e accessi negati
    STATE.update(role='operator', calls=[])
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/admin/centrale-operativa/', wait_until='networkidle'); pg.wait_for_timeout(600)
    nav = pg.eval_on_selector_all('.ops-bar__nav a', 'els => els.map(e => e.textContent)')
    rec('Permessi', 'operatore: accede alla centrale, senza la dashboard amministrativa', 'Centrale operativa' in nav and 'Dashboard amministrativa' not in nav, nav)
    ctx.close()
    for role in ['customer', 'technician']:
        STATE.update(role=role, calls=[])
        ctx, pg, errs = new_page(b)
        pg.goto(BASE + '/admin/centrale-operativa/', wait_until='networkidle'); pg.wait_for_timeout(500)
        rec('Permessi', f'{role}: centrale negata', 'Accesso non autorizzato' in pg.inner_text('#app') and not calls('ops_queue'))
        ctx.close()
    STATE.update(role='customer', calls=[])
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/tecnico/', wait_until='networkidle'); pg.wait_for_timeout(500)
    rec('Permessi', 'cliente: area tecnico negata', 'Accesso non autorizzato' in pg.inner_text('#app') and not calls('my_jobs'))
    ctx.close()

    # --- calendario
    STATE.update(role='admin', calls=[])
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/admin/calendario/', wait_until='networkidle'); pg.wait_for_timeout(700)
    txt = pg.inner_text('#app')
    rec('Calendario', 'vista settimanale: interventi, manutenzioni e controlli Lavoro Protetto', 'RIC-2026-PROVA1' in txt and 'Visita trimestrale' in txt and 'Controllo RIC-2026-PROVA0' in txt)
    rec('Calendario', 'interventi urgenti evidenziati', pg.locator('.cal-chip--urgent').count() == 1 and 'URGENTE' in txt)
    rec('Calendario', 'legenda: sopralluoghi Business e Hotel e controlli Lavoro Protetto', 'Sopralluogo' in txt and 'Controllo Lavoro Protetto' in txt)
    shot(pg, 'calendario-settimana-desktop')
    STATE['calls'].clear()
    pg.select_option('select[aria-label="Filtra per tecnico"]', T1); pg.wait_for_timeout(400)
    c = calls('calendar_range')
    rec('Calendario', 'filtro per tecnico applicato dal backend', c and c[-1][2]['p_technician'] == T1, c[-1:])
    pg.click('button:has-text("Mese")'); pg.wait_for_timeout(500)
    rec('Calendario', 'vista mensile (griglia 6×7)', pg.locator('.cal-month__cell').count() == 42)
    pg.click('button:has-text("Giorno")'); pg.wait_for_timeout(400)
    rec('Calendario', 'vista giornaliera', pg.is_visible('.cal-day'))
    pg.click('button:has-text("Settimana")'); pg.wait_for_timeout(500)
    pg.click('.cal-chip >> nth=0'); pg.wait_for_timeout(300)
    pg.fill('dialog input[placeholder="es. richiesta del cliente"]', 'Richiesta del cliente')
    STATE['calls'].clear()
    pg.click('dialog button:has-text("Sposta")'); pg.wait_for_timeout(500)
    r = calls('reschedule_appointment')
    rec('Calendario', 'spostamento con motivo: controllo conflitti lato server e storico', r and r[0][2]['p_assignment'] == 'a1' and r[0][2]['p_reason'] == 'Richiesta del cliente', r[:1])
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(300)
    rec('Responsive', 'calendario a 390px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
    shot(pg, 'calendario-mobile')
    rec('Calendario', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()

    # --- tecnici
    STATE.update(role='admin', calls=[])
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/admin/tecnici/', wait_until='networkidle'); pg.wait_for_timeout(600)
    txt = pg.inner_text('#app')
    rec('Tecnici', 'elenco con specializzazioni, zone, disponibilità e abilitazioni in scadenza', all(x in txt for x in ['Tecnico Prova', 'Idraulica · Spurghi', 'Disponibilità da configurare', 'abilitazioni in scadenza']))
    rec('Tecnici', 'avviso: la specializzazione non è verifica delle abilitazioni', 'non costituiscono verifica delle abilitazioni' in txt)
    shot(pg, 'tecnici-desktop')
    pg.click('.tech-card'); pg.wait_for_timeout(600)
    txt = pg.inner_text('#app')
    rec('Tecnici', 'scheda: profilo, disponibilità, assenze, abilitazioni verificate con scadenza, documenti, storico, accesso',
        all(x in txt for x in ['Profilo e specializzazioni', 'Disponibilità settimanale', 'Assenze', 'Abilitazioni verificate', 'In scadenza', 'Documentazione professionale', 'Storico lavori', 'Disattiva accesso']))
    rec('Tecnici', 'assenze: nessun dato sanitario richiesto', 'non indicare motivi di salute' in txt)
    STATE['calls'].clear()
    pg.click('button:has-text("Salva disponibilità")'); pg.wait_for_timeout(500)
    sa = calls('set_technician_availability')
    rec('Tecnici', 'disponibilità salvata tramite funzione', sa and sa[0][2]['p_slots'] == [{'weekday': 1, 'start': '08:00', 'end': '18:00'}], sa[:1])
    pg.set_viewport_size({'width': 390, 'height': 844}); pg.wait_for_timeout(300)
    rec('Responsive', 'scheda tecnico a 390px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
    rec('Tecnici', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()

    # --- area tecnico mobile
    STATE.update(role='technician', calls=[])
    ctx, pg, errs = new_page(b, w=390, h=844, mobile=True)
    pg.goto(BASE + '/tecnico/', wait_until='networkidle'); pg.wait_for_timeout(700)
    txt = pg.inner_text('#app')
    rec('Area tecnico', 'elenco dei soli lavori assegnati (my_jobs), con orario, servizio, indirizzo e stato', 'RIC-2026-PROVA1' in txt and 'Spurgo lavandini' in txt and 'Via di Prova 1' in txt and calls('my_jobs'))
    rec('Responsive', 'area tecnico a 390px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
    shot(pg, 'tecnico-lavori-mobile')
    pg.click('.tm-job'); pg.wait_for_timeout(700)
    txt = pg.inner_text('#app')
    href = pg.get_attribute('a:has-text("Apri navigazione")', 'href')
    rec('Area tecnico', 'navigazione: app esterna con il solo indirizzo dell’intervento', href and href.startswith('https://www.google.com/maps/dir/?api=1&destination=Via%20di%20Prova%201') and 'origin' not in href, href)
    rec('Area tecnico', 'recapito del cliente, categoria, descrizione, fascia, note e attrezzature', all(x in txt for x in ['Chiama Cliente Prova', 'Lavandino che non scarica', 'fascia 9–11', 'Citofono interno 4', 'Sonda']))
    shot(pg, 'tecnico-lavoro-mobile')
    STATE['calls'].clear()
    pg.click('button:has-text("Sono in viaggio")'); pg.wait_for_timeout(500)
    s = calls('tech_set_status')
    rec('Area tecnico', 'stato aggiornato dal tecnico solo tra quelli autorizzati', s and s[0][2] == {'p_id': JOB_ID, 'p_to': 'en_route'}, s[:1])
    rec('Area tecnico', 'nessun tracciamento della posizione', pg.evaluate('window.__geo') == 0)
    # lavoro sul posto: sezioni di ore, materiali, foto, lavorazioni aggiuntive e rapporto
    JOB_DETAIL['status'] = 'in_progress'; JOB_DETAIL['statusLabel'] = 'Intervento in corso'
    pg.goto(BASE + f'/tecnico/#j={JOB_ID}', wait_until='networkidle'); pg.reload(wait_until='networkidle'); pg.wait_for_timeout(700)
    txt = pg.inner_text('#app')
    rec('Area tecnico', 'ore lavorate, materiali, fotografie autorizzate, lavorazioni aggiuntive e rapporto', all(x in txt for x in ['Ore lavorate', 'Materiali utilizzati', 'Fotografie', 'Lavorazioni aggiuntive', 'Rapporto di intervento', 'Diagnosi effettuata', 'Presa visione del cliente']))
    rec('Area tecnico', 'presa visione facoltativa e non sostitutiva di certificazioni', 'Non sostituisce certificazioni' in txt)
    STATE['calls'].clear()
    pg.fill('.tm-report textarea >> nth=2', 'Pulizia del sifone e sondatura')
    pg.click('button:has-text("Richiedi completamento")'); pg.wait_for_timeout(400)
    rec('Area tecnico', 'completamento senza diagnosi: bloccato già nell’interfaccia', 'diagnosi effettuata' in pg.inner_text('#app') and not calls('request_completion'))
    rec('Responsive', 'scheda lavoro a 390px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
    shot(pg, 'tecnico-rapporto-mobile', full=True)
    rec('Area tecnico', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()

    # --- area cliente: richieste
    STATE.update(role='customer', calls=[])
    ctx, pg, errs = new_page(b, w=390, h=844, mobile=True)
    pg.goto(BASE + '/area-cliente/richieste/', wait_until='networkidle'); pg.wait_for_timeout(700)
    txt = pg.inner_text('#app')
    rec('Area cliente', 'richieste: stato, cronologia e preventivo (146,40 € IVA inclusa)', 'RIC-2026-PROVA1' in txt and 'Preventivo inviato' in txt and '146,40' in txt)
    rec('Area cliente', 'segnalazione difetti: percorso gratuito separato ricordato', 'sempre gratuite' in txt)
    pg.select_option('form select >> nth=1', 'idraulica'); pg.fill('form textarea', 'Perdita sotto il lavello della cucina')
    STATE['calls'].clear()
    pg.click('button:has-text("Invia richiesta")'); pg.wait_for_timeout(500)
    cr = calls('create_customer_request')
    rec('Area cliente', 'nuova richiesta dall’area cliente con immobile e categoria', cr and cr[0][2]['p_property'] == 'p1' and cr[0][2]['p_category'] == 'idraulica', cr[:1])
    pg.goto(BASE + '/area-cliente/richieste/', wait_until='networkidle'); pg.wait_for_timeout(600)
    STATE['calls'].clear()
    pg.click('button:has-text("Accetta il preventivo")'); pg.wait_for_timeout(500)
    rec('Area cliente', 'accettazione del preventivo dal cliente', calls('customer_accept_quote'))
    rec('Responsive', 'richieste cliente a 390px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
    shot(pg, 'cliente-richieste-mobile')
    rec('Area cliente', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()

    # --- verifica pubblica del rapporto
    STATE.update(role='customer', calls=[])
    ctx, pg, errs = new_page(b, w=390, h=844, logged=False, mobile=True)
    pg.goto(BASE + '/rapporto/?n=RAP-2026-7K4Q9M', wait_until='networkidle'); pg.wait_for_timeout(500)
    txt = pg.inner_text('#app')
    rec('Verifica rapporto', 'rapporto valido con soli dati minimi (nessun nome, indirizzo o tecnico)', 'Rapporto di intervento valido' in txt and 'Roma' in txt and 'Cliente' not in txt and 'Via' not in txt and 'Tecnico' not in txt)
    rec('Verifica rapporto', 'avvertenza: non è dichiarazione di conformità', 'non è una dichiarazione di conformità' in txt)
    shot(pg, 'rapporto-verifica-mobile')
    pg.fill('#rap-n', 'falso'); pg.click('.app-verify button'); pg.wait_for_timeout(200)
    rec('Verifica rapporto', 'formato non valido rifiutato', 'Formato non valido' in pg.inner_text('#app'))
    ctx.close()

    # --- responsive a 1440 di tutte le nuove pagine
    STATE.update(role='admin', calls=[])
    ctx, pg, errs = new_page(b, w=1440, h=900)
    for path in ['/admin/centrale-operativa/', '/admin/calendario/', '/admin/tecnici/']:
        pg.goto(BASE + path, wait_until='networkidle'); pg.wait_for_timeout(500)
        rec('Responsive', f'{path} a 1440px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
    ctx.close()
    b.close()
srv.terminate()
build({})

ok = sum(1 for r in results if r[2])
md = f"\n## Test nel browser — centrale operativa (Playwright, backend simulato solo nel test)\n\nEseguito: {time.strftime('%Y-%m-%dT%H:%M:%S')} · `python3 scripts/e2e/ops-check.py`\n\n**Esito: {ok}/{len(results)} superati.**\n\n| Esito | Gruppo | Controllo | Dettaglio |\n|---|---|---|---|\n"
for g, n, o, d in results:
    md += f"| {'✅' if o else '❌'} | {g} | {n} | {d.replace('|', '/')[:200] if not o else ''} |\n"
rp = ROOT / 'reports/test-report.md'
text = rp.read_text() if rp.exists() else ''
text = re.sub(r'\n## Test nel browser — centrale operativa[\s\S]*?(?=\n## |\Z)', '', text)
rp.write_text(text.rstrip() + '\n' + md)
print(f'Centrale operativa (browser): {ok}/{len(results)} superati')
for g, n, o, d in results:
    if not o: print(f'  ✖ {g} — {n}: {d}')
raise SystemExit(0 if ok == len(results) else 1)
