/**
 * AREA BUSINESS — /area-business/
 * Ogni utente vede solo le aziende di cui è membro e, per referenti di sede e
 * utenti limitati, solo le sedi assegnate: lo garantiscono le regole RLS e le
 * funzioni del database; l'interfaccia nasconde ciò che il ruolo non consente.
 * Nessun dato simulato: senza backend l'area mostra lo stato "non attiva".
 */
import { h, fill, euro, date, dateTime, notice, badge, boot, db, auth, fn, table, field, downloadCertificate, openPdf } from './core.js';
import {
  requestBadge, contractBadge, quoteBadge, visitBadge, installmentBadge, ROLE_LABELS, KIND_LABELS, LINE_LABELS, URGENCY_LABELS, BENEFIT_LABELS, CAN, qty, REQUEST_LABELS
} from './b2b-common.js';

const root = document.getElementById('app');
const TABS = [
  ['panoramica', 'Panoramica'], ['richieste', 'Richieste'], ['storico', 'Storico e documenti'], ['sedi', 'Sedi'],
  ['manutenzioni', 'Manutenzioni'], ['contratti', 'Contratti e pagamenti'], ['azienda', 'Azienda e referenti']
];
const OPEN = ['submitted', 'under_review', 'to_schedule', 'scheduled', 'technician_assigned', 'in_progress'];

let S; // stato: { user, profile, memberships, account, member, can, locations, restart }
let main;
const flash = (msg, type = 'ok') => { const n = notice(type, msg); main.prepend(n); setTimeout(() => n.remove(), 6000); };
const act = (label, fnc, cls = 'btn btn--ghost btn--sm') => h('button', { class: cls, type: 'button', onclick: async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  try { await fnc(); } catch (err) { flash(err.message, 'error'); } finally { btn.disabled = false; }
} }, label);
const locName = (id) => { const l = S.locations.find((x) => x.id === id); return l ? `${l.code} · ${l.name}` : '—'; };
const inList = (ids) => `in.(${ids.map(encodeURIComponent).join(',')})`;

/* ---------------------------------------------------------------- panoramica */
async function panoramica() {
  const acc = S.account.id;
  const [reqs, balances, visits] = await Promise.all([
    db.select(`business_intervention_requests?account_id=eq.${acc}&select=id,status&limit=500`),
    db.rpc('business_balances', { p_account: acc }),
    S.locations.length ? db.select(`maintenance_visits?location_id=${inList(S.locations.map((l) => l.id))}&status=in.(scheduled,completed)&select=id,scheduled_at,status,location_id&order=scheduled_at&limit=20`) : []
  ]);
  const contracts = S.can.contracts ? await db.select(`business_contracts?account_id=eq.${acc}&select=id,number,status,ends_at,line&order=ends_at.desc`) : [];
  const kpi = [
    ['Richieste aperte', reqs.filter((r) => OPEN.includes(r.status)).length],
    ['Completate da chiudere', reqs.filter((r) => r.status === 'completed').length],
    ['Sedi accessibili', S.locations.length],
    ...(S.can.contracts ? [['Contratti attivi', contracts.filter((c) => c.status === 'active').length]] : [])
  ];
  const expiring = contracts.filter((c) => c.status === 'active' && c.ends_at && new Date(c.ends_at) - Date.now() < 60 * 864e5);
  return h('div', { class: 'app-stack' },
    h('div', { class: 'app-kpis' }, kpi.map(([l, v]) => h('div', { class: 'app-kpi' }, h('strong', {}, String(v)), h('span', {}, l)))),
    h('section', { class: 'app-card' }, h('h2', {}, 'Prestazioni residue'),
      table([{ label: 'Contratto', key: 'contract_number' }, { label: 'Prestazione', render: (b) => BENEFIT_LABELS[b.benefit] || b.benefit },
        { label: 'Residuo', render: (b) => h('strong', {}, qty(b.unit, b.remaining)) }, { label: 'Totale', render: (b) => qty(b.unit, b.total) }, { label: 'Scadenza', render: (b) => date(b.ends_at) }],
      balances, { empty: 'Nessun contratto attivo: le prestazioni compaiono dopo l’attivazione (accettazione e pagamento verificato).' })),
    h('section', { class: 'app-card' }, h('h2', {}, 'Prossime visite di manutenzione'),
      table([{ label: 'Data', render: (v) => dateTime(v.scheduled_at) }, { label: 'Sede', render: (v) => locName(v.location_id) }, { label: 'Stato', render: (v) => visitBadge(v.status) }], visits, { empty: 'Nessuna visita programmata.' })),
    S.can.contracts ? h('section', { class: 'app-card' }, h('h2', {}, 'Scadenze contrattuali'),
      expiring.length ? table([{ label: 'Contratto', key: 'number' }, { label: 'Linea', render: (c) => LINE_LABELS[c.line] }, { label: 'Scade il', render: (c) => date(c.ends_at) }], expiring)
        : h('p', { class: 'app-muted' }, 'Nessun contratto in scadenza nei prossimi 60 giorni. Il rinnovo non è mai automatico.')) : null);
}

/* ---------------------------------------------------------------- richieste */
async function richieste() {
  const acc = S.account.id;
  const [reqs, cats] = await Promise.all([
    db.select(`business_intervention_requests?account_id=eq.${acc}&select=*&order=created_at.desc&limit=200`),
    db.select('service_categories?select=id,name,services(id,name)&order=sort')
  ]);
  const fLoc = h('select', { 'aria-label': 'Filtra per sede' }, h('option', { value: '' }, 'Tutte le sedi'), S.locations.map((l) => h('option', { value: l.id }, `${l.code} · ${l.name}`)));
  const fSt = h('select', { 'aria-label': 'Filtra per stato' }, h('option', { value: '' }, 'Tutti gli stati'), Object.entries(REQUEST_LABELS).map(([k, [l]]) => h('option', { value: k }, l)));
  const list = h('div', { class: 'app-list' });
  const draw = () => {
    const rows = reqs.filter((r) => (!fLoc.value || r.location_id === fLoc.value) && (!fSt.value || r.status === fSt.value));
    fill(list, rows.length ? rows.map(requestCard) : h('p', { class: 'app-muted' }, 'Nessuna richiesta con questi filtri.'));
  };
  fLoc.onchange = draw; fSt.onchange = draw; draw();
  return h('div', { class: 'app-stack' }, newRequestForm(cats), h('section', { class: 'app-card' }, h('h2', {}, 'Le richieste'), h('div', { class: 'app-inline' }, fLoc, fSt), list));
}

function requestCard(r) {
  const canCancel = ['submitted', 'under_review', 'to_schedule'].includes(r.status) && (S.can.allLocations || r.created_by === S.user.id);
  const events = h('div');
  return h('article', { class: 'app-card app-int' },
    h('header', { class: 'app-int__head' },
      h('div', {}, h('p', { class: 'app-int__num' }, r.number), h('h3', {}, r.problem_type),
        h('p', { class: 'app-muted' }, `${locName(r.location_id)} · ${dateTime(r.created_at)} · urgenza dichiarata: ${URGENCY_LABELS[r.declared_urgency] || r.declared_urgency}`)),
      requestBadge(r.status)),
    h('p', {}, r.description),
    r.scheduled_at ? h('p', { class: 'app-muted' }, `Programmata per: ${dateTime(r.scheduled_at)}`) : null,
    r.contract_id ? null : h('p', { class: 'app-muted' }, 'Sede senza contratto attivo: l’intervento sarà preventivato a parte.'),
    h('details', { ontoggle: async (e) => {
      if (!e.target.open || events.childElementCount) return;
      const ev = await db.select(`business_request_events?request_id=eq.${r.id}&select=from_status,to_status,actor_role,note,at&order=at`);
      fill(events, table([{ label: 'Data', render: (x) => dateTime(x.at) }, { label: 'Stato', render: (x) => requestBadge(x.to_status) }, { label: 'Nota', render: (x) => x.note || '—' }], ev));
    } }, h('summary', {}, 'Cronologia degli stati'), events),
    canCancel ? h('div', { class: 'app-actions' }, act('Annulla la richiesta', async () => {
      const why = prompt('Motivo dell’annullamento (obbligatorio):');
      if (!why || why.trim().length < 3) return;
      await db.rpc('transition_business_request', { p_request: r.id, p_to: 'cancelled', p_note: why.trim() });
      flash('Richiesta annullata.'); render();
    })) : null);
}

function newRequestForm(cats) {
  const st = h('div', { role: 'status', 'aria-live': 'polite' });
  const locBoxes = S.locations.filter((l) => l.active).map((l) => {
    const cb = h('input', { type: 'checkbox', value: l.id, id: `loc-${l.id}` });
    return { cb, el: h('label', { class: 'chip-check', for: `loc-${l.id}` }, cb, h('span', {}, `${l.code} · ${l.name}`)) };
  });
  if (locBoxes.length === 1) locBoxes[0].cb.checked = true;
  const cat = h('select', { required: true }, h('option', { value: '' }, 'Seleziona'), cats.map((c) => h('option', { value: c.id }, c.name)));
  const sub = h('select', {}, h('option', { value: '' }, 'Non so / altro'));
  cat.onchange = () => fill(sub, h('option', { value: '' }, 'Non so / altro'), (cats.find((c) => c.id === cat.value)?.services || []).map((s) => h('option', { value: s.id }, s.name)));
  const problem = h('input', { type: 'text', required: true, maxlength: 120, placeholder: 'Es. scarico lento, presa non funzionante' });
  const urgency = h('select', {}, Object.entries(URGENCY_LABELS).map(([k, l]) => h('option', { value: k, selected: k === 'normal' }, l)));
  const desc = h('textarea', { rows: 4, required: true, minlength: 10, maxlength: 4000 });
  const contact = h('input', { type: 'text', required: true, value: S.profile.full_name || '' });
  const phone = h('input', { type: 'tel', required: true, pattern: '[0-9 +.\\(\\)\\-]{6,20}', value: S.profile.phone || '' });
  const slot = h('select', {}, ['Mattina (8-13)', 'Pomeriggio (13-18)', 'Indifferente'].map((x) => h('option', { value: x }, x)));
  const photos = h('input', { type: 'file', accept: 'image/jpeg,image/png', multiple: true });
  return h('form', { class: 'app-card', onsubmit: async (e) => {
    e.preventDefault();
    fill(st);
    const locs = locBoxes.filter((x) => x.cb.checked).map((x) => x.cb.value);
    if (!locs.length) return fill(st, notice('error', 'Seleziona almeno una sede.'));
    if (!e.target.reportValidity()) return;
    try {
      const paths = [];
      for (const file of [...photos.files].slice(0, 6)) {
        const path = `b2b/${S.account.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, '_')}`;
        await db.upload('interventi', path, file);
        paths.push(path);
      }
      const created = await db.rpc('create_business_requests', {
        p_account: S.account.id, p_locations: locs, p_category: cat.value, p_service: sub.value || null, p_problem: problem.value.trim(), p_urgency: urgency.value,
        p_description: desc.value.trim(), p_contact_name: contact.value.trim(), p_contact_phone: phone.value.trim(), p_slot: slot.value, p_photos: paths
      });
      fill(st, notice('ok', `Richiesta inviata: ${created.map((c) => c.number).join(', ')}. Ti aggiorneremo sullo stato; i tempi di intervento si concordano.`));
      setTimeout(render, 2500);
    } catch (err) { fill(st, notice('error', err.message)); }
  } },
    h('h2', {}, 'Nuova richiesta di intervento'),
    h('p', { class: 'app-muted' }, `Azienda: ${S.account.legal_name}. Puoi selezionare più sedi: verrà creata una richiesta per ciascuna.`),
    h('fieldset', { class: 'chip-group' }, h('legend', {}, 'Sedi'), h('div', { class: 'chip-group__list' }, locBoxes.map((x) => x.el))),
    h('div', { class: 'app-form-grid app-form-grid--2' }, field('Categoria', cat), field('Sottocategoria', sub), field('Tipo di problema', problem), field('Urgenza dichiarata', urgency),
      field('Referente sul posto', contact), field('Recapito telefonico', phone), field('Fascia oraria preferita', slot), field('Fotografie (facoltative)', photos, 'Massimo 6 immagini; evitare volti e dati personali.')),
    field('Descrizione', desc),
    h('p', { class: 'app-muted' }, 'L’urgenza dichiarata aiuta a programmare l’intervento ma non costituisce un tempo di arrivo garantito, salvo SLA previsto dal contratto.'),
    h('button', { class: 'btn btn--primary', type: 'submit' }, 'Invia la richiesta'), st);
}

/* ---------------------------------------------------------------- storico e documenti */
async function storico() {
  const acc = S.account.id;
  const reqs = await db.select(`business_intervention_requests?account_id=eq.${acc}&status=in.(completed,closed)&select=id,number,problem_type,location_id,status,updated_at,fiscal_document_ref,settlement&order=updated_at.desc&limit=200`);
  const ids = reqs.map((r) => r.id);
  const [reports, certs] = ids.length ? await Promise.all([
    db.select(`service_reports?request_id=${inList(ids)}&select=request_id,work_description,minutes_worked,materials,notes,submitted_at`),
    db.select(`certificates?business_request_id=${inList(ids)}&select=number,status,revision,issued_at,business_request_id&order=issued_at.desc`)
  ]) : [[], []];
  return h('div', { class: 'app-list' }, reqs.length ? reqs.map((r) => {
    const rep = reports.find((x) => x.request_id === r.id);
    const cert = certs.find((c) => c.business_request_id === r.id && c.status === 'valid');
    const billable = r.settlement?.billable;
    return h('article', { class: 'app-card app-int' },
      h('header', { class: 'app-int__head' }, h('div', {}, h('p', { class: 'app-int__num' }, r.number), h('h3', {}, r.problem_type), h('p', { class: 'app-muted' }, `${locName(r.location_id)} · ${date(r.updated_at)}`)), requestBadge(r.status)),
      rep ? h('dl', { class: 'app-dl' },
        h('div', {}, h('dt', {}, 'Lavoro eseguito'), h('dd', {}, rep.work_description)),
        h('div', {}, h('dt', {}, 'Tempo registrato'), h('dd', {}, `${rep.minutes_worked} minuti`)),
        h('div', {}, h('dt', {}, 'Materiali'), h('dd', {}, (rep.materials || []).map((m) => `${m.name || m}${m.qty ? ` × ${m.qty}` : ''}`).join(', ') || 'Nessuno')),
        rep.notes ? h('div', {}, h('dt', {}, 'Note tecniche'), h('dd', {}, rep.notes)) : null) : h('p', { class: 'app-muted' }, 'Rapporto non ancora disponibile.'),
      billable ? h('p', { class: 'app-muted' }, billable.totalNetCents ? `Importo non incluso nel contratto: ${euro(billable.totalNetCents)} + IVA, materiali esclusi.` : 'Prestazioni coperte dal contratto.') : null,
      h('div', { class: 'app-actions' },
        cert ? act(`Certificato ${cert.number}`, () => downloadCertificate(cert.number), 'btn btn--primary btn--sm') : badge('Certificato non ancora emesso', 'neutral'),
        r.fiscal_document_ref ? badge(`Documento fiscale: ${r.fiscal_document_ref}`, 'info') : null));
  }) : h('div', { class: 'app-card' }, h('p', {}, 'Nessun intervento completato.')));
}

/* ---------------------------------------------------------------- sedi */
async function sedi() {
  const [links, ctrs] = S.can.contracts ? await Promise.all([
    db.select(`business_contract_locations?account_id=eq.${S.account.id}&select=location_id,contract_id`),
    db.select(`business_contracts?account_id=eq.${S.account.id}&status=eq.active&select=id,number`)
  ]) : [[], []];
  const covered = (id) => links.filter((c) => c.location_id === id).map((c) => ctrs.find((x) => x.id === c.contract_id)?.number).filter(Boolean).join(', ') || '—';
  const code = h('input', { type: 'text', required: true, pattern: '[A-Za-z0-9\\-]{2,20}', placeholder: 'SEDE-01' });
  const name = h('input', { type: 'text', required: true });
  const addr = h('input', { type: 'text', required: true });
  const city = h('input', { type: 'text', required: true, value: 'Roma' });
  const kind = h('select', {}, ['sede', 'hotel', 'struttura_ricettiva', 'ristorante', 'bar', 'negozio', 'supermercato', 'ufficio', 'centro_commerciale', 'condominio', 'stabilimento', 'magazzino', 'altro'].map((k) => h('option', { value: k }, k.replace('_', ' '))));
  const cName = h('input', { type: 'text' }); const cPhone = h('input', { type: 'tel' });
  return h('div', { class: 'app-stack' },
    h('section', { class: 'app-card' }, h('h2', {}, 'Sedi e immobili'),
      table([{ label: 'Codice', key: 'code' }, { label: 'Nome', key: 'name' }, { label: 'Indirizzo', render: (l) => `${l.address_line}, ${l.city}` }, { label: 'Tipologia', render: (l) => l.kind.replace('_', ' ') },
        { label: 'Referente', render: (l) => [l.contact_name, l.contact_phone].filter(Boolean).join(' · ') || '—' },
        ...(S.can.contracts ? [{ label: 'Contratto attivo', render: (l) => covered(l.id) }] : [])], S.locations)),
    S.can.locations ? h('form', { class: 'app-card', onsubmit: async (e) => {
      e.preventDefault();
      try {
        await db.rpc('add_business_location', { p_account: S.account.id, p_code: code.value.trim(), p_name: name.value.trim(), p_address: addr.value.trim(), p_city: city.value.trim(), p_kind: kind.value, p_contact_name: cName.value.trim() || null, p_contact_phone: cPhone.value.trim() || null });
        await loadLocations(); flash('Sede aggiunta. Per includerla in un contratto contatta Pronto Intervento Roma.'); render();
      } catch (err) { flash(err.message, 'error'); }
    } }, h('h2', {}, 'Aggiungi una sede'), h('div', { class: 'app-form-grid app-form-grid--2' }, field('Codice univoco', code), field('Nome', name), field('Indirizzo', addr), field('Comune', city), field('Tipologia', kind), field('Referente', cName), field('Telefono referente', cPhone)),
    h('button', { class: 'btn btn--primary', type: 'submit' }, 'Aggiungi sede')) : null);
}

/* ---------------------------------------------------------------- manutenzioni */
async function manutenzioni() {
  const visits = S.locations.length ? await db.select(`maintenance_visits?location_id=${inList(S.locations.map((l) => l.id))}&select=id,scheduled_at,status,location_id,checklist,checklist_results,notes,acknowledged_by_name,completed_at&order=scheduled_at.desc&limit=100`) : [];
  return h('div', { class: 'app-stack' },
    notice('info', 'Le visite programmate sono controlli di manutenzione ordinaria: non sostituiscono le verifiche periodiche obbligatorie e non sono certificazioni di impianto. Una visita si scala dal contratto solo dopo la conferma, una sola volta.'),
    h('section', { class: 'app-card' }, h('h2', {}, 'Calendario delle visite'),
      table([{ label: 'Data', render: (v) => dateTime(v.scheduled_at) }, { label: 'Sede', render: (v) => locName(v.location_id) }, { label: 'Stato', render: (v) => visitBadge(v.status) },
        { label: 'Esito', render: (v) => (v.completed_at ? h('details', {}, h('summary', {}, 'Vedi esito'), h('ul', {}, (v.checklist_results || []).map((x) => h('li', {}, `${x.item}: ${x.ok ? 'OK' : 'da verificare'}${x.note ? ` — ${x.note}` : ''}`))),
          v.notes ? h('p', {}, v.notes) : null, v.acknowledged_by_name ? h('p', { class: 'app-muted' }, `Presa visione: ${v.acknowledged_by_name}`) : null) : '—') },
        { label: '', render: (v) => (v.status === 'completed' && S.can.confirmVisits ? act('Conferma esecuzione', async () => { await db.rpc('confirm_maintenance_visit', { p_visit: v.id }); flash('Visita confermata.'); render(); }, 'btn btn--primary btn--sm') : null) }],
      visits, { empty: 'Nessuna visita programmata.' })));
}

/* ---------------------------------------------------------------- contratti, preventivi e pagamenti */
async function contratti() {
  if (!S.can.contracts) return notice('info', 'I contratti sono visibili all’amministratore aziendale e al responsabile della manutenzione.');
  const acc = S.account.id;
  const [contracts, quotes] = await Promise.all([
    db.select(`business_contracts?account_id=eq.${acc}&select=id,number,status,line,starts_at,ends_at,payment_plan&order=created_at.desc`),
    db.rpc('business_quotes_list', { p_account: acc })
  ]);
  const installments = S.can.pay && contracts.length ? await db.select(`business_installments?contract_id=${inList(contracts.map((c) => c.id))}&select=*&order=due_date`) : [];
  const views = await Promise.all(contracts.map((c) => db.rpc('business_contract_view', { p_contract: c.id }).catch(() => null)));
  const card = (c, v) => {
    const signer = h('input', { type: 'text', placeholder: 'Nome e cognome del firmatario', 'aria-label': 'Nome e cognome del firmatario' });
    const agree = h('input', { type: 'checkbox', id: `agree-${c.id}` });
    const inst = installments.filter((i) => i.contract_id === c.id);
    const b = v?.terms?.benefits || {};
    return h('article', { class: 'app-card app-int' },
      h('header', { class: 'app-int__head' }, h('div', {}, h('p', { class: 'app-int__num' }, c.number), h('h3', {}, LINE_LABELS[c.line] || c.line),
        h('p', { class: 'app-muted' }, c.starts_at ? `Dal ${date(c.starts_at)} al ${date(c.ends_at)}` : 'Non ancora attivo')), contractBadge(c.status)),
      v ? h('dl', { class: 'app-dl' },
        h('div', {}, h('dt', {}, 'Corrispettivo annuo'), h('dd', {}, `${euro(v.priceNetCents)} + IVA ${Number(v.vatRate)}%, se applicabile`)),
        h('div', {}, h('dt', {}, 'Prestazioni incluse'), h('dd', {}, [b.callFee && `${b.callFee} diritti di chiamata`, b.smallIntervention && `${b.smallIntervention} piccoli interventi (max ${b.smallInterventionMaxMinutes} min)`, b.maintenanceMinutes && `${qty('minutes', b.maintenanceMinutes)} di manutenzione`, b.scheduledVisits && `${b.scheduledVisits} visite programmate`].filter(Boolean).join(' · ') || 'Come da contratto personalizzato')),
        h('div', {}, h('dt', {}, 'Sedi coperte'), h('dd', {}, (v.locations || []).map((l) => `${l.code} · ${l.name}`).join(', ') || '—')),
        h('div', {}, h('dt', {}, 'Versione'), h('dd', {}, `v${v.version} · ${v.acceptedAt ? `accettata da ${v.acceptedBy} il ${date(v.acceptedAt)}` : 'non ancora accettata'}`))) : null,
      c.status === 'awaiting_client' && S.member.role === 'company_admin' ? h('div', { class: 'app-subform' },
        h('h4', {}, 'Accettazione del contratto'),
        h('p', { class: 'app-muted' }, 'Solo l’amministratore aziendale autorizzato può accettare. Il contratto si attiva dopo il pagamento verificato o riconciliato della prima rata.'),
        signer, h('div', { class: 'field field--check' }, agree, h('label', { for: `agree-${c.id}` }, 'Ho letto condizioni, limiti, esclusioni e tariffe aggiuntive e dichiaro di essere autorizzato a impegnare l’azienda.')),
        act('Accetta il contratto', async () => {
          if (!agree.checked) throw new Error('È necessario confermare la lettura delle condizioni.');
          await db.rpc('accept_business_contract_version', { p_version: v.versionId, p_signer_name: signer.value.trim() });
          flash('Contratto accettato: versione conservata. Procedi con il pagamento della prima rata.'); render();
        }, 'btn btn--primary')) : null,
      S.can.pay && inst.length ? h('div', {}, h('h4', {}, 'Rate e pagamenti'),
        table([{ label: 'Rata', key: 'number' }, { label: 'Scadenza', render: (i) => date(i.due_date) }, { label: 'Importo', render: (i) => euro(i.amount_cents) }, { label: 'Stato', render: (i) => installmentBadge(i.status) },
          { label: 'Documento fiscale', render: (i) => i.fiscal_document_ref || '—' },
          { label: '', render: (i) => (i.status === 'due' ? act('Paga online', async () => {
            // ordine della rata creato dal database (solo se il pagamento online è approvato per il contratto), poi riepilogo e checkout sicuro
            const r = await fn('order-create', { method: 'POST', body: { kind: 'business', installmentId: i.id } });
            const data = await r.json();
            if (!r.ok) throw new Error(data.message || 'Pagamento online non disponibile: è possibile pagare con bonifico, che verrà riconciliato.');
            location.assign(`/checkout/?ordine=${data.order.id}`);
          }, 'btn btn--primary btn--sm') : null) }], inst)) : null);
  };
  return h('div', { class: 'app-stack' },
    h('div', { class: 'app-list' }, contracts.length ? contracts.map((c, i) => card(c, views[i])) : h('div', { class: 'app-card' }, h('p', {}, 'Nessun contratto. Richiedi una proposta a Pronto Intervento Roma.'))),
    h('section', { class: 'app-card' }, h('h2', {}, 'Preventivi'),
      table([{ label: 'Numero', key: 'number' }, { label: 'Oggetto', key: 'title' }, { label: 'Totale', render: (q) => `${euro(q.net_cents)} + IVA` }, { label: 'Valido fino al', render: (q) => date(q.valid_until) },
        { label: 'Stato', render: (q) => quoteBadge(q.status) },
        { label: '', render: (q) => h('div', { class: 'app-inline' }, act('PDF', () => openPdf('quote-pdf', `?id=${q.id}`, 'Preventivo')),
          q.status === 'sent' && S.member.role === 'company_admin' ? act('Accetta', async () => {
            const who = prompt('Nome e cognome del firmatario autorizzato:');
            if (!who) return;
            await db.rpc('accept_business_quote', { p_quote: q.id, p_signer_name: who.trim() });
            flash('Preventivo accettato e conservato. Il contratto verrà predisposto da Pronto Intervento Roma.'); render();
          }, 'btn btn--primary btn--sm') : null) }], quotes, { empty: 'Nessun preventivo inviato.' })));
}

/* ---------------------------------------------------------------- azienda e referenti */
async function azienda() {
  const a = S.account;
  const members = await db.rpc('business_members_list', { p_account: a.id });
  const isAdmin = S.member.role === 'company_admin';
  const f = { pec: h('input', { type: 'email', value: a.pec || '' }), sdi: h('input', { type: 'text', value: a.sdi_code || '', maxlength: 7 }), addr: h('input', { type: 'text', value: a.billing_address || '' }), city: h('input', { type: 'text', value: a.billing_city || '' }), cap: h('input', { type: 'text', value: a.billing_postal_code || '', inputmode: 'numeric' }) };
  if (!isAdmin) Object.values(f).forEach((i) => { i.disabled = true; });
  const email = h('input', { type: 'email', required: true });
  const role = h('select', {}, Object.entries(ROLE_LABELS).map(([k, l]) => h('option', { value: k, selected: k === 'site_contact' }, l)));
  const locs = S.locations.map((l) => { const cb = h('input', { type: 'checkbox', value: l.id, id: `ml-${l.id}` }); return { cb, el: h('label', { class: 'chip-check', for: `ml-${l.id}` }, cb, h('span', {}, l.code)) }; });
  return h('div', { class: 'app-stack' },
    h('section', { class: 'app-card' }, h('h2', {}, 'Profilo aziendale'),
      h('dl', { class: 'app-dl' }, h('div', {}, h('dt', {}, 'Ragione sociale'), h('dd', {}, a.legal_name)), h('div', {}, h('dt', {}, 'Tipologia'), h('dd', {}, KIND_LABELS[a.kind] || a.kind)),
        h('div', {}, h('dt', {}, 'Partita IVA'), h('dd', {}, a.vat_number || 'Da indicare')), h('div', {}, h('dt', {}, 'Il tuo ruolo'), h('dd', {}, ROLE_LABELS[S.member.role]))),
      h('form', { onsubmit: async (e) => {
        e.preventDefault();
        try { await db.rpc('update_business_billing', { p_account: a.id, p_pec: f.pec.value.trim() || null, p_sdi: f.sdi.value.trim() || null, p_address: f.addr.value.trim() || null, p_city: f.city.value.trim() || null, p_cap: f.cap.value.trim() || null }); flash('Dati di fatturazione aggiornati.'); await loadAccount(); render(); }
        catch (err) { flash(err.message, 'error'); }
      } }, h('h3', {}, 'Dati di fatturazione'), h('div', { class: 'app-form-grid app-form-grid--2' }, field('PEC', f.pec), field('Codice SDI', f.sdi), field('Indirizzo', f.addr), field('Comune', f.city), field('CAP', f.cap)),
        isAdmin ? h('button', { class: 'btn btn--primary', type: 'submit' }, 'Salva') : h('p', { class: 'app-muted' }, 'Modificabili dall’amministratore aziendale. Ragione sociale e partita IVA si aggiornano tramite Pronto Intervento Roma.'))),
    h('section', { class: 'app-card' }, h('h2', {}, 'Referenti autorizzati'),
      table([{ label: 'Nome', render: (m) => m.full_name || '—' }, { label: 'Email', key: 'email' }, { label: 'Ruolo', render: (m) => ROLE_LABELS[m.role] },
        { label: 'Sedi', render: (m) => (['company_admin', 'maintenance_manager'].includes(m.role) ? 'Tutte' : (m.location_ids || []).map(locName).join(', ') || 'Nessuna') },
        { label: 'Stato', render: (m) => (m.active ? badge('Attivo', 'ok') : badge('Disattivato', 'neutral')) }], members),
      isAdmin ? h('form', { class: 'app-subform', onsubmit: async (e) => {
        e.preventDefault();
        try { await db.rpc('add_business_member', { p_account: a.id, p_email: email.value.trim(), p_role: role.value, p_locations: locs.filter((x) => x.cb.checked).map((x) => x.cb.value) }); flash('Referente aggiornato.'); render(); }
        catch (err) { flash(err.message, 'error'); }
      } }, h('h3', {}, 'Aggiungi o modifica un referente'), h('p', { class: 'app-muted' }, 'La persona deve aver effettuato almeno un accesso all’area Business con la propria email.'),
        h('div', { class: 'app-form-grid app-form-grid--2' }, field('Email', email), field('Ruolo', role)),
        h('fieldset', { class: 'chip-group' }, h('legend', {}, 'Sedi assegnate (per referenti di sede e utenti limitati)'), h('div', { class: 'chip-group__list' }, locs.map((x) => x.el))),
        h('button', { class: 'btn btn--primary', type: 'submit' }, 'Salva referente')) : null));
}

/* ---------------------------------------------------------------- shell */
const VIEWS = { panoramica, richieste, storico, sedi, manutenzioni, contratti, azienda };
async function loadAccount() { [S.account] = await db.select(`business_accounts?id=eq.${S.member.account_id}&select=*`); }
async function loadLocations() { S.locations = await db.select(`business_locations?account_id=eq.${S.account.id}&select=*&order=code`); }

async function render() {
  const tabs = TABS.filter(([k]) => k !== 'contratti' || S.can.contracts);
  const key = VIEWS[location.hash.slice(1)] && tabs.some(([k]) => k === location.hash.slice(1)) ? location.hash.slice(1) : 'panoramica';
  root.querySelectorAll('.app-tabs a').forEach((a) => a.setAttribute('aria-current', a.getAttribute('href') === `#${key}` ? 'page' : 'false'));
  fill(main, h('p', { class: 'app-muted' }, 'Caricamento…'));
  try { fill(main, await VIEWS[key]()); } catch (err) { fill(main, notice('error', err.message)); }
}

async function start({ user, profile, restart }) {
  const memberships = await db.select(`business_members?profile_id=eq.${user.id}&active=eq.true&select=id,account_id,role,location_ids,account:business_accounts(id,legal_name,kind)`);
  if (!memberships.length) {
    return fill(root, h('div', { class: 'app-card app-card--center' }, h('h2', {}, 'Nessuna azienda collegata'),
      h('p', {}, 'Il tuo account non è ancora associato a un’azienda cliente. L’abilitazione avviene da parte dell’amministratore della tua azienda o di Pronto Intervento Roma.'),
      h('a', { class: 'btn btn--primary', href: '/piani-assistenza/business/#preventivo' }, 'Richiedi informazioni'),
      h('button', { class: 'btn btn--ghost', type: 'button', onclick: async () => { await auth.signOut(); restart(); } }, 'Esci')));
  }
  const saved = sessionStorage.getItem('pir.b2b.account');
  const member = memberships.find((m) => m.account_id === saved) || memberships[0];
  S = { user, profile, memberships, member, can: CAN[member.role], restart };
  await loadAccount();
  await loadLocations();
  main = h('div', { class: 'app-main', id: 'business-main' });
  const switcher = memberships.length > 1 ? h('select', { 'aria-label': 'Azienda', onchange: (e) => { sessionStorage.setItem('pir.b2b.account', e.target.value); start({ user, profile, restart }); } },
    memberships.map((m) => h('option', { value: m.account_id, selected: m.account_id === member.account_id }, m.account?.legal_name))) : null;
  fill(root,
    h('div', { class: 'app-head' },
      h('div', {}, h('p', { class: 'eyebrow' }, `Area Business · ${ROLE_LABELS[member.role]}`), h('h1', { class: 'section-title' }, S.account.legal_name)),
      h('div', { class: 'app-inline' }, switcher, h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: async () => { await auth.signOut(); restart(); } }, 'Esci'))),
    h('nav', { class: 'app-tabs', 'aria-label': 'Sezioni area Business' }, TABS.filter(([k]) => k !== 'contratti' || S.can.contracts).map(([k, l]) => h('a', { href: `#${k}` }, l))),
    main);
  window.onhashchange = render;
  await render();
}

if (root) boot(root, { title: 'Area Business', render: start, customerArea: true });
