/**
 * GET /.netlify/functions/payment-receipt?ordine=ORD-…[&t=<token link>]
 * Ricevuta PDF di un ordine pagato (titolare con token utente, oppure token del link).
 * Non è una fattura: il documento fiscale è emesso dal sistema di fatturazione dell'impresa.
 */
import { supabaseConfig, client, json, bearer, notConfigured } from '../lib/backend.mjs';
import { renderReceiptPdf } from '../../src/lib/receipt-pdf.js';

const ORDER = /^ORD-[0-9A-Z]{12}$/;
const TOKEN = /^[A-Za-z0-9_-]{24,64}$/;

export default async function handler(req, _context, deps = {}) {
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const q = new URL(req.url).searchParams;
  const order = q.get('ordine') || '';
  const t = req.headers.get('x-payment-link') || q.get('t');
  if (!ORDER.test(order) || (t && !TOKEN.test(t))) return json(400, { error: 'bad_request' });
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  const userToken = bearer(req);
  const token = userToken && (await api.user(userToken)) ? userToken : t ? cfg.anonKey : null;
  if (!token) return json(401, { error: 'unauthorized' });
  let r;
  try { r = await api.rpc('order_receipt', { p_order_number: order, p_token: t || null }, token); } catch { return json(404, { error: 'not_available' }); }
  return new Response(await renderReceiptPdf(r), { status: 200, headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="ricevuta-${order}.pdf"`, 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex' } });
}
