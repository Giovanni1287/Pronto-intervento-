/**
 * POST /.netlify/functions/checkout-create
 * Avvia il checkout ospitato myPOS per un ordine già creato dal database:
 *   { orderId: <uuid>, acceptTerms: true, termsVersion }   → utente autenticato (titolare dell'ordine)
 *   { token: <token del link>, acceptTerms: true, termsVersion } → link di pagamento, senza account
 * Compatibilità: { kind: 'family'|'protected'|'business', ... } crea prima l'ordine.
 *
 * L'importo NON arriva dal browser: lo fornisce il database (RPC begin_payment_attempt*,
 * che verifica stato, scadenza, listino ancora pubblicato/approvato, modalità di pagamento
 * ammessa e accettazione delle condizioni). Poi si firmano i parametri IPCPurchase.
 * Nessun dato di carta transita dal sito: il pagamento avviene sulla pagina myPOS.
 */
import { environmentGuard } from '../lib/environment.mjs';
import { supabaseConfig, client, json, bearer, notConfigured } from '../lib/backend.mjs';
import { readConfig, buildPurchase } from '../../src/lib/mypos.js';
import { createOrder } from './order-create.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{24,64}$/;

export default async function handler(req, _context, deps = {}) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const mypos = readConfig(env);
  if (!mypos.ready) {
    if (mypos.liveBlocked) return json(403, { error: 'live_blocked', message: 'Ambiente di pagamento reale non autorizzato.' });
    return json(503, { error: 'not_configured', message: 'Pagamento online non ancora configurato: nessun addebito è possibile.', problems: mypos.problems });
  }
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  { const blocked = await environmentGuard({ api, env, cfg }); if (blocked) return blocked; }
  // flag amministrativo: con "mypos" spento nessun nuovo pagamento (le notifiche dei pagamenti già avviati restano registrate)
  if (await api.rpc('feature_enabled', { p_key: 'mypos' }, cfg.anonKey).catch(() => null) === false) return json(503, { error: 'payments_disabled', message: 'I pagamenti online non sono attivi. Nessun addebito è stato avviato.' });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'bad_request' }); }
  const accept = body?.acceptTerms === true;

  let attempt;
  try {
    if (body?.token !== undefined) {
      if (!TOKEN.test(String(body.token))) return json(400, { error: 'bad_request', message: 'Link non valido.' });
      attempt = await api.rpc('begin_payment_attempt_by_token', { p_token: body.token, p_accept_terms: accept, p_terms_version: body.termsVersion || null }, cfg.anonKey);
    } else {
      const token = bearer(req);
      const user = await api.user(token);
      if (!user) return json(401, { error: 'unauthorized', message: 'Accesso richiesto.' });
      let orderId = body?.orderId;
      if (!orderId && body?.kind) {
        if (body.kind === 'business' && !UUID.test(String(body.installmentId || ''))) return json(400, { error: 'bad_request', message: 'Rata non valida.' });
        if (body.kind !== 'business' && !/^[a-z0-9-]{3,60}$/.test(String(body.planId || ''))) return json(400, { error: 'bad_request', message: 'Piano non valido.' });
        orderId = (await createOrder(api, token, body)).order_uuid;
      }
      if (!UUID.test(String(orderId || ''))) return json(400, { error: 'bad_request', message: 'Ordine non valido.' });
      attempt = await api.rpc('begin_payment_attempt', { p_order: orderId, p_accept_terms: accept, p_terms_version: body.termsVersion || null }, token);
    }
  } catch (err) {
    return json(err.local ? 400 : err.status === 401 || err.status === 403 ? 403 : 422, { error: 'order_rejected', message: err.message });
  }

  const form = buildPurchase({
    cfg: mypos,
    order: { orderId: attempt.order_id, amountCents: attempt.amount_cents, description: attempt.description, items: attempt.items },
    customer: { email: attempt.customer_email },
    attemptId: attempt.attempt_id
  });
  return json(200, { orderId: attempt.order_id, amountCents: attempt.amount_cents, currency: 'EUR', environment: mypos.env, checkout: form });
}
