/**
 * Accesso al backend Supabase dalle Netlify Functions (REST/PostgREST, Auth, Storage).
 * - La SERVICE ROLE KEY si usa solo qui, lato server, mai nel browser.
 * - Le operazioni dell'utente usano il SUO token: le regole RLS restano attive.
 * Se le variabili non sono configurate, ogni funzione risponde 503 senza simulare nulla.
 */
export class NotConfigured extends Error {}

export function supabaseConfig(env = process.env) {
  const cfg = {
    url: (env.SUPABASE_URL || env.PUBLIC_SUPABASE_URL || '').replace(/\/$/, ''),
    anonKey: env.SUPABASE_ANON_KEY || env.PUBLIC_SUPABASE_ANON_KEY || '',
    serviceKey: env.SUPABASE_SERVICE_ROLE_KEY || ''
  };
  return { ...cfg, ready: Boolean(cfg.url && cfg.anonKey), serviceReady: Boolean(cfg.url && cfg.serviceKey) };
}

export function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex', ...headers }
  });
}

export const notConfigured = (what) => json(503, { error: 'not_configured', message: `${what} non ancora configurato: operazione non disponibile.` });

export function bearer(req) {
  const h = req.headers.get('authorization') || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

export function client({ cfg, fetchImpl = fetch }) {
  const headers = (token, extra = {}) => ({ apikey: cfg.anonKey || cfg.serviceKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extra });
  const check = async (r) => {
    if (r.ok) return r.status === 204 ? null : r.json();
    let detail = '';
    try { detail = (await r.json()).message; } catch { /* corpo non JSON */ }
    const err = new Error(detail || `HTTP ${r.status}`);
    err.status = r.status;
    throw err;
  };
  return {
    /** Utente autenticato dal token (verificato da Supabase Auth). */
    async user(token) {
      if (!token) return null;
      const r = await fetchImpl(`${cfg.url}/auth/v1/user`, { headers: headers(token) });
      return r.ok ? r.json() : null;
    },
    rpc: async (fn, args, token) => check(await fetchImpl(`${cfg.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: headers(token), body: JSON.stringify(args) })),
    select: async (path, token) => check(await fetchImpl(`${cfg.url}/rest/v1/${path}`, { headers: headers(token) })),
    /** Inserimento (upsert con onConflict) — usato solo con il service role (Prompt 7). */
    upsert: async (table, body, token, onConflict) => check(await fetchImpl(`${cfg.url}/rest/v1/${table}${onConflict ? `?on_conflict=${onConflict}` : ''}`, {
      method: 'POST', headers: headers(token, { Prefer: 'resolution=merge-duplicates,return=minimal' }), body: JSON.stringify(body) })),
    remove: async (path, token) => check(await fetchImpl(`${cfg.url}/rest/v1/${path}`, { method: 'DELETE', headers: headers(token, { Prefer: 'return=minimal' }) })),
    update: async (path, body, token) => check(await fetchImpl(`${cfg.url}/rest/v1/${path}`, { method: 'PATCH', headers: headers(token, { Prefer: 'return=minimal' }), body: JSON.stringify(body) })),
    download: async (bucket, objectPath, token) => {
      const r = await fetchImpl(`${cfg.url}/storage/v1/object/authenticated/${bucket}/${objectPath}`, { headers: headers(token) });
      if (!r.ok) return null;
      return new Uint8Array(await r.arrayBuffer());
    },
    serviceToken: () => {
      if (!cfg.serviceKey) throw new NotConfigured('service role');
      return cfg.serviceKey;
    }
  };
}
