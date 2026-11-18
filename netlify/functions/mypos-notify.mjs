/**
 * POST /.netlify/functions/mypos-notify  (URL_Notify di myPOS)
 * Unica via automatica di attivazione: firma verificata con il certificato
 * pubblico myPOS, ordine esistente, importo e valuta attesi, riferimento della
 * transazione, idempotenza su evento e transazione. La registrazione avviene in
 * una transazione nel database (RPC process_payment_notification, solo service role)
 * e SOLO dopo il suo esito positivo si risponde "OK" (HTTP 200, text/plain) come
 * richiesto da myPOS. Gestisce anche IPCPurchaseRollback (storno).
 * Il ritorno del browser su URL_OK NON attiva nulla. Nessun dato di carta nei log.
 */
import { supabaseConfig, client } from '../lib/backend.mjs';
import { readConfig, handleNotify } from '../../src/lib/mypos.js';

const text = (status, body) => new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
const ORDER = /^ORD-[0-9A-Z]{12}$/;

export default async function handler(req, _context, deps = {}) {
  if (req.method !== 'POST') return text(405, 'METHOD NOT ALLOWED');
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  const mypos = readConfig(env);
  if (!cfg.serviceReady || !mypos.publicCert) return text(503, 'NOT CONFIGURED');
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  const svc = api.serviceToken();

  const params = Object.fromEntries(new URLSearchParams(await req.text()));
  const res = await handleNotify(params, mypos.publicCert, {
    findOrder: async (orderId) => {
      if (!ORDER.test(String(orderId))) return null;
      const rows = await api.select(`orders?number=eq.${encodeURIComponent(orderId)}&select=number,gross_cents,currency,status`, svc);
      const o = rows?.[0];
      return o ? { orderId: o.number, amountCents: o.gross_cents, currency: o.currency, status: o.status } : null;
    },
    confirmPayment: async (x) => api.rpc('process_payment_notification', {
      p_event_key: x.eventKey, p_order_number: x.orderId, p_provider_ref: x.providerRef,
      p_amount: x.amountCents, p_currency: x.currency, p_data: x.payload, p_source: 'notify'
    }, svc),
    rollbackPayment: async (x) => api.rpc('process_payment_rollback', {
      p_event_key: x.eventKey, p_order_number: x.orderId, p_amount: x.amountCents, p_currency: x.currency, p_data: x.payload
    }, svc)
  });
  // solo esito sintetico nei log (nessun parametro del gateway)
  console.log(JSON.stringify({ fn: 'mypos-notify', outcome: res.outcome, order: ORDER.test(String(params.OrderID)) ? params.OrderID : 'invalid' }));
  return text(res.http, res.body);
}
