/**
 * Funzione pianificata: elabora la coda delle notifiche (Prompt 4–5, rivista nel Prompt 9).
 * - Flag "notifications" spento → nessun invio (le notifiche restano in coda).
 * - Presa in carico atomica (notifications_claim, FOR UPDATE SKIP LOCKED): due esecuzioni parallele
 *   non inviano mai la stessa email; la deduplica in coda è data da dedupe_key.
 * - Esito registrato da notifications_record_result: errori ritentati con attesa crescente, al 5° "dead".
 * - Senza provider configurato le notifiche diventano "not_sent" (mai "sent").
 * - Staging: con APP_ENVIRONMENT=staging serve NOTIFY_ALLOWED_DOMAINS, altrimenti non si invia nulla.
 * - Le comunicazioni commerciali richiedono il consenso marketing del destinatario.
 */
import { supabaseConfig, client } from '../lib/backend.mjs';
import { dispatch, resendProvider } from '../../src/lib/notifications.js';
import { checkEnvironment, appEnvironment } from '../lib/environment.mjs';

export const config = { schedule: '*/15 * * * *' };
const out = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

export default async function handler(_req, _context, deps = {}) {
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.serviceReady) return new Response('NOT CONFIGURED', { status: 503 });
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  const svc = api.serviceToken();
  // interruttore amministrativo (se il database non lo conosce ancora si prosegue come prima del Prompt 9)
  const enabled = await api.rpc('feature_enabled', { p_key: 'notifications' }, svc).catch(() => null);
  if (enabled === false) return out({ skipped: 'disabled' });
  if (appEnvironment(env)) {
    const e = await checkEnvironment({ api, env });
    if (!e.ok) return out({ skipped: 'environment_mismatch', reason: e.reason }, 503);
  }
  const allowedDomains = (env.NOTIFY_ALLOWED_DOMAINS || '').split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
  if (appEnvironment(env) === 'staging' && !allowedDomains.length && env.RESEND_API_KEY) return out({ skipped: 'staging_without_allowed_domains' });
  const provider = deps.provider !== undefined ? deps.provider : resendProvider({ apiKey: env.RESEND_API_KEY, from: env.NOTIFY_FROM, fetchImpl: deps.fetch || fetch });

  const rows = await api.rpc('notifications_claim', { p_limit: 50 }, svc);
  if (!rows?.length) return out({});
  // destinatario: profilo registrato oppure, per le richieste senza account, l'email indicata nella richiesta (Prompt 5)
  const pids = [...new Set(rows.map((n) => n.recipient_id).filter(Boolean))];
  const iids = [...new Set(rows.filter((n) => !n.recipient_id && n.intervention_id).map((n) => n.intervention_id))];
  const profiles = pids.length ? await api.select(`profiles?id=in.(${pids.join(',')})&select=id,email,marketing_consent`, svc) : [];
  const interventions = iids.length ? await api.select(`interventions?id=in.(${iids.join(',')})&select=id,contact_email`, svc) : [];
  const byP = new Map(profiles.map((p) => [p.id, p])); const byI = new Map(interventions.map((i) => [i.id, i]));
  const summary = {};
  for (const n of rows) {
    const p = n.recipient_id ? byP.get(n.recipient_id) : null;
    const r = await dispatch({
      eventId: n.event,
      data: { ...n.payload, link: n.payload?.link ? `${env.SITE_URL || ''}${n.payload.link}` : undefined },
      recipient: { email: p?.email || byI.get(n.intervention_id)?.contact_email },
      consents: { marketing: p?.marketing_consent === true },
      provider,
      channel: n.channel || 'email',
      allowedDomains
    });
    await api.rpc('notifications_record_result', { p_id: n.id, p_status: r.status, p_provider: r.provider || null, p_message_id: r.providerMessageId || null, p_error: r.reason || null }, svc);
    summary[r.status] = (summary[r.status] || 0) + 1;
  }
  return out(summary);
}
