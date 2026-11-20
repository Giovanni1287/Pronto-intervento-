#!/usr/bin/env python3
"""
Test nel browser di PRONTO AI (Prompt 6) — Chrome headless + Playwright.
Le risposte di /.netlify/functions/ai-* e di Supabase sono SIMULATE solo in questo test
(intercettazione di rete): nessun provider AI reale viene chiamato e i dati sono fittizi.
1) Sito pubblico con PUBLIC_AI_WIDGET=true: caricamento solo al clic, flusso completo
   Customer Assistant → riepilogo → conferma esplicita → numero dalla centrale,
   pericolo (gas), backend non raggiungibile, ripresa della conversazione, mobile.
2) Console /admin/pronto-ai/: sezioni, azioni da approvare, costi, impostazioni, permessi operatore.
3) Area tecnico (ASSISTENTE TECNICO AI) e centrale (Chiedi a PRONTO AI).
Screenshot in reports/screenshots/p6-*.jpg; esito aggiunto a reports/test-report.md.
"""
import json, os, re, subprocess, time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PORT = 4394
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
# larghezza del documento rispetto alla larghezza REALE del dispositivo (con l'emulazione mobile innerWidth si allarga col contenuto)
def overflow(pg): return pg.evaluate('document.documentElement.scrollWidth') - pg.viewport_size['width']
def shot(pg, name, full=False):
    SHOTS.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(SHOTS / f'p6-{name}.jpg'), type='jpeg', quality=62, full_page=full)

now = datetime.now(timezone.utc).replace(microsecond=0)
iso = lambda d: d.isoformat().replace('+00:00', 'Z')
CONV = '66666666-6666-4666-8666-666666666666'
INT_ID = '11111111-1111-4111-8111-111111111111'
JOB_ID = '22222222-2222-4222-8222-222222222222'
TOKEN = 'T' * 43
HASH = 'a' * 64
STATE = {'chat': [], 'confirm': [], 'mode': 'ok', 'role': 'admin', 'calls': []}

# ------------------------------------------------------------------ funzioni AI SIMULATE
def ai_fn(route):
    req = route.request
    path = urlparse(req.url).path
    body = json.loads(req.post_data) if req.post_data else {}
    def ok(data, status=200): return route.fulfill(status=status, content_type='application/json', body=json.dumps(data))
    if path.endswith('/ai-chat'):
        STATE['chat'].append({'body': body, 'auth': req.headers.get('authorization')})
        if STATE['mode'] == 'down': return ok({'error': 'backend_unavailable', 'message': 'Il servizio non risponde in questo momento: nessuna richiesta è stata registrata.'}, 502)
        if body.get('action') == 'history':
            return ok({'conversationId': CONV, 'messages': [{'role': 'user', 'content': 'Lavandino otturato'}, {'role': 'assistant', 'content': 'Risposta precedente di prova.'}],
                       'draft': {'draft': {'categoryId': 'idraulica', 'serviceId': 'idraulica/spurgo-lavandini', 'description': 'Lavandino della cucina otturato da ieri', 'zone': 'Roma, Monteverde'}, 'draftHash': HASH, 'version': 2}})
        agent = body.get('agent')
        if agent != 'customer':
            return ok({'conversationId': CONV, 'ai': True, 'reply': f'Risposta di prova dell’agente {agent}: periodo oggi, fonte interventions, dati mancanti nessuno.', 'proposals': [], 'status': 'ok'})
        msg = body.get('message', '').lower()
        if 'gas' in msg:
            return ok({'conversationId': CONV, 'ai': True, 'reply': 'Ho segnato la richiesta come urgente. Indica la zona per completare il riepilogo.',
                       'safety': {'level': 'emergency', 'kinds': ['gas'], 'messages': ['Se senti odore di gas: non accendere né spegnere luci… esci dall’edificio e chiama il 112.', 'Pronto Intervento Roma non è un servizio pubblico di emergenza.']}, 'draft': None})
        first = len([c for c in STATE['chat'] if c['body'].get('agent') == 'customer' and not c['body'].get('action')]) == 1
        return ok({'conversationId': CONV, **({'conversationToken': TOKEN} if first else {}), 'ai': True,
                   'reply': 'Ho preparato il riepilogo: controlla i dati e premi "Conferma e invia".', 'safety': {'level': 'none', 'kinds': [], 'messages': []},
                   'draft': {'draft': {'categoryId': 'idraulica', 'serviceId': 'idraulica/spurgo-lavandini', 'description': 'Lavandino della cucina otturato da ieri', 'zone': 'Roma, Monteverde', 'urgency': 'normal'},
                             'draftHash': HASH, 'version': 1}})
    if path.endswith('/ai-confirm'):
        STATE['confirm'].append(body)
        if STATE['mode'] == 'down': return ok({'error': 'backend_unavailable', 'registered': False, 'message': 'Servizio non raggiungibile: la richiesta NON è stata registrata.'}, 502)
        return ok({'ok': True, 'registered': True, 'number': 'RIC-2026-AITEST', 'duplicate': False}, 201)
    if path.endswith('/ai-status'):
        o = overview()
        o['provider'] = {'configured': True, 'name': 'anthropic', 'model': 'modello-di-prova', 'envKillSwitch': False, 'hashSaltConfigured': True, 'serviceRoleConfigured': True}
        return ok(o)
    return route.fulfill(status=503, content_type='application/json', body='{"error":"not_configured"}')

def overview():
    admin = STATE['role'] == 'admin'
    agents = [{'id': a, 'name': n, 'description': d, 'essential': e, 'enabled': True, 'allowedRoles': r, 'maxOutputTokens': None, 'hourlyLimit': None} for a, n, d, e, r in [
        ('customer', 'Customer Assistant', 'Clienti del sito', True, ['anon', 'customer']), ('dispatch', 'Dispatch Assistant', 'Centrale', True, ['operator', 'admin']),
        ('technical', 'Technical Assistant', 'Tecnici', False, ['technician', 'admin']), ('commercial', 'Commercial Assistant', 'Commerciale', False, ['admin']), ('management', 'Management Assistant', 'Titolare', False, ['admin'])]]
    return {'settings': {'enabled': False, 'monthly_budget_cents': 3000, 'warn_pct': 80, 'nonessential_stop_pct': 90, 'hard_stop_pct': 100, 'max_model_calls': 6, 'max_tool_calls': 8, 'timeout_ms': 20000,
                         'max_output_tokens': 800, 'user_hourly_limit': 40, 'anon_hourly_limit': 15, 'anon_daily_limit': 40, 'price_input_per_mtok_micros': None, 'price_output_per_mtok_micros': None,
                         'retention_days': 90, 'provider_dpa_confirmed': False, 'privacy_notice_version': None} if admin else None,
            'agents': agents, 'pendingActions': 1,
            'permissions': {'manage': admin, 'management': admin, 'commercial': admin, 'dispatch': True, 'assign': True}}

ACTIONS = [{'id': '77777777-7777-4777-8777-777777777777', 'number': 'AIA-2026-PROVA1', 'action': 'assign_technician', 'agent': 'dispatch', 'status': 'pending', 'requestedBy': 'Operatore Prova',
            'targetType': 'intervention', 'targetId': INT_ID, 'targetNumber': 'RIC-2026-PROVA1', 'payload': {'technicianId': 'x', 'technician': 'Tecnico Prova', 'startsAt': iso(now + timedelta(days=1)), 'endsAt': iso(now + timedelta(days=1, hours=2))},
            'rationale': 'Tecnico con specializzazione idraulica libero nella fascia.', 'dataUsed': ['available_slots', 'check_assignment'], 'missing': ['indirizzo'],
            'expectedEffect': 'Assegnazione del tecnico Tecnico Prova: notifica al cliente e al tecnico.', 'createdAt': iso(now), 'expiresAt': iso(now + timedelta(hours=4)), 'canDecide': True},
           {'id': '88888888-8888-4888-8888-888888888888', 'number': 'AIA-2026-PROVA0', 'action': 'confirm_appointment', 'agent': 'dispatch', 'status': 'stale', 'requestedBy': 'Operatore Prova',
            'targetType': 'intervention', 'targetId': INT_ID, 'targetNumber': 'RIC-2026-PROVA1', 'payload': {}, 'rationale': 'Prima fascia disponibile.', 'dataUsed': [], 'missing': [],
            'expectedEffect': 'Programmazione.', 'createdAt': iso(now - timedelta(hours=5)), 'expiresAt': iso(now - timedelta(hours=1)), 'decisionNote': 'Dati cambiati dopo la proposta: serve una nuova conferma', 'canDecide': True}]
COSTS = {'month': now.date().replace(day=1).isoformat(), 'pricesConfigured': False, 'requestsMonth': 42, 'daily': [{'day': now.date().isoformat(), 'requests': 42, 'errors': 1, 'blocked': 3}],
         'inputTokens': 120000, 'outputTokens': 18000, 'estimatedCostCents': 0, 'actualCostCents': None, 'byAgent': [{'agent': 'customer', 'requests': 30, 'estimatedCostCents': 0}, {'agent': 'management', 'requests': 12, 'estimatedCostCents': 0}],
         'byCategory': [{'category': 'chat', 'requests': 42, 'estimatedCostCents': 0}], 'errors': 1, 'blocked': 3, 'budgetCents': 3000, 'remainingCents': 3000,
         'thresholds': {'warnPct': 80, 'nonessentialStopPct': 90, 'hardStopPct': 100}, 'note': 'Il budget è un limite operativo interno, non una garanzia di spesa.'}
RULES = [{'id': r, 'name': n, 'description': 'Descrizione di prova', 'frequency': 'daily', 'run_hour': 7, 'enabled': i == 0, 'last_run_at': None, 'next_run_at': None} for i, (r, n) in enumerate([
    ('daily_requests_summary', 'Riepilogo giornaliero richieste'), ('unassigned_requests', 'Richieste non assegnate'), ('expiring_contracts', 'Contratti in scadenza'), ('appointments_without_technician', 'Appuntamenti senza tecnico'),
    ('post_intervention_checks', 'Controlli post-intervento'), ('weekly_completed_summary', 'Interventi completati della settimana'), ('monthly_subscriptions_report', 'Report mensile abbonamenti'),
    ('incomplete_reports', 'Rapporti incompleti'), ('quotes_awaiting_approval', 'Preventivi in attesa'), ('payment_errors', 'Errori di pagamento')])]
JOB = {'id': JOB_ID, 'number': 'RIC-2026-PROVA1', 'kind': 'intervention', 'status': 'in_progress', 'statusLabel': 'In corso', 'category': 'Idraulica', 'service': 'Spurgo lavandini', 'description': 'Lavandino che non scarica',
       'addressLine': 'Via di Prova 1', 'city': 'Roma', 'postalCode': '00100', 'startsAt': iso(now - timedelta(hours=1)), 'endsAt': iso(now + timedelta(hours=1)), 'slot': None, 'priority': 'normal', 'urgency': 'normal',
       'equipment': None, 'assignmentNotes': None, 'contactName': 'Cliente Prova', 'contactPhone': '06 0000001', 'reportStatus': 'draft', 'correctionNote': None, 'covered': False,
       'notes': [], 'materials': [], 'time': [], 'photos': [], 'extraWorks': [], 'report': {'status': 'draft'}, 'editable': True}

def sb(route):
    req = route.request
    u = urlparse(req.url); path = u.path
    body = json.loads(req.post_data) if req.post_data else None
    STATE['calls'].append((req.method, path, body))
    uid = {'admin': 'u-admin', 'operator': 'u-oper', 'technician': 'u-tech'}[STATE['role']]
    def ok(data, status=200): return route.fulfill(status=status, content_type='application/json', body=json.dumps(data))
    if path == '/auth/v1/user': return ok({'id': uid, 'email': 'utente@example.test'})
    t = path.replace('/rest/v1/', '')
    if t == 'profiles': return ok([{'id': uid, 'role': STATE['role'], 'full_name': 'Utente di prova', 'email': 'utente@example.test'}])
    if t == 'role_permissions': return ok([{'permission': p} for p in ['ops.view', 'ops.manage', 'ops.assign', 'stats.view', 'ai.use_dispatch']])
    if t == 'ai_automation_rules': return ok(RULES)
    if t == 'ai_automation_jobs': return ok([{'rule_id': 'daily_requests_summary', 'run_key': 'daily_requests_summary:2026-11-18', 'status': 'succeeded', 'attempts': 1, 'finished_at': iso(now), 'result': {'interventions': 3}, 'error': None}])
    if t.startswith('ai_knowledge_documents'): return ok([{'id': 'd1', 'title': 'FAQ di prova', 'scope': 'public', 'source_kind': 'faq', 'version': 1, 'status': 'approved', 'created_at': iso(now), 'approved_at': iso(now)}])
    if t == 'ai_security_events': return ok([{'created_at': iso(now), 'kind': 'prompt_injection_suspected', 'severity': 'warning', 'agent_id': 'customer', 'detail': {'patterns': 1}}])
    if t == 'ai_tool_executions': return ok([{'created_at': iso(now), 'agent_id': 'dispatch', 'tool': 'available_slots', 'kind': 'read', 'status': 'ok', 'duration_ms': 41, 'error': None}])
    if t == 'technicians': return ok([{'id': 't1', 'display_name': 'Tecnico Prova', 'active': True}])
    rpc = {'ai_pending_actions': ACTIONS, 'ai_cost_summary': COSTS, 'ai_admin_overview': overview(), 'ai_decide_action': {'status': 'stale'}, 'ai_update_settings': {}, 'ai_set_automation': None,
           'my_jobs': [JOB], 'my_job': JOB}
    if t.startswith('rpc/'): return ok(rpc.get(t[4:], {}))
    return ok([] if req.method == 'GET' else {})

def new_page(browser, w=1440, h=900, logged=False, mobile=False):
    ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
    if logged: ctx.add_init_script("localStorage.setItem('pir.session', JSON.stringify({access_token:'tok',refresh_token:'ref',expires_at:Math.floor(Date.now()/1000)+3600}))")
    pg = ctx.new_page()
    errs, reqs = [], []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda c: errs.append(c.text) if c.type == 'error' and 'Failed to load resource' not in c.text else None)
    pg.on('request', lambda r: reqs.append(r.url))
    pg.route(f'{MOCK}/**', sb)
    pg.route('**/.netlify/functions/**', ai_fn)
    pg.on('dialog', lambda d: d.accept('Motivo di prova') if d.type == 'prompt' else d.accept())
    return ctx, pg, errs, reqs

# ================================================================== 1. sito pubblico
build({'PUBLIC_AI_WIDGET': 'true'})
srv = serve(); time.sleep(0.8)
G = 'Widget sul sito'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    ctx, pg, errs, reqs = new_page(b)
    pg.goto(BASE + '/servizi/idraulica/spurgo-lavandini/', wait_until='networkidle')
    rec(G, 'landing: pulsante visibile, widget NON scaricato al caricamento', pg.is_visible('[data-ai-launcher]') and not any('ai-widget' in r for r in reqs))
    pg.click('[data-ai-launcher]'); pg.wait_for_selector('.aiw', state='visible')
    rec(G, 'al clic: JS e CSS del widget scaricati', any(r.endswith('/assets/js/ai-widget.js') for r in reqs) and any(r.endswith('/assets/css/ai-widget.css') for r in reqs))
    txt = pg.inner_text('.aiw')
    rec(G, 'assistente riconoscibile come AI, con avviso 112 e non servizio di emergenza', 'intelligenza artificiale' in txt and 'Non è un servizio di emergenza' in txt and '112' in txt)
    rec(G, 'pulsanti dei servizi (6 categorie reali) e suggerimenti', pg.locator('.aiw-chips .aiw-chip').count() == 9)
    rec(G, 'pulsante per l’assistenza umana', pg.is_visible('text=Preferisci parlare con una persona?'))
    pg.fill('.aiw-input', 'Il lavandino della cucina è otturato, il mio numero è 333 1234567'); pg.keyboard.press('Enter')
    pg.wait_for_selector('.aiw-draft')
    c0 = STATE['chat'][-1]['body']
    rec(G, 'messaggio inviato al solo backend (agente customer, pagina e contesto)', c0['agent'] == 'customer' and c0['page'] == '/servizi/idraulica/spurgo-lavandini/' and c0['context'].get('serviceId') == 'idraulica/spurgo-lavandini')
    rec(G, 'risposta marcata "generata dall’AI"', 'generata dall’ai' in pg.inner_text('.aiw-msg--assistant >> nth=1').lower())
    d = pg.inner_text('.aiw-draft')
    rec(G, 'riepilogo con categoria e servizio del catalogo, zona e "non ancora inviata"', 'Idraulica' in d and 'Spurgo lavandini' in d and 'Monteverde' in d and 'Non è ancora stata inviata' in d)
    rec(G, 'nessuna richiesta inviata senza conferma', not STATE['confirm'])
    shot(pg, 'widget-riepilogo')
    pg.fill('.aiw-input', 'Sento anche odore di gas'); pg.keyboard.press('Enter'); pg.wait_for_selector('.aiw-note--danger')
    dn = pg.inner_text('.aiw-note--danger')
    rec(G, 'pericolo: messaggio di sicurezza e pulsante 112', 'pericolo' in dn.lower() and pg.locator('.aiw-note--danger a[href="tel:112"]').count() == 1)
    rec(G, 'il token di conversazione del visitatore viene riusato', STATE['chat'][-1]['body'].get('conversationToken') == TOKEN)
    pg.click('.aiw-draft >> text=Conferma e invia'); pg.wait_for_selector('.aiw-confirm')
    pg.fill('#aiw-name', 'Mario Prova'); pg.fill('#aiw-phone', '06 5551234')
    pg.click('.aiw-confirm button[type=submit]'); pg.wait_for_timeout(150)
    rec(G, 'conferma: informativa privacy obbligatoria', 'privacy' in pg.inner_text('.aiw-status') and not STATE['confirm'])
    pg.check('#aiw-privacy'); pg.click('.aiw-confirm button[type=submit]'); pg.wait_for_selector('.aiw-note--ok')
    cf = STATE['confirm'][-1]
    rec(G, 'conferma esplicita: recapiti solo nel modulo, impronta della bozza mostrata', cf['draftHash'] == HASH and cf['contact']['phone'] == '06 5551234' and cf['privacy'] is True and cf['conversationToken'] == TOKEN)
    rec(G, 'recapiti del modulo mai inviati alla chat AI', not any('5551234' in json.dumps(c['body']) for c in STATE['chat']))
    ok_txt = pg.inner_text('.aiw-note--ok')
    rec(G, 'numero di riferimento restituito dalla centrale, nessun appuntamento promesso', 'RIC-2026-AITEST' in ok_txt and 'nessun appuntamento è fissato' in ok_txt and pg.is_hidden('.aiw-composer'))
    shot(pg, 'widget-inviata')
    rec(G, 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()

    # --- backend non raggiungibile
    STATE.update(mode='down', chat=[], confirm=[])
    ctx, pg, errs, reqs = new_page(b)
    pg.goto(BASE + '/', wait_until='networkidle'); pg.click('[data-ai-launcher]'); pg.wait_for_selector('.aiw')
    pg.fill('.aiw-input', 'Ho uno scarico intasato'); pg.keyboard.press('Enter'); pg.wait_for_selector('.aiw-note')
    nt = pg.inner_text('.aiw-note')
    rec('Backend non raggiungibile', 'messaggio onesto e canali di contatto, nessuna richiesta dichiarata', 'nessuna richiesta è stata registrata' in nt and pg.locator('.aiw-note a[href="/#contatti"]').count() == 1)
    ctx.close()

    # --- ripresa della conversazione e mobile
    STATE.update(mode='ok', chat=[])
    ctx, pg, errs, reqs = new_page(b, w=390, h=844, mobile=True)
    ctx.add_init_script(f"sessionStorage.setItem('pir.ai.customer', JSON.stringify({{conversationId:'{CONV}',conversationToken:'{TOKEN}'}}))")
    pg.goto(BASE + '/', wait_until='networkidle')
    rec('Mobile', 'pulsante sopra la barra mobile, nessun overflow a 390px', overflow(pg) <= 1 and pg.is_visible('[data-ai-launcher]'))
    shot(pg, 'home-mobile-pulsante')
    pg.click('[data-ai-launcher]'); pg.wait_for_selector('.aiw-draft')
    rec('Mobile', 'conversazione ripresa dallo storico (azione history, nessuna chiamata al modello)', STATE['chat'][0]['body'].get('action') == 'history' and 'Risposta precedente di prova' in pg.inner_text('.aiw-log'))
    pg.wait_for_timeout(400)
    box = pg.eval_on_selector('.aiw', 'e => { const r = e.getBoundingClientRect(); return [r.width, r.height]; }')
    rec('Mobile', 'widget a schermo intero su smartphone, nessun overflow', box[0] >= 389 and box[1] >= 800 and overflow(pg) <= 1, box)
    shot(pg, 'widget-mobile')
    pg.keyboard.press('Escape')
    rec('Mobile', 'chiusura con Esc e ritorno del focus al pulsante', pg.is_hidden('.aiw') and pg.evaluate("document.activeElement.matches('[data-ai-launcher]')"))
    rec('Mobile', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()
    b.close()
srv.terminate()

# ================================================================== 2. console e aree riservate
build({'PUBLIC_SUPABASE_URL': MOCK, 'PUBLIC_SUPABASE_ANON_KEY': 'anon-test-key', 'BUILD_TEST_FLAGS': ALL_FLAGS})
srv = serve(); time.sleep(0.8)
G = 'Console PRONTO AI'
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    STATE.update(role='admin', chat=[], calls=[])
    ctx, pg, errs, reqs = new_page(b, logged=True)
    pg.goto(BASE + '/admin/pronto-ai/', wait_until='networkidle'); pg.wait_for_selector('.pai-tabs')
    tabs = pg.locator('.pai-tabs a').all_inner_texts()
    rec(G, 'amministratore: 7 sezioni (assistente, azioni, costi, automazioni, knowledge base, impostazioni, sicurezza)', len(tabs) == 7, tabs)
    rec(G, 'stato: interruttore globale e provider senza chiave', 'disattivato' in pg.inner_text('.pai-status') and 'modello-di-prova' in pg.inner_text('.pai-status'))
    shot(pg, 'console-assistente')
    pg.click('.aic-chip >> nth=0'); pg.wait_for_selector('.aic-msg--assistant')
    last = STATE['chat'][-1]
    rec(G, 'Management Assistant: domanda inviata con il token dell’utente, risposta marcata AI', last['body']['agent'] == 'management' and last['auth'] == 'Bearer tok' and 'generata dall’ai' in pg.inner_text('.aic-msg--assistant').lower())
    pg.goto(BASE + '/admin/pronto-ai/#azioni'); pg.wait_for_selector('.pai-action')
    a = pg.inner_text('.pai-action >> nth=0')
    rec(G, 'azione da approvare: motivazione, dati usati, dati mancanti, effetto previsto, scadenza', all(x in a for x in ['Motivazione', 'available_slots', 'indirizzo', 'Effetto previsto', 'Scadenza', 'AIA-2026-PROVA1']))
    shot(pg, 'console-azioni', full=True)
    pg.click('.pai-action >> nth=0 >> text=Approva'); pg.wait_for_timeout(500)
    dec = [c for c in STATE['calls'] if c[1].endswith('rpc/ai_decide_action')]
    rec(G, 'approvazione legata alla proposta specifica; dati cambiati → nessuna esecuzione', dec and dec[-1][2]['p_id'] == ACTIONS[0]['id'] and dec[-1][2]['p_decision'] == 'approve' and 'nuova proposta' in pg.inner_text('.pai-body'))
    pg.goto(BASE + '/admin/pronto-ai/#costi'); pg.wait_for_timeout(500); pg.wait_for_selector('.pai-budget')
    ct = pg.inner_text('.pai-body').lower().replace('\u00a0', ' ').replace('\u202f', ' ')
    rec(G, 'COSTI PRONTO AI: richieste, token, costo stimato ed effettivo, errori, bloccate, budget 30 €', all(x in ct for x in ['42', '120.000', 'non registrato', 'richieste bloccate', '30 €', 'non una garanzia']))
    rec(G, 'tariffe non inserite: avviso, nessun costo inventato', 'tariffe del provider non inserite' in ct)
    shot(pg, 'console-costi', full=True)
    pg.goto(BASE + '/admin/pronto-ai/#impostazioni'); pg.wait_for_timeout(500); pg.wait_for_selector('.pai-kill')
    st_txt = pg.inner_text('.pai-body')
    rec(G, 'impostazioni: chiave mai mostrata, requisiti per l’attivazione (tariffe e DPA)', 'Presente (mai mostrata)' in st_txt and 'DPA' in st_txt)
    pg.click('.pai-kill button'); pg.wait_for_timeout(400)
    up = [c for c in STATE['calls'] if c[1].endswith('rpc/ai_update_settings')]
    rec(G, 'kill switch dalla console (funzione con controllo dei permessi)', up and up[-1][2]['p']['enabled'] is True)
    pg.goto(BASE + '/admin/pronto-ai/#automazioni'); pg.wait_for_timeout(500); pg.wait_for_selector('.pai-rule')
    rec(G, 'automazioni: 10 regole con stato, frequenza ed esecuzioni', pg.locator('.pai-rule').count() == 10 and 'Completata' in pg.inner_text('.pai-body'))
    pg.goto(BASE + '/admin/pronto-ai/#conoscenza'); pg.wait_for_timeout(500); pg.wait_for_selector('.pai-body table')
    rec(G, 'knowledge base: documenti con ambito, versione e stato', all(x in pg.inner_text('.pai-body') for x in ['FAQ di prova', 'Pubblico', 'Approvato']))
    pg.goto(BASE + '/admin/pronto-ai/#sicurezza'); pg.wait_for_timeout(500); pg.wait_for_selector('.pai-body table')
    rec(G, 'sicurezza: eventi e chiamate agli strumenti', 'Possibile prompt injection' in pg.inner_text('.pai-body') and 'available_slots' in pg.inner_text('.pai-body'))
    rec(G, 'nessun errore JavaScript', not errs, errs[:2])
    for w in (1440, 390):
        pg.set_viewport_size({'width': w, 'height': 900})
        for tab in ('assistente', 'azioni', 'costi', 'impostazioni'):
            pg.goto(BASE + f'/admin/pronto-ai/#{tab}'); pg.wait_for_timeout(350)
            rec('Responsive', f'/admin/pronto-ai/#{tab} a {w}px: nessun overflow orizzontale', overflow(pg) <= 1, overflow(pg))
    shot(pg, 'console-mobile')
    ctx.close()

    # --- operatore: solo assistente (dispatch) e azioni
    STATE.update(role='operator', calls=[])
    ctx, pg, errs, reqs = new_page(b, logged=True)
    pg.goto(BASE + '/admin/pronto-ai/#costi', wait_until='networkidle'); pg.wait_for_selector('.pai-tabs')
    tabs = pg.locator('.pai-tabs a').all_inner_texts()
    rec('Permessi', 'operatore: solo Assistente (Dispatch) e Azioni; costi e impostazioni non accessibili', len(tabs) == 2 and not any(c[1].endswith('rpc/ai_cost_summary') for c in STATE['calls'])
        and 'Dispatch' in pg.inner_text('.pai-seg') and 'Management' not in pg.inner_text('.pai-seg'), tabs)
    ctx.close()

    # --- area tecnico
    STATE.update(role='technician', calls=[], chat=[])
    ctx, pg, errs, reqs = new_page(b, w=390, h=844, logged=True, mobile=True)
    pg.goto(BASE + f'/tecnico/#j={JOB_ID}', wait_until='networkidle'); pg.wait_for_selector('.tm-ai')
    pg.click('.tm-ai summary')
    rec('Area tecnico', 'sezione "ASSISTENTE TECNICO AI" con avvertenza sulla responsabilità del tecnico', 'ASSISTENTE TECNICO AI' in pg.inner_text('.tm-ai') and 'tua responsabilità' in pg.inner_text('.tm-ai'))
    pg.click('.tm-ai .aic-chip >> nth=3'); pg.wait_for_selector('.tm-ai .aic-msg--assistant')
    rec('Area tecnico', 'domanda con il contesto del lavoro (agente technical)', STATE['chat'][-1]['body']['agent'] == 'technical' and STATE['chat'][-1]['body']['context'] == {'interventionId': JOB_ID})
    pg.click('.tm-ai >> text=Usa come bozza "Lavorazioni eseguite"'); pg.wait_for_timeout(200)
    val = pg.input_value('.tm-report textarea >> nth=2')
    rec('Area tecnico', 'bozza inserita nel campo solo su scelta del tecnico, nessun salvataggio automatico', 'Risposta di prova' in val and not any(c[1].endswith('rpc/save_report_draft') for c in STATE['calls']))
    rec('Area tecnico', 'nessun overflow a 390px', overflow(pg) <= 1, overflow(pg))
    pg.wait_for_timeout(500); pg.locator('.tm-ai').scroll_into_view_if_needed()
    shot(pg, 'tecnico-assistente')
    rec('Area tecnico', 'nessun errore JavaScript', not errs, errs[:2])
    ctx.close()
    b.close()
srv.terminate()
build({})

ok = sum(1 for r in results if r[2])
md = f"\n## Test nel browser — PRONTO AI (Playwright, funzioni AI e backend simulati solo nel test)\n\nEseguito: {time.strftime('%Y-%m-%dT%H:%M:%S')} · `python3 scripts/e2e/ai-check.py`\n\n**Esito: {ok}/{len(results)} superati.**\n\n| Esito | Gruppo | Controllo | Dettaglio |\n|---|---|---|---|\n"
for g, n, o, d in results:
    md += f"| {'✅' if o else '❌'} | {g} | {n} | {d.replace('|', '/')[:200] if not o else ''} |\n"
rp = ROOT / 'reports/test-report.md'
text = rp.read_text() if rp.exists() else ''
text = re.sub(r'\n## Test nel browser — PRONTO AI[\s\S]*?(?=\n## |\Z)', '', text)
rp.write_text(text.rstrip() + '\n' + md)
print(f'PRONTO AI (browser): {ok}/{len(results)} superati')
for g, n, o, d in results:
    if not o: print(f'  ✖ {g} — {n}: {d}')
raise SystemExit(0 if ok == len(results) else 1)
