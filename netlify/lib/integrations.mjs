/**
 * Stato delle integrazioni (Prompt 9) calcolato lato server. Restituisce SOLO informazioni non
 * segrete: presenza delle variabili, ruoli e progetto delle chiavi, ambiente, problemi di configurazione.
 * Le verifiche "dal vivo" (Supabase Auth e Storage) si fanno solo se le chiavi esistono; nessun esito
 * viene simulato: in caso di errore lo stato è "non raggiungibile" con il motivo.
 */
import { readConfig as myposConfig } from '../../src/lib/mypos.js';
import { providerConfig } from '../../src/lib/ai/providers.js';
import { googleConfig } from './google.mjs';
import { describeSupabaseKey, checkEnvironment, appEnvironment } from './environment.mjs';
import { forms } from '../../src/config/site.config.js';

export function myposStatus(env) {
  const c = myposConfig(env);
  const app = appEnvironment(env);
  const problems = [...c.problems];
  if (app === 'staging' && c.env !== 'sandbox') problems.push('Lo staging può usare solo myPOS sandbox');
  return { env: c.env, ready: c.ready && !problems.length, missing: c.missing.map((k) => ({ sid: 'MYPOS_SID', wallet: 'MYPOS_WALLET', privateKey: 'MYPOS_PRIVATE_KEY', publicCert: 'MYPOS_PUBLIC_CERT', siteUrl: 'SITE_URL' }[k] || k)),
    problems, liveBlocked: c.liveBlocked, allowLive: env.MYPOS_ALLOW_LIVE === 'true', checkoutUrl: c.url, notifyUrl: c.siteUrl ? `${c.siteUrl}/.netlify/functions/mypos-notify` : null,
    refundsEnabled: c.refundsEnabled, statusQueryEnabled: c.statusQueryEnabled, trustStatusQuery: c.trustStatusQuery };
}

export function emailStatus(env) {
  const configured = Boolean(env.RESEND_API_KEY && env.NOTIFY_FROM);
  const allowed = String(env.NOTIFY_ALLOWED_DOMAINS || '').split(',').map((d) => d.trim()).filter(Boolean);
  const problems = [];
  if (configured && appEnvironment(env) === 'staging' && !allowed.length) problems.push('In staging serve NOTIFY_ALLOWED_DOMAINS: senza, nessuna email viene inviata');
  if (env.RESEND_API_KEY && !env.NOTIFY_FROM) problems.push('NOTIFY_FROM mancante (mittente verificato)');
  return { configured, provider: env.RESEND_API_KEY ? 'resend' : null, from: env.NOTIFY_FROM || null, allowedDomains: allowed, problems };
}

export async function supabaseStatus({ env, cfg, fetchImpl = fetch }) {
  const out = { url: Boolean(cfg.url), projectRef: null, anonKey: describeSupabaseKey(cfg.anonKey, cfg.url), serviceKey: describeSupabaseKey(cfg.serviceKey, cfg.url),
    publicBuildKeys: Boolean(env.PUBLIC_SUPABASE_URL && env.PUBLIC_SUPABASE_ANON_KEY), auth: { reachable: false }, storage: { reachable: false } };
  try { out.projectRef = new URL(cfg.url).hostname.split('.')[0]; } catch { /* URL non valida */ }
  if (env.PUBLIC_SUPABASE_URL && cfg.url && env.PUBLIC_SUPABASE_URL.replace(/\/$/, '') !== cfg.url) out.mismatch = 'PUBLIC_SUPABASE_URL e SUPABASE_URL puntano a progetti diversi';
  if (cfg.url && cfg.anonKey) {
    try {
      const r = await fetchImpl(`${cfg.url}/auth/v1/settings`, { headers: { apikey: cfg.anonKey }, signal: AbortSignal.timeout(6000) });
      if (r.ok) {
        const s = await r.json();
        out.auth = { reachable: true, signupDisabled: Boolean(s.disable_signup), emailProvider: Boolean(s.external?.email), autoconfirm: Boolean(s.mailer_autoconfirm) };
      } else out.auth = { reachable: false, error: `HTTP ${r.status}` };
    } catch (e) { out.auth = { reachable: false, error: String(e.message || e).slice(0, 120) }; }
  }
  if (cfg.url && cfg.serviceKey) {
    try {
      const r = await fetchImpl(`${cfg.url}/storage/v1/bucket`, { headers: { apikey: cfg.serviceKey, Authorization: `Bearer ${cfg.serviceKey}` }, signal: AbortSignal.timeout(6000) });
      if (r.ok) {
        const list = await r.json();
        const want = ['interventi', 'tecnici'];
        out.storage = { reachable: true, buckets: list.map((b) => ({ id: b.id, public: Boolean(b.public), sizeLimit: b.file_size_limit || null })),
          missing: want.filter((w) => !list.some((b) => b.id === w)), publicPrivateBuckets: list.filter((b) => want.includes(b.id) && b.public).map((b) => b.id) };
      } else out.storage = { reachable: false, error: `HTTP ${r.status}` };
    } catch (e) { out.storage = { reachable: false, error: String(e.message || e).slice(0, 120) }; }
  }
  return out;
}

export async function integrationsStatus({ env, cfg, api, fetchImpl = fetch, audit = null }) {
  const g = googleConfig(env);
  const ai = providerConfig(env);
  return {
    appEnvironment: appEnvironment(env),
    environment: cfg.serviceReady ? await checkEnvironment({ api, env }) : { ok: false, reason: 'chiave server non configurata' },
    supabase: await supabaseStatus({ env, cfg, fetchImpl }),
    mypos: myposStatus(env),
    email: emailStatus(env),
    ai: { ready: ai.ready, provider: ai.provider || null, model: ai.model || null, killSwitch: ai.envKillSwitch },
    google: { ready: g.ready, serviceAccountEmail: g.serviceAccount?.clientEmail || null, oauth: Boolean(g.oauth) },
    site: {
      siteEnv: env.SITE_ENV || null, deployUrl: env.URL || null, allowIndexing: env.ALLOW_INDEXING === 'true', stagingProtected: Boolean(env.STAGING_BASIC_AUTH),
      buildHook: Boolean(env.NETLIFY_BUILD_HOOK_URL), formsProvider: forms.provider || null, ga4: Boolean(env.PUBLIC_GA4_MEASUREMENT_ID),
      buildOk: audit ? true : null, auditErrors: audit ? audit.summary?.errors ?? null : null, auditWarnings: audit ? audit.summary?.warnings ?? null : null,
      publicPages: audit ? audit.summary?.publicPages ?? null : null, auditAt: audit?.generatedAt || null
    }
  };
}

/** Amministratore autenticato (token Supabase) — null se non lo è. */
export async function adminFromToken(api, token) {
  if (!token) return null;
  const user = await api.user(token).catch(() => null);
  if (!user?.id) return null;
  const rows = await api.select(`profiles?id=eq.${user.id}&select=id,role,email,full_name`, token).catch(() => []);
  return rows?.[0]?.role === 'admin' ? { ...rows[0], email: rows[0].email || user.email } : null;
}
