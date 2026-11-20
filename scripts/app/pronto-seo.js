/**
 * PRONTO SEO — dashboard /admin/seo/ (Prompt 7).
 * Panoramica, Pagine, Ricerche, Google Maps, SEO AI, Conversioni, Report, Impostazioni.
 * Ogni numero arriva dal database (dati Search Console sincronizzati dal backend, gestionale)
 * con fonte, periodo e data di aggiornamento. Nessun dato dimostrativo: senza collegamento
 * a Google le sezioni lo dichiarano. Nessun token o chiave arriva al browser.
 */
import { h, fill, notice, boot, db, fn, dateTime, field, table, badge, euro } from './core.js';
import { opsBar, actBtn, options, flashIn } from './ops-common.js';
import { aiChatPanel } from './ai-chat-panel.js';

const root = document.getElementById('app');
let me; let restartFn; let st = null; let integ = null;
const S = { prop: null, from: '', to: '' };
const TABS = [['panoramica', 'Panoramica'], ['pagine', 'Pagine'], ['ricerche', 'Ricerche'], ['maps', 'Google Maps'], ['ai', 'SEO AI'], ['conversioni', 'Conversioni'], ['report', 'Report'], ['impostazioni', 'Impostazioni']];
const num = (n, d = 0) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('it-IT', { maximumFractionDigits: d, minimumFractionDigits: d }));
const pct = (r) => (r === null || r === undefined ? '—' : `${num(Number(r) * 100, 2)}%`);
const delta = (a, b, invert = false) => {
  if (b === null || b === undefined || !Number(b)) return null;
  const v = ((Number(a) - Number(b)) / Number(b)) * 100;
  const good = invert ? v < 0 : v > 0;
  return h('span', { class: `seo-delta ${Math.abs(v) < 0.5 ? '' : good ? 'is-up' : 'is-down'}` }, `${v >= 0 ? '+' : ''}${num(v, 1)}%`);
};
const src = (text, when) => h('p', { class: 'seo-src' }, h('b', {}, 'Fonte: '), text, when ? ` · aggiornamento: ${when}` : '');
const query = () => `p_property=${S.prop}`;
const range = () => ({ p_property: S.prop, p_from: S.from || null, p_to: S.to || null });

function csvDownload(name, rows, cols) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const text = [cols.map((c) => esc(c[0])).join(';'), ...rows.map((r) => cols.map((c) => esc(typeof c[1] === 'function' ? c[1](r) : r[c[1]])).join(';'))].join('\r\n');
  const a = h('a', { href: URL.createObjectURL(new Blob(['﻿', text], { type: 'text/csv;charset=utf-8' })), download: name });
  document.body.append(a); a.click(); a.remove();
}
const csvBtn = (name, rows, cols) => h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: () => csvDownload(name, rows, cols), disabled: !rows?.length }, 'Esporta CSV');

/** Grafico a barre dei clic giornalieri (SVG, nessuna libreria). */
function trendChart(trend) {
  if (!trend?.length) return null;
  const W = 720; const H = 160; const max = Math.max(...trend.map((t) => Number(t.clicks)), 1); const bw = W / trend.length;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H + 18}`); svg.setAttribute('class', 'seo-chart'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', `Clic giornalieri dal ${trend[0].date} al ${trend.at(-1).date}`);
  trend.forEach((t, i) => {
    const r = document.createElementNS(svg.namespaceURI, 'rect');
    const hgt = Math.max(1, (Number(t.clicks) / max) * H);
    r.setAttribute('x', String(i * bw + 1)); r.setAttribute('y', String(H - hgt)); r.setAttribute('width', String(Math.max(1, bw - 2))); r.setAttribute('height', String(hgt));
    r.setAttribute('class', t.state === 'all' ? 'is-partial' : '');
    const title = document.createElementNS(svg.namespaceURI, 'title'); title.textContent = `${t.date}: ${t.clicks} clic, ${t.impressions} impressioni${t.state === 'all' ? ' (dato provvisorio)' : ''}`;
    r.append(title); svg.append(r);
  });
  [trend[0].date, trend.at(-1).date].forEach((d, i) => { const t = document.createElementNS(svg.namespaceURI, 'text'); t.setAttribute('x', i ? String(W) : '0'); t.setAttribute('y', String(H + 15)); t.setAttribute('text-anchor', i ? 'end' : 'start'); t.textContent = d; svg.append(t); });
  return h('figure', { class: 'seo-chartwrap' }, svg, h('figcaption', {}, 'Clic giornalieri (barre chiare: dati provvisori)'));
}

const kpi = (label, value, d, hint) => h('div', { class: 'ops-kpi seo-kpi' }, h('span', { class: 'ops-kpi__label' }, label), h('strong', {}, value), d, hint ? h('small', {}, hint) : null);

/* ================================================================ struttura */
async function render() {
  st = await db.rpc('seo_admin_state');
  integ = await fn('seo-admin', { query: '?status=1' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  S.prop ||= st.properties.find((p) => p.managedHere)?.id || st.properties[0]?.id;
  const tab = TABS.some(([id]) => id === location.hash.slice(1).split('?')[0]) ? location.hash.slice(1).split('?')[0] : 'panoramica';
  const prop = st.properties.find((p) => p.id === S.prop);
  const propSel = h('select', { 'aria-label': 'Proprietà Search Console', onchange: (e) => { S.prop = e.target.value; render(); } },
    options(st.properties.map((p) => [p.id, `${p.domain}${p.managedHere ? '' : ' (sito separato)'}`]), S.prop));
  const fromI = h('input', { type: 'date', value: S.from, 'aria-label': 'Dal' });
  const toI = h('input', { type: 'date', value: S.to, 'aria-label': 'Al' });
  const openAlerts = st.alerts.filter((a) => a.status === 'open').length;
  const body = h('div', { class: 'pai-body' }, h('p', { class: 'app-muted' }, 'Caricamento…'));
  fill(root, h('div', { class: 'ops-page pai seo' }, opsBar(me, restartFn),
    h('div', { class: 'pai-hero seo-hero' },
      h('div', {}, h('p', { class: 'eyebrow' }, 'Acquisizione clienti da Google'), h('h1', {}, 'PRONTO SEO'),
        h('p', { class: 'pai-hero__lead' }, 'Dati di ricerca, salute tecnica del sito, Google Business Profile e contatti generati. Nessuna promessa di posizionamento: solo dati verificabili e proposte da approvare.')),
      h('div', { class: 'pai-status' },
        h('b', {}, h('span', { class: `pai-dot pai-dot--${prop?.active && prop?.lastSyncAt ? 'on' : 'off'}`, 'aria-hidden': 'true' }), prop?.active ? 'Search Console collegata' : 'Search Console non collegata'),
        h('span', {}, `Ultima sincronizzazione: ${prop?.lastSyncAt ? dateTime(prop.lastSyncAt) : 'mai'}`),
        h('span', {}, `${openAlerts} segnalazioni aperte · ${st.recommendations.filter((r) => r.status === 'pending').length} proposte da valutare`))),
    h('div', { class: 'seo-toolbar' }, h('label', {}, 'Proprietà ', propSel), h('label', {}, 'Dal ', fromI), h('label', {}, 'Al ', toI),
      h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: () => { S.from = fromI.value; S.to = toI.value; render(); } }, 'Applica periodo'),
      S.from || S.to ? h('button', { type: 'button', class: 'aic-reset', onclick: () => { S.from = ''; S.to = ''; render(); } }, 'Ultimi 28 giorni disponibili') : null),
    h('nav', { class: 'pai-tabs', 'aria-label': 'Sezioni PRONTO SEO' }, TABS.filter(([id]) => id !== 'impostazioni' || st.permissions.manage).map(([id, label]) =>
      h('a', { href: `#${id}`, 'aria-current': id === tab ? 'page' : null }, label, id === 'impostazioni' && openAlerts ? h('span', { class: 'pai-count' }, String(openAlerts)) : null))),
    body));
  try { await VIEWS[tab](body, prop); } catch (e) { fill(body, notice('error', e.message)); }
}

const VIEWS = {};

/* ================================================================ PANORAMICA */
VIEWS.panoramica = async (body, prop) => {
  const o = await db.rpc('seo_overview', range());
  const c = o.current || {}; const p = o.prior || {};
  fill(body,
    !o.connected ? notice('info', `Nessun dato di Search Console per ${prop.domain}: la proprietà non è ancora collegata o sincronizzata. Le metriche di ricerca compariranno dopo la prima sincronizzazione (nessun dato dimostrativo).`) : null,
    h('div', { class: 'ops-kpis' },
      kpi('Clic organici', num(c.clicks), delta(c.clicks, p.clicks), `prima: ${num(p.clicks)}`),
      kpi('Impressioni', num(c.impressions), delta(c.impressions, p.impressions), `prima: ${num(p.impressions)}`),
      kpi('CTR', pct(c.ctr), delta(c.ctr, p.ctr), `prima: ${pct(p.ctr)}`),
      kpi('Posizione media', num(c.position, 1), delta(c.position, p.position, true), 'media ponderata, non un ranking fisso'),
      o.leads ? kpi('Lead organici attribuibili', num(o.leads.organic), null, `su ${num(o.leads.all)} richieste totali`) : null,
      o.leads ? kpi('Moduli completati', num(o.leads.formsCompleted), null, 'invii andati a buon fine') : null,
      kpi('Problemi tecnici', num(o.openIssues), null, 'errori aperti nell’audit'),
      kpi('Proposte da valutare', num(o.pendingRecommendations), null, 'SEO AI e regole')),
    src(`${o.source}. Periodo ${o.period.from} – ${o.period.to}, confronto con ${o.previous.from} – ${o.previous.to}`, o.dataUntil ? `dati fino al ${o.dataUntil}` : 'nessun dato'),
    o.branded?.available ? h('section', { class: 'app-card' }, h('h2', {}, 'Ricerche di marchio e non di marchio'),
      h('div', { class: 'ops-kpis' }, kpi('Di marchio (clic)', num(o.branded.branded.clicks), null, 'classificazione di Google'), kpi('Non di marchio (clic)', num(o.branded.nonBranded.clicks), null, 'nuovi clienti potenziali')),
      src('Search Analytics API, dimensione brandedClassification (solo proprietà idonee)')) : null,
    h('section', { class: 'app-card' }, h('h2', {}, 'Andamento'), trendChart(o.trend) || h('p', { class: 'app-muted' }, 'Nessun dato nel periodo.')),
    h('ul', { class: 'seo-notes' }, (o.notes || []).map((n) => h('li', {}, n))));
};

/* ================================================================ PAGINE */
VIEWS.pagine = async (body) => {
  const [r, audit] = await Promise.all([db.rpc('seo_pages_report', range()), fn('seo-admin', { query: '?audit=build' }).then((x) => (x.ok ? x.json() : null)).catch(() => null)]);
  const rows = r.rows || [];
  const onlyIssues = h('input', { type: 'checkbox', id: 'seo-only-issues' });
  const holder = h('div');
  const cols = [
    { label: 'URL', render: (x) => h('a', { href: x.path, target: '_blank', rel: 'noopener' }, x.path) },
    { label: 'Title', render: (x) => h('span', { title: x.title || '' }, `${(x.title || '—').slice(0, 50)} (${(x.title || '').length})`) },
    { label: 'Descr.', render: (x) => `${(x.description || '').length} car.` },
    { label: 'Parole', key: 'words' },
    { label: 'Indicizzabile', render: (x) => (x.indexable ? 'Sì' : 'No') },
    { label: 'Stato Google', render: (x) => (x.index?.verdict ? badge(x.index.coverage || x.index.verdict, x.index.verdict === 'PASS' ? 'ok' : 'warn') : h('span', { class: 'app-muted' }, 'non verificato')) },
    { label: 'Problemi', render: (x) => (x.issues.length ? h('span', { title: x.issues.map((i) => i.message).join('\n') }, badge(String(x.issues.length), x.issues.some((i) => i.severity === 'error') ? 'error' : 'warn')) : '—') },
    { label: 'Clic', render: (x) => num(x.perf?.clicks) }, { label: 'Impr.', render: (x) => num(x.perf?.impressions) }, { label: 'CTR', render: (x) => pct(x.perf?.ctr) }, { label: 'Pos.', render: (x) => num(x.perf?.position, 1) }
  ];
  const draw = () => fill(holder, table(cols, onlyIssues.checked ? rows.filter((x) => x.issues.length) : rows, { empty: 'Nessuna pagina registrata: importa l’audit della build.' }));
  onlyIssues.addEventListener('change', draw);
  const status = h('div');
  fill(body, status,
    audit ? h('section', { class: 'app-card' }, h('h2', {}, 'Audit tecnico dell’ultima build'),
      h('div', { class: 'ops-kpis' }, kpi('Pagine pubbliche', num(audit.summary.publicPages)), kpi('Errori', num(audit.summary.errors)), kpi('Avvisi', num(audit.summary.warnings)),
        kpi('URL in sitemap', num(audit.sitemap.urls), null, audit.sitemap.missing.length || audit.sitemap.unexpected.length ? 'differenze con le pagine pubbliche' : 'allineata')),
      src(`audit statico dell’HTML generato (${audit.production ? 'build di produzione' : 'anteprima, non indicizzabile'})`, dateTime(audit.generatedAt))) : notice('info', 'Audit della build non disponibile in questo ambiente.'),
    h('div', { class: 'ops-head' }, h('h2', {}, 'Pagine'), h('div', { class: 'pai-inline' },
      h('label', { class: 'pai-check', for: 'seo-only-issues' }, onlyIssues, ' Solo con problemi'),
      st.permissions.manage ? actBtn('Importa audit della build', async () => { const x = await fn('seo-admin', { method: 'POST', body: { action: 'import-audit' } }); if (!x.ok) throw new Error('Importazione non riuscita'); await VIEWS.pagine(body); }, { status }) : null,
      csvBtn('pagine-seo.csv', rows, [['URL', 'path'], ['Title', 'title'], ['Description', 'description'], ['Parole', 'words'], ['Keyword proposta', 'keyword'], ['Intento', 'intent'],
        ['Stato editoriale', 'editorialStatus'], ['Ultima revisione', 'lastReviewed'], ['Stato Google', (x) => x.index?.coverage || ''], ['Problemi', (x) => x.issues.map((i) => i.message).join(' | ')],
        ['Clic', (x) => x.perf?.clicks], ['Impressioni', (x) => x.perf?.impressions], ['CTR', (x) => x.perf?.ctr], ['Posizione', (x) => x.perf?.position]]))),
    holder,
    src(`audit della build e Search Console (prestazioni per pagina, periodo ${r.period.from} – ${r.period.to}; URL Inspection per lo stato di indicizzazione)`, r.dataUntil ? `dati fino al ${r.dataUntil}` : 'nessun dato di ricerca'));
  draw();
};

/* ================================================================ RICERCHE */
VIEWS.ricerche = async (body) => {
  const [q, dev, country] = await Promise.all([db.rpc('seo_queries_report', { ...range(), p_limit: 500 }), db.rpc('seo_breakdown', { ...range(), p_kind: 'device' }), db.rpc('seo_breakdown', { ...range(), p_kind: 'country' })]);
  const rows = q.rows || [];
  const brandSel = h('select', { 'aria-label': 'Filtro marchio' }, options([['all', 'Tutte le ricerche'], ['nb', 'Solo non di marchio'], ['b', 'Solo di marchio']], 'all'));
  const holder = h('div');
  const draw = () => fill(holder, table([
    { label: 'Ricerca', render: (x) => h('span', {}, x.query, x.branded ? badge('marchio', 'neutral') : null) },
    { label: 'Clic', render: (x) => h('span', {}, num(x.clicks), ' ', delta(x.clicks, x.prevClicks)) }, { label: 'Impressioni', render: (x) => h('span', {}, num(x.impressions), ' ', delta(x.impressions, x.prevImpressions)) },
    { label: 'CTR', render: (x) => pct(x.ctr) }, { label: 'Pos. media', render: (x) => h('span', {}, num(x.position, 1), x.prevPosition ? h('small', { class: 'app-muted' }, ` (prima ${num(x.prevPosition, 1)})`) : null) }
  ], rows.filter((x) => brandSel.value === 'all' || (brandSel.value === 'b') === x.branded), { empty: 'Nessuna ricerca nel periodo (o Search Console non collegata).' }));
  brandSel.addEventListener('change', draw);
  const bd = (title, r, labels = {}) => h('section', { class: 'app-card' }, h('h2', {}, title), table([{ label: '', render: (x) => labels[x.key] || x.key }, { label: 'Clic', render: (x) => num(x.clicks) },
    { label: 'Impressioni', render: (x) => num(x.impressions) }, { label: 'CTR', render: (x) => pct(x.ctr) }, { label: 'Pos.', render: (x) => num(x.position, 1) }], r.rows, { empty: 'Nessun dato.' }));
  fill(body, h('div', { class: 'ops-head' }, h('h2', {}, 'Ricerche'), h('div', { class: 'pai-inline' }, brandSel,
    csvBtn('ricerche.csv', rows, [['Ricerca', 'query'], ['Marchio', (x) => (x.branded ? 'sì' : 'no')], ['Clic', 'clicks'], ['Clic periodo prec.', 'prevClicks'], ['Impressioni', 'impressions'], ['Impressioni prec.', 'prevImpressions'], ['CTR', 'ctr'], ['Posizione', 'position'], ['Posizione prec.', 'prevPosition']]))),
  holder, src(`Search Console, periodo ${q.period.from} – ${q.period.to} confrontato con ${q.previous.from} – ${q.previous.to}. ${q.note}`, q.dataUntil ? `dati fino al ${q.dataUntil}` : 'nessun dato'),
  h('div', { class: 'pai-grid pai-grid--2' }, bd('Dispositivi', dev, { MOBILE: 'Smartphone', DESKTOP: 'Computer', TABLET: 'Tablet' }), bd('Paesi', country, { ita: 'Italia' })));
  draw();
};

/* ================================================================ GOOGLE MAPS */
const GBP_CHECK = [['name', 'Nome uguale a quello reale dell’attività (senza parole chiave)'], ['category', 'Categoria principale coerente con l’attività prevalente'], ['phone', 'Telefono uguale a quello del sito'],
  ['website', 'Sito web: https://prontointerventoroma.it'], ['hours', 'Orari reali (niente H24 se non confermato)'], ['area', 'Area servita (senza indirizzi fittizi)'], ['description', 'Descrizione con i servizi reali'],
  ['services', 'Servizi elencati come nel sito'], ['verified', 'Scheda verificata da Google']];
const PHOTO_CHECK = [['logo', 'Logo'], ['cover', 'Foto di copertina'], ['team', 'Titolare o squadra (con consenso)'], ['vehicle', 'Mezzi o attrezzature'], ['work', 'Lavori eseguiti (senza dati dei clienti)']];
VIEWS.maps = async (body) => {
  const g = await db.rpc('gbp_status');
  const p = g.profile; const manage = st.permissions.manage; const status = h('div');
  const inp = (k, v, attrs = {}) => h('input', { type: 'text', value: v || '', disabled: !manage, 'data-k': k, ...attrs });
  const f = { businessName: inp('businessName', p.business_name), primaryCategory: inp('primaryCategory', p.primary_category), phone: inp('phone', p.phone), website: inp('website', p.website),
    hours: inp('hours', p.hours), serviceArea: inp('serviceArea', p.service_area), profileUrl: inp('profileUrl', p.profile_url, { placeholder: 'https://…' }),
    reviewUrl: inp('reviewUrl', p.review_url, { placeholder: 'https://g.page/r/…/review' }) };
  const exists = h('input', { type: 'checkbox', checked: p.exists_confirmed, disabled: !manage });
  const checks = (list, data) => list.map(([k, label]) => h('label', { class: 'pai-check' }, h('input', { type: 'checkbox', checked: Boolean(data?.[k]), disabled: !manage, 'data-c': k }), ` ${label}`));
  const chk = h('div', { class: 'seo-checks' }, checks(GBP_CHECK, p.checklist));
  const ph = h('div', { class: 'seo-checks' }, checks(PHOTO_CHECK, p.photos_checklist));
  const opKind = h('select', {}, options([['info_update', 'Aggiornamento informazioni'], ['photo_upload', 'Caricamento foto'], ['post', 'Aggiornamento pubblicato'], ['review_reply', 'Risposta a recensione'], ['category_change', 'Modifica categoria'], ['verification', 'Verifica'], ['other', 'Altro']], 'info_update'));
  const opNote = h('textarea', { rows: 2, placeholder: 'Cosa è stato fatto sulla scheda (registrato con data e autore)' });
  fill(body, status,
    h('div', { class: 'pai-note' }, g.apiNote),
    g.warnings.map((w) => notice('warn', w)),
    h('div', { class: 'pai-grid' },
      h('section', { class: 'app-card' }, h('h2', {}, 'Scheda Google Business Profile'),
        h('div', { class: 'pai-budget__head' }, h('b', {}, `Completezza ${g.completenessPct}%`), p.profile_url ? h('a', { href: p.profile_url, target: '_blank', rel: 'noopener' }, 'Apri la scheda ufficiale') : h('span', { class: 'app-muted' }, 'link alla scheda non inserito')),
        h('div', { class: 'pai-meter' }, h('span', { class: 'pai-meter__fill', style: `width:${g.completenessPct}%` })),
        h('label', { class: 'pai-check' }, exists, ' Esistenza della scheda ufficiale verificata (nessuna nuova scheda viene creata da qui)'),
        h('div', { class: 'pai-form' }, field('Nome dell’attività', f.businessName), field('Categoria principale', f.primaryCategory), field('Telefono', f.phone), field('Sito web', f.website),
          field('Orari', f.hours), field('Area servita', f.serviceArea), field('Link alla scheda', f.profileUrl), field('Link ufficiale per le recensioni', f.reviewUrl)),
        h('h3', {}, 'Checklist della scheda'), chk, h('h3', {}, 'Checklist fotografica'), ph,
        manage ? actBtn('Salva', async () => {
          const pl = Object.fromEntries(Object.entries(f).map(([k, el]) => [k, el.value.trim()]));
          pl.existsConfirmed = exists.checked;
          pl.checklist = Object.fromEntries([...chk.querySelectorAll('[data-c]')].map((x) => [x.dataset.c, x.checked]));
          pl.photosChecklist = Object.fromEntries([...ph.querySelectorAll('[data-c]')].map((x) => [x.dataset.c, x.checked]));
          await db.rpc('gbp_update', { p: pl });
          await VIEWS.maps(body);
          flashIn(body, 'Scheda aggiornata nel registro interno (non su Google).');
        }, { cls: 'btn btn--primary btn--sm', status }) : null),
      h('aside', { class: 'app-card' }, h('h2', {}, 'Registro delle operazioni'),
        manage ? h('div', {}, field('Tipo', opKind), field('Nota', opNote), actBtn('Registra operazione', async () => { await db.rpc('gbp_log_operation', { p_kind: opKind.value, p_note: opNote.value }); await VIEWS.maps(body); }, { status })) : null,
        h('ul', { class: 'seo-ops' }, g.operations.map((o) => h('li', {}, h('b', {}, dateTime(o.at)), ` · ${o.by || ''}: ${o.note}`))))),
    h('section', { class: 'app-card' }, h('h2', {}, 'Metriche della scheda'),
      g.metrics.length ? table([{ label: 'Giorno', key: 'date' }, { label: 'Metrica', key: 'metric' }, { label: 'Valore', key: 'value' }], g.metrics)
        : h('p', { class: 'app-muted' }, `Non disponibili: l’accesso alle API Business Profile ${p.api_status === 'approved' ? 'è approvato ma non sono ancora stati letti dati' : 'non è stato approvato per il progetto Google Cloud'}. Le recensioni si consultano dalla scheda ufficiale.`),
      src('Business Profile Performance API (solo con accesso approvato) e registro interno delle operazioni')));
};

/* ================================================================ SEO AI */
const RECO = { title: 'Titolo', description: 'Descrizione', content: 'Contenuto', internal_link: 'Collegamenti interni', indexing: 'Indicizzazione', new_topic: 'Nuovo argomento', conversion_experiment: 'Esperimento di conversione', technical: 'Tecnico' };
const RST = { pending: ['Da valutare', 'warn'], approved: ['Approvata', 'ok'], rejected: ['Rifiutata', 'neutral'], applied: ['Applicata', 'ok'], expired: ['Scaduta', 'neutral'],
  draft: ['Bozza', 'warn'], in_review: ['In revisione', 'info'], published: ['Pubblicata', 'ok'] };
VIEWS.ai = async (body) => {
  const status = h('div'); const manage = st.permissions.manage;
  const reco = st.recommendations;
  const card = (r) => h('article', { class: `pai-action pai-action--${r.status === 'pending' ? 'pending' : r.status === 'rejected' ? 'rejected' : 'executed'}` },
    h('header', {}, h('div', {}, h('small', {}, `${r.number} · ${r.source === 'ai' ? 'proposta AI' : r.source === 'rule' ? 'regola automatica' : 'amministratore'}`), h('h3', {}, `${RECO[r.kind] || r.kind}${r.path ? ` · ${r.path}` : ''}`)), badge(...(RST[r.status] || [r.status, 'neutral']))),
    h('dl', { class: 'pai-dl' },
      r.current_value ? [h('dt', {}, 'Attuale'), h('dd', {}, r.current_value)] : null,
      r.proposed_value ? [h('dt', {}, 'Proposta'), h('dd', {}, h('b', {}, r.proposed_value), ['title', 'description'].includes(r.kind) ? h('small', { class: 'app-muted' }, ` (${r.proposed_value.length} caratteri)`) : null)] : null,
      h('dt', {}, 'Motivazione'), h('dd', {}, r.rationale),
      h('dt', {}, 'Dati di riferimento'), h('dd', {}, Object.keys(r.evidence || {}).length ? JSON.stringify(r.evidence) : 'non indicati'),
      r.decision_note ? [h('dt', {}, 'Esito'), h('dd', {}, r.decision_note)] : null),
    manage && r.status === 'pending' ? h('div', { class: 'pai-action__btns' },
      actBtn('Approva', async () => { await db.rpc('seo_decide_recommendation', { p_id: r.id, p_decision: 'approve', p_note: null }); await render(); }, { cls: 'btn btn--primary btn--sm', status }),
      actBtn('Rifiuta', async () => { await db.rpc('seo_decide_recommendation', { p_id: r.id, p_decision: 'reject', p_note: prompt('Motivo (facoltativo)') }); await render(); }, { status })) : null,
    manage && r.status === 'approved' ? h('div', { class: 'pai-action__btns' }, h('p', { class: 'app-muted' }, ['title', 'description'].includes(r.kind) ? 'Da applicare con «npm run seo:apply», poi verifica e pubblica.' : 'Da applicare manualmente ai contenuti.'),
      actBtn('Segna come applicata', async () => { await db.rpc('seo_decide_recommendation', { p_id: r.id, p_decision: 'applied', p_note: null }); await render(); }, { status })) : null);
  const draft = (d) => {
    const rev = h('input', { type: 'text', placeholder: 'Revisore (nome e ruolo)' });
    return h('article', { class: 'pai-action' },
      h('header', {}, h('div', {}, h('small', {}, `${d.kind} · v${d.version} · ${d.author_kind === 'ai' ? 'bozza AI' : 'redazione'}`), h('h3', {}, d.title)), badge(...(RST[d.status] || [d.status, 'neutral']))),
      d.body?.summary ? h('p', {}, d.body.summary) : null,
      (d.body?.sections || []).slice(0, 3).map((s) => h('p', { class: 'app-muted' }, h('b', {}, s.h), ' — ', (s.p || []).join(' ').slice(0, 220), '…')),
      d.body?.toVerify?.length ? h('p', { class: 'aic-small' }, `Da verificare: ${d.body.toVerify.join('; ')}`) : null,
      d.reviewer_name ? h('p', { class: 'app-muted' }, `Revisore: ${d.reviewer_name}`) : null,
      manage && ['draft', 'in_review'].includes(d.status) ? h('div', { class: 'pai-action__btns' }, rev,
        actBtn('Approva', async () => { await db.rpc('seo_review_draft', { p_id: d.id, p_decision: 'approve', p_reviewer_name: rev.value, p_note: null }); await render(); }, { cls: 'btn btn--primary btn--sm', status }),
        actBtn('Chiedi modifiche', async () => { await db.rpc('seo_review_draft', { p_id: d.id, p_decision: 'request_changes', p_reviewer_name: rev.value, p_note: prompt('Cosa modificare?') }); await render(); }, { status }),
        actBtn('Rifiuta', async () => { await db.rpc('seo_review_draft', { p_id: d.id, p_decision: 'reject', p_reviewer_name: rev.value, p_note: null }); await render(); }, { status })) : null);
  };
  fill(body, status,
    st.permissions.agent ? h('div', { class: 'pai-grid' }, h('div', { class: 'app-card pai-chatcard' }, aiChatPanel({ agent: 'seo',
      intro: 'Analizza i dati sincronizzati e l’audit; ogni proposta resta da approvare e nessuna pagina viene modificata dall’AI.',
      suggestions: ['Com’è andata la ricerca organica nelle ultime 4 settimane?', 'Quali landing hanno molte impressioni e CTR basso?', 'Quali pagine sono in calo?', 'Ci sono problemi tecnici o di indicizzazione?',
        'Quali landing generano più richieste?', 'Prepara il report settimanale', 'Proponi nuovi argomenti per le guide', 'Suggerisci un esperimento di conversione'] })),
      h('aside', { class: 'app-card pai-side' }, h('h2', {}, 'Regole del PRONTO SEO Agent'), h('ul', { class: 'pai-rules' },
        h('li', {}, 'Usa solo dati sincronizzati da Search Console, audit e gestionale, con periodo e fonte.'), h('li', {}, 'Non modifica né pubblica pagine: crea proposte e bozze.'),
        h('li', {}, 'Nessuna tecnica manipolativa, nessuno scraping dei risultati Google.'), h('li', {}, 'Nessuna promessa di posizioni o di comparsa nelle risposte AI di Google.')))) : null,
    h('h2', { class: 'pai-h2' }, `Proposte (${reco.filter((r) => r.status === 'pending').length} da valutare)`),
    reco.length ? h('div', { class: 'pai-actions' }, reco.map(card)) : h('p', { class: 'app-muted' }, 'Nessuna proposta.'),
    h('h2', { class: 'pai-h2' }, 'Bozze di contenuto'),
    st.drafts.length ? h('div', { class: 'pai-actions' }, st.drafts.map(draft)) : h('p', { class: 'app-muted' }, 'Nessuna bozza. Le 8 guide iniziali sono bozze nel repository (sezione /guide/, solo anteprima).'));
};

/* ================================================================ CONVERSIONI */
VIEWS.conversioni = async (body) => {
  const f = await db.rpc('seo_conversion_funnel', { p_from: S.from || null, p_to: S.to || null });
  const stages = [['Richieste registrate', f.stages.requests], ['Lead qualificati', f.stages.qualified], ['Preventivi accettati', f.stages.quoteAccepted], ['Clienti acquisiti', f.stages.customers], ['Pagamenti confermati', f.stages.paid]];
  const max = Math.max(1, ...stages.map((s) => s[1]));
  const SEG = { private: 'Privati', pronto_plus: 'PRONTO+', business: 'Business', hotel: 'Hotel', corporate: 'Corporate', condominium: 'Condomini' };
  const CH = { organic: 'Ricerca organica', paid: 'A pagamento', direct: 'Diretto', referral: 'Altri siti', social: 'Social', email: 'Email', ai_assistant: 'PRONTO AI', internal: 'Interno', unknown: 'Non rilevato' };
  fill(body,
    h('div', { class: 'ops-kpis' }, kpi('Clic su "Chiama"', num(f.clicks.phone), null, 'clic, non chiamate verificate'), kpi('Clic su WhatsApp', num(f.clicks.whatsapp), null, 'clic, non messaggi inviati'),
      kpi('Moduli inviati', num(f.clicks.formOk), null, `${num(f.clicks.formErrors)} invii non riusciti`)),
    h('section', { class: 'app-card' }, h('h2', {}, 'Dalle richieste ai pagamenti'),
      h('ol', { class: 'seo-funnel' }, stages.map(([l, v]) => h('li', {}, h('span', {}, l), h('span', { class: 'seo-funnel__bar', style: `--w:${(v / max) * 100}%` }), h('b', {}, num(v)))))),
    h('div', { class: 'pai-grid pai-grid--2' },
      h('section', { class: 'app-card' }, h('h2', {}, 'Canali'), table([{ label: 'Canale', render: (x) => CH[x[0]] || x[0] }, { label: 'Richieste', render: (x) => num(x[1]) }], Object.entries(f.byChannel || {}), { empty: 'Nessuna richiesta.' })),
      h('section', { class: 'app-card' }, h('h2', {}, 'Tipologia'), table([{ label: 'Segmento', render: (x) => SEG[x[0]] || x[0] }, { label: 'Richieste', render: (x) => num(x[1]) }], Object.entries(f.bySegment || {}), { empty: 'Nessuna richiesta.' }))),
    h('section', { class: 'app-card' }, h('div', { class: 'ops-head' }, h('h2', {}, 'Landing che generano richieste'),
      csvBtn('conversioni-landing.csv', f.byLanding, [['Pagina', 'path'], ['Richieste', 'requests'], ['Qualificate', 'qualified'], ['Clienti', 'customers'], ['Clic telefono', 'phoneClicks'], ['Incassato (cent)', 'paidCents']])),
      table([{ label: 'Pagina', key: 'path' }, { label: 'Richieste', key: 'requests' }, { label: 'Qualificate', key: 'qualified' }, { label: 'Clienti', key: 'customers' }, { label: 'Clic telefono', key: 'phoneClicks' },
        { label: 'Incassi collegati', render: (x) => (x.paidCents === null ? 'riservato' : euro(x.paidCents)) }], f.byLanding, { empty: 'Nessuna richiesta nel periodo.' })),
    src(`${f.sources.join(', ')} · periodo ${f.period.from} – ${f.period.to}`, dateTime(f.generatedAt)),
    h('ul', { class: 'seo-notes' }, f.notes.map((n) => h('li', {}, n))));
};

/* ================================================================ REPORT */
VIEWS.report = async (body) => {
  const status = h('div'); const manage = st.permissions.manage;
  const pdf = async (r) => {
    const res = await fn('seo-admin', { query: `?report=${r.id}` });
    if (!res.ok) throw new Error('PDF non disponibile: funzione di report non raggiungibile');
    const a = h('a', { href: URL.createObjectURL(await res.blob()), download: `report-seo-${r.kind}-${r.from}.pdf` }); document.body.append(a); a.click(); a.remove();
  };
  const csvReport = async (r) => {
    const rows = await db.select(`seo_reports?id=eq.${r.id}&select=data`);
    const q = rows[0]?.data?.topQueries || [];
    csvDownload(`report-${r.kind}-${r.from}-ricerche.csv`, q, [['Ricerca', 'query'], ['Clic', 'clicks'], ['Impressioni', 'impressions'], ['CTR', 'ctr'], ['Posizione', 'position']]);
  };
  fill(body, status,
    h('div', { class: 'ops-head' }, h('h2', {}, 'Report'), h('div', { class: 'pai-inline' },
      actBtn('Genera report settimanale', async () => { await db.rpc('seo_build_report', { p_kind: 'weekly', p_from: null, p_to: null, p_property: S.prop }); await render(); }, { status }),
      actBtn('Genera report mensile', async () => { await db.rpc('seo_build_report', { p_kind: 'monthly', p_from: null, p_to: null, p_property: S.prop }); await render(); }, { status }))),
    h('div', { class: 'pai-note' }, 'I report settimanali (lunedì) e mensili (giorno 1) si generano anche in automatico. Contengono solo dati salvati, con fonte e periodo.'),
    table([{ label: 'Tipo', render: (r) => (r.kind === 'weekly' ? 'Settimanale' : r.kind === 'monthly' ? 'Mensile' : 'Personalizzato') }, { label: 'Periodo', render: (r) => `${r.from} – ${r.to}` },
      { label: 'Creato', render: (r) => dateTime(r.createdAt) },
      { label: '', render: (r) => h('div', { class: 'pai-inline' }, actBtn('PDF', () => pdf(r), { status }), actBtn('CSV ricerche', () => csvReport(r), { status })) }], st.reports, { empty: 'Nessun report generato.' }),
    manage ? h('section', { class: 'app-card' }, h('h2', {}, 'Richieste di recensione'),
      h('p', { class: 'app-muted' }, 'Preparate per gli interventi conclusi con email disponibile: una sola richiesta per intervento, nessun sollecito, nessun vantaggio in cambio, nessun filtro sulla soddisfazione del cliente. Invio tramite il provider email configurato.'),
      table([{ label: 'Intervento', key: 'number' }, { label: 'Stato', render: (q) => badge(...({ prepared: ['Preparata', 'warn'], sent: ['Inviata', 'ok'], skipped: ['Saltata', 'neutral'], opted_out: ['Rinuncia', 'neutral'] }[q.status] || [q.status, 'neutral'])) },
        { label: 'Preparata', render: (q) => dateTime(q.preparedAt) }, { label: 'Inviata', render: (q) => dateTime(q.sentAt) },
        { label: '', render: (q) => (q.status === 'prepared' ? actBtn('Invia', async () => { await db.rpc('seo_send_review_request', { p_id: q.id }); await render(); }, { status }) : '') }], st.reviewRequests, { empty: 'Nessuna richiesta preparata.' })) : null);
};

/* ================================================================ IMPOSTAZIONI */
VIEWS.impostazioni = async (body) => {
  const status = h('div'); const s = st.settings;
  const oauthMsg = new URLSearchParams(location.hash.split('?')[1] || '').get('oauth');
  const props = st.properties.map((p) => {
    const site = h('input', { type: 'text', value: p.gscSiteUrl || '', placeholder: 'sc-domain:dominio.it oppure https://dominio.it/' });
    const method = h('select', {}, options([['none', 'Non collegata'], ['service_account', 'Service account'], ['oauth', 'Account Google (OAuth)']], p.authMethod));
    const brand = h('input', { type: 'text', value: (p.brandTerms || []).join(', ') });
    return h('article', { class: 'pai-rule' },
      h('div', {}, h('h3', {}, `${p.domain} ${p.managedHere ? '' : '· sito separato'}`), h('p', { class: 'app-muted' }, p.notes || ''),
        h('div', { class: 'pai-form' }, field('Proprietà Search Console', site), field('Accesso', method), field('Termini del marchio', brand, 'Separati da virgola'))),
      h('div', { class: 'pai-rule__ctl' }, p.active ? badge('Attiva', 'ok') : badge('Non attiva', 'neutral'), p.oauthConnected ? badge('OAuth collegato', 'ok') : null,
        actBtn('Salva', async () => { await db.rpc('seo_update_property', { p_id: p.id, p: { gscSiteUrl: site.value.trim(), authMethod: method.value, brandTerms: brand.value.split(',') } }); await render(); }, { status }),
        actBtn(p.active ? 'Disattiva' : 'Attiva', async () => { await db.rpc('seo_update_property', { p_id: p.id, p: { active: !p.active } }); await render(); }, { status }),
        integ?.integrations?.searchConsole?.oauth ? actBtn('Collega account Google', async () => { const r = await fn('seo-oauth', { query: `?action=start&property=${p.id}` }); if (!r.ok) throw new Error('OAuth non disponibile'); location.href = (await r.json()).url; }, { status }) : null,
        p.oauthConnected ? actBtn('Scollega', async () => { await fn('seo-admin', { method: 'POST', body: { action: 'disconnect', propertyId: p.id } }); await render(); }, { status }) : null));
  });
  const n = (k, v, min, max) => h('input', { type: 'number', value: String(v), min: String(min), max: String(max), 'data-k': k });
  const th = [n('clickDropPct', s.click_drop_pct, 5, 95), n('impressionsDropPct', s.impressions_drop_pct, 5, 95), n('minBaselineClicks', s.min_baseline_clicks, 0, 100000), n('compareDays', s.compare_days, 3, 56),
    n('formErrorRatioPct', s.form_error_ratio_pct, 1, 100), n('minFormEvents', s.min_form_events, 1, 1000), n('lowCtrMinImpressions', s.low_ctr_min_impressions, 10, 1000000), n('staleDataDays', s.stale_data_days, 2, 30)];
  const live = h('input', { type: 'url', value: s.live_site_url || '', placeholder: 'https://prontointerventoroma.it' });
  const reviews = h('input', { type: 'checkbox', checked: s.review_requests_enabled });
  const I = integ?.integrations || {};
  const yes = (b, t) => (b ? badge(t || 'Configurato', 'ok') : badge('Non configurato', 'neutral'));
  fill(body, status,
    oauthMsg ? notice(oauthMsg === 'ok' ? 'ok' : 'warn', oauthMsg === 'ok' ? 'Account Google collegato: il token è cifrato e non è visibile.' : `Collegamento non completato (${oauthMsg}).`) : null,
    h('section', { class: 'app-card' }, h('h2', {}, 'Integrazioni'),
      h('dl', { class: 'pai-dl' },
        h('dt', {}, 'Search Console (service account)'), h('dd', {}, yes(I.searchConsole?.serviceAccount), I.searchConsole?.serviceAccountEmail ? ` ${I.searchConsole.serviceAccountEmail} — da aggiungere come utente della proprietà` : ''),
        h('dt', {}, 'Search Console (OAuth)'), h('dd', {}, yes(I.searchConsole?.oauth)),
        h('dt', {}, 'Google Analytics 4'), h('dd', {}, yes(I.ga4?.configured, 'Configurato (attivo solo con consenso)')),
        h('dt', {}, 'API Business Profile'), h('dd', {}, yes(I.gbpApi?.configured, 'Abilitate')),
        h('dt', {}, 'Notifiche email'), h('dd', {}, yes(I.notifications?.email)),
        h('dt', {}, 'Allarme build Netlify'), h('dd', {}, yes(I.deployWebhook?.configured)),
        h('dt', {}, 'Provider AI'), h('dd', {}, yes(I.ai?.configured))),
      integ ? null : h('p', { class: 'app-muted' }, 'Stato delle funzioni server non disponibile in questo ambiente.'),
      h('div', { class: 'pai-inline' },
        actBtn('Sincronizza ora', async () => { const r = await fn('seo-sync', { method: 'POST', body: { propertyId: S.prop } }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.message || 'Sincronizzazione non disponibile'); flashIn(body, `Sincronizzazione eseguita: ${JSON.stringify(j.results).slice(0, 160)}`); }, { status }),
        actBtn('Controlla il sito pubblicato', async () => { const r = await fn('seo-admin', { method: 'POST', body: { action: 'live-check' } }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.message || 'Controllo non disponibile'); flashIn(body, `${j.checked} pagine controllate, ${j.issues.length} segnalazioni`); await render(); }, { status }))),
    h('h2', { class: 'pai-h2' }, 'Proprietà (ogni dominio separato, nessun dato consolidato)'), h('div', { class: 'pai-rules-list' }, props),
    h('section', { class: 'app-card' }, h('h2', {}, 'Zone operative'), h('p', { class: 'app-muted' }, 'Attiva solo le zone effettivamente servite. Le pagine pubbliche si aggiornano alla build successiva; una pagina dedicata richiede un contenuto distintivo approvato.'),
      table([{ label: 'Zona', key: 'name' }, { label: 'Stato', render: (z) => (z.active ? badge('Servita', 'ok') : badge('Non dichiarata', 'neutral')) },
        { label: '', render: (z) => actBtn(z.active ? 'Disattiva' : 'Attiva', async () => { await db.rpc('seo_set_zone', { p_slug: z.slug, p_active: !z.active, p_description: null, p_note: null, p_content: null, p_content_approved: null, p_meta_description: null }); await render(); }, { status }) }], st.zones)),
    h('section', { class: 'app-card' }, h('h2', {}, 'Soglie degli allarmi e controlli'),
      h('div', { class: 'pai-form' }, field('Calo clic (%)', th[0]), field('Calo impressioni (%)', th[1]), field('Clic minimi per confronto', th[2]), field('Giorni di confronto', th[3]),
        field('Moduli non riusciti (%)', th[4]), field('Eventi minimi moduli', th[5]), field('Impressioni minime per CTR basso', th[6]), field('Dati non aggiornati dopo (giorni)', th[7]), field('Sito pubblicato da controllare', live)),
      h('label', { class: 'pai-check' }, reviews, ' Prepara richieste di recensione per gli interventi conclusi (invio manuale)'),
      actBtn('Salva impostazioni', async () => { const p = Object.fromEntries(th.map((x) => [x.dataset.k, Number(x.value)])); p.liveSiteUrl = live.value.trim(); p.reviewRequestsEnabled = reviews.checked; await db.rpc('seo_update_settings', { p }); await render(); }, { cls: 'btn btn--primary btn--sm', status })),
    h('section', { class: 'app-card' }, h('h2', {}, 'Segnalazioni'),
      table([{ label: 'Quando', render: (a) => dateTime(a.created_at) }, { label: 'Gravità', render: (a) => badge(a.severity, a.severity === 'critical' ? 'error' : a.severity === 'warning' ? 'warn' : 'neutral') },
        { label: 'Messaggio', key: 'message' }, { label: 'Stato', key: 'status' },
        { label: '', render: (a) => (a.status === 'open' ? h('div', { class: 'pai-inline' }, actBtn('Presa visione', async () => { await db.rpc('seo_set_alert', { p_id: a.id, p_status: 'acknowledged' }); await render(); }, { status }),
          actBtn('Risolta', async () => { await db.rpc('seo_set_alert', { p_id: a.id, p_status: 'resolved' }); await render(); }, { status })) : '') }], st.alerts, { empty: 'Nessuna segnalazione.' })),
    h('section', { class: 'app-card' }, h('h2', {}, 'Esecuzioni programmate'),
      table([{ label: 'Job', key: 'job' }, { label: 'Chiave', key: 'run_key' }, { label: 'Stato', key: 'status' }, { label: 'Tentativi', key: 'attempts' }, { label: 'Righe', key: 'rows' },
        { label: 'Fine', render: (j) => dateTime(j.finished_at) }, { label: 'Errore', render: (j) => j.error || '' }], st.jobs, { empty: 'Nessuna esecuzione.' })));
};

if (root) {
  boot(root, {
    title: 'PRONTO SEO',
    requireRole: ['admin', 'operator'],
    render: async (ctx) => {
      me = ctx.profile; restartFn = ctx.restart;
      window.addEventListener('hashchange', () => render().catch((e) => fill(root, notice('error', e.message))));
      await render();
    }
  });
}
