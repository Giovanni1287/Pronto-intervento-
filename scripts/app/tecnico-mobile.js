/**
 * AREA TECNICO (mobile) — /tecnico/
 * Pensata per lo smartphone. Il tecnico vede SOLO i lavori assegnati e ancora
 * aperti (RPC my_jobs/my_job, controllate lato server): nessun accesso al
 * database clienti, a prezzi o costi. Nessun tracciamento della posizione:
 * il pulsante di navigazione apre un'app esterna con l'indirizzo dell'intervento.
 */
import { h, fill, notice, boot, db, auth, table, field, dateTime } from './core.js';
import { opsBadge, actBtn, options, toLocalInput, fromLocalInput, timeOf, dayOf } from './ops-common.js';
import { navigationUrl, reportMissingFields, URGENCY_LABELS } from '../lib/operations.js';
import { b2bSection } from './tecnico-b2b.js';
import { aiChatPanel } from './ai-chat-panel.js';

const root = document.getElementById('app');
let restartFn; let user;

const NEXT = { technician_assigned: [['en_route', 'Sono in viaggio'], ['on_site', 'Sono sul posto']], en_route: [['on_site', 'Sono sul posto']], on_site: [['in_progress', 'Inizia l’intervento']] };
const UNITS = [['pz', 'pz'], ['m', 'm'], ['kg', 'kg'], ['l', 'l'], ['conf', 'conf.'], ['h', 'h'], ['mq', 'm²']];

function top(title, back) {
  return h('header', { class: 'tm-top' },
    back ? h('a', { class: 'tm-top__back', href: '#', 'aria-label': 'Torna ai lavori' }, '←') : h('span', { class: 'tm-top__dot', 'aria-hidden': 'true' }),
    h('div', {}, h('small', {}, 'Area tecnico'), h('b', {}, title)),
    h('button', { class: 'tm-top__out', type: 'button', onclick: async () => { await auth.signOut(); restartFn(); } }, 'Esci'));
}

/* ================================================================ elenco lavori */
async function list() {
  fill(root, top('I miei lavori'), h('p', { class: 'app-muted tm-pad' }, 'Caricamento…'));
  let jobs;
  try { jobs = await db.rpc('my_jobs'); } catch (e) { fill(root, top('I miei lavori'), h('div', { class: 'tm-pad' }, notice('error', e.message))); return; }
  const todayKey = new Date().toDateString();
  const today = jobs.filter((j) => new Date(j.startsAt).toDateString() === todayKey);
  const later = jobs.filter((j) => new Date(j.startsAt).toDateString() !== todayKey);
  const card = (j) => h('a', { class: `tm-job tm-job--${j.status}${j.priority === 'urgent' || j.urgency === 'emergency' ? ' tm-job--urgent' : ''}`, href: `#j=${j.id}` },
    h('div', { class: 'tm-job__time' }, h('b', {}, timeOf(j.startsAt)), h('small', {}, timeOf(j.endsAt))),
    h('div', { class: 'tm-job__body' }, h('span', { class: 'tm-job__num' }, j.number, j.kind === 'inspection' ? ' · sopralluogo' : ''), h('b', {}, j.service || j.category || 'Intervento'),
      h('span', {}, [j.addressLine, j.city].filter(Boolean).join(', ')), h('span', { class: 'tm-job__badges' }, opsBadge(j.status, j.statusLabel),
        j.reportStatus === 'changes_requested' ? h('span', { class: 'app-badge app-badge--error' }, 'Correzione richiesta') : null,
        j.priority === 'urgent' || j.urgency === 'emergency' ? h('span', { class: 'app-badge app-badge--error' }, 'Urgente') : null)),
    h('span', { class: 'tm-job__go', 'aria-hidden': 'true' }, '›'));
  const checks = await db.select('scheduled_checks?select=id,scheduled_at,status&order=scheduled_at').catch(() => []);
  fill(root, top('I miei lavori'),
    h('div', { class: 'tm-pad tm-stack' },
      h('section', {}, h('h2', { class: 'tm-h2' }, `Oggi · ${new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}`),
        today.length ? today.map(card) : h('p', { class: 'app-muted' }, 'Nessun lavoro per oggi.')),
      h('section', {}, h('h2', { class: 'tm-h2' }, 'Prossimi e da completare'), later.length ? later.map(card) : h('p', { class: 'app-muted' }, 'Nessun altro lavoro assegnato.')),
      checks.length ? h('section', { class: 'app-card' }, h('h2', {}, 'Controlli Lavoro Protetto'),
        table([{ label: 'Data', render: (c) => dateTime(c.scheduled_at) }, { label: '', render: (c) => { const rep = h('input', { type: 'text', 'aria-label': 'Esito del controllo', placeholder: 'Esito del controllo' });
          return h('div', { class: 'app-inline' }, rep, actBtn('Segna eseguito', async () => { await db.rpc('complete_check', { p_check: c.id, p_report: rep.value.trim() }); list(); }, { cls: 'btn btn--primary btn--sm' })); } }], checks)) : null,
      await b2bSection(() => list()).catch(() => null),
      h('p', { class: 'app-muted' }, 'Vedi solo i lavori assegnati a te. La posizione del telefono non viene mai rilevata.')));
}

/* ================================================================ dettaglio lavoro */
async function job(id) {
  fill(root, top('Lavoro', true), h('p', { class: 'app-muted tm-pad' }, 'Caricamento…'));
  let j;
  try { j = await db.rpc('my_job', { p_id: id }); } catch (e) { fill(root, top('Lavoro', true), h('div', { class: 'tm-pad' }, notice('error', e.message))); return; }
  const st = h('div', { role: 'status', 'aria-live': 'polite' });
  const reload = () => job(id);
  const run = (fnc) => async () => { try { await fnc(); await reload(); } catch (err) { fill(st, notice('error', err.message)); st.scrollIntoView({ block: 'center' }); } };
  const nav = navigationUrl(j);
  const ed = j.editable;
  const r = j.report || {};

  /* ---------- ore */
  const now = new Date(); const tk = h('select', { 'aria-label': 'Tipo' }, options([['work', 'Lavoro'], ['travel', 'Viaggio']], 'work'));
  const ts = h('input', { type: 'datetime-local', value: toLocalInput(new Date(now - 3600e3)), 'aria-label': 'Inizio' });
  const te = h('input', { type: 'datetime-local', value: toLocalInput(now), 'aria-label': 'Fine' });
  const minutes = j.time.reduce((n, x) => n + x.minutes, 0);
  const time = h('section', { class: 'tm-sec' }, h('h2', {}, `Ore lavorate · ${Math.floor(minutes / 60)} h ${minutes % 60} min`),
    j.time.length ? h('ul', { class: 'tm-list' }, j.time.map((x) => h('li', {}, h('span', {}, `${x.kind === 'travel' ? 'Viaggio' : 'Lavoro'} · ${dayOf(x.startedAt)} ${timeOf(x.startedAt)}–${timeOf(x.endedAt)}`), h('b', {}, `${x.minutes} min`),
      ed ? actBtn('Elimina', run(() => db.rpc('tech_delete_time', { p_entry: x.id })), { cls: 'tm-x' }) : null))) : h('p', { class: 'app-muted' }, 'Nessuna ora registrata.'),
    ed ? h('div', { class: 'tm-form' }, tk, ts, te, actBtn('Aggiungi ore', run(() => db.rpc('tech_log_time', { p_id: id, p_kind: tk.value, p_start: fromLocalInput(ts.value), p_end: fromLocalInput(te.value), p_note: null })), { cls: 'btn btn--ghost' })) : null);

  /* ---------- materiali */
  const mn = h('input', { type: 'text', placeholder: 'Materiale', 'aria-label': 'Materiale' }); const mq = h('input', { type: 'number', min: '0.01', step: '0.01', value: '1', 'aria-label': 'Quantità', inputmode: 'decimal' });
  const mu = h('select', { 'aria-label': 'Unità' }, options(UNITS, 'pz'));
  const materials = h('section', { class: 'tm-sec' }, h('h2', {}, 'Materiali utilizzati'),
    j.materials.length ? h('ul', { class: 'tm-list' }, j.materials.map((m) => h('li', {}, h('span', {}, m.name), h('b', {}, `${String(m.quantity).replace('.', ',')} ${m.unit}`),
      ed ? actBtn('Elimina', run(() => db.rpc('tech_delete_material', { p_material: m.id })), { cls: 'tm-x' }) : null))) : h('p', { class: 'app-muted' }, 'Nessun materiale.'),
    ed ? h('div', { class: 'tm-form' }, mn, mq, mu, actBtn('Aggiungi', run(() => db.rpc('tech_add_material', { p_id: id, p_name: mn.value, p_quantity: Number(mq.value), p_unit: mu.value, p_notes: null })), { cls: 'btn btn--ghost' })) : null);

  /* ---------- fotografie */
  const pf = h('input', { type: 'file', accept: 'image/jpeg,image/png', capture: 'environment', multiple: true, 'aria-label': 'Fotografie' });
  const pp = h('select', { 'aria-label': 'Fase' }, options([['prima', 'Prima'], ['durante', 'Durante'], ['dopo', 'Dopo']], 'dopo'));
  const pc = h('input', { type: 'text', placeholder: 'Didascalia (facoltativa)', 'aria-label': 'Didascalia' });
  const pa = h('input', { type: 'checkbox', id: `pa-${id}` });
  const photos = h('section', { class: 'tm-sec' }, h('h2', {}, `Fotografie (${j.photos.length})`),
    j.photos.length ? h('ul', { class: 'tm-list' }, j.photos.map((p) => h('li', {}, h('span', {}, `${p.phase || '—'} · ${p.caption || 'senza didascalia'}`), h('b', {}, p.authorized ? 'nel rapporto' : 'solo interna')))) : null,
    ed ? h('div', { class: 'tm-form tm-form--col' }, pf, pp, pc, h('label', { class: 'chip-check', for: pa.id }, pa, h('span', {}, 'Il cliente ha autorizzato l’uso nel rapporto')),
      h('p', { class: 'app-muted' }, 'Solo foto pertinenti al lavoro: evitare volti, documenti e dati personali.'),
      actBtn('Carica foto', run(async () => {
        if (!pf.files.length) throw new Error('Scegli almeno una foto');
        for (const file of pf.files) {
          if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name}: file troppo grande (max 8 MB)`);
          const path = `${id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`;
          await db.upload('interventi', path, file);
          await db.insert('documents', { intervention_id: id, kind: 'photo', storage_path: path, photo_consent: pa.checked, uploaded_by: user.id, phase: pp.value, caption: pc.value.trim() || null });
        }
      }), { cls: 'btn btn--ghost' })) : null);

  /* ---------- lavorazioni aggiuntive */
  const xd = h('textarea', { rows: 2, placeholder: 'Descrivi la lavorazione non prevista', 'aria-label': 'Lavorazione aggiuntiva' }); const xm = h('input', { type: 'number', min: 1, placeholder: 'Minuti stimati', 'aria-label': 'Minuti stimati' });
  const extra = h('section', { class: 'tm-sec' }, h('h2', {}, 'Lavorazioni aggiuntive'),
    h('p', { class: 'app-muted' }, 'Le proponi qui: prezzo e autorizzazione del cliente li gestisce l’amministrazione. Non eseguire lavori extra prima dell’autorizzazione.'),
    j.extraWorks.length ? h('ul', { class: 'tm-list' }, j.extraWorks.map((w) => h('li', {}, h('span', {}, w.description), h('b', {}, { proposed: 'in attesa', authorized: 'autorizzata', rejected: 'non autorizzata', withdrawn: 'ritirata' }[w.status])))) : null,
    ['technician_assigned', 'en_route', 'on_site', 'in_progress'].includes(j.status) ? h('div', { class: 'tm-form tm-form--col' }, xd, xm,
      actBtn('Proponi', run(() => db.rpc('tech_propose_extra_work', { p_id: id, p_description: xd.value, p_minutes: xm.value ? Number(xm.value) : null })), { cls: 'btn btn--ghost' })) : null);

  /* ---------- rapporto */
  const rf = {
    problemDescription: h('textarea', { rows: 2 }, r.problem_description || j.description || ''), diagnosis: h('textarea', { rows: 3 }, r.diagnosis || ''),
    workPerformed: h('textarea', { rows: 4 }, r.work_description || ''), unresolvedIssues: h('textarea', { rows: 2 }, r.unresolved_issues || ''),
    recommendations: h('textarea', { rows: 2 }, r.recommendations || ''), extraCostsNote: h('textarea', { rows: 2 }, r.extra_costs_note || ''),
    finalNotes: h('textarea', { rows: 2 }, r.final_notes || ''),
    startedAt: h('input', { type: 'datetime-local', value: toLocalInput(r.started_at || j.time[0]?.startedAt || j.startsAt) }),
    endedAt: h('input', { type: 'datetime-local', value: toLocalInput(r.ended_at || j.time.at(-1)?.endedAt || new Date()) })
  };
  const ack = h('select', {}, options([['none', 'Non raccolta'], ['verbal', 'Presa visione verbale'], ['signature', 'Firma del cliente sul dispositivo']], r.customer_ack_method || 'none'));
  const ackName = h('input', { type: 'text', value: r.customer_ack_name || '', placeholder: 'Nome e cognome di chi prende visione', autocomplete: 'off' });
  Object.values(rf).concat([ack, ackName]).forEach((x) => { x.disabled = !ed; });
  const payload = () => ({ ...Object.fromEntries(Object.entries(rf).map(([k, x]) => [k, x.type === 'datetime-local' ? fromLocalInput(x.value) : x.value])), ackMethod: ack.value, ackName: ackName.value });
  const report = h('section', { class: 'tm-sec tm-report' }, h('h2', {}, 'Rapporto di intervento'),
    r.status === 'changes_requested' && r.correction_note ? notice('warn', `Correzione richiesta: ${r.correction_note}`) : null,
    !ed && r.status === 'submitted' ? notice('info', 'Rapporto inviato: in verifica amministrativa. Non è più modificabile da qui.') : null,
    field('Descrizione del problema', rf.problemDescription), field('Diagnosi effettuata *', rf.diagnosis), field('Lavorazioni eseguite *', rf.workPerformed),
    h('div', { class: 'tm-two' }, field('Inizio *', rf.startedAt), field('Fine *', rf.endedAt)),
    field('Problemi non risolti', rf.unresolvedIssues), field('Raccomandazioni', rf.recommendations), field('Eventuali costi aggiuntivi (da autorizzare)', rf.extraCostsNote), field('Note finali', rf.finalNotes),
    h('fieldset', { class: 'tm-ack' }, h('legend', {}, 'Presa visione del cliente (facoltativa)'), ack, ackName,
      h('p', { class: 'app-muted' }, 'Non sostituisce certificazioni o dichiarazioni obbligatorie per legge.')),
    ed ? h('div', { class: 'tm-actions' },
      actBtn('Salva bozza', run(() => db.rpc('save_report_draft', { p_id: id, p: payload() })), { cls: 'btn btn--ghost' }),
      actBtn('Richiedi completamento', run(async () => {
        const p = payload();
        const miss = reportMissingFields({ workPerformed: p.workPerformed, diagnosis: p.diagnosis, startedAt: p.startedAt, endedAt: p.endedAt }, { categoryId: 1, serviceId: 1, addressLine: j.addressLine || 1 })
          .filter((x) => !['categoria', 'servizio (sottocategoria)'].includes(x));
        if (miss.length) throw new Error(`Completa: ${miss.join(', ')}`);
        if (!confirm('Inviare il rapporto per la verifica? Dopo l’invio ore, materiali e rapporto non saranno più modificabili.')) return;
        await db.rpc('request_completion', { p_id: id, p });
      }), { cls: 'btn btn--primary' })) : null);

  /* ---------- assemblaggio */
  const next = NEXT[j.status] || [];
  fill(root, top(j.number, true),
    h('div', { class: 'tm-pad tm-stack' },
      h('section', { class: 'tm-hero' },
        h('div', { class: 'tm-hero__badges' }, opsBadge(j.status, j.statusLabel), j.urgency !== 'normal' ? h('span', { class: `app-badge app-badge--${['high', 'emergency'].includes(j.urgency) ? 'error' : 'neutral'}` }, `Urgenza ${URGENCY_LABELS[j.urgency].toLowerCase()}`) : null,
          j.covered ? h('span', { class: 'app-badge app-badge--ok' }, 'PRONTO+') : null),
        h('h1', {}, j.service || j.category || 'Intervento'), h('p', { class: 'tm-hero__when' }, `${dayOf(j.startsAt)} · ${timeOf(j.startsAt)}–${timeOf(j.endsAt)}${j.slot ? ` · fascia ${j.slot}` : ''}`),
        h('p', { class: 'tm-hero__addr' }, [j.addressLine, [j.postalCode, j.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || 'Indirizzo non indicato'),
        h('div', { class: 'tm-hero__actions' },
          nav ? h('a', { class: 'btn btn--primary', href: nav, target: '_blank', rel: 'noopener noreferrer' }, 'Apri navigazione') : null,
          j.contactPhone ? h('a', { class: 'btn btn--ghost', href: `tel:${j.contactPhone.replace(/\s/g, '')}` }, `Chiama ${j.contactName || 'il cliente'}`) : null)),
      st,
      next.length ? h('div', { class: 'tm-next' }, next.map(([to, label]) => actBtn(label, run(() => db.rpc('tech_set_status', { p_id: id, p_to: to })), { cls: 'btn btn--orange btn--lg' }))) : null,
      h('section', { class: 'tm-sec' }, h('h2', {}, 'Dettagli del lavoro'), h('p', {}, j.description || '—'),
        j.assignmentNotes ? h('p', {}, h('b', {}, 'Note: '), j.assignmentNotes) : null, j.equipment ? h('p', {}, h('b', {}, 'Attrezzature: '), j.equipment) : null,
        j.notes.map((n) => h('p', { class: 'app-muted' }, `${dateTime(n.at)} — ${n.body}`))),
      aiSection(id, ed, rf),
      j.status === 'technician_assigned' || j.status === 'en_route' ? h('p', { class: 'app-muted' }, 'Ore, materiali e rapporto si registrano una volta sul posto.') : null,
      ['on_site', 'in_progress'].includes(j.status) || !ed ? [time, materials, photos, extra, report] : null));
}

/* ---------- ASSISTENTE TECNICO AI (Prompt 6): suggerimenti, mai inseriti senza la scelta del tecnico */
function aiSection(id, editable, rf) {
  const apply = (key, label) => ({ label, apply: (text) => {
    if (!editable) { alert('Il rapporto non è modificabile in questa fase.'); return; }
    const el = rf[key];
    el.value = el.value.trim() ? `${el.value.trim()}\n${text}` : text;
    // nessun focus automatico (eviterebbe lo zoom della pagina su smartphone): il campo viene evidenziato
    el.classList.add('tm-ai-filled');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  } });
  return h('details', { class: 'tm-sec tm-ai' },
    h('summary', {}, h('span', { class: 'tm-ai__badge', 'aria-hidden': 'true' }, 'AI'), h('span', {}, 'ASSISTENTE TECNICO AI')),
    h('p', { class: 'app-muted' }, 'Riepilogo del lavoro, procedure aziendali approvate, campi mancanti e bozze di testo a partire dalle tue note. '
      + 'Le bozze vanno verificate: il contenuto del rapporto resta sotto la tua responsabilità e l’AI non sostituisce le verifiche tecniche professionali.'),
    aiChatPanel({ agent: 'technical', context: { interventionId: id }, compact: true,
      suggestions: ['Riepilogo del lavoro', 'Cosa manca nel rapporto?', 'Procedure approvate per questo intervento', 'Scrivi una bozza delle lavorazioni dalle mie note'],
      replyActions: editable ? [apply('workPerformed', 'Usa come bozza "Lavorazioni eseguite"'), apply('recommendations', 'Usa come bozza "Raccomandazioni"')] : [] }));
}

async function route() {
  const m = location.hash.match(/^#j=([0-9a-f-]{36})$/);
  return m ? job(m[1]) : list();
}

if (root) {
  boot(root, {
    title: 'Area tecnico',
    requireRole: ['technician'],
    render: async (ctx) => {
      restartFn = ctx.restart; user = ctx.user;
      window.addEventListener('hashchange', () => route().catch((e) => fill(root, notice('error', e.message))));
      await route();
    }
  });
}
