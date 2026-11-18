/**
 * GET /.netlify/functions/ai-status — stato di PRONTO AI per la console (/admin/pronto-ai/).
 * Solo personale autorizzato (il permesso è verificato da ai_admin_overview con il token
 * dell'utente). Indica se il provider è configurato e quale modello è impostato:
 * la chiave API non viene mai restituita.
 */
import { supabaseConfig, client, json, notConfigured, bearer } from '../lib/backend.mjs';
import { providerConfig } from '../../src/lib/ai/providers.js';

export default async function handler(req, _context, deps = {}) {
  if (req.method !== 'GET') return json(405, { error: 'method_not_allowed' });
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const token = bearer(req);
  if (!token) return json(401, { error: 'unauthorized' });
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  try {
    const overview = await api.rpc('ai_admin_overview', {}, token);
    const p = providerConfig(env);
    return json(200, { ...overview, provider: {
      configured: p.ready, name: p.provider || null, model: p.model || null, envKillSwitch: p.envKillSwitch,
      hashSaltConfigured: Boolean(env.AI_HASH_SALT), serviceRoleConfigured: cfg.serviceReady
    } });
  } catch (err) {
    return json(err.status === 403 ? 403 : 502, { error: err.status === 403 ? 'forbidden' : 'backend_unavailable' });
  }
}
