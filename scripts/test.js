#!/usr/bin/env node
/**
 * Test automatici — nessuna dipendenza.
 * Esegue la build in modalità "production" e "development" e verifica:
 * struttura delle 30 URL di servizio, SEO tecnica, sitemap, link e ancore,
 * immagini, accessibilità di base, moduli e preselezione, PRONTO+, contenuti,
 * servizio HTTP delle URL (come su Netlify).
 * Scrive il report in reports/test-report.md
 * (i test nel browser sono in scripts/e2e/browser-check.py e si aggiungono al report).
 */
import { execFileSync, spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories, allSubcategories } from '../src/data/services.js';
import { lines } from '../src/data/pronto-plus.js';
import { landingContent, categoryContent } from '../src/data/content/index.js';
import { site } from '../src/config/site.config.js';
import { familyCategories } from '../src/data/catalog/family-plans.js';
import { protectedPlans } from '../src/data/catalog/protected-work.js';
import { APP_PATHS } from '../src/pages/app.js';
import { businessPlans } from '../src/data/catalog/business-plans.js';
import { euro } from '../src/lib/money.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(root, 'dist');
const results = [];
const check = (group, name, ok, detail = '') => results.push({ group, name, ok: !!ok, detail: String(detail) });

const serviceUrls = [
  ...categories.map((c) => `/servizi/${c.slug}/`),
  ...allSubcategories.map((s) => `/servizi/${s.category}/${s.slug}/`)
];

async function walk(dir) {
  const out = [];
  for (const e of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else out.push(p);
  }
  return out;
}
const exists = (p) => fs.access(p).then(() => true, () => false);
const build = (env) =>
  execFileSync(process.execPath, [path.join(root, 'scripts/build.js')], { env: { ...process.env, SITE_ENV: env }, stdio: 'pipe' }).toString();
const strip = (h) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

async function loadPages() {
  const files = await walk(DIST);
  const pages = new Map();
  for (const f of files.filter((x) => x.endsWith('.html'))) {
    const rel = '/' + path.relative(DIST, f).replace(/\\/g, '/');
    pages.set(rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel, await fs.readFile(f, 'utf8'));
  }
  return pages;
}

/* ------------------------------------------------------------ controlli per pagina */
async function inspect(envLabel) {
  const pages = await loadPages();
  const ids = new Map([...pages].map(([p, h]) => [p, new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))]));
  const brokenLinks = [];
  const brokenAnchors = [];
  const missingImgs = [];
  const seo = { titles: new Map(), descs: new Map(), h1s: new Map() };
  const G = (p) => `[${envLabel}] Pagine`;
  const fails = {};
  const f = (name, p, ok, detail = '') => {
    fails[name] ||= { ok: 0, bad: [] };
    if (ok) fails[name].ok++;
    else fails[name].bad.push(`${p}${detail ? ` (${detail})` : ''}`);
  };

  for (const [p, html] of pages) {
    const title = html.match(/<title>([^<]*)<\/title>/)?.[1] || '';
    const desc = html.match(/<meta name="description" content="([^"]*)"/)?.[1] || '';
    const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => strip(m[1]));
    const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)?.[1] || '';
    const ogUrl = html.match(/<meta property="og:url" content="([^"]+)">/)?.[1] || '';
    seo.titles.set(p, title); seo.descs.set(p, desc); seo.h1s.set(p, h1s[0] || '');

    f('title 10–70 caratteri', p, title.length >= 10 && title.length <= 70, `${title.length}`);
    f('meta description 50–170 caratteri', p, desc.length >= 50 && desc.length <= 170, `${desc.length}`);
    f('un solo H1', p, h1s.length === 1, h1s.length);
    // la pagina 404 non ha canonical (non è un URL da indicizzare)
    if (p !== '/404.html') {
      f('canonical = URL della pagina', p, canonical === new URL(p, site.siteUrl).href, canonical);
      f('og:url = canonical', p, ogUrl === canonical);
    } else f('404 senza canonical e noindex', p, !canonical && /content="noindex/.test(html));
    f('Open Graph completo', p, ['og:title', 'og:description', 'og:image', 'og:type'].every((k) => html.includes(`property="${k}"`)));
    f('lang="it", skip link, <main id="main">', p, html.includes('<html lang="it">') && html.includes('class="skip-link"') && html.includes('<main id="main">'));
    f('meta robots noindex (anteprima)', p, /<meta name="robots" content="noindex, (no)?follow">/.test(html));
    f('nessun link tel:/wa.me senza numero', p, !/href="tel:"|wa\.me\/\?/.test(html));

    // Gerarchia titoli: nessun salto verso il basso di più di un livello
    const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => +m[1]);
    let prev = 0, jump = '';
    for (const l of levels) { if (prev && l > prev + 1) { jump = `h${prev}→h${l}`; break; } prev = l; }
    f('gerarchia H1–H6 senza salti', p, !jump, jump);

    // Immagini
    const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    f('immagini con alt, width, height', p, imgs.every((i) => /\salt="[^"]{5,}"/.test(i) && /\swidth="\d+"/.test(i) && /\sheight="\d+"/.test(i)), `${imgs.length} img`);
    const eager = imgs.filter((i) => i.includes('loading="eager"'));
    f('max 1 immagine prioritaria, le altre lazy', p, eager.length <= 1 && imgs.filter((i) => !i.includes('loading=')).length === 0);

    // Moduli: ogni campo visibile ha una label
    const fields = [...html.matchAll(/<(input|select|textarea)\b([^>]*)>/g)].filter((m) => !/type="hidden"/.test(m[2]) && !/name="bot-field"/.test(m[2]));
    const unlabeled = fields.map((m) => m[2].match(/\sid="([^"]+)"/)?.[1]).filter((id) => !id || !html.includes(`for="${id}"`));
    f('campi dei moduli con label', p, unlabeled.length === 0, unlabeled.join(','));
    const dupIds = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]).filter((v, i, a) => a.indexOf(v) !== i);
    f('id univoci nella pagina', p, dupIds.length === 0, [...new Set(dupIds)].join(','));

    // JSON-LD
    let ldOk = true;
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { ldOk = false; } }
    f('JSON-LD valido', p, ldOk);

    // Link e ancore
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (href.startsWith('#')) { if (href.length > 1 && !ids.get(p).has(href.slice(1))) brokenAnchors.push(`${p} → ${href}`); continue; }
      if (!href.startsWith('/') || href.startsWith('//')) continue;
      const u = new URL(href, 'http://x');
      if (!pages.has(u.pathname)) {
        if (!(await exists(path.join(DIST, decodeURIComponent(u.pathname))))) brokenLinks.push(`${p} → ${href}`);
        continue;
      }
      if (u.hash && !ids.get(u.pathname).has(u.hash.slice(1))) brokenAnchors.push(`${p} → ${href}`);
    }
    for (const [, src] of html.matchAll(/(?:src|srcset)="(\/[^"\s]+)/g)) {
      if (!(await exists(path.join(DIST, src)))) missingImgs.push(`${p} → ${src}`);
    }
  }

  for (const [name, r] of Object.entries(fails)) check(G(), name, r.bad.length === 0, r.bad.length ? r.bad.slice(0, 6).join('; ') : `${r.ok} pagine`);
  check(`[${envLabel}] Link`, 'link interni e asset esistenti', brokenLinks.length === 0, brokenLinks.slice(0, 8).join('; ') || 'ok');
  check(`[${envLabel}] Link`, 'ancore (#) esistenti', brokenAnchors.length === 0, brokenAnchors.slice(0, 8).join('; ') || 'ok');
  check(`[${envLabel}] Immagini`, 'nessuna immagine mancante (src/srcset)', missingImgs.length === 0, missingImgs.slice(0, 8).join('; ') || 'ok');

  // Unicità SEO sulle pagine pubbliche
  // pagine pubbliche previste: dal registro dell'audit SEO della build (Prompt 7: privacy segnaposto, bozze di guide e zone non confermate restano escluse)
  const auditJson = JSON.parse(readFileSync(path.join(root, 'netlify/generated/seo-audit.json'), 'utf8'));
  const pub = auditJson.pages.filter((x) => x.indexable).map((x) => x.path).filter((p) => pages.has(p));
  const dup = (map) => { const seen = new Map(); const d = []; for (const p of pub) { const v = map.get(p); if (seen.has(v)) d.push(`${p} = ${seen.get(v)}`); else seen.set(v, p); } return d; };
  check(`[${envLabel}] SEO`, 'meta title unici', dup(seo.titles).length === 0, dup(seo.titles).join('; ') || `${pub.length} pagine`);
  check(`[${envLabel}] SEO`, 'meta description uniche', dup(seo.descs).length === 0, dup(seo.descs).join('; ') || `${pub.length} pagine`);
  check(`[${envLabel}] SEO`, 'H1 unici', dup(seo.h1s).length === 0, dup(seo.h1s).join('; ') || `${pub.length} pagine`);

  // Sitemap = pagine pubbliche
  const sitemap = await fs.readFile(path.join(DIST, 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname).sort();
  const expected = pub.sort();
  check(`[${envLabel}] SEO`, 'sitemap identica alle pagine pubbliche generate', JSON.stringify(locs) === JSON.stringify(expected), `${locs.length} URL in sitemap, ${expected.length} pagine`);
  check(`[${envLabel}] SEO`, 'sitemap contiene le 30 URL di servizio', serviceUrls.every((u) => locs.includes(u)));
  const robots = await fs.readFile(path.join(DIST, 'robots.txt'), 'utf8');
  check(`[${envLabel}] SEO`, 'robots.txt: Disallow (anteprima non indicizzabile)', /Disallow: \/\s*$/m.test(robots));
  const headers = await fs.readFile(path.join(DIST, '_headers'), 'utf8').catch(() => '');
  check(`[${envLabel}] SEO`, '_headers: X-Robots-Tag noindex', headers.includes('X-Robots-Tag: noindex'));
  return pages;
}

/* ------------------------------------------------------------ dati e contenuti */
check('Catalogo', '6 categorie e 24 sottocategorie', categories.length === 6 && allSubcategories.length === 24);
check('Catalogo', 'tutte le 24 sottocategorie hanno landing attiva', allSubcategories.every((s) => s.landingReady));
check('Catalogo', 'ogni categoria ha accento e motivo grafico distinti', new Set(categories.map((c) => c.accent)).size === 6 && new Set(categories.map((c) => c.motif)).size === 6);
const allLandings = allSubcategories.map((s) => ({ s, c: landingContent(s.category, s.slug) }));
check('Contenuti', 'contenuti completi per 24 landing', allLandings.every(({ c }) => c && c.intro.length >= 3 && c.when.length >= 5 && c.steps.length === 4 && c.tech.length >= 3 && c.gallery.length === 3 && c.related.length >= 3 && c.faq.length >= 4));
check('Contenuti', 'contenuti completi per 6 categorie', categories.every((c) => { const x = categoryContent(c.slug); return x && x.intro.length && x.guide.length && x.faq.length >= 3; }));
const firstParas = allLandings.map(({ c }) => c.intro[0]);
check('Contenuti', 'paragrafi introduttivi originali (nessun duplicato)', new Set(firstParas).size === 24);
const wordCounts = allLandings.map(({ c }) => [c.lead, ...c.intro, ...c.when, ...c.steps.flatMap((x) => [x.t, x.d]), ...c.tech.flatMap((x) => [x.name, x.text]), ...c.faq.flatMap((x) => [x.q, x.a])].join(' ').split(/\s+/).length);
check('Contenuti', 'testo specifico per landing ≥ 350 parole (esclusi elementi comuni del template)', Math.min(...wordCounts) >= 350, `min ${Math.min(...wordCounts)} · media ${Math.round(wordCounts.reduce((a, b) => a + b, 0) / 24)} · totale ${wordCounts.reduce((a, b) => a + b, 0)} parole`);
check('Contenuti', 'servizi collegati: nessun autoriferimento, tutti esistenti', allLandings.every(({ s, c }) => c.related.every((r) => r !== `${s.category}/${s.slug}` && allSubcategories.some((x) => `${x.category}/${x.slug}` === r))));
const kwStuffing = allLandings.filter(({ c }) => (c.intro.join(' ').match(/\bRoma\b/g) || []).length > 2).map(({ s }) => s.slug);
check('Contenuti', 'nessun keyword stuffing di "Roma" nei testi', kwStuffing.length === 0, kwStuffing.join(', ') || 'max 2 occorrenze nel corpo');
const allText = JSON.stringify(allLandings.map(({ c }) => c)) + JSON.stringify(categories.map((c) => categoryContent(c.slug)));
check('Contenuti', 'nessuna promessa di tempi (H24, minuti, intervento immediato)', !/\bh24\b|24 ?ore su 24|in \d+ minuti|intervento immediato|interveniamo subito/i.test(allText));
check('Contenuti', 'nessuna abilitazione/certificazione attribuita all’impresa', !/(siamo|siamo stati|impresa è|azienda è)\s+(abilitat|certificat|autorizzat)|nostr[ie] (certificazioni|abilitazioni|autorizzazioni)/i.test(allText));
const fam = lines.find((l) => l.id === 'family');
check('PRONTO+', '8 categorie commerciali Family', fam.categories.map((c) => c.id).join() === 'piccola-idraulica,idraulica,spurgo,elettrica,perdite-occulte,allagamenti,muratura,disinfestazioni');
check('PRONTO+', 'ogni landing collegata a una categoria PRONTO+ esistente', allLandings.every(({ c }) => fam.categories.some((x) => x.id === c.plus)));
check('PRONTO+', 'prezzi Family dal listino provvisorio (16 prezzi presenti)', fam.categories.every((c) => c.plans.every((p) => Number.isInteger(p.priceCents) && p.priceCents > 0)));

/* ------------------------------------------------------------ Netlify */
const toml = await fs.readFile(path.join(root, 'netlify.toml'), 'utf8');
check('Netlify', 'publish = "dist" e command = "npm run build"', /publish\s*=\s*"dist"/.test(toml) && /command\s*=\s*"npm run build"/.test(toml));
check('Netlify', 'deploy-preview e branch-deploy con SITE_ENV=preview', /deploy-preview\.environment\][\s\S]*?SITE_ENV = "preview"/.test(toml) && /branch-deploy\.environment\][\s\S]*?SITE_ENV = "preview"/.test(toml));

/* ------------------------------------------------------------ build production */
const outProd = build('production');
check('Build', 'build production senza errori', outProd.includes('Build completata'));
const prod = await inspect('production');
check('[production] Contenuti', 'pagina /stato-progetto/ esclusa e nessun banner', !prod.has('/stato-progetto/') && ![...prod.values()].some((h) => h.includes('dev-banner')));
check('[production] Contenuti', 'nessun pulsante "da configurare"', ![...prod.values()].some((h) => h.includes('da configurare')));
check('[production] Contenuti', 'bozze delle condizioni NON pubblicate in produzione', ![...prod.keys()].some((p) => p.startsWith('/condizioni-bozza/')) && ![...prod.values()].some((h) => h.includes('/condizioni-bozza/')));
check('[production] Contenuti', 'aree riservate presenti, sempre noindex anche in produzione', APP_PATHS.every((p) => (prod.get(p) || '').includes('<meta name="robots" content="noindex, nofollow">')));
check('[production] Build', '67 pagine in produzione (home, indice servizi, 6 categorie, 24 landing, 2 PRONTO+, 3 B2B, 28 pagine applicative, privacy, 404; guide e zone solo dopo approvazione)', prod.size === 67, prod.size);

// Prompt 9: senza listini approvati e pubblicati nel database, in produzione non compare alcun prezzo
const pubHtml = [...prod.entries()].filter(([p]) => !APP_PATHS.includes(p));
check('[production] Prezzi', 'nessun prezzo pubblicato senza approvazione del titolare (nessun importo in € né "price" nei dati strutturati)', pubHtml.every(([, h]) => !/\d\s?€|€\s?\d|"price":/.test(h)), pubHtml.filter(([, h]) => /\d\s?€|€\s?\d|"price":/.test(h)).map(([p]) => p).slice(0, 3).join(', '));
check('[production] Vendite', 'nessun pulsante di acquisto utilizzabile con le funzionalità spente', pubHtml.every(([, h]) => !/href="\/checkout\//.test(h)));
check('[production] Funzionalità', 'configurazione delle aree riservate con funzionalità spente (nessun flag dal database)', APP_PATHS.every((p) => (prod.get(p) || '').includes('"flags":{}')));
check('[production] Attivazione', 'pagine /admin/configurazione-azienda/, /admin/setup/, /admin/impostazioni/pagamenti/, /admin/funzionalita/, /admin/lancio/ presenti e noindex',
  ['/admin/configurazione-azienda/', '/admin/setup/', '/admin/impostazioni/pagamenti/', '/admin/funzionalita/', '/admin/lancio/'].every((p) => (prod.get(p) || '').includes('noindex, nofollow') && prod.get(p).includes('/assets/js/app/attivazione.js')));

// Prompt 9: progetto di staging (APP_ENVIRONMENT=staging) con contesto "production" → build comunque in anteprima
{
  const out = execFileSync(process.execPath, [path.join(root, 'scripts/build.js')], { env: { ...process.env, SITE_ENV: 'production', APP_ENVIRONMENT: 'staging' }, stdio: 'pipe' }).toString();
  const homeStg = await fs.readFile(path.join(DIST, 'index.html'), 'utf8');
  check('Staging', 'APP_ENVIRONMENT=staging: build in anteprima anche con SITE_ENV=production (noindex + banner)', out.includes('APP_ENVIRONMENT=staging') && homeStg.includes('noindex') && homeStg.includes('dev-banner'));
}

/* ------------------------------------------------------------ build development (resta in dist) */
const outDev = build('development');
check('Build', 'build development senza errori', outDev.includes('Build completata'));
const dev = await inspect('development');
check('Build', '82 pagine in anteprima (35 del sito + 2 PRONTO+ + 3 B2B + 28 applicative + 4 bozze legali + zone e 9 pagine di guide in bozza)', dev.size === 82, dev.size);
check('URL', 'le 30 URL di servizio esistono come /<percorso>/index.html', (await Promise.all(serviceUrls.map((u) => exists(path.join(DIST, u, 'index.html'))))).every(Boolean), `${serviceUrls.length} URL`);
check('URL', 'nessun _redirects catch-all che maschera i 404', !/^\/\*\s/m.test(await fs.readFile(path.join(DIST, '_redirects'), 'utf8').catch(() => '')));

const home = dev.get('/');
check('Homepage', 'header con le 6 voci richieste', ['Home', 'Servizi', 'Chi siamo', 'PRONTO+ Family', 'Business e Hotel', 'Contatti'].every((v) => home.includes(`>${v}</a>`)));
check('Homepage', 'catalogo: 24 link alle landing', allSubcategories.every((s) => home.includes(`href="/servizi/${s.category}/${s.slug}/"`)));
check('Homepage', '6 card categoria collegate', categories.every((c) => home.includes(`class="service-card__link" href="/servizi/${c.slug}/"`)));
check('Homepage', 'ancore PRONTO+ per le 8 categorie (#plus-…)', fam.categories.every((c) => home.includes(`id="plus-${c.id}"`)));
check('Homepage', 'moduli intervento + preventivo invariati', (home.match(/<form /g) || []).length === 2);

const landingChecks = { struct: [], preset: [], ld: [], faq: [], buttons: [], related: [], plus: [], crumbs: [], hero: [], links: [] };
for (const { s, c } of allLandings) {
  const u = `/servizi/${s.category}/${s.slug}/`;
  const h = dev.get(u) || '';
  if (!['servizio', 'quando', 'come-funziona', 'tecnologie', 'foto', 'correlati', 'pronto-plus-servizio', 'faq', 'contatti', 'modulo'].every((id) => h.includes(`id="${id}"`))) landingChecks.struct.push(u);
  if (!h.includes(`<option value="${s.category}/${s.slug}" selected>`) || (h.match(/ selected>/g) || []).length < 1) landingChecks.preset.push(u);
  if (!['"Service"', '"BreadcrumbList"', '"FAQPage"'].every((t) => h.includes(t))) landingChecks.ld.push(u);
  const ldFaq = (h.match(/"@type":"Question"/g) || []).length;
  if (ldFaq !== (h.match(/<details class="faq__item"/g) || []).length || ldFaq !== c.faq.length) landingChecks.faq.push(u);
  if (!h.includes('>Richiedi intervento ') || !h.includes('>Contattaci</a>')) landingChecks.buttons.push(u);
  if (!c.related.every((r) => h.includes(`href="/servizi/${r}/"`))) landingChecks.related.push(u);
  if (!h.includes(`href="/piani-assistenza/famiglie/#piano-${c.plus}"`)) landingChecks.plus.push(u);
  if (!h.includes(`href="/servizi/${s.category}/"`) || !h.includes('class="breadcrumb"')) landingChecks.crumbs.push(u);
  if (!/<link rel="preload" as="image"/.test(h) || !/fetchpriority="high"/.test(h)) landingChecks.hero.push(u);
  const cat = dev.get(`/servizi/${s.category}/`) || '';
  if (!cat.includes(`href="${u}"`)) landingChecks.links.push(u);
}
const L = 'Landing (24)';
check(L, 'struttura completa: servizio, quando, come funziona, tecnologie, foto, correlati, PRONTO+, FAQ, contatti', !landingChecks.struct.length, landingChecks.struct.join(', '));
check(L, 'modulo con categoria e sottocategoria preselezionate', !landingChecks.preset.length, landingChecks.preset.join(', '));
check(L, 'pulsanti "Richiedi intervento" e "Contattaci"', !landingChecks.buttons.length, landingChecks.buttons.join(', '));
check(L, 'JSON-LD Service + BreadcrumbList + FAQPage', !landingChecks.ld.length, landingChecks.ld.join(', '));
check(L, 'FAQ in JSON-LD = FAQ visibili', !landingChecks.faq.length, landingChecks.faq.join(', '));
check(L, 'breadcrumb con link alla categoria', !landingChecks.crumbs.length, landingChecks.crumbs.join(', '));
check(L, 'link ai servizi collegati', !landingChecks.related.length, landingChecks.related.join(', '));
check(L, 'link alla categoria PRONTO+ corrispondente', !landingChecks.plus.length, landingChecks.plus.join(', '));
check(L, 'hero: preload immagine + fetchpriority=high (LCP)', !landingChecks.hero.length, landingChecks.hero.join(', '));
check(L, 'ogni landing è linkata dalla propria categoria', !landingChecks.links.length, landingChecks.links.join(', '));

const C = 'Categorie (6)';
check(C, 'modulo con categoria preselezionata', categories.every((c) => (dev.get(`/servizi/${c.slug}/`) || '').includes(`<option value="${c.slug}" selected>`)));
check(C, 'JSON-LD Service + BreadcrumbList + FAQPage', categories.every((c) => ['"Service"', '"BreadcrumbList"', '"FAQPage"'].every((t) => (dev.get(`/servizi/${c.slug}/`) || '').includes(t))));
check(C, 'tema categoria (data-cat + --accent)', categories.every((c) => (dev.get(`/servizi/${c.slug}/`) || '').includes(`data-cat="${c.slug}" style="--accent:${c.accent}"`)));
const leakPage = dev.get('/servizi/ricerca-perdite-occulte/') || '';
check(C, 'ricerca perdite: CTA dominio specialistico configurabile, fallback interno senza errori', leakPage.includes('data-specialist-cta') && /href="#servizi-categoria"[^>]*data-specialist-cta/.test(leakPage));
check(C, 'muratura: confronto riparazioni / ristrutturazioni', (dev.get('/servizi/muratura/') || '').includes('id="confronto"'));
check(C, 'disinfestazioni: schede infestanti', (dev.get('/servizi/disinfestazioni/') || '').includes('id="infestanti"'));

const famPage = dev.get('/piani-assistenza/famiglie/') || '';
const P = 'PRONTO+ Family (pagina)';
check(P, 'hero, presentazione, selettore, confronto, prezzi, esclusioni, FAQ, CTA, link area cliente', ['class="page-hero', 'id="presentazione"', 'role="tablist"', 'class="compare-table"', 'id="prezzi"', 'Esclusioni', 'id="faq"', 'class="cta-band"', 'href="/area-cliente/"'].every((x) => famPage.includes(x)));
check(P, 'selettore con le 8 categorie e 16 piani Essential/Plus', (famPage.match(/class="cat-tabs__btn"/g) || []).length === 8 && (famPage.match(/<article class="plan-card/g) || []).length === 16);
check(P, 'prezzi annuali del listino provvisorio, IVA inclusa', familyCategories.every((c) => ['essential', 'plus'].every((t) => famPage.includes(`<span data-price>${(c.plans[t].priceCents / 100)} €</span><small>/anno, IVA inclusa</small>`))));
check(P, 'Spurgo: 1 spurgo / 2 spurghi fino a 60 minuti', famPage.includes('1 spurgo ordinario fino a 60 minuti') && famPage.includes('2 spurghi ordinari fino a 60 minuti ciascuno'));
check(P, 'vendita non attiva dichiarata, pulsanti di acquisto disattivati', famPage.includes('vendita non ancora attiva') && (famPage.match(/disabled aria-disabled="true">Sottoscrizione non ancora attiva/g) || []).length === 16);
check(P, 'non presentato come assicurazione, tutele di legge indipendenti', famPage.includes('non è una polizza assicurativa') && famPage.includes('Le tue tutele di legge non dipendono da PRONTO+'));
const pwPage = dev.get('/lavoro-protetto/') || '';
const W = 'Lavoro Protetto (pagina)';
check(W, '3 piani con prezzi e durate del listino', protectedPlans.every((p) => pwPage.includes(`<span data-price>${p.priceCents / 100} €</span><small>una tantum, IVA inclusa</small>`) && pwPage.includes(`Durata del servizio: ${p.durationMonths} mesi`)));
check(W, 'avviso: non sostituisce le garanzie di legge, segnalazione difetti anche senza acquisto', pwPage.includes('non sostituisce le garanzie di legge') && pwPage.includes('anche senza</strong> acquistare') && pwPage.includes('href="/area-cliente/i-miei-interventi/"'));
check(W, 'non presentato come assicurazione; esclusi riparazioni illimitate e danni futuri', /non è un’assicurazione/.test(pwPage) && pwPage.includes('Riparazioni illimitate') && pwPage.includes('danni futuri'));
check(W, 'limiti di zona, durata visite, orari e listini specialistici', ['Comune di Roma', 'Fino a 60 minuti', 'Lunedì–venerdì', 'Autospurgo', 'Diagnostica strumentale'].every((x) => pwPage.includes(x)));
check(W, 'nessuna offerta preselezionata nella pagina', !/checked/.test(pwPage));
check('Certificato', 'denominazione corretta (non "dichiarazione di conformità")', pwPage.includes('Certificato digitale di intervento') && pwPage.includes('Non è una dichiarazione di conformità'));

/* ------------------------------------------------------------ B2B: Business, Hotel, Corporate */
const B = 'B2B (pagine)';
const bizPage = dev.get('/piani-assistenza/business/') || '';
const hotPage = dev.get('/hotel-e-strutture-ricettive/') || '';
const corpPage = dev.get('/corporate/') || '';
check(B, 'Business: 10 sezioni (hero, presentazione, benefici, settori, pacchetti, tabella, inclusi/esclusi, modulo, FAQ, azienda)',
  ['class="page-hero', 'id="presentazione"', 'class="benefits"', 'id="settori"', 'id="pacchetti"', 'id="confronto"', 'id="inclusi"', 'id="preventivo"', 'id="faq"', 'id="azienda"'].every((x) => bizPage.includes(x)));
check(B, 'pacchetti Business e Hotel con prezzi "+ IVA, se applicabile"', businessPlans.every((p) => [bizPage, hotPage].some((h) => h.includes(`<span data-price>${euro(p.priceCents)}</span><small>/anno + IVA, se applicabile</small>`))), businessPlans.map((p) => euro(p.priceCents)).join(' · '));
check(B, 'Hotel: titolo e sottotitolo richiesti', hotPage.includes('>Assistenza tecnica e manutenzione per Hotel a Roma</h1>') && hotPage.includes('Soluzioni personalizzate per strutture ricettive che desiderano organizzare manutenzioni, verifiche tecniche e richieste di intervento.'));
check(B, 'Hotel: 8 sezioni di servizio', ['Manutenzione idraulica', 'Manutenzione elettrica', 'Scarichi e fognature', 'Ricerca perdite occulte', 'Videoispezioni', 'Allagamenti', 'Riparazioni murarie', 'Disinfestazioni'].every((x) => hotPage.includes(`<h3>${x}</h3>`)));
check(B, 'Corporate: "da 15.000 €/anno + IVA", sempre personalizzato, attivazione solo con approvazione', corpPage.includes('15.000 €</strong>/anno <small>+ IVA, se applicabile') && corpPage.includes('personalizzato') && corpPage.includes('responsabile aziendale autorizzato'));
check(B, 'nessuna promessa di H24 o tempi di arrivo garantiti', ![bizPage, hotPage, corpPage].some((h) => /(H24|24 ore su 24|24\/7|arrivo garantito|entro \d+ minuti)(?![^<]*\?)/i.test(h.replace(/Siete disponibili 24 ore su 24\?/g, ''))));
check(B, 'visite non presentate come verifiche obbligatorie; non assicurazione', hotPage.includes('non sostituiscono le verifiche periodiche obbligatorie') && bizPage.includes('non sono polizze assicurative'));
check(B, 'moduli lead (hotel, aziende/condomini, corporate) verso la funzione dedicata, disattivati senza backend', [bizPage, hotPage, corpPage].every((h) => h.includes('action="/.netlify/functions/lead-create"') && h.includes('data-enabled="false"')) && bizPage.includes('value="condominium"'));
check(B, 'modulo: campi richiesti (ragione sociale, referente, email, telefono, tipologia, sedi, zona, servizi, necessità, sopralluogo)', ['ragione_sociale', 'referente', 'email', 'telefono', 'attivita', 'sedi', 'zona', 'servizi', 'esigenze', 'sopralluogo', 'privacy'].every((n) => bizPage.includes(`name="${n}"`)));
check(B, 'SEO: parole chiave nei titoli e JSON-LD con breadcrumb, FAQ e catalogo offerte', /Manutenzione aziende Roma/.test(bizPage) && /Manutenzione hotel Roma/.test(hotPage) && /condomini a Roma/.test(bizPage) && [bizPage, hotPage].every((h) => h.includes('"OfferCatalog"') && h.includes('"BreadcrumbList"') && h.includes('"FAQPage"')));
check(B, 'navigazione: voce "Business e Hotel" verso la landing Business; footer con Hotel e Corporate', (dev.get('/') || '').includes('href="/piani-assistenza/business/"') && (dev.get('/') || '').includes('href="/corporate/"') && (dev.get('/') || '').includes('href="/hotel-e-strutture-ricettive/"'));
check(B, 'area Business: noindex, script dedicato, nessuna chiave privilegiata', (dev.get('/area-business/') || '').includes('noindex, nofollow') && (dev.get('/area-business/') || '').includes('/assets/js/app/business.js') && ![...dev.values()].some((h) => /service_role|SERVICE_ROLE/.test(h)));
// ---------------------------------------------------------------- Prompt 5: centrale operativa
const P5 = 'Centrale operativa (Prompt 5)';
const opsPages = ['/admin/centrale-operativa/', '/admin/calendario/', '/admin/tecnici/', '/tecnico/', '/rapporto/', '/area-cliente/richieste/'];
check(P5, 'pagine centrale, calendario, tecnici, area tecnico mobile, verifica rapporto e richieste cliente: presenti e sempre noindex', opsPages.every((p) => (dev.get(p) || '').includes('<meta name="robots" content="noindex, nofollow">') && (prod.get(p) || '').includes('noindex, nofollow')));
check(P5, 'script e stile dedicati caricati solo nelle aree riservate', ['centrale', 'calendario', 'tecnici', 'tecnico-mobile'].every((s) => (dev.get(opsPages[['centrale', 'calendario', 'tecnici', 'tecnico-mobile'].indexOf(s)]) || '').includes(`/assets/js/app/${s}.js`))
  && (dev.get('/admin/centrale-operativa/') || '').includes('/assets/css/ops.css') && !(dev.get('/') || '').includes('ops.css'));
check(P5, 'regole condivise pubblicate in assets/js/lib/operations.js', existsSync(path.join(DIST, 'assets/js/lib/operations.js')));
check(P5, 'aree riservate escluse dalla sitemap', !opsPages.some((p) => (readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8')).includes(p)));
check(P5, 'nessuna chiave privilegiata e nessun dato dimostrativo negli script della centrale', ['centrale', 'calendario', 'tecnici', 'tecnico-mobile', 'ops-common', 'cliente-richieste'].every((f) => {
  const src = readFileSync(path.join(DIST, `assets/js/app/${f}.js`), 'utf8');
  return !/service_role|SERVICE_ROLE|Math\.random|demo|fittizi/i.test(src);
}));
check(P5, 'area tecnico: nessun tracciamento GPS (nessuna API di geolocalizzazione)', !/geolocation|watchPosition|getCurrentPosition/.test(readFileSync(path.join(DIST, 'assets/js/app/tecnico-mobile.js'), 'utf8')));
check(P5, 'intestazioni Netlify: /tecnico/ e /rapporto/ noindex con CSP', /for = "\/tecnico\/\*"[\s\S]*?noindex[\s\S]*?Content-Security-Policy/.test(readFileSync(path.join(root, 'netlify.toml'), 'utf8'))
  && /for = "\/rapporto\/\*"[\s\S]*?noindex/.test(readFileSync(path.join(root, 'netlify.toml'), 'utf8')));
check(P5, 'moduli pubblici: invio verso la centrale solo con provider "centrale" e backend configurato (attualmente disattivato)', !(dev.get('/') || '').includes('request-create') && (dev.get('/') || '').includes('data-enabled="false"'));
// ---------------------------------------------------------------- Prompt 6: PRONTO AI
const P6 = 'PRONTO AI (Prompt 6)';
{
  const aiPage = dev.get('/admin/pronto-ai/') || '';
  check(P6, 'console /admin/pronto-ai/: presente, noindex, script dedicato, esclusa dalla sitemap', aiPage.includes('noindex, nofollow') && aiPage.includes('/assets/js/app/pronto-ai.js')
    && (prod.get('/admin/pronto-ai/') || '').includes('noindex, nofollow') && !readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8').includes('/admin/pronto-ai/'));
  const widget = readFileSync(path.join(DIST, 'assets/js/ai-widget.js'), 'utf8');
  check(P6, 'widget: catalogo reale (6 categorie, 24 servizi) inserito in build', /"categories":\[\{/.test(widget) && (widget.match(/"id":"[a-z-]+\/[a-z0-9-]+"/g) || []).length === 24);
  const clientAi = ['assets/js/ai-widget.js', 'assets/js/app/pronto-ai.js', 'assets/js/app/ai-chat-panel.js', 'assets/js/main.js'].map((f) => readFileSync(path.join(DIST, f), 'utf8')).join('\n');
  check(P6, 'nessuna chiave, endpoint del provider AI o credenziale privilegiata nel codice del browser', !/sk-[A-Za-z0-9]{10}|x-api-key|api\.openai\.com|api\.anthropic\.com|service_role|SERVICE_ROLE/.test(clientAi));
  check(P6, 'widget: dichiarato come AI, pulsante per assistenza umana, conferma esplicita, 112 per i pericoli', ['intelligenza artificiale', 'parlare con una persona', 'Conferma e invia', 'tel:112'].every((t) => widget.includes(t)));
  check(P6, 'widget: nessun innerHTML (testo inserito come testo)', !/innerHTML|insertAdjacentHTML|outerHTML/.test(widget));
  check(P6, 'pulsante dell’assistente disattivato per impostazione predefinita (PUBLIC_AI_WIDGET)', ![...dev.values()].some((h) => h.includes('data-ai-launcher')));
  const outAi = execFileSync(process.execPath, [path.join(root, 'scripts/build.js')], { env: { ...process.env, SITE_ENV: 'development', PUBLIC_AI_WIDGET: 'true' }, stdio: 'pipe' }).toString();
  const withAi = await loadPages();
  const landing = withAi.get('/servizi/idraulica/spurgo-lavandini/') || '';
  check(P6, 'con PUBLIC_AI_WIDGET=true: pulsante su homepage, landing, PRONTO+, Business, Hotel e area cliente', outAi.includes('Build completata')
    && ['/', '/servizi/idraulica/spurgo-lavandini/', '/piani-assistenza/famiglie/', '/piani-assistenza/business/', '/hotel-e-strutture-ricettive/', '/area-cliente/'].every((p) => (withAi.get(p) || '').includes('data-ai-launcher')),
    ['/', '/servizi/idraulica/spurgo-lavandini/', '/piani-assistenza/famiglie/', '/piani-assistenza/business/', '/hotel-e-strutture-ricettive/', '/area-cliente/'].filter((p) => !(withAi.get(p) || '').includes('data-ai-launcher')).join(', '));
  check(P6, 'nessun pulsante nelle aree tecniche, amministrative e di pagamento', ['/admin/', '/admin/pronto-ai/', '/tecnico/', '/checkout/', '/rapporto/'].every((p) => withAi.has(p) ? !withAi.get(p).includes('data-ai-launcher') : true));
  check(P6, 'landing SEO: widget non incluso nella pagina (JS e CSS scaricati solo al clic)', !landing.includes('ai-widget.js') && !landing.includes('ai-widget.css') && readFileSync(path.join(DIST, 'assets/js/main.js'), 'utf8').includes("import('/assets/js/ai-widget.js')"));
  check(P6, 'peso aggiunto alle landing dal pulsante: meno di 1 KB di HTML', (landing.match(/<button type="button" class="ai-launcher"[\s\S]*?<\/button>/)?.[0].length || 9999) < 1024);
  build('development');
}
// ---------------------------------------------------------------- Prompt 8: collaudo di lancio
const P8 = 'Lancio (Prompt 8)';
{
  const toml = readFileSync(path.join(root, 'netlify.toml'), 'utf8');
  check(P8, 'netlify.toml: build, publish, Node 22, funzioni, edge function di protezione dello staging', /command = "npm run build"/.test(toml) && /publish = "dist"/.test(toml)
    && /NODE_VERSION = "22"/.test(toml) && /edge_functions = "netlify\/edge-functions"/.test(toml) && existsSync(path.join(root, 'netlify/edge-functions/staging-auth.js')));
  check(P8, 'CSP sul sito pubblico (/*) e sulle aree riservate', /for = "\/\*"[\s\S]*?Content-Security-Policy = "default-src 'self'/.test(toml) && (toml.match(/Content-Security-Policy/g) || []).length >= 4);
  check(P8, 'contesti Netlify: anteprime e branch deploy sempre SITE_ENV=preview', /\[context\.deploy-preview\.environment\]\s+SITE_ENV = "preview"/.test(toml) && /\[context\.branch-deploy\.environment\]\s+SITE_ENV = "preview"/.test(toml));
  const tracked = execFileSync('git', ['ls-files'], { cwd: root }).toString().split('\n');
  check(P8, 'repository: nessun .env, chiave, dump o backup tracciato', !tracked.some((f) => /(^|\/)\.env($|\.(?!example))|\.pem$|\.key$|\.dump$|^backups\//.test(f)), `${tracked.length} file tracciati`);
  const gi = readFileSync(path.join(root, '.gitignore'), 'utf8');
  check(P8, '.gitignore: .env, dist, node_modules, backups, file generati', ['.env', 'node_modules', 'dist', 'backups/', 'netlify/generated/'].every((x) => gi.includes(x)));
  check(P8, 'produzione locale senza autorizzazione: noindex (guardia ALLOW_INDEXING + dominio)', /noindex/.test(prod.get('/') || ''));
  const docs = ['REPORT_AUDIT.md', 'REPORT_TEST.md', 'SECURITY_CHECKLIST.md', 'SEO_MIGRATION.md', 'NETLIFY_DEPLOYMENT.md', 'DOMAIN_MIGRATION.md', 'ROLLBACK_PLAN.md', 'PRODUCTION_READINESS.md', 'ENVIRONMENT_VARIABLES.md'];
  const missing = docs.filter((d) => !existsSync(path.join(root, 'docs', d)));
  check(P8, 'documentazione di lancio presente (9 documenti + README)', !missing.length, missing.join(', ') || 'completa');
}
// ---------------------------------------------------------------- Prompt 7: PRONTO SEO
const P7 = 'PRONTO SEO (Prompt 7)';
{
  const seoPage = dev.get('/admin/seo/') || '';
  const sm = readFileSync(path.join(DIST, 'sitemap.xml'), 'utf8');
  check(P7, 'dashboard /admin/seo/: presente, noindex, script dedicato, esclusa dalla sitemap', seoPage.includes('noindex, nofollow') && seoPage.includes('/assets/js/app/pronto-seo.js')
    && (prod.get('/admin/seo/') || '').includes('noindex, nofollow') && !sm.includes('/admin/'));
  const priv = ['/admin/', '/area-cliente/', '/area-business/', '/tecnico/', '/checkout/', '/paga/', '/pagamento/', '/rapporto/', '/recensioni/', '/accesso/', '/privacy/', '/cookie-policy/'];
  check(P7, 'sitemap: nessuna area riservata, login, checkout, documenti o pagine segnaposto', !priv.some((p) => sm.includes(`${site.url}${p}`)), priv.filter((p) => sm.includes(`${site.url}${p}`)).join(', ') || `${priv.length} percorsi esclusi`);
  check(P7, 'guide in bozza e zone non confermate: fuori dalla sitemap e noindex', !sm.includes('/guide/') && !sm.includes('/zone-operative/')
    && [...dev.entries()].filter(([p]) => p.startsWith('/guide/') || p.startsWith('/zone-operative/')).every(([, h]) => /noindex/.test(h)));
  const clientSeo = ['assets/js/app/pronto-seo.js', 'assets/js/app/recensioni-rinuncia.js', 'assets/js/main.js'].map((f) => readFileSync(path.join(DIST, f), 'utf8')).join('\n');
  check(P7, 'nessun token, chiave Google o segreto OAuth nel codice del browser', !/private_key|client_secret|refresh_token|SEO_TOKEN_KEY|GSC_SERVICE_ACCOUNT|GOOGLE_OAUTH_CLIENT_SECRET|service_role|ya29\./.test(clientSeo));
  check(P7, 'senza GA4 configurato: nessun banner, nessuno script Google, nessun cookie di analisi', ![...dev.values()].some((h) => h.includes('data-consent') || /googletagmanager|gtag\(/.test(h)));
  check(P7, 'dati strutturati: nessuna recensione o valutazione', ![...dev.values()].some((h) => /"(aggregateRating|review)"\s*:/.test(h)));
  const auditJson = JSON.parse(readFileSync(path.join(root, 'netlify/generated/seo-audit.json'), 'utf8'));
  check(P7, 'audit SEO della build eseguito (registro delle pagine pubbliche per la dashboard)', auditJson.summary && Array.isArray(auditJson.pages), `${auditJson.summary.publicPages} pagine pubbliche · ${auditJson.summary.errors} errori · ${auditJson.summary.warnings} avvisi (anteprima)`);
  const redirects = existsSync(path.join(DIST, '_redirects')) ? readFileSync(path.join(DIST, '_redirects'), 'utf8') : '';
  check(P7, '_redirects: 301 forzato (301!) per gli URL duplicati (/index.html), valido anche con il file presente', /^\/index\.html\s+\/\s+301!/m.test(redirects));
  check(P7, '404: noindex, senza canonical, con collegamenti ai servizi', /noindex/.test(dev.get('/404.html') || '') && !/rel="canonical"/.test(dev.get('/404.html') || '') && (dev.get('/404.html') || '').includes('/servizi/'));
  check(P7, 'funzioni pianificate: sincronizzazione Search Console e monitoraggio', /schedule:/.test(readFileSync(path.join(root, 'netlify/functions/seo-sync.mjs'), 'utf8')) && /schedule:/.test(readFileSync(path.join(root, 'netlify/functions/seo-monitor.mjs'), 'utf8')));
  // con GA4 configurato (ID di prova): banner, Consent Mode, nessuno script Google nell'HTML (caricato solo dopo il consenso)
  const outGa = execFileSync(process.execPath, [path.join(root, 'scripts/build.js')], { env: { ...process.env, SITE_ENV: 'development', PUBLIC_GA4_MEASUREMENT_ID: 'G-TEST000000' }, stdio: 'pipe' }).toString();
  const withGa = await loadPages();
  const home = withGa.get('/') || '';
  check(P7, 'con PUBLIC_GA4_MEASUREMENT_ID: banner con Accetta, Rifiuta, Personalizza e cookie policy', outGa.includes('Build completata') && ['data-consent-accept', 'data-consent-reject', 'data-consent-customize', 'data-consent-open', '/cookie-policy/'].every((t) => home.includes(t)) && withGa.has('/cookie-policy/'));
  check(P7, 'con GA4: nessuno script Google nell’HTML (caricato dal JS solo dopo il consenso)', ![...withGa.values()].some((h) => /<script[^>]+googletagmanager/.test(h)));
  check(P7, 'Consent Mode: stato predefinito "denied" prima di ogni aggiornamento', /consent', 'default', \{ ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' \}/.test(readFileSync(path.join(DIST, 'assets/js/main.js'), 'utf8')));
  check(P7, 'nessun banner nelle aree riservate', ['/admin/seo/', '/tecnico/', '/checkout/'].every((p) => !(withGa.get(p) || '').includes('data-consent-accept')));
  build('development');
}
check(B, 'sitemap: landing B2B incluse, area Business esclusa', (await fs.readFile(path.join(DIST, 'sitemap.xml'), 'utf8')).includes('/corporate/') && !(await fs.readFile(path.join(DIST, 'sitemap.xml'), 'utf8')).includes('/area-business/'));

/* ------------------------------------------------------------ Pagamenti (Prompt 4) */
const PG = 'Pagamenti (pagine)';
const sitemapXml = await fs.readFile(path.join(DIST, 'sitemap.xml'), 'utf8');
const headerBlock = (p) => { const i = toml.indexOf(`for = "${p}"`); return i < 0 ? '' : toml.slice(i, toml.indexOf('[[headers]]', i + 1) >>> 0); };
const payPaths = ['/checkout/', '/paga/', '/pagamento/verifica/', '/pagamento/in-attesa/', '/pagamento/confermato/', '/pagamento/annullato/', '/pagamento/non-riuscito/'];
check(PG, 'checkout, link di pagamento e 5 pagine di esito generati, noindex ed esclusi dalla sitemap',
  payPaths.every((p) => (dev.get(p) || '').includes('noindex, nofollow')) && !payPaths.some((p) => (sitemapXml || '').includes(p)));
check(PG, 'nessun campo carta nel sito (checkout ospitato myPOS)', ![...dev.values()].some((h) => /autocomplete="cc-|name="(card|pan|cvv|cvc)/i.test(h)));
check(PG, 'intestazioni: CSP con form-action solo verso myPOS, no-referrer e no-store sulle pagine di pagamento',
  ['/checkout/*', '/paga/*', '/pagamento/*'].every((p) => { const blk = headerBlock(p); return blk.includes('Referrer-Policy = "no-referrer"') && blk.includes('no-store') && blk.includes("form-action 'self' https://www.mypos.com;"); }));
check(PG, 'pagina Family: senza vendita attiva nessun collegamento al checkout', !famPage.includes('/checkout/?piano='));
check(PG, 'nessuna chiave privata o segreto myPOS nell’output', ![...dev.values()].some((h) => /BEGIN (RSA )?PRIVATE KEY|MYPOS_PRIVATE_KEY|service_role/.test(h)));

check('Moduli', 'senza servizio configurato: invio disattivato su tutte le pagine', [...dev.values()].every((h) => !h.includes('<form ') || (!h.includes('data-enabled="true"') && /type="submit" disabled/.test(h))));
check('Moduli', 'nessuna conferma di invio nell’HTML', ![...dev.values()].some((h) => /Richiesta ricevuta|inviata con successo/.test(h)));
const js = await fs.readFile(path.join(DIST, 'assets/js/main.js'), 'utf8');
check('Moduli', 'JS: conferma solo dopo risposta HTTP ok; blocco se non configurato', /if \(!res\.ok\) throw/.test(js) && js.includes("form.dataset.enabled !== 'true'"));
check('Immagini', 'tutte le immagini illustrative marcate come placeholder/illustrative', [...dev.values()].every((h) => !/<img/.test(h) || !/data-placeholder="false"/.test(h)));
const phCount = (await walk(path.join(DIST, 'assets/images/placeholder'))).length;
check('Immagini', 'placeholder generati per hero e gallerie', phCount >= 6 + 24 * 4, `${phCount} file SVG`);

const css = (await fs.stat(path.join(DIST, 'assets/css/main.css'))).size;
const jsSize = Buffer.byteLength(js);
const maxHtml = Math.max(...[...dev.values()].map((h) => Buffer.byteLength(h)));
check('Performance', 'CSS < 80 KB (sito, aree riservate, B2B e checkout), JS < 20 KB, HTML max < 120 KB', css < 80000 && jsSize < 20000 && maxHtml < 120000, `CSS ${(css / 1024).toFixed(1)} KB · JS ${(jsSize / 1024).toFixed(1)} KB · HTML max ${(maxHtml / 1024).toFixed(1)} KB`);
check('Performance', 'nessuna risorsa esterna (font/CDN/script)', ![...dev.values()].some((h) => /<link rel="(stylesheet|preload|preconnect)"[^>]+href="https?:|<script[^>]+src="https?:/.test(h)));

/* ------------------------------------------------------------ servizio HTTP delle URL */
const port = 4300 + Math.floor(Math.random() * 500);
const srv = spawn(process.execPath, [path.join(root, 'scripts/serve.js')], { env: { ...process.env, PORT: String(port) }, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 600));
const statuses = [];
for (const u of ['/', ...serviceUrls, '/privacy/', '/sitemap.xml', '/robots.txt', '/pagina-inesistente/']) {
  try { statuses.push([u, (await fetch(`http://localhost:${port}${u}`)).status]); } catch { statuses.push([u, 0]); }
}
srv.kill();
const okUrls = statuses.filter(([u, s]) => (u === '/pagina-inesistente/' ? s === 404 : s === 200));
check('HTTP', 'home + 30 URL + privacy + sitemap + robots rispondono 200; URL inesistente 404', okUrls.length === statuses.length, statuses.filter((x) => !okUrls.includes(x)).map(([u, s]) => `${u}:${s}`).join(', ') || `${statuses.length} richieste`);

/* ------------------------------------------------------------ report */
const failed = results.filter((r) => !r.ok);
const groups = [...new Set(results.map((r) => r.group))];
let md = `# Report test — PRONTO INTERVENTO ROMA\n\nEseguito: ${new Date().toISOString()}  \nNode ${process.version} · comando \`npm test\`\n\n**Esito test automatici: ${results.length - failed.length}/${results.length} superati${failed.length ? ` — ${failed.length} FALLITI` : ''}.**\n\n`;
for (const g of groups) {
  md += `## ${g}\n\n| Esito | Controllo | Dettaglio |\n|---|---|---|\n`;
  for (const r of results.filter((x) => x.group === g)) md += `| ${r.ok ? '✅' : '❌'} | ${r.name} | ${r.detail.replace(/\|/g, '/').slice(0, 400)} |\n`;
  md += '\n';
}
md += `## URL di servizio verificate\n\n${serviceUrls.map((u) => `- \`${u}\``).join('\n')}\n`;
await fs.mkdir(path.join(root, 'reports'), { recursive: true });
await fs.writeFile(path.join(root, 'reports/test-report.md'), md);

console.log(`\nTest: ${results.length - failed.length}/${results.length} superati`);
for (const x of failed) console.log(`  ✖ ${x.group} — ${x.name}: ${x.detail}`);
console.log('Report: reports/test-report.md\n');
process.exit(failed.length ? 1 : 0);
