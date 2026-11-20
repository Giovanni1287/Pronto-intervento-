/**
 * CENTRALE OPERATIVA — /admin/centrale-operativa/
 * Ruoli: amministratore (tutto) e operatore di centrale (permessi in role_permissions).
 * Ogni dato e ogni conteggio arriva dal database (RPC con controlli di ruolo):
 * nessun numero casuale o dimostrativo. Stato, assegnazione, economia e chiusura
 * passano solo dalle funzioni validate lato server.
 */
import { h, fill, notice, boot, db, euro, date, dateTime, field, table, openPdf } from './core.js';
import { opsBar, opsBadge, paymentBadge, urgencyBadge, modal, actBtn, combine, toDateInput, toCents, centsToInput, options, flashIn, timeOf, dayOf } from './ops-common.js';
import { aiChatPanel } from './ai-chat-panel.js';
import { opLabel, needsNote, DASHBOARD_GROUPS, SOURCE_LABELS, URGENCY_LABELS, PRIORITY_LABELS, computeEconomics, withinAgreedPrice } from '../lib/operations.js';

const root = document.getElementById('app');
let me; let restartFn; let cats = []; let services = []; let techs = [];
const today = new Date();
const state = { from: toDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)), to: toDateInput(today),
  f: { group: '', categoryId: '', sourceKind: '', q: '', urgentOnly: false, coveredOnly: false, includeClosed: false } };

const GROUP_OPTIONS = [['', 'Tutti gli stati aperti'], ['waiting', 'In attesa'], ['toSchedule', 'Da programmare'], ['scheduled', 'Programmati'], ['technicianAssigned', 'Tecnico assegnato'],
  ['inProgress', 'In corso'], ['completed', 'Completati / in verifica'], ['closed', 'Chiusi'], ['cancelled', 'Annullati']];
const groupStatuses = (g) => (g === 'closed' ? ['closed'] : g === 'cancelled' ? ['cancelled'] : DASHBOARD_GROUPS[g]);
const catName = (id) => cats.find((c) => c.id === id)?.name || '—';

async function loadCatalog() {
  [cats, services, techs] = await Promise.all([
    db.select('service_categories?select=id,name&order=sort'),
    db.select('services?select=id,name,category_id&active=eq.true&order=id'),
    db.select('technicians?select=id,display_name,active&order=display_name')
  ]);
}

/* ================================================================ PANORAMICA: card, statistiche, elenco */
const CARDS = [
  ['received', 'Richieste ricevute', 'nel periodo', null], ['waiting', 'Richieste in attesa', 'nuove, in valutazione, preventivo', 'waiting'],
  ['toSchedule', 'Da programmare', 'anche preventivi accettati', 'toSchedule'], ['scheduled', 'Interventi programmati', 'senza tecnico', 'scheduled'],
  ['technicianAssigned', 'Tecnici assegnati', 'in attesa di partenza', 'technicianAssigned'], ['inProgress', 'Interventi in corso', 'in viaggio, sul posto, in corso', 'inProgress'],
  ['completed', 'Interventi completati', 'da verificare e chiudere', 'completed'], ['toInvoice', 'Da fatturare', 'importi da richiedere o fatture da collegare', null],
  ['paymentsPending', 'Pagamenti in sospeso', 'ordini in attesa o da verificare', null], ['postRequests', 'Richieste post-intervento', 'segnalazioni e visite', null],
  ['covered', 'Coperti da abbonamenti', 'PRONTO+ Family e B2B', 'covered'], ['reportsToReview', 'Rapporti da verificare', 'inviati dai tecnici', 'completed'],
  ['possibleDuplicates', 'Possibili duplicati', 'da controllare', 'waiting'], ['extraWorksPending', 'Lavorazioni aggiuntive', 'da autorizzare', null]
];

function kpiCard([key, label, hint, group], value) {
  const tone = { waiting: 'warn', toSchedule: 'warn', possibleDuplicates: 'warn', paymentsPending: 'info', toInvoice: 'info', reportsToReview: 'warn', extraWorksPending: 'warn' }[key] || 'base';
  const click = () => {
    if (key === 'postRequests') { location.href = '/admin/#richieste'; return; }
    if (key === 'paymentsPending' || key === 'toInvoice') { location.href = '/admin/#pagamenti'; return; }
    state.f.coveredOnly = group === 'covered';
    state.f.group = group && group !== 'covered' ? group : '';
    renderOverview();
  };
  return h('button', { class: `ops-kpi ops-kpi--${tone}`, type: 'button', onclick: click, 'aria-label': `${label}: ${value}` },
    h('span', { class: 'ops-kpi__label' }, label), h('strong', {}, String(value ?? '—')), h('small', {}, hint));
}

function bars(rows, labelKey, valueKey) {
  const max = Math.max(1, ...rows.map((r) => r[valueKey] || 0));
  if (!rows.length) return h('p', { class: 'app-muted' }, 'Nessun dato nel periodo.');
  return h('ul', { class: 'ops-bars' }, rows.map((r) => h('li', {}, h('span', {}, r[labelKey]), h('span', { class: 'ops-bars__track' },
    h('span', { class: 'ops-bars__fill', style: `width:${Math.round(((r[valueKey] || 0) * 100) / max)}%` })), h('b', {}, String(r[valueKey] || 0)))));
}

async function statsPanel() {
  const s = await db.rpc('ops_stats', { p_from: state.from, p_to: state.to });
  const mins = (m) => (m === null || m === undefined ? '—' : m < 120 ? `${m} min` : `${(m / 60).toFixed(1).replace('.', ',')} h`);
  const k = [
    ['Interventi oggi', s.today], ['Questa settimana', s.week], ['Questo mese', s.month], ['Richieste non assegnate', s.unassigned],
    ['Completati nel periodo', s.completed], ['Presa in carico media', mins(s.avgTakeChargeMinutes)], ['Completamento medio', s.avgCompletionHours == null ? '—' : `${String(s.avgCompletionHours).replace('.', ',')} h`],
    ['Incassi registrati', euro(s.collectedCents)], ['Interventi non pagati', s.unpaid]
  ];
  if (s.costs) k.push(['Costo operativo stimato', euro(s.costs.operatingCostCents)], ['Margine di contribuzione stimato', euro(s.costs.marginCents)]);
  return h('details', { class: 'app-card ops-stats', open: true },
    h('summary', {}, h('h2', {}, 'Statistiche aziendali'), h('span', { class: 'app-muted' }, `${date(s.period.from)} → ${date(s.period.to)}`)),
    h('div', { class: 'ops-mini' }, k.map(([l, v]) => h('div', {}, h('span', {}, l), h('strong', {}, String(v ?? '—'))))),
    h('div', { class: 'ops-cols' },
      h('section', {}, h('h3', {}, 'Interventi per categoria'), bars(s.byCategory, 'category', 'count')),
      h('section', {}, h('h3', {}, 'Interventi per tecnico'), bars(s.byTechnician, 'technician', 'assigned')),
      h('section', {}, h('h3', {}, 'Utilizzo dei pacchetti PRONTO+'),
        h('ul', { class: 'ops-facts' }, h('li', {}, `Prestazioni Family scalate dalla centrale: ${s.prontoPlus.coveragesConsumed}`), h('li', {}, `Consumi Family (totale): ${s.prontoPlus.familyUsages}`),
          h('li', {}, `Consumi Lavoro Protetto: ${s.prontoPlus.protectedUsages}`), h('li', {}, `Consumi Business/Hotel: ${s.prontoPlus.b2bUsages}`)),
        bars(s.prontoPlus.byPlan || [], 'plan', 'count'))),
    s.costs ? h('p', { class: 'app-muted' }, `Costi e margini sono stime sugli interventi chiusi nel periodo (${s.costs.closedInterventions}); ${s.costs.withoutCostData} senza costi interni registrati.`) : null,
    h('p', { class: 'app-muted' }, s.basis));
}

async function queueTable(out) {
  const p = { categoryId: state.f.categoryId || undefined, sourceKind: state.f.sourceKind || undefined, q: state.f.q || undefined,
    urgentOnly: state.f.urgentOnly || undefined, coveredOnly: state.f.coveredOnly || undefined, includeClosed: state.f.includeClosed || ['closed', 'cancelled'].includes(state.f.group) || undefined };
  if (state.f.group) p.statuses = groupStatuses(state.f.group);
  const rows = await db.rpc('ops_queue', { p });
  fill(out, table([
    { label: 'Richiesta', render: (r) => h('span', { class: 'ops-num' }, r.sourceKind === 'intervention' ? h('a', { href: `#r=${r.id}` }, r.number) : r.number,
      h('small', {}, `${dateTime(r.createdAt)} · ${SOURCE_LABELS[r.source] || r.source || '—'}${r.kind === 'inspection' ? ' · sopralluogo' : ''}`)) },
    { label: 'Cliente', render: (r) => h('span', {}, r.customer || '—', r.phone ? h('small', { class: 'ops-block' }, r.phone) : null) },
    { label: 'Categoria', render: (r) => h('span', {}, r.category || 'Da classificare', r.service ? h('small', { class: 'ops-block' }, r.service) : null) },
    { label: 'Zona', render: (r) => r.city || '—' },
    { label: 'Stato', render: (r) => h('span', { class: 'ops-stack' }, opsBadge(r.status, r.statusLabel), urgencyBadge(r.urgency, r.priority),
      r.possibleDuplicate && !r.duplicate ? h('span', { class: 'app-badge app-badge--warn' }, 'Possibile duplicato') : null, r.covered ? h('span', { class: 'app-badge app-badge--ok' }, 'PRONTO+') : null) },
    { label: 'Tecnico e data', render: (r) => (r.scheduledAt ? `${r.technician || 'Da assegnare'} · ${dayOf(r.scheduledAt)} ${timeOf(r.scheduledAt)}` : r.technician || '—') },
    { label: 'Pagamento', render: (r) => paymentBadge(r.paymentState, r.paymentStateLabel) },
    { label: '', render: (r) => (r.sourceKind === 'intervention' ? h('a', { class: 'btn btn--ghost btn--sm', href: `#r=${r.id}` }, 'Apri')
      : h('span', { class: 'ops-stack' }, me.role === 'admin' && ['in_review', 'to_schedule', 'scheduled', 'technician_assigned'].includes(r.status)
        ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => assignB2bDialog(r) }, 'Assegna') : null,
        me.role === 'admin' ? h('a', { class: 'btn btn--ghost btn--sm', href: '/admin/#b2b-richieste' }, 'Gestione B2B') : null)) }
  ], rows, { empty: 'Nessuna richiesta corrisponde ai filtri.' }));
}

async function renderOverview() {
  const body = h('div', { class: 'ops-page' }, h('p', { class: 'app-muted' }, 'Caricamento…'));
  fill(root, opsBar(me, restartFn), body);
  const from = h('input', { type: 'date', value: state.from, 'aria-label': 'Dal' });
  const to = h('input', { type: 'date', value: state.to, 'aria-label': 'Al' });
  const period = h('form', { class: 'ops-period', onsubmit: (e) => { e.preventDefault(); state.from = from.value; state.to = to.value; renderOverview(); } },
    h('label', {}, 'Periodo', from), h('label', {}, 'al', to), h('button', { class: 'btn btn--ghost btn--sm', type: 'submit' }, 'Aggiorna'));
  const [d, stats] = await Promise.all([db.rpc('ops_dashboard', { p_from: state.from, p_to: state.to }), statsPanel().catch((e) => notice('warn', `Statistiche non disponibili: ${e.message}`))]);
  const q = h('input', { type: 'search', value: state.f.q, placeholder: 'Numero, cliente, telefono, descrizione', 'aria-label': 'Cerca' });
  const grp = h('select', { 'aria-label': 'Stato' }, options(GROUP_OPTIONS, state.f.group));
  const cat = h('select', { 'aria-label': 'Categoria' }, options(cats.map((c) => [c.id, c.name]), state.f.categoryId, { empty: 'Tutte le categorie' }));
  const src = h('select', { 'aria-label': 'Origine' }, options([['intervention', 'Privati, sito e Family'], ['business_request', 'Aziende e hotel (B2B)']], state.f.sourceKind, { empty: 'Tutte le origini' }));
  const chk = (k, label) => { const c = h('input', { type: 'checkbox', checked: state.f[k] }); c.addEventListener('change', () => { state.f[k] = c.checked; reload(); }); return h('label', { class: 'chip-check' }, c, h('span', {}, label)); };
  const out = h('div', {}, h('p', { class: 'app-muted' }, 'Caricamento…'));
  const reload = () => queueTable(out).catch((e) => fill(out, notice('error', e.message)));
  let t;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { state.f.q = q.value.trim(); reload(); }, 300); });
  grp.addEventListener('change', () => { state.f.group = grp.value; reload(); });
  cat.addEventListener('change', () => { state.f.categoryId = cat.value; reload(); });
  src.addEventListener('change', () => { state.f.sourceKind = src.value; reload(); });
  fill(body,
    h('div', { class: 'ops-head' }, h('div', {}, h('p', { class: 'eyebrow' }, 'Pronto Intervento Roma'), h('h1', { class: 'section-title app-h1' }, 'Centrale operativa')),
      h('div', { class: 'app-actions' }, me.perm.manage ? h('button', { class: 'btn btn--primary', type: 'button', onclick: newRequestDialog }, '+ Nuova richiesta') : null,
        h('a', { class: 'btn btn--ghost', href: '/admin/calendario/' }, 'Calendario'))),
    period,
    h('section', { class: 'ops-kpis', 'aria-label': 'Indicatori operativi' }, CARDS.map((c) => kpiCard(c, d[c[0]]))),
    h('p', { class: 'app-muted ops-basis' }, d.basis),
    stats,
    h('section', { class: 'app-card' }, h('div', { class: 'ops-head' }, h('h2', {}, 'Richieste e interventi'), h('span', { class: 'app-muted' }, 'Ordinati per urgenza e data')),
      h('div', { class: 'ops-filters' }, q, grp, cat, src, chk('urgentOnly', 'Solo urgenti'), chk('coveredOnly', 'Solo PRONTO+'), chk('includeClosed', 'Includi chiusi')), out));
  reload();
}

/* ================================================================ NUOVA RICHIESTA (inserimento manuale) */
async function newRequestDialog() {
  const customers = await db.select('profiles?role=eq.customer&select=id,full_name,email,phone,properties(id,address_line,city)&order=full_name').catch(() => []);
  const st = h('div', { role: 'status' });
  const src = h('select', {}, options([['phone', 'Telefono'], ['admin', 'Inserimento manuale'], ['family', 'PRONTO+ Family'], ['business', 'PRONTO+ Business'], ['hotel', 'PRONTO+ Hotel'],
    ['corporate', 'PRONTO+ Corporate'], ['protected_work', 'Lavoro Protetto']], 'phone'));
  const kind = h('select', {}, options([['intervention', 'Intervento'], ['inspection', 'Sopralluogo']], 'intervention'));
  const cust = h('select', {}, options(customers.map((c) => [c.id, `${c.full_name || c.email}${c.phone ? ` · ${c.phone}` : ''}`]), '', { empty: 'Nessun cliente registrato (solo recapiti)' }));
  const prop = h('select', {}, h('option', { value: '' }, '—'));
  cust.addEventListener('change', () => fill(prop, h('option', { value: '' }, '—'), ...(customers.find((c) => c.id === cust.value)?.properties || []).map((p) => h('option', { value: p.id }, `${p.address_line}, ${p.city}`))));
  const cat = h('select', { required: true }, options(cats.map((c) => [c.id, c.name]), '', { empty: 'Categoria' }));
  const svc = h('select', {}, h('option', { value: '' }, 'Sottocategoria (facoltativa)'));
  cat.addEventListener('change', () => fill(svc, h('option', { value: '' }, 'Sottocategoria (facoltativa)'), ...services.filter((s) => s.category_id === cat.value).map((s) => h('option', { value: s.id }, s.name))));
  const f = { name: h('input', { type: 'text', autocomplete: 'off' }), phone: h('input', { type: 'tel' }), email: h('input', { type: 'email' }),
    addr: h('input', { type: 'text' }), city: h('input', { type: 'text', value: 'Roma' }), cap: h('input', { type: 'text', inputmode: 'numeric', maxlength: 5 }),
    desc: h('textarea', { rows: 4, required: true, minlength: 10 }),
    urg: h('select', {}, options(Object.entries(URGENCY_LABELS), 'normal')), prio: h('select', {}, options(Object.entries(PRIORITY_LABELS), 'normal')) };
  const dlg = modal('Nuova richiesta',
    h('form', { class: 'ops-form', onsubmit: async (e) => {
      e.preventDefault();
      try {
        const r = await db.rpc('create_manual_request', { p: { source: src.value, kind: kind.value, customerId: cust.value || null, propertyId: prop.value || null, categoryId: cat.value,
          serviceId: svc.value || null, contactName: f.name.value, contactPhone: f.phone.value, contactEmail: f.email.value, addressLine: f.addr.value, city: f.city.value, postalCode: f.cap.value,
          description: f.desc.value, urgency: f.urg.value, priority: f.prio.value } });
        dlg.close();
        location.hash = `r=${r.id}`;
      } catch (err) { fill(st, notice('error', err.message)); }
    } },
      h('div', { class: 'app-form-grid' }, field('Origine', src), field('Tipo', kind), field('Cliente registrato', cust, 'Facoltativo: i recapiti vengono copiati dal profilo'), field('Immobile del cliente', prop),
        field('Nome e cognome / referente', f.name), field('Telefono', f.phone), field('Email', f.email), field('Indirizzo', f.addr), field('Comune', f.city), field('CAP', f.cap),
        field('Categoria', cat), field('Sottocategoria', svc), field('Urgenza dichiarata', f.urg), field('Priorità operativa', f.prio)),
      field('Descrizione del problema', f.desc),
      h('p', { class: 'app-muted' }, 'Senza cliente registrato sono obbligatori nome e telefono. La richiesta viene controllata per possibili duplicati.'),
      h('button', { class: 'btn btn--primary', type: 'submit' }, 'Registra richiesta'), st));
}

/* ================================================================ ASSEGNAZIONE B2B (funzioni Prompt 3) */
function assignB2bDialog(r) {
  const st = h('div', { role: 'status' });
  const t = h('select', { required: true }, options(techs.filter((x) => x.active).map((x) => [x.id, x.display_name]), '', { empty: 'Tecnico' }));
  const day = h('input', { type: 'date', required: true, value: toDateInput(new Date(Date.now() + 864e5)) });
  const s = h('input', { type: 'time', required: true, value: '09:00' }); const e2 = h('input', { type: 'time', required: true, value: '11:00' });
  const ov = h('textarea', { rows: 2, placeholder: 'Motivazione per confermare nonostante i conflitti' });
  const dlg = modal(`Assegna ${r.number}`, h('form', { class: 'ops-form', onsubmit: async (ev) => {
    ev.preventDefault();
    try {
      const res = await db.rpc('assign_business_request', { p_request: r.id, p_technician: t.value, p_start: combine(day.value, s.value), p_end: combine(day.value, e2.value), p_override_reason: ov.value || null });
      dlg.close(); flashIn(root, `Richiesta assegnata${res.warnings?.length ? ` con ${res.warnings.length} avvisi` : ''}.`); renderOverview();
    } catch (err) { fill(st, notice('error', err.message)); }
  } }, h('div', { class: 'app-form-grid' }, field('Tecnico', t), field('Giorno', day), field('Inizio', s), field('Fine', e2)), field('Motivazione (solo in caso di conflitti)', ov),
  h('button', { class: 'btn btn--primary', type: 'submit' }, 'Assegna'), st));
}

/* ================================================================ DETTAGLIO RICHIESTA */
const sec = (title, ...c) => h('section', { class: 'app-card ops-sec' }, h('h2', {}, title), ...c);
const kv = (pairs) => h('dl', { class: 'ops-kv' }, pairs.filter(([, v]) => v !== undefined).map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v ?? '—'))));
const eventText = (e) => {
  const d = e.data || {};
  if (e.kind === 'field_change') return `Modificati: ${Object.keys(d).join(', ')}`;
  if (e.kind === 'assignment') return `Assegnazione ${dayOf(d.startsAt)} ${timeOf(d.startsAt)}${d.override ? ` — confermata nonostante conflitti: ${d.override}` : ''}`;
  if (e.kind === 'reschedule') return `Spostato a ${dayOf(d.to)} ${timeOf(d.to)}: ${d.reason}`;
  if (e.kind === 'duplicate') return d.duplicateOf ? `Segnato come duplicato di ${d.duplicateOf}` : `Possibili duplicati: ${(d.candidates || []).map((c) => c.number).join(', ')}`;
  if (e.kind === 'created') return `Registrata da ${SOURCE_LABELS[d.source] || d.source}`;
  if (e.kind === 'economics') return `Scheda economica v${d.version}: totale ${euro(d.totalCents)}`;
  if (e.kind === 'payment') return `Ordine ${d.orderNumber} (${euro(d.grossCents)})`;
  if (e.kind === 'coverage') return `Prestazione inclusa registrata (${d.plan})`;
  if (e.kind === 'extra_work') return `Lavorazione aggiuntiva proposta: ${d.proposed}`;
  if (e.kind === 'document') return `Certificato ${d.certificate}${d.reason ? `: ${d.reason}` : ''}`;
  return e.kind;
};

async function detail(id) {
  const body = h('div', { class: 'ops-page' }, h('p', { class: 'app-muted' }, 'Caricamento…'));
  fill(root, opsBar(me, restartFn), body);
  let d;
  try { d = await db.rpc('intervention_detail', { p_id: id }); } catch (e) { fill(body, h('a', { href: '#' }, '← Elenco'), notice('error', e.message)); return; }
  const i = d.intervention; const perm = d.permissions; const st = h('div', { role: 'status', 'aria-live': 'polite' });
  const reload = () => detail(id);
  const run = (fnc, ok) => async () => { try { await fnc(); if (ok) flashIn(body, ok); await reload(); } catch (err) { fill(st, notice('error', err.message)); st.scrollIntoView({ block: 'nearest' }); } };
  const ask = (msg) => { const v = prompt(msg); if (v === null) throw new Error('Operazione annullata'); return v; };

  /* ---------- intestazione e azioni */
  const special = ['scheduled', 'technician_assigned', 'quote_sent', 'quote_accepted', 'completed', 'closed'];
  const transitions = d.allowedTransitions.filter((s) => !special.includes(s) && !(s === 'admin_review' && i.op_status === 'closed' && !perm.close));
  const actions = h('div', { class: 'app-actions' },
    perm.manage ? transitions.map((to) => actBtn(`→ ${opLabel(to)}`, run(() => db.rpc('transition_intervention', { p_id: id, p_to: to,
      p_note: needsNote(i.op_status, to) ? ask(`Motivazione per "${opLabel(to)}"`) : null }), `Stato: ${opLabel(to)}`), { cls: `btn btn--sm ${to === 'cancelled' ? 'btn--ghost ops-danger' : 'btn--ghost'}`, status: st })) : null,
    perm.close && i.op_status === 'closed' ? actBtn('Riapri verifica', run(() => db.rpc('transition_intervention', { p_id: id, p_to: 'admin_review', p_note: ask('Motivo della riapertura') })), { status: st }) : null,
    perm.close && ['completed', 'admin_review'].includes(i.op_status) ? actBtn('Chiudi intervento', run(async () => {
      const r = await db.rpc('close_intervention', { p_id: id, p_note: null });
      return r;
    }, 'Intervento chiuso: prestazioni incluse scalate e documenti disponibili.'), { cls: 'btn btn--primary btn--sm', status: st }) : null);

  const dupes = (d.duplicates || []).length && !i.duplicate_of ? notice('warn', h('span', {}, 'Possibili duplicati: ', d.duplicates.map((x) => h('span', { class: 'ops-dup' },
    h('a', { href: `#r=${x.id}` }, x.number), ` (${x.reasons.join(', ')}) `, perm.manage && !['closed', 'cancelled'].includes(i.op_status)
      ? actBtn(`Segna come duplicato di ${x.number}`, run(() => db.rpc('mark_duplicate', { p_id: id, p_of: x.id, p_note: null }), 'Richiesta segnata come duplicato e annullata.'), { status: st }) : null)))) : null;

  const head = h('section', { class: 'app-card ops-hero' },
    h('div', { class: 'ops-hero__top' }, h('div', {}, h('p', { class: 'ops-num' }, i.number, h('small', {}, `${SOURCE_LABELS[i.source] || i.source} · ${i.kind === 'inspection' ? 'Sopralluogo' : 'Intervento'} · ${dateTime(i.created_at)}`)),
      h('h1', { class: 'section-title app-h1' }, [i.categoryName, i.serviceName].filter(Boolean).join(' · ') || 'Richiesta da classificare')),
    h('div', { class: 'ops-stack' }, opsBadge(i.op_status, i.statusLabel), urgencyBadge(i.declared_urgency, i.priority), i.duplicate_of ? h('span', { class: 'app-badge app-badge--neutral' }, `Duplicato di ${i.duplicateOfNumber}`) : null)),
    kv([['Cliente', i.customerName || i.contact_name], ['Telefono', i.contact_phone ? h('a', { href: `tel:${i.contact_phone.replace(/\s/g, '')}` }, i.contact_phone) : '—'], ['Email', i.contact_email || i.customerEmail],
      ['Indirizzo', [i.address_line, [i.postal_code, i.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')], ['Urgenza dichiarata', URGENCY_LABELS[i.declared_urgency]],
      ['Priorità', PRIORITY_LABELS[i.priority]], ['Operatore incaricato', i.operatorName], ['Tecnico', i.technicianName], ['Programmazione', i.scheduled_at ? `${dayOf(i.scheduled_at)} ${timeOf(i.scheduled_at)}–${timeOf(i.scheduled_end_at)}${i.slot_label ? ` (${i.slot_label})` : ''}` : '—'],
      ['Azienda / lead', i.accountName || i.leadNumber], ['Abbonamento', i.contract_id ? 'Contratto PRONTO+ Family collegato' : '—']]),
    h('div', { class: 'ops-desc' }, h('h3', {}, 'Descrizione'), h('p', {}, i.description || '—'),
      Object.keys(i.intake || {}).length ? h('p', { class: 'app-muted' }, `Dal modulo: ${Object.entries(i.intake).map(([k, v]) => `${{ requestType: 'tipo', clientType: 'cliente', timing: 'tempi', interest: 'interesse' }[k] || k}: ${v}`).join(' · ')}`) : null,
      i.cancel_reason ? notice('info', `Motivo dell’annullamento: ${i.cancel_reason}`) : null),
    dupes, actions, st);

  fill(body, h('a', { class: 'ops-back', href: '#' }, '← Tutte le richieste'), h('div', { class: 'ops-detail' },
    h('div', { class: 'ops-detail__main' }, head, assignSection(d, run), reportSection(d, run, ask), workSection(d, run), coverageSection(d, run, ask), economicsSection(d, run, ask, st)),
    h('aside', { class: 'ops-detail__side' }, editSection(d, run), historySection(d, run))));
}

/* ---------- assegnazione */
function assignSection(d, run) {
  const i = d.intervention;
  const current = d.assignments.find((a) => a.active);
  const can = d.permissions.assign && ['new', 'in_review', 'awaiting_quote', 'quote_accepted', 'to_schedule', 'scheduled', 'technician_assigned'].includes(i.op_status);
  const hist = d.assignments.filter((a) => !a.active);
  const out = h('div', { 'aria-live': 'polite' });
  if (!can) return sec('Assegnazione', current ? kv([['Tecnico', current.technician], ['Quando', `${dayOf(current.startsAt)} ${timeOf(current.startsAt)}–${timeOf(current.endsAt)}`], ['Note per il tecnico', current.notes], ['Attrezzature', current.equipment]]) : h('p', { class: 'app-muted' }, i.op_status === 'quote_sent' ? 'In attesa dell’accettazione del preventivo.' : 'Nessuna assegnazione attiva.'));
  const start0 = current ? new Date(current.startsAt) : new Date(Date.now() + 864e5);
  const t = h('select', { 'aria-label': 'Tecnico' }, options(techs.filter((x) => x.active).map((x) => [x.id, x.display_name]), current?.technicianId, { empty: 'Scegli il tecnico' }));
  const day = h('input', { type: 'date', value: toDateInput(start0) });
  const s = h('input', { type: 'time', value: current ? timeOf(current.startsAt) : '09:00' });
  const e = h('input', { type: 'time', value: current ? timeOf(current.endsAt) : '11:00' });
  const slot = h('input', { type: 'text', value: current?.slot || i.slot_label || '', placeholder: 'es. 9–11 o "mattina"' });
  const prio = h('select', {}, options(Object.entries(PRIORITY_LABELS), current?.priority || i.priority));
  const notes = h('textarea', { rows: 2, placeholder: 'Visibili al tecnico' }, current?.notes || '');
  const equip = h('input', { type: 'text', value: current?.equipment || '', placeholder: 'es. autospurgo, videoispezione' });
  const override = h('textarea', { rows: 2, placeholder: 'Motivazione per confermare nonostante i conflitti (obbligatoria)' });
  const ovWrap = field('Conferma nonostante i conflitti', override); ovWrap.hidden = true;
  const params = () => ({ start: combine(day.value, s.value), end: combine(day.value, e.value) });
  const showCheck = (c) => {
    const items = [...c.hard.map((x) => ['error', 'Bloccante', x]), ...c.blocking.map((x) => ['warn', 'Conflitto', x]), ...c.warnings.map((x) => ['info', 'Avviso', x])];
    ovWrap.hidden = !c.blocking.length;
    fill(out, items.length ? h('ul', { class: 'ops-checks' }, items.map(([tone, l, x]) => h('li', { class: `ops-checks--${tone}` }, h('b', {}, l), ' ', x.message)))
      : notice('ok', 'Nessun conflitto: disponibilità, specializzazione, zona e calendario verificati.'));
  };
  const check = async () => { if (!t.value) throw new Error('Scegli il tecnico'); const p = params(); showCheck(await db.rpc('check_assignment', { p_kind: 'intervention', p_target: i.id, p_technician: t.value, p_start: p.start, p_end: p.end, p_exclude_assignment: current?.id || null })); };
  const suggest = async () => {
    const p = params();
    const r = await db.rpc('suggest_technicians', { p_kind: 'intervention', p_target: i.id, p_start: p.start, p_end: p.end });
    fill(out, h('p', { class: 'app-muted' }, r.note), h('ol', { class: 'ops-suggest' }, r.items.map((x) => h('li', {},
      h('button', { class: 'ops-suggest__btn', type: 'button', onclick: () => { t.value = x.technicianId; showCheck(x.check); } }, h('b', {}, x.name), h('span', {},
        x.check.hard.length ? 'non idoneo' : x.check.blocking.length ? `${x.check.blocking.length} conflitti` : 'disponibile', x.check.warnings.length ? ` · ${x.check.warnings.length} avvisi` : ''))))));
  };
  const urgent = ['high', 'emergency'].includes(i.declared_urgency) || i.priority === 'urgent';
  return sec('Assegna intervento',
    urgent ? notice('warn', 'Richiesta urgente: nessuna regola di assegnazione automatica è approvata, la scelta resta all’operatore.') : null,
    current ? h('p', { class: 'app-muted' }, `Assegnazione attuale: ${current.technician}, ${dayOf(current.startsAt)} ${timeOf(current.startsAt)}–${timeOf(current.endsAt)}`) : null,
    h('div', { class: 'app-form-grid ops-grid-3' }, field('Tecnico', t), field('Giorno', day), field('Dalle', s), field('Alle', e), field('Fascia oraria comunicata', slot), field('Priorità', prio)),
    field('Note per il tecnico', notes), field('Attrezzature necessarie', equip), ovWrap,
    h('div', { class: 'app-actions' },
      actBtn('Verifica disponibilità', check, { status: out }), actBtn('Suggerisci tecnici', suggest, { status: out }),
      h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => modal(`PRONTO AI · ${i.number}`, aiChatPanel({ agent: 'dispatch', context: { interventionId: i.id },
        intro: 'Il Dispatch Assistant analizza fasce libere, conflitti e dati mancanti e può solo mettere in coda una proposta da approvare.',
        suggestions: ['Quali fasce sono libere per questa richiesta?', 'Che dati mancano?', 'Proponi il tecnico più adatto'] })) }, 'Chiedi a PRONTO AI'),
      actBtn(current ? 'Riassegna' : 'Assegna intervento', run(async () => {
        if (!t.value) throw new Error('Scegli il tecnico');
        const p = params();
        await db.rpc('assign_intervention', { p_id: i.id, p_technician: t.value, p_start: p.start, p_end: p.end, p_slot: slot.value || null, p_notes: notes.value || null,
          p_equipment: equip.value || null, p_priority: prio.value, p_override_reason: override.value || null });
      }, 'Intervento assegnato.'), { cls: 'btn btn--primary btn--sm', status: out }),
      ['new', 'in_review', 'awaiting_quote', 'quote_accepted', 'to_schedule', 'scheduled'].includes(i.op_status) && !current
        ? actBtn('Programma senza tecnico', run(() => { const p = params(); return db.rpc('schedule_intervention', { p_id: i.id, p_start: p.start, p_end: p.end, p_slot: slot.value || null,
          p_reason: i.scheduled_at ? prompt('Motivo della riprogrammazione') : null }); }, 'Data programmata.'), { status: out }) : null),
    out,
    hist.length ? h('details', {}, h('summary', {}, `Assegnazioni precedenti (${hist.length})`), h('ul', { class: 'ops-facts' }, hist.map((a) => h('li', {}, `${a.technician} · ${dayOf(a.startsAt)} ${timeOf(a.startsAt)} — rilasciata: ${a.releaseReason || '—'}`)))) : null,
    d.reschedules.length ? h('details', {}, h('summary', {}, `Riprogrammazioni (${d.reschedules.length})`), h('ul', { class: 'ops-facts' }, d.reschedules.map((r) => h('li', {}, `${dateTime(r.at)}: ${dayOf(r.old_starts_at)} ${timeOf(r.old_starts_at)} → ${dayOf(r.new_starts_at)} ${timeOf(r.new_starts_at)} — ${r.reason}`)))) : null);
}

/* ---------- rapporto */
function reportSection(d, run, ask) {
  const r = d.report; const i = d.intervention;
  if (!r) return sec('Rapporto di intervento', h('p', { class: 'app-muted' }, 'Il tecnico compila il rapporto dall’area tecnico al termine del lavoro.'));
  const label = { draft: 'Bozza del tecnico', submitted: 'Inviato per la verifica', changes_requested: 'Correzione richiesta', approved: 'Approvato' }[r.status];
  return sec('Rapporto di intervento',
    h('div', { class: 'ops-stack' }, h('span', { class: `app-badge app-badge--${r.status === 'approved' ? 'ok' : r.status === 'submitted' ? 'warn' : 'neutral'}` }, label),
      r.number ? h('span', { class: 'ops-num' }, `${r.number} · v${r.version}`) : null, r.format === 'summary' ? h('span', { class: 'app-badge app-badge--neutral' }, 'Rapporto sintetico (Prompt 2)') : null),
    d.reportMissing?.length && r.status !== 'approved' ? notice('warn', `Dati minimi mancanti: ${d.reportMissing.join(', ')}`) : null,
    kv([['Inizio e fine', r.started_at ? `${dateTime(r.started_at)} – ${timeOf(r.ended_at)}` : r.duration_minutes ? `${r.duration_minutes} min` : '—'], ['Descrizione del problema', r.problem_description],
      ['Diagnosi', r.diagnosis], ['Lavorazioni eseguite', r.work_description], ['Problemi non risolti', r.unresolved_issues], ['Raccomandazioni', r.recommendations],
      ['Costi aggiuntivi', r.extra_costs_note], ['Note finali', r.final_notes || r.technical_notes],
      ['Presa visione', r.customer_ack_method === 'none' ? 'Non raccolta (facoltativa)' : `${r.customer_ack_method === 'signature' ? 'Firma' : 'Verbale'}: ${r.customer_ack_name}`],
      ['Correzione richiesta', r.correction_note || undefined]]),
    h('div', { class: 'app-actions' },
      d.permissions.approveReports && r.status === 'submitted' && ['completed', 'admin_review'].includes(i.op_status) ? [
        actBtn('Approva rapporto', run(() => db.rpc('review_report', { p_id: i.id, p_decision: 'approve', p_note: null }), 'Rapporto approvato.'), { cls: 'btn btn--primary btn--sm' }),
        actBtn('Richiedi correzione', run(() => db.rpc('review_report', { p_id: i.id, p_decision: 'changes', p_note: ask('Cosa deve correggere il tecnico?') }), 'Correzione richiesta al tecnico.'))] : null,
      d.permissions.approveReports && r.status === 'approved' && i.op_status === 'admin_review'
        ? actBtn('Riapri il rapporto', run(() => db.rpc('reopen_report', { p_id: i.id, p_reason: ask('Motivo della riapertura') }), 'Rapporto riaperto.')) : null,
      r.status === 'approved' ? actBtn('PDF del rapporto', () => openPdf('report-pdf', `?n=${encodeURIComponent(r.number)}`, 'Rapporto')) : null,
      r.status === 'approved' ? h('a', { class: 'btn btn--ghost btn--sm', href: `/rapporto/?n=${encodeURIComponent(r.number)}`, target: '_blank', rel: 'noopener' }, 'Pagina di verifica') : null),
    d.reportVersions.length ? h('details', {}, h('summary', {}, `Versioni (${d.reportVersions.length})`), h('ul', { class: 'ops-facts' }, d.reportVersions.map((v) => h('li', {},
      `v${v.version} · ${{ submitted: 'inviata', approved: 'approvata', changes_requested: 'correzione richiesta', reopened: 'riaperta' }[v.action]} · ${dateTime(v.at)} · impronta ${v.hash}…${v.note ? ` — ${v.note}` : ''}`)))) : null);
}

/* ---------- lavoro svolto */
function workSection(d, run) {
  const ew = d.economics?.extraWorks || [];
  const decide = (w) => {
    if (!d.permissions.economics || w.status !== 'proposed') return null;
    const price = h('input', { type: 'text', inputmode: 'decimal', value: centsToInput(w.price_net_cents), placeholder: '€ IVA esclusa', 'aria-label': 'Prezzo' });
    const ch = h('select', { 'aria-label': 'Autorizzazione del cliente' }, options([['telefono', 'Telefono'], ['email', 'Email'], ['firma', 'Firma'], ['presenza', 'Di persona']], 'telefono'));
    const ref = h('input', { type: 'text', placeholder: 'Riferimento (es. email del 18/11)', 'aria-label': 'Riferimento' });
    return h('div', { class: 'app-inline' }, price, actBtn('Proponi al cliente', run(() => db.rpc('decide_extra_work', { p_extra: w.id, p_decision: 'price', p_price_net_cents: toCents(price.value) }), 'Prezzo proposto al cliente.')),
      ch, ref, actBtn('Autorizzata dal cliente', run(() => db.rpc('decide_extra_work', { p_extra: w.id, p_decision: 'authorized', p_price_net_cents: toCents(price.value), p_channel: ch.value, p_reference: ref.value || null }), 'Lavorazione autorizzata.')),
      actBtn('Rifiuta', run(() => db.rpc('decide_extra_work', { p_extra: w.id, p_decision: 'rejected', p_note: prompt('Motivo') }))));
  };
  const total = d.time.reduce((n, x) => n + (x.minutes || 0), 0);
  return sec('Lavoro svolto',
    h('h3', {}, `Ore registrate (${Math.floor(total / 60)} h ${total % 60} min)`),
    table([{ label: 'Tipo', render: (x) => (x.kind === 'travel' ? 'Viaggio' : 'Lavoro') }, { label: 'Dalle', render: (x) => dateTime(x.started_at) }, { label: 'Alle', render: (x) => timeOf(x.ended_at) },
      { label: 'Minuti', key: 'minutes' }, { label: 'Nota', key: 'note' }], d.time, { empty: 'Nessuna ora registrata.' }),
    h('h3', {}, 'Materiali utilizzati'),
    table([{ label: 'Materiale', key: 'name' }, { label: 'Quantità', render: (m) => `${String(m.quantity).replace('.', ',')} ${m.unit}` }, { label: 'Note', key: 'notes' }], d.materials, { empty: 'Nessun materiale.' }),
    h('h3', {}, 'Fotografie'),
    table([{ label: 'Fase', render: (p) => p.phase || '—' }, { label: 'Didascalia', render: (p) => p.caption || '—' }, { label: 'Uso nel rapporto', render: (p) => (p.authorized ? 'Autorizzato dal cliente' : 'Solo interno') }],
      d.photos, { empty: 'Nessuna fotografia.' }),
    h('h3', {}, 'Lavorazioni aggiuntive'),
    ew.length ? h('ul', { class: 'ops-extra' }, ew.map((w) => h('li', {}, h('p', {}, h('b', {}, { proposed: 'Proposta', authorized: 'Autorizzata', rejected: 'Rifiutata', withdrawn: 'Ritirata' }[w.status]), ` · ${w.description}`,
      w.price_net_cents != null ? ` · ${euro(w.price_net_cents)} + IVA` : '', w.customer_authorization ? ` · autorizzazione: ${w.customer_authorization}` : ''), decide(w))))
      : h('p', { class: 'app-muted' }, 'Nessuna lavorazione aggiuntiva proposta.'));
}

/* ---------- prestazioni PRONTO+ */
function coverageSection(d, run, ask) {
  const c = d.coverage;
  if (!c.applicable) return sec('Abbonamenti PRONTO+', h('p', { class: 'app-muted' }, c.reason || 'Nessun contratto PRONTO+ Family del cliente.'));
  const open = c.coverages.filter((x) => x.status !== 'released');
  return sec('Abbonamenti PRONTO+', h('p', { class: 'app-muted' }, c.note),
    c.contracts.map((k) => h('article', { class: `ops-cov ${k.ok ? 'ops-cov--ok' : ''}` },
      h('h3', {}, k.planName, ' ', h('span', { class: `app-badge app-badge--${k.status === 'active' ? 'ok' : 'warn'}` }, k.status === 'active' ? 'Attivo' : 'Non attivo')),
      h('ul', { class: 'ops-facts' }, h('li', {}, `Validità: ${date(k.startsAt)} → ${date(k.endsAt)}`), h('li', {}, `Immobile coperto: ${k.propertyMatch ? 'sì' : 'no'}`),
        h('li', {}, `Categoria coperta: ${k.categoryMatch ? 'sì' : 'no'}`), k.maxMinutes ? h('li', {}, `Durata massima per prestazione: ${k.maxMinutes} min`) : null),
      k.reasons.length ? notice('warn', `Non applicabile: ${k.reasons.join(', ')}`) : null,
      h('details', {}, h('summary', {}, 'Prestazioni incluse ed esclusioni'), h('p', {}, h('b', {}, 'Incluso: '), (k.included || []).join(' · ')), h('p', {}, h('b', {}, 'Esclusioni: '), (k.exclusions || []).join(' · '))),
      table([{ label: 'Prestazione', render: (b) => ({ intervention: 'Intervento incluso', checkup: 'Controllo preventivo' }[b.type] || b.type) }, { label: 'Residue', render: (b) => b.remaining ?? 'illimitate' },
        { label: 'Prenotate su altre richieste', key: 'reserved' }, { label: '', render: (b) => (d.permissions.manage && k.ok && (b.available ?? 1) > 0 && !open.some((o) => o.entitlementId === b.entitlementId)
          ? actBtn('Registra come inclusa', run(() => db.rpc('plan_coverage', { p_id: d.intervention.id, p_entitlement: b.entitlementId, p_note: null }), 'Prestazione inclusa registrata (si scala alla chiusura).')) : null) }], k.benefits))),
    open.length ? h('div', {}, h('h3', {}, 'Prestazioni registrate su questa richiesta'), h('ul', { class: 'ops-facts' }, open.map((o) => h('li', {}, `${o.type === 'intervention' ? 'Intervento incluso' : o.type}: `,
      o.status === 'consumed' ? `scalata il ${date(o.consumedAt)}` : ['prevista (non ancora scalata) ', d.permissions.manage ? actBtn('Rilascia', run(() => db.rpc('release_coverage', { p_coverage: o.id, p_reason: ask('Motivo') }))) : null])))) : null);
}

/* ---------- economia */
const ECON_FIELDS = [['callFeeCents', 'call_fee_cents', 'Diritto di chiamata'], ['laborCents', 'labor_cents', 'Manodopera'], ['materialsCents', 'materials_cents', 'Materiali'],
  ['equipmentRentalCents', 'equipment_rental_cents', 'Noleggio attrezzature'], ['travelCents', 'travel_cents', 'Trasferta'], ['disposalCents', 'disposal_cents', 'Smaltimento'],
  ['externalCostsCents', 'external_costs_cents', 'Costi esterni'], ['coveredCents', 'covered_cents', 'Quota inclusa PRONTO+'], ['discountCents', 'discount_cents', 'Sconti'], ['depositCents', 'deposit_cents', 'Acconto concordato']];

function economicsSection(d, run, ask, topStatus) {
  if (!d.economics) return null;
  const s = d.economics; const e = s.economics || {}; const i = d.intervention; const perm = d.permissions;
  const editable = perm.economics && e.status !== 'approved' && !(e.order_id && s.orders.some((o) => o.id === e.order_id && !['cancelled', 'expired'].includes(o.status)));
  const inputs = Object.fromEntries(ECON_FIELDS.map(([k, col]) => [k, h('input', { type: 'text', inputmode: 'decimal', value: centsToInput(e[col]), disabled: !editable, placeholder: '0,00' })]));
  const vat = h('select', { disabled: !editable }, options([[22, '22%'], [10, '10%'], [5, '5%'], [4, '4%'], [0, '0%']], e.vat_rate ?? 22));
  const notes = h('textarea', { rows: 2, disabled: !editable }, e.notes || '');
  const preview = h('div', { class: 'ops-total', 'aria-live': 'polite' });
  const values = () => ({ ...Object.fromEntries(ECON_FIELDS.map(([k]) => [k, toCents(inputs[k].value)])), vatRate: Number(vat.value) });
  const recalc = () => {
    try {
      const v = values(); const r = computeEconomics(v);
      const extras = (s.extraWorks || []).filter((w) => w.status === 'authorized').reduce((n, w) => n + (w.price_net_cents || 0), 0);
      fill(preview, h('span', {}, `Imponibile ${euro(r.taxableCents)}`), h('span', {}, `IVA ${euro(r.vatCents)}`), h('strong', {}, `Totale ${euro(r.totalCents)}`),
        e.price_locked && !withinAgreedPrice({ subtotalCents: r.subtotalCents, coveredCents: v.coveredCents }, e.agreed_price_cents, extras) ? notice('error', 'Supera il prezzo concordato con il cliente') : null);
    } catch (err) { fill(preview, notice('error', err.message)); }
  };
  Object.values(inputs).forEach((x) => x.addEventListener('input', recalc)); vat.addEventListener('change', recalc); recalc();
  const quoteBox = () => {
    if (!perm.economics) return null;
    if (['new', 'in_review', 'awaiting_quote', 'quote_sent'].includes(i.op_status)) {
      const amt = h('input', { type: 'text', inputmode: 'decimal', value: centsToInput(e.agreed_price_cents), placeholder: '€ IVA esclusa', 'aria-label': 'Prezzo concordato' });
      const qv = h('select', { 'aria-label': 'IVA' }, options([[22, '22%'], [10, '10%'], [4, '4%'], [0, '0%']], e.vat_rate ?? 22));
      const ch = h('select', { 'aria-label': 'Modalità di accettazione' }, options([['telefono', 'Telefono'], ['email', 'Email'], ['firma', 'Firma'], ['presenza', 'Di persona']], 'email'));
      const who = h('input', { type: 'text', placeholder: 'Chi accetta', 'aria-label': 'Chi accetta', value: i.contact_name || '' });
      const ref = h('input', { type: 'text', placeholder: 'Riferimento', 'aria-label': 'Riferimento' });
      return h('div', { class: 'ops-quote' }, h('h3', {}, 'Preventivo'),
        h('div', { class: 'app-inline' }, amt, qv, actBtn(i.op_status === 'quote_sent' ? 'Aggiorna preventivo' : 'Registra preventivo inviato',
          run(() => db.rpc('record_quote', { p_id: i.id, p_agreed_cents: toCents(amt.value), p_vat_rate: Number(qv.value), p_note: null }), 'Preventivo registrato.'), { status: topStatus })),
        i.op_status === 'quote_sent' ? h('div', { class: 'app-inline' }, ch, who, ref, actBtn('Registra accettazione del cliente',
          run(() => db.rpc('accept_quote', { p_id: i.id, p_channel: ch.value, p_name: who.value, p_reference: ref.value || null }), 'Preventivo accettato: prezzo bloccato.'), { status: topStatus })) : null,
        h('p', { class: 'app-muted' }, 'Il cliente registrato può accettare anche dall’area cliente. Dopo l’accettazione il prezzo non aumenta senza lavorazioni aggiuntive autorizzate.'));
    }
    return e.price_locked ? h('p', { class: 'app-muted' }, `Prezzo concordato: ${euro(e.agreed_price_cents)} + IVA, accettato il ${date(e.quote_accepted_at)} (${e.quote_acceptance_channel}, ${e.quote_accepted_by_name}).`) : null;
  };
  const payBox = h('div', { 'aria-live': 'polite' });
  const internal = s.internal !== undefined || perm.internalCosts ? internalBox(d, run) : null;
  return sec('Scheda economica',
    h('div', { class: 'ops-stack' }, paymentBadge(s.paymentState, s.paymentStateLabel), h('span', { class: `app-badge app-badge--${e.status === 'approved' ? 'ok' : 'neutral'}` }, e.status === 'approved' ? 'Approvata' : 'Bozza')),
    h('ul', { class: 'ops-money' }, h('li', {}, h('span', {}, 'Preventivato'), h('b', {}, euro(s.quotedCents))), h('li', {}, h('span', {}, 'Fatturato'), h('b', {}, euro(s.invoicedCents))),
      h('li', {}, h('span', {}, 'Incassato'), h('b', {}, euro(s.collectedCents)))),
    quoteBox(),
    h('div', { class: 'app-form-grid ops-grid-3' }, ECON_FIELDS.map(([k, , l]) => field(`${l} (€, IVA escl.)`, inputs[k])), field('Aliquota IVA', vat)), field('Note', notes), preview,
    h('div', { class: 'app-actions' },
      editable ? actBtn('Salva scheda', run(() => db.rpc('save_economics', { p_id: i.id, p: { ...values(), notes: notes.value } }), 'Scheda salvata.'), { status: topStatus }) : null,
      perm.approveEconomics && e.status !== 'approved' && e.intervention_id ? actBtn('Approva scheda economica', run(() => db.rpc('approve_economics', { p_id: i.id }), 'Scheda approvata.'), { cls: 'btn btn--primary btn--sm', status: topStatus }) : null,
      perm.approveEconomics && e.status === 'approved' ? actBtn('Riapri scheda', run(() => db.rpc('reopen_economics', { p_id: i.id, p_reason: ask('Motivo') }), 'Scheda riaperta.'), { status: topStatus }) : null),
    perm.payments && e.status === 'approved' && e.total_cents > 0 ? h('div', { class: 'ops-pay' }, h('h3', {}, 'Richiesta di pagamento (myPOS)'),
      h('p', { class: 'app-muted' }, 'L’ordine riporta le voci della scheda approvata; la quota inclusa PRONTO+ è indicata separatamente. Il pagamento risulta incassato solo dopo la verifica lato server.'),
      h('div', { class: 'app-actions' },
        actBtn(e.order_id ? 'Ordine generato' : 'Genera ordine', async () => {
          const o = await db.rpc('create_intervention_order', { p_id: i.id });
          const link = await db.rpc('issue_payment_link', { p_order: o.orderId, p_valid_days: 14 }).catch((err) => ({ error: err.message }));
          fill(payBox, notice(link.error ? 'warn' : 'ok', link.error ? `Ordine ${o.number} creato; collegamento non generato: ${link.error}` : h('span', {}, `Ordine ${o.number} (${euro(o.grossCents)}). Collegamento di pagamento (mostrato una sola volta): `,
            h('input', { type: 'text', readonly: true, value: `${location.origin}/paga/#t=${link.token}`, class: 'ops-link', onclick: (ev) => ev.target.select() }))));
        }, { cls: 'btn btn--primary btn--sm', status: payBox }),
        h('a', { class: 'btn btn--ghost btn--sm', href: '/admin/#pagamenti' }, 'Pagamenti e incassi')), payBox,
      s.orders.length ? table([{ label: 'Ordine', key: 'number' }, { label: 'Importo', render: (o) => euro(o.grossCents) }, { label: 'Pagato', render: (o) => euro(o.paidCents) }, { label: 'Stato', key: 'status' }], s.orders) : null) : null,
    internal);
}

function internalBox(d, run) {
  const s = d.economics; const c = s.internal || {};
  const f = { technicianCostCents: h('input', { type: 'text', inputmode: 'decimal', value: centsToInput(c.technician_cost_cents ?? s.suggestedTechnicianCostCents) }),
    vehicleCostCents: h('input', { type: 'text', inputmode: 'decimal', value: centsToInput(c.vehicle_cost_cents) }), materialsCostCents: h('input', { type: 'text', inputmode: 'decimal', value: centsToInput(c.materials_cost_cents) }),
    otherCostsCents: h('input', { type: 'text', inputmode: 'decimal', value: centsToInput(c.other_costs_cents) }) };
  const kind = h('select', { 'aria-label': 'Tipo di spesa' }, options([['external', 'Costi esterni'], ['disposal', 'Smaltimento'], ['equipment', 'Noleggio'], ['materials', 'Materiali'], ['travel', 'Trasferta'], ['vehicle', 'Mezzi'], ['other', 'Altro']], 'external'));
  const desc = h('input', { type: 'text', placeholder: 'Descrizione', 'aria-label': 'Descrizione spesa' }); const amt = h('input', { type: 'text', inputmode: 'decimal', placeholder: '€', 'aria-label': 'Importo spesa' });
  return h('details', { class: 'ops-internal' }, h('summary', {}, 'Costi interni e margine (riservato)'),
    h('p', { class: 'app-muted' }, `Ore registrate: ${s.workedMinutes} min${s.suggestedTechnicianCostCents != null ? ` · costo tecnico suggerito ${euro(s.suggestedTechnicianCostCents)}` : ' · costo orario del tecnico non configurato'}. Mai visibili a clienti e tecnici.`),
    h('div', { class: 'app-form-grid' }, field('Costo interno del tecnico (€)', f.technicianCostCents), field('Costo mezzi (€)', f.vehicleCostCents), field('Costo materiali (€)', f.materialsCostCents), field('Altri costi (€)', f.otherCostsCents)),
    actBtn('Salva costi interni', run(() => db.rpc('save_internal_costs', { p_id: d.intervention.id, p: Object.fromEntries(Object.entries(f).map(([k, x]) => [k, toCents(x.value)])) }), 'Costi interni salvati.')),
    table([{ label: 'Spesa', key: 'description' }, { label: 'Tipo', key: 'kind' }, { label: 'Importo', render: (x) => euro(x.amount_cents) }, { label: 'Data', render: (x) => date(x.incurred_on) }], s.expenses, { empty: 'Nessuna spesa.' }),
    h('div', { class: 'app-inline' }, kind, desc, amt, actBtn('Aggiungi spesa', run(() => db.rpc('add_intervention_expense', { p_id: d.intervention.id, p_kind: kind.value, p_description: desc.value, p_amount_cents: toCents(amt.value), p_date: null, p_supplier: null })))),
    h('ul', { class: 'ops-money' }, h('li', {}, h('span', {}, 'Ricavo netto'), h('b', {}, euro(s.revenueNetCents))), h('li', {}, h('span', {}, 'Costi interni'), h('b', {}, euro(s.internalCostCents))),
      h('li', {}, h('span', {}, 'Margine stimato'), h('b', {}, `${euro(s.marginCents)}${s.marginPct != null ? ` (${String(s.marginPct).replace('.', ',')}%)` : ''}`))));
}

/* ---------- dati della richiesta */
function editSection(d, run) {
  const i = d.intervention;
  if (!d.permissions.manage || ['closed', 'cancelled'].includes(i.op_status)) return null;
  const cat = h('select', {}, options(cats.map((c) => [c.id, c.name]), i.category_id, { empty: 'Da classificare' }));
  const svc = h('select', {});
  const fillSvc = () => fill(svc, h('option', { value: '' }, '—'), ...services.filter((s) => s.category_id === cat.value).map((s) => h('option', { value: s.id, selected: s.id === i.service_id }, s.name)));
  fillSvc(); cat.addEventListener('change', fillSvc);
  const f = { contactName: h('input', { type: 'text', value: i.contact_name || '' }), contactPhone: h('input', { type: 'tel', value: i.contact_phone || '' }), contactEmail: h('input', { type: 'email', value: i.contact_email || '' }),
    addressLine: h('input', { type: 'text', value: i.address_line || '' }), city: h('input', { type: 'text', value: i.city || '' }), postalCode: h('input', { type: 'text', value: i.postal_code || '' }),
    description: h('textarea', { rows: 3 }, i.description || '') };
  const urg = h('select', {}, options(Object.entries(URGENCY_LABELS), i.declared_urgency)); const prio = h('select', {}, options(Object.entries(PRIORITY_LABELS), i.priority));
  const kind = h('select', {}, options([['intervention', 'Intervento'], ['inspection', 'Sopralluogo']], i.kind));
  return h('details', { class: 'app-card ops-sec' }, h('summary', {}, h('h2', {}, 'Modifica dati')),
    h('div', { class: 'ops-form' }, field('Categoria', cat), field('Sottocategoria', svc), field('Tipo', kind), field('Referente', f.contactName), field('Telefono', f.contactPhone), field('Email', f.contactEmail),
      field('Indirizzo', f.addressLine), field('Comune', f.city), field('CAP', f.postalCode), field('Urgenza dichiarata', urg), field('Priorità', prio), field('Descrizione', f.description),
      actBtn('Salva modifiche', run(() => db.rpc('update_request_fields', { p_id: i.id, p: { categoryId: cat.value, serviceId: svc.value, kind: kind.value, urgency: urg.value, priority: prio.value,
        ...Object.fromEntries(Object.entries(f).map(([k, x]) => [k, x.value])) } }), 'Dati aggiornati (modifica registrata nello storico).'), { cls: 'btn btn--primary btn--sm' })));
}

/* ---------- storico, note, notifiche */
function historySection(d, run) {
  const body = h('textarea', { rows: 2, placeholder: 'Nota amministrativa', 'aria-label': 'Nuova nota' });
  const vis = h('select', { 'aria-label': 'Visibilità' }, options([['internal', 'Solo staff'], ['technician', 'Visibile al tecnico']], 'internal'));
  return h('div', { class: 'ops-side-stack' },
    sec('Note amministrative',
      d.permissions.manage ? h('div', { class: 'ops-form' }, body, vis, actBtn('Aggiungi nota', run(() => db.rpc('add_intervention_note', { p_id: d.intervention.id, p_body: body.value, p_visibility: vis.value })))) : null,
      d.notes.length ? h('ul', { class: 'ops-notes' }, d.notes.map((n) => h('li', {}, h('p', {}, n.body), h('small', {}, `${n.author || '—'} · ${dateTime(n.at)}${n.visibility === 'technician' ? ' · visibile al tecnico' : ''}`)))) : h('p', { class: 'app-muted' }, 'Nessuna nota.')),
    sec('Storico degli stati', h('ol', { class: 'ops-timeline' }, d.history.map((x) => h('li', {}, h('b', {}, x.toLabel), h('small', {}, `${dateTime(x.at)} · ${x.actor || x.actorRole || 'sistema'}`), x.note ? h('p', {}, x.note) : null)))),
    sec('Registro delle modifiche', h('ul', { class: 'ops-facts' }, d.events.slice(0, 30).map((e) => h('li', {}, h('small', {}, dateTime(e.at)), ' ', eventText(e))))),
    sec('Notifiche', d.notifications.length ? h('ul', { class: 'ops-facts' }, d.notifications.map((n) => h('li', {}, `${n.event} · ${{ pending: 'in coda', sent: 'inviata', not_sent: 'non inviata', failed: 'non riuscita' }[n.status] || n.status}${n.error ? ` (${n.error})` : ''}`)))
      : h('p', { class: 'app-muted' }, 'Nessuna notifica.'), h('p', { class: 'app-muted' }, 'Le notifiche partono solo con un provider configurato; senza provider restano “non inviate”.')));
}

/* ================================================================ avvio */
async function route() {
  const m = location.hash.match(/^#r=([0-9a-f-]{36})$/);
  if (m) return detail(m[1]);
  return renderOverview();
}

if (root) {
  boot(root, {
    title: 'Centrale operativa',
    requireRole: ['admin', 'operator'],
    render: async ({ profile, restart }) => {
      const perms = profile.role === 'admin' ? null : (await db.select('role_permissions?select=permission&role=eq.operator')).map((p) => p.permission);
      const has = (p) => profile.role === 'admin' || perms.includes(p);
      me = { ...profile, perm: { manage: has('ops.manage'), assign: has('ops.assign') } };
      restartFn = restart;
      await loadCatalog();
      window.addEventListener('hashchange', () => route().catch((e) => fill(root, notice('error', e.message))));
      await route();
    }
  });
}
