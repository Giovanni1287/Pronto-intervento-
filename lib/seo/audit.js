/**
 * PRONTO SEO — audit tecnico delle pagine generate (Prompt 7).
 * Funzioni pure: ricevono l'HTML già renderizzato (nessun JavaScript eseguito,
 * come lo vede un motore di ricerca) e restituiscono problemi classificati.
 * Usato da: build (report), test automatici, allarmi SEO, dashboard /admin/seo/.
 */

export const SEVERITY = { error: 3, warning: 2, info: 1 };

const ALLOWED_SCHEMA = new Set(['HomeAndConstructionBusiness', 'LocalBusiness', 'WebSite', 'BreadcrumbList', 'Service', 'FAQPage', 'OfferCatalog', 'Offer',
  'Product', 'Article', 'ItemList', 'WebPage', 'CollectionPage', 'Organization']);

const decode = (s) => String(s || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&nbsp;/g, ' ');
const text = (html) => decode(String(html || '').replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attr = (tag, name) => { const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i')); return m ? decode(m[2] ?? m[3]) : null; };
const meta = (html, key, by = 'name') => { const m = html.match(new RegExp(`<meta[^>]+${by}="${key}"[^>]*>`, 'i')); return m ? attr(m[0], 'content') : null; };

/** Estrae le informazioni SEO di una pagina. */
export function extract(html) {
  const head = (html.match(/<head>([\s\S]*?)<\/head>/i) || [])[1] || '';
  const main = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/i) || [])[1] || '';
  const headings = [...html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({ level: Number(m[1]), text: text(m[2]) }));
  const mainHeadings = [...main.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => ({ level: Number(m[1]), text: text(m[2]) }));
  const links = [...html.matchAll(/<a\s[^>]*href="([^"]*)"[^>]*>/gi)].map((m) => ({ href: decode(m[1]), rel: attr(m[0], 'rel') || '' }));
  const imgs = [...html.matchAll(/<img\s[^>]*>/gi)].map((m) => ({ src: attr(m[0], 'src'), alt: attr(m[0], 'alt'), width: attr(m[0], 'width'), height: attr(m[0], 'height'), loading: attr(m[0], 'loading') }));
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)].map((m) => { try { return JSON.parse(m[1]); } catch { return { __invalid: true }; } });
  const canonical = (head.match(/<link rel="canonical" href="([^"]*)"/i) || [])[1] || null;
  return {
    lang: (html.match(/<html[^>]*\slang="([^"]+)"/i) || [])[1] || null,
    title: text((head.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || ''),
    description: meta(head, 'description'),
    robots: meta(head, 'robots'),
    viewport: meta(head, 'viewport'),
    canonical,
    og: { title: meta(head, 'og:title', 'property'), description: meta(head, 'og:description', 'property'), url: meta(head, 'og:url', 'property'), image: meta(head, 'og:image', 'property') },
    headings, mainHeadings, links, imgs, ld,
    hasMain: /<main[\s>]/i.test(html), hasSkipLink: /class="skip-link"/.test(html), hasBreadcrumbNav: /<nav class="breadcrumb"/.test(html),
    words: text(main).split(' ').filter((w) => w.length > 1).length,
    mainText: text(main)
  };
}

const schemaTypes = (ld) => ld.flatMap((o) => [o['@type']].flat()).filter(Boolean);

/**
 * Audit di una pagina.
 * @param {object} p  { path, html, indexable (atteso), kind }
 * @param {object} site { siteUrl, pages: Set<string> percorsi esistenti, production: boolean }
 */
export function auditPage(p, site) {
  const x = extract(p.html);
  const issues = [];
  const add = (severity, code, message) => issues.push({ severity, code, message });
  const expectedCanonical = new URL(p.path, site.siteUrl).href;
  const isPublic = p.indexable;

  // --- metadati
  if (!x.title) add('error', 'title_missing', 'Meta title assente');
  else if (isPublic && x.title.length > 65) add('warning', 'title_long', `Meta title di ${x.title.length} caratteri: oltre ~65 può essere troncato`);
  else if (isPublic && x.title.length < 25) add('warning', 'title_short', `Meta title di ${x.title.length} caratteri: poco descrittivo`);
  if (!x.description) add(isPublic ? 'error' : 'info', 'description_missing', 'Meta description assente');
  else if (isPublic && x.description.length > 165) add('warning', 'description_long', `Meta description di ${x.description.length} caratteri (consigliati 120–160)`);
  else if (isPublic && x.description.length < 70) add('warning', 'description_short', `Meta description di ${x.description.length} caratteri: poco informativa`);
  if (!x.lang) add('error', 'lang_missing', 'Attributo lang assente');
  if (!x.viewport) add('error', 'viewport_missing', 'Meta viewport assente');

  // --- titoli
  const h1 = x.headings.filter((h) => h.level === 1);
  if (h1.length !== 1) add(isPublic ? 'error' : 'warning', 'h1_count', `H1 presenti: ${h1.length} (atteso 1)`);
  let prev = 1;
  for (const h of x.mainHeadings) {
    if (h.level > prev + 1) { add('warning', 'heading_skip', `Salto di livello H${prev} → H${h.level} ("${h.text.slice(0, 50)}")`); break; }
    prev = h.level;
  }
  if (x.headings.some((h) => !h.text)) add('warning', 'heading_empty', 'Titolo vuoto');

  // --- indicizzazione e canonical
  const noindex = /noindex/i.test(x.robots || '');
  if (isPublic && noindex && site.production) add('error', 'public_noindex', 'Pagina pubblica impostata noindex nella build di produzione');
  if (!isPublic && !noindex) add('error', 'private_indexable', 'Pagina riservata senza noindex');
  if (isPublic) {
    if (!x.canonical) add('error', 'canonical_missing', 'Canonical assente');
    else if (x.canonical !== expectedCanonical) add('error', 'canonical_mismatch', `Canonical ${x.canonical} diverso dall’URL atteso ${expectedCanonical}`);
    if (x.canonical && !x.canonical.startsWith('https://')) add('error', 'canonical_http', 'Canonical non HTTPS');
    if (!/\/$/.test(p.path)) add('warning', 'url_no_slash', 'URL senza slash finale (possibile duplicazione)');
    if (/[A-Z_ ]|\.html$/.test(p.path)) add('warning', 'url_not_clean', 'URL con maiuscole, underscore, spazi o .html');
  }

  // --- Open Graph
  if (isPublic) {
    if (!x.og.title || !x.og.description || !x.og.image) add('warning', 'og_incomplete', 'Open Graph incompleto (title, description, image)');
    if (x.og.url && x.canonical && x.og.url !== x.canonical) add('warning', 'og_url_mismatch', 'og:url diverso dal canonical');
  }

  // --- collegamenti interni
  const internal = x.links.filter((l) => l.href.startsWith('/') && !l.href.startsWith('//'));
  for (const l of internal) {
    const [pathPart] = l.href.split(/[?#]/);
    if (pathPart && !site.pages.has(pathPart) && !site.assets?.has(pathPart)) add('error', 'broken_link', `Collegamento interno non valido: ${l.href}`);
  }
  if (x.links.some((l) => /^http:\/\//.test(l.href))) add('warning', 'http_link', 'Collegamenti non HTTPS');

  // --- breadcrumb
  if (isPublic && p.path !== '/') {
    if (!x.hasBreadcrumbNav) add('warning', 'breadcrumb_missing', 'Breadcrumb visibile assente');
    if (!schemaTypes(x.ld).includes('BreadcrumbList')) add('warning', 'breadcrumb_schema_missing', 'BreadcrumbList JSON-LD assente');
  }

  // --- immagini
  x.imgs.forEach((img, i) => {
    if (img.alt === null) add('error', 'img_alt_missing', `Immagine senza attributo alt: ${img.src}`);
    if (!img.width || !img.height) add('warning', 'img_no_dimensions', `Immagine senza width/height (layout shift): ${img.src}`);
    if (i > 1 && img.loading !== 'lazy') add('info', 'img_not_lazy', `Immagine secondaria senza lazy loading: ${img.src}`);
  });

  // --- dati strutturati
  for (const o of x.ld) {
    if (o.__invalid) { add('error', 'jsonld_invalid', 'JSON-LD non valido'); continue; }
    if (o['@context'] !== 'https://schema.org') add('warning', 'jsonld_context', 'JSON-LD senza @context https://schema.org');
    for (const t of [o['@type']].flat()) if (t && !ALLOWED_SCHEMA.has(t)) add('info', 'jsonld_type', `Tipo schema.org non previsto: ${t}`);
    if (o['@type'] === 'FAQPage') {
      const missing = (o.mainEntity || []).filter((q) => !x.mainText.includes(text(q.name)));
      if (missing.length) add('error', 'faq_not_visible', `${missing.length} domande FAQ nel JSON-LD non visibili nella pagina`);
    }
    if (o.aggregateRating || o.review) add('error', 'schema_reviews', 'Recensioni o valutazioni nei dati strutturati: consentite solo se autentiche e visibili');
  }

  // --- accessibilità essenziale
  if (!x.hasMain) add('error', 'main_missing', 'Elemento <main> assente');
  if (!x.hasSkipLink) add('warning', 'skip_link_missing', 'Collegamento "Vai al contenuto" assente');

  // --- contenuto
  if (isPublic && p.kind !== 'home' && x.words < 300) add('warning', 'thin_content', `Contenuto principale breve (${x.words} parole)`);

  return {
    path: p.path, kind: p.kind || 'page', indexable: isPublic, title: x.title, description: x.description, h1: h1[0]?.text || null,
    canonical: x.canonical, robots: x.robots, words: x.words, schemaTypes: [...new Set(schemaTypes(x.ld))],
    internalLinks: [...new Set(internal.map((l) => l.href.split(/[?#]/)[0]).filter(Boolean))], images: x.imgs.length, issues
  };
}

/** Audit dell'intero sito: aggiunge controlli trasversali (duplicati, pagine orfane, sitemap). */
export function auditSite(pages, { siteUrl, production, sitemapXml = '', robotsTxt = '', assets = new Set() }) {
  const pathSet = new Set(pages.map((p) => p.path));
  const results = pages.map((p) => auditPage(p, { siteUrl, pages: pathSet, production, assets }));
  const pub = results.filter((r) => r.indexable);
  const dup = (key, code, label) => {
    const seen = new Map();
    for (const r of pub) if (r[key]) seen.set(r[key], [...(seen.get(r[key]) || []), r.path]);
    for (const [v, paths] of seen) if (paths.length > 1) for (const path of paths) results.find((r) => r.path === path).issues.push({ severity: 'error', code, message: `${label} duplicato con ${paths.filter((x) => x !== path).join(', ')}: "${v.slice(0, 70)}"` });
  };
  dup('title', 'title_duplicate', 'Meta title');
  dup('description', 'description_duplicate', 'Meta description');
  dup('h1', 'h1_duplicate', 'H1');
  // pagine orfane: nessun collegamento interno da altre pagine pubbliche
  const inbound = new Map(pub.map((r) => [r.path, 0]));
  for (const r of results) for (const l of r.internalLinks) if (inbound.has(l) && l !== r.path) inbound.set(l, inbound.get(l) + 1);
  for (const r of pub) {
    r.inbound = inbound.get(r.path);
    if (r.path !== '/' && r.inbound === 0) r.issues.push({ severity: 'warning', code: 'orphan_page', message: 'Nessun collegamento interno verso questa pagina' });
  }
  // sitemap
  const locs = [...sitemapXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const expected = pub.map((r) => new URL(r.path, siteUrl).href);
  const sitemap = {
    urls: locs.length,
    missing: expected.filter((u) => !locs.includes(u)),
    unexpected: locs.filter((u) => !expected.includes(u)),
    nonCanonical: locs.filter((u) => !u.startsWith(siteUrl))
  };
  const robots = { blocksAll: /Disallow:\s*\/\s*$/m.test(robotsTxt), sitemapDeclared: /Sitemap:\s*https:\/\//.test(robotsTxt) };
  const site = [];
  if (sitemap.missing.length) site.push({ severity: 'error', code: 'sitemap_missing_urls', message: `${sitemap.missing.length} pagine pubbliche assenti dalla sitemap` });
  if (sitemap.unexpected.length) site.push({ severity: 'error', code: 'sitemap_unexpected_urls', message: `${sitemap.unexpected.length} URL nella sitemap non pubbliche o non canoniche` });
  if (production && robots.blocksAll) site.push({ severity: 'error', code: 'robots_blocks_all', message: 'robots.txt blocca tutto il sito in produzione' });
  if (!production && !robots.blocksAll) site.push({ severity: 'error', code: 'preview_crawlable', message: 'Anteprima non bloccata in robots.txt' });
  if (production && !robots.sitemapDeclared) site.push({ severity: 'warning', code: 'robots_no_sitemap', message: 'robots.txt non dichiara la sitemap' });

  const all = [...site, ...results.flatMap((r) => r.issues)];
  const count = (s) => all.filter((i) => i.severity === s).length;
  return {
    generatedAt: new Date().toISOString(), siteUrl, production,
    summary: { pages: results.length, publicPages: pub.length, errors: count('error'), warnings: count('warning'), info: count('info') },
    sitemap, robots, siteIssues: site, pages: results
  };
}

/** Report Markdown dell'audit. */
export function auditMarkdown(a) {
  const rows = a.pages.filter((p) => p.issues.length).map((p) => p.issues.map((i) => `| \`${p.path}\` | ${i.severity} | ${i.code} | ${i.message.replace(/\|/g, '/')} |`).join('\n')).join('\n');
  return `# Audit SEO tecnico — ${a.production ? 'build di produzione' : 'anteprima'}

Generato: ${a.generatedAt} · ${a.siteUrl}

**${a.summary.pages} pagine (${a.summary.publicPages} pubbliche indicizzabili) · ${a.summary.errors} errori · ${a.summary.warnings} avvisi · ${a.summary.info} note**

Sitemap: ${a.sitemap.urls} URL · mancanti ${a.sitemap.missing.length} · non previste ${a.sitemap.unexpected.length}
robots.txt: ${a.robots.blocksAll ? 'blocca tutto (anteprima)' : 'consente la scansione'}${a.robots.sitemapDeclared ? ' · sitemap dichiarata' : ''}

${a.siteIssues.map((i) => `- **${i.severity}** ${i.message}`).join('\n')}

## Pagine pubbliche

| URL | Title | Caratteri | Description | H1 | Parole | Link in entrata | Schema |
|---|---|---|---|---|---|---|---|
${a.pages.filter((p) => p.indexable).map((p) => `| \`${p.path}\` | ${(p.title || '').replace(/\|/g, '/')} | ${(p.title || '').length} | ${(p.description || '').length} car. | ${(p.h1 || '').replace(/\|/g, '/')} | ${p.words} | ${p.inbound ?? '—'} | ${p.schemaTypes.join(', ')} |`).join('\n')}

## Problemi rilevati

| Pagina | Gravità | Codice | Dettaglio |
|---|---|---|---|
${rows || '| — | — | — | Nessun problema |'}
`;
}
