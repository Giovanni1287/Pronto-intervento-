/**
 * Sincronizzazione Search Console (Prompt 7).
 * - Pianificata ogni giorno: ultimi giorni (dati consolidati con ritardo di 2–3 giorni).
 * - Manuale (POST, solo amministratore): { propertyId?, backfillDays? ≤ 480 } per lo storico.
 * Job idempotenti per giorno, tentativi limitati, valutazione degli allarmi a fine esecuzione.
 * Senza credenziali Google o proprietà attiva non viene chiamato nulla.
 */
import { supabaseConfig, client, json, notConfigured, bearer } from '../lib/backend.mjs';
import { googleConfig } from '../lib/google.mjs';
import { runSync } from '../lib/seo.mjs';

export const config = { schedule: '20 4 * * *' };

export default async function handler(req, _context, deps = {}) {
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.serviceReady) return notConfigured('Backend Supabase');
  const gcfg = googleConfig(env);
  if (!gcfg.ready) return notConfigured('Accesso a Google Search Console');
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  const svc = api.serviceToken();
  let manual = false; let body = {};
  // invocazione manuale dalla dashboard: serve un amministratore con seo.manage
  if (req.method === 'POST' && bearer(req)) {
    try {
      const st = await api.rpc('seo_admin_state', {}, bearer(req));
      if (!st?.permissions?.manage) return json(403, { error: 'forbidden' });
    } catch { return json(403, { error: 'forbidden' }); }
    body = await req.json().catch(() => ({}));
    manual = true;
  } else if (req.method === 'POST') {
    // esecuzione pianificata (Netlify invia una POST con next_run nel corpo)
    body = {};
  }
  const results = await runSync({ api, svc, gcfg, fetchImpl: deps.fetch || fetch, today: deps.today, propertyId: body.propertyId || null,
    backfillDays: Math.min(Math.max(Number(body.backfillDays) || 0, 0), 480), manual });
  await api.rpc('seo_evaluate_alerts', {}, svc).catch(() => null);
  return json(200, { ok: true, results });
}
