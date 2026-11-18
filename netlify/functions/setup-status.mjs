/**
 * GET /.netlify/functions/setup-status — stato per il wizard (/admin/setup/) e per /admin/lancio/ (Prompt 9).
 * Solo amministratori. Unisce lo stato del database (setup_db_status, con il token dell'utente) e quello
 * delle integrazioni (variabili presenti, ruoli delle chiavi, Auth e Storage di Supabase), senza segreti.
 */
import { supabaseConfig, client, json, notConfigured, bearer } from '../lib/backend.mjs';
import { integrationsStatus, adminFromToken } from '../lib/integrations.mjs';
import { buildSetupSteps, launchReadiness } from '../../src/lib/setup.js';
import { loadBuildAudit } from './seo-monitor.mjs';

export default async function handler(req, _context, deps = {}) {
  if (req.method !== 'GET') return json(405, { error: 'method_not_allowed' });
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const fetchImpl = deps.fetch || fetch;
  const api = client({ cfg, fetchImpl });
  const token = bearer(req);
  const admin = await adminFromToken(api, token);
  if (!admin) return json(403, { error: 'forbidden' });
  let db;
  try { db = await api.rpc('setup_db_status', {}, token); } catch (e) {
    return json(502, { error: 'backend_unavailable', message: `Stato del database non leggibile: ${e.status === 404 ? 'migrazione del Prompt 9 non applicata' : e.message}` });
  }
  const integ = await integrationsStatus({ env, cfg, api, fetchImpl, audit: await loadBuildAudit(deps) });
  return json(200, { db, integ, steps: buildSetupSteps({ db, integ }), readiness: launchReadiness({ db, integ }), generatedAt: new Date().toISOString() });
}
