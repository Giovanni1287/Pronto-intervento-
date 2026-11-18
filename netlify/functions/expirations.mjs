/**
 * Funzione pianificata giornaliera: scadenze e promemoria.
 * - consumer: RPC process_expirations (Family, Lavoro Protetto)
 * - B2B: RPC process_business_schedules (contratti scaduti, promemoria; mai rinnovi automatici)
 * - pagamenti: RPC expire_orders (ordini non pagati oltre la scadenza → "scaduto")
 */
import { supabaseConfig, client } from '../lib/backend.mjs';

export const config = { schedule: '@daily' };

export default async function handler(_req, _context, deps = {}) {
  const cfg = supabaseConfig(deps.env || process.env);
  if (!cfg.serviceReady) return new Response('NOT CONFIGURED', { status: 503 });
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  const res = await api.rpc('process_expirations', { p_days_before: 30 }, api.serviceToken());
  const b2b = await api.rpc('process_business_schedules', {}, api.serviceToken());
  const orders = await api.rpc('expire_orders', {}, api.serviceToken());
  return new Response(JSON.stringify({ ...res, b2b, orders_expired: orders }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
