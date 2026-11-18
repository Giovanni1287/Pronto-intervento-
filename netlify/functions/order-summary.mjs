/**
 * GET /.netlify/functions/order-summary?id=<uuid>   (titolare dell'ordine, con token utente)
 * GET /.netlify/functions/order-summary  + intestazione X-Payment-Link: <token>  (link di pagamento, senza account)
 * Riepilogo senza dati sensibili (nessun indirizzo completo, nessun dato di pagamento).
 */
import { supabaseConfig, client, json, bearer, notConfigured } from '../lib/backend.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{24,64}$/;

export default async function handler(req, _context, deps = {}) {
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  const q = new URL(req.url).searchParams;
  // token del link preferibilmente nell'intestazione X-Payment-Link (non finisce in log e referer)
  const linkToken = req.headers.get('x-payment-link') || q.get('t');
  try {
    if (linkToken) {
      if (!TOKEN.test(linkToken)) return json(400, { error: 'invalid_link' });
      return json(200, { order: await api.rpc('order_by_token', { p_token: linkToken }, cfg.anonKey) });
    }
    if (!UUID.test(q.get('id') || '')) return json(400, { error: 'invalid_id' });
    const token = bearer(req);
    if (!(await api.user(token))) return json(401, { error: 'unauthorized' });
    return json(200, { order: await api.rpc('order_summary', { p_order: q.get('id') }, token) });
  } catch {
    return json(404, { error: 'not_found', message: 'Ordine o link non valido.' });
  }
}
