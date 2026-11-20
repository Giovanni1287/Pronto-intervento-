#!/usr/bin/env node
/**
 * Build statico — PRONTO INTERVENTO ROMA
 * Genera /dist pronto per Netlify. Nessuna dipendenza esterna.
 *
 *   SITE_ENV=development (default) → noindex, banner anteprima, pagina /stato-progetto/
 *   SITE_ENV=preview               → come development (deploy preview Netlify)
 *   SITE_ENV=production            → niente banner/pagina stato; index solo se seo.allowIndexing=true
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { site, contacts, company, forms, specialistDomains, seo, images } from '../src/config/site.config.js';
import { categories, allSubcategories } from '../src/data/services.js';
import { ctx } from '../src/components/context.js';
import { placeholderSvg } from '../src/components/placeholder.js';
import { logoSvgFile, faviconSvg } from '../src/components/logo.js';
import { isSet } from '../src/components/utils.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'src');
// BUILD_OUT_DIR: cartella alternativa (solo per l'audit SEO simulato, mai pubblicata)
const DIST = process.env.BUILD_OUT_DIR ? path.resolve(root, process.env.BUILD_OUT_DIR) : path.join(root, 'dist');
const SIMULATE_INDEXABLE = process.env.SEO_SIMULATE_INDEXABLE === 'true' && Boolean(process.env.BUILD_OUT_DIR) && !DIST.endsWith(`${path.sep}dist`);

/* ------------------------------------------------------------ contesto */
// Prompt 9: su un progetto dichiarato di staging (APP_ENVIRONMENT=staging) la build non è MAI di produzione,
// anche se netlify.toml imposta SITE_ENV=production per il contesto "production" del progetto di staging.
const requestedEnv = ['production', 'preview'].includes(process.env.SITE_ENV) ? process.env.SITE_ENV : 'development';
const env = process.env.APP_ENVIRONMENT === 'staging' && requestedEnv === 'production' ? 'preview' : requestedEnv;
if (env !== requestedEnv) console.log('ℹ APP_ENVIRONMENT=staging: build in modalità anteprima (noindex, banner, prezzi in bozza) anche nel contesto "production" dello staging');
ctx.env = env;
// Prompt 8 — tripla condizione per l'indicizzazione (difesa contro staging/anteprime indicizzate):
//  1) SITE_ENV=production; 2) consenso esplicito: seo.allowIndexing=true oppure ALLOW_INDEXING=true
//  (variabile da impostare SOLO nel progetto Netlify di produzione); 3) la build è per il dominio
//  ufficiale: URL (impostata da Netlify = URL principale del sito) ha lo stesso host di site.url.
//  Uno staging *.netlify.app resta quindi noindex anche se qualcuno vi imposta ALLOW_INDEXING.
const deployHost = (() => { try { return new URL(process.env.URL || '').hostname; } catch { return ''; } })();
ctx.indexableReason = env !== 'production' ? `SITE_ENV=${env}`
  : !(seo.allowIndexing === true || process.env.ALLOW_INDEXING === 'true') ? 'indicizzazione non autorizzata (ALLOW_INDEXING)'
  : deployHost !== new URL(site.siteUrl).hostname ? `URL di deploy "${deployHost || 'non impostata'}" diversa dal dominio ufficiale`
  : 'ok';
ctx.indexable = SIMULATE_INDEXABLE ? env === 'production' : ctx.indexableReason === 'ok';
ctx.buildDate = new Date().toISOString();

/* ------------------------------------------------------------ dati mancanti */
const miss = (area, key, note) => ctx.missing.push({ area, key, note });

/* ------------------------------------------------------------ Prompt 9: dati dal database
 * Funzionalità attive, dati aziendali VERIFICATI e listini pubblicabili si leggono da Supabase con la
 * chiave pubblica (funzioni public_*). Senza backend: funzionalità spente, nessun prezzo in produzione,
 * dati aziendali solo da site.config.js. Una build di PRODUZIONE con backend configurato ma non
 * raggiungibile si ferma: meglio non pubblicare che pubblicare un sito senza contatti o con dati vecchi. */
ctx.flags = null; ctx.publicPrices = null; ctx.companyApplied = [];
{
  const { backend } = await import('../src/config/site.config.js');
  const { applyCompanyProfile } = await import('../src/config/company-runtime.js');
  if (backend.supabaseUrl && backend.supabaseAnonKey && !backend.supabaseUrl.includes('.test')) {
    const call = async (fn) => {
      const r = await fetch(`${backend.supabaseUrl}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: backend.supabaseAnonKey, Authorization: `Bearer ${backend.supabaseAnonKey}`, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(8000) });
      if (!r.ok) throw new Error(`${fn}: HTTP ${r.status}`);
      return r.json();
    };
    try {
      ctx.flags = await call('public_feature_flags');
      ctx.publicPrices = await call('public_price_list');
      ctx.companyApplied = applyCompanyProfile(await call('public_company_profile'), { storageUrl: backend.supabaseUrl });
    } catch (e) {
      if (env === 'production') { console.error(`✖ Dati del database non leggibili (${e.message}): build di produzione interrotta.`); process.exit(1); }
      miss('Configurazione', 'Supabase', `Dati aziendali, funzionalità e listini non letti dal database (${e.message})`);
    }
  }
  // SOLO per i test nel browser con backend simulato (URL *.test, mai in produzione): funzionalità dichiarate dal test
  if (!ctx.flags && process.env.BUILD_TEST_FLAGS && backend.supabaseUrl.includes('.test') && env !== 'production') {
    ctx.flags = JSON.parse(process.env.BUILD_TEST_FLAGS);
    miss('Funzionalità', 'BUILD_TEST_FLAGS', 'Funzionalità impostate dal test automatico (backend simulato): build non pubblicabile');
  }
  if (!ctx.flags) miss('Funzionalità', 'feature_flags', 'Funzionalità non lette dal database: vendite, area clienti e assistente restano spenti sul sito');
}
if (!isSet(contacts.phone)) miss('Contatti', 'contacts.phone', 'Numero di telefono per pulsante "Chiama" e Schema.org');
if (!isSet(contacts.whatsapp)) miss('Contatti', 'contacts.whatsapp', 'Numero WhatsApp per il pulsante dedicato');
if (!isSet(contacts.email)) miss('Contatti', 'contacts.email', 'Email aziendale');
if (!isSet(contacts.hours)) miss('Contatti', 'contacts.hours', 'Orari di disponibilità (non dichiarare H24 se non confermato)');
for (const [k, label] of [
  ['legalName', 'Ragione sociale'],
  ['vatNumber', 'Partita IVA (obbligatoria nel sito)'],
  ['taxCode', 'Codice fiscale'],
  ['rea', 'Numero REA'],
  ['pec', 'PEC']
]) if (!isSet(company[k])) miss('Dati aziendali', `company.${k}`, label);
if (!isSet(company.address.street)) miss('Dati aziendali', 'company.address', 'Sede legale/operativa');
if (!isSet(company.story)) miss('Chi siamo', 'company.story', 'Breve storia aziendale fornita dal titolare');
if (!company.ownerPhoto) miss('Chi siamo', 'company.ownerPhoto', 'Fotografia autentica del titolare');
if (!site.serviceArea.zones.length) miss('Chi siamo', 'site.serviceArea.zones', 'Zone operative (quartieri/comuni)');
if (!forms.provider) miss('Moduli', 'forms.provider', 'Servizio di ricezione moduli (Netlify Forms o endpoint): invio attualmente disattivato');
if (!isSet(specialistDomains.leakDetection)) miss('Ricerca perdite', 'specialistDomains.leakDetection', 'Dominio specialistico: la CTA punta alla pagina interna');
if (!images.hero.src) miss('Immagini', 'images.hero', 'Foto hero con licenza commerciale');
if (!images.leakDetection.src) miss('Immagini', 'images.leakDetection', 'Foto sezione ricerca perdite');
miss('Legale', 'pagina /privacy/', 'Informativa privacy e cookie policy da redigere');
{
  const { commerce, backend } = await import('../src/config/site.config.js');
  if (!commerce.ownerApproved) miss('PRONTO+', 'commerce.ownerApproved', 'Conferma del titolare su prestazioni e prezzi Family e Lavoro Protetto (listino provvisorio)');
  if (!commerce.legalReviewed) miss('PRONTO+', 'commerce.legalReviewed', 'Verifica legale delle condizioni (bozze in docs/legale/)');
  if (!backend.supabaseUrl || !backend.supabaseAnonKey) miss('Backend', 'PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY', 'Progetto Supabase non collegato: area cliente, dashboard e certificati non operativi');
  if (!process.env.MYPOS_SID) miss('Pagamenti', 'MYPOS_* (variabili Netlify)', 'Checkout myPOS non configurato (solo sandbox, nessun pagamento reale)');
  if (!process.env.RESEND_API_KEY) miss('Notifiche', 'RESEND_API_KEY / NOTIFY_FROM', 'Nessun provider email: le notifiche restano "non inviate"');
  // Prompt 5 — centrale operativa
  if (forms.provider !== 'centrale') miss('Centrale operativa', "forms.provider = 'centrale'", 'Moduli del sito non ancora collegati alla centrale operativa (richiede Supabase)');
  miss('Centrale operativa', 'qualification_requirements', 'Requisiti professionali obbligatori per specializzazione da definire con il titolare');
  miss('Centrale operativa', 'src/data/catalog/specializations.js', 'Mappatura servizi → specializzazioni provvisoria, da confermare');
  miss('Centrale operativa', 'retention_months_photos', 'Periodi di conservazione di foto e documenti da definire secondo gli obblighi applicabili');
  // Prompt 6 — PRONTO AI
  const { ai } = await import('../src/config/site.config.js');
  if (!process.env.AI_PROVIDER || !process.env.AI_MODEL || !process.env.AI_API_KEY) miss('PRONTO AI', 'AI_PROVIDER / AI_MODEL / AI_API_KEY (variabili Netlify)', 'Provider AI non configurato: gli assistenti rispondono "non disponibile" (503)');
  if (!ai.widget) miss('PRONTO AI', 'PUBLIC_AI_WIDGET', 'Pulsante dell’assistente sul sito non attivo');
  miss('PRONTO AI', 'ai_settings (tariffe, DPA, informativa)', 'Tariffe reali del provider, DPA e informativa privacy da confermare prima di attivare l’interruttore globale');
}
const landingsTodo = allSubcategories.filter((s) => !s.landingReady).length;
if (landingsTodo) miss('Landing', 'services.landingReady', `${landingsTodo} landing di sottocategoria da realizzare`);
{
  const { photos } = await import('../src/config/images.config.js');
  const needed = [
    ...categories.map((c) => `category/${c.slug}`),
    ...allSubcategories.flatMap((s) => [`landing/${s.category}/${s.slug}/hero`, ...[1, 2, 3].map((n) => `landing/${s.category}/${s.slug}/gallery-${n}`)])
  ];
  const absent = needed.filter((k) => !photos[k]?.src).length;
  if (absent) miss('Immagini', 'src/config/images.config.js', `${absent} foto di categorie e landing ancora in placeholder (hero + 3 per galleria)`);
}
if (!(company.certifications || []).length) miss('Elettrica / Disinfestazioni', 'company.certifications', 'Abilitazioni (es. DM 37/2008) e qualifiche: non vengono citate finché non confermate');

/* ------------------------------------------------------------ utility */
const write = async (rel, content) => {
  const p = path.join(DIST, rel);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content);
};
const copyDir = async (from, to) => {
  await fs.mkdir(to, { recursive: true });
  for (const e of await fs.readdir(from, { withFileTypes: true })) {
    const s = path.join(from, e.name);
    const d = path.join(to, e.name);
    if (e.isDirectory()) await copyDir(s, d);
    else if (!e.name.startsWith('.')) await fs.copyFile(s, d);
  }
};
const minifyCss = (css) =>
  css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();

/* ------------------------------------------------------------ build */
const t0 = Date.now();
await fs.rm(DIST, { recursive: true, force: true });
await fs.mkdir(DIST, { recursive: true });

// Asset statici
await copyDir(path.join(SRC, 'assets'), path.join(DIST, 'assets'));
await write('assets/css/main.css', minifyCss(await fs.readFile(path.join(SRC, 'styles/main.css'), 'utf8')));
await write('assets/js/main.js', await fs.readFile(path.join(SRC, 'scripts/main.js'), 'utf8'));
await copyDir(path.join(SRC, 'scripts/app'), path.join(DIST, 'assets/js/app'));
// Prompt 5: regole condivise della centrale operativa (senza dipendenze) e stile della console
await write('assets/js/lib/operations.js', await fs.readFile(path.join(SRC, 'lib/operations.js'), 'utf8'));
await write('assets/css/ops.css', minifyCss(await fs.readFile(path.join(SRC, 'styles/ops.css'), 'utf8')));
// Prompt 6: widget PRONTO AI (scaricato solo al clic) con catalogo reale dei servizi e contatti configurati
{
  const { phoneHref, whatsappHref } = await import('../src/components/utils.js');
  const catalog = {
    categories: categories.map((c) => ({ id: c.slug, name: c.name })),
    services: categories.flatMap((c) => c.subcategories.map((s) => ({ id: `${c.slug}/${s.slug}`, name: s.name }))),
    contacts: { phone: phoneHref(), whatsapp: whatsappHref() },
    privacyUrl: forms.privacyPolicyUrl || '/privacy/'
  };
  const widget = (await fs.readFile(path.join(SRC, 'scripts/ai-widget.js'), 'utf8'))
    .replace(/\/\*__AI_CATALOG__\*\/[^\n]*\n/, `/*__AI_CATALOG__*/ ${JSON.stringify(catalog).replace(/</g, '\\u003c')};\n`);
  if (!widget.includes('"categories":[{')) throw new Error('Catalogo del widget PRONTO AI non inserito');
  await write('assets/js/ai-widget.js', widget);
  await write('assets/css/ai-widget.css', minifyCss(await fs.readFile(path.join(SRC, 'styles/ai-widget.css'), 'utf8')));
}
await write('assets/logo.svg', logoSvgFile());
await write('assets/favicon.svg', faviconSvg());

// Placeholder fotografici
const ph = [
  ['hero', 1920, 1080, 'wrench', 'Tecnico al lavoro', 'blue', true],
  ['leak', 900, 1100, 'thermo', 'Ricerca perdite con termocamera', 'orange'],
  ['owner', 800, 960, 'user', 'Foto del titolare'],
  ...categories.map((c) => [`cat-${c.slug}`, 1600, 900, c.icon, c.name])
];
for (const [key, w, h, iconName, subject, tone, minimal] of ph) {
  await write(`assets/images/placeholder/${key}.svg`, placeholderSvg({ w, h, iconName, subject, tone, minimal }));
}

// Pagine
const { default: home } = await import('../src/pages/home.js');
const { default: categoryPages } = await import('../src/pages/category.js');
const { privacyPage, notFoundPage, statusPage, cookiePolicyPage } = await import('../src/pages/misc.js');

const { default: landingPages } = await import('../src/pages/landing.js');
const { validateContent } = await import('../src/data/content/index.js');

const contentErrors = validateContent();
if (contentErrors.length) {
  console.error('✖ Contenuti incompleti:\n  ' + contentErrors.join('\n  '));
  process.exit(1);
}

const { familyPage, protectedWorkPage, legalDraftPages } = await import('../src/pages/pronto-plus.js');
const { default: appPages } = await import('../src/pages/app.js');
const { default: businessPages } = await import('../src/pages/business.js');

// Prompt 7 — PRONTO SEO: zone confermate dalla dashboard (se Supabase è configurato), guide, indice servizi
{
  const { backend } = await import('../src/config/site.config.js');
  const { setZonesFromDatabase } = await import('../src/data/seo/zones.js');
  if (backend.supabaseUrl && backend.supabaseAnonKey && !backend.supabaseUrl.includes('.test')) {
    try {
      const r = await fetch(`${backend.supabaseUrl}/rest/v1/rpc/public_service_zones`, { method: 'POST', headers: { apikey: backend.supabaseAnonKey, Authorization: `Bearer ${backend.supabaseAnonKey}`, 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(8000) });
      if (r.ok) setZonesFromDatabase(await r.json());
      else miss('PRONTO SEO', 'public_service_zones', `Zone operative non lette dal database (HTTP ${r.status}): uso del file locale`);
    } catch { miss('PRONTO SEO', 'public_service_zones', 'Zone operative non lette dal database: uso del file locale'); }
  }
  const { activeZones } = await import('../src/data/seo/zones.js');
  if (!activeZones().length) miss('PRONTO SEO', 'Zone operative', 'Nessuna zona confermata dal titolare: /zone-operative/ non viene pubblicata');
  const { validateGuides, guides, isPublishable } = await import('../src/data/guides/index.js');
  const ge = validateGuides();
  if (ge.length) { console.error('✖ Guide non valide:\n  ' + ge.join('\n  ')); process.exit(1); }
  const drafts = guides.filter((g) => !isPublishable(g)).length;
  if (drafts) miss('PRONTO SEO', 'src/data/guides', `${drafts} guide in bozza: pubblicate solo dopo revisione e approvazione`);
  if (!process.env.PUBLIC_GA4_MEASUREMENT_ID) miss('PRONTO SEO', 'PUBLIC_GA4_MEASUREMENT_ID', 'Google Analytics 4 non configurato (si attiva solo con il consenso dell’utente)');
  if (!process.env.GSC_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_OAUTH_CLIENT_ID) miss('PRONTO SEO', 'GSC_SERVICE_ACCOUNT_JSON / GOOGLE_OAUTH_*', 'Search Console non collegata: nessun dato di ricerca');
}
const { servicesHubPage, zonePages, guidePages } = await import('../src/pages/seo-pages.js');
const { editorial } = await import('../src/data/seo/editorial.js');

const pages = [home(), servicesHubPage(), ...categoryPages(), ...landingPages(), familyPage(), protectedWorkPage(), ...businessPages(), ...zonePages(), ...guidePages(), ...appPages(), privacyPage(), notFoundPage()];
{ const { analytics } = await import('../src/config/site.config.js'); if (analytics.ga4Id) pages.push(cookiePolicyPage()); }
// ogni pagina pubblica dei servizi deve avere la propria scheda editoriale
{
  const noSheet = pages.filter((p) => (p.category || ['hub'].includes(p.kind)) && !editorial[p.path]).map((p) => p.path);
  if (noSheet.length) { console.error('✖ Schede editoriali mancanti: ' + noSheet.join(', ')); process.exit(1); }
}
if (env !== 'production') pages.push(...(await legalDraftPages()));
if (env !== 'production') pages.push(statusPage());

for (const p of pages) {
  const file = p.file || path.join(p.path.replace(/^\//, ''), 'index.html');
  await write(file, p.html);
}

// Placeholder richiesti dalle pagine (registro dinamico): hero e gallerie
for (const [key, spec] of ctx.placeholders) {
  await write(`assets/images/placeholder/${key}.svg`, placeholderSvg(spec));
}

// Sitemap: solo pagine pubbliche indicizzabili
const today = ctx.buildDate.slice(0, 10);
const sitemapPages = pages.filter((p) => !p.noindex && !p.devOnly);
await write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPages
  .map((p) => `  <url><loc>${new URL(p.path, site.siteUrl).href}</loc><lastmod>${editorial[p.path]?.lastReviewed || today}</lastmod></url>`)
  .join('\n')}
</urlset>
`
);

// robots.txt: blocca tutto finché non è produzione indicizzabile
await write(
  'robots.txt',
  ctx.indexable
    ? `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site.siteUrl).href}\n`
    : `# Anteprima di sviluppo — non indicizzare\nUser-agent: *\nDisallow: /\n`
);

// Redirect 301 (Prompt 7): solo verso pagine esistenti
{
  const { redirects } = await import('../src/data/seo/redirects.js');
  const known = new Set(pages.map((p) => p.path));
  const bad = redirects.filter(([, to]) => !known.has(to.split('#')[0]));
  if (bad.length) { console.error('✖ Redirect verso pagine inesistenti: ' + bad.map((r) => r.join(' ')).join(', ')); process.exit(1); }
  await write('_redirects', redirects.map(([from, to, code]) => `${from} ${to} ${code}`).join('\n') + '\n');
}

// Header Netlify aggiuntivo: X-Robots-Tag su tutte le anteprime
if (!ctx.indexable) await write('_headers', `/*\n  X-Robots-Tag: noindex, nofollow\n`);

/* ------------------------------------------------------------ audit SEO (Prompt 7) */
const walkFiles = async (dir, base = '') => (await Promise.all((await fs.readdir(dir, { withFileTypes: true })).map((e) =>
  e.isDirectory() ? walkFiles(path.join(dir, e.name), `${base}/${e.name}`) : [`${base}/${e.name}`]))).flat();
const { auditSite, auditMarkdown } = await import('../src/lib/seo/audit.js');
const audit = auditSite(
  pages.map((p) => ({ path: p.path, html: p.html, indexable: !p.noindex && !p.devOnly, kind: p.kind || (p.path === '/' ? 'home' : p.category ? 'service' : 'page') })),
  { siteUrl: site.siteUrl, production: ctx.indexable, sitemapXml: await fs.readFile(path.join(DIST, 'sitemap.xml'), 'utf8'),
    robotsTxt: await fs.readFile(path.join(DIST, 'robots.txt'), 'utf8'), assets: new Set(await walkFiles(DIST)) }
);
audit.env = env;
// dati per la dashboard /admin/seo/ (funzione seo-audit, solo amministratori): mai pubblicati in dist
if (!process.env.BUILD_OUT_DIR) {
  await fs.mkdir(path.join(root, 'netlify/generated'), { recursive: true });
  await fs.writeFile(path.join(root, 'netlify/generated/seo-audit.json'), JSON.stringify(audit));
} else {
  await fs.writeFile(path.join(DIST, 'seo-audit.json'), JSON.stringify(audit, null, 1));
  await fs.writeFile(path.join(DIST, 'seo-audit.md'), auditMarkdown(audit));
}

/* ------------------------------------------------------------ report */
const ms = Date.now() - t0;
console.log(`\n✔ Build completata in ${ms} ms  [ambiente: ${env} · indicizzabile: ${ctx.indexable ? 'sì' : `no — ${SIMULATE_INDEXABLE ? 'simulazione' : ctx.indexableReason}`}]`);
console.log(`  Pagine generate: ${pages.length} · placeholder: ${ctx.placeholders.size + 3 + categories.length}`);
for (const p of pages) console.log(`   · ${p.path}${p.devOnly ? '  (solo anteprima)' : ''}`);
console.log(`  Catalogo: ${categories.length} categorie · ${allSubcategories.length} sottocategorie`);
console.log(`  Audit SEO: ${audit.summary.publicPages} pagine pubbliche · ${audit.summary.errors} errori · ${audit.summary.warnings} avvisi`);
for (const i of [...audit.siteIssues, ...audit.pages.flatMap((p) => p.issues.map((x) => ({ ...x, message: `${p.path}: ${x.message}` })))].filter((i) => i.severity === 'error')) console.log(`   ✖ ${i.message}`);
console.log(`\n⚠ Configurazioni da completare prima della pubblicazione: ${ctx.missing.length}`);
for (const m of ctx.missing) console.log(`   - [${m.area}] ${m.key}: ${m.note}`);
console.log('');
// una build di produzione con errori SEO bloccanti non va pubblicata
if (env === 'production' && audit.summary.errors > 0) { console.error(`✖ Audit SEO: ${audit.summary.errors} errori bloccanti nella build di produzione`); process.exit(1); }
