/**
 * DASHBOARD AMMINISTRATIVA — /admin/
 * Accesso solo con ruolo "admin" (verificato anche dalle regole RLS del database).
 * Prezzi e condizioni: bozza → approvata dal titolare → pubblicata (approve_plan_version, publish_plan_version);
 * le versioni pubblicate non si modificano e i contratti conservano le proprie condizioni.
 */
import { h, clear, fill, euro, date, dateTime, notice, statusBadge, boot, db, auth, table, field, downloadCertificate } from './core.js';
import { B2B_SECTIONS, b2bViews } from './admin-b2b.js';
import { paymentsViews } from './admin-payments.js';

const SECTIONS = [
  ['panoramica', 'Panoramica aziendale'], ['catalogo', 'Catalogo servizi'], ['family', 'PRONTO+ Family'], ['prezzi', 'Gestione prezzi'],
  ['clienti', 'Clienti'], ['contratti', 'Contratti'], ['interventi', 'Interventi'], ['lavoro-protetto', 'Lavoro Protetto'],
  ['richieste', 'Richieste di assistenza'], ['pagamenti', 'Pagamenti e incassi'], ['richiedi-pagamento', 'Richiedi pagamento'], ['report', 'Report'], ['impostazioni', 'Impostazioni aziendali'],
  ...B2B_SECTIONS
];

const root = document.getElementById('app');
let main;
const flash = (msg, type = 'ok') => { const n = notice(type, msg); main.prepend(n); setTimeout(() => n.remove(), 5000); };
const act = (label, fnc, cls = 'btn btn--ghost btn--sm') => h('button', { class: cls, type: 'button', onclick: async (e) => {
  const btn = e.currentTarget; // currentTarget è null dopo un await: si conserva il riferimento
  btn.disabled = true;
  try { await fnc(); } catch (err) { flash(err.message, 'error'); } finally { btn.disabled = false; }
} }, label);
const toCents = (v) => { const s = String(v).replace(',', '.').trim(); if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error('Importo non valido'); return Math.round(Number(s) * 100); };
const lines = (v) => String(v).split('\n').map((x) => x.trim()).filter(Boolean);

/* ---------------------------------------------------------------- 1. panoramica */
async function panoramica() {
  const [ints, disputes, contracts, purchases, pays] = await Promise.all([
    db.select('interventions?select=status'), db.select('disputes?select=status'),
    db.select('contracts?select=status,ends_at'), db.select('protected_purchases?select=status,ends_at'),
    db.select('payments?status=eq.paid&select=amount_cents,verified_at')
  ]);
  const soon = (rows) => rows.filter((r) => r.status === 'active' && new Date(r.ends_at) - Date.now() < 30 * 864e5).length;
  const month = new Date().toISOString().slice(0, 7);
  const kpi = [
    ['Interventi da verificare', ints.filter((i) => i.status === 'completed').length],
    ['Interventi aperti', ints.filter((i) => ['requested', 'scheduled', 'in_progress'].includes(i.status)).length],
    ['Segnalazioni da gestire', disputes.filter((d) => ['received', 'in_review'].includes(d.status)).length],
    ['Contratti Family attivi', contracts.filter((c) => c.status === 'active').length],
    ['Lavoro Protetto attivi', purchases.filter((c) => c.status === 'active').length],
    ['In scadenza (30 giorni)', soon(contracts) + soon(purchases)],
    ['Incassi confermati del mese', euro(pays.filter((p) => (p.verified_at || '').startsWith(month)).reduce((n, p) => n + p.amount_cents, 0))]
  ];
  return h('div', { class: 'app-grid' },
    h('div', { class: 'app-kpis' }, kpi.map(([l, v]) => h('div', { class: 'app-kpi' }, h('strong', {}, String(v)), h('span', {}, l)))),
    h('section', { class: 'app-card' }, h('h2', {}, 'Centrale operativa'),
      h('p', { class: 'app-muted' }, 'Richieste dal sito, dall’area cliente e dalle aziende, assegnazione dei tecnici, calendario, rapporti, costi e statistiche.'),
      h('div', { class: 'app-actions' }, h('a', { class: 'btn btn--primary btn--sm', href: '/admin/centrale-operativa/' }, 'Centrale operativa'),
        h('a', { class: 'btn btn--ghost btn--sm', href: '/admin/calendario/' }, 'Calendario'), h('a', { class: 'btn btn--ghost btn--sm', href: '/admin/tecnici/' }, 'Tecnici'))));
}

/* ---------------------------------------------------------------- 2. catalogo */
async function catalogo() {
  const cats = await db.select('service_categories?select=id,name,active,services(id,name,active)&order=sort');
  return h('div', {}, cats.map((c) => h('section', { class: 'app-card' }, h('h2', {}, c.name),
    table([{ label: 'Servizio', key: 'name' }, { label: 'Stato', render: (s) => (s.active ? 'Attivo' : 'Disattivato') },
      { label: '', render: (s) => act(s.active ? 'Disattiva' : 'Riattiva', async () => { await db.update(`services?id=eq.${encodeURIComponent(s.id)}`, { active: !s.active }); render(); }) }], c.services))));
}

/* ---------------------------------------------------------------- 3/8. piani (Family e Lavoro Protetto) */
async function plansView(line) {
  const plans = await db.select(`plans?line=eq.${line}&select=*,versions:plan_versions(id,version,status,price_cents,duration_months,visits,interventions)&order=id`);
  const rows = plans.map((p) => ({ ...p, pub: p.versions.find((v) => v.status === 'published'), draft: p.versions.find((v) => v.status === 'draft' || v.status === 'approved') }));
  const toggle = (p, k) => act(p[k] ? 'Sì' : 'No', async () => { await db.update(`plans?id=eq.${p.id}`, { [k]: !p[k] }); flash('Aggiornato'); render(); }, `btn btn--sm ${p[k] ? 'btn--primary' : 'btn--ghost'}`);
  const newPlan = newPlanForm(line);
  return h('div', {},
    notice('info', 'Un’offerta è vendibile solo se attiva, approvata dal titolare, verificata dal legale e con una versione pubblicata (e con la vendita abilitata nelle impostazioni).'),
    table([
      { label: 'Piano', render: (p) => h('span', {}, p.name, p.variant !== 'standard' ? h('small', { class: 'app-muted' }, ` (${p.variant})`) : null) },
      { label: 'Prezzo pubblicato', render: (p) => (p.pub ? `${euro(p.pub.price_cents)} · v${p.pub.version}` : 'Listino non definito') },
      { label: 'Bozza', render: (p) => (p.draft ? `v${p.draft.version} · ${euro(p.draft.price_cents)}${p.draft.status === 'approved' ? ' (approvata)' : ''}` : '—') },
      { label: 'Attiva', render: (p) => toggle(p, 'active') },
      { label: 'Titolare', render: (p) => toggle(p, 'owner_approved') },
      { label: 'Legale', render: (p) => toggle(p, 'legal_reviewed') },
      { label: '', render: (p) => (p.draft ? h('a', { class: 'btn btn--ghost btn--sm', href: '#prezzi' }, 'Modifica bozza') : p.pub ? act('Nuova bozza', async () => { await db.rpc('create_plan_draft', { p_plan_id: p.id }); flash('Bozza creata'); location.hash = 'prezzi'; }) : null) }
    ], rows),
    newPlan);
}

function newPlanForm(line) {
  const id = h('input', { type: 'text', required: true, pattern: '[a-z0-9\\-]{3,60}', placeholder: line === 'family' ? 'family-elettrica-premium' : 'protected-elite' });
  const name = h('input', { type: 'text', required: true });
  const cat = h('input', { type: 'text', placeholder: line === 'family' ? 'elettrica' : '' });
  const tier = h('input', { type: 'text', required: true });
  const variant = h('select', {}, ['standard', 'autospurgo', 'diagnostica'].map((v) => h('option', { value: v }, v)));
  const price = h('input', { type: 'text', inputmode: 'decimal', required: true });
  const months = h('input', { type: 'number', min: 1, max: 36, value: line === 'family' ? 12 : 12, required: true });
  const incl = h('textarea', { rows: 3, required: true });
  return h('form', { class: 'app-card', onsubmit: async (e) => {
    e.preventDefault();
    try {
      await db.insert('plans', { id: id.value.trim(), line, category: cat.value.trim() || null, tier: tier.value.trim(), variant: variant.value, name: name.value.trim(), active: false });
      await db.insert('plan_versions', { plan_id: id.value.trim(), version: 1, status: 'draft', price_cents: toCents(price.value), duration_months: Number(months.value), included: lines(incl.value) });
      flash('Piano creato come bozza (non attivo).'); render();
    } catch (err) { flash(err.message, 'error'); }
  } }, h('h2', {}, 'Crea un nuovo piano'), h('div', { class: 'app-form-grid' },
    field('Codice', id, 'minuscole, numeri e trattini'), field('Nome', name), field('Categoria commerciale', cat), field('Livello', tier), field('Listino', variant),
    field('Prezzo IVA inclusa (€)', price), field('Durata (mesi)', months), field('Prestazioni incluse (una per riga)', incl)),
  h('button', { class: 'btn btn--primary', type: 'submit' }, 'Crea bozza'));
}

/* ---------------------------------------------------------------- listini: bozza → approvata dal titolare → pubblicata (Prompt 9) */
export async function approveVersion(v) {
  const note = prompt('Approvazione del titolare: indica come è stata confermata (es. "approvato da Giovanni Romeo via email del 18/11/2026").');
  if (!note) return;
  await db.rpc('approve_plan_version', { p_version: v.id, p_note: note });
  flash('Versione approvata: ora si può pubblicare.'); render();
}
export function approvedCard(v, title, summary) {
  return h('section', { class: 'app-card' }, h('h3', {}, title), h('p', {}, summary),
    h('p', { class: 'app-muted' }, `Approvata il ${dateTime(v.approved_at)}${v.approval_note ? ` — ${v.approval_note}` : ''}. Non è più modificabile: per cambiarla riaprila come bozza.`),
    h('div', { class: 'app-actions' },
      act('Pubblica', async () => {
        if (!confirm('Pubblicare questa versione? Vale per le nuove sottoscrizioni; i contratti esistenti restano invariati.')) return;
        await db.rpc('publish_plan_version', { p_version: v.id }); flash('Versione pubblicata. Aggiorna il sito per mostrarla.'); render();
      }, 'btn btn--primary'),
      act('Riapri come bozza', async () => { await db.rpc('reopen_plan_version', { p_version: v.id }); flash('Versione riaperta come bozza'); render(); }),
      act('Storico prezzi', async () => showHistory(v.plan_id))));
}
async function showHistory(planId) {
  const rows = await db.rpc('plan_price_history', { p_plan: planId });
  const box = h('section', { class: 'app-card' }, h('h3', {}, `Storico versioni — ${planId}`),
    table([{ label: 'Versione', render: (r) => `v${r.version}` }, { label: 'Stato', render: (r) => r.status }, { label: 'Prezzo', render: (r) => euro(r.priceCents) },
      { label: 'Approvata', render: (r) => (r.approvedAt ? `${dateTime(r.approvedAt)}${r.approvedBy ? ` — ${r.approvedBy}` : ''}` : '—') },
      { label: 'Pubblicata', render: (r) => dateTime(r.publishedAt) }, { label: 'Contratti', render: (r) => String(r.contracts) }], rows));
  main.append(box); box.scrollIntoView({ behavior: 'smooth' });
}

/* ---------------------------------------------------------------- 4. prezzi, bozze, promozioni, storico */
async function prezzi() {
  const [drafts, promos, history] = await Promise.all([
    db.select('plan_versions?status=in.(draft,approved)&select=*,plan:plans(name,line)&order=plan_id'),
    db.select('promotions?select=*&order=created_at.desc'),
    db.select('audit_log?table_name=in.(plan_versions,promotions,plans)&select=at,action,actor_role,row_id,old_data,new_data&order=at.desc&limit=40')
  ]);
  const draftForm = (v) => {
    const f = {
      price: h('input', { type: 'text', inputmode: 'decimal', value: (v.price_cents / 100).toFixed(2) }),
      months: h('input', { type: 'number', min: 1, max: 36, value: v.duration_months }),
      visits: h('input', { type: 'number', min: 0, value: v.visits }),
      interventions: h('input', { type: 'number', min: 0, value: v.interventions }),
      checkups: h('input', { type: 'number', min: 0, value: v.checkups }),
      minutes: h('input', { type: 'number', min: 15, max: 480, value: v.max_minutes ?? '' }),
      discount: h('input', { type: 'number', min: 0, max: 50, value: v.extra_labor_discount_pct }),
      included: h('textarea', { rows: 4 }, v.included.join('\n')),
      exclusions: h('textarea', { rows: 3 }, v.exclusions.join('\n'))
    };
    const save = async () => {
      await db.update(`plan_versions?id=eq.${v.id}`, {
        price_cents: toCents(f.price.value), duration_months: Number(f.months.value), visits: Number(f.visits.value), interventions: Number(f.interventions.value),
        checkups: Number(f.checkups.value), max_minutes: f.minutes.value ? Number(f.minutes.value) : null, extra_labor_discount_pct: Number(f.discount.value),
        included: lines(f.included.value), exclusions: lines(f.exclusions.value)
      });
    };
    if (v.status === 'approved') return approvedCard(v, `${v.plan?.name} — v${v.version} approvata`, `${euro(v.price_cents)} IVA inclusa · ${v.duration_months} mesi`);
    return h('section', { class: 'app-card' },
      h('h3', {}, `${v.plan?.name} — bozza v${v.version}`),
      h('div', { class: 'app-form-grid' }, field('Prezzo IVA inclusa (€)', f.price), field('Durata (mesi)', f.months), field('Uscite', f.visits), field('Interventi inclusi', f.interventions),
        field('Controlli preventivi', f.checkups), field('Durata max intervento (min)', f.minutes), field('Sconto oltre i limiti (%)', f.discount),
        field('Prestazioni incluse', f.included), field('Esclusioni', f.exclusions)),
      h('div', { class: 'app-actions' },
        act('Salva bozza', async () => { await save(); flash('Bozza salvata'); render(); }, 'btn btn--ghost'),
        act('Salva e approva', async () => { await save(); await approveVersion(v); }, 'btn btn--primary'),
        act('Elimina bozza', async () => { await db.remove(`plan_versions?id=eq.${v.id}`); render(); })));
  };
  const code = h('input', { type: 'text' }); const label = h('input', { type: 'text', required: true });
  const kind = h('select', {}, h('option', { value: 'percent' }, 'Percentuale'), h('option', { value: 'fixed' }, 'Importo fisso (€)'));
  const value = h('input', { type: 'text', required: true }); const planIds = h('input', { type: 'text', value: '*' });
  const from = h('input', { type: 'date' }); const to = h('input', { type: 'date' });
  const promoForm = h('form', { class: 'app-card', onsubmit: async (e) => {
    e.preventDefault();
    try {
      await db.insert('promotions', { code: code.value.trim() || null, label: label.value.trim(), kind: kind.value, value: kind.value === 'percent' ? Number(value.value) : toCents(value.value),
        plan_ids: planIds.value.split(',').map((x) => x.trim()).filter(Boolean), starts_at: from.value || null, ends_at: to.value || null });
      flash('Promozione creata'); render();
    } catch (err) { flash(err.message, 'error'); }
  } }, h('h2', {}, 'Nuova promozione'), h('p', { class: 'app-muted' }, 'Le promozioni valgono per le nuove sottoscrizioni e non sono cumulabili.'),
  h('div', { class: 'app-form-grid' }, field('Codice', code), field('Descrizione', label), field('Tipo', kind), field('Valore', value), field('Piani (codici separati da virgola, * = tutti)', planIds), field('Dal', from), field('Al', to)),
  h('button', { class: 'btn btn--primary', type: 'submit' }, 'Crea promozione'));
  return h('div', {},
    h('h2', { class: 'app-h2' }, 'Bozze in lavorazione'),
    drafts.length ? drafts.map(draftForm) : h('p', { class: 'app-muted' }, 'Nessuna bozza. Crea una nuova bozza dalla sezione PRONTO+ Family o Lavoro Protetto.'),
    h('h2', { class: 'app-h2' }, 'Promozioni'),
    table([{ label: 'Codice', key: 'code' }, { label: 'Descrizione', key: 'label' }, { label: 'Sconto', render: (p) => (p.kind === 'percent' ? `${p.value}%` : euro(p.value)) },
      { label: 'Validità', render: (p) => `${date(p.starts_at)} → ${date(p.ends_at)}` }, { label: 'Stato', render: (p) => (p.active ? 'Attiva' : 'Disattivata') },
      { label: '', render: (p) => act(p.active ? 'Disattiva' : 'Riattiva', async () => { await db.update(`promotions?id=eq.${p.id}`, { active: !p.active }); render(); }) }], promos),
    promoForm,
    h('h2', { class: 'app-h2' }, 'Storico delle modifiche'),
    table([{ label: 'Quando', render: (r) => dateTime(r.at) }, { label: 'Operazione', key: 'action' }, { label: 'Ruolo', key: 'actor_role' },
      { label: 'Dettaglio', render: (r) => summarize(r) }], history));
}
function summarize(r) {
  const o = r.old_data || {}; const n = r.new_data || {};
  const keys = Object.keys(n).filter((k) => JSON.stringify(o[k]) !== JSON.stringify(n[k]) && !['updated_at'].includes(k));
  if (r.action === 'INSERT') return `Creato ${n.plan_id || n.id || ''}`;
  return keys.slice(0, 4).map((k) => `${k}: ${k.endsWith('_cents') && o[k] != null ? euro(o[k]) : o[k] ?? '—'} → ${k.endsWith('_cents') && n[k] != null ? euro(n[k]) : n[k] ?? '—'}`).join('; ') || '—';
}

/* ---------------------------------------------------------------- 5. clienti */
async function clienti() {
  const rows = await db.select('profiles?role=eq.customer&select=id,full_name,email,phone,marketing_consent,created_at,properties(id)&order=created_at.desc');
  const q = h('input', { type: 'search', placeholder: 'Cerca per nome o email' });
  const out = h('div');
  const draw = () => fill(out, table([{ label: 'Nome', key: 'full_name' }, { label: 'Email', key: 'email' }, { label: 'Telefono', key: 'phone' },
    { label: 'Immobili', render: (r) => r.properties.length }, { label: 'Consenso marketing', render: (r) => (r.marketing_consent ? 'Sì' : 'No') }, { label: 'Dal', render: (r) => date(r.created_at) }],
  rows.filter((r) => `${r.full_name} ${r.email}`.toLowerCase().includes(q.value.toLowerCase()))));
  q.addEventListener('input', draw); draw();
  return h('div', {}, field('Cerca', q), out);
}

/* ---------------------------------------------------------------- 6. contratti */
async function contratti() {
  const rows = await db.select('contracts?select=*,customer:profiles(full_name,email)&order=created_at.desc');
  const now = Date.now();
  const eff = (c) => (c.status === 'active' && new Date(c.ends_at) <= now ? 'expired' : c.status);
  const cols = [{ label: 'Cliente', render: (c) => c.customer?.full_name || c.customer?.email }, { label: 'Piano', render: (c) => c.snapshot?.plan_name },
    { label: 'Prezzo', render: (c) => euro(c.price_cents) }, { label: 'Stato', render: (c) => statusBadge(eff(c)) }, { label: 'Validità', render: (c) => (c.starts_at ? `${date(c.starts_at)} → ${date(c.ends_at)}` : '—') }];
  return h('div', {}, ['active', 'expired', 'pending_payment'].map((s) => h('section', { class: 'app-card' }, h('h2', {}, { active: 'Attivi', expired: 'Scaduti', pending_payment: 'In attesa di pagamento' }[s]), table(cols, rows.filter((c) => eff(c) === s)))));
}

/* ---------------------------------------------------------------- 7. interventi */
async function interventi() {
  const [rows, techs, customers, services] = await Promise.all([
    db.select('interventions?select=*,customer:profiles(full_name),property:properties(address_line,city),service:services(name),report:intervention_reports(work_description,materials,technical_notes,duration_minutes),certificates(number,status)&order=created_at.desc'),
    db.select('technicians?active=eq.true&select=id,display_name'),
    db.select('profiles?role=eq.customer&select=id,full_name,email,properties(id,address_line,city)'),
    db.select('services?active=eq.true&select=id,name&order=id')
  ]);
  // Prompt 5: tecnico, data e stato si gestiscono dalla centrale operativa (controlli di disponibilità e conflitti)
  const techSel = (i) => h('span', {}, techs.find((t) => t.id === i.technician_id)?.display_name || '—', ' ',
    h('a', { class: 'btn btn--ghost btn--sm', href: `/admin/centrale-operativa/#r=${i.id}` }, 'Centrale'));
  const rep = (i) => (Array.isArray(i.report) ? i.report[0] : i.report);
  const actions = (i) => {
    const cert = (i.certificates || []).find((c) => c.status === 'valid');
    if (i.status === 'completed') return h('div', { class: 'app-actions' }, h('details', {}, h('summary', {}, 'Rapporto'), h('p', {}, rep(i)?.work_description || '—'),
      h('p', { class: 'app-muted' }, `Materiali: ${(rep(i)?.materials || []).map((m) => m.name || m).join(', ') || '—'} · Note: ${rep(i)?.technical_notes || '—'} · ${rep(i)?.duration_minutes || '—'} min`)),
    act('Verifica dati', async () => { await db.rpc('verify_intervention', { p_intervention: i.id }); flash('Intervento verificato'); render(); }, 'btn btn--primary btn--sm'));
    if (i.status === 'verified' && !cert) return act('Emetti certificato', async () => { const c = await db.rpc('issue_certificate', { p_intervention: i.id }); flash(`Certificato ${c.number} emesso`); render(); }, 'btn btn--primary btn--sm');
    if (cert) return act(`PDF ${cert.number}`, () => downloadCertificate(cert.number));
    return null;
  };
  const fiscal = (i) => {
    const inp = h('input', { type: 'text', value: i.fiscal_document_ref || '', 'aria-label': 'Documento fiscale', placeholder: 'es. Fattura 12/2026' });
    inp.addEventListener('change', async () => { await db.update(`interventions?id=eq.${i.id}`, { fiscal_document_ref: inp.value.trim() || null }); flash('Documento fiscale collegato'); });
    return i.status === 'verified' && (i.certificates || []).length ? h('span', {}, i.fiscal_document_ref || '—') : inp;
  };
  const form = h('div', { class: 'app-card' }, h('h2', {}, 'Nuovo intervento'),
    h('p', { class: 'app-muted' }, 'Le nuove richieste e gli interventi si inseriscono dalla centrale operativa, che controlla duplicati, disponibilità dei tecnici e conflitti di calendario.'),
    h('a', { class: 'btn btn--primary', href: '/admin/centrale-operativa/' }, 'Apri la centrale operativa'));
  return h('div', {}, table([
    { label: 'Numero', key: 'number' }, { label: 'Cliente', render: (i) => i.customer?.full_name }, { label: 'Servizio', render: (i) => i.service?.name },
    { label: 'Luogo', render: (i) => i.property?.city }, { label: 'Data', render: (i) => date(i.completed_at || i.scheduled_at) }, { label: 'Stato', render: (i) => statusBadge(i.status) },
    { label: 'Tecnico', render: techSel }, { label: 'Documento fiscale', render: fiscal }, { label: 'Azioni', render: actions }
  ], rows), form);
}

/* ---------------------------------------------------------------- 8. lavoro protetto */
async function lavoroProtetto() {
  const purchases = await db.select('protected_purchases?select=*,customer:profiles(full_name),intervention:interventions(number)&order=created_at.desc');
  return h('div', {}, await plansView('protected'),
    h('section', { class: 'app-card' }, h('h2', {}, 'Servizi acquistati'),
      table([{ label: 'Cliente', render: (p) => p.customer?.full_name }, { label: 'Intervento', render: (p) => p.intervention?.number }, { label: 'Piano', render: (p) => p.snapshot?.plan_name },
        { label: 'Prezzo', render: (p) => euro(p.price_cents) }, { label: 'Stato', render: (p) => statusBadge(p.status) }, { label: 'Validità', render: (p) => (p.starts_at ? `${date(p.starts_at)} → ${date(p.ends_at)}` : '—') }], purchases)));
}

/* ---------------------------------------------------------------- 9. richieste */
async function richieste() {
  const [disputes, requests, checks, techs] = await Promise.all([
    db.select('disputes?select=*,customer:profiles(full_name),intervention:interventions(number)&order=created_at.desc'),
    db.select('assistance_requests?select=*,customer:profiles(full_name)&order=created_at.desc'),
    db.select('scheduled_checks?select=*&order=scheduled_at.desc'),
    db.select('technicians?active=eq.true&select=id,display_name')
  ]);
  const disputeCtl = (d) => {
    const st = h('select', { 'aria-label': 'Nuovo stato' }, ['received', 'in_review', 'inspection_scheduled', 'resolved', 'not_accepted'].map((s) => h('option', { value: s, selected: s === d.status }, s)));
    const note = h('input', { type: 'text', 'aria-label': 'Nota per il cliente', placeholder: 'Nota per il cliente (obbligatoria se non accolta)', value: d.resolution_note || '' });
    return h('div', { class: 'app-inline' }, st, note, act('Aggiorna', async () => { await db.rpc('update_dispute', { p_id: d.id, p_status: st.value, p_note: note.value.trim() || null }); flash('Stato aggiornato e cliente notificato'); render(); }));
  };
  const scheduleCtl = (r) => {
    if (r.status !== 'received') return statusBadge(r.status);
    const when = h('input', { type: 'datetime-local', 'aria-label': 'Data e ora della visita' });
    const t = h('select', { 'aria-label': 'Tecnico' }, techs.map((x) => h('option', { value: x.id }, x.display_name)));
    return h('div', { class: 'app-inline' }, when, t, act('Programma', async () => { await db.rpc('schedule_check', { p_request: r.id, p_at: new Date(when.value).toISOString(), p_technician: t.value }); flash('Visita programmata'); render(); }));
  };
  return h('div', {},
    h('section', { class: 'app-card' }, h('h2', {}, 'Segnalazioni di difetto e contestazioni'),
      h('p', { class: 'app-muted' }, 'Ricevute da tutti i clienti, con o senza piani. Ogni esito negativo richiede una motivazione scritta.'),
      table([{ label: 'Numero', key: 'number' }, { label: 'Cliente', render: (d) => d.customer?.full_name }, { label: 'Intervento', render: (d) => d.intervention?.number },
        { label: 'Ricevuta', render: (d) => dateTime(d.created_at) }, { label: 'Descrizione', key: 'description' }, { label: 'Stato', render: (d) => statusBadge(d.status) }, { label: 'Gestione', render: disputeCtl }], disputes)),
    h('section', { class: 'app-card' }, h('h2', {}, 'Richieste di servizio aggiuntivo'),
      table([{ label: 'Numero', key: 'number' }, { label: 'Cliente', render: (r) => r.customer?.full_name }, { label: 'Data richiesta', render: (r) => date(r.requested_date) }, { label: 'Note', key: 'message' }, { label: 'Programmazione', render: scheduleCtl }], requests)),
    h('section', { class: 'app-card' }, h('h2', {}, 'Controlli programmati'),
      table([{ label: 'Data', render: (c) => dateTime(c.scheduled_at) }, { label: 'Stato', render: (c) => statusBadge(c.status) }, { label: 'Confermato', render: (c) => (c.confirmed_at ? date(c.confirmed_at) : 'No') },
        { label: '', render: (c) => (c.status === 'completed' && !c.confirmed_at ? act('Conferma esecuzione', async () => { await db.rpc('confirm_check', { p_check: c.id }); flash('Esecuzione confermata: prestazione scalata'); render(); }) : null) }], checks)));
}

/* ---------------------------------------------------------------- 10. pagamenti */
/* ---------------------------------------------------------------- 11. report */
async function report() {
  const [pays, contracts, ints, disputes] = await Promise.all([
    db.select('payments?status=eq.paid&select=kind,amount_cents,verified_at'), db.select('contracts?status=eq.active&select=snapshot'),
    db.select('interventions?select=status,service:services(category:service_categories(name))'), db.select('disputes?select=status')
  ]);
  const group = (arr, keyFn, valFn = () => 1) => Object.entries(arr.reduce((m, x) => { const k = keyFn(x) || '—'; m[k] = (m[k] || 0) + valFn(x); return m; }, {})).sort((a, b) => b[1] - a[1]);
  const block = (title, rows, fmt = String) => h('section', { class: 'app-card' }, h('h2', {}, title), table([{ label: 'Voce', render: (r) => r[0] }, { label: 'Valore', render: (r) => fmt(r[1]) }], rows));
  const byKind = group(pays, (p) => ({ family_contract: 'PRONTO+ Family', protected_purchase: 'Lavoro Protetto', intervention: 'Interventi' }[p.kind]), (p) => p.amount_cents);
  const csv = () => {
    const lines2 = [['tipo', 'importo_eur'], ...byKind.map(([k, v]) => [k, (v / 100).toFixed(2)])].map((r) => r.join(';')).join('\n');
    const a = h('a', { href: URL.createObjectURL(new Blob([lines2], { type: 'text/csv' })), download: 'incassi.csv' }); a.click();
  };
  return h('div', { class: 'app-grid' }, block('Incassi confermati per tipo', byKind, euro), block('Contratti attivi per piano', group(contracts, (c) => c.snapshot?.plan_name)),
    block('Interventi per categoria', group(ints, (i) => i.service?.category?.name)), block('Segnalazioni per stato', group(disputes, (d) => d.status)),
    h('div', {}, act('Esporta incassi (CSV)', csv, 'btn btn--ghost')));
}

/* ---------------------------------------------------------------- 12. impostazioni */
async function impostazioni() {
  const [s] = await db.select('company_settings?id=eq.1&select=*');
  const d = s?.data || {};
  const f = {
    company_name: h('input', { type: 'text', value: d.company_name || '' }),
    booking_notice_days: h('input', { type: 'number', min: 0, value: d.booking_notice_days ?? 3 }),
    protected_purchase_window_days: h('input', { type: 'number', min: 1, value: d.protected_purchase_window_days ?? 30 }),
    protected_zones: h('input', { type: 'text', value: (d.protected_zones || ['Roma']).join(', ') }),
    visit_max_minutes: h('input', { type: 'number', min: 15, value: d.visit_max_minutes ?? 60 }),
    legal_name: h('input', { type: 'text', value: d.legal_name || '' }),
    vat_number: h('input', { type: 'text', inputmode: 'numeric', maxlength: 11, value: d.vat_number || '' }),
    legal_address: h('input', { type: 'text', value: d.legal_address || '' }),
    pec: h('input', { type: 'email', value: d.pec || '' }),
    margin_threshold_pct: h('input', { type: 'number', min: 0, max: 90, value: d.margin_threshold_pct ?? 25 })
  };
  const verified = h('input', { type: 'checkbox', id: 'company-verified' }); verified.checked = d.company_data_verified === true;
  const blockMargin = h('input', { type: 'checkbox', id: 'block-margin' }); blockMargin.checked = d.block_below_margin === true;
  const PM = [['mypos', 'Pagamento online (checkout myPOS)'], ['bonifico', 'Bonifico'], ['riba', 'RiBa'], ['pos', 'POS in sede'], ['contanti', 'Contanti (nei limiti di legge)'], ['altro', 'Altro, con riferimento']];
  const pmBoxes = PM.map(([k, l]) => { const c = h('input', { type: 'checkbox', id: `pm-${k}`, value: k }); c.checked = (d.b2b_payment_methods || ['bonifico']).includes(k); return h('label', { class: 'chip-check', for: `pm-${k}` }, c, h('span', {}, l)); });
  const sales = h('input', { type: 'checkbox', id: 'sales' }); sales.checked = s?.sales_enabled === true;
  return h('form', { class: 'app-card', onsubmit: async (e) => {
    e.preventDefault();
    if (sales.checked && !s?.sales_enabled && !confirm('Abilitare la vendita? Verifica prima approvazione del titolare, revisione legale delle condizioni e collegamento myPOS in produzione.')) return;
    try {
      await db.update('company_settings?id=eq.1', { sales_enabled: sales.checked, data: { ...d, company_name: f.company_name.value.trim(), booking_notice_days: Number(f.booking_notice_days.value),
        protected_purchase_window_days: Number(f.protected_purchase_window_days.value), protected_zones: f.protected_zones.value.split(',').map((x) => x.trim()).filter(Boolean), visit_max_minutes: Number(f.visit_max_minutes.value),
        legal_name: f.legal_name.value.trim() || null, vat_number: f.vat_number.value.trim() || null, legal_address: f.legal_address.value.trim() || null, pec: f.pec.value.trim() || null,
        company_data_verified: verified.checked && Boolean(f.legal_name.value.trim() && f.vat_number.value.trim() && f.legal_address.value.trim()),
        margin_threshold_pct: Number(f.margin_threshold_pct.value), block_below_margin: blockMargin.checked,
        b2b_payment_methods: pmBoxes.map((l) => l.querySelector('input')).filter((c) => c.checked).map((c) => c.value) }, updated_at: new Date().toISOString() });
      flash('Impostazioni salvate'); render();
    } catch (err) { flash(err.message, 'error'); }
  } },
    h('div', { class: 'app-form-grid' }, field('Nome dell’impresa sui documenti', f.company_name), field('Preavviso minimo visite (giorni)', f.booking_notice_days),
      field('Finestra acquisto Lavoro Protetto (giorni)', f.protected_purchase_window_days), field('Comuni serviti per le visite', f.protected_zones), field('Durata massima visite (minuti)', f.visit_max_minutes)),
    h('div', { class: 'field field--check' }, sales, h('label', { for: 'sales' }, 'Vendita online abilitata (richiede approvazioni e pagamenti configurati)')),
    h('h2', {}, 'Dati aziendali per preventivi e contratti B2B'),
    h('div', { class: 'app-form-grid' }, field('Ragione sociale', f.legal_name), field('Partita IVA', f.vat_number), field('Sede legale', f.legal_address), field('PEC', f.pec)),
    h('div', { class: 'field field--check' }, verified, h('label', { for: 'company-verified' }, 'Dati verificati dal titolare (senza questa conferma i preventivi PDF riportano “BOZZA – dati da completare”)')),
    h('h2', {}, 'Controlli commerciali'),
    h('div', { class: 'app-form-grid' }, field('Soglia di margine per l’avviso (%)', f.margin_threshold_pct)),
    h('div', { class: 'field field--check' }, blockMargin, h('label', { for: 'block-margin' }, 'Regola esplicita: blocca l’approvazione sotto soglia (se disattivata, è solo un avviso da confermare)')),
    h('h2', {}, 'Modalità di pagamento B2B approvate dal titolare'),
    h('p', { class: 'app-muted' }, 'Valgono per i contratti Business, Hotel e Corporate che non indicano modalità proprie (terms.paymentMethods). Il pagamento online richiede anche myPOS configurato.'),
    h('div', { class: 'chip-group__list' }, pmBoxes),
    notice('info', 'Provider di notifica, chiavi myPOS e chiavi del database si configurano solo nelle variabili d’ambiente di Netlify, mai qui.'),
    h('button', { class: 'btn btn--primary', type: 'submit' }, 'Salva impostazioni'));
}

/* ---------------------------------------------------------------- shell */
const VIEWS = { panoramica, catalogo, family: () => plansView('family'), prezzi, clienti, contratti, interventi, 'lavoro-protetto': lavoroProtetto, richieste, report, impostazioni,
  ...b2bViews({ act, flash: (m, t) => flash(m, t), render: () => render() }),
  ...paymentsViews({ act, flash: (m, t) => flash(m, t), render: () => render() }) };
let currentProfile;
async function render() {
  const key = VIEWS[location.hash.slice(1)] ? location.hash.slice(1) : 'panoramica';
  const title = SECTIONS.find(([k]) => k === key)[1];
  fill(main, h('h1', { class: 'section-title app-h1' }, title), h('p', { class: 'app-muted' }, 'Caricamento…'));
  root.querySelectorAll('.app-side a').forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === `#${key}` ? 'page' : 'false'));
  try { const content = await VIEWS[key](); fill(main, h('h1', { class: 'section-title app-h1' }, title), content); }
  catch (err) { fill(main, h('h1', { class: 'section-title app-h1' }, title), notice('error', err.message)); }
}

if (root) {
  boot(root, {
    title: 'Dashboard amministrativa',
    requireRole: ['admin'],
    render: async ({ profile, restart }) => {
      currentProfile = profile;
      main = h('main', { class: 'app-main', id: 'admin-main', tabindex: '-1' });
      fill(root, h('div', { class: 'app-admin' },
        h('nav', { class: 'app-side', 'aria-label': 'Sezioni dashboard' },
          h('p', { class: 'app-side__who' }, currentProfile.full_name || currentProfile.email),
          h('ul', {}, SECTIONS.map(([k, l], i) => h('li', {}, h('a', { href: `#${k}` }, h('span', { class: 'app-side__n' }, String(i + 1).padStart(2, '0')), l)))),
          h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: async () => { await auth.signOut(); restart(); } }, 'Esci')),
        main));
      window.addEventListener('hashchange', render);
      await render();
    }
  });
}
