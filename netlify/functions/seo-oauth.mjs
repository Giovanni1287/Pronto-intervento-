/**
 * Collegamento OAuth 2.0 a Google Search Console (Prompt 7).
 *  GET ?action=start&property=<id>  (amministratore, token Supabase) → { url } verso Google
 *  GET ?code=…&state=…              ritorno da Google: scambio del codice, refresh token
 *                                   cifrato (AES-256-GCM) e salvato solo per il service role.
 * Lo "state" è casuale, salvato come impronta, legato all'amministratore e scade in 10 minuti.
 * Nessun token viene mai inviato al browser.
 */
import { supabaseConfig, client, json, notConfigured, bearer } from '../lib/backend.mjs';
import { googleConfig, oauthAuthUrl, oauthExchange, encryptToken, newState, sha256, SCOPES } from '../lib/google.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const back = (status) => new Response(null, { status: 302, headers: { Location: `/admin/seo/#impostazioni?oauth=${status}`, 'Cache-Control': 'no-store' } });

export default async function handler(req, _context, deps = {}) {
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  const gcfg = googleConfig(env);
  if (!cfg.serviceReady || !cfg.ready) return notConfigured('Backend Supabase');
  if (!gcfg.oauth || !gcfg.tokenKey) return notConfigured('OAuth Google (GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI, SEO_TOKEN_KEY)');
  const fetchImpl = deps.fetch || fetch;
  const api = client({ cfg, fetchImpl });
  const svc = api.serviceToken();
  const u = new URL(req.url);

  if (u.searchParams.get('action') === 'start') {
    const token = bearer(req);
    const user = token ? await api.user(token) : null;
    if (!user?.id) return json(401, { error: 'unauthorized' });
    const st = await api.rpc('seo_admin_state', {}, token).catch(() => null);
    if (!st?.permissions?.manage) return json(403, { error: 'forbidden' });
    const property = u.searchParams.get('property');
    if (!UUID.test(property || '') || !st.properties.some((p) => p.id === property)) return json(400, { error: 'bad_property' });
    const state = newState();
    await api.upsert('seo_oauth_states', { state_hash: sha256(state), property_id: property, admin_id: user.id, expires_at: new Date(Date.now() + 600000).toISOString() }, svc);
    return json(200, { url: oauthAuthUrl(gcfg.oauth, state, SCOPES.gsc) });
  }

  // ritorno da Google
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state');
  if (u.searchParams.get('error')) return back('denied');
  if (!code || !state) return back('invalid');
  const rows = await api.select(`seo_oauth_states?state_hash=eq.${sha256(state)}&used_at=is.null&select=property_id,admin_id,expires_at`, svc);
  const s = rows?.[0];
  if (!s || new Date(s.expires_at) < new Date()) return back('expired');
  await api.update(`seo_oauth_states?state_hash=eq.${sha256(state)}`, { used_at: new Date().toISOString() }, svc);
  try {
    const t = await oauthExchange(gcfg.oauth, code, { fetchImpl });
    if (!t.refresh_token) return back('no_refresh_token');
    if (!String(t.scope || '').includes('webmasters')) return back('scope');
    const enc = encryptToken(t.refresh_token, gcfg.tokenKey);
    await api.upsert('seo_oauth_tokens', { property_id: s.property_id, ...enc, scope: t.scope, granted_by: s.admin_id, granted_at: new Date().toISOString() }, svc, 'property_id');
    await api.update(`seo_properties?id=eq.${s.property_id}`, { auth_method: 'oauth' }, svc);
    return back('ok');
  } catch {
    return back('error');
  }
}
