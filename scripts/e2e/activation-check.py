#!/usr/bin/env python3
"""
Test nel browser — attivazione operativa (Prompt 9), Chrome headless + Playwright.
1) Build SENZA flag dal database (come un sito appena collegato): nessun pulsante di acquisto
   utilizzabile, checkout e /paga/ non attivi, area clienti non accessibile, accesso via email
   con create_user=false (nessuna registrazione libera).
2) Build con backend SIMULATO solo nel test: pagine /admin/configurazione-azienda/, /admin/setup/,
   /admin/impostazioni/pagamenti/, /admin/funzionalita/, /admin/lancio/ — dati e chiamate verso le
   funzioni del database/Netlify. Le risposte simulate NON finiscono mai nel sito.
Aggiunge l'esito a reports/test-report.md.
"""
import json, os, re, subprocess, time
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PORT = 4399
BASE = f'http://localhost:{PORT}'
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
MOCK = 'https://mock.supabase.test'
ALL_ON = {k: True for k in ['customer_registration', 'customer_login', 'family', 'business', 'hotel', 'corporate', 'protected_work', 'online_purchases', 'mypos',
                            'technician_dashboard', 'pronto_ai', 'pronto_seo', 'notifications']}
ALL_OFF = {k: False for k in ALL_ON}
SHOTS = ROOT / 'reports/screenshots'
results = []
def rec(g, n, ok, d=''): results.append((g, n, bool(ok), str(d)))

def build(env_extra):
    subprocess.run(['node', 'scripts/build.js'], cwd=ROOT, env={**os.environ, **env_extra}, check=True, stdout=subprocess.DEVNULL)
def serve():
    return subprocess.Popen(['node', 'scripts/serve.js'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT), 'SERVE_CSP_EXTRA': MOCK}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

STATE = {'role': 'admin', 'calls': [], 'flags': None}
FIELDS = ['tradeName', 'legalName', 'ownerName', 'vatNumber', 'pec', 'registeredOffice', 'operatingOffice', 'phone', 'whatsapp', 'email', 'logoPath', 'ownerPhotoPath',
          'description', 'serviceZonesNote', 'hours', 'serviceAvailability', 'qualifications', 'insurancePublic', 'social']
REQ = {'tradeName', 'legalName', 'ownerName', 'vatNumber', 'registeredOffice', 'phone', 'email', 'hours'}
def company():
    vals = {'tradeName': 'Pronto Intervento Roma', 'ownerName': 'Giovanni Romeo'}
    return {'fields': [{'field': f, 'required': f in REQ, 'value': vals.get(f), 'empty': f not in vals, 'verified': {'source': 'visura di prova'} if f == 'tradeName' else None} for f in FIELDS],
            'private': {'taxCode': None, 'rea': None, 'insurance': {}, 'qualificationDocuments': [], 'notes': None},
            'missingRequired': sorted(REQ - {'tradeName'}), 'updatedAt': '2026-11-18T10:00:00Z'}
FLAGS = [{'key': k, 'label': k.replace('_', ' ').capitalize(), 'description': f'Descrizione {k}', 'category': 'x', 'enabled': False, 'requires': ['online_purchases'] if k in ('family', 'protected_work') else (['mypos'] if k == 'online_purchases' else []),
          'note': None, 'updatedAt': None, 'updatedBy': None, 'history': []} for k in ALL_ON]
STEPS = [{'id': i, 'title': t, 'status': s, 'label': l, 'detail': f'dettaglio {i}', 'howTo': f'istruzioni {i}', 'blocks': b} for i, t, s, l, b in [
    ('company', 'Dati aziendali', 'checking', 'In verifica', ['A', 'B']), ('contacts', 'Contatti', 'todo', 'Da configurare', ['A', 'B']), ('services', 'Servizi attivi', 'configured', 'Configurato', ['B']),
    ('zones', 'Zone operative', 'todo', 'Da configurare', []), ('pricing', 'Prezzi e condizioni', 'todo', 'Da configurare', ['B']), ('supabase', 'Supabase', 'verified', 'Verificato', ['B']),
    ('mypos', 'myPOS', 'todo', 'Da configurare', ['B']), ('email', 'Email transazionali', 'error', 'Errore', ['B']), ('gsc', 'Google Search Console', 'todo', 'Da configurare', []),
    ('legal', 'Privacy e documentazione legale', 'todo', 'Da configurare', ['A', 'B']), ('tests', 'Test finali', 'todo', 'Da configurare', ['B'])]]
SETUP = {'db': {'checks': {}, 'flags': ALL_OFF, 'database': {'environment': 'staging', 'migrationMarker': '20261119090000_activation', 'tablesWithoutForcedRls': 0}},
         'integ': {'site': {'siteEnv': 'preview', 'auditErrors': 0, 'allowIndexing': False, 'formsProvider': None, 'stagingProtected': True, 'deployUrl': 'https://staging--pronto-intervento-roma-2.netlify.app'}, 'ai': {'ready': False}},
         'steps': STEPS, 'generatedAt': '2026-11-18T10:00:00Z',
         'readiness': {'A': {'ready': False, 'blockers': ['Telefono ed email non verificati: il sito non ha un contatto funzionante'], 'warnings': ['Fotografie segnaposto ancora presenti']},
                       'B': {'ready': False, 'blockers': ['myPOS: Da configurare', 'Manca l’approvazione scritta del titolare al lancio'], 'warnings': []}, 'steps': STEPS}}
MYPOS = {'config': {'env': 'sandbox', 'ready': True, 'missing': [], 'problems': [], 'notifyUrl': 'https://staging.example.test/.netlify/functions/mypos-notify', 'refundsEnabled': False, 'statusQueryEnabled': True, 'allowLive': False},
         'flags': ALL_OFF, 'data': {'ordersCreated': 1, 'checkoutsStarted': 1, 'verifiedNotifications': 0, 'transactionsRecorded': 0, 'contractsActivatedByPayment': 0, 'duplicatesBlocked': 0, 'rejected': 0, 'lastCheckoutAt': '2026-11-18T09:00:00Z'},
         'lastConnectionTest': None, 'lastFullTest': None}

def handler(route):
    req = route.request; u = urlparse(req.url); path = u.path; m = req.method
    try: body = json.loads(req.post_data) if req.post_data else None
    except Exception: body = req.post_data
    STATE['calls'].append((m, path, body))
    def ok(data, status=200): return route.fulfill(status=status, content_type='application/json', body=json.dumps(data))
    if path == '/auth/v1/user': return ok({'id': 'u-admin', 'email': 'admin@example.test'})
    if path in ('/auth/v1/logout', '/auth/v1/otp'): return ok({})
    t = path.replace('/rest/v1/', '')
    if t == 'profiles': return ok([{'id': 'u-admin', 'role': STATE['role'], 'full_name': 'Amministratore di prova', 'email': 'admin@example.test'}])
    if t == 'rpc/company_profile_admin' or t == 'rpc/company_profile_update' or t == 'rpc/company_profile_verify': return ok(company())
    if t == 'rpc/feature_flags_admin': return ok(FLAGS)
    if t == 'rpc/set_feature_flag':
        if body.get('p_key') == 'online_purchases' and body.get('p_enabled'): return ok({'message': 'Prima attiva: mypos'}, 400)
        return ok({})
    if t.startswith('rpc/'): return ok({})
    return ok([] if m == 'GET' else {})

def fn_handler(route):
    u = urlparse(route.request.url); m = route.request.method
    STATE['calls'].append((m, u.path, route.request.post_data))
    def ok(data, status=200): return route.fulfill(status=status, content_type='application/json', body=json.dumps(data))
    if u.path.endswith('/setup-status'): return ok(SETUP)
    if u.path.endswith('/mypos-status'):
        if m == 'POST': return ok({'ok': False, 'signatureValid': False, 'error': 'Firma della risposta non valida', 'myposEnv': 'sandbox'}, 502)
        return ok(MYPOS)
    if u.path.endswith('/email-test'): return ok({'error': 'not_configured', 'message': 'Nessun provider email configurato: nessuna email inviata.'}, 409)
    if u.path.endswith('/site-rebuild'): return ok({'error': 'not_configured', 'message': 'Build hook non configurato: ripubblica dal pannello Netlify (Deploys → Trigger deploy).'}, 409)
    return ok({'error': 'not_configured'}, 503)

def new_page(browser, w=1440, h=900, logged=True):
    ctx = browser.new_context(viewport={'width': w, 'height': h})
    if logged: ctx.add_init_script("localStorage.setItem('pir.session', JSON.stringify({access_token:'tok',refresh_token:'ref',expires_at:Math.floor(Date.now()/1000)+3600}))")
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda c: errs.append(c.text) if c.type == 'error' and 'Failed to load resource' not in c.text else None)
    pg.route(f'{MOCK}/**', handler); pg.route('**/.netlify/functions/**', fn_handler)
    pg.on('dialog', lambda d: d.accept('approvato dal titolare via email di prova') if d.type == 'prompt' else d.accept())
    return ctx, pg, errs
def overflow(pg): return pg.evaluate('document.documentElement.scrollWidth') - pg.viewport_size['width']
def shot(pg, name):
    SHOTS.mkdir(parents=True, exist_ok=True); pg.screenshot(path=str(SHOTS / f'p9-{name}.jpg'), type='jpeg', quality=62, full_page=False)

# ================================================================== 1. funzionalità spente (backend simulato, flag tutti off)
build({'PUBLIC_SUPABASE_URL': MOCK, 'PUBLIC_SUPABASE_ANON_KEY': 'anon-test-key', 'BUILD_TEST_FLAGS': json.dumps(ALL_OFF)})
srv = serve(); time.sleep(0.8)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        ctx, pg, errs = new_page(b, logged=False)
        for path in ['/piani-assistenza/famiglie/', '/lavoro-protetto/', '/piani-assistenza/business/', '/hotel-e-strutture-ricettive/', '/corporate/', '/']:
            pg.goto(BASE + path, wait_until='networkidle')
            hrefs = pg.eval_on_selector_all('a[href*="/checkout/"]', 'els => els.map(e => e.getAttribute("href"))')
            rec('Funzionalità spente', f'{path}: nessun link al checkout', not hrefs, hrefs[:2])
        pg.goto(BASE + '/checkout/?piano=family-idraulica-base', wait_until='networkidle'); pg.wait_for_timeout(300)
        txt = pg.inner_text('#app')
        rec('Funzionalità spente', '/checkout/: “Acquisti online non attivi”, nessun pulsante di pagamento', 'Acquisti online non attivi' in txt and pg.locator('#app button').count() == 0, txt[:80])
        pg.goto(BASE + '/paga/?t=abc', wait_until='networkidle'); pg.wait_for_timeout(300)
        rec('Funzionalità spente', '/paga/: “Pagamenti online non attivi”', 'Pagamenti online non attivi' in pg.inner_text('#app'))
        pg.goto(BASE + '/area-cliente/', wait_until='networkidle'); pg.wait_for_timeout(300)
        txt = pg.inner_text('#app')
        rec('Funzionalità spente', '/area-cliente/: accesso clienti non attivo, nessun modulo di accesso', 'accesso non ancora attivo' in txt and pg.locator('#login-email').count() == 0, txt[:80])
        STATE['calls'].clear()
        pg.goto(BASE + '/admin/', wait_until='networkidle'); pg.wait_for_timeout(300)
        pg.fill('#login-email', 'admin@example.test'); pg.click('.app-login button[type=submit]'); pg.wait_for_timeout(300)
        otp = [c for c in STATE['calls'] if c[1] == '/auth/v1/otp']
        rec('Funzionalità spente', 'accesso staff: richiesta del codice con create_user=false (nessuna registrazione libera)', otp and otp[0][2].get('create_user') is False, otp[:1])
        rec('Funzionalità spente', 'nessun errore JavaScript', not errs, errs[:2])
        ctx.close(); b.close()
finally:
    srv.terminate()

# ================================================================== 2. pagine di attivazione (stessa build)
srv = serve(); time.sleep(0.8)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        STATE.update(role='admin', calls=[])
        ctx, pg, errs = new_page(b)
        # --- configurazione azienda
        pg.goto(BASE + '/admin/configurazione-azienda/', wait_until='networkidle'); pg.wait_for_timeout(500)
        txt = pg.inner_text('#app')
        rec('Configurazione azienda', '19 campi pubblici con stato (obbligatorio/facoltativo, verificato/non pubblicato)', pg.locator('.cfg-field').count() == 19 and 'Non verificato: non pubblicato' in txt and 'Obbligatorio' in txt and 'Facoltativo' in txt, pg.locator('.cfg-field').count())
        rec('Configurazione azienda', 'campo verificato mostra la fonte; obbligatori mancanti elencati', 'Verificato · visura di prova' in txt and 'Obbligatori ancora da inserire' in txt and 'Partita IVA' in txt)
        rec('Configurazione azienda', 'sezione dati riservati separata (codice fiscale, REA, polizza, documenti)', 'Dati riservati (mai pubblicati)' in txt and 'Codice fiscale' in txt and 'Documentazione delle qualifiche' in txt)
        rec('Configurazione azienda', 'nessuna richiesta di chiavi o password', not re.search(r'chiave privata|password|api key|service.?role', txt, re.I))
        pg.locator('.cfg-field').nth(1).locator('input[type=text]').fill('Romeo Impianti Srl di prova')
        pg.get_by_role('button', name='Salva i dati', exact=True).click(); pg.wait_for_timeout(400)
        upd = [c for c in STATE['calls'] if c[1].endswith('rpc/company_profile_update')]
        rec('Configurazione azienda', 'salvataggio invia SOLO il campo modificato a company_profile_update', upd and upd[-1][2] == {'p': {'legalName': 'Romeo Impianti Srl di prova'}}, upd[-1:] )
        pg.get_by_role('button', name='Verifica i campi selezionati').click(); pg.wait_for_timeout(300)
        rec('Configurazione azienda', 'verifica senza campi selezionati rifiutata nell’interfaccia', 'Seleziona almeno un campo' in pg.inner_text('#app'))
        pg.get_by_role('button', name='Aggiorna il sito con i dati verificati').click(); pg.wait_for_timeout(300)
        rec('Configurazione azienda', 'aggiornamento del sito senza build hook: messaggio reale, nessun successo simulato', 'Build hook non configurato' in pg.inner_text('#app'))
        rec('Configurazione azienda', 'nessun overflow a 1440px', overflow(pg) <= 1, overflow(pg))
        shot(pg, 'configurazione-azienda')
        # --- setup
        pg.goto(BASE + '/admin/setup/', wait_until='networkidle'); pg.wait_for_timeout(500)
        txt = pg.inner_text('#app')
        rec('Setup', '11 voci del wizard con stato', pg.locator('.setup-step').count() == 11 and all(x in txt for x in ['Da configurare', 'Configurato', 'In verifica', 'Verificato', 'Errore']))
        rec('Setup', 'distinzione bloccanti lancio / completabili dopo', 'Blocca il sito pubblico' in txt and 'Blocca la piattaforma' in txt and 'Completabile dopo' in txt)
        rec('Setup', 'chiavi solo nel pannello dei provider (mai in pagina)', 'non si inseriscono qui né in chat' in txt)
        rec('Setup', 'istruzioni pratiche per ogni voce', pg.locator('.setup-step details').count() == 11)
        pg.get_by_role('button', name='Invia un’email di prova al mio indirizzo').click(); pg.wait_for_timeout(300)
        rec('Setup', 'email di prova senza provider: “nessuna email inviata” (nessun invio dichiarato)', 'nessuna email inviata' in pg.inner_text('#app'))
        legal = pg.locator('.cfg-check').filter(has_text='Informativa privacy')
        legal.locator('select').select_option('verified'); legal.get_by_role('button', name='Registra').click(); pg.wait_for_timeout(300)
        sc = [c for c in STATE['calls'] if c[1].endswith('rpc/set_setup_check')]
        rec('Setup', 'verifica manuale registrata nel database tramite set_setup_check', sc and sc[-1][2]['p_key'] == 'legal_privacy' and sc[-1][2]['p_status'] == 'verified', sc[-1:])
        rec('Setup', 'nessun overflow a 1440px', overflow(pg) <= 1, overflow(pg))
        shot(pg, 'setup')
        # --- pagamenti
        pg.goto(BASE + '/admin/impostazioni/pagamenti/', wait_until='networkidle'); pg.wait_for_timeout(500)
        txt = pg.inner_text('#app')
        rec('Pagamenti', 'stato myPOS: ambiente, configurazione, URL di notifica, funzionalità', 'sandbox' in txt and 'URL di notifica' in txt and 'Funzionalità “myPOS” attiva' in txt)
        rec('Pagamenti', 'prova completa: voci superate solo se registrate (ordine sì, notifica no)', 'Ordine creato' in txt and pg.locator('.cfg-list li').count() == 6 and pg.locator('.cfg-list li .app-badge--ok').count() == 2)
        rec('Pagamenti', 'nessun segreto mostrato', not re.search(r'BEGIN|PRIVATE KEY|MYPOS_PRIVATE_KEY=', txt))
        pg.get_by_role('button', name='Esegui la prova di connessione').click(); pg.wait_for_timeout(500)
        rec('Pagamenti', 'prova di connessione fallita mostrata come tale (nessuna connessione simulata)', 'Connessione non verificata' in pg.inner_text('#app'))
        shot(pg, 'pagamenti')
        # --- funzionalità
        pg.goto(BASE + '/admin/funzionalita/', wait_until='networkidle'); pg.wait_for_timeout(500)
        rec('Funzionalità', '13 interruttori (12 del Prompt + Corporate)', pg.locator('.flag').count() == 13, pg.locator('.flag').count())
        pg.locator('.flag').filter(has_text='Online purchases').get_by_role('button', name='Attiva').click(); pg.wait_for_timeout(400)
        rec('Funzionalità', 'dipendenza verificata dal server: errore mostrato (acquisti online senza myPOS)', 'Prima attiva: mypos' in pg.inner_text('#app'))
        shot(pg, 'funzionalita')
        # --- lancio
        pg.goto(BASE + '/admin/lancio/', wait_until='networkidle'); pg.wait_for_timeout(500)
        txt = pg.inner_text('#app')
        rec('Lancio', 'livello A e livello B con esito NO-GO e bloccanti', pg.locator('.launch .app-badge', has_text='NO-GO').count() == 2 and 'Livello A' in txt and 'Livello B' in txt and 'approvazione scritta del titolare' in txt)
        rec('Lancio', '12 aree di stato (sito, dati, moduli, database, autenticazione, pagamenti, condizioni, email, AI, SEO, staging, dominio)', all(a in txt for a in
            ['Sito pubblico', 'Dati aziendali', 'Moduli', 'Database', 'Autenticazione', 'Pagamenti', 'Condizioni e listini', 'Email', 'PRONTO AI', 'SEO', 'Staging', 'Dominio']))
        rec('Lancio', 'nessun pulsante per forzare il GO', pg.locator('#app button', has_text=re.compile('GO|forza', re.I)).count() == 0)
        rec('Lancio', 'nessun errore JavaScript nelle pagine di attivazione', not errs, errs[:2])
        shot(pg, 'lancio')
        ctx.close()
        # --- ruolo cliente: accesso negato
        STATE.update(role='customer', calls=[])
        ctx, pg, errs = new_page(b)
        for path in ['/admin/configurazione-azienda/', '/admin/setup/', '/admin/lancio/']:
            pg.goto(BASE + path, wait_until='networkidle'); pg.wait_for_timeout(300)
            rec('Permessi', f'{path}: cliente → “Accesso non autorizzato”, nessuna chiamata ai dati', 'Accesso non autorizzato' in pg.inner_text('#app') and not [c for c in STATE['calls'] if 'company_profile' in c[1] or 'setup-status' in c[1]])
        ctx.close()
        # --- mobile
        STATE.update(role='admin', calls=[])
        ctx, pg, errs = new_page(b, w=390, h=844)
        for path in ['/admin/configurazione-azienda/', '/admin/setup/', '/admin/lancio/']:
            pg.goto(BASE + path, wait_until='networkidle'); pg.wait_for_timeout(400)
            rec('Responsive', f'{path} a 390px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
        ctx.close(); b.close()
finally:
    srv.terminate()
build({})

ok = sum(1 for r in results if r[2])
md = f"\n## Test nel browser — attivazione operativa (Prompt 9, backend simulato solo nel test)\n\nEseguito: {time.strftime('%Y-%m-%dT%H:%M:%S')} · `python3 scripts/e2e/activation-check.py`\n\n**Esito: {ok}/{len(results)} superati.**\n\n| Esito | Gruppo | Controllo | Dettaglio |\n|---|---|---|---|\n"
for g, n, o, d in results:
    md += f"| {'✅' if o else '❌'} | {g} | {n} | {d.replace('|', '/')[:200] if not o else ''} |\n"
rp = ROOT / 'reports/test-report.md'
text = rp.read_text() if rp.exists() else ''
text = re.sub(r'\n## Test nel browser — attivazione operativa[\s\S]*?(?=\n## |\Z)', '', text)
rp.write_text(text.rstrip() + '\n' + md)
print(f'Attivazione operativa (browser): {ok}/{len(results)} superati')
for g, n, o, d in results:
    if not o: print(f'  ✖ {g} — {n}: {d}')
raise SystemExit(0 if ok == len(results) else 1)
