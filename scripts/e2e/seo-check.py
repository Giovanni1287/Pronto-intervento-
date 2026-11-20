#!/usr/bin/env python3
"""
Test nel browser di PRONTO SEO (Prompt 7) — Chrome headless + Playwright.
Supabase, le funzioni Netlify e Google (googletagmanager.com) sono SIMULATI solo in questo
test (intercettazione di rete). I numeri usati nella dashboard sono DATI DI PROVA del test,
etichettati come tali: nessuna chiamata reale a Google, nessun dato reale.
1) Consenso e GA4 (ID di prova G-TEST000000): nessuno script Google prima del consenso,
   Rifiuta / Personalizza / Accetta / riapertura delle preferenze, Consent Mode.
2) Tracciamento conversioni: clic su telefono e WhatsApp, payload senza dati personali,
   attribuzione nel modulo (UTM ammessi, parametri personali scartati).
3) Dashboard /admin/seo/: 8 sezioni (admin), fonti e date, azioni (approvazioni, scheda Google,
   zone, report PDF/CSV), permessi operatore, responsive 390/1440.
Screenshot in reports/screenshots/p7-*.jpg; esito aggiunto a reports/test-report.md.
"""
import json, os, re, subprocess, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PORT = 4396
BASE = f'http://localhost:{PORT}'
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
MOCK = 'https://mock.supabase.test'
# funzionalità tutte attive SOLO nella build di test con backend simulato (Prompt 9)
ALL_FLAGS = '{"customer_registration":true,"customer_login":true,"family":true,"business":true,"hotel":true,"corporate":true,"protected_work":true,"online_purchases":true,"mypos":true,"technician_dashboard":true,"pronto_ai":true,"pronto_seo":true,"notifications":true}'
SHOTS = ROOT / 'reports/screenshots'
GA = 'G-TEST000000'
results = []
def rec(g, n, ok, d=''): results.append((g, n, bool(ok), str(d)))
def build(env_extra):
    subprocess.run(['node', 'scripts/build.js'], cwd=ROOT, env={**os.environ, **env_extra}, check=True, stdout=subprocess.DEVNULL)
def serve():
    return subprocess.Popen(['node', 'scripts/serve.js'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT), 'SERVE_CSP_EXTRA': MOCK}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def overflow(pg): return pg.evaluate('document.documentElement.scrollWidth') - pg.viewport_size['width']
def shot(pg, name, full=False):
    SHOTS.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(SHOTS / f'p7-{name}.jpg'), type='jpeg', quality=62, full_page=full)

now = datetime.now(timezone.utc).replace(microsecond=0)
iso = lambda d: d.isoformat().replace('+00:00', 'Z')
day = lambda n: (now.date() - timedelta(days=n)).isoformat()
STATE = {'role': 'admin', 'calls': [], 'fn': [], 'beacons': [], 'gtm': []}
PROP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
PROP2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
RECO = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
DRAFT = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
REPORT = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'

# ------------------------------------------------------------------ DATI DI PROVA (solo test)
def admin_state():
    admin = STATE['role'] == 'admin'
    return {
        'properties': [{'id': PROP, 'domain': 'prontointerventoroma.it', 'label': 'Sito principale', 'gscSiteUrl': 'sc-domain:prontointerventoroma.it', 'role': 'main', 'managedHere': True,
                        'authMethod': 'service_account', 'active': True, 'brandTerms': ['pronto intervento roma'], 'notes': None, 'lastSyncAt': iso(now - timedelta(hours=3)), 'oauthConnected': False},
                       {'id': PROP2, 'domain': 'ispezionetubazioneroma.it', 'label': 'Sito specialistico', 'gscSiteUrl': None, 'role': 'specialist', 'managedHere': False,
                        'authMethod': 'none', 'active': False, 'brandTerms': [], 'notes': 'Repository separato: solo dati di ricerca', 'lastSyncAt': None, 'oauthConnected': False}],
        'settings': {'click_drop_pct': 30, 'impressions_drop_pct': 40, 'min_baseline_clicks': 50, 'compare_days': 7, 'form_error_ratio_pct': 20, 'min_form_events': 5,
                     'low_ctr_min_impressions': 200, 'stale_data_days': 5, 'live_site_url': None, 'review_requests_enabled': False} if admin else None,
        'zones': [{'slug': s, 'name': n, 'active': a} for s, n, a in [('eur', 'EUR', False), ('monteverde', 'Monteverde', False), ('prati', 'Prati', False)]],
        'alerts': [{'id': 'al1', 'created_at': iso(now - timedelta(days=1)), 'severity': 'warning', 'message': 'Calo dei clic del 35% (DATO DI PROVA)', 'status': 'open'}],
        'jobs': [{'job': 'gsc_sync', 'run_key': f'gsc_sync:{day(1)}', 'status': 'succeeded', 'attempts': 1, 'rows': 812, 'finished_at': iso(now - timedelta(hours=3)), 'error': None}],
        'recommendations': [{'id': RECO, 'number': 'SEO-2026-PROVA1', 'kind': 'title', 'path': '/servizi/idraulica/spurgo-lavandini/', 'source': 'ai', 'status': 'pending',
                             'current_value': 'Spurgo lavandini a Roma | Pronto Intervento Roma', 'proposed_value': 'Spurgo lavandini e lavelli otturati a Roma',
                             'rationale': 'Molte impressioni e CTR basso (dato di prova).', 'evidence': {'impressions': 1200, 'ctr': 0.011, 'period': '28 giorni'}, 'decision_note': None}],
        'drafts': [{'id': DRAFT, 'kind': 'guide', 'version': 1, 'author_kind': 'ai', 'title': 'Bozza di prova: odore di fogna in bagno', 'status': 'draft',
                    'body': {'summary': 'Sintesi di prova.', 'sections': [{'h': 'Cause', 'p': ['Testo di prova.']}], 'toVerify': ['tempi indicativi']}, 'reviewer_name': None}],
        'reports': [{'id': REPORT, 'kind': 'weekly', 'from': day(8), 'to': day(2), 'createdAt': iso(now - timedelta(days=1))}],
        'reviewRequests': [{'id': 'rr1', 'number': 'RIC-2026-PROVA9', 'status': 'prepared', 'preparedAt': iso(now - timedelta(hours=5)), 'sentAt': None}],
        'permissions': {'manage': admin, 'agent': admin}}

def overview():
    trend = [{'date': day(30 - i), 'clicks': 20 + (i * 7) % 13, 'impressions': 900 + i * 11, 'state': 'all' if i > 26 else 'final'} for i in range(28)]
    return {'property': {'id': PROP, 'domain': 'prontointerventoroma.it'}, 'connected': True, 'source': 'Google Search Console (Search Analytics API) — DATI DI PROVA del test',
            'period': {'from': day(30), 'to': day(3)}, 'previous': {'from': day(58), 'to': day(31)}, 'dataUntil': day(3),
            'current': {'clicks': 640, 'impressions': 26100, 'ctr': 0.0245, 'position': 14.2}, 'prior': {'clicks': 560, 'impressions': 24000, 'ctr': 0.0233, 'position': 15.1},
            'branded': {'available': True, 'branded': {'clicks': 120}, 'nonBranded': {'clicks': 520}}, 'trend': trend,
            'leads': {'organic': 9, 'all': 31, 'formsCompleted': 14}, 'openIssues': 0, 'openAlerts': 1, 'pendingRecommendations': 1,
            'notes': ['La posizione media è una media ponderata delle impressioni, non un ranking fisso.', 'Gli ultimi giorni possono essere provvisori.']}

def pages_report():
    rows = [{'path': '/servizi/idraulica/spurgo-lavandini/', 'title': 'Spurgo lavandini a Roma | Pronto Intervento Roma', 'description': 'x' * 150, 'words': 1200, 'indexable': True,
             'keyword': 'spurgo lavandini roma', 'intent': 'transazionale', 'editorialStatus': 'pubblicata', 'lastReviewed': '2026-11-18',
             'index': {'verdict': 'PASS', 'coverage': 'Inviata e indicizzata', 'checkedAt': iso(now)}, 'issues': [],
             'perf': {'clicks': 41, 'impressions': 1200, 'ctr': 0.034, 'position': 9.4}},
            {'path': '/servizi/elettrica/', 'title': 'Elettricista a Roma | Pronto Intervento Roma', 'description': 'y' * 140, 'words': 900, 'indexable': True,
             'keyword': 'elettricista roma', 'intent': 'transazionale', 'editorialStatus': 'pubblicata', 'lastReviewed': '2026-11-18', 'index': None,
             'issues': [{'code': 'img_no_dimensions', 'severity': 'warning', 'message': 'Immagine senza dimensioni (dato di prova)'}], 'perf': None}]
    return {'rows': rows, 'period': {'from': day(30), 'to': day(3)}, 'dataUntil': day(3)}

def queries_report():
    return {'rows': [{'query': 'spurgo lavandino roma', 'branded': False, 'clicks': 31, 'prevClicks': 20, 'impressions': 800, 'prevImpressions': 700, 'ctr': 0.039, 'position': 7.2, 'prevPosition': 8.4},
                     {'query': 'pronto intervento roma', 'branded': True, 'clicks': 90, 'prevClicks': 95, 'impressions': 300, 'prevImpressions': 310, 'ctr': 0.3, 'position': 1.4, 'prevPosition': 1.3}],
            'period': {'from': day(30), 'to': day(3)}, 'previous': {'from': day(58), 'to': day(31)}, 'dataUntil': day(3),
            'note': 'Google omette le ricerche rare per privacy: la somma per ricerca è inferiore al totale.'}

def breakdown(kind):
    rows = [{'key': 'MOBILE', 'clicks': 480, 'impressions': 18000, 'ctr': 0.026, 'position': 13.1}, {'key': 'DESKTOP', 'clicks': 160, 'impressions': 8100, 'ctr': 0.02, 'position': 16.0}] if kind == 'device' \
        else [{'key': 'ita', 'clicks': 630, 'impressions': 25800, 'ctr': 0.024, 'position': 14.0}]
    return {'kind': kind, 'rows': rows, 'period': {'from': day(30), 'to': day(3)}}

def gbp():
    return {'profile': {'business_name': 'Pronto Intervento Roma', 'primary_category': None, 'phone': None, 'website': 'https://prontointerventoroma.it', 'hours': None, 'service_area': None,
                        'profile_url': None, 'review_url': None, 'exists_confirmed': False, 'checklist': {'name': True}, 'photos_checklist': {}, 'api_status': 'not_requested'},
            'completenessPct': 20, 'apiNote': 'Gestione manuale: le API Business Profile richiedono l’approvazione di Google.', 'warnings': ['Esistenza della scheda non verificata.'],
            'operations': [{'at': iso(now - timedelta(days=2)), 'by': 'Admin Prova', 'kind': 'info_update', 'note': 'Orari aggiornati (prova)'}], 'metrics': []}

def funnel():
    return {'period': {'from': day(30), 'to': day(0)}, 'generatedAt': iso(now), 'sources': ['conversion_events', 'lead_attribution', 'interventions', 'payments'],
            'clicks': {'phone': 52, 'whatsapp': 17, 'formOk': 14, 'formErrors': 1},
            'stages': {'requests': 31, 'qualified': 22, 'quoteAccepted': 11, 'customers': 9, 'paid': 7},
            'byChannel': {'organic': 9, 'direct': 15, 'unknown': 7}, 'bySegment': {'private': 25, 'business': 4, 'pronto_plus': 2},
            'byLanding': [{'path': '/servizi/idraulica/spurgo-lavandini/', 'requests': 6, 'qualified': 5, 'customers': 3, 'phoneClicks': 12, 'paidCents': 54000}],
            'notes': ['Un clic sul numero non è una telefonata verificata.', 'Una richiesta non è un contratto acquisito.']}

RPC = {'seo_overview': overview, 'seo_pages_report': pages_report, 'seo_queries_report': queries_report, 'gbp_status': gbp, 'seo_conversion_funnel': funnel}

def sb(route):
    req = route.request
    u = urlparse(req.url); path = u.path
    body = json.loads(req.post_data) if req.post_data else None
    STATE['calls'].append((req.method, path, body))
    uid = {'admin': 'u-admin', 'operator': 'u-oper'}[STATE['role']]
    def ok(data, status=200): return route.fulfill(status=status, content_type='application/json', body=json.dumps(data))
    if path == '/auth/v1/user': return ok({'id': uid, 'email': 'utente@example.test'})
    t = path.replace('/rest/v1/', '')
    if t == 'profiles': return ok([{'id': uid, 'role': STATE['role'], 'full_name': 'Utente di prova', 'email': 'utente@example.test'}])
    if t == 'role_permissions': return ok([{'permission': p} for p in ['ops.view', 'ops.manage', 'seo.view']])
    if t == 'seo_reports': return ok([{'data': {'topQueries': queries_report()['rows']}}])
    if t.startswith('rpc/'):
        name = t[4:]
        if name == 'seo_admin_state': return ok(admin_state())
        if name == 'seo_breakdown': return ok(breakdown(body.get('p_kind')))
        if name in RPC: return ok(RPC[name]())
        return ok({})
    return ok([] if req.method == 'GET' else {})

def fns(route):
    req = route.request
    u = urlparse(req.url); path = u.path; q = parse_qs(u.query)
    body = json.loads(req.post_data) if req.post_data and req.post_data.startswith('{') else req.post_data
    STATE['fn'].append((req.method, path, q, body, req.headers.get('authorization')))
    def ok(data, status=200): return route.fulfill(status=status, content_type='application/json', body=json.dumps(data))
    if path.endswith('/conversion-event'):
        STATE['beacons'].append(body); return route.fulfill(status=204, body='')
    if path.endswith('/seo-admin'):
        if 'status' in q:
            return ok({'integrations': {'searchConsole': {'serviceAccount': True, 'serviceAccountEmail': 'sa-prova@progetto.iam.gserviceaccount.com', 'oauth': False}, 'ga4': {'configured': False},
                                        'gbpApi': {'configured': False}, 'notifications': {'email': False}, 'deployWebhook': {'configured': False}, 'ai': {'configured': True}}})
        if 'audit' in q:
            return ok({'generatedAt': iso(now), 'production': True, 'summary': {'publicPages': 37, 'errors': 0, 'warnings': 0}, 'sitemap': {'urls': 37, 'missing': [], 'unexpected': []}})
        if 'report' in q:
            return route.fulfill(status=200, content_type='application/pdf', body=b'%PDF-1.4\n% report di prova\n%%EOF')
        return ok({'ok': True, 'checked': 3, 'issues': []})
    if path.endswith('/ai-chat'):
        return ok({'conversationId': 'c1', 'ai': True, 'reply': 'Risposta di prova del PRONTO SEO Agent: periodo e fonte indicati.', 'proposals': [], 'status': 'ok'})
    return ok({'error': 'not_configured', 'message': 'Non configurato (test)'}, 503)

def gtm(route):
    STATE['gtm'].append(route.request.url)
    route.fulfill(status=200, content_type='application/javascript', body='/* gtag di prova */')

def new_page(browser, w=1440, h=900, logged=False):
    ctx = browser.new_context(viewport={'width': w, 'height': h}, accept_downloads=True)
    if logged: ctx.add_init_script("localStorage.setItem('pir.session', JSON.stringify({access_token:'tok',refresh_token:'ref',expires_at:Math.floor(Date.now()/1000)+3600}))")
    # i link tel: e WhatsApp non devono aprire applicazioni esterne durante il test
    ctx.add_init_script("document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('a[href^=\"tel:\"], a[href*=\"wa.me/\"]'); if (a) e.preventDefault(); })")
    pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda c: errs.append(c.text) if c.type == 'error' and 'Failed to load resource' not in c.text else None)
    pg.route(f'{MOCK}/**', sb)
    pg.route('**/.netlify/functions/**', fns)
    pg.route('https://www.googletagmanager.com/**', gtm)
    pg.on('dialog', lambda d: d.accept('Nota di prova') if d.type == 'prompt' else d.accept())
    return ctx, pg, errs

# ================================================================== 1-2. sito pubblico: consenso, GA4, conversioni
build({'PUBLIC_GA4_MEASUREMENT_ID': GA, 'PUBLIC_SUPABASE_URL': MOCK, 'PUBLIC_SUPABASE_ANON_KEY': 'anon-test-key', 'BUILD_TEST_FLAGS': ALL_FLAGS})
srv = serve(); time.sleep(0.8)
G = 'Consenso e GA4'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/servizi/idraulica/spurgo-lavandini/?utm_source=google&utm_medium=cpc&utm_campaign=prova&email=mario%40example.test', wait_until='networkidle')
    rec(G, 'prima visita: banner visibile, nessuno script Google caricato', pg.is_visible('[data-consent]') and not STATE['gtm'] and pg.evaluate('typeof window.gtag') == 'undefined')
    rec(G, 'banner: Accetta, Rifiuta, Personalizza e link alla cookie policy', all(pg.is_visible(s) for s in ['[data-consent-accept]', '[data-consent-reject]', '[data-consent-customize]'])
        and pg.locator('[data-consent] a[href="/cookie-policy/"]').count() >= 1)
    shot(pg, 'banner-consenso')
    pg.click('[data-consent-reject]'); pg.wait_for_timeout(300)
    stored = pg.evaluate("JSON.parse(localStorage.getItem('pir.consent'))")
    rec(G, 'Rifiuta: banner chiuso, scelta salvata, nessuno script Google', pg.is_hidden('[data-consent]') and stored['analytics'] is False and not STATE['gtm'])
    pg.reload(wait_until='networkidle')
    rec(G, 'scelta ricordata: nessun banner alla visita successiva, nessuno script Google', pg.is_hidden('[data-consent]') and not STATE['gtm'])
    # conversioni (consenso negato: solo l'evento di prima parte, senza dati personali)
    # il numero pubblico non è ancora confermato (nessun link tel: nel sito): link di PROVA inseriti solo nel test
    TESTLINKS = "document.querySelector('main').insertAdjacentHTML('afterbegin', '<p><a id=\"t-tel\" href=\"tel:+390600000000\">tel di prova</a> <a id=\"t-wa\" href=\"https://wa.me/390600000000\">wa di prova</a></p>')"
    pg.evaluate(TESTLINKS)
    pg.click('#t-tel'); pg.wait_for_timeout(400)
    wa = pg.locator('#t-wa')
    wa.click(); pg.wait_for_timeout(400)
    kinds = [x.get('kind') if isinstance(x, dict) else json.loads(x).get('kind') for x in STATE['beacons']]
    rec('Conversioni', 'clic su telefono registrato come "phone_click" (clic, non telefonata)', 'phone_click' in kinds, kinds)
    rec('Conversioni', 'clic su WhatsApp registrato (se presente il link)', wa.count() == 0 or 'whatsapp_click' in kinds, kinds)
    raw = json.dumps(STATE['beacons'])
    rec('Conversioni', 'payload senza dati personali (solo tipo, pagina, canale, UTM ammessi)', 'mario' not in raw and 'example.test' not in raw and '@' not in raw and '0600000000' not in raw
        and all(set((x if isinstance(x, dict) else json.loads(x)).keys()) <= {'kind', 'path', 'channel', 'utm'} for x in STATE['beacons']), raw[:200])
    rec('Conversioni', 'UTM e canale "a pagamento" riconosciuti', any((x if isinstance(x, dict) else json.loads(x)).get('utm', {}).get('campaign') == 'prova' for x in STATE['beacons']) and '"paid"' in raw)
    val = pg.evaluate("""() => { const f = document.querySelector('form [data-attribution]')?.form; if (!f) return null;
        f.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); return f.querySelector('[data-attribution]').value; }""")
    rec('Conversioni', 'modulo: attribuzione con canale e UTM, nessun parametro personale', bool(val) and '"paid"' in val and 'prova' in val and 'mario' not in val, val)
    # preferenze riaperte → Personalizza → statistiche → caricamento GA4
    pg.click('[data-consent-open]'); pg.wait_for_timeout(200)
    rec(G, '"Preferenze cookie" riapre il banner con la scelta attuale', pg.is_visible('[data-consent]') and not pg.is_checked('[data-consent-analytics]'))
    pg.click('[data-consent-customize]'); pg.check('[data-consent-analytics]'); pg.click('[data-consent-save]'); pg.wait_for_timeout(500)
    dl = pg.evaluate("(window.dataLayer || []).map(a => Array.from(a))")
    rec(G, 'Personalizza → statistiche: GA4 caricato solo ora', len(STATE['gtm']) == 1 and GA in STATE['gtm'][0])
    rec(G, 'Consent Mode: default "denied" per tutto, poi solo analytics_storage "granted"', dl[0][0] == 'consent' and dl[0][1] == 'default' and all(v == 'denied' for v in dl[0][2].values())
        and dl[1][1] == 'update' and dl[1][2] == {'analytics_storage': 'granted'}, dl[:2])
    cfg = next((a for a in dl if a[0] == 'config'), None)
    rec(G, 'configurazione GA4 senza segnali pubblicitari né identificativi utente', cfg and cfg[2].get('allow_google_signals') is False and 'user_id' not in cfg[2], cfg)
    pg.evaluate(TESTLINKS); pg.click('#t-tel'); pg.wait_for_timeout(300)
    ev = [a for a in pg.evaluate("(window.dataLayer || []).map(a => Array.from(a))") if a[0] == 'event']
    rec(G, 'evento GA4 "click_phone" con il solo percorso della pagina', ev and ev[-1][1] == 'click_phone' and list(ev[-1][2].keys()) == ['page_path'], ev[-1:] if ev else '')
    pg.click('[data-consent-open]'); pg.wait_for_timeout(200)
    with pg.expect_navigation(): pg.click('[data-consent-reject]')
    pg.wait_for_load_state('networkidle')
    rec(G, 'revoca: pagina ricaricata senza GA4', pg.evaluate('typeof window.gtag') == 'undefined' and len(STATE['gtm']) == 1)
    rec(G, 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()
    # pagina cookie policy, area riservata senza banner
    ctx, pg, errs = new_page(b)
    pg.goto(BASE + '/cookie-policy/', wait_until='networkidle')
    rec(G, 'cookie policy pubblicata (bozza noindex finché non validata)', 'noindex' in (pg.get_attribute('meta[name=robots]', 'content') or '') and 'Google Analytics' in pg.inner_text('main'))
    pg.goto(BASE + '/admin/seo/', wait_until='networkidle')
    rec(G, 'aree riservate: nessun banner e nessun GA4', pg.locator('[data-consent]').count() == 0 and not STATE['gtm'][1:])
    ctx, pg2, _ = new_page(b, w=390, h=844)
    pg2.goto(BASE + '/', wait_until='networkidle')
    rec(G, 'banner su smartphone: nessun overflow a 390px', pg2.is_visible('[data-consent]') and overflow(pg2) <= 1, overflow(pg2))
    shot(pg2, 'banner-mobile')
    b.close()
srv.terminate()

# ================================================================== 3. dashboard /admin/seo/
build({'PUBLIC_SUPABASE_URL': MOCK, 'PUBLIC_SUPABASE_ANON_KEY': 'anon-test-key', 'BUILD_TEST_FLAGS': ALL_FLAGS})
srv = serve(); time.sleep(0.8)
G = 'Dashboard PRONTO SEO'
def rpcs(name): return [c for c in STATE['calls'] if c[1].endswith(f'rpc/{name}')]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    STATE.update(role='admin', calls=[], fn=[])
    ctx, pg, errs = new_page(b, logged=True)
    pg.goto(BASE + '/admin/seo/', wait_until='networkidle'); pg.wait_for_selector('.seo-kpi')
    tabs = pg.locator('.pai-tabs a').all_inner_texts()
    rec(G, 'amministratore: 8 sezioni (Panoramica, Pagine, Ricerche, Google Maps, SEO AI, Conversioni, Report, Impostazioni)', len(tabs) == 8, tabs)
    t = pg.inner_text('.pai-body')
    rec(G, 'PANORAMICA: clic, impressioni, CTR, posizione media con periodo precedente', all(x in t for x in ['640', '26.100', '2,45%', '14,2', 'prima: 560']))
    rec(G, 'posizione media spiegata come media, non ranking fisso; fonte e data', 'non un ranking fisso' in t and 'Fonte:' in t and 'dati fino al' in t)
    rec(G, 'marchio / non di marchio (classificazione Google)', 'non di marchio' in t.lower() and '520' in t)
    rec(G, 'grafico dell’andamento con dati provvisori distinti', pg.locator('.seo-chart rect').count() == 28 and pg.locator('.seo-chart rect.is-partial').count() == 1)
    shot(pg, 'panoramica', full=True)
    pg.goto(BASE + '/admin/seo/#pagine'); pg.wait_for_timeout(600); pg.wait_for_selector('.pai-body table')
    t = pg.inner_text('.pai-body')
    rec(G, 'PAGINE: audit della build, stato di indicizzazione, problemi e prestazioni', all(x in t for x in ['PAGINE PUBBLICHE', '37', 'Inviata e indicizzata', 'non verificato', '/servizi/elettrica/']))
    with pg.expect_download() as d: pg.click('text=Esporta CSV')
    csv = Path(d.value.path()).read_text(encoding='utf-8-sig')
    rec(G, 'PAGINE: esportazione CSV con scheda editoriale', csv.startswith('"URL";"Title"') and 'spurgo lavandini roma' in csv and 'Immagine senza dimensioni' in csv)
    pg.check('#seo-only-issues')
    rec(G, 'PAGINE: filtro "solo con problemi"', pg.locator('.pai-body table tbody tr').count() == 1)
    shot(pg, 'pagine', full=True)
    pg.goto(BASE + '/admin/seo/#ricerche'); pg.wait_for_timeout(600); pg.wait_for_selector('.pai-body table')
    t = pg.inner_text('.pai-body')
    rec(G, 'RICERCHE: confronto con il periodo precedente, dispositivi e paesi, righe omesse spiegate', all(x in t for x in ['spurgo lavandino roma', '+55', 'Smartphone', 'Italia', 'omette']))
    pg.select_option('.pai-body select', 'nb')
    rec(G, 'RICERCHE: filtro non di marchio', 'pronto intervento roma' not in pg.inner_text('.pai-body table >> nth=0'))
    pg.goto(BASE + '/admin/seo/#maps'); pg.wait_for_timeout(600); pg.wait_for_selector('.seo-checks')
    t = pg.inner_text('.pai-body')
    rec(G, 'GOOGLE MAPS: gestione manuale dichiarata, checklist e checklist fotografica, nessuna metrica inventata', 'Gestione manuale' in t and 'Checklist fotografica' in t and 'Non disponibili' in t and 'nessuna nuova scheda' in t)
    pg.fill('.pai-form input >> nth=1', 'Idraulico'); pg.click('text=Salva'); pg.wait_for_timeout(500)
    up = rpcs('gbp_update')
    rec(G, 'GOOGLE MAPS: salvataggio nel registro interno (non su Google)', up and up[-1][2]['p']['primaryCategory'] == 'Idraulico' and up[-1][2]['p']['checklist']['name'] is True)
    pg.fill('textarea', 'Caricate foto del furgone (prova)'); pg.click('text=Registra operazione'); pg.wait_for_timeout(400)
    rec(G, 'GOOGLE MAPS: registro delle operazioni', rpcs('gbp_log_operation') and rpcs('gbp_log_operation')[-1][2]['p_note'].startswith('Caricate'))
    shot(pg, 'google-maps', full=True)
    pg.goto(BASE + '/admin/seo/#ai'); pg.wait_for_timeout(600); pg.wait_for_selector('.pai-action')
    t = pg.inner_text('.pai-body')
    rec(G, 'SEO AI: proposta con valore attuale, proposta, motivazione e dati di riferimento', all(x in t for x in ['SEO-2026-PROVA1', 'Attuale', 'Proposta', 'Motivazione', '"impressions":1200']))
    rec(G, 'SEO AI: regole dichiarate (nessuna modifica diretta, nessuno scraping, nessuna garanzia)', 'Non modifica né pubblica pagine' in t and 'scraping' in t)
    pg.click('.aic-chip >> nth=1'); pg.wait_for_selector('.aic-msg--assistant')
    chat = [f for f in STATE['fn'] if f[1].endswith('/ai-chat')]
    rec(G, 'SEO AI: domanda all’agente "seo" con il token dell’utente', chat and chat[-1][3]['agent'] == 'seo' and chat[-1][4] == 'Bearer tok')
    pg.click('.pai-action >> nth=0 >> text=Approva'); pg.wait_for_timeout(500)
    dec = rpcs('seo_decide_recommendation')
    rec(G, 'SEO AI: approvazione della singola proposta (nessuna applicazione automatica)', dec and dec[-1][2] == {'p_id': RECO, 'p_decision': 'approve', 'p_note': None})
    pg.fill('.pai-action >> nth=1 >> input', 'Giovanni Romeo, titolare'); pg.click('.pai-action >> nth=1 >> text=Approva'); pg.wait_for_timeout(500)
    rv = rpcs('seo_review_draft')
    rec(G, 'bozza AI: approvazione con nome del revisore', rv and rv[-1][2]['p_reviewer_name'] == 'Giovanni Romeo, titolare' and rv[-1][2]['p_decision'] == 'approve')
    shot(pg, 'seo-ai', full=True)
    pg.goto(BASE + '/admin/seo/#conversioni'); pg.wait_for_timeout(600); pg.wait_for_selector('.seo-funnel')
    t = pg.inner_text('.pai-body')
    rec(G, 'CONVERSIONI: clic distinti da richieste, lead qualificati, preventivi, clienti, pagamenti', all(x in t for x in ['clic, non chiamate verificate', 'Lead qualificati', 'Preventivi accettati', 'Clienti acquisiti', 'Pagamenti confermati'])
        and pg.locator('.seo-funnel li').count() == 5)
    rec(G, 'CONVERSIONI: landing che generano richieste, canali e segmenti con fonte', '/servizi/idraulica/spurgo-lavandini/' in t and 'Ricerca organica' in t and 'Business' in t and 'Fonte:' in t)
    shot(pg, 'conversioni', full=True)
    pg.goto(BASE + '/admin/seo/#report'); pg.wait_for_timeout(600); pg.wait_for_selector('.pai-body table')
    with pg.expect_download() as d: pg.click('text=PDF')
    pdf = Path(d.value.path()).read_bytes()
    rec(G, 'REPORT: PDF generato dal server con il token dell’utente', pdf.startswith(b'%PDF') and any('report' in f[2] and f[4] == 'Bearer tok' for f in STATE['fn'] if f[1].endswith('/seo-admin')))
    with pg.expect_download() as d: pg.click('text=CSV ricerche')
    rec(G, 'REPORT: CSV delle ricerche', 'spurgo lavandino roma' in Path(d.value.path()).read_text(encoding='utf-8-sig'))
    pg.click('text=Genera report settimanale'); pg.wait_for_timeout(500)
    rec(G, 'REPORT: generazione su richiesta (settimanale)', rpcs('seo_build_report') and rpcs('seo_build_report')[-1][2]['p_kind'] == 'weekly')
    t = pg.inner_text('.pai-body')
    rec(G, 'richieste di recensione: nessun sollecito, nessun vantaggio, nessun filtro sulla soddisfazione', all(x in t for x in ['nessun sollecito', 'nessun vantaggio', 'nessun filtro']))
    pg.click('button:text-is("Invia")'); pg.wait_for_timeout(400)
    rec(G, 'richiesta di recensione inviata solo su azione dell’amministratore', rpcs('seo_send_review_request') and rpcs('seo_send_review_request')[-1][2] == {'p_id': 'rr1'})
    pg.goto(BASE + '/admin/seo/#impostazioni'); pg.wait_for_timeout(600); pg.wait_for_selector('.pai-rule')
    t = pg.inner_text('.pai-body')
    rec(G, 'IMPOSTAZIONI: stato delle integrazioni senza segreti (solo email del service account)', 'sa-prova@progetto.iam.gserviceaccount.com' in t and 'private_key' not in pg.content())
    rec(G, 'IMPOSTAZIONI: domini separati (nessun dato consolidato)', 'ispezionetubazioneroma.it' in t and 'nessun dato consolidato' in t)
    pg.click('.pai-body table >> nth=0 >> text=Attiva >> nth=0'); pg.wait_for_timeout(400)
    rec(G, 'zone operative attivabili dalla dashboard', rpcs('seo_set_zone') and rpcs('seo_set_zone')[-1][2]['p_slug'] == 'eur' and rpcs('seo_set_zone')[-1][2]['p_active'] is True)
    pg.click('text=Salva impostazioni'); pg.wait_for_timeout(400)
    ss = rpcs('seo_update_settings')
    rec(G, 'soglie degli allarmi configurabili', ss and ss[-1][2]['p']['clickDropPct'] == 30 and ss[-1][2]['p']['compareDays'] == 7)
    pg.click('text=Sincronizza ora'); pg.wait_for_timeout(400)
    rec(G, 'sincronizzazione non configurata: errore onesto, nessun dato inventato', 'Non configurato' in pg.inner_text('.pai-body'))
    shot(pg, 'impostazioni', full=True)
    rec(G, 'nessun errore JavaScript', not errs, errs[:2])
    for w in (1440, 390):
        pg.set_viewport_size({'width': w, 'height': 900})
        for tab in ('panoramica', 'pagine', 'ricerche', 'maps', 'ai', 'conversioni', 'report', 'impostazioni'):
            pg.goto(BASE + f'/admin/seo/#{tab}'); pg.wait_for_timeout(450)
            rec('Responsive', f'/admin/seo/#{tab} a {w}px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
    pg.goto(BASE + '/admin/seo/#panoramica'); pg.wait_for_timeout(500)
    shot(pg, 'panoramica-mobile')
    ctx.close()

    # --- operatore: sola lettura
    STATE.update(role='operator', calls=[], fn=[])
    ctx, pg, errs = new_page(b, logged=True)
    pg.goto(BASE + '/admin/seo/#impostazioni', wait_until='networkidle'); pg.wait_for_selector('.pai-tabs')
    tabs = pg.locator('.pai-tabs a').all_inner_texts()
    rec('Permessi', 'operatore: nessuna sezione Impostazioni', 'Impostazioni' not in ' '.join(tabs) and len(tabs) == 7, tabs)
    pg.goto(BASE + '/admin/seo/#ai'); pg.wait_for_timeout(600)
    rec('Permessi', 'operatore: proposte visibili ma senza pulsanti di approvazione né agente AI', pg.locator('.pai-action').count() >= 1 and pg.locator('.pai-action >> text=Approva').count() == 0 and pg.locator('.aic').count() == 0)
    pg.goto(BASE + '/admin/seo/#maps'); pg.wait_for_timeout(600)
    rec('Permessi', 'operatore: scheda Google in sola lettura', pg.locator('.pai-form input:not([disabled])').count() == 0 and pg.locator('text=Registra operazione').count() == 0)
    rec('Permessi', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()

    # --- senza Search Console collegata: nessun dato dimostrativo
    STATE.update(role='admin')
    RPC['seo_overview'] = lambda: {**overview(), 'connected': False, 'dataUntil': None, 'current': {'clicks': None, 'impressions': None, 'ctr': None, 'position': None},
                                   'prior': {}, 'trend': [], 'branded': {'available': False}, 'source': 'Google Search Console (Search Analytics API)'}
    ctx, pg, errs = new_page(b, logged=True)
    pg.goto(BASE + '/admin/seo/', wait_until='networkidle'); pg.wait_for_selector('.seo-kpi')
    t = pg.inner_text('.pai-body')
    rec(G, 'senza Search Console: avviso esplicito, metriche vuote, nessun dato dimostrativo', 'nessun dato dimostrativo' in t and '—' in t and pg.locator('.seo-chart').count() == 0)
    ctx.close()
    b.close()
srv.terminate()
build({})

ok = sum(1 for r in results if r[2])
md = f"\n## Test nel browser — PRONTO SEO (Playwright, Supabase, funzioni e Google simulati solo nel test)\n\nEseguito: {time.strftime('%Y-%m-%dT%H:%M:%S')} · `python3 scripts/e2e/seo-check.py`\n\n**Esito: {ok}/{len(results)} superati.**\n\n| Esito | Gruppo | Controllo | Dettaglio |\n|---|---|---|---|\n"
for g, n, o, d in results:
    md += f"| {'✅' if o else '❌'} | {g} | {n} | {d.replace('|', '/')[:200] if not o else ''} |\n"
rp = ROOT / 'reports/test-report.md'
text = rp.read_text() if rp.exists() else ''
text = re.sub(r'\n## Test nel browser — PRONTO SEO[\s\S]*?(?=\n## |\Z)', '', text)
rp.write_text(text.rstrip() + '\n' + md)
print(f'PRONTO SEO (browser): {ok}/{len(results)} superati')
for g, n, o, d in results:
    if not o: print(f'  ✖ {g} — {n}: {d}')
raise SystemExit(0 if ok == len(results) else 1)
