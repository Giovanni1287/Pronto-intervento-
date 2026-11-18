/**
 * Funzione pianificata (Netlify Scheduled Function, ogni ora): automazioni di PRONTO AI.
 * La logica è nel database (ai_run_due_automations): esecuzioni idempotenti per periodo,
 * nessuna sovrapposizione, tentativi limitati con attesa crescente, stato e registro dei
 * job, avvisi agli amministratori in caso di errore, scadenza delle proposte e
 * cancellazione delle conversazioni oltre il periodo di conservazione.
 * Le automazioni NON chiamano il modello AI e non inviano comunicazioni commerciali.
 */
import { supabaseConfig, client } from '../lib/backend.mjs';

export const config = { schedule: '@hourly' };

export default async function handler(_req, _context, deps = {}) {
  const cfg = supabaseConfig(deps.env || process.env);
  if (!cfg.serviceReady) return new Response('NOT CONFIGURED', { status: 503 });
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  try {
    const res = await api.rpc('ai_run_due_automations', {}, api.serviceToken());
    return new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err.message || err).slice(0, 200) }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  }
}
