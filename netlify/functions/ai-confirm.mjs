/**
 * POST /.netlify/functions/ai-confirm — conferma ESPLICITA del cliente.
 * Corpo: { conversationId, conversationToken?, draftHash, contact: { name, phone, email? }, privacy }
 * È l'unico punto in cui una conversazione con PRONTO AI diventa una richiesta
 * nella centrale operativa: il cliente ha visto il riepilogo (stessa impronta della
 * bozza) e ha premuto "Conferma e invia". Il modello non può chiamare questo endpoint.
 * Recapiti inseriti nel modulo, mai inviati al provider AI.
 * Se il backend non risponde: nessuna dichiarazione di richiesta registrata.
 */
import { environmentGuard } from '../lib/environment.mjs';
import { supabaseConfig, client, json, notConfigured, bearer } from '../lib/backend.mjs';
import { sha256, validToken, readJson, UUID, FALLBACK_CONTACT } from '../lib/ai.mjs';

const PHONE = /^[0-9 +().-]{6,20}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

export function validateConfirm(b) {
  const errors = [];
  const c = b?.contact || {};
  const name = String(c.name || '').trim();
  const phone = String(c.phone || '').trim();
  const email = String(c.email || '').trim();
  if (!UUID.test(String(b?.conversationId || ''))) errors.push('conversationId');
  if (!/^[0-9a-f]{64}$/.test(String(b?.draftHash || ''))) errors.push('draftHash');
  if (name.length < 2 || name.length > 120) errors.push('nome');
  if (!PHONE.test(phone)) errors.push('telefono');
  if (email && !EMAIL.test(email)) errors.push('email');
  if (b?.privacy !== true) errors.push('privacy');
  return { errors, contact: { name, phone, email: email || null } };
}

export default async function handler(req, _context, deps = {}) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const cfg = supabaseConfig(deps.env || process.env);
  if (!cfg.serviceReady || !cfg.ready) return notConfigured('Backend Supabase');
  let body;
  try { body = await readJson(req, 8000); } catch { return json(400, { error: 'bad_request' }); }
  const { errors, contact } = validateConfirm(body);
  if (errors.length) return json(422, { error: 'invalid_fields', fields: errors, message: 'Controlla i campi evidenziati.' });

  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  { const blocked = await environmentGuard({ api, env: deps.env || process.env, cfg }); if (blocked) return blocked; }
  const token = bearer(req);
  let user = null;
  try { if (token) { user = await api.user(token); if (!user?.id) return json(401, { error: 'unauthorized' }); } }
  catch { return json(502, { error: 'backend_unavailable', registered: false, message: 'Servizio non raggiungibile: la richiesta NON è stata registrata. ' + FALLBACK_CONTACT }); }
  if (!user && !validToken(body.conversationToken)) return json(403, { error: 'forbidden' });

  try {
    const res = await api.rpc('ai_confirm_customer_request', {
      p_conversation: body.conversationId, p_profile: user?.id || null, p_anon_hash: user ? null : sha256(body.conversationToken),
      p_draft_hash: body.draftHash, p_contact: contact, p_privacy: true
    }, api.serviceToken());
    if (res?.error === 'draft_changed') return json(409, { error: 'draft_changed', registered: false, message: res.message, draft: { draft: res.draft, draftHash: res.draftHash } });
    return json(res.duplicate ? 200 : 201, { ok: true, registered: true, number: res.number, duplicate: Boolean(res.duplicate) });
  } catch (err) {
    if (err.status === 403) return json(403, { error: 'forbidden', registered: false, message: 'Conversazione non disponibile.' });
    if (err.status === 400 || err.status === 409 || err.status === 429 || /valid|privacy|richieste|Descrivi|zona|categoria|servizio/i.test(err.message || '')) {
      return json(422, { error: 'request_rejected', registered: false, message: err.message });
    }
    return json(502, { error: 'backend_unavailable', registered: false, message: 'Servizio non raggiungibile: la richiesta NON è stata registrata. ' + FALLBACK_CONTACT });
  }
}
