#!/usr/bin/env python3
"""
Test nel browser (Chrome headless via Playwright) — opzionale, richiede:
  pip install playwright  e un Chrome/Chromium installato (CHROME_PATH).
Uso:  npm run build && python3 scripts/e2e/browser-check.py
Verifica per ogni pagina, a 390px (mobile) e 1440px (desktop):
  errori JavaScript e console · overflow orizzontale · immagini non caricate ·
  link/pulsanti senza nome accessibile · barra azioni mobile.
Più test di navigazione: menu mobile, sottomenu, CTA → modulo preselezionato, FAQ.
Aggiunge l'esito in fondo a reports/test-report.md.
"""
import json, os, re, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PORT = int(os.environ.get('PORT', '4391'))
BASE = f'http://localhost:{PORT}'
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')

pages = []
for f in sorted((ROOT / 'dist').rglob('index.html')):
    rel = '/' + str(f.relative_to(ROOT / 'dist')).replace('index.html', '')
    pages.append(rel.replace('//', '/'))

srv = subprocess.Popen(['node', str(ROOT / 'scripts/serve.js')], env={**os.environ, 'PORT': str(PORT)},
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
results = []
def rec(group, name, ok, detail=''):
    results.append((group, name, bool(ok), str(detail)))

PAGE_JS = """async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 25)); }
  window.scrollTo(0, 0);
  await new Promise(r => setTimeout(r, 400));
  const imgs = [...document.images];
  const broken = imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src'));
  const pending = imgs.filter(i => !i.complete).length;
  const overflow = document.documentElement.scrollWidth - window.innerWidth;
  const unnamed = [...document.querySelectorAll('a[href], button')].filter(el => {
    const n = (el.getAttribute('aria-label') || el.textContent || '').trim();
    return !n && !el.querySelector('img[alt]');
  }).map(el => el.outerHTML.slice(0, 80));
  const bar = document.querySelector('.mobile-bar');
  const barVisible = bar ? getComputedStyle(bar).display !== 'none' : false;
  return { broken, pending, overflow, unnamed, barVisible, imgs: imgs.length };
}"""

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    for label, vw, vh in [('mobile 390px', 390, 844), ('desktop 1440px', 1440, 900)]:
        ctx = browser.new_context(viewport={'width': vw, 'height': vh})
        errs, overflow, broken, unnamed, bar = [], [], [], [], []
        for path in pages:
            pg = ctx.new_page()
            msgs = []
            pg.on('pageerror', lambda e, m=msgs: m.append(f'pageerror: {e}'))
            pg.on('console', lambda c, m=msgs: m.append(f'{c.type}: {c.text}') if c.type in ('error', 'warning') else None)
            resp = pg.goto(BASE + path, wait_until='networkidle')
            r = pg.evaluate(PAGE_JS)
            if msgs or (resp and resp.status != 200): errs.append(f'{path}: {msgs or resp.status}')
            if r['overflow'] > 1: overflow.append(f"{path} (+{r['overflow']}px)")
            if r['broken']: broken.append(f"{path}: {r['broken'][:3]}")
            if r['unnamed']: unnamed.append(f"{path}: {r['unnamed'][:2]}")
            # area tecnico mobile (Prompt 5): la barra "Richiedi intervento" del sito pubblico è nascosta di proposito
            if path != '/tecnico/' and (vw < 1100) != r['barVisible']: bar.append(path)
            pg.close()
        g = f'Browser {label}'
        rec(g, f'{len(pages)} pagine caricate senza errori JS/console', not errs, '; '.join(errs[:5]) or f'{len(pages)} pagine')
        rec(g, 'nessun overflow orizzontale', not overflow, '; '.join(overflow[:5]) or 'ok')
        rec(g, 'nessuna immagine non caricata (dopo scroll)', not broken, '; '.join(broken[:5]) or 'ok')
        rec(g, 'link e pulsanti con nome accessibile', not unnamed, '; '.join(unnamed[:3]) or 'ok')
        rec(g, 'barra azioni rapide ' + ('visibile' if vw < 1100 else 'nascosta') + ' (esclusa l’area tecnico)', not bar, ', '.join(bar[:5]) or 'ok')
        ctx.close()

    # --- Navigazione mobile
    ctx = browser.new_context(viewport={'width': 390, 'height': 844})
    pg = ctx.new_page()
    pg.goto(BASE + '/servizi/idraulica/videoispezione-tubature/', wait_until='networkidle')
    pg.click('.nav-toggle'); pg.wait_for_timeout(350)
    opened = pg.eval_on_selector('#site-nav', 'e => e.classList.contains("is-open")')
    pg.click('.nav__sub-toggle'); pg.wait_for_timeout(200)
    sub_open = pg.eval_on_selector('#sub-servizi', 'e => e.classList.contains("is-open")')
    pg.click('#sub-servizi a[href="/servizi/elettrica/"]'); pg.wait_for_load_state('networkidle')
    rec('Navigazione', 'menu mobile: apertura, sottomenu Servizi, navigazione a una categoria', opened and sub_open and pg.url.endswith('/servizi/elettrica/'), pg.url)
    pg.goto(BASE + '/servizi/ricerca-perdite-occulte/geofono/', wait_until='networkidle')
    pg.click('.page-hero a[href="#modulo"]'); pg.wait_for_timeout(2500)
    val = pg.eval_on_selector('#req-categoria', 'e => e.value')
    in_view = pg.evaluate("() => { const r = document.getElementById('modulo').getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; }")
    rec('Navigazione', 'CTA "Richiedi intervento" → modulo con servizio preselezionato', val == 'ricerca-perdite-occulte/geofono' and in_view, val)
    disabled = pg.eval_on_selector('form[name=sopralluogo] [type=submit]', 'e => e.disabled')
    rec('Navigazione', 'invio modulo disattivato (servizio di ricezione non configurato)', disabled)
    pg.click('.faq__item:nth-of-type(2) summary'); pg.wait_for_timeout(150)
    rec('Navigazione', 'FAQ: apertura di una risposta', pg.eval_on_selector('.faq__item:nth-of-type(2)', 'e => e.open'))
    pg.goto(BASE + '/servizi/muratura/cartongesso/', wait_until='networkidle')
    pg.click('.related-card a >> nth=0'); pg.wait_for_load_state('networkidle')
    rec('Navigazione', 'servizi collegati: navigazione tra landing', '/servizi/' in pg.url and 'cartongesso' not in pg.url, pg.url)
    pg.goto(BASE + '/servizi/idraulica/spurgo-lavandini/', wait_until='networkidle')
    pg.click('.plus-band__links a >> nth=0'); pg.wait_for_load_state('networkidle'); pg.wait_for_timeout(600)
    sel = pg.eval_on_selector('#tab-piccola-idraulica', 'e => e.getAttribute("aria-selected")')
    vis = pg.is_visible('#piano-piccola-idraulica') and not pg.is_visible('#piano-spurgo')
    rec('Navigazione', 'link PRONTO+ dalla landing → pagina Family con la categoria già selezionata', pg.url.endswith('/piani-assistenza/famiglie/#piano-piccola-idraulica') and sel == 'true' and vis, pg.url)
    pg.click('#tab-spurgo'); pg.wait_for_timeout(200)
    rec('Navigazione', 'selettore categorie Family: cambio scheda (Spurgo)', pg.is_visible('#piano-spurgo') and not pg.is_visible('#piano-piccola-idraulica'))
    pg.keyboard.press('ArrowRight'); pg.wait_for_timeout(150)
    rec('Accessibilità', 'selettore categorie Family navigabile con le frecce', pg.eval_on_selector('#tab-elettrica', 'e => e.getAttribute("aria-selected")') == 'true')
    pg.goto(BASE + '/?categoria=muratura/imbiancatura#contatti', wait_until='networkidle')
    rec('Navigazione', 'homepage: preselezione da URL ancora funzionante', pg.eval_on_selector('#intervento-categoria', 'e => e.value') == 'muratura/imbiancatura')
    # Tastiera: il primo Tab porta allo skip link
    pg.goto(BASE + '/servizi/allagamenti/', wait_until='networkidle')
    pg.keyboard.press('Tab')
    rec('Accessibilità', 'primo Tab sullo skip link "Vai al contenuto"', pg.evaluate('document.activeElement.className') == 'skip-link')
    ctx.close()
    browser.close()
srv.terminate()

ok = sum(1 for r in results if r[2])
md = f"\n## Test nel browser (Chrome headless, Playwright)\n\nEseguito: {time.strftime('%Y-%m-%dT%H:%M:%S')} · `python3 scripts/e2e/browser-check.py`\n\n**Esito: {ok}/{len(results)} superati.**\n\n| Esito | Gruppo | Controllo | Dettaglio |\n|---|---|---|---|\n"
for g, n, o, d in results:
    md += f"| {'✅' if o else '❌'} | {g} | {n} | {d.replace('|', '/')[:300]} |\n"
report = ROOT / 'reports/test-report.md'
text = report.read_text() if report.exists() else ''
text = re.sub(r'\n## Test nel browser[\s\S]*$', '', text)
report.write_text(text.rstrip() + '\n' + md)
print(f'Browser: {ok}/{len(results)} superati')
for g, n, o, d in results:
    if not o: print(f'  ✖ {g} — {n}: {d}')
sys.exit(0 if ok == len(results) else 1)
