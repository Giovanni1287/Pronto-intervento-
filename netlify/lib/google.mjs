/**
 * PRONTO SEO — client delle API Google (solo server, Prompt 7).
 * Autenticazione:
 *  - service account (consigliato): JWT RS256 firmato sul server, scambiato con
 *    https://oauth2.googleapis.com/token (grant jwt-bearer); l'indirizzo del service
 *    account va aggiunto come utente della proprietà in Search Console;
 *  - OAuth 2.0 (account Google di Giovanni): codice di autorizzazione → refresh token
 *    cifrato AES-256-GCM con SEO_TOKEN_KEY e salvato in una tabella non leggibile dagli utenti.
 * Ambito: sola lettura (webmasters.readonly; business.manage solo per GBP se approvato).
 * API:
 *  - Search Analytics: POST https://www.googleapis.com/webmasters/v3/sites/{site}/searchAnalytics/query
 *    (rowLimit max 25.000, paginazione con startRow, dataState final|all, dimensione brandedClassification)
 *  - URL Inspection: POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect
 *  - Sitemaps: GET https://www.googleapis.com/webmasters/v3/sites/{site}/sitemaps
 *  - Business Profile Performance: GET https://businessprofileperformance.googleapis.com/v1/{location}:fetchMultiDailyMetricsTimeSeries
 * Nessuno scraping dei risultati di ricerca.
 */
import { createSign, createCipheriv, createDecipheriv, randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';

export const SCOPES = {
  gsc: 'https://www.googleapis.com/auth/webmasters.readonly',
  gbp: 'https://www.googleapis.com/auth/business.manage'
};
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export class GoogleError extends Error {
  constructor(message, { status, retryable = false, quota = false } = {}) { super(message); this.status = status; this.retryable = retryable; this.quota = quota; }
}

const b64url = (b) => Buffer.from(b).toString('base64url');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function googleConfig(env = process.env) {
  let sa = null;
  if (env.GSC_SERVICE_ACCOUNT_JSON) {
    try {
      const j = JSON.parse(env.GSC_SERVICE_ACCOUNT_JSON);
      if (j.client_email && j.private_key) sa = { clientEmail: j.client_email, privateKey: j.private_key };
    } catch { sa = null; }
  }
  const oauth = env.GOOGLE_OAUTH_CLIENT_ID && env.GOOGLE_OAUTH_CLIENT_SECRET && env.GOOGLE_OAUTH_REDIRECT_URI
    ? { clientId: env.GOOGLE_OAUTH_CLIENT_ID, clientSecret: env.GOOGLE_OAUTH_CLIENT_SECRET, redirectUri: env.GOOGLE_OAUTH_REDIRECT_URI } : null;
  const tokenKey = env.SEO_TOKEN_KEY && Buffer.from(env.SEO_TOKEN_KEY, 'base64').length === 32 ? Buffer.from(env.SEO_TOKEN_KEY, 'base64') : null;
  return { serviceAccount: sa, oauth, tokenKey, ready: Boolean(sa || (oauth && tokenKey)) };
}

/* ---------------------------------------------------------------- cifratura del refresh token */
export function encryptToken(plain, key) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([c.update(String(plain), 'utf8'), c.final()]);
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), tag: c.getAuthTag().toString('base64') };
}
export function decryptToken({ ciphertext, iv, tag }, key) {
  const d = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));
  d.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([d.update(Buffer.from(ciphertext, 'base64')), d.final()]).toString('utf8');
}

/* ---------------------------------------------------------------- stato OAuth firmato */
export const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');
export function newState() { return randomBytes(24).toString('base64url'); }

/* ---------------------------------------------------------------- token di accesso */
async function postForm(fetchImpl, url, params) {
  const res = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params).toString() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new GoogleError(`Autorizzazione Google non riuscita: ${data.error || res.status}`, { status: res.status });
  return data;
}

export async function serviceAccountToken({ clientEmail, privateKey }, scope, { fetchImpl = fetch, now = Date.now() } = {}) {
  const iat = Math.floor(now / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(JSON.stringify({ iss: clientEmail, scope, aud: TOKEN_URL, iat, exp: iat + 3600 }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${signer.sign(privateKey).toString('base64url')}`;
  const t = await postForm(fetchImpl, TOKEN_URL, { grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt });
  return t.access_token;
}

export function oauthAuthUrl({ clientId, redirectUri }, state, scope = SCOPES.gsc) {
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.search = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: 'code', scope, access_type: 'offline', prompt: 'consent',
    include_granted_scopes: 'true', state }).toString();
  return u.href;
}
export const oauthExchange = ({ clientId, clientSecret, redirectUri }, code, { fetchImpl = fetch } = {}) =>
  postForm(fetchImpl, TOKEN_URL, { grant_type: 'authorization_code', code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri });
export async function oauthRefresh({ clientId, clientSecret }, refreshToken, { fetchImpl = fetch } = {}) {
  return (await postForm(fetchImpl, TOKEN_URL, { grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId, client_secret: clientSecret })).access_token;
}

/* ---------------------------------------------------------------- chiamate con nuovi tentativi limitati */
async function call(fetchImpl, url, token, { method = 'GET', body, retries = 2 } = {}) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetchImpl(url, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (res.ok) return res.json();
    const data = await res.json().catch(() => ({}));
    const quota = res.status === 429 || /quota|rate/i.test(data?.error?.status || '');
    const retryable = quota || res.status >= 500;
    if (retryable && attempt < retries) { await sleep(500 * 2 ** attempt); continue; }
    throw new GoogleError(`Google API ${res.status}: ${data?.error?.message || 'errore'}`.slice(0, 300), { status: res.status, retryable, quota });
  }
}

/**
 * Search Analytics con paginazione (startRow) fino a esaurimento o al limite di sicurezza.
 * Restituisce { rows, firstIncompleteDate, pages }.
 */
export async function searchAnalytics(token, siteUrl, body, { fetchImpl = fetch, maxRows = 100000, rowLimit = 25000 } = {}) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const rows = []; let startRow = 0; let firstIncompleteDate = null; let pages = 0;
  for (;;) {
    const r = await call(fetchImpl, url, token, { method: 'POST', body: { ...body, rowLimit, startRow } });
    pages++;
    firstIncompleteDate ||= r.metadata?.first_incomplete_date || null;
    const batch = r.rows || [];
    rows.push(...batch);
    if (batch.length < rowLimit || rows.length >= maxRows) break;
    startRow += rowLimit;
  }
  return { rows, firstIncompleteDate, pages, truncated: rows.length >= maxRows };
}

export const inspectUrl = (token, siteUrl, inspectionUrl, { fetchImpl = fetch } = {}) =>
  call(fetchImpl, 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', token, { method: 'POST', body: { inspectionUrl, siteUrl, languageCode: 'it-IT' } });

export const listSitemaps = (token, siteUrl, { fetchImpl = fetch } = {}) =>
  call(fetchImpl, `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/sitemaps`, token);

export const GBP_METRICS = ['BUSINESS_IMPRESSIONS_DESKTOP_MAPS', 'BUSINESS_IMPRESSIONS_DESKTOP_SEARCH', 'BUSINESS_IMPRESSIONS_MOBILE_MAPS', 'BUSINESS_IMPRESSIONS_MOBILE_SEARCH',
  'CALL_CLICKS', 'WEBSITE_CLICKS', 'BUSINESS_DIRECTION_REQUESTS'];
export function gbpMetrics(token, location, from, to, { fetchImpl = fetch } = {}) {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  const q = new URLSearchParams();
  for (const m of GBP_METRICS) q.append('dailyMetrics', m);
  Object.entries({ 'dailyRange.startDate.year': fy, 'dailyRange.startDate.month': fm, 'dailyRange.startDate.day': fd, 'dailyRange.endDate.year': ty,
    'dailyRange.endDate.month': tm, 'dailyRange.endDate.day': td }).forEach(([k, v]) => q.append(k, String(v)));
  return call(fetchImpl, `https://businessprofileperformance.googleapis.com/v1/${location}:fetchMultiDailyMetricsTimeSeries?${q}`, token);
}

/* ---------------------------------------------------------------- utilità per le righe */
/** Raggruppa le righe [date, chiave] per giorno nel formato di seo_ingest_rows. */
export function groupByDate(rows, withKey = true) {
  const out = new Map();
  for (const r of rows) {
    const [date, key] = r.keys || [];
    if (!date) continue;
    if (!out.has(date)) out.set(date, []);
    out.get(date).push({ key: withKey ? key : '', clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position });
  }
  return out;
}

/** Verifica della firma dei webhook Netlify (JWS HS256 con segreto condiviso). */
export function verifyNetlifyJws(token, secret, body) {
  try {
    const [h, p, s] = String(token || '').split('.');
    const expected = createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
    if (!s || s.length !== expected.length || !timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return false;
    const claims = JSON.parse(Buffer.from(p, 'base64url').toString());
    return claims.iss === 'netlify' && claims.sha256 === createHash('sha256').update(body).digest('hex');
  } catch { return false; }
}

/** Ottiene un token di accesso per una proprietà (service account o OAuth). */
export async function accessTokenFor(property, { cfg, api, svc, fetchImpl = fetch }) {
  if (property.authMethod === 'service_account' || (!property.authMethod && cfg.serviceAccount)) {
    if (!cfg.serviceAccount) throw new GoogleError('Service account non configurato');
    return serviceAccountToken(cfg.serviceAccount, SCOPES.gsc, { fetchImpl });
  }
  if (property.authMethod === 'oauth') {
    if (!cfg.oauth || !cfg.tokenKey) throw new GoogleError('OAuth non configurato');
    const rows = await api.select(`seo_oauth_tokens?property_id=eq.${property.id}&select=ciphertext,iv,tag`, svc);
    if (!rows?.length) throw new GoogleError('Proprietà non autorizzata: collegare l’account Google dalla dashboard');
    return oauthRefresh(cfg.oauth, decryptToken(rows[0], cfg.tokenKey), { fetchImpl });
  }
  throw new GoogleError('Metodo di accesso non impostato per la proprietà');
}
