/**
 * DASHBOARD — SEZIONI B2B (Business, Hotel, Condomini, Corporate).
 * Ogni operazione con effetti contrattuali, economici o di stato passa dalle
 * funzioni del database (validazione, permessi, idempotenza, audit).
 * Costi interni e margini sono visibili solo qui (ruolo admin).
 */
import { h, fill, euro, date, dateTime, notice, badge, db, table, field, openPdf, downloadCertificate } from './core.js';
import { approveVersion, approvedCard } from './admin.js';
import {
  requestBadge, contractBadge, quoteBadge, leadBadge, visitBadge, installmentBadge, REQUEST_LABELS, LEAD_LABELS, ROLE_LABELS, KIND_LABELS, LINE_LABELS,
  URGENCY_LABELS, BENEFIT_LABELS, qty
} from './b2b-common.js';

export const B2B_SECTIONS = [
  ['b2b-clienti', 'Clienti B2B e sedi'], ['b2b-listini', 'Listini Business e Hotel'], ['b2b-contratti', 'Contratti annuali'], ['b2b-preventivi', 'Preventivi'],
  ['b2b-richieste', 'Richieste aziendali'], ['b2b-calendario', 'Calendario e manutenzioni'], ['b2b-lead', 'Lead B2B'], ['b2b-ricavi', 'Ricavi e scadenze B2B']
];

const ADMIN_FLOW = {
  submitted: ['under_review', 'cancelled'], under_review: ['to_schedule', 'cancelled'], to_schedule: ['scheduled', 'cancelled'],
  scheduled: ['technician_assigned', 'to_schedule', 'cancelled'], technician_assigned: ['in_progress', 'scheduled', 'cancelled'],
  in_progress: ['completed'], completed: ['closed', 'in_progress'], closed: [], cancelled: []
};
const toCents = (v) => { const s = String(v).replace(',', '.').trim(); if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Importo non valido: ${v}`); return Math.round(Number(s) * 100); };
const lines = (v) => String(v).split('\n').map((x) => x.trim()).filter(Boolean);
const num = (v, d = 0) => (v === '' || v === null || v === undefined ? d : Number(v));
const inp = (attrs = {}) => h('input', { type: 'text', ...attrs });
const sel = (opts, value, attrs = {}) => h('select', attrs, opts.map(([v, l]) => h('option', { value: v, selected: String(v) === String(value ?? '') }, l)));
const localDT = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };

/** Approvazione con avviso di margine: prima senza conferma, poi (se richiesto) con conferma esplicita. */
async function approveWithMargin(rpc, args, flash) {
  try { return await db.rpc(rpc, { ...args, p_ack_margin: false }); } catch (err) {
    if (!/confermare/i.test(err.message)) throw err;
    if (!confirm(`${err.message}.\n\nProcedere comunque con l’approvazione? La conferma viene registrata.`)) { flash('Approvazione annullata.', 'warn'); return null; }
    return db.rpc(rpc, { ...args, p_ack_margin: true });
  }
}

export function b2bViews({ act, flash, render }) {
  /* ============================================================ CLIENTI, SEDI, REFERENTI */
  async function clienti() {
    const accounts = await db.select('business_accounts?select=*,locations:business_locations(count),members:business_members(count)&order=legal_name');
    const kind = sel([['', 'Tutte le tipologie'], ...Object.entries(KIND_LABELS)], '', { 'aria-label': 'Filtra per tipologia' });
    const q = inp({ placeholder: 'Cerca ragione sociale o P.IVA', 'aria-label': 'Cerca' });
    const list = h('div');
    const detail = h('div');
    const draw = () => fill(list, table([
      { label: 'Azienda', render: (a) => h('strong', {}, a.legal_name) }, { label: 'Tipologia', render: (a) => KIND_LABELS[a.kind] }, { label: 'P.IVA', render: (a) => a.vat_number || '—' },
      { label: 'Sedi', render: (a) => String(a.locations?.[0]?.count ?? 0) }, { label: 'Referenti', render: (a) => String(a.members?.[0]?.count ?? 0) },
      { label: '', render: (a) => act('Gestisci', async () => { fill(detail, await accountDetail(a)); detail.scrollIntoView({ block: 'start' }); }) }
    ], accounts.filter((a) => (!kind.value || a.kind === kind.value) && (!q.value || `${a.legal_name} ${a.vat_number || ''}`.toLowerCase().includes(q.value.toLowerCase())))));
    kind.onchange = draw; q.oninput = draw; draw();
    const f = { kind: sel(Object.entries(KIND_LABELS), 'business'), name: inp({ required: true }), vat: inp({ inputmode: 'numeric', maxlength: 11 }), segment: inp(), pec: inp({ type: 'email' }), sdi: inp({ maxlength: 7 }), addr: inp(), city: inp({ value: 'Roma' }), cap: inp({ inputmode: 'numeric' }) };
    return h('div', { class: 'app-stack' },
      h('section', { class: 'app-card' }, h('div', { class: 'app-inline' }, kind, q), list),
      detail,
      h('form', { class: 'app-card', onsubmit: async (e) => {
        e.preventDefault();
        try {
          await db.rpc('create_business_account', { p_kind: f.kind.value, p_legal_name: f.name.value.trim(), p_vat: f.vat.value.trim() || null, p_segment: f.segment.value.trim() || null,
            p_pec: f.pec.value.trim() || null, p_sdi: f.sdi.value.trim() || null, p_address: f.addr.value.trim() || null, p_city: f.city.value.trim() || null, p_cap: f.cap.value.trim() || null });
          flash('Azienda creata.'); render();
        } catch (err) { flash(err.message, 'error'); }
      } }, h('h2', {}, 'Nuova azienda cliente'),
        h('div', { class: 'app-form-grid' }, field('Tipologia', f.kind), field('Ragione sociale', f.name), field('Partita IVA', f.vat, 'Verificata con la cifra di controllo'), field('Settore', f.segment),
          field('PEC', f.pec), field('Codice SDI', f.sdi), field('Indirizzo di fatturazione', f.addr), field('Comune', f.city), field('CAP', f.cap)),
        h('button', { class: 'btn btn--primary', type: 'submit' }, 'Crea azienda')));
  }

  async function accountDetail(a) {
    const [locs, members, contracts] = await Promise.all([
      db.select(`business_locations?account_id=eq.${a.id}&select=*&order=code`), db.rpc('business_members_list', { p_account: a.id }),
      db.select(`business_contracts?account_id=eq.${a.id}&select=id,number,status,line,ends_at&order=created_at.desc`)
    ]);
    const l = { code: inp({ required: true, placeholder: 'SEDE-01' }), name: inp({ required: true }), addr: inp({ required: true }), city: inp({ value: 'Roma', required: true }), kind: sel(['sede', 'hotel', 'struttura_ricettiva', 'ristorante', 'bar', 'negozio', 'supermercato', 'ufficio', 'centro_commerciale', 'condominio', 'stabilimento', 'magazzino', 'altro'].map((k) => [k, k]), 'sede'), cn: inp(), cp: inp() };
    const m = { email: inp({ type: 'email', required: true }), role: sel(Object.entries(ROLE_LABELS), 'company_admin') };
    const mLocs = locs.map((x) => { const cb = h('input', { type: 'checkbox', value: x.id, id: `aml-${x.id}` }); return { cb, el: h('label', { class: 'chip-check', for: `aml-${x.id}` }, cb, h('span', {}, x.code)) }; });
    const reload = async () => { fill(document.getElementById(`acc-${a.id}`), ...(await accountDetail(a)).childNodes); };
    return h('section', { class: 'app-card', id: `acc-${a.id}` },
      h('h2', {}, `${a.legal_name} — ${KIND_LABELS[a.kind]}`),
      h('p', { class: 'app-muted' }, [a.vat_number && `P.IVA ${a.vat_number}`, a.pec && `PEC ${a.pec}`, a.sdi_code && `SDI ${a.sdi_code}`, [a.billing_address, a.billing_city].filter(Boolean).join(', ')].filter(Boolean).join(' · ')),
      h('h3', {}, 'Sedi'),
      table([{ label: 'Codice', key: 'code' }, { label: 'Nome', key: 'name' }, { label: 'Indirizzo', render: (x) => `${x.address_line}, ${x.city}` }, { label: 'Tipologia', key: 'kind' }, { label: 'Referente', render: (x) => [x.contact_name, x.contact_phone].filter(Boolean).join(' · ') || '—' }], locs, { empty: 'Nessuna sede.' }),
      h('form', { class: 'app-subform', onsubmit: async (e) => {
        e.preventDefault();
        try { await db.rpc('add_business_location', { p_account: a.id, p_code: l.code.value.trim(), p_name: l.name.value.trim(), p_address: l.addr.value.trim(), p_city: l.city.value.trim(), p_kind: l.kind.value, p_contact_name: l.cn.value.trim() || null, p_contact_phone: l.cp.value.trim() || null }); flash('Sede aggiunta.'); await reload(); }
        catch (err) { flash(err.message, 'error'); }
      } }, h('h4', {}, 'Aggiungi sede'), h('div', { class: 'app-form-grid' }, field('Codice', l.code), field('Nome', l.name), field('Indirizzo', l.addr), field('Comune', l.city), field('Tipologia', l.kind), field('Referente', l.cn), field('Telefono', l.cp)),
        h('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, 'Aggiungi sede')),
      h('h3', {}, 'Referenti autorizzati'),
      table([{ label: 'Nome', render: (x) => x.full_name || '—' }, { label: 'Email', key: 'email' }, { label: 'Ruolo', render: (x) => ROLE_LABELS[x.role] }, { label: 'Sedi', render: (x) => (['company_admin', 'maintenance_manager'].includes(x.role) ? 'Tutte' : (x.location_ids || []).map((id) => locs.find((y) => y.id === id)?.code).join(', ') || 'Nessuna') }], members, { empty: 'Nessun referente.' }),
      h('form', { class: 'app-subform', onsubmit: async (e) => {
        e.preventDefault();
        try { await db.rpc('add_business_member', { p_account: a.id, p_email: m.email.value.trim(), p_role: m.role.value, p_locations: mLocs.filter((x) => x.cb.checked).map((x) => x.cb.value) }); flash('Referente salvato.'); await reload(); }
        catch (err) { flash(err.message, 'error'); }
      } }, h('h4', {}, 'Aggiungi o modifica referente'), h('p', { class: 'app-muted' }, 'L’utente deve aver già effettuato l’accesso con la propria email.'),
        h('div', { class: 'app-form-grid' }, field('Email', m.email), field('Ruolo', m.role)), h('div', { class: 'chip-group__list' }, mLocs.map((x) => x.el)),
        h('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, 'Salva referente')),
      h('h3', {}, 'Contratti'),
      table([{ label: 'Numero', key: 'number' }, { label: 'Linea', render: (c) => LINE_LABELS[c.line] }, { label: 'Stato', render: (c) => contractBadge(c.status) }, { label: 'Scadenza', render: (c) => date(c.ends_at) }], contracts, { empty: 'Nessun contratto.' }));
  }

  /* ============================================================ LISTINI B2B (IVA esclusa) */
  async function listini() {
    const plans = await db.select('plans?line=in.(business,hotel,corporate)&select=*,versions:plan_versions(*)&order=line,id');
    const toggle = (p, k) => act(p[k] ? 'Sì' : 'No', async () => { await db.update(`plans?id=eq.${p.id}`, { [k]: !p[k] }); flash('Aggiornato'); render(); }, `btn btn--sm ${p[k] ? 'btn--primary' : 'btn--ghost'}`);
    const rows = plans.map((p) => ({ ...p, pub: p.versions.find((v) => v.status === 'published'), draft: p.versions.find((v) => v.status === 'draft' || v.status === 'approved') }));
    return h('div', { class: 'app-stack' },
      notice('info', 'Prezzi IVA esclusa (+ IVA, se applicabile). Le modifiche si fanno su una bozza e valgono solo per i nuovi contratti: i contratti esistenti conservano la versione accettata. Corporate: sempre personalizzato, si gestisce da Preventivi e Contratti.'),
      h('section', { class: 'app-card' }, table([
        { label: 'Piano', render: (p) => h('span', {}, p.name, ' ', badge(LINE_LABELS[p.line] || p.line, 'neutral')) },
        { label: 'Pubblicato', render: (p) => (p.pub ? `${euro(p.pub.price_cents)} + IVA · v${p.pub.version}` : 'Personalizzato') },
        { label: 'Bozza', render: (p) => (p.draft ? `v${p.draft.version} · ${euro(p.draft.price_cents)}` : '—') },
        { label: 'Attivo', render: (p) => toggle(p, 'active') }, { label: 'Titolare', render: (p) => toggle(p, 'owner_approved') }, { label: 'Legale', render: (p) => toggle(p, 'legal_reviewed') },
        { label: '', render: (p) => (!p.draft && p.pub ? act('Nuova bozza', async () => { await db.rpc('create_plan_draft', { p_plan_id: p.id }); flash('Bozza creata'); render(); }) : null) }
      ], rows)),
      rows.filter((p) => p.draft).map((p) => draftEditor(p, p.draft)));
  }

  function draftEditor(p, v) {
    if (v.status === 'approved') return approvedCard({ ...v, plan_id: p.id }, `${p.name} — v${v.version} approvata`, `${euro(v.price_cents)} + IVA all’anno · ${v.duration_months} mesi`);
    const c = v.conditions || {}; const b = c.benefits || {}; const r = c.rules || {}; const rt = c.rates || {}; const s = rt.surcharges || {};
    const f = {
      price: inp({ inputmode: 'decimal', value: (v.price_cents / 100).toFixed(2) }), months: h('input', { type: 'number', min: 1, max: 36, value: v.duration_months }),
      callFee: h('input', { type: 'number', min: 0, value: b.callFee ?? 0 }), small: h('input', { type: 'number', min: 0, value: b.smallIntervention ?? 0 }),
      smallMax: h('input', { type: 'number', min: 0, value: b.smallInterventionMaxMinutes ?? '' }), hours: h('input', { type: 'number', min: 0, step: '0.25', value: (b.maintenanceMinutes ?? 0) / 60 }),
      visits: h('input', { type: 'number', min: 0, value: b.scheduledVisits ?? 0 }), discount: h('input', { type: 'number', min: 0, max: 50, value: c.discountPct ?? 0 }),
      rounding: h('input', { type: 'number', min: 1, max: 60, value: r.roundingMinutes ?? 15 }), coverage: sel([['first_minutes', 'Copre i primi minuti, eccedenza a pagamento'], ['only_if_within', 'Solo se il lavoro rientra nel limite']], r.smallInterventionCoverage),
      visitHours: sel([['true', 'Il lavoro in visita usa il monte ore'], ['false', 'Il lavoro in visita è fatturato a parte']], String(r.visitWorkUsesHours ?? true)),
      maxJob: h('input', { type: 'number', min: 0, value: r.maxCoveredMinutesPerJob ?? '' }),
      hourly: inp({ inputmode: 'decimal', value: ((rt.hourlyLaborCents ?? 4500) / 100).toFixed(2) }), callFeeRate: inp({ inputmode: 'decimal', value: ((rt.callFeeCents ?? 4000) / 100).toFixed(2) }),
      minBill: h('input', { type: 'number', min: 0, value: rt.minimumBillableMinutes ?? 30 }), ooh: h('input', { type: 'number', min: 0, value: s.outOfHoursPct ?? 30 }), hol: h('input', { type: 'number', min: 0, value: s.holidayPct ?? 50 }),
      included: h('textarea', { rows: 4 }, (v.included || []).join('\n')), exclusions: h('textarea', { rows: 4 }, (v.exclusions || []).join('\n'))
    };
    const save = async () => db.update(`plan_versions?id=eq.${v.id}`, {
      price_cents: toCents(f.price.value), duration_months: num(f.months.value, 12), extra_labor_discount_pct: num(f.discount.value), included: lines(f.included.value), exclusions: lines(f.exclusions.value),
      call_fee_included: num(f.callFee.value) > 0,
      conditions: { ...c, discountPct: num(f.discount.value),
        benefits: { callFee: num(f.callFee.value), smallIntervention: num(f.small.value), smallInterventionMaxMinutes: f.smallMax.value === '' ? null : num(f.smallMax.value), maintenanceMinutes: Math.round(num(f.hours.value) * 60), scheduledVisits: num(f.visits.value) },
        rules: { ...r, roundingMinutes: num(f.rounding.value, 15), smallInterventionCoverage: f.coverage.value, visitWorkUsesHours: f.visitHours.value === 'true', maxCoveredMinutesPerJob: f.maxJob.value === '' ? null : num(f.maxJob.value) },
        rates: { ...rt, hourlyLaborCents: toCents(f.hourly.value), callFeeCents: toCents(f.callFeeRate.value), minimumBillableMinutes: num(f.minBill.value), surcharges: { ...s, outOfHoursPct: num(f.ooh.value), holidayPct: num(f.hol.value) } } }
    });
    return h('section', { class: 'app-card' }, h('h3', {}, `${p.name} — bozza v${v.version}`),
      h('div', { class: 'app-form-grid' }, field('Prezzo annuo IVA esclusa (€)', f.price), field('Durata (mesi)', f.months), field('Diritti di chiamata inclusi', f.callFee), field('Piccoli interventi', f.small),
        field('Durata max piccolo intervento (min)', f.smallMax), field('Monte ore incluso (ore)', f.hours), field('Visite programmate', f.visits), field('Sconto manodopera extra (%)', f.discount)),
      h('h4', {}, 'Regole di contabilizzazione'),
      h('div', { class: 'app-form-grid' }, field('Arrotondamento (minuti)', f.rounding), field('Piccolo intervento oltre il limite', f.coverage), field('Lavoro durante le visite', f.visitHours), field('Massimale minuti coperti per intervento', f.maxJob, 'Vuoto = nessun massimale oltre ai saldi')),
      h('h4', {}, 'Tariffe aggiuntive (IVA esclusa)'),
      h('div', { class: 'app-form-grid' }, field('Manodopera (€/ora)', f.hourly), field('Diritto di chiamata extra (€)', f.callFeeRate), field('Minimo fatturabile (min)', f.minBill), field('Maggiorazione fuori orario (%)', f.ooh), field('Maggiorazione festivi (%)', f.hol)),
      h('div', { class: 'app-form-grid' }, field('Prestazioni incluse (una per riga)', f.included), field('Esclusioni (una per riga)', f.exclusions)),
      h('div', { class: 'app-actions' },
        act('Salva bozza', async () => { await save(); flash('Bozza salvata'); render(); }, 'btn btn--ghost'),
        act('Salva e approva', async () => { await save(); await approveVersion(v); }, 'btn btn--primary'),
        act('Elimina bozza', async () => { await db.remove(`plan_versions?id=eq.${v.id}`); render(); })));
  }

  /* ============================================================ CONTRATTI ANNUALI */
  async function contratti() {
    const [contracts, accounts, plans, techs, checklists] = await Promise.all([
      db.select('business_contracts?select=*,account:business_accounts(legal_name,kind)&order=created_at.desc&limit=300'),
      db.select('business_accounts?select=id,legal_name&active=eq.true&order=legal_name'),
      db.select('plan_versions?status=eq.published&select=plan_id,price_cents,plan:plans!inner(name,line)&plan.line=in.(business,hotel)'),
      db.select('technicians?active=eq.true&select=id,display_name&order=display_name'),
      db.select('maintenance_checklists?active=eq.true&select=id,name')
    ]);
    const fLine = sel([['', 'Tutte le linee'], ...Object.entries(LINE_LABELS)], '', { 'aria-label': 'Linea' });
    const fSt = sel([['', 'Tutti gli stati'], ['draft', 'Bozza'], ['awaiting_client', 'Da accettare'], ['awaiting_payment', 'In attesa di pagamento'], ['active', 'Attivo'], ['expired', 'Scaduto'], ['cancelled', 'Annullato']], '', { 'aria-label': 'Stato' });
    const list = h('div', { class: 'app-list' });
    const draw = () => fill(list, contracts.filter((c) => (!fLine.value || c.line === fLine.value) && (!fSt.value || c.status === fSt.value)).map((c) => h('details', { class: 'app-card', ontoggle: async (e) => {
      const box = e.target.querySelector('.ctr-body');
      if (e.target.open && !box.childElementCount) fill(box, await contractDetail(c, { techs, checklists }));
    } }, h('summary', { class: 'app-int__head' }, h('span', {}, h('strong', {}, c.number), ` · ${c.account?.legal_name} · ${LINE_LABELS[c.line]}`), contractBadge(c.status)), h('div', { class: 'ctr-body' }))));
    fLine.onchange = draw; fSt.onchange = draw; draw();

    // nuovo contratto
    const acc = sel([['', 'Seleziona azienda'], ...accounts.map((a) => [a.id, a.legal_name])], '');
    const line = sel(Object.entries(LINE_LABELS), 'business');
    const plan = h('select');
    const drawPlans = () => fill(plan, line.value === 'corporate' ? h('option', { value: '' }, 'Personalizzato (nessun listino)') : plans.filter((p) => p.plan.line === line.value).map((p) => h('option', { value: p.plan_id }, `${p.plan.name} — ${euro(p.price_cents)} + IVA`)));
    line.onchange = drawPlans; drawPlans();
    const pay = sel([['annual', 'Annuale anticipato'], ['custom', 'Fatturazione personalizzata (rate nei termini)']], 'annual');
    const quarterly = h('input', { type: 'checkbox', id: 'q-approved' });
    const locBox = h('div', { class: 'chip-group__list' });
    acc.onchange = async () => {
      const locs = acc.value ? await db.select(`business_locations?account_id=eq.${acc.value}&select=id,code,name&order=code`) : [];
      fill(locBox, locs.map((l) => h('label', { class: 'chip-check' }, h('input', { type: 'checkbox', value: l.id }), h('span', {}, `${l.code} · ${l.name}`))));
    };
    return h('div', { class: 'app-stack' },
      h('div', { class: 'app-card app-inline' }, fLine, fSt), list,
      h('form', { class: 'app-card', onsubmit: async (e) => {
        e.preventDefault();
        try {
          const locs = [...locBox.querySelectorAll('input:checked')].map((i) => i.value);
          const c = await db.rpc('create_business_contract', { p_account: acc.value, p_line: line.value, p_plan_id: plan.value || null, p_locations: locs, p_payment_plan: pay.value });
          if (quarterly.checked) await db.update(`business_contracts?id=eq.${c.id}`, { payment_plan: 'quarterly', quarterly_approved: true });
          flash(`Contratto ${c.number} creato in bozza: completa costi e condizioni, poi approva.`); render();
        } catch (err) { flash(err.message, 'error'); }
      } }, h('h2', {}, 'Nuovo contratto annuale'),
        h('div', { class: 'app-form-grid' }, field('Azienda', acc), field('Linea', line), field('Piano', plan), field('Pagamento', pay)),
        h('fieldset', { class: 'chip-group' }, h('legend', {}, 'Sedi coperte'), locBox),
        h('div', { class: 'field field--check' }, quarterly, h('label', { for: 'q-approved' }, 'Pagamento trimestrale approvato (eccezione autorizzata)')),
        h('button', { class: 'btn btn--primary', type: 'submit' }, 'Crea bozza di contratto')));
  }

  async function contractDetail(c, { techs, checklists }) {
    const [versions, insts, locs, balances] = await Promise.all([
      db.select(`business_contract_versions?contract_id=eq.${c.id}&select=*&order=version.desc`),
      db.select(`business_installments?contract_id=eq.${c.id}&select=*&order=contract_version_id,number`),
      db.select(`business_contract_locations?contract_id=eq.${c.id}&select=location:business_locations(id,code,name)`),
      db.select(`business_benefit_balances?contract_id=eq.${c.id}&select=id,benefit,unit,quantity,usages:business_benefit_usages(delta)`)
    ]);
    const draft = versions.find((v) => v.status === 'draft');
    const approved = versions.find((v) => v.status === 'approved');
    const out = h('div');
    out.append(
      h('p', { class: 'app-muted' }, `Pagamento: ${c.payment_plan}${c.quarterly_approved ? ' (trimestrale approvato)' : ''} · ${c.starts_at ? `dal ${date(c.starts_at)} al ${date(c.ends_at)}` : 'non attivo'} · rinnovo automatico: ${c.auto_renew ? 'sì, con consenso' : 'no'}`),
      h('p', {}, 'Sedi: ', locs.map((x) => `${x.location.code} · ${x.location.name}`).join(', ') || '—'),
      table([{ label: 'Versione', render: (v) => `v${v.version}` }, { label: 'Stato', render: (v) => contractBadge(v.status) }, { label: 'Prezzo', render: (v) => `${euro(v.price_net_cents)} + IVA` },
        { label: 'Costo interno stimato', render: (v) => (v.internal_cost_cents != null ? euro(v.internal_cost_cents) : '—') },
        { label: 'Margine', render: (v) => (v.margin_pct != null ? h('span', {}, `${v.margin_pct}% `, v.margin_warning ? badge('sotto soglia (confermato)', 'warn') : null) : '—') },
        { label: 'Accettazione', render: (v) => (v.client_accepted_at ? `${v.client_signer_name}, ${dateTime(v.client_accepted_at)}` : '—') }], versions));
    if (draft) out.append(versionEditor(c, draft));
    if (approved) out.append(notice('info', `Versione v${approved.version} approvata: in attesa di accettazione da parte dell’amministratore aziendale nell’area Business.`));
    if (balances.length) out.append(h('h4', {}, 'Prestazioni'), table([{ label: 'Prestazione', render: (b) => BENEFIT_LABELS[b.benefit] }, { label: 'Totale', render: (b) => qty(b.unit, b.quantity) },
      { label: 'Usate', render: (b) => qty(b.unit, b.usages.reduce((n, u) => n + u.delta, 0)) }, { label: 'Residue', render: (b) => h('strong', {}, qty(b.unit, b.quantity - b.usages.reduce((n, u) => n + u.delta, 0))) }], balances));
    if (insts.length) {
      out.append(h('h4', {}, 'Rate'), table([{ label: 'N.', key: 'number' }, { label: 'Scadenza', render: (i) => date(i.due_date) }, { label: 'Importo', render: (i) => euro(i.amount_cents) }, { label: 'Stato', render: (i) => installmentBadge(i.status) },
        { label: 'Riferimento', render: (i) => i.provider_ref || i.reconciliation_ref || '—' },
        { label: 'Riconcilia', render: (i) => {
          if (i.status !== 'due') return i.fiscal_document_ref ? `Doc. ${i.fiscal_document_ref}` : '—';
          const m = sel([['bonifico', 'Bonifico'], ['riba', 'RiBa'], ['altro', 'Altro']], 'bonifico', { 'aria-label': 'Metodo' });
          const ref = inp({ placeholder: 'CRO / riferimento', 'aria-label': 'Riferimento' }); const fis = inp({ placeholder: 'N. fattura', 'aria-label': 'Documento fiscale' });
          return h('div', { class: 'app-inline' }, m, ref, fis, act('Registra incasso', async () => {
            if (!confirm('Confermi di aver verificato l’incasso sul conto? La registrazione è tracciata.')) return;
            await db.rpc('reconcile_installment', { p_installment: i.id, p_method: m.value, p_reference: ref.value.trim(), p_fiscal_ref: fis.value.trim() || null });
            flash('Incasso riconciliato.'); render();
          }, 'btn btn--primary btn--sm'));
        } }], insts));
    }
    if (c.status === 'active') out.append(visitScheduler(c, locs.map((x) => x.location), techs, checklists));
    out.append(h('div', { class: 'app-actions' },
      !draft && !approved && ['draft', 'awaiting_client', 'awaiting_payment', 'active'].includes(c.status) ? act('Nuova versione (modifica condizioni)', async () => { await db.rpc('new_business_contract_version', { p_contract: c.id }); flash('Bozza creata: le versioni precedenti restano conservate.'); render(); }) : null,
      ['active', 'expired'].includes(c.status) ? act('Prepara rinnovo', async () => { const n = await db.rpc('renew_business_contract', { p_contract: c.id }); flash(`Rinnovo ${n.number} creato in bozza (mai automatico).`); render(); }) : null,
      ['draft', 'awaiting_client', 'awaiting_payment'].includes(c.status) ? act('Annulla contratto', async () => { const why = prompt('Motivo dell’annullamento:'); if (!why) return; await db.rpc('cancel_business_contract', { p_contract: c.id, p_reason: why }); render(); }) : null));
    return out;
  }

  function versionEditor(c, v) {
    const b = v.terms?.benefits || {};
    const f = {
      price: inp({ inputmode: 'decimal', value: (v.price_net_cents / 100).toFixed(2) }), months: h('input', { type: 'number', min: 1, max: 60, value: v.duration_months }),
      labor: inp({ inputmode: 'decimal', value: (v.labor_cost_per_hour_cents / 100).toFixed(2) }), travel: inp({ inputmode: 'decimal', value: (v.travel_cost_per_visit_cents / 100).toFixed(2) }),
      other: inp({ inputmode: 'decimal', value: (v.other_costs_cents / 100).toFixed(2) }),
      callFee: h('input', { type: 'number', min: 0, value: b.callFee ?? 0 }), small: h('input', { type: 'number', min: 0, value: b.smallIntervention ?? 0 }),
      hours: h('input', { type: 'number', min: 0, step: '0.25', value: (b.maintenanceMinutes ?? 0) / 60 }), visits: h('input', { type: 'number', min: 0, value: b.scheduledVisits ?? 0 }),
      terms: h('textarea', { rows: 8, spellcheck: 'false' }, JSON.stringify(v.terms || {}, null, 2))
    };
    const save = async () => {
      let terms;
      try { terms = JSON.parse(f.terms.value || '{}'); } catch { throw new Error('Condizioni (JSON) non valide'); }
      terms.benefits = { ...(terms.benefits || {}), callFee: num(f.callFee.value), smallIntervention: num(f.small.value), maintenanceMinutes: Math.round(num(f.hours.value) * 60), scheduledVisits: num(f.visits.value) };
      await db.update(`business_contract_versions?id=eq.${v.id}`, { price_net_cents: toCents(f.price.value), duration_months: num(f.months.value, 12), labor_cost_per_hour_cents: toCents(f.labor.value),
        travel_cost_per_visit_cents: toCents(f.travel.value), other_costs_cents: toCents(f.other.value), terms });
    };
    return h('div', { class: 'app-subform' }, h('h4', {}, `Bozza v${v.version} — condizioni e controlli commerciali`),
      h('div', { class: 'app-form-grid' }, field('Corrispettivo annuo IVA esclusa (€)', f.price), field('Durata (mesi)', f.months), field('Diritti di chiamata', f.callFee), field('Piccoli interventi', f.small), field('Monte ore (ore)', f.hours), field('Visite programmate', f.visits)),
      h('h4', {}, 'Costi interni stimati (mai visibili al cliente)'),
      h('div', { class: 'app-form-grid' }, field('Costo manodopera (€/ora)', f.labor), field('Costo trasferta per uscita (€)', f.travel), field('Altri costi annui (€)', f.other)),
      field('Condizioni complete (JSON: regole, tariffe, limiti; per Corporate: corporate.locationsCount, locations, services, validity, economics, contacts, sla…)', f.terms),
      h('div', { class: 'app-actions' },
        act('Salva bozza', async () => { await save(); flash('Bozza salvata.'); render(); }, 'btn btn--ghost'),
        act('Salva e approva', async () => {
          await save();
          const mg = await approveWithMargin('approve_business_contract_version', { p_version: v.id }, flash);
          if (mg) { flash(`Versione approvata (margine stimato ${mg.marginPct}%). Il cliente deve accettarla dall’area Business.`); render(); }
        }, 'btn btn--primary')));
  }

  function visitScheduler(c, locs, techs, checklists) {
    const loc = sel(locs.map((l) => [l.id, `${l.code} · ${l.name}`]), locs[0]?.id);
    const at = h('input', { type: 'datetime-local', required: true, value: localDT(Date.now() + 7 * 864e5).slice(0, 11) + '09:00' });
    const ck = sel([['', 'Nessuna'], ...checklists.map((x) => [x.id, x.name])], '');
    const tech = sel([['', 'Da assegnare'], ...techs.map((t) => [t.id, t.display_name])], '');
    return h('div', { class: 'app-subform' }, h('h4', {}, 'Programma una visita di manutenzione'),
      h('div', { class: 'app-form-grid' }, field('Sede', loc), field('Data e ora', at), field('Checklist', ck), field('Tecnico', tech)),
      act('Programma visita', async () => {
        await db.rpc('schedule_maintenance_visit', { p_contract: c.id, p_location: loc.value, p_at: new Date(at.value).toISOString(), p_checklist: ck.value || null, p_technician: tech.value || null, p_schedule: null });
        flash('Visita programmata. Verrà scalata solo dopo l’esecuzione e la conferma.'); render();
      }, 'btn btn--primary btn--sm'));
  }

  /* ============================================================ PREVENTIVI */
  async function preventivi() {
    const [quotes, accounts, leads] = await Promise.all([
      db.select('business_quotes?select=*,account:business_accounts(legal_name),lead:b2b_leads(company_name),items:business_quote_items(*)&order=created_at.desc&limit=200'),
      db.select('business_accounts?select=id,legal_name&order=legal_name'),
      db.select('b2b_leads?status=not.in.(won,lost)&select=id,number,company_name&order=created_at.desc')
    ]);
    const acc = sel([['', '—'], ...accounts.map((a) => [a.id, a.legal_name])], '');
    const lead = sel([['', '—'], ...leads.map((l) => [l.id, `${l.number} · ${l.company_name}`])], '');
    const title = inp({ required: true }); const line = sel(Object.entries(LINE_LABELS), 'business'); const days = h('input', { type: 'number', min: 1, max: 180, value: 30 });
    return h('div', { class: 'app-stack' },
      notice('info', 'L’approvazione e l’accettazione di un preventivo NON attivano alcun contratto: il contratto si crea con un’azione esplicita e segue approvazione, accettazione e pagamento.'),
      h('div', { class: 'app-list' }, quotes.map(quoteCard)),
      h('form', { class: 'app-card', onsubmit: async (e) => {
        e.preventDefault();
        try { await db.rpc('create_business_quote', { p_account: acc.value || null, p_lead: lead.value || null, p_title: title.value.trim(), p_line: line.value, p_valid_days: num(days.value, 30) }); flash('Preventivo creato in bozza.'); render(); }
        catch (err) { flash(err.message, 'error'); }
      } }, h('h2', {}, 'Nuovo preventivo'), h('div', { class: 'app-form-grid' }, field('Azienda cliente', acc), field('oppure Lead', lead), field('Oggetto', title), field('Linea', line), field('Validità (giorni)', days)),
        h('button', { class: 'btn btn--primary', type: 'submit' }, 'Crea bozza')));
  }

  function quoteCard(q) {
    const isDraft = q.status === 'draft';
    const items = [...(q.items || [])].sort((a, b) => a.position - b.position);
    const it = { desc: inp({ 'aria-label': 'Descrizione' }), loc: inp({ 'aria-label': 'Sede', placeholder: 'Sede (facoltativa)' }), qty: h('input', { type: 'number', min: '0.01', step: '0.01', value: 1, 'aria-label': 'Quantità' }), unit: inp({ value: 'servizio', 'aria-label': 'Unità' }), price: inp({ inputmode: 'decimal', 'aria-label': 'Prezzo unitario (€)', placeholder: 'Prezzo € IVA escl.' }) };
    const f = { labor: inp({ inputmode: 'decimal', value: (q.labor_cost_per_hour_cents / 100).toFixed(2) }), travel: inp({ inputmode: 'decimal', value: (q.travel_cost_per_visit_cents / 100).toFixed(2) }), other: inp({ inputmode: 'decimal', value: (q.other_costs_cents / 100).toFixed(2) }),
      minutes: h('input', { type: 'number', min: 0, value: q.included_minutes }), visits: h('input', { type: 'number', min: 0, value: q.included_visits }), months: h('input', { type: 'number', min: 1, max: 60, value: q.duration_months }),
      pay: sel([['annual', 'Annuale anticipato'], ['quarterly', 'Trimestrale (se approvato)'], ['custom', 'Personalizzato']], q.payment_plan), terms: inp({ value: q.payment_terms }),
      locs: h('textarea', { rows: 2, placeholder: 'Una sede per riga' }, (q.locations_covered || []).map((l) => (typeof l === 'string' ? l : `${l.code} — ${l.name}`)).join('\n')) };
    const saveHead = () => db.update(`business_quotes?id=eq.${q.id}`, { labor_cost_per_hour_cents: toCents(f.labor.value), travel_cost_per_visit_cents: toCents(f.travel.value), other_costs_cents: toCents(f.other.value),
      included_minutes: num(f.minutes.value), included_visits: num(f.visits.value), duration_months: num(f.months.value, 12), payment_plan: f.pay.value, payment_terms: f.terms.value.trim() || 'Pagamento annuale anticipato.', locations_covered: lines(f.locs.value) });
    return h('details', { class: 'app-card' },
      h('summary', { class: 'app-int__head' }, h('span', {}, h('strong', {}, q.number), ` · ${q.account?.legal_name || q.lead?.company_name || '—'} · ${q.title} · ${euro(q.net_cents)} + IVA`), quoteBadge(q.status)),
      h('p', { class: 'app-muted' }, `Valido fino al ${date(q.valid_until)} · margine stimato: ${q.margin_pct ?? '—'}%${q.margin_warning ? ' (sotto soglia)' : ''} · costo interno: ${q.internal_cost_cents != null ? euro(q.internal_cost_cents) : '—'}`),
      table([{ label: 'Descrizione', key: 'description' }, { label: 'Sede', render: (x) => x.location_label || '—' }, { label: 'Q.tà', render: (x) => `${x.quantity} ${x.unit}` }, { label: 'Prezzo', render: (x) => euro(x.unit_price_cents) },
        { label: 'Totale', render: (x) => euro(Math.round(x.quantity * x.unit_price_cents)) }, { label: '', render: (x) => (isDraft ? act('Rimuovi', async () => { await db.remove(`business_quote_items?id=eq.${x.id}`); await db.rpc('recalc_business_quote', { p_quote: q.id }); render(); }) : null) }], items, { empty: 'Nessuna voce.' }),
      isDraft ? h('div', { class: 'app-subform' }, h('h4', {}, 'Aggiungi voce'), h('div', { class: 'app-inline' }, it.desc, it.loc, it.qty, it.unit, it.price,
        act('Aggiungi', async () => {
          await db.insert('business_quote_items', { quote_id: q.id, position: items.length + 1, description: it.desc.value.trim(), location_label: it.loc.value.trim() || null, quantity: num(it.qty.value, 1), unit: it.unit.value.trim() || 'servizio', unit_price_cents: toCents(it.price.value) });
          await db.rpc('recalc_business_quote', { p_quote: q.id }); render();
        }, 'btn btn--primary btn--sm')),
      h('h4', {}, 'Condizioni e controlli commerciali'),
      h('div', { class: 'app-form-grid' }, field('Costo manodopera (€/ora)', f.labor), field('Costo trasferta per uscita (€)', f.travel), field('Altri costi (€)', f.other), field('Monte ore incluso (minuti)', f.minutes), field('Uscite incluse', f.visits),
        field('Durata (mesi)', f.months), field('Pagamento', f.pay), field('Condizioni di pagamento', f.terms), field('Sedi coperte', f.locs)),
      h('div', { class: 'app-actions' },
        act('Salva e ricalcola', async () => { await saveHead(); await db.rpc('recalc_business_quote', { p_quote: q.id }); flash('Preventivo aggiornato.'); render(); }),
        act('Approva', async () => { await saveHead(); const r = await approveWithMargin('approve_business_quote', { p_quote: q.id }, flash); if (r) { flash('Preventivo approvato (nessun contratto creato).'); render(); } }, 'btn btn--primary'),
        act('Elimina bozza', async () => { await db.remove(`business_quotes?id=eq.${q.id}`); render(); }))) : null,
      h('div', { class: 'app-actions' },
        act('PDF', () => openPdf('quote-pdf', `?id=${q.id}`, 'Preventivo')),
        q.status === 'approved' ? act('Segna come inviato', async () => { await db.rpc('set_business_quote_status', { p_quote: q.id, p_status: 'sent' }); render(); }, 'btn btn--primary btn--sm') : null,
        q.status === 'sent' ? act('Registra accettazione firmata', async () => { const who = prompt('Firmatario (come da documento firmato):'); if (!who) return; await db.rpc('accept_business_quote', { p_quote: q.id, p_signer_name: who }); render(); }) : null,
        ['approved', 'sent'].includes(q.status) ? act('Rifiutato', async () => { await db.rpc('set_business_quote_status', { p_quote: q.id, p_status: 'rejected' }); render(); }) : null,
        q.status === 'accepted' && !q.contract_id ? act('Crea contratto in bozza', async () => {
          if (!q.account_id) throw new Error('Collegare prima il preventivo a un’azienda cliente.');
          const locs = await db.select(`business_locations?account_id=eq.${q.account_id}&select=id`);
          const c = await db.rpc('create_contract_from_quote', { p_quote: q.id, p_locations: locs.map((l) => l.id) });
          flash(`Contratto ${c.number} creato in bozza con tutte le sedi dell’azienda: verifica e approva da Contratti annuali.`); render();
        }, 'btn btn--primary btn--sm') : null,
        q.accepted_hash ? badge(`Versione accettata conservata · ${q.accepted_hash.slice(0, 12)}…`, 'ok') : null));
  }

  /* ============================================================ RICHIESTE AZIENDALI */
  async function richieste() {
    const [reqs, accounts, techs, cats] = await Promise.all([
      db.select('business_intervention_requests?select=*,account:business_accounts(legal_name)&order=created_at.desc&limit=500'),
      db.select('business_accounts?select=id,legal_name&order=legal_name'),
      db.select('technicians?active=eq.true&select=id,display_name&order=display_name'),
      db.select('service_categories?select=id,name&order=sort')
    ]);
    const locs = reqs.length ? await db.select(`business_locations?id=in.(${[...new Set(reqs.map((r) => r.location_id))].join(',')})&select=id,code,name,account_id`) : [];
    const f = { acc: sel([['', 'Tutte le aziende'], ...accounts.map((a) => [a.id, a.legal_name])], '', { 'aria-label': 'Azienda' }), loc: sel([['', 'Tutte le sedi']], '', { 'aria-label': 'Sede' }),
      cat: sel([['', 'Tutte le categorie'], ...cats.map((c) => [c.id, c.name])], '', { 'aria-label': 'Categoria' }), st: sel([['', 'Tutti gli stati'], ...Object.entries(REQUEST_LABELS).map(([k, [l]]) => [k, l])], '', { 'aria-label': 'Stato' }),
      from: h('input', { type: 'date', 'aria-label': 'Dal' }), to: h('input', { type: 'date', 'aria-label': 'Al' }) };
    f.acc.onchange = () => { fill(f.loc, h('option', { value: '' }, 'Tutte le sedi'), locs.filter((l) => !f.acc.value || l.account_id === f.acc.value).map((l) => h('option', { value: l.id }, `${l.code} · ${l.name}`))); draw(); };
    const list = h('div');
    const ln = (id) => { const l = locs.find((x) => x.id === id); return l ? `${l.code} · ${l.name}` : '—'; };
    const draw = () => {
      const rows = reqs.filter((r) => (!f.acc.value || r.account_id === f.acc.value) && (!f.loc.value || r.location_id === f.loc.value) && (!f.cat.value || r.category_id === f.cat.value)
        && (!f.st.value || r.status === f.st.value) && (!f.from.value || r.created_at >= f.from.value) && (!f.to.value || r.created_at.slice(0, 10) <= f.to.value));
      fill(list, table([
        { label: 'Numero', render: (r) => h('span', {}, h('strong', {}, r.number), h('br'), h('small', { class: 'app-muted' }, dateTime(r.created_at))) },
        { label: 'Azienda / sede', render: (r) => h('span', {}, r.account?.legal_name, h('br'), h('small', {}, ln(r.location_id))) },
        { label: 'Problema', render: (r) => h('span', {}, r.problem_type, h('br'), h('small', { class: 'app-muted' }, `${r.category_id} · urgenza ${URGENCY_LABELS[r.declared_urgency]} · ${r.contract_id ? 'con contratto' : 'senza contratto'}`)) },
        { label: 'Stato', render: (r) => requestBadge(r.status) },
        { label: 'Azioni', render: (r) => requestActions(r, techs) }
      ], rows, { empty: 'Nessuna richiesta.' }));
    };
    Object.values(f).forEach((x) => { if (x !== f.acc) x.onchange = draw; });
    draw();
    return h('div', { class: 'app-stack' }, h('section', { class: 'app-card' }, h('div', { class: 'app-inline' }, ...Object.values(f)), list));
  }

  function requestActions(r, techs) {
    const when = h('input', { type: 'datetime-local', 'aria-label': 'Data programmata', value: r.scheduled_at ? localDT(r.scheduled_at) : '' });
    const tech = sel([['', 'Tecnico…'], ...techs.map((t) => [t.id, t.display_name])], '', { 'aria-label': 'Tecnico' });
    const go = (to) => act(REQUEST_LABELS[to][0], async () => {
      let note = null;
      if (to === 'cancelled') { note = prompt('Motivo dell’annullamento:'); if (!note) return; }
      if (to === 'technician_assigned' && tech.value) await db.rpc('assign_business_technician', { p_request: r.id, p_visit: null, p_technician: tech.value });
      await db.rpc('transition_business_request', { p_request: r.id, p_to: to, p_note: note, p_scheduled_at: to === 'scheduled' && when.value ? new Date(when.value).toISOString() : null });
      flash(`${r.number}: ${REQUEST_LABELS[to][0]}`); render();
    }, to === 'cancelled' ? 'btn btn--ghost btn--sm' : 'btn btn--primary btn--sm');
    const next = ADMIN_FLOW[r.status] || [];
    return h('div', { class: 'app-inline' },
      next.includes('scheduled') ? when : null, next.includes('technician_assigned') ? tech : null,
      next.map(go),
      ['completed', 'closed'].includes(r.status) ? act('Certificato', async () => { const c = await db.rpc('issue_business_certificate', { p_request: r.id }); await downloadCertificate(c.number).catch(() => flash(`Certificato ${c.number} emesso (PDF non configurato).`, 'info')); }) : null,
      r.settlement ? h('small', { class: 'app-muted' }, `Contabilizzato: uscite ${r.settlement.consume.callFee}, minuti ${r.settlement.consume.maintenanceMinutes}, extra ${euro(r.settlement.billable.totalNetCents)} + IVA`) : null);
  }

  /* ============================================================ CALENDARIO E MANUTENZIONI */
  async function calendario() {
    const month = h('input', { type: 'month', value: new Date().toISOString().slice(0, 7), 'aria-label': 'Mese' });
    const box = h('div');
    const draw = async () => {
      const [y, m] = month.value.split('-').map(Number);
      const from = new Date(Date.UTC(y, m - 1, 1)).toISOString(); const to = new Date(Date.UTC(y, m, 1)).toISOString();
      const [visits, reqs, techs] = await Promise.all([
        db.select(`maintenance_visits?scheduled_at=gte.${from}&scheduled_at=lt.${to}&select=*,location:business_locations(code,name),assign:technician_assignments(technician_id,active)&order=scheduled_at`),
        db.select(`business_intervention_requests?scheduled_at=gte.${from}&scheduled_at=lt.${to}&select=id,number,status,scheduled_at,problem_type,account:business_accounts(legal_name)&order=scheduled_at`),
        db.select('technicians?active=eq.true&select=id,display_name')
      ]);
      const tn = (v) => techs.find((t) => t.id === v.assign?.find((a) => a.active)?.technician_id)?.display_name || 'Da assegnare';
      const events = [...visits.map((v) => ({ at: v.scheduled_at, kind: 'Visita', v })), ...reqs.map((r) => ({ at: r.scheduled_at, kind: 'Intervento', r }))].sort((a, b) => a.at.localeCompare(b.at));
      fill(box, events.length ? h('ol', { class: 'app-cal' }, events.map((e) => h('li', { class: 'app-cal__item' },
        h('time', { datetime: e.at }, dateTime(e.at)),
        e.v ? h('div', {}, h('strong', {}, `Visita · ${e.v.location?.code} ${e.v.location?.name}`), ' ', visitBadge(e.v.status), h('br'), h('small', {}, `Tecnico: ${tn(e.v)}`),
          e.v.status === 'scheduled' ? h('div', { class: 'app-inline' }, (() => { const t = sel([['', 'Assegna tecnico…'], ...techs.map((x) => [x.id, x.display_name])], ''); return [t, act('Assegna', async () => { await db.rpc('assign_business_technician', { p_request: null, p_visit: e.v.id, p_technician: t.value }); flash('Tecnico assegnato.'); draw(); })]; })()) : null,
          e.v.status === 'completed' ? act('Conferma ed esegui il conteggio', async () => { const r = await db.rpc('confirm_maintenance_visit', { p_visit: e.v.id }); flash(r?.duplicate ? 'Già confermata.' : 'Visita confermata: prestazioni scalate una sola volta.'); draw(); }, 'btn btn--primary btn--sm') : null)
          : h('div', {}, h('strong', {}, `Intervento ${e.r.number} · ${e.r.account?.legal_name}`), ' ', requestBadge(e.r.status), h('br'), h('small', {}, e.r.problem_type))))) : h('p', { class: 'app-muted' }, 'Nessuna attività programmata nel mese.'));
    };
    month.onchange = draw;
    await draw();
    return h('div', { class: 'app-stack' },
      notice('info', 'Le visite programmate sono controlli di manutenzione ordinaria e non vengono classificate come verifiche obbligatorie o certificazioni. Una visita si scala solo alla conferma, una volta sola. Per programmare nuove visite apri il contratto in “Contratti annuali”.'),
      h('section', { class: 'app-card' }, h('div', { class: 'app-inline' }, month), box));
  }

  /* ============================================================ LEAD B2B */
  async function lead() {
    const leads = await db.select('b2b_leads?select=*,notes:b2b_lead_notes(note,created_at)&order=created_at.desc&limit=300');
    const fSt = sel([['', 'Tutti gli stati'], ...Object.entries(LEAD_LABELS).map(([k, [l]]) => [k, l])], '', { 'aria-label': 'Stato' });
    const fSeg = sel([['', 'Tutti i segmenti'], ...Object.entries(KIND_LABELS)], '', { 'aria-label': 'Segmento' });
    const list = h('div', { class: 'app-list' });
    const draw = () => fill(list, leads.filter((l) => (!fSt.value || l.status === fSt.value) && (!fSeg.value || l.segment === fSeg.value)).map((l) => {
      const st = sel(Object.entries(LEAD_LABELS).map(([k, [x]]) => [k, x]), l.status, { 'aria-label': 'Nuovo stato' });
      const note = inp({ placeholder: 'Nota commerciale', 'aria-label': 'Nota' });
      const rem = h('input', { type: 'datetime-local', 'aria-label': 'Promemoria', value: l.next_reminder_at ? localDT(l.next_reminder_at) : '' });
      return h('article', { class: 'app-card app-int' },
        h('header', { class: 'app-int__head' }, h('div', {}, h('p', { class: 'app-int__num' }, `${l.number} · ${KIND_LABELS[l.segment]}`), h('h3', {}, l.company_name),
          h('p', { class: 'app-muted' }, `${l.contact_name} · ${l.email} · ${l.phone} · ${l.locations_count || 1} sedi · ${l.zone}${l.inspection_requested ? ' · sopralluogo richiesto' : ''}`)), leadBadge(l.status)),
        h('p', {}, l.needs || ''), l.services?.length ? h('p', { class: 'app-muted' }, `Servizi: ${l.services.join(', ')}`) : null,
        l.notes?.length ? h('ul', { class: 'app-notes' }, l.notes.sort((a, b) => b.created_at.localeCompare(a.created_at)).map((n) => h('li', {}, h('small', {}, dateTime(n.created_at)), ' ', n.note))) : null,
        h('div', { class: 'app-inline' }, st, note, rem, act('Aggiorna', async () => { await db.rpc('update_b2b_lead', { p_lead: l.id, p_status: st.value, p_note: note.value.trim() || null, p_reminder: rem.value ? new Date(rem.value).toISOString() : null }); flash('Lead aggiornato.'); render(); }, 'btn btn--primary btn--sm'),
          !l.account_id ? act('Crea azienda cliente', async () => {
            const a = await db.rpc('create_business_account', { p_kind: l.segment, p_legal_name: l.company_name, p_vat: null, p_segment: l.activity_type });
            await db.update(`b2b_leads?id=eq.${l.id}`, { account_id: a.id }); flash('Azienda creata dal lead: completa P.IVA e dati di fatturazione.'); render();
          }) : badge('Azienda collegata', 'ok')));
    }));
    fSt.onchange = draw; fSeg.onchange = draw; draw();
    return h('div', { class: 'app-stack' }, notice('info', 'Dati raccolti con consenso al solo scopo di ricontatto commerciale: non usarli per altre finalità senza un consenso specifico.'), h('div', { class: 'app-card app-inline' }, fSt, fSeg), list);
  }

  /* ============================================================ RICAVI E SCADENZE */
  async function ricavi() {
    const [contracts, insts, balances] = await Promise.all([
      db.select('business_contracts?status=in.(active,awaiting_payment,awaiting_client)&select=id,number,status,line,ends_at,account:business_accounts(legal_name),version:business_contract_versions!business_contracts_current_version_fk(price_net_cents,margin_pct,internal_cost_cents)'),
      db.select('business_installments?select=id,number,due_date,amount_cents,status,paid_at,contract:business_contracts(number,account:business_accounts(legal_name))&order=due_date'),
      db.select('business_benefit_balances?select=benefit,unit,quantity,contract:business_contracts!inner(number,status),usages:business_benefit_usages(delta)&contract.status=eq.active')
    ]);
    const active = contracts.filter((c) => c.status === 'active');
    const byLine = Object.entries(LINE_LABELS).map(([k, l]) => [l, active.filter((c) => c.line === k).reduce((n, c) => n + (c.version?.price_net_cents || 0), 0)]);
    const year = String(new Date().getFullYear());
    const kpi = [
      ['Ricavi contrattualizzati (attivi, IVA escl.)', euro(byLine.reduce((n, [, v]) => n + v, 0))],
      ['Incassato nell’anno (IVA incl.)', euro(insts.filter((i) => i.status === 'paid' && (i.paid_at || '').startsWith(year)).reduce((n, i) => n + i.amount_cents, 0))],
      ['Rate da incassare', euro(insts.filter((i) => i.status === 'due').reduce((n, i) => n + i.amount_cents, 0))],
      ['Contratti in scadenza (60 gg)', active.filter((c) => new Date(c.ends_at) - Date.now() < 60 * 864e5).length],
      ['Contratti in attesa del cliente o del pagamento', contracts.length - active.length]
    ];
    const csv = () => {
      const rows = [['contratto', 'azienda', 'linea', 'stato', 'prezzo_netto', 'margine_pct', 'scadenza'], ...contracts.map((c) => [c.number, c.account?.legal_name, c.line, c.status, ((c.version?.price_net_cents || 0) / 100).toFixed(2), c.version?.margin_pct ?? '', c.ends_at || ''])];
      const a = h('a', { href: URL.createObjectURL(new Blob([rows.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')], { type: 'text/csv' })), download: 'contratti-b2b.csv' });
      a.click();
    };
    return h('div', { class: 'app-stack' },
      h('div', { class: 'app-kpis' }, kpi.map(([l, v]) => h('div', { class: 'app-kpi' }, h('strong', {}, String(v)), h('span', {}, l)))),
      h('section', { class: 'app-card' }, h('h2', {}, 'Ricavi contrattualizzati per linea'), table([{ label: 'Linea', render: (r) => r[0] }, { label: 'Annuo IVA esclusa', render: (r) => euro(r[1]) }], byLine)),
      h('section', { class: 'app-card' }, h('h2', {}, 'Scadenze di pagamento'), table([{ label: 'Scadenza', render: (i) => date(i.due_date) }, { label: 'Contratto', render: (i) => `${i.contract?.number} · ${i.contract?.account?.legal_name}` }, { label: 'Rata', key: 'number' }, { label: 'Importo', render: (i) => euro(i.amount_cents) }, { label: 'Stato', render: (i) => installmentBadge(i.status) }], insts.filter((i) => i.status === 'due'), { empty: 'Nessuna rata da incassare.' })),
      h('section', { class: 'app-card' }, h('h2', {}, 'Contratti e margini'), table([{ label: 'Contratto', key: 'number' }, { label: 'Azienda', render: (c) => c.account?.legal_name }, { label: 'Stato', render: (c) => contractBadge(c.status) }, { label: 'Prezzo', render: (c) => euro(c.version?.price_net_cents) }, { label: 'Margine', render: (c) => (c.version?.margin_pct != null ? `${c.version.margin_pct}%` : '—') }, { label: 'Scadenza', render: (c) => date(c.ends_at) }], contracts),
        act('Esporta contratti (CSV)', csv)),
      h('section', { class: 'app-card' }, h('h2', {}, 'Prestazioni residue (contratti attivi)'), table([{ label: 'Contratto', render: (b) => b.contract?.number }, { label: 'Prestazione', render: (b) => BENEFIT_LABELS[b.benefit] }, { label: 'Residuo', render: (b) => qty(b.unit, b.quantity - b.usages.reduce((n, u) => n + u.delta, 0)) }, { label: 'Totale', render: (b) => qty(b.unit, b.quantity) }], balances)));
  }

  return { 'b2b-clienti': clienti, 'b2b-listini': listini, 'b2b-contratti': contratti, 'b2b-preventivi': preventivi, 'b2b-richieste': richieste, 'b2b-calendario': calendario, 'b2b-lead': lead, 'b2b-ricavi': ricavi };
}
