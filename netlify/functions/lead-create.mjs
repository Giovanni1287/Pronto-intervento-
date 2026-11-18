/**
 * POST /.netlify/functions/lead-create
 * Modulo pubblico B2B (hotel, aziende, condomini, corporate).
 * Corpo: application/x-www-form-urlencoded o JSON con i campi del modulo.
 * Il lead si registra tramite la RPC submit_b2b_lead con la chiave pubblica
 * (anon): validazione, privacy obbligatoria e anti-duplicato sono nel database.
 * Nessuna email viene inviata da qui: la notifica agli amministratori è
 * accodata dal database e spedita solo da notifications-dispatch, se configurato.
 */
import { environmentGuard } from '../lib/environment.mjs';
import { overLimit, TOO_MANY } from '../lib/rate.mjs';
import { supabaseConfig, client, json, notConfigured } from '../lib/backend.mjs';

const SEGMENTS = ['hotel', 'business', 'condominium', 'corporate'];
const SERVICES = /^[a-z0-9-]{2,60}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const PHONE = /^[0-9 +().-]{6,20}$/;

export async function readLead(req) {
  const type = req.headers.get('content-type') || '';
  if (type.includes('application/json')) {
    const b = await req.json();
    return { ...b, servizi: [].concat(b.servizi || []) };
  }
  const p = new URLSearchParams(await req.text());
  const o = Object.fromEntries(p.entries());
  o.servizi = p.getAll('servizi');
  return o;
}

/** Validazione lato funzione (il database ripete i controlli). */
export function validateLead(f) {
  const errors = [];
  const str = (k, min, max) => { const v = String(f[k] ?? '').trim(); if (v.length < min || v.length > max) errors.push(k); return v; };
  const lead = {
    p_segment: SEGMENTS.includes(f.segmento) ? f.segmento : (errors.push('segmento'), null),
    p_company: str('ragione_sociale', 2, 200),
    p_contact: str('referente', 2, 120),
    p_email: str('email', 5, 160),
    p_phone: str('telefono', 6, 20),
    p_activity: String(f.attivita || '').slice(0, 60) || null,
    p_locations: f.sedi ? Math.max(1, Math.min(10000, parseInt(f.sedi, 10) || 1)) : null,
    p_zone: str('zona', 2, 160),
    p_services: (f.servizi || []).filter((s) => SERVICES.test(s)).slice(0, 12),
    p_needs: str('esigenze', 10, 4000),
    p_inspection: f.sopralluogo === 'si' || f.sopralluogo === true,
    p_privacy: f.privacy === 'si' || f.privacy === 'on' || f.privacy === true,
    p_source: String(f.pagina || '').slice(0, 200) || null
  };
  if (lead.p_email && !EMAIL.test(lead.p_email)) errors.push('email');
  if (lead.p_phone && !PHONE.test(lead.p_phone)) errors.push('telefono');
  if (!lead.p_privacy) errors.push('privacy');
  return { lead, errors: [...new Set(errors)] };
}

export default async function handler(req, _context, deps = {}) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  let fields;
  try { fields = await readLead(req); } catch { return json(400, { error: 'bad_request' }); }
  if (String(fields['bot-field'] || '').trim()) return json(400, { error: 'bad_request' });
  const { lead, errors } = validateLead(fields);
  if (errors.length) return json(422, { error: 'invalid_fields', fields: errors, message: 'Controlla i campi evidenziati.' });
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  { const blocked = await environmentGuard({ api, env, cfg }); if (blocked) return blocked; }
  if (await overLimit({ api, cfg, req, context: _context, env, bucket: 'b2b_lead', limit: Number(env.RATE_LIMIT_LEADS_PER_HOUR) || 10 })) {
    return json(429, { error: 'rate_limited', message: TOO_MANY });
  }
  try {
    const number = await api.rpc('submit_b2b_lead', lead, cfg.anonKey);
    return json(201, { ok: true, number });
  } catch (err) {
    return json(422, { error: 'lead_rejected', message: err.message });
  }
}
