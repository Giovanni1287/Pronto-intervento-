/**
 * Notifiche di deploy di Netlify → allarme "build non riuscita" (Prompt 7).
 * Configurazione: Netlify → Site configuration → Notifications → Deploy notifications →
 * HTTP POST request su "Deploy failed" verso /.netlify/functions/seo-deploy-hook,
 * con "JWS secret token" uguale a NETLIFY_WEBHOOK_SECRET. Le richieste senza firma
 * valida vengono rifiutate.
 */
import { supabaseConfig, client, json, notConfigured } from '../lib/backend.mjs';
import { verifyNetlifyJws } from '../lib/google.mjs';

export default async function handler(req, _context, deps = {}) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const env = deps.env || process.env;
  if (!env.NETLIFY_WEBHOOK_SECRET) return notConfigured('Webhook dei deploy (NETLIFY_WEBHOOK_SECRET)');
  const cfg = supabaseConfig(env);
  if (!cfg.serviceReady) return notConfigured('Backend Supabase');
  const raw = await req.text();
  if (!verifyNetlifyJws(req.headers.get('x-webhook-signature'), env.NETLIFY_WEBHOOK_SECRET, raw)) return json(401, { error: 'invalid_signature' });
  let d = {};
  try { d = JSON.parse(raw); } catch { return json(400, { error: 'bad_request' }); }
  if (d.state !== 'error') return json(200, { ignored: d.state || 'unknown' });
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  await api.rpc('seo_raise_alert', { p_property: null, p_kind: 'build_failed', p_severity: 'critical',
    p_message: `Build Netlify non riuscita (${d.context || 'contesto n/d'}, ramo ${d.branch || 'n/d'}): ${String(d.error_message || 'vedi il log del deploy').slice(0, 200)}`,
    p_data: { deployId: d.id, context: d.context, branch: d.branch }, p_dedupe: `build:${d.id || Date.now()}` }, api.serviceToken());
  return json(200, { ok: true });
}
