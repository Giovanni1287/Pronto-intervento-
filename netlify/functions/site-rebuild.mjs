/**
 * POST /.netlify/functions/site-rebuild — ripubblica il sito dopo una modifica di dati aziendali,
 * flag, zone o listini (il sito è statico: i dati entrano nelle pagine alla build). Solo amministratori.
 * Usa il "build hook" di Netlify (NETLIFY_BUILD_HOOK_URL, segreto del server). Senza hook: 409.
 */
import { supabaseConfig, client, json, notConfigured, bearer } from '../lib/backend.mjs';
import { adminFromToken } from '../lib/integrations.mjs';

export default async function handler(req, _context, deps = {}) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const fetchImpl = deps.fetch || fetch;
  const api = client({ cfg, fetchImpl });
  const admin = await adminFromToken(api, bearer(req));
  if (!admin) return json(403, { error: 'forbidden' });
  const hook = env.NETLIFY_BUILD_HOOK_URL;
  if (!hook || !/^https:\/\/api\.netlify\.com\/build_hooks\/[a-z0-9]+$/i.test(hook)) {
    return json(409, { error: 'not_configured', message: 'Build hook non configurato: ripubblica dal pannello Netlify (Deploys → Trigger deploy).' });
  }
  const r = await fetchImpl(`${hook}?trigger_title=${encodeURIComponent('Aggiornamento dalla configurazione (' + (admin.full_name || 'amministratore') + ')')}`, { method: 'POST', body: '{}' }).catch((e) => ({ ok: false, status: 0, e }));
  if (cfg.serviceReady) await api.rpc('record_integration_check', { p_key: 'site_rebuild', p_ok: Boolean(r.ok), p_environment: env.APP_ENVIRONMENT || null, p_detail: { status: r.status }, p_by: admin.id }, api.serviceToken()).catch(() => null);
  return r.ok ? json(202, { ok: true, message: 'Nuova pubblicazione avviata: le pagine si aggiornano in 1–2 minuti.' }) : json(502, { error: 'hook_failed', message: `Netlify non ha accettato la richiesta (HTTP ${r.status})` });
}
