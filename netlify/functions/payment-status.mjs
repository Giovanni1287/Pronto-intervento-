/**
 * GET /.netlify/functions/payment-status?ordine=ORD-…[&t=<token link>][&tentativo=<uuid>&esito=returned|cancelled][&verifica=1]
 * Stato dell'ordine per le pagine di esito. Il ritorno dal checkout aggiorna solo
 * il tentativo: lo stato "pagato" arriva esclusivamente dal backend (notifica
 * firmata o riconciliazione). Con verifica=1 e ordine ancora in attesa, il backend
 * consulta myPOS (IPCGetPaymentStatus): l'esito attiva servizi solo se la risposta
 * è verificata crittograficamente e MYPOS_TRUST_STATUS_QUERY=true; altrimenti è informativo.
 */
import { supabaseConfig, client, json, bearer, notConfigured } from '../lib/backend.mjs';
import { readConfig, buildStatusRequest, postIpc, parseStatusResponse } from '../../src/lib/mypos.js';

const ORDER = /^ORD-[0-9A-Z]{12}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{24,64}$/;

export default async function handler(req, _context, deps = {}) {
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const q = new URL(req.url).searchParams;
  const order = q.get('ordine') || '';
  if (!ORDER.test(order)) return json(400, { error: 'invalid_order' });
  const linkToken = req.headers.get('x-payment-link') || q.get('t');
  if (linkToken && !TOKEN.test(linkToken)) return json(400, { error: 'invalid_link' });
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  const userToken = bearer(req);
  const token = userToken && (await api.user(userToken)) ? userToken : cfg.anonKey;

  const attempt = q.get('tentativo');
  const outcome = q.get('esito');
  if (attempt && UUID.test(attempt) && ['returned', 'cancelled'].includes(outcome)) {
    await api.rpc('mark_payment_attempt', { p_attempt: attempt, p_outcome: outcome }, token).catch(() => null);
  }
  let st;
  try { st = await api.rpc('order_status', { p_order_number: order, p_token: linkToken || null }, token); } catch { return json(404, { error: 'not_found' }); }

  const mypos = readConfig(env);
  if (q.get('verifica') === '1' && ['awaiting_payment', 'expired'].includes(st.status) && st.attemptStatus === 'returned'
      && mypos.ready && mypos.statusQueryEnabled && cfg.serviceReady) {
    try {
      const res = parseStatusResponse(await postIpc(mypos, buildStatusRequest(mypos, order), deps.fetch || fetch), mypos);
      const trusted = res.ok && res.verified && mypos.trustStatusQuery && res.amountCents === st.grossCents && res.currency === 'EUR';
      await api.rpc('record_provider_status', { p_order_number: order, p_payment_status: res.paymentStatus, p_provider_ref: res.providerRef || 'n/d',
        p_amount: res.amountCents ?? 0, p_currency: res.currency || 'EUR', p_verified: trusted, p_data: res.safe }, api.serviceToken());
      st = await api.rpc('order_status', { p_order_number: order, p_token: linkToken || null }, token);
    } catch (err) {
      console.log(JSON.stringify({ fn: 'payment-status', order, statusQuery: 'failed', reason: String(err.message).slice(0, 120) }));
    }
  }
  return json(200, st);
}
