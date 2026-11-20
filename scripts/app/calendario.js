/**
 * CALENDARIO INTERVENTI — /admin/calendario/
 * Vista giornaliera, settimanale e mensile di tutte le attività in calendario:
 * interventi, sopralluoghi, richieste aziendali, visite di manutenzione e
 * controlli Lavoro Protetto (RPC calendar_range). Spostamenti con controllo dei
 * conflitti e storico (RPC reschedule_appointment). Nessuna notifica parte
 * finché non è configurato un provider.
 */
import { h, fill, notice, boot, db, field } from './core.js';
import { opsBar, opsBadge, modal, combine, toDateInput, options, flashIn, timeOf } from './ops-common.js';
import { ENTRY_KIND_LABELS, weekDays, monthGrid } from '../lib/operations.js';

const root = document.getElementById('app');
let me; let restartFn; let cats = []; let techs = [];
const KEY = 'pir.cal';
const saved = (() => { try { return JSON.parse(sessionStorage.getItem(KEY) || '{}'); } catch { return {}; } })();
const state = { view: saved.view || 'week', anchor: new Date(), technician: saved.technician || '', category: saved.category || '', zone: saved.zone || '' };
const remember = () => { try { sessionStorage.setItem(KEY, JSON.stringify({ view: state.view, technician: state.technician, category: state.category, zone: state.zone })); } catch { /* facoltativo */ } };

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const dayLabel = (d, o = { weekday: 'long', day: 'numeric', month: 'long' }) => d.toLocaleDateString('it-IT', o);

function range() {
  const a = state.anchor;
  if (state.view === 'day') return [new Date(a.getFullYear(), a.getMonth(), a.getDate()), new Date(a.getFullYear(), a.getMonth(), a.getDate() + 1)];
  if (state.view === 'week') { const w = weekDays(a); return [w[0], new Date(w[6].getFullYear(), w[6].getMonth(), w[6].getDate() + 1)]; }
  const g = monthGrid(a); return [g[0], new Date(g[41].getFullYear(), g[41].getMonth(), g[41].getDate() + 1)];
}

function chip(e, { compact = false } = {}) {
  return h('button', { class: `cal-chip cal-chip--${e.kind}${e.urgent ? ' cal-chip--urgent' : ''}${e.technicianId ? '' : ' cal-chip--unassigned'}`, type: 'button', onclick: () => entryDialog(e),
    'aria-label': `${ENTRY_KIND_LABELS[e.kind]} ${e.number} alle ${timeOf(e.startsAt)}${e.urgent ? ', urgente' : ''}` },
    h('span', { class: 'cal-chip__time' }, `${timeOf(e.startsAt)}${compact ? '' : `–${timeOf(e.endsAt)}`}`),
    h('span', { class: 'cal-chip__title' }, compact ? e.number : `${e.number} · ${e.title}`),
    compact ? null : h('span', { class: 'cal-chip__meta' }, `${e.technicianName || 'Da assegnare'}${e.city ? ` · ${e.city}` : ''}`),
    e.urgent ? h('span', { class: 'cal-chip__flag' }, 'URGENTE') : null);
}

function entryDialog(e) {
  const st = h('div', { role: 'status' });
  const start = new Date(e.startsAt); const end = new Date(e.endsAt);
  const day = h('input', { type: 'date', value: toDateInput(start) });
  const s = h('input', { type: 'time', value: timeOf(start) }); const en = h('input', { type: 'time', value: timeOf(end) });
  const t = h('select', {}, options(techs.filter((x) => x.active).map((x) => [x.id, x.display_name]), e.technicianId));
  const reason = h('input', { type: 'text', placeholder: 'es. richiesta del cliente' });
  const ov = h('textarea', { rows: 2, placeholder: 'Solo se ci sono conflitti: motivazione per confermare' });
  const dlg = modal(`${ENTRY_KIND_LABELS[e.kind]} ${e.number}`,
    h('dl', { class: 'ops-kv' },
      h('div', {}, h('dt', {}, 'Attività'), h('dd', {}, e.title)), h('div', {}, h('dt', {}, 'Quando'), h('dd', {}, `${dayLabel(start)} · ${timeOf(start)}–${timeOf(end)}${e.slot ? ` (${e.slot})` : ''}`)),
      h('div', {}, h('dt', {}, 'Tecnico'), h('dd', {}, e.technicianName || 'Da assegnare')), h('div', {}, h('dt', {}, 'Cliente'), h('dd', {}, e.customer || '—')),
      h('div', {}, h('dt', {}, 'Zona'), h('dd', {}, e.city || '—')), h('div', {}, h('dt', {}, 'Stato'), h('dd', {}, opsBadge(e.status, e.statusLabel)))),
    (e.warnings || []).length ? notice('warn', `Avvisi registrati all’assegnazione: ${e.warnings.map((w) => w.message).join('; ')}`) : null,
    e.targetKind === 'intervention' ? h('a', { class: 'btn btn--ghost btn--sm', href: `/admin/centrale-operativa/#r=${e.targetId}` }, 'Apri nella centrale') : null,
    e.assignmentId && me.perm.assign ? h('form', { class: 'ops-form', onsubmit: async (ev) => {
      ev.preventDefault();
      try {
        const r = await db.rpc('reschedule_appointment', { p_assignment: e.assignmentId, p_start: combine(day.value, s.value), p_end: combine(day.value, en.value), p_reason: reason.value,
          p_technician: t.value || null, p_override_reason: ov.value || null });
        dlg.close(); flashIn(root, `Appuntamento spostato${r.warnings?.length ? ` (${r.warnings.length} avvisi)` : ''}. Lo storico della riprogrammazione è conservato.`); render();
      } catch (err) { fill(st, notice('error', err.message)); }
    } }, h('h3', {}, 'Sposta appuntamento'),
    h('div', { class: 'app-form-grid' }, field('Giorno', day), field('Dalle', s), field('Alle', en), field('Tecnico', t)), field('Motivo (obbligatorio)', reason), field('Conferma nonostante i conflitti', ov),
    h('button', { class: 'btn btn--primary', type: 'submit' }, 'Sposta'), st)
      : !e.assignmentId ? h('p', { class: 'app-muted' }, 'Attività senza tecnico: assegnala dalla centrale operativa.') : null);
  return dlg;
}

function dayView(entries) {
  const d = state.anchor;
  const list = entries.filter((e) => sameDay(new Date(e.startsAt), d));
  const byTech = new Map();
  for (const e of list) { const k = e.technicianName || 'Da assegnare'; if (!byTech.has(k)) byTech.set(k, []); byTech.get(k).push(e); }
  return h('div', { class: 'cal-day' }, h('h2', {}, dayLabel(d)), list.length ? [...byTech.entries()].map(([name, xs]) => h('section', { class: 'cal-day__tech' },
    h('h3', {}, name, h('small', {}, ` · ${xs.length} attività`)), h('div', { class: 'cal-day__list' }, xs.map((e) => chip(e)))))
    : h('p', { class: 'app-muted' }, 'Nessuna attività in calendario.'));
}

function weekView(entries) {
  return h('div', { class: 'cal-week' }, weekDays(state.anchor).map((d) => {
    const xs = entries.filter((e) => sameDay(new Date(e.startsAt), d));
    return h('section', { class: `cal-week__day${sameDay(d, new Date()) ? ' is-today' : ''}` },
      h('h3', {}, h('button', { class: 'cal-link', type: 'button', onclick: () => { state.view = 'day'; state.anchor = d; render(); } }, dayLabel(d, { weekday: 'short', day: 'numeric', month: 'short' }))),
      xs.length ? xs.map((e) => chip(e)) : h('p', { class: 'cal-empty' }, '—'));
  }));
}

function monthView(entries) {
  const a = state.anchor;
  return h('div', { class: 'cal-month', role: 'grid' }, ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map((x) => h('div', { class: 'cal-month__head', role: 'columnheader' }, x)),
    monthGrid(a).map((d) => {
      const xs = entries.filter((e) => sameDay(new Date(e.startsAt), d));
      return h('div', { class: `cal-month__cell${d.getMonth() !== a.getMonth() ? ' is-out' : ''}${sameDay(d, new Date()) ? ' is-today' : ''}`, role: 'gridcell' },
        h('button', { class: 'cal-link', type: 'button', onclick: () => { state.view = 'day'; state.anchor = d; render(); } }, String(d.getDate())),
        xs.slice(0, 3).map((e) => chip(e, { compact: true })), xs.length > 3 ? h('span', { class: 'cal-more' }, `+${xs.length - 3}`) : null);
    }));
}

async function render() {
  remember();
  const body = h('div', { class: 'ops-page' });
  fill(root, opsBar(me, restartFn), body);
  const [from, to] = range();
  const move = (n) => { const a = state.anchor; state.anchor = state.view === 'day' ? new Date(a.getFullYear(), a.getMonth(), a.getDate() + n)
    : state.view === 'week' ? new Date(a.getFullYear(), a.getMonth(), a.getDate() + 7 * n) : new Date(a.getFullYear(), a.getMonth() + n, 1); render(); };
  const tsel = h('select', { 'aria-label': 'Filtra per tecnico' }, options(techs.map((t) => [t.id, t.display_name]), state.technician, { empty: 'Tutti i tecnici' }));
  const csel = h('select', { 'aria-label': 'Filtra per categoria' }, options(cats.map((c) => [c.id, c.name]), state.category, { empty: 'Tutte le categorie' }));
  const zone = h('input', { type: 'search', value: state.zone, placeholder: 'Zona / comune', 'aria-label': 'Filtra per zona' });
  tsel.addEventListener('change', () => { state.technician = tsel.value; render(); });
  csel.addEventListener('change', () => { state.category = csel.value; render(); });
  zone.addEventListener('change', () => { state.zone = zone.value.trim(); render(); });
  const viewBtn = (v, l) => h('button', { class: `btn btn--sm ${state.view === v ? 'btn--primary' : 'btn--ghost'}`, type: 'button', 'aria-pressed': String(state.view === v), onclick: () => { state.view = v; render(); } }, l);
  const title = state.view === 'month' ? state.anchor.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
    : state.view === 'week' ? `Settimana dal ${dayLabel(from, { day: 'numeric', month: 'long' })}` : dayLabel(state.anchor, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const out = h('div', { 'aria-live': 'polite' }, h('p', { class: 'app-muted' }, 'Caricamento…'));
  fill(body,
    h('div', { class: 'ops-head' }, h('div', {}, h('p', { class: 'eyebrow' }, 'Calendario interventi'), h('h1', { class: 'section-title app-h1' }, title)),
      h('div', { class: 'app-actions' }, viewBtn('day', 'Giorno'), viewBtn('week', 'Settimana'), viewBtn('month', 'Mese'))),
    h('div', { class: 'ops-filters' },
      h('div', { class: 'app-actions' }, h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => move(-1), 'aria-label': 'Periodo precedente' }, '←'),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => { state.anchor = new Date(); render(); } }, 'Oggi'),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => move(1), 'aria-label': 'Periodo successivo' }, '→')),
      tsel, csel, zone),
    h('ul', { class: 'cal-legend', 'aria-label': 'Legenda' }, Object.entries(ENTRY_KIND_LABELS).map(([k, l]) => h('li', { class: `cal-legend--${k}` }, l)), h('li', { class: 'cal-legend--urgent' }, 'Urgente')),
    out);
  try {
    const entries = await db.rpc('calendar_range', { p_from: from.toISOString(), p_to: to.toISOString(), p_technician: state.technician || null, p_category: state.category || null, p_zone: state.zone || null });
    fill(out, state.view === 'day' ? dayView(entries) : state.view === 'week' ? weekView(entries) : monthView(entries),
      h('p', { class: 'app-muted' }, `${entries.length} attività nel periodo. Le comunicazioni ai clienti partono solo con un provider di notifica configurato.`));
  } catch (err) { fill(out, notice('error', err.message)); }
}

if (root) {
  boot(root, {
    title: 'Calendario interventi',
    requireRole: ['admin', 'operator'],
    render: async ({ profile, restart }) => {
      const perms = profile.role === 'admin' ? null : (await db.select('role_permissions?select=permission&role=eq.operator')).map((p) => p.permission);
      me = { ...profile, perm: { assign: profile.role === 'admin' || perms.includes('ops.assign') } };
      restartFn = restart;
      [cats, techs] = await Promise.all([db.select('service_categories?select=id,name&order=sort'), db.select('technicians?select=id,display_name,active&order=display_name')]);
      await render();
    }
  });
}
