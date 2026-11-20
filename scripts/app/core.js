/**
 * Nucleo delle aree riservate: client Supabase minimale (Auth, REST, RPC, Storage)
 * e utilità di interfaccia. Nessuna dipendenza; solo la chiave ANONIMA nel browser:
 * i permessi sono garantiti dalle regole RLS del database.
 */

export const config = (() => {
  try { return JSON.parse(document.getElementById('app-config')?.textContent || '{}'); } catch { return {}; }
})();
export const backendReady = Boolean(config.supabaseUrl && config.supabaseAnonKey);
/** Funzionalità attive (lette dal database alla build, Prompt 9). Valore assente = non attiva.
 *  È solo l'interfaccia: i permessi restano verificati dal database e dalle funzioni server. */
export const flagOn = (key) => Boolean(config.flags && config.flags[key] === true);

/* ---------------------------------------------------------------- DOM sicuro */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'html') throw new Error('innerHTML non consentito');
    // Prompt 8: niente URL eseguibili da dati (oltre al blocco della CSP)
    else if ((k === 'href' || k === 'src' || k === 'action' || k === 'formaction') && /^\s*(javascript:|vbscript:|data:(?!image\/(png|jpe?g|webp|gif);))/i.test(String(v))) continue;
    else el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}
export const clear = (el) => { while (el.firstChild) el.firstChild.remove(); return el; };
/** Svuota e riempie un elemento, ignorando valori nulli e appiattendo gli array. */
export const fill = (el, ...children) => { clear(el); el.append(...children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false)); return el; };
export const euro = (cents) => (cents === null || cents === undefined ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: cents % 100 ? 2 : 0, useGrouping: 'always' }).format(cents / 100));
export const date = (d) => (d ? new Date(d).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' }) : '—');
export const dateTime = (d) => (d ? new Date(d).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'short', timeStyle: 'short' }) : '—');

export function notice(type, text) { return h('div', { class: `app-notice app-notice--${type}`, role: type === 'error' ? 'alert' : 'status' }, text); }
export function badge(text, tone = 'neutral') { return h('span', { class: `app-badge app-badge--${tone}` }, text); }

export const STATUS_LABELS = {
  requested: ['Richiesto', 'neutral'], scheduled: ['Programmato', 'info'], in_progress: ['In corso', 'info'], completed: ['Completato', 'warn'],
  verified: ['Verificato', 'ok'], cancelled: ['Annullato', 'neutral'], pending_payment: ['In attesa di pagamento', 'warn'], active: ['Attivo', 'ok'],
  expired: ['Scaduto', 'neutral'], withdrawn: ['Receduto', 'neutral'], received: ['Ricevuta', 'info'], in_review: ['In valutazione', 'warn'],
  inspection_scheduled: ['Sopralluogo programmato', 'info'], resolved: ['Risolta', 'ok'], not_accepted: ['Non accolta', 'neutral'],
  pending: ['In attesa', 'warn'], paid: ['Pagato', 'ok'], failed: ['Non riuscito', 'error'], refunded: ['Rimborsato', 'neutral'],
  draft: ['Bozza', 'warn'], published: ['Pubblicato', 'ok'], archived: ['Archiviato', 'neutral'], valid: ['Valido', 'ok'],
  superseded: ['Sostituito', 'neutral'], revoked: ['Revocato', 'error'], sent: ['Inviata', 'ok'], not_sent: ['Non inviata', 'neutral'],
  skipped_no_consent: ['Non inviata (consenso)', 'neutral']
};
export const statusBadge = (s) => badge(...(STATUS_LABELS[s] || [s, 'neutral']));

/* ---------------------------------------------------------------- sessione */
const KEY = 'pir.session';
const store = {
  get() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } },
  set(v) { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch { /* storage non disponibile */ } }
};

async function http(path, { method = 'GET', body, token, headers = {}, raw = false } = {}) {
  const res = await fetch(`${config.supabaseUrl}${path}`, {
    method,
    headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${token || config.supabaseAnonKey}`, ...(body && !(body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body instanceof Blob ? body : body !== undefined ? JSON.stringify(body) : undefined
  });
  if (raw) return res;
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(data?.message || data?.msg || data?.error_description || `Errore ${res.status}`);
  return data;
}

export const auth = {
  session: store.get(),
  /** Recupera la sessione dal link di accesso (#access_token=…). */
  fromUrl() {
    if (!location.hash.includes('access_token=')) return;
    const p = new URLSearchParams(location.hash.slice(1));
    this.save({ access_token: p.get('access_token'), refresh_token: p.get('refresh_token'), expires_at: Math.floor(Date.now() / 1000) + Number(p.get('expires_in') || 3600) });
    history.replaceState(null, '', location.pathname + location.search);
  },
  save(s) { this.session = s; store.set(s); },
  async sendCode(email) {
    return http('/auth/v1/otp', { method: 'POST', body: { email, create_user: flagOn('customer_registration'), options: { email_redirect_to: location.origin + location.pathname } } });
  },
  async verifyCode(email, code) {
    const s = await http('/auth/v1/verify', { method: 'POST', body: { type: 'email', email, token: code } });
    this.save({ access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at || Math.floor(Date.now() / 1000) + (s.expires_in || 3600) });
  },
  async token() {
    const s = this.session;
    if (!s) return null;
    if (s.expires_at && s.expires_at - 60 < Date.now() / 1000) {
      try {
        const n = await http('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: s.refresh_token } });
        this.save({ access_token: n.access_token, refresh_token: n.refresh_token, expires_at: n.expires_at || Math.floor(Date.now() / 1000) + (n.expires_in || 3600) });
      } catch { this.save(null); return null; }
    }
    return this.session.access_token;
  },
  async user() { const t = await this.token(); return t ? http('/auth/v1/user', { token: t }).catch(() => null) : null; },
  async signOut() {
    const t = await this.token();
    if (t) await http('/auth/v1/logout', { method: 'POST', token: t }).catch(() => {});
    this.save(null);
  }
};

export const db = {
  async select(path) { return http(`/rest/v1/${path}`, { token: await auth.token() }); },
  async insert(table, row) { return http(`/rest/v1/${table}`, { method: 'POST', body: row, token: await auth.token(), headers: { Prefer: 'return=representation' } }); },
  async update(path, patch) { return http(`/rest/v1/${path}`, { method: 'PATCH', body: patch, token: await auth.token(), headers: { Prefer: 'return=representation' } }); },
  async remove(path) { return http(`/rest/v1/${path}`, { method: 'DELETE', token: await auth.token() }); },
  async rpc(fn, args = {}) { return http(`/rest/v1/rpc/${fn}`, { method: 'POST', body: args, token: await auth.token() }); },
  async upload(bucket, path, file) { return http(`/storage/v1/object/${bucket}/${path}`, { method: 'POST', body: file, token: await auth.token(), headers: { 'x-upsert': 'false', 'Content-Type': file.type || 'application/octet-stream' } }); }
};

/** Chiamata a una Netlify Function con il token dell'utente. */
export async function fn(name, { method = 'GET', body, query = '', headers = {} } = {}) {
  const t = auth.session ? await auth.token() : null;
  return fetch(`/.netlify/functions/${name}${query}`, {
    method,
    headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
}

/* ---------------------------------------------------------------- schermate comuni */
export function notConfiguredView(root, what) {
  fill(root, 
    h('div', { class: 'app-card app-card--center' },
      h('h2', {}, `${what} non ancora attiva`),
      h('p', {}, 'Il backend (Supabase) non è ancora collegato a questo sito: l’area è predisposta ma non operativa, quindi non mostra dati.'),
      h('p', { class: 'app-muted' }, 'Per richiedere un intervento o segnalare un problema su un lavoro eseguito, usa i contatti del sito.'),
      h('a', { class: 'btn btn--primary', href: '/#contatti' }, 'Vai ai contatti'))
  );
}

export function loginView(root, { title, onLogged }) {
  const email = h('input', { type: 'email', id: 'login-email', required: true, autocomplete: 'email' });
  const code = h('input', { type: 'text', id: 'login-code', inputmode: 'numeric', autocomplete: 'one-time-code', pattern: '[0-9]{6}', maxlength: '6' });
  const status = h('div', { class: 'app-form-status', role: 'status', 'aria-live': 'polite' });
  const step2 = h('div', { class: 'app-login__code', hidden: true },
    h('label', { for: 'login-code' }, 'Codice di 6 cifre ricevuto via email'), code,
    h('button', { class: 'btn btn--primary btn--block', type: 'button', onclick: async () => {
      try { await auth.verifyCode(email.value.trim(), code.value.trim()); onLogged(); } catch (e) { clear(status).append(notice('error', e.message)); }
    } }, 'Accedi'));
  const form = h('form', { class: 'app-card app-login', onsubmit: async (e) => {
    e.preventDefault();
    clear(status);
    try {
      await auth.sendCode(email.value.trim());
      step2.hidden = false;
      status.append(notice('info', 'Ti abbiamo inviato un’email con un link di accesso e un codice.'));
    } catch (err) { status.append(notice('error', err.message)); }
  } },
    h('h2', {}, title),
    h('p', { class: 'app-muted' }, flagOn('customer_registration')
      ? 'Accesso senza password: ricevi un link e un codice all’indirizzo email.'
      : 'Accesso senza password per gli account già attivati o invitati: ricevi un link e un codice all’indirizzo email.'),
    h('label', { for: 'login-email' }, 'Email'), email,
    h('button', { class: 'btn btn--primary btn--block', type: 'submit' }, 'Invia link di accesso'),
    step2, status);
  fill(root, form);
}

export async function boot(root, { title, requireRole = null, render, customerArea = false }) {
  if (!backendReady) return notConfiguredView(root, title);
  // area clienti con accesso clienti disattivato: nessun modulo di accesso utilizzabile
  if (customerArea && !flagOn('customer_login')) {
    return fill(root, h('div', { class: 'app-card app-card--center' }, h('h2', {}, `${title}: accesso non ancora attivo`),
      h('p', {}, 'L’accesso riservato ai clienti non è ancora disponibile. Le richieste di intervento si inviano dalla pagina contatti.'),
      h('a', { class: 'btn btn--primary', href: '/#contatti' }, 'Vai ai contatti')));
  }
  auth.fromUrl();
  const start = async () => {
    const user = await auth.user();
    if (!user) return loginView(root, { title, onLogged: start });
    const [profile] = (await db.select(`profiles?id=eq.${user.id}&select=*`)) || [];
    if (requireRole && !requireRole.includes(profile?.role)) {
      fill(root, h('div', { class: 'app-card app-card--center' }, h('h2', {}, 'Accesso non autorizzato'),
        h('p', {}, 'Questa area è riservata. Se ritieni sia un errore contatta l’amministratore.'),
        h('button', { class: 'btn btn--ghost', type: 'button', onclick: async () => { await auth.signOut(); start(); } }, 'Esci')));
      return;
    }
    await render({ user, profile, restart: start });
  };
  try { await start(); } catch (e) { fill(root, notice('error', `Errore di caricamento: ${e.message}`)); }
}

export function table(cols, rows, { empty = 'Nessun elemento.' } = {}) {
  if (!rows?.length) return h('p', { class: 'app-muted' }, empty);
  return h('div', { class: 'table-wrap' }, h('table', { class: 'app-table' },
    h('thead', {}, h('tr', {}, cols.map((c) => h('th', { scope: 'col' }, c.label)))),
    h('tbody', {}, rows.map((r) => h('tr', {}, cols.map((c) => h('td', { 'data-label': c.label }, c.render ? c.render(r) : r[c.key] ?? '—')))))));
}

export function field(label, input, hint) {
  const id = input.id || `f-${Math.random().toString(36).slice(2, 8)}`;
  input.id = id;
  return h('div', { class: 'field' }, h('label', { for: id }, label), input, hint ? h('small', { class: 'app-muted' }, hint) : null);
}

export async function downloadCertificate(number) {
  const r = await fn('certificate-pdf', { query: `?n=${encodeURIComponent(number)}` });
  if (!r.ok) throw new Error(r.status === 503 ? 'Generazione PDF non ancora configurata' : 'Certificato non disponibile');
  const url = URL.createObjectURL(await r.blob());
  window.open(url, '_blank', 'noopener');
}

/** Invia il form firmato a myPOS (l'attivazione avviene solo con la notifica server-side). */
export function submitCheckout(checkout) {
  const f = h('form', { method: 'POST', action: checkout.action, hidden: true });
  for (const [k, v] of Object.entries(checkout.params)) f.append(h('input', { type: 'hidden', name: k, value: v }));
  document.body.append(f);
  f.submit();
}

/** Scarica un PDF generato da una Netlify Function con il token dell'utente. */
export async function openPdf(name, query, what = 'Documento') {
  const r = await fn(name, { query });
  if (!r.ok) throw new Error(r.status === 503 ? 'Generazione PDF non ancora configurata' : `${what} non disponibile`);
  window.open(URL.createObjectURL(await r.blob()), '_blank', 'noopener');
}
