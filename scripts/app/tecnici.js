/**
 * GESTIONE TECNICI — /admin/tecnici/
 * Amministratore: profili, specializzazioni, zone, disponibilità, assenze,
 * abilitazioni verificate (con scadenza), documenti (accesso registrato),
 * disattivazione dell'accesso. Operatore di centrale: sola consultazione.
 * La specializzazione dichiarata NON è una verifica delle abilitazioni.
 */
import { h, fill, notice, boot, db, date, dateTime, field, table } from './core.js';
import { opsBar, opsBadge, modal, actBtn, options, flashIn, fromLocalInput, toCents, centsToInput, timeOf, dayOf } from './ops-common.js';

const root = document.getElementById('app');
let me; let restartFn; let specs = []; let manage = false;
const WEEKDAYS = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];
const specName = (id) => specs.find((s) => s.id === id)?.name || id;
const QUAL_STATE = { valid: ['Valida', 'ok'], expiring: ['In scadenza', 'warn'], expired: ['Scaduta', 'error'], revoked: ['Revocata', 'neutral'] };
const zonesOf = (v) => v.split(',').map((x) => x.trim()).filter(Boolean);

async function list() {
  const body = h('div', { class: 'ops-page' }, h('p', { class: 'app-muted' }, 'Caricamento…'));
  fill(root, opsBar(me, restartFn), body);
  const rows = await db.rpc('technicians_overview');
  fill(body,
    h('div', { class: 'ops-head' }, h('div', {}, h('p', { class: 'eyebrow' }, 'Gestione tecnici'), h('h1', { class: 'section-title app-h1' }, 'Tecnici')),
      manage ? h('button', { class: 'btn btn--primary', type: 'button', onclick: newTechDialog }, '+ Nuovo tecnico') : null),
    notice('info', 'Le specializzazioni del profilo indicano le competenze dichiarate e non costituiscono verifica delle abilitazioni professionali: queste si registrano a parte, dopo il controllo dei documenti.'),
    rows.length ? h('div', { class: 'tech-grid' }, rows.map((t) => h('a', { class: `tech-card${t.active ? '' : ' is-off'}`, href: `#t=${t.id}` },
      h('div', { class: 'tech-card__head' }, h('span', { class: 'tech-card__avatar', 'aria-hidden': 'true' }, t.displayName.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()),
        h('div', {}, h('b', {}, t.displayName), h('small', {}, t.email)), h('span', { class: `app-badge app-badge--${t.active ? 'ok' : 'neutral'}` }, t.active ? 'Attivo' : 'Disattivato')),
      h('p', { class: 'tech-card__specs' }, t.specializations.length ? t.specializations.map(specName).join(' · ') : 'Nessuna specializzazione'),
      h('ul', { class: 'tech-card__facts' }, h('li', {}, h('b', {}, String(t.today)), ' oggi'), h('li', {}, h('b', {}, String(t.openAssignments)), ' aperti'),
        h('li', {}, t.zones.length ? t.zones.join(', ') : 'Zone non configurate')),
      !t.availabilityConfigured ? h('span', { class: 'app-badge app-badge--warn' }, 'Disponibilità da configurare') : null,
      t.qualificationsExpiring ? h('span', { class: 'app-badge app-badge--error' }, `${t.qualificationsExpiring} abilitazioni in scadenza`) : null)))
      : h('div', { class: 'app-card' }, h('p', {}, 'Nessun tecnico registrato. I profili si creano dagli account invitati tramite Supabase Auth (nessun tecnico inventato).')));
}

function specBoxes(selected = []) {
  return specs.map((s) => { const c = h('input', { type: 'checkbox', value: s.id, checked: selected.includes(s.id) }); return { c, el: h('label', { class: 'chip-check' }, c, h('span', {}, s.name)) }; });
}

function newTechDialog() {
  const st = h('div', { role: 'status' });
  const f = { email: h('input', { type: 'email', required: true }), name: h('input', { type: 'text', required: true }), zones: h('input', { type: 'text', value: 'Roma' }),
    phone: h('input', { type: 'tel' }), wmail: h('input', { type: 'email' }), cost: h('input', { type: 'text', inputmode: 'decimal', placeholder: 'es. 28,00' }) };
  const boxes = specBoxes();
  const dlg = modal('Nuovo tecnico', h('form', { class: 'ops-form', onsubmit: async (e) => {
    e.preventDefault();
    try {
      const t = await db.rpc('create_technician', { p_email: f.email.value, p_display_name: f.name.value, p_zones: zonesOf(f.zones.value), p_specs: boxes.filter((b) => b.c.checked).map((b) => b.c.value),
        p_work_phone: f.phone.value || null, p_work_email: f.wmail.value || null, p_hourly_cost_cents: f.cost.value ? toCents(f.cost.value) : null });
      dlg.close(); location.hash = `t=${t.id}`;
    } catch (err) { fill(st, notice('error', err.message)); }
  } },
    h('p', { class: 'app-muted' }, 'Il tecnico deve prima avere un account (invito da Supabase Auth con la sua email). Il ruolo "tecnico" viene assegnato qui.'),
    h('div', { class: 'app-form-grid' }, field('Email dell’account', f.email), field('Nome visualizzato', f.name), field('Zone servite (separate da virgola, * = tutte)', f.zones),
      field('Telefono di lavoro', f.phone), field('Email di lavoro', f.wmail), field('Costo orario interno (€, riservato)', f.cost)),
    h('fieldset', { class: 'chip-group__list' }, h('legend', {}, 'Specializzazioni dichiarate'), boxes.map((b) => b.el)),
    h('button', { class: 'btn btn--primary', type: 'submit' }, 'Crea profilo tecnico'), st));
}

async function detail(id) {
  const body = h('div', { class: 'ops-page' }, h('p', { class: 'app-muted' }, 'Caricamento…'));
  fill(root, opsBar(me, restartFn), body);
  const t = await db.rpc('technician_detail', { p_id: id });
  const st = h('div', { role: 'status', 'aria-live': 'polite' });
  const run = (fnc, ok) => async () => { try { await fnc(); flashIn(body, ok || 'Salvato.'); await detail(id); } catch (err) { fill(st, notice('error', err.message)); st.scrollIntoView({ block: 'nearest' }); } };
  const sec = (title, ...c) => h('section', { class: 'app-card ops-sec' }, h('h2', {}, title), ...c);

  /* dati e specializzazioni */
  const p = t.private || {};
  const name = h('input', { type: 'text', value: t.displayName, disabled: !manage }); const zones = h('input', { type: 'text', value: t.zones.join(', '), disabled: !manage });
  const phone = h('input', { type: 'tel', value: p.work_phone || '', disabled: !manage }); const wmail = h('input', { type: 'email', value: p.work_email || '', disabled: !manage });
  const cost = h('input', { type: 'text', inputmode: 'decimal', value: centsToInput(p.internal_hourly_cost_cents), disabled: !manage }); const notes = h('textarea', { rows: 2, disabled: !manage }, p.notes || '');
  const boxes = specBoxes(t.specializations); boxes.forEach((b) => { b.c.disabled = !manage; });
  const profile = sec('Profilo e specializzazioni',
    h('div', { class: 'app-form-grid' }, field('Nome visualizzato', name), field('Zone servite (separate da virgola)', zones),
      manage ? [field('Telefono di lavoro', phone), field('Email di lavoro', wmail), field('Costo orario interno (€, riservato)', cost)] : null),
    manage ? field('Note riservate', notes) : null,
    h('fieldset', { class: 'chip-group__list' }, h('legend', {}, 'Specializzazioni dichiarate'), boxes.map((b) => b.el)),
    manage ? actBtn('Salva profilo', run(() => db.rpc('update_technician', { p_id: id, p: { displayName: name.value, zones: zonesOf(zones.value), specializations: boxes.filter((b) => b.c.checked).map((b) => b.c.value),
      workPhone: phone.value, workEmail: wmail.value, hourlyCostCents: cost.value ? toCents(cost.value) : '', notes: notes.value } })), { cls: 'btn btn--primary btn--sm' }) : null);

  /* disponibilità settimanale */
  const avail = WEEKDAYS.map((label, i) => {
    const cur = t.availability.find((a) => a.weekday === i + 1);
    const on = h('input', { type: 'checkbox', checked: Boolean(cur), disabled: !manage, 'aria-label': `${label} disponibile` });
    const s = h('input', { type: 'time', value: cur?.start || '08:00', disabled: !manage, 'aria-label': `${label} dalle` }); const e = h('input', { type: 'time', value: cur?.end || '18:00', disabled: !manage, 'aria-label': `${label} alle` });
    return { i, on, s, e, el: h('div', { class: 'avail-row' }, h('label', { class: 'chip-check' }, on, h('span', {}, label)), s, e) };
  });
  const availability = sec('Disponibilità settimanale', h('p', { class: 'app-muted' }, 'Fasce orarie (ora di Roma) in cui il tecnico può ricevere appuntamenti. Le assegnazioni fuori fascia sono segnalate come conflitto.'),
    h('div', { class: 'avail' }, avail.map((a) => a.el)),
    manage ? actBtn('Salva disponibilità', run(() => db.rpc('set_technician_availability', { p_id: id, p_slots: avail.filter((a) => a.on.checked).map((a) => ({ weekday: a.i + 1, start: a.s.value, end: a.e.value })) }))) : null);

  /* assenze */
  const abS = h('input', { type: 'datetime-local' }); const abE = h('input', { type: 'datetime-local' });
  const abK = h('select', {}, options([['ferie', 'Ferie'], ['permesso', 'Permesso'], ['assenza', 'Assenza'], ['formazione', 'Formazione'], ['altro', 'Altro']], 'ferie'));
  const absences = sec('Assenze', h('p', { class: 'app-muted' }, 'Si registra solo la tipologia: non indicare motivi di salute o altri dati non necessari.'),
    table([{ label: 'Dal', render: (a) => dateTime(a.startsAt) }, { label: 'Al', render: (a) => dateTime(a.endsAt) }, { label: 'Tipo', key: 'kind' }, { label: 'Nota', key: 'note' },
      { label: '', render: (a) => (manage ? actBtn('Elimina', run(() => db.rpc('delete_technician_absence', { p_absence: a.id }))) : null) }], t.absences, { empty: 'Nessuna assenza registrata.' }),
    manage ? h('div', { class: 'app-inline' }, abS, abE, abK, actBtn('Aggiungi assenza', run(async () => {
      const r = await db.rpc('add_technician_absence', { p_id: id, p_start: fromLocalInput(abS.value), p_end: fromLocalInput(abE.value), p_kind: abK.value, p_note: null });
      if (r.conflicts.length) alert(`Attenzione: ${r.conflicts.length} attività in calendario nel periodo di assenza (${r.conflicts.map((c) => c.number).join(', ')}). Riassegnale dal calendario.`);
    }))) : null);

  /* abilitazioni verificate */
  const q = { kind: h('input', { type: 'text', placeholder: 'Codice (es. DM37-A)' }), title: h('input', { type: 'text', placeholder: 'Descrizione' }), issuer: h('input', { type: 'text', placeholder: 'Ente' }),
    ref: h('input', { type: 'text', placeholder: 'Riferimento del documento' }), spec: h('select', {}, options(specs.map((s) => [s.id, s.name]), '', { empty: 'Specializzazione (facoltativa)' })),
    exp: h('input', { type: 'date', 'aria-label': 'Scadenza' }) };
  const quals = sec('Abilitazioni verificate',
    h('p', { class: 'app-muted' }, 'Registra solo abilitazioni di cui hai controllato il documento. Se per una specializzazione è configurato un requisito obbligatorio, l’assegnazione è bloccata senza abilitazione valida.'),
    table([{ label: 'Abilitazione', render: (x) => h('span', {}, h('b', {}, x.kind), ` · ${x.title}`, x.issuer ? h('small', { class: 'ops-block' }, `${x.issuer}${x.reference ? ` · ${x.reference}` : ''}`) : null) },
      { label: 'Specializzazione', render: (x) => (x.specializationId ? specName(x.specializationId) : '—') }, { label: 'Verificata il', render: (x) => date(x.verifiedAt) },
      { label: 'Scadenza', render: (x) => (x.expiresAt ? date(x.expiresAt) : 'Nessuna') },
      { label: 'Stato', render: (x) => h('span', { class: `app-badge app-badge--${QUAL_STATE[x.state][1]}` }, QUAL_STATE[x.state][0]) },
      { label: '', render: (x) => (manage && x.status === 'verified' ? actBtn('Revoca', run(() => db.rpc('revoke_qualification', { p_id: x.id, p_reason: prompt('Motivo della revoca') || '' }))) : null) }],
    t.qualifications, { empty: 'Nessuna abilitazione verificata registrata.' }),
    manage ? h('div', { class: 'app-form-grid ops-grid-3' }, field('Codice', q.kind), field('Descrizione', q.title), field('Ente', q.issuer), field('Riferimento', q.ref), field('Specializzazione', q.spec), field('Scadenza', q.exp)) : null,
    manage ? actBtn('Registra abilitazione verificata', run(() => db.rpc('record_qualification', { p_technician: id, p_kind: q.kind.value, p_title: q.title.value, p_issuer: q.issuer.value || null,
      p_reference: q.ref.value || null, p_specialization: q.spec.value || null, p_expires: q.exp.value || null, p_document: null }))) : null,
    t.requirements.length ? h('p', { class: 'app-muted' }, `Requisiti obbligatori configurati: ${t.requirements.map((r) => `${specName(r.specializationId)} → ${r.label} (${r.kind})`).join('; ')}`)
      : h('p', { class: 'app-muted' }, 'Nessun requisito obbligatorio configurato: definirli con il titolare secondo le norme applicabili.'));

  /* documenti (accesso registrato) */
  const docs = h('div', {}, me.role === 'admin' ? actBtn('Mostra documenti (accesso registrato)', async () => {
    const list = await db.rpc('technician_documents_list', { p_technician: id });
    fill(docs, table([{ label: 'Documento', key: 'title' }, { label: 'Tipo', key: 'kind' }, { label: 'Scadenza', render: (d) => (d.expires_at ? date(d.expires_at) : '—') }, { label: 'Caricato', render: (d) => date(d.created_at) }],
      list, { empty: 'Nessun documento.' }), uploadDoc(id, () => detail(id)));
  }) : h('p', { class: 'app-muted' }, 'Documentazione professionale visibile solo all’amministratore.'));
  const documents = sec('Documentazione professionale', docs);

  /* attività */
  const work = sec('Interventi assegnati e storico',
    h('h3', {}, 'Prossime attività'), table([{ label: 'Quando', render: (a) => `${dayOf(a.startsAt)} ${timeOf(a.startsAt)}–${timeOf(a.endsAt)}` }, { label: 'Attività', key: 'number' },
      { label: 'Stato', render: (a) => (a.status ? opsBadge(a.status) : '—') }], t.upcoming, { empty: 'Nessuna attività in calendario.' }),
    h('h3', {}, 'Storico lavori'), table([{ label: 'Data', render: (x) => date(x.date) }, { label: 'Intervento', key: 'number' }, { label: 'Servizio', key: 'service' }, { label: 'Zona', key: 'city' },
      { label: 'Stato', render: (x) => opsBadge(x.status, x.statusLabel) }], t.history, { empty: 'Nessun lavoro completato.' }));

  /* accesso */
  const access = manage ? sec('Accesso', t.active
    ? h('div', {}, h('p', { class: 'app-muted' }, 'La disattivazione revoca subito l’accesso ai dati degli interventi. Le attività future vanno riassegnate.'),
      actBtn('Disattiva accesso', run(async () => {
        const reason = prompt('Motivo della disattivazione'); if (!reason) throw new Error('Motivo obbligatorio');
        try { await db.rpc('set_technician_active', { p_id: id, p_active: false, p_reason: reason, p_release_future: false }); } catch (err) {
          if (!/attività future/.test(err.message) || !confirm(`${err.message}. Rilasciare le attività future (torneranno "Da programmare")?`)) throw err;
          await db.rpc('set_technician_active', { p_id: id, p_active: false, p_reason: reason, p_release_future: true });
        }
      }, 'Accesso disattivato.'), { cls: 'btn btn--ghost btn--sm ops-danger' }))
    : h('div', {}, h('p', {}, `Disattivato il ${date(t.deactivatedAt)}: ${t.deactivatedReason || ''}`), actBtn('Riattiva', run(() => db.rpc('set_technician_active', { p_id: id, p_active: true, p_reason: null, p_release_future: false }), 'Tecnico riattivato.')))) : null;

  fill(body, h('a', { class: 'ops-back', href: '#' }, '← Tutti i tecnici'),
    h('div', { class: 'ops-head' }, h('div', {}, h('p', { class: 'eyebrow' }, t.email || ''), h('h1', { class: 'section-title app-h1' }, t.displayName)),
      h('span', { class: `app-badge app-badge--${t.active ? 'ok' : 'neutral'}` }, t.active ? 'Attivo' : 'Disattivato')), st,
    h('div', { class: 'ops-detail' }, h('div', { class: 'ops-detail__main' }, profile, quals, work), h('aside', { class: 'ops-detail__side' }, availability, absences, documents, access)));
}

function uploadDoc(id, done) {
  const file = h('input', { type: 'file', accept: 'application/pdf,image/jpeg,image/png' });
  const kind = h('select', {}, options([['abilitazione', 'Abilitazione'], ['formazione', 'Formazione'], ['sicurezza', 'Sicurezza'], ['contratto', 'Contratto'], ['altro', 'Altro']], 'abilitazione'));
  const title = h('input', { type: 'text', placeholder: 'Titolo' }); const exp = h('input', { type: 'date' });
  const st = h('div', { role: 'status' });
  return h('form', { class: 'app-subform', onsubmit: async (e) => {
    e.preventDefault();
    try {
      const f = file.files[0]; if (!f) throw new Error('Scegli un file');
      const path = `${id}/${Date.now()}-${f.name.replace(/[^\w.-]+/g, '_')}`;
      await db.upload('tecnici', path, f);
      await db.rpc('add_technician_document', { p_technician: id, p_kind: kind.value, p_title: title.value, p_path: path, p_expires: exp.value || null });
      done();
    } catch (err) { fill(st, notice('error', err.message)); }
  } }, h('h3', {}, 'Carica documento (bucket privato)'), h('div', { class: 'app-form-grid' }, field('File', file), field('Tipo', kind), field('Titolo', title), field('Scadenza', exp)),
  h('button', { class: 'btn btn--ghost btn--sm', type: 'submit' }, 'Carica'), st);
}

async function route() {
  const m = location.hash.match(/^#t=([0-9a-f-]{36})$/);
  return m ? detail(m[1]) : list();
}

if (root) {
  boot(root, {
    title: 'Gestione tecnici',
    requireRole: ['admin', 'operator'],
    render: async ({ profile, restart }) => {
      me = profile; restartFn = restart; manage = profile.role === 'admin';
      specs = await db.select('technician_specializations?select=id,name&active=eq.true&order=sort');
      window.addEventListener('hashchange', () => route().catch((e) => fill(root, notice('error', e.message))));
      await route().catch((e) => fill(root, opsBar(me, restart), notice('error', e.message)));
    }
  });
}
