/**
 * POST /.netlify/functions/conversion-event — eventi anonimi dal sito (Prompt 7).
 * Corpo: { kind, path, channel?, utm? }. Nessun cookie, nessun identificativo del
 * visitatore, nessun dato personale: solo tipo di evento, pagina e canale.
 * L'IP non viene salvato. Accettati solo eventi dallo stesso sito (Origin) e con
 * corpo minimo; il database scarta gli eccessi.
 */
import { supabaseConfig, client, json } from '../lib/backend.mjs';

const KINDS = new Set(['phone_click', 'whatsapp_click', 'form_submit_ok', 'form_submit_error', 'quote_cta_click', 'plan_cta_click', 'ai_open', 'checkout_start']);

export function sameOrigin(req, env) {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const allowed = [env.SITE_URL, env.URL, env.DEPLOY_PRIME_URL, 'https://prontointerventoroma.it'].filter(Boolean).map((u) => new URL(u).origin);
  return allowed.includes(origin) || origin === new URL(req.url).origin;
}

export default async function handler(req, _context, deps = {}) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const env = deps.env || process.env;
  if (!sameOrigin(req, env)) return json(403, { error: 'forbidden' });
  const cfg = supabaseConfig(env);
  // senza backend l'evento si scarta in silenzio: il sito funziona comunque
  if (!cfg.serviceReady) return new Response(null, { status: 204 });
  const raw = await req.text();
  if (raw.length > 1000) return json(413, { error: 'too_large' });
  let b;
  try { b = JSON.parse(raw); } catch { return json(400, { error: 'bad_request' }); }
  if (!KINDS.has(b.kind) || typeof b.path !== 'string') return json(400, { error: 'bad_request' });
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  try {
    await api.rpc('record_conversion_event', { p: { kind: b.kind, path: b.path.slice(0, 200), channel: String(b.channel || '').slice(0, 20),
      utm: b.utm && typeof b.utm === 'object' ? { source: String(b.utm.source || '').slice(0, 100), medium: String(b.utm.medium || '').slice(0, 100), campaign: String(b.utm.campaign || '').slice(0, 100) } : {} } }, api.serviceToken());
  } catch { return json(400, { error: 'rejected' }); }
  return new Response(null, { status: 204 });
}
