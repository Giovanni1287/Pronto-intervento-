/**
 * Azioni server della dashboard PRONTO SEO (Prompt 7) — solo personale autorizzato.
 *  GET  ?audit=build              audit tecnico dell'ultima build (seo.view)
 *  GET  ?report=<id>              report PDF salvato (seo.view)
 *  GET  ?status=1                 stato delle integrazioni (nessuna chiave restituita)
 *  POST { action: 'import-audit' | 'live-check' | 'disconnect', propertyId? }   (seo.manage)
 */
import { supabaseConfig, client, json, notConfigured, bearer } from '../lib/backend.mjs';
import { googleConfig } from '../lib/google.mjs';
import { liveCheck, isoDay } from '../lib/seo.mjs';
import { loadBuildAudit } from './seo-monitor.mjs';
import { reportPdf } from '../../src/lib/seo/report.js';
import { providerConfig } from '../../src/lib/ai/providers.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, _context, deps = {}) {
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const token = bearer(req);
  if (!token) return json(401, { error: 'unauthorized' });
  const fetchImpl = deps.fetch || fetch;
  const api = client({ cfg, fetchImpl });
  let state;
  try { state = await api.rpc('seo_admin_state', {}, token); } catch (e) { return json(e.status === 403 ? 403 : 502, { error: e.status === 403 ? 'forbidden' : 'backend_unavailable' }); }
  const u = new URL(req.url);

  if (req.method === 'GET') {
    if (u.searchParams.get('audit') === 'build') {
      const audit = await loadBuildAudit(deps);
      return audit ? json(200, audit) : json(404, { error: 'audit_not_available', message: 'Audit della build non disponibile in questo ambiente.' });
    }
    if (u.searchParams.get('report')) {
      const id = u.searchParams.get('report');
      if (!UUID.test(id)) return json(400, { error: 'bad_request' });
      const rows = await api.select(`seo_reports?id=eq.${id}&select=*,property:seo_properties(domain)`, token);
      if (!rows?.length) return json(404, { error: 'not_found' });
      const bytes = await reportPdf(rows[0], { domain: rows[0].property?.domain || '' });
      return new Response(bytes, { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="report-seo-${rows[0].kind}-${rows[0].period_from}.pdf"`, 'Cache-Control': 'no-store' } });
    }
    const g = googleConfig(env);
    const ai = providerConfig(env);
    return json(200, { integrations: {
      searchConsole: { serviceAccount: Boolean(g.serviceAccount), serviceAccountEmail: g.serviceAccount?.clientEmail || null, oauth: Boolean(g.oauth && g.tokenKey) },
      ga4: { configured: Boolean(env.PUBLIC_GA4_MEASUREMENT_ID || env.GA4_MEASUREMENT_ID) },
      gbpApi: { configured: Boolean(env.GBP_API_ENABLED === 'true') },
      notifications: { email: Boolean(env.RESEND_API_KEY) },
      deployWebhook: { configured: Boolean(env.NETLIFY_WEBHOOK_SECRET) },
      ai: { configured: ai.ready }
    } });
  }

  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  if (!state?.permissions?.manage) return json(403, { error: 'forbidden' });
  if (!cfg.serviceReady) return notConfigured('Service role');
  const svc = api.serviceToken();
  const body = await req.json().catch(() => ({}));
  if (body.action === 'import-audit') {
    const audit = await loadBuildAudit(deps);
    if (!audit) return json(404, { error: 'audit_not_available' });
    return json(200, await api.rpc('seo_ingest_audit', { p_property: null, p_source: 'build', p: audit }, svc));
  }
  if (body.action === 'live-check') {
    const s = (await api.select('seo_settings?id=eq.1&select=live_site_url', svc))?.[0];
    if (!s?.live_site_url) return json(409, { error: 'no_live_site', message: 'Imposta prima l’indirizzo del sito pubblicato.' });
    const r = await liveCheck(s.live_site_url, { fetchImpl });
    const today = isoDay(Date.now());
    for (const i of r.issues) await api.rpc('seo_raise_alert', { p_property: null, p_kind: i.kind, p_severity: i.severity, p_message: i.message, p_data: i.data, p_dedupe: `live:${i.kind}:${i.data.url || i.message}:${today}` }, svc);
    return json(200, r);
  }
  if (body.action === 'disconnect') {
    if (!UUID.test(body.propertyId || '')) return json(400, { error: 'bad_request' });
    await api.remove(`seo_oauth_tokens?property_id=eq.${body.propertyId}`, svc);
    await api.update(`seo_properties?id=eq.${body.propertyId}`, { auth_method: 'none', active: false }, svc);
    return json(200, { ok: true });
  }
  return json(400, { error: 'unknown_action' });
}
