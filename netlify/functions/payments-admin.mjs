/**
 * POST /.netlify/functions/payments-admin   (solo amministratori, con token utente)
 * Azioni che richiedono le credenziali myPOS lato server:
 *   { action: 'refund-execute', refundId }          → IPCRefund per un rimborso APPROVATO (solo se MYPOS_REFUNDS_ENABLED=true)
 *   { action: 'status-check', orderNumber }         → IPCGetPaymentStatus su richiesta dell'amministratore
 *   { action: 'reconcile-import', batch, csv, from, to } → importa l'estratto transazioni myPOS (CSV) e lo confronta
 * Ogni scrittura passa dalle funzioni del database (verifica del ruolo, audit).
 */
import { supabaseConfig, client, json, bearer, notConfigured } from '../lib/backend.mjs';
import { readConfig, buildRefundRequest, buildStatusRequest, postIpc, parseStatusResponse } from '../../src/lib/mypos.js';
import { parseReconciliationCsv } from '../../src/lib/payments.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ORDER = /^ORD-[0-9A-Z]{12}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function handler(req, _context, deps = {}) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  const token = bearer(req);
  if (!(await api.user(token))) return json(401, { error: 'unauthorized' });
  if ((await api.rpc('is_admin', {}, token).catch(() => false)) !== true) return json(403, { error: 'forbidden' });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'bad_request' }); }
  const mypos = readConfig(env);

  try {
    if (body.action === 'reconcile-import') {
      if (!/^[A-Za-z0-9._-]{3,60}$/.test(String(body.batch || '')) || !DATE.test(body.from) || !DATE.test(body.to)) return json(400, { error: 'bad_request', message: 'Lotto o periodo non validi.' });
      if (String(body.csv || '').length > 2_000_000) return json(413, { error: 'too_large' });
      const rows = parseReconciliationCsv(body.csv);
      return json(200, await api.rpc('import_reconciliation', { p_batch: body.batch, p_rows: rows, p_from: body.from, p_to: body.to }, token));
    }
    if (body.action === 'status-check') {
      if (!ORDER.test(String(body.orderNumber))) return json(400, { error: 'bad_request' });
      if (!mypos.ready || !cfg.serviceReady) return json(503, { error: 'not_configured', message: 'Consultazione myPOS non configurata.' });
      const st = await api.rpc('order_status', { p_order_number: body.orderNumber, p_token: null }, token);
      const res = parseStatusResponse(await postIpc(mypos, buildStatusRequest(mypos, body.orderNumber), deps.fetch || fetch), mypos);
      const trusted = res.ok && res.verified && mypos.trustStatusQuery && res.amountCents === st.grossCents && res.currency === 'EUR';
      const out = await api.rpc('record_provider_status', { p_order_number: body.orderNumber, p_payment_status: res.paymentStatus, p_provider_ref: res.providerRef || 'n/d',
        p_amount: res.amountCents ?? 0, p_currency: res.currency || 'EUR', p_verified: trusted, p_data: res.safe }, api.serviceToken());
      return json(200, { provider: res.safe, verified: res.verified, trusted, result: out });
    }
    if (body.action === 'refund-execute') {
      if (!UUID.test(String(body.refundId))) return json(400, { error: 'bad_request' });
      if (!mypos.ready || !mypos.refundsEnabled) {
        return json(409, { error: 'refunds_disabled', message: 'Rimborsi via API non abilitati: eseguire il rimborso dal portale myPOS e registrarne l’esito con il riferimento.' });
      }
      const [rf] = await api.select(`payment_refunds?id=eq.${body.refundId}&select=id,number,status,mode,amount_cents,transaction:payment_transactions(provider,provider_ref)`, token);
      if (!rf || rf.status !== 'approved' || rf.mode !== 'mypos_api' || rf.transaction?.provider !== 'mypos') return json(409, { error: 'not_executable', message: 'Il rimborso deve essere approvato, di tipo myPOS e su un pagamento myPOS.' });
      await api.rpc('record_refund_result', { p_refund: rf.id, p_status: 'processing', p_provider_ref: null, p_note: null }, token);
      const resp = await postIpc(mypos, buildRefundRequest(mypos, { trnref: rf.transaction.provider_ref, amountCents: rf.amount_cents, refundOrderId: rf.number }), deps.fetch || fetch);
      const ok = String(resp?.Status) === '0';
      const out = await api.rpc('record_refund_result', { p_refund: rf.id, p_status: ok ? 'completed' : 'failed',
        p_provider_ref: ok ? String(resp.IPC_Trnref || `mypos-refund:${rf.number}`) : null, p_note: ok ? 'IPCRefund' : String(resp?.StatusMsg || 'Rimborso non eseguito').slice(0, 200) }, token);
      return json(ok ? 200 : 502, { refund: out });
    }
    return json(400, { error: 'unknown_action' });
  } catch (err) {
    return json(422, { error: 'rejected', message: err.message });
  }
}
