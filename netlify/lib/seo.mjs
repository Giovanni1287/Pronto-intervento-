/**
 * PRONTO SEO — logica server condivisa dalle funzioni (Prompt 7).
 * Sincronizzazione incrementale di Search Console, controlli del sito pubblicato,
 * importazione dell'audit della build. Nessun dato inventato: senza credenziali
 * o proprietà verificata le funzioni restituiscono "non configurato".
 */
import { searchAnalytics, inspectUrl, listSitemaps, groupByDate, accessTokenFor, GoogleError } from './google.mjs';

const DIMS = { page: 'page', query: 'query', device: 'device', country: 'country', branded: 'brandedClassification' };
export const isoDay = (d) => new Date(d).toISOString().slice(0, 10);
export const addDays = (day, n) => isoDay(new Date(`${day}T12:00:00Z`).getTime() + n * 864e5);

/**
 * Sincronizza un intervallo di giorni per una proprietà (date in fuso Pacifico come da API).
 * Per ogni tipo una sola query raggruppata per data (paginata), poi un inserimento per giorno.
 */
export async function syncProperty({ property, token, api, svc, from, to, fetchImpl = fetch, kinds = ['total', 'page', 'query', 'device', 'country', 'branded'] }) {
  const out = { property: property.domain, from, to, kinds: {}, notes: [] };
  for (const kind of kinds) {
    const dimensions = kind === 'total' ? ['date'] : ['date', DIMS[kind]];
    let res;
    try {
      res = await searchAnalytics(token, property.gscSiteUrl, { startDate: from, endDate: to, dimensions, type: 'web', dataState: 'all' }, { fetchImpl });
    } catch (e) {
      // la classificazione brand è disponibile solo per proprietà idonee: si registra la nota e si prosegue
      if (kind === 'branded' && e instanceof GoogleError && e.status === 400) { out.notes.push('Classificazione brand non disponibile per la proprietà'); continue; }
      throw e;
    }
    const byDate = groupByDate(res.rows, kind !== 'total');
    let n = 0;
    for (const [date, rows] of byDate) {
      const state = res.firstIncompleteDate && date >= res.firstIncompleteDate ? 'all' : 'final';
      n += await api.rpc('seo_ingest_rows', { p_property: property.id, p_kind: kind, p_date: date, p_rows: rows, p_data_state: state }, svc);
    }
    out.kinds[kind] = { rows: res.rows.length, days: byDate.size, stored: n, truncated: res.truncated };
    if (kind === 'branded' && !res.rows.length) out.notes.push('Nessuna riga brand/non brand: la proprietà potrebbe non essere idonea');
  }
  return out;
}

/** Ultimi giorni da aggiornare: Search Console consolida i dati con 2–3 giorni di ritardo. */
export function syncWindow(today, { days = 5, backfillDays = 0 } = {}) {
  const to = addDays(today, -1);
  return { from: addDays(to, -(Math.max(days, backfillDays) - 1)), to };
}

/** Proprietà attive con metodo di accesso configurato. */
export async function activeProperties(api, svc) {
  const rows = await api.select('seo_properties?active=eq.true&gsc_site_url=not.is.null&select=id,domain,gsc_site_url,auth_method', svc);
  return (rows || []).filter((p) => p.auth_method !== 'none').map((p) => ({ id: p.id, domain: p.domain, gscSiteUrl: p.gsc_site_url, authMethod: p.auth_method }));
}

export async function runSync({ api, svc, gcfg, fetchImpl = fetch, today = isoDay(Date.now()), propertyId = null, backfillDays = 0, manual = false }) {
  const props = (await activeProperties(api, svc)).filter((p) => !propertyId || p.id === propertyId);
  const results = [];
  for (const p of props) {
    const key = `gsc_daily:${p.id}:${today}${manual ? `:manual:${Date.now()}` : ''}`;
    const job = await api.rpc('seo_job_start', { p_job: backfillDays ? 'gsc_backfill' : 'gsc_daily', p_run_key: key, p_property: p.id }, svc);
    if (!job.run) { results.push({ property: p.domain, skipped: job.status }); continue; }
    try {
      const token = await accessTokenFor(p, { cfg: gcfg, api, svc, fetchImpl });
      const { from, to } = syncWindow(today, { backfillDays: Math.min(backfillDays, 480) });
      const r = await syncProperty({ property: p, token, api, svc, from, to, fetchImpl });
      await api.rpc('seo_job_finish', { p_id: job.id, p_ok: true, p_rows: Object.values(r.kinds).reduce((a, k) => a + k.rows, 0), p_error: null, p_result: r }, svc);
      results.push(r);
    } catch (e) {
      await api.rpc('seo_job_finish', { p_id: job.id, p_ok: false, p_rows: null, p_error: String(e.message || e).slice(0, 400), p_result: null }, svc);
      results.push({ property: p.domain, error: String(e.message || e).slice(0, 200) });
    }
  }
  return results;
}

/* ---------------------------------------------------------------- controlli del sito pubblicato */
const metaRobots = (html) => (html.match(/<meta name="robots" content="([^"]*)"/i) || [])[1] || '';
const canonicalOf = (html) => (html.match(/<link rel="canonical" href="([^"]*)"/i) || [])[1] || null;

/**
 * Verifica il sito pubblicato: HTTPS, robots.txt, sitemap, stato HTTP, canonical, noindex accidentali.
 * Usa solo richieste al proprio dominio (nessuna richiesta a Google).
 */
export async function liveCheck(siteUrl, { fetchImpl = fetch, maxPages = 80, timeoutMs = 8000 } = {}) {
  const issues = [];
  const add = (kind, severity, message, data = {}) => issues.push({ kind, severity, message, data });
  const get = async (u) => {
    try { const r = await fetchImpl(u, { redirect: 'manual', signal: AbortSignal.timeout(timeoutMs) }); return { status: r.status, location: r.headers.get('location'), text: r.status === 200 ? await r.text() : '' }; }
    catch (e) { return { status: 0, error: String(e.message || e) }; }
  };
  const base = new URL(siteUrl);
  if (base.protocol !== 'https:') add('https', 'critical', 'L’indirizzo del sito non usa HTTPS');
  const http = await get(`http://${base.host}/`);
  if (http.status && !(http.status >= 300 && http.status < 400 && String(http.location || '').startsWith('https://'))) add('https', 'warning', 'La versione http:// non reindirizza a https://');
  const robots = await get(new URL('/robots.txt', siteUrl).href);
  if (robots.status !== 200) add('sitemap', 'warning', `robots.txt non raggiungibile (HTTP ${robots.status})`);
  else if (/^Disallow:\s*\/\s*$/m.test(robots.text)) add('public_noindex', 'critical', 'robots.txt blocca l’intero sito pubblicato');
  const sm = await get(new URL('/sitemap.xml', siteUrl).href);
  if (sm.status !== 200) { add('sitemap', 'critical', `sitemap.xml non raggiungibile (HTTP ${sm.status})`); return { checked: 0, issues }; }
  const urls = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (!urls.length) add('sitemap', 'critical', 'sitemap.xml senza URL');
  let checked = 0;
  for (const u of urls.slice(0, maxPages)) {
    checked++;
    if (!u.startsWith(`https://${base.host}/`)) { add('canonical', 'warning', `URL della sitemap fuori dominio o non HTTPS: ${u}`); continue; }
    const r = await get(u);
    if (r.status !== 200) { add('page_error', r.status >= 500 || r.status === 0 ? 'critical' : 'warning', `${u} risponde HTTP ${r.status || 'non raggiungibile'}`, { url: u, status: r.status }); continue; }
    if (/noindex/i.test(metaRobots(r.text))) add('public_noindex', 'critical', `Pagina in sitemap impostata noindex: ${u}`, { url: u });
    const c = canonicalOf(r.text);
    if (c !== u) add('canonical', 'warning', `Canonical di ${u} diverso dall’URL (${c || 'assente'})`, { url: u, canonical: c });
  }
  if (urls.length > maxPages) add('sitemap', 'info', `Controllate ${maxPages} pagine su ${urls.length}`);
  return { checked, issues };
}

/** Ispezione URL (quota limitata: poche pagine per esecuzione). */
export async function inspectPages({ property, token, api, svc, paths, siteBase, fetchImpl = fetch, max = 30 }) {
  let n = 0;
  for (const path of paths.slice(0, max)) {
    const r = await inspectUrl(token, property.gscSiteUrl, new URL(path, siteBase).href, { fetchImpl });
    const ix = r.inspectionResult?.indexStatusResult || {};
    await api.rpc('seo_record_index_status', { p_property: property.id, p_path: path, p: { verdict: ix.verdict, coverageState: ix.coverageState,
      googleCanonical: ix.googleCanonical, lastCrawlTime: ix.lastCrawlTime } }, svc);
    n++;
  }
  return n;
}

/** Stato delle sitemap inviate a Search Console: errori e avvisi diventano segnalazioni. */
export async function sitemapStatus({ property, token, fetchImpl = fetch }) {
  const r = await listSitemaps(token, property.gscSiteUrl, { fetchImpl });
  return (r.sitemap || []).map((s) => ({ path: s.path, errors: Number(s.errors || 0), warnings: Number(s.warnings || 0), lastDownloaded: s.lastDownloaded, isPending: s.isPending }));
}
