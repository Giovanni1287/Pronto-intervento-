/**
 * Monitoraggio PRONTO SEO (Prompt 7) — funzione pianificata giornaliera.
 *  1. importa l'audit tecnico della build pubblicata (netlify/generated/seo-audit.json);
 *  2. controlla il sito pubblicato (se seo_settings.live_site_url è impostato): HTTPS,
 *     robots, sitemap, stato delle pagine, canonical, noindex accidentali;
 *  3. stato delle sitemap e ispezione URL in Search Console (se collegata; quota limitata);
 *  4. report settimanale (lunedì) e mensile (giorno 1), preparazione richieste di recensione;
 *  5. valutazione degli allarmi con le soglie configurate.
 * Ogni passo è indipendente: un errore non blocca gli altri e viene registrato.
 */
import { readFile } from 'node:fs/promises';
import { supabaseConfig, client, json, notConfigured } from '../lib/backend.mjs';
import { googleConfig, accessTokenFor } from '../lib/google.mjs';
import { liveCheck, inspectPages, sitemapStatus, activeProperties, isoDay } from '../lib/seo.mjs';

export const config = { schedule: '50 4 * * *' };

export async function loadBuildAudit(deps = {}) {
  if (deps.audit) return deps.audit;
  for (const p of [new URL('../generated/seo-audit.json', import.meta.url), new URL('../../netlify/generated/seo-audit.json', import.meta.url)]) {
    try { return JSON.parse(await readFile(p, 'utf8')); } catch { /* prova il percorso successivo */ }
  }
  return null;
}

export default async function handler(_req, _context, deps = {}) {
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.serviceReady) return notConfigured('Backend Supabase');
  const fetchImpl = deps.fetch || fetch;
  const api = client({ cfg, fetchImpl });
  const svc = api.serviceToken();
  const today = deps.today || isoDay(Date.now());
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay();
  const steps = {};
  const step = async (name, fn) => { try { steps[name] = await fn(); } catch (e) { steps[name] = { error: String(e.message || e).slice(0, 200) }; } };

  await step('buildAudit', async () => {
    const audit = await loadBuildAudit(deps);
    if (!audit) return { skipped: 'audit della build non disponibile' };
    if (!audit.production) return { skipped: 'build non di produzione: audit non importato' };
    return api.rpc('seo_ingest_audit', { p_property: null, p_source: 'build', p: audit }, svc);
  });

  const settings = (await api.select('seo_settings?id=eq.1&select=live_site_url', svc).catch(() => []))?.[0] || {};
  await step('liveCheck', async () => {
    if (!settings.live_site_url) return { skipped: 'indirizzo del sito pubblicato non impostato' };
    const r = await liveCheck(settings.live_site_url, { fetchImpl });
    for (const i of r.issues) {
      await api.rpc('seo_raise_alert', { p_property: null, p_kind: i.kind, p_severity: i.severity, p_message: i.message, p_data: i.data, p_dedupe: `live:${i.kind}:${i.data.url || i.message}:${today}` }, svc);
    }
    return { checked: r.checked, issues: r.issues.length };
  });

  const gcfg = googleConfig(env);
  await step('searchConsole', async () => {
    if (!gcfg.ready) return { skipped: 'Search Console non collegata' };
    const out = [];
    for (const p of await activeProperties(api, svc)) {
      const token = await accessTokenFor(p, { cfg: gcfg, api, svc, fetchImpl });
      const sitemaps = await sitemapStatus({ property: p, token, fetchImpl });
      for (const s of sitemaps.filter((x) => x.errors > 0)) {
        await api.rpc('seo_raise_alert', { p_property: p.id, p_kind: 'sitemap', p_severity: 'critical', p_message: `Search Console segnala ${s.errors} errori nella sitemap ${s.path}`, p_data: s, p_dedupe: `gsc-sitemap:${p.id}:${s.path}:${today}` }, svc);
      }
      let inspected = 0;
      if (dow === 1) {
        // ispezione settimanale delle pagine pubbliche controllate da più tempo (quota API limitata)
        const pages = await api.select(`seo_pages?property_id=eq.${p.id}&indexable=eq.true&select=path&order=inspected_at.asc.nullsfirst&limit=30`, svc);
        inspected = await inspectPages({ property: p, token, api, svc, paths: pages.map((x) => x.path), siteBase: `https://${p.domain}/`, fetchImpl });
        const bad = await api.select(`seo_pages?property_id=eq.${p.id}&indexable=eq.true&index_verdict=eq.FAIL&select=path,coverage_state`, svc);
        for (const b of bad) await api.rpc('seo_raise_alert', { p_property: p.id, p_kind: 'gsc_change', p_severity: 'warning', p_message: `Pagina non indicizzata secondo Search Console: ${b.path} (${b.coverage_state || 'stato non indicato'})`, p_data: b, p_dedupe: `inspect:${p.id}:${b.path}:${today}` }, svc);
      }
      out.push({ property: p.domain, sitemaps: sitemaps.length, inspected });
    }
    return out;
  });

  await step('reports', async () => {
    const made = [];
    if (dow === 1) made.push(await api.rpc('seo_build_report', { p_kind: 'weekly', p_from: null, p_to: null, p_property: null }, svc));
    if (today.endsWith('-01')) made.push(await api.rpc('seo_build_report', { p_kind: 'monthly', p_from: null, p_to: null, p_property: null }, svc));
    return made;
  });
  await step('reviews', () => api.rpc('seo_prepare_review_requests', { p_days: 30 }, svc));
  await step('alerts', () => api.rpc('seo_evaluate_alerts', { p_today: today }, svc));
  return json(200, { ok: true, today, steps });
}
