/**
 * Elementi comuni della centrale operativa (Prompt 5): barra di navigazione,
 * badge di stato, finestre di dialogo, conversione date e importi.
 * Nessun dato dimostrativo: tutto ciò che è mostrato arriva dal database.
 */
import { h, fill, notice, badge, auth } from './core.js';
import { opLabel, OP_TONE, PAYMENT_STATE_LABELS, URGENCY_LABELS, PRIORITY_LABELS } from '../lib/operations.js';

export const OPS_LINKS = [
  ['/admin/centrale-operativa/', 'Centrale operativa', ['admin', 'operator']],
  ['/admin/calendario/', 'Calendario', ['admin', 'operator']],
  ['/admin/tecnici/', 'Tecnici', ['admin', 'operator']],
  ['/admin/pronto-ai/', 'PRONTO AI', ['admin', 'operator']],
  ['/admin/seo/', 'PRONTO SEO', ['admin', 'operator']],
  ['/admin/setup/', 'Setup', ['admin']],
  ['/admin/funzionalita/', 'Funzionalità', ['admin', 'operator']],
  ['/admin/lancio/', 'Lancio', ['admin']],
  ['/admin/', 'Dashboard amministrativa', ['admin']]
];

/** Barra superiore della console: sezioni, utente, uscita. */
export function opsBar(profile, restart) {
  const role = profile?.role;
  return h('header', { class: 'ops-bar' },
    h('div', { class: 'ops-bar__brand' }, h('span', { class: 'ops-bar__dot', 'aria-hidden': 'true' }), h('span', {}, 'PRONTO INTERVENTO ', h('b', {}, 'ROMA')), h('small', {}, 'Console operativa')),
    h('nav', { class: 'ops-bar__nav', 'aria-label': 'Sezioni della console' },
      OPS_LINKS.filter(([, , roles]) => roles.includes(role)).map(([href, label]) =>
        h('a', { href, 'aria-current': location.pathname === href ? 'page' : null }, label))),
    h('div', { class: 'ops-bar__who' },
      h('span', {}, profile?.full_name || profile?.email || ''), badge(role === 'admin' ? 'Amministratore' : role === 'operator' ? 'Operatore' : role || '', 'info'),
      h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: async () => { await auth.signOut(); restart(); } }, 'Esci')));
}

export const opsBadge = (s, label) => h('span', { class: `app-badge app-badge--${OP_TONE[s] || 'neutral'} ops-status ops-status--${s}` }, label || opLabel(s));
export const paymentBadge = (s, label) => badge(label || PAYMENT_STATE_LABELS[s] || s || '—',
  { paid: 'ok', covered: 'ok', no_charge: 'neutral', requested: 'info', partially_paid: 'warn', to_request: 'warn', needs_review: 'error', refunded: 'neutral' }[s] || 'neutral');
export const urgencyBadge = (u, p) => {
  if (u === 'emergency' || p === 'urgent') return badge(u === 'emergency' ? 'Emergenza' : 'Urgente', 'error');
  if (u === 'high' || p === 'high') return badge(u === 'high' ? `Urgenza ${URGENCY_LABELS.high.toLowerCase()}` : `Priorità ${PRIORITY_LABELS.high.toLowerCase()}`, 'warn');
  return null;
};

/** Finestra di dialogo accessibile (elemento <dialog> nativo). */
export function modal(title, ...content) {
  const dlg = h('dialog', { class: 'ops-dialog', 'aria-label': title },
    h('div', { class: 'ops-dialog__head' }, h('h2', {}, title), h('button', { class: 'ops-dialog__x', type: 'button', 'aria-label': 'Chiudi', onclick: () => dlg.close() }, '×')),
    h('div', { class: 'ops-dialog__body' }, ...content));
  dlg.addEventListener('close', () => dlg.remove());
  document.body.append(dlg);
  dlg.showModal();
  return dlg;
}

/** Bottone con stato di attesa e messaggio d'errore nel contenitore indicato. */
export function actBtn(label, fnc, { cls = 'btn btn--ghost btn--sm', status } = {}) {
  return h('button', { class: cls, type: 'button', onclick: async (e) => {
    const b = e.currentTarget;
    b.disabled = true;
    try { await fnc(); } catch (err) { if (status) fill(status, notice('error', err.message)); else alert(err.message); } finally { b.disabled = false; }
  } }, label);
}

/* ---------------------------------------------------------------- date e importi */
const pad = (n) => String(n).padStart(2, '0');
/** Valore per <input type="datetime-local"> nell'ora del dispositivo. */
export const toLocalInput = (d) => { if (!d) return ''; const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`; };
export const toDateInput = (d) => { const x = new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };
export const fromLocalInput = (v) => (v ? new Date(v).toISOString() : null);
/** Data (yyyy-mm-dd) + ora (hh:mm) locali → ISO. */
export const combine = (day, time) => (day && time ? new Date(`${day}T${time}`).toISOString() : null);
export const timeOf = (d) => (d ? new Date(d).toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }) : '—');
export const dayOf = (d) => (d ? new Date(d).toLocaleDateString('it-IT', { timeZone: 'Europe/Rome', weekday: 'short', day: '2-digit', month: '2-digit' }) : '—');

export const toCents = (v) => {
  const s = String(v ?? '').replace(/\./g, '').replace(',', '.').trim();
  if (s === '') return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Importo non valido: ${v}`);
  return Math.round(Number(s) * 100);
};
export const centsToInput = (c) => (c ? (c / 100).toFixed(2).replace('.', ',') : '');

/** Opzioni <select>. */
export const options = (pairs, selected, { empty } = {}) => [
  empty !== undefined ? h('option', { value: '' }, empty) : null,
  ...pairs.map(([v, l]) => h('option', { value: v, selected: String(v) === String(selected ?? '') }, l))
];

/** Messaggio temporaneo in cima a un contenitore. */
export function flashIn(container, msg, type = 'ok') {
  const n = notice(type, msg);
  container.prepend(n);
  setTimeout(() => n.remove(), 6000);
}
