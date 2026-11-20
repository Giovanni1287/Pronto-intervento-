#!/usr/bin/env python3
"""
Collaudo di lancio (Prompt 8) — Chrome headless + Playwright, server locale che applica le
intestazioni di netlify.toml (CSP compresa) e i redirect di _redirects.
Dispositivi rappresentativi: iPhone SE, iPhone 15, Android piccolo e grande, tablet verticale e
orizzontale, laptop, desktop.
Per ogni pagina pubblica e ogni dispositivo: stato HTTP, errori JavaScript e console (violazioni
CSP comprese), overflow orizzontale, immagini non caricate, controlli senza nome accessibile,
bersagli di tocco < 24 px (WCAG 2.2, link nel testo esclusi), link vuoti o "javascript:".
Più: menu per ogni larghezza (apertura, Esc, focus), pagine applicative senza login, landing
leggibili SENZA JavaScript (HTML indicizzabile), CSP effettivamente applicata, redirect 301,
404 reale, anteprima non indicizzabile.
Screenshot in reports/screenshots/p8-*.jpg; esito aggiunto a reports/test-report.md.
"""
import json, os, re, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PORT = 4398
BASE = f'http://localhost:{PORT}'
CHROME = os.environ.get('CHROME_PATH', '/usr/bin/google-chrome')
SHOTS = ROOT / 'reports/screenshots'
results = []
def rec(g, n, ok, d=''): results.append((g, n, bool(ok), str(d)))

DEVICES = [  # nome, larghezza, altezza, mobile/touch, scala
    ('iPhone SE', 375, 667, True, 2), ('iPhone 15', 393, 852, True, 3), ('Android piccolo (360)', 360, 740, True, 3),
    ('Android grande (412)', 412, 915, True, 2.6), ('Tablet verticale (768)', 768, 1024, True, 2), ('Tablet orizzontale (1024)', 1024, 768, True, 2),
    ('Laptop (1366)', 1366, 768, False, 1), ('Desktop (1920)', 1920, 1080, False, 1)]

audit = json.loads((ROOT / 'netlify/generated/seo-audit.json').read_text())
PUBLIC = [p['path'] for p in audit['pages'] if p['indexable']]
APP = sorted({'/' + str(f.relative_to(ROOT / 'dist')).replace('index.html', '') for f in (ROOT / 'dist').rglob('index.html')} - set(PUBLIC))
APP = [p.replace('//', '/') for p in APP]

PAGE_JS = """async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 20)); }
  window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 250));
  const vw = document.documentElement.clientWidth;
  const imgs = [...document.images];
  const broken = imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.getAttribute('src'));
  const unnamed = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea')].filter(el => {
    if (el.closest('[hidden]') || el.offsetParent === null && getComputedStyle(el).position !== 'fixed') return false;
    const lab = el.labels && el.labels.length ? [...el.labels].map(l => l.textContent).join('') : '';
    const n = (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || el.getAttribute('title') || lab || el.textContent || el.value || '').trim();
    return !n && !el.querySelector('img[alt]:not([alt=""]), svg[aria-label]');
  }).map(el => el.outerHTML.slice(0, 90));
  const small = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, summary, [role=button]')].filter(el => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden' || el.closest('[hidden]')) return false;
    if (cs.display === 'inline' && el.closest('p, li, td, dd, figcaption, small, label, .footer-legal')) return false;  // link nel testo: eccezione WCAG
    if (el.matches('input[type=checkbox], input[type=radio]') && el.closest('label')) return false;  // l'etichetta è il bersaglio
    return r.width < 24 || r.height < 24;
  }).map(el => `${el.tagName.toLowerCase()}.${el.className || ''} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)} «${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}»`);
  const badLinks = [...document.querySelectorAll('a')].filter(a => { const h = a.getAttribute('href'); return h === null || h === '' || h === '#' || /^javascript:/i.test(h); }).map(a => a.outerHTML.slice(0, 80));
  return { broken, unnamed, small, badLinks, overflow: document.documentElement.scrollWidth - vw };
}"""

srv = subprocess.Popen(['node', 'scripts/serve.js'], cwd=ROOT, env={**os.environ, 'PORT': str(PORT)}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
SHOTS.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    for name, w, h, mobile, scale in DEVICES:
        ctx = b.new_context(viewport={'width': w, 'height': h}, is_mobile=mobile, has_touch=mobile, device_scale_factor=scale if name in ('iPhone 15', 'Tablet verticale (768)', 'Desktop (1920)') else 1)
        errs, over, broken, unnamed, small, bad = [], [], [], [], [], []
        pages = PUBLIC + (APP if name in ('iPhone SE', 'Tablet verticale (768)', 'Desktop (1920)') else [])
        for path in pages:
            pg = ctx.new_page(); msgs = []
            pg.on('pageerror', lambda e, m=msgs: m.append(f'pageerror: {e}'))
            pg.on('console', lambda c, m=msgs: m.append(f'{c.type}: {c.text[:140]}') if c.type in ('error', 'warning') else None)
            resp = pg.goto(BASE + path, wait_until='networkidle')
            r = pg.evaluate(PAGE_JS)
            if msgs or not resp or resp.status != 200: errs.append(f'{path}: {msgs[:2] or (resp and resp.status)}')
            if r['overflow'] > 1: over.append(f"{path} (+{r['overflow']}px)")
            if r['broken']: broken.append(f"{path}: {r['broken'][:2]}")
            if r['unnamed']: unnamed.append(f"{path}: {r['unnamed'][:2]}")
            if r['small']: small.append(f"{path}: {r['small'][:3]}")
            if r['badLinks']: bad.append(f"{path}: {r['badLinks'][:2]}")
            if path in ('/', '/servizi/idraulica/spurgo-lavandini/', '/piani-assistenza/famiglie/') and name in ('iPhone SE', 'Tablet verticale (768)', 'Desktop (1920)'):
                slug = {'/': 'home', '/servizi/idraulica/spurgo-lavandini/': 'landing', '/piani-assistenza/famiglie/': 'family'}[path]
                pg.screenshot(path=str(SHOTS / f"p8-{slug}-{w}.jpg"), type='jpeg', quality=60)
            pg.close()
        g = f'{name} · {w}×{h}'
        rec(g, f'{len(pages)} pagine: stato 200, nessun errore JS/console/CSP', not errs, '; '.join(errs[:4]) or f'{len(pages)} pagine')
        rec(g, 'nessun overflow orizzontale', not over, '; '.join(over[:5]) or 'ok')
        rec(g, 'immagini caricate', not broken, '; '.join(broken[:3]) or 'ok')
        rec(g, 'controlli con nome accessibile', not unnamed, '; '.join(unnamed[:3]) or 'ok')
        rec(g, 'bersagli di tocco ≥ 24 px (link nel testo esclusi)', not small, '; '.join(small[:3]) or 'ok')
        rec(g, 'nessun link vuoto, "#" o "javascript:"', not bad, '; '.join(bad[:3]) or 'ok')
        # menu
        pg = ctx.new_page(); pg.goto(BASE + '/servizi/', wait_until='networkidle')
        toggle = pg.locator('.nav-toggle')
        if toggle.is_visible():
            toggle.click(); pg.wait_for_timeout(300)
            opened = pg.eval_on_selector('#site-nav', 'e => e.classList.contains("is-open")')
            expanded = toggle.get_attribute('aria-expanded') == 'true'
            first_link_ok = pg.locator('#site-nav a').first.is_visible()
            pg.keyboard.press('Escape'); pg.wait_for_timeout(250)
            closed = not pg.eval_on_selector('#site-nav', 'e => e.classList.contains("is-open")')
            rec(g, 'menu mobile: apertura, aria-expanded, voci cliccabili, chiusura con Esc', opened and expanded and first_link_ok and closed, f'open={opened} expanded={expanded} link={first_link_ok} esc={closed}')
        else:
            vis = pg.locator('#site-nav a:visible').count()
            rec(g, 'menu desktop: voci visibili', vis >= 5, f'{vis} voci')
        pg.close(); ctx.close()

    # --- HTML indicizzabile: landing leggibili senza JavaScript
    ctx = b.new_context(java_script_enabled=False)
    pg = ctx.new_page(); bad = []
    for path in PUBLIC:
        pg.goto(BASE + path)
        h1 = pg.locator('h1').count(); words = len(pg.inner_text('main').split())
        if h1 != 1 or words < 200: bad.append(f'{path}: h1={h1}, parole={words}')
    rec('HTML indicizzabile', f'{len(PUBLIC)} pagine pubbliche con H1 e testo completi anche senza JavaScript', not bad, '; '.join(bad[:4]) or 'ok')
    ctx.close()

    # --- sicurezza e comportamento server (come su Netlify)
    ctx = b.new_context(); pg = ctx.new_page()
    resp = pg.goto(BASE + '/servizi/idraulica/')
    csp = resp.headers.get('content-security-policy', '')
    rec('Intestazioni', 'CSP, HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy e COOP sulle pagine pubbliche',
        "default-src 'self'" in csp and all(resp.headers.get(k) for k in ['strict-transport-security', 'x-content-type-options', 'x-frame-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy']))
    blocked = pg.evaluate("""() => new Promise(res => {
      document.addEventListener('securitypolicyviolation', e => res(e.violatedDirective), { once: true });
      const s = document.createElement('script'); s.textContent = 'window.__x = 1'; document.body.append(s);
      setTimeout(() => res(window.__x ? 'eseguito' : 'nessun evento'), 800); })""")
    rec('Intestazioni', 'CSP applicata: script inline iniettato bloccato', str(blocked).startswith('script-src'), blocked)
    blocked2 = pg.evaluate("""() => new Promise(res => {
      document.addEventListener('securitypolicyviolation', e => res(e.violatedDirective), { once: true });
      fetch('https://esempio-non-autorizzato.example/x').catch(() => {}); setTimeout(() => res('nessun evento'), 800); })""")
    rec('Intestazioni', 'CSP applicata: connessione verso un dominio non autorizzato bloccata', str(blocked2).startswith('connect-src'), blocked2)
    adm = pg.goto(BASE + '/admin/')
    csps = [h['value'] for h in adm.headers_array() if h['name'].lower() == 'content-security-policy']
    robots_h = ' '.join(h['value'] for h in adm.headers_array() if h['name'].lower() == 'x-robots-tag')
    rec('Intestazioni', 'aree riservate: CSP aggiuntiva più restrittiva (senza Google), noindex', len(csps) >= 2 and any('googletagmanager' not in c for c in csps)
        and 'nofollow' in robots_h and 'noindex' in (pg.get_attribute('meta[name=robots]', 'content') or ''), f'{len(csps)} CSP · {robots_h}')
    r404 = pg.goto(BASE + '/pagina-che-non-esiste/')
    rec('Server', 'URL inesistente: stato 404 con pagina dedicata', r404.status == 404 and 'servizi' in pg.inner_text('main').lower())
    red = pg.request.get(BASE + '/index.html', max_redirects=0)
    rec('Server', '/index.html → / con redirect 301', red.status == 301 and red.headers.get('location') == '/', f'{red.status} {red.headers.get("location")}')
    home = pg.goto(BASE + '/')
    rec('Anteprima', 'anteprima non indicizzabile: meta robots noindex e X-Robots-Tag', 'noindex' in (pg.get_attribute('meta[name=robots]', 'content') or '') and 'noindex' in home.headers.get('x-robots-tag', ''))
    robots = pg.request.get(BASE + '/robots.txt').text()
    rec('Anteprima', 'robots.txt dell’anteprima: Disallow: /', re.search(r'^Disallow: /\s*$', robots, re.M) is not None)
    ctx.close()

    # --- tastiera: navigazione e focus visibile
    ctx = b.new_context(viewport={'width': 1366, 'height': 768}); pg = ctx.new_page()
    pg.goto(BASE + '/', wait_until='networkidle')
    seen, no_outline = [], []
    for _ in range(25):
        pg.keyboard.press('Tab')
        info = pg.evaluate("""() => { const e = document.activeElement; const cs = getComputedStyle(e);
          return [e.tagName + '.' + e.className, cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 || cs.boxShadow !== 'none'] }""")
        seen.append(info[0])
        if not info[1]: no_outline.append(info[0])
    rec('Tastiera', 'Tab: skip link, poi i comandi nell’ordine della pagina, con focus visibile', seen[0].startswith('A.skip-link') and not no_outline, ', '.join(no_outline[:4]) or f'{len(seen)} elementi')
    ctx.close()
    b.close()
srv.terminate()

ok = sum(1 for r in results if r[2])
md = f"\n## Collaudo di lancio — dispositivi, CSP, HTML indicizzabile (Prompt 8)\n\nEseguito: {time.strftime('%Y-%m-%dT%H:%M:%S')} · `python3 scripts/e2e/launch-check.py` · {len(PUBLIC)} pagine pubbliche, {len(APP)} applicative\n\n**Esito: {ok}/{len(results)} superati.**\n\n| Esito | Gruppo | Controllo | Dettaglio |\n|---|---|---|---|\n"
for g, n, o, d in results:
    md += f"| {'✅' if o else '❌'} | {g} | {n} | {d.replace('|', '/')[:240]} |\n"
rp = ROOT / 'reports/test-report.md'
text = rp.read_text() if rp.exists() else ''
text = re.sub(r'\n## Collaudo di lancio[\s\S]*?(?=\n## |\Z)', '', text)
rp.write_text(text.rstrip() + '\n' + md)
print(f'Collaudo di lancio (browser): {ok}/{len(results)} superati')
for g, n, o, d in results:
    if not o: print(f'  ✖ {g} — {n}: {d[:400]}')
sys.exit(0 if ok == len(results) else 1)
