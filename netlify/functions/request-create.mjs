/**
 * POST /.netlify/functions/request-create
 * Moduli pubblici di richiesta (homepage, landing dei servizi, richiesta preventivo).
 * La richiesta entra nel registro unico della centrale operativa tramite la RPC
 * submit_public_request con la chiave pubblica (anon): validazione, consenso privacy,
 * limite per numero di telefono e controllo dei duplicati sono nel database.
 * Nessuna email viene inviata da qui: le notifiche sono accodate dal database e
 * spedite solo da notifications-dispatch, se un provider è configurato.
 */
import { environmentGuard } from '../lib/environment.mjs';
import { overLimit, TOO_MANY } from '../lib/rate.mjs';
import { supabaseConfig, client, json, notConfigured } from '../lib/backend.mjs';

const PHONE = /^[0-9 +().-]{6,20}$/;
const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const CATEGORY = /^([a-z0-9-]{2,60})(\/[a-z0-9-]{2,80})?$/;
const SOURCE_BY_FORM = { intervento: 'homepage', preventivo: 'quote_form', sopralluogo: 'landing' };

export async function readForm(req) {
  const type = req.headers.get('content-type') || '';
  if (type.includes('application/json')) return req.json();
  return Object.fromEntries(new URLSearchParams(await req.text()).entries());
}

/** Validazione lato funzione (il database ripete i controlli). */
export function validateRequest(f) {
  const errors = [];
  const str = (k, min, max) => { const v = String(f[k] ?? '').trim(); if (v.length < min || v.length > max) errors.push(k); return v; };
  const formName = String(f['form-name'] || f.modulo || '').trim();
  const cat = String(f.categoria || '').trim();
  if (cat && !CATEGORY.test(cat) && cat !== 'altro') errors.push('categoria');
  const [category, sub] = cat.includes('/') ? [cat.split('/')[0], cat] : [cat || null, null];
  const out = {
    p_source: SOURCE_BY_FORM[formName] || (String(f.pagina || '/') === '/' ? 'homepage' : 'landing'),
    p_category: category,
    p_service: sub,
    p_name: str('nome', 2, 120),
    p_phone: str('telefono', 6, 20),
    p_email: String(f.email || '').trim() || null,
    p_zone: str('zona', 2, 160),
    p_description: str('descrizione', 10, 4000),
    p_privacy: f.privacy === 'on' || f.privacy === 'si' || f.privacy === true,
    p_page: String(f.pagina || '').slice(0, 200) || null,
    p_intake: Object.fromEntries(Object.entries({ requestType: f.tipo_richiesta, clientType: f.tipo_cliente, timing: f.tempi })
      .filter(([, v]) => typeof v === 'string' && /^[a-z-]{2,30}$/.test(v)))
  };
  // Prompt 7: provenienza del lead (canale, UTM, prima pagina visitata) senza dati personali
  const attr = parseAttribution(f.attribuzione);
  if (attr) out.p_intake.attribution = attr;
  if (out.p_phone && !PHONE.test(out.p_phone)) errors.push('telefono');
  if (out.p_email && !EMAIL.test(out.p_email)) errors.push('email');
  if (!out.p_privacy) errors.push('privacy');
  return { request: out, errors: [...new Set(errors)] };
}

const CHANNELS = new Set(['organic', 'paid', 'direct', 'referral', 'social', 'email', 'internal']);
const UTM = /^[A-Za-z0-9 _.+-]{1,100}$/;
/** Attribuzione dal campo nascosto del modulo: solo valori in elenco o con formato sicuro. */
export function parseAttribution(raw) {
  if (typeof raw !== 'string' || !raw || raw.length > 800) return null;
  let a;
  try { a = JSON.parse(raw); } catch { return null; }
  if (!a || typeof a !== 'object') return null;
  const out = {};
  if (CHANNELS.has(a.channel)) out.channel = a.channel;
  if (typeof a.firstLanding === 'string' && /^\/[A-Za-z0-9/_.-]{0,199}$/.test(a.firstLanding)) out.firstLanding = a.firstLanding;
  if (a.utm && typeof a.utm === 'object') {
    const utm = Object.fromEntries(['source', 'medium', 'campaign', 'content', 'term'].map((k) => [k, a.utm[k]]).filter(([, v]) => typeof v === 'string' && UTM.test(v)));
    if (Object.keys(utm).length) out.utm = utm;
  }
  return Object.keys(out).length ? out : null;
}

export default async function handler(req, _context, deps = {}) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  let fields;
  try { fields = await readForm(req); } catch { return json(400, { error: 'bad_request' }); }
  if (String(fields['bot-field'] || '').trim()) return json(400, { error: 'bad_request' });
  const { request, errors } = validateRequest(fields);
  if (errors.length) return json(422, { error: 'invalid_fields', fields: errors, message: 'Controlla i campi evidenziati.' });
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  { const blocked = await environmentGuard({ api, env, cfg }); if (blocked) return blocked; }
  if (await overLimit({ api, cfg, req, context: _context, env, bucket: 'public_request', limit: Number(env.RATE_LIMIT_REQUESTS_PER_HOUR) || 10 })) {
    return json(429, { error: 'rate_limited', message: TOO_MANY });
  }
  try {
    const res = await api.rpc('submit_public_request', request, cfg.anonKey);
    return json(201, { ok: true, number: res?.number });
  } catch (err) {
    return json(err.status === 429 ? 429 : 422, { error: 'request_rejected', message: err.message });
  }
}
