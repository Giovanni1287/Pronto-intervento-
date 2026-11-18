/**
 * POST /.netlify/functions/email-test — email di prova all'indirizzo dell'amministratore (Prompt 9).
 * Usa lo stesso provider della coda (Resend). L'esito è registrato dal server; senza provider
 * risponde 409 senza dichiarare alcun invio. In staging rispetta NOTIFY_ALLOWED_DOMAINS.
 */
import { supabaseConfig, client, json, notConfigured, bearer } from '../lib/backend.mjs';
import { adminFromToken, emailStatus } from '../lib/integrations.mjs';
import { resendProvider } from '../../src/lib/notifications.js';
import { appEnvironment } from '../lib/environment.mjs';

export default async function handler(req, _context, deps = {}) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const fetchImpl = deps.fetch || fetch;
  const api = client({ cfg, fetchImpl });
  const admin = await adminFromToken(api, bearer(req));
  if (!admin) return json(403, { error: 'forbidden' });
  const st = emailStatus(env);
  if (!st.configured) return json(409, { error: 'not_configured', message: 'Nessun provider email configurato: nessuna email inviata.' });
  if (st.problems.length) return json(409, { error: 'misconfigured', message: st.problems.join(' · ') });
  const to = admin.email;
  const domain = String(to || '').split('@').pop().toLowerCase();
  if (st.allowedDomains.length && !st.allowedDomains.includes(domain)) return json(409, { error: 'domain_not_allowed', message: `In questo ambiente si scrive solo a: ${st.allowedDomains.join(', ')}` });
  const provider = deps.provider !== undefined ? deps.provider : resendProvider({ apiKey: env.RESEND_API_KEY, from: env.NOTIFY_FROM, fetchImpl });
  let result;
  try {
    const r = await provider.send({ to, subject: 'Prova di invio — Pronto Intervento Roma', text: `Email di prova inviata dalla configurazione (${appEnvironment(env) || 'ambiente non indicato'}) il ${new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome' })}.\nSe la ricevi, il provider funziona. Controlla anche che non sia finita nello spam (SPF, DKIM e DMARC).` });
    result = r?.id ? { ok: true, providerMessageId: r.id } : { ok: false, error: 'Risposta del provider senza identificativo' };
  } catch (e) { result = { ok: false, error: String(e.message || e).slice(0, 200) }; }
  if (cfg.serviceReady) {
    await api.rpc('record_integration_check', { p_key: 'email_test', p_ok: result.ok, p_environment: appEnvironment(env), p_detail: { ...result, to: to.replace(/^(.).*(@.*)$/, '$1…$2') }, p_by: admin.id }, api.serviceToken()).catch(() => null);
  }
  return json(result.ok ? 200 : 502, { ...result, to });
}
