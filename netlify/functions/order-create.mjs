/**
 * POST /.netlify/functions/order-create   (utente autenticato)
 * Body: { kind: 'family', planId, propertyId, promotionCode? }
 *     | { kind: 'protected', planId, interventionId }
 *     | { kind: 'business', installmentId }
 * L'ordine (prezzo, imposte, condizioni, versione commerciale) è creato dal
 * database con l'identità dell'utente: nessun importo arriva dal browser.
 * Risposta: riepilogo dell'ordine per la pagina di checkout.
 */
import { supabaseConfig, client, json, bearer, notConfigured } from '../lib/backend.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLAN = /^[a-z0-9-]{3,60}$/;

export async function createOrder(api, token, body) {
  const { kind } = body || {};
  if (kind === 'family') {
    if (!PLAN.test(String(body.planId)) || !UUID.test(String(body.propertyId))) throw Object.assign(new Error('Dati non validi'), { status: 400, local: true });
    return api.rpc('create_family_order', { p_plan_id: body.planId, p_property_id: body.propertyId, p_promotion_code: body.promotionCode || null }, token);
  }
  if (kind === 'protected') {
    if (!PLAN.test(String(body.planId)) || !UUID.test(String(body.interventionId))) throw Object.assign(new Error('Dati non validi'), { status: 400, local: true });
    return api.rpc('create_protected_order', { p_intervention: body.interventionId, p_plan_id: body.planId }, token);
  }
  if (kind === 'business') {
    if (!UUID.test(String(body.installmentId))) throw Object.assign(new Error('Rata non valida'), { status: 400, local: true });
    return api.rpc('create_installment_order', { p_installment: body.installmentId }, token);
  }
  throw Object.assign(new Error('Tipo di acquisto non valido'), { status: 400, local: true });
}

export default async function handler(req, _context, deps = {}) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  const token = bearer(req);
  if (!(await api.user(token))) return json(401, { error: 'unauthorized', message: 'Accesso richiesto.' });
  let body;
  try { body = await req.json(); } catch { return json(400, { error: 'bad_request' }); }
  try {
    const o = await createOrder(api, token, body);
    const summary = await api.rpc('order_summary', { p_order: o.order_uuid }, token);
    return json(201, { order: summary });
  } catch (err) {
    return json(err.local ? 400 : 422, { error: 'order_rejected', message: err.message });
  }
}
