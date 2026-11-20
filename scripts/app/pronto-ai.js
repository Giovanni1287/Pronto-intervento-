/**
 * PRONTO AI — console /admin/pronto-ai/ (Prompt 6).
 * Sezioni: Assistente (Management, Commercial, Dispatch), Azioni AI da approvare,
 * Automazioni, Knowledge base, COSTI PRONTO AI, Impostazioni (kill switch, budget,
 * limiti, agenti, provider), Sicurezza e registro.
 * Ogni numero arriva dal database tramite funzioni con controllo dei permessi:
 * nessun dato dimostrativo. Le chiavi del provider non sono mai visibili qui.
 */
import { h, fill, notice, boot, db, fn, euro, dateTime, field, table, badge } from './core.js';
import { opsBar, modal, actBtn, options, flashIn, toLocalInput, fromLocalInput } from './ops-common.js';
import { aiChatPanel } from './ai-chat-panel.js';

const root = document.getElementById('app');
let me; let restartFn; let ov = null;
const TABS = [
  ['assistente', 'Assistente', () => true], ['azioni', 'Azioni AI da approvare', () => true], ['costi', 'Costi PRONTO AI', (p) => p.manage],
  ['automazioni', 'Automazioni', (p) => p.manage], ['conoscenza', 'Knowledge base', (p) => p.manage], ['impostazioni', 'Impostazioni', (p) => p.manage], ['sicurezza', 'Sicurezza', (p) => p.manage]
];
const ACTION_LABELS = { assign_technician: 'Assegnazione tecnico', confirm_appointment: 'Programmazione appuntamento', publish_approved_quote: 'Invio preventivo approvato', send_approved_notification: 'Comunicazione di servizio' };
const STATUS = { pending: ['In attesa', 'warn'], approved: ['Approvata', 'ok'], rejected: ['Rifiutata', 'neutral'], expired: ['Scaduta', 'neutral'], stale: ['Dati cambiati', 'warn'],
  executed: ['Eseguita', 'ok'], failed: ['Non riuscita', 'error'], queued: ['In coda', 'info'], running: ['In esecuzione', 'info'], succeeded: ['Completata', 'ok'], skipped: ['Saltata', 'neutral'],
  draft: ['Bozza', 'warn'], superseded: ['Sostituito', 'neutral'], revoked: ['Revocato', 'error'] };
const st = (s) => badge(...(STATUS[s] || [s, 'neutral']));
const AGENT_NAMES = { customer: 'Clienti (sito)', dispatch: 'Dispatch', technical: 'Tecnico', commercial: 'Commerciale', management: 'Management' };
const microToEuro = (cents) => (cents === null || cents === undefined ? '—' : new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2 }).format(cents / 100));

function currentTab() { const t = location.hash.slice(1); return TABS.some(([id, , ok]) => id === t && ok(ov.permissions)) ? t : 'assistente'; }

async function render() {
  ov = await fn('ai-status').then(async (r) => (r.ok ? r.json() : null)).catch(() => null) || await db.rpc('ai_admin_overview').catch(() => null);
  if (!ov) { fill(root, opsBar(me, restartFn), notice('error', 'PRONTO AI: impossibile leggere lo stato.')); return; }
  const tab = currentTab();
  const s = ov.settings;
  const statusLine = h('div', { class: 'pai-status' },
    h('b', {}, h('span', { class: `pai-dot pai-dot--${s?.enabled ? 'on' : 'off'}`, 'aria-hidden': 'true' }),
      s ? (s.enabled ? 'PRONTO AI attivo' : 'PRONTO AI disattivato (interruttore globale)') : 'Stato PRONTO AI'),
    ov.provider ? h('span', {}, ov.provider.configured ? `Provider: ${ov.provider.name} · modello ${ov.provider.model}` : 'Provider AI non configurato (variabili d’ambiente)') : null,
    h('span', {}, `${ov.pendingActions} azioni da approvare`));
  const nav = h('nav', { class: 'pai-tabs', 'aria-label': 'Sezioni PRONTO AI' },
    TABS.filter(([, , ok]) => ok(ov.permissions)).map(([id, label]) => h('a', { href: `#${id}`, 'aria-current': id === tab ? 'page' : null },
      label, id === 'azioni' && ov.pendingActions ? h('span', { class: 'pai-count' }, String(ov.pendingActions)) : null)));
  const body = h('div', { class: 'pai-body' }, h('p', { class: 'app-muted' }, 'Caricamento…'));
  fill(root, h('div', { class: 'ops-page pai' }, opsBar(me, restartFn),
    h('div', { class: 'pai-hero' }, h('div', {}, h('p', { class: 'eyebrow' }, 'Centrale intelligente'), h('h1', {}, 'PRONTO AI'),
      h('p', { class: 'pai-hero__lead' }, 'Agenti AI che leggono i dati autorizzati e preparano proposte. Le decisioni economiche, contrattuali e operative restano a Giovanni e agli operatori autorizzati.')),
    statusLine), nav, body));
  try { await VIEWS[tab](body); } catch (e) { fill(body, notice('error', e.message)); }
}

/* ================================================================ ASSISTENTE */
const VIEWS = {};
VIEWS.assistente = async (body) => {
  const p = ov.permissions;
  const agents = [p.management && ['management', 'Management'], p.commercial && ['commercial', 'Commerciale'], p.dispatch && ['dispatch', 'Dispatch']].filter(Boolean);
  if (!agents.length) { fill(body, notice('info', 'Nessun assistente disponibile per il tuo profilo.')); return; }
  const agentState = ov.agents || [];
  const holder = h('div');
  const SUG = {
    management: ['Quante richieste sono arrivate oggi?', 'Quali richieste non sono ancora assegnate?', 'Quali categorie sono più richieste questo mese?', 'Quali contratti scadono nei prossimi 30 giorni?',
      'Quali piani PRONTO+ vengono acquistati di più?', 'Quali interventi hanno generato più costi?', 'Quali pagamenti risultano ancora da incassare?', 'Quali clienti business hanno chiesto un preventivo?',
      'Quali attività attendono la mia approvazione?'],
    commercial: ['Confronta Family Essential e Plus', 'Contratti in scadenza nei prossimi 60 giorni', 'Bozza di preventivo per un hotel con 2 ore di manodopera', 'Richieste di preventivo Business aperte'],
    dispatch: ['Cosa c’è da assegnare?', 'Richieste urgenti da guardare per prime', 'Raggruppa le richieste per zona', 'Proponi un tecnico per la richiesta più vecchia']
  };
  const show = (id) => {
    const a = agentState.find((x) => x.id === id);
    fill(holder, a && !a.enabled ? notice('warn', 'Questo agente è disattivato nelle impostazioni: le domande verranno rifiutate dal server.') : null,
      aiChatPanel({ agent: id, suggestions: SUG[id], intro: id === 'management'
        ? 'Risponde solo con le query autorizzate e indica periodo, fonti, dati mancanti e aggiornamento. Distingue dati certi, previsioni e suggerimenti.'
        : id === 'commercial' ? 'Prezzi solo da listini e tariffe approvati, calcolati dal database. Ogni preventivo va approvato prima dell’invio.'
          : 'Suggerisce tecnici e fasce dai dati reali del calendario. Le assegnazioni restano proposte da approvare.' }));
  };
  const sel = h('div', { class: 'pai-seg', role: 'tablist' }, agents.map(([id, label], i) => h('button', { type: 'button', role: 'tab', 'aria-selected': i === 0 ? 'true' : 'false',
    onclick: (e) => { sel.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', 'false')); e.currentTarget.setAttribute('aria-selected', 'true'); show(id); } }, label)));
  fill(body, h('div', { class: 'pai-grid' }, h('div', { class: 'app-card pai-chatcard' }, sel, holder),
    h('aside', { class: 'app-card pai-side' }, h('h2', {}, 'Come lavora'), h('ul', { class: 'pai-rules' },
      h('li', {}, 'Legge solo dati autorizzati per il tuo ruolo, con le stesse regole del database.'),
      h('li', {}, 'Non esegue SQL, non modifica prezzi, pagamenti, contratti o permessi.'),
      h('li', {}, 'Le azioni (assegnazioni, appuntamenti, invii) diventano proposte con scadenza da approvare.'),
      h('li', {}, 'Importi e margini sono calcolati dal backend, non dal testo dell’AI.')),
    h('a', { class: 'btn btn--ghost btn--sm', href: '#azioni' }, 'Vai alle azioni da approvare'))));
  show(agents[0][0]);
};

/* ================================================================ AZIONI DA APPROVARE */
VIEWS.azioni = async (body) => {
  const items = await db.rpc('ai_pending_actions');
  const status = h('div');
  const pending = items.filter((a) => a.status === 'pending');
  const card = (a) => {
    const p = a.payload || {};
    const left = Math.max(0, Math.round((new Date(a.expiresAt) - Date.now()) / 60000));
    return h('article', { class: `pai-action pai-action--${a.status}` },
      h('header', {}, h('div', {}, h('small', {}, a.number), h('h3', {}, ACTION_LABELS[a.action] || a.action)), st(a.status)),
      h('dl', { class: 'pai-dl' },
        h('dt', {}, 'Oggetto'), h('dd', {}, a.targetNumber || a.targetId),
        h('dt', {}, 'Proposta da'), h('dd', {}, `${AGENT_NAMES[a.agent] || 'Automazione'}${a.requestedBy ? ` per ${a.requestedBy}` : ''} · ${dateTime(a.createdAt)}`),
        p.technician ? [h('dt', {}, 'Tecnico'), h('dd', {}, p.technician)] : null,
        p.startsAt ? [h('dt', {}, 'Fascia'), h('dd', {}, `${dateTime(p.startsAt)} – ${dateTime(p.endsAt)}`)] : null,
        h('dt', {}, 'Motivazione'), h('dd', {}, a.rationale),
        h('dt', {}, 'Dati usati'), h('dd', {}, (a.dataUsed || []).join(', ') || '—'),
        h('dt', {}, 'Dati mancanti'), h('dd', {}, (a.missing || []).join(', ') || 'nessuno segnalato'),
        h('dt', {}, 'Effetto previsto'), h('dd', {}, a.expectedEffect),
        a.status === 'pending' ? [h('dt', {}, 'Scadenza'), h('dd', {}, `${dateTime(a.expiresAt)} (tra ${left} min)`)] : null,
        a.decisionNote ? [h('dt', {}, 'Esito'), h('dd', {}, a.decisionNote)] : null,
        a.result?.error ? [h('dt', {}, 'Errore'), h('dd', {}, a.result.error)] : null),
      a.status === 'pending' && a.canDecide ? h('div', { class: 'pai-action__btns' },
        actBtn('Approva', () => decide(a, 'approve'), { cls: 'btn btn--primary btn--sm', status }),
        ['assign_technician', 'confirm_appointment'].includes(a.action) ? actBtn('Modifica orario e approva', () => editAndApprove(a), { cls: 'btn btn--ghost btn--sm', status }) : null,
        actBtn('Rifiuta', () => decide(a, 'reject'), { cls: 'btn btn--ghost btn--sm', status })) : null,
      a.status === 'pending' && !a.canDecide ? h('p', { class: 'app-muted' }, 'Non hai il permesso per decidere questa azione.') : null);
  };
  fill(body, status,
    h('div', { class: 'pai-note' }, 'Ogni approvazione vale solo per la proposta indicata e prima della scadenza. Il sistema ricontrolla permessi e dati: se qualcosa è cambiato chiede una nuova proposta.'),
    h('h2', { class: 'pai-h2' }, `In attesa (${pending.length})`),
    pending.length ? h('div', { class: 'pai-actions' }, pending.map(card)) : h('p', { class: 'app-muted' }, 'Nessuna azione in attesa.'),
    h('h2', { class: 'pai-h2' }, 'Storico (30 giorni)'),
    h('div', { class: 'pai-actions' }, items.filter((a) => a.status !== 'pending').map(card)));
  async function decide(a, decision, changes = null) {
    let note = null;
    if (decision === 'reject') { note = prompt('Motivo del rifiuto (facoltativo)') ?? null; }
    else if (!confirm(`Approvare "${ACTION_LABELS[a.action]}" ${a.targetNumber || ''}? L’azione verrà eseguita ora dal sistema con i controlli della centrale.`)) return;
    const r = await db.rpc('ai_decide_action', { p_id: a.id, p_decision: decision, p_note: note, p_changes: changes });
    const msg = { executed: 'Azione eseguita.', rejected: 'Proposta rifiutata.', stale: 'I dati sono cambiati dopo la proposta: nessuna azione eseguita. Chiedi una nuova proposta.',
      expired: 'Proposta scaduta: nessuna azione eseguita.', failed: `Esecuzione non riuscita: ${r.error || ''}` }[r.status] || `Stato: ${r.status}`;
    await render();
    flashIn(root.querySelector('.pai-body'), msg, ['executed', 'rejected'].includes(r.status) ? 'ok' : 'warn');
  }
  function editAndApprove(a) {
    const s = h('input', { type: 'datetime-local', value: toLocalInput(a.payload.startsAt) });
    const e = h('input', { type: 'datetime-local', value: toLocalInput(a.payload.endsAt) });
    const dlg = modal('Modifica orario e approva', field('Inizio', s), field('Fine', e),
      h('p', { class: 'app-muted' }, 'Puoi modificare solo l’orario: per un altro tecnico serve una nuova proposta.'),
      actBtn('Approva con modifiche', async () => { dlg.close(); await decide(a, 'approve', { startsAt: fromLocalInput(s.value), endsAt: fromLocalInput(e.value) }); }, { cls: 'btn btn--primary' }));
  }
};

/* ================================================================ COSTI PRONTO AI */
VIEWS.costi = async (body) => {
  const monthInput = h('input', { type: 'month', value: new Date().toISOString().slice(0, 7), 'aria-label': 'Mese' });
  const out = h('div');
  const load = async () => {
    const c = await db.rpc('ai_cost_summary', { p_month: `${monthInput.value}-01` });
    const spent = Math.max(Number(c.estimatedCostCents) || 0, c.actualCostCents || 0);
    const pct = c.budgetCents ? Math.min(100, Math.round((spent * 100) / c.budgetCents)) : 0;
    const t = c.thresholds;
    const kpi = (label, value, hint, tone = 'base') => h('div', { class: `ops-kpi ops-kpi--${tone} pai-kpi` }, h('span', { class: 'ops-kpi__label' }, label), h('strong', {}, value), h('small', {}, hint));
    fill(out,
      !c.pricesConfigured ? notice('warn', 'Tariffe del provider non inserite: il costo stimato non è calcolabile. Inseriscile in Impostazioni dalle condizioni attuali del provider.') : null,
      h('div', { class: 'pai-budget' },
        h('div', { class: 'pai-budget__head' }, h('b', {}, `Budget mensile ${euro(c.budgetCents)}`), h('span', {}, `Speso (stima o effettivo, il maggiore): ${microToEuro(spent)} · residuo ${microToEuro(c.remainingCents)}`)),
        h('div', { class: 'pai-meter', role: 'meter', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(pct), 'aria-label': 'Budget utilizzato' },
          h('span', { class: `pai-meter__fill${pct >= t.hardStopPct ? ' is-stop' : pct >= t.warnPct ? ' is-warn' : ''}`, style: `width:${pct}%` }),
          [t.warnPct, t.nonessentialStopPct].map((x) => h('i', { style: `left:${x}%`, title: `${x}%` }))),
        h('p', { class: 'app-muted' }, `Avviso al ${t.warnPct}% · stop agenti non essenziali al ${t.nonessentialStopPct}% · stop totale al ${t.hardStopPct}%. ${c.note}`)),
      h('div', { class: 'ops-kpis' },
        kpi('Richieste nel mese', String(c.requestsMonth), 'risposte completate'), kpi('Token in ingresso', c.inputTokens.toLocaleString('it-IT'), 'riportati dal provider'),
        kpi('Token in uscita', c.outputTokens.toLocaleString('it-IT'), 'riportati dal provider'), kpi('Costo stimato', microToEuro(c.estimatedCostCents), 'dalle tariffe inserite', 'info'),
        kpi('Costo effettivo', c.actualCostCents == null ? 'non registrato' : euro(c.actualCostCents), 'da fattura o console del provider', 'info'),
        kpi('Errori', String(c.errors), 'errori, timeout, output non valido', c.errors ? 'warn' : 'base'), kpi('Richieste bloccate', String(c.blocked), 'kill switch, budget, limiti, ruolo', c.blocked ? 'warn' : 'base')),
      h('div', { class: 'pai-grid pai-grid--2' },
        h('section', { class: 'app-card' }, h('h2', {}, 'Per agente'), table([{ label: 'Agente', render: (r) => AGENT_NAMES[r.agent] || r.agent }, { label: 'Richieste', key: 'requests' },
          { label: 'Costo stimato', render: (r) => microToEuro(r.estimatedCostCents) }], c.byAgent)),
        h('section', { class: 'app-card' }, h('h2', {}, 'Per categoria'), table([{ label: 'Categoria', render: (r) => (r.category === 'chat' ? 'Conversazioni' : 'Automazioni') },
          { label: 'Richieste', key: 'requests' }, { label: 'Costo stimato', render: (r) => microToEuro(r.estimatedCostCents) }], c.byCategory))),
      h('section', { class: 'app-card' }, h('h2', {}, 'Andamento giornaliero'), table([{ label: 'Giorno', key: 'day' }, { label: 'Richieste', key: 'requests' }, { label: 'Errori', key: 'errors' },
        { label: 'Bloccate', key: 'blocked' }], c.daily, { empty: 'Nessuna richiesta nel mese.' })),
      actualCostForm(c.month, load));
  };
  monthInput.addEventListener('change', () => load().catch((e) => fill(out, notice('error', e.message))));
  fill(body, h('div', { class: 'ops-head' }, h('h2', {}, 'COSTI PRONTO AI'), h('label', { class: 'ops-period' }, 'Mese ', monthInput)), out);
  await load();
};

function actualCostForm(month, reload) {
  const provider = h('input', { type: 'text', value: ov.provider?.name || '', maxlength: '40', required: true });
  const amount = h('input', { type: 'text', inputmode: 'decimal', placeholder: 'es. 12,40' });
  const source = h('input', { type: 'text', placeholder: 'Fattura n. … / console del provider', maxlength: '120' });
  const status = h('div');
  return h('section', { class: 'app-card' }, h('h2', {}, 'Registra il costo effettivo del mese'),
    h('p', { class: 'app-muted' }, 'Il costo effettivo si legge dalla fattura o dalla console del provider: non viene stimato.'),
    h('div', { class: 'pai-form' }, field('Provider', provider), field('Importo (€)', amount), field('Fonte', source)),
    actBtn('Salva costo effettivo', async () => {
      const cents = Math.round(Number(String(amount.value).replace(/\./g, '').replace(',', '.')) * 100);
      if (!Number.isFinite(cents) || cents < 0) throw new Error('Importo non valido');
      await db.rpc('ai_record_actual_cost', { p_month: month, p_provider: provider.value.trim(), p_cents: cents, p_source: source.value.trim() || 'manuale', p_note: null });
      await reload();
    }, { cls: 'btn btn--primary btn--sm', status }), status);
}

/* ================================================================ AUTOMAZIONI */
VIEWS.automazioni = async (body) => {
  const [rules, jobs] = await Promise.all([db.select('ai_automation_rules?select=*&order=id'), db.select('ai_automation_jobs?select=*&order=created_at.desc&limit=40')]);
  const status = h('div');
  const FREQ = [['hourly', 'Ogni ora'], ['daily', 'Ogni giorno'], ['weekly', 'Ogni settimana'], ['monthly', 'Ogni mese']];
  fill(body, status,
    h('div', { class: 'pai-note' }, 'Le automazioni sono deterministiche (nessun modello AI), idempotenti per periodo e inviano solo report interni agli amministratori. Nessuna comunicazione commerciale automatica.'),
    h('div', { class: 'pai-rules-list' }, rules.map((r) => {
      const freq = h('select', { 'aria-label': `Frequenza ${r.name}` }, options(FREQ, r.frequency));
      const hour = h('input', { type: 'number', min: '0', max: '23', value: String(r.run_hour), 'aria-label': `Ora ${r.name}` });
      return h('article', { class: 'pai-rule' },
        h('div', {}, h('h3', {}, r.name), h('p', { class: 'app-muted' }, r.description),
          h('small', { class: 'app-muted' }, `Ultima esecuzione: ${dateTime(r.last_run_at)} · prossima: ${r.enabled ? dateTime(r.next_run_at) : '—'}`)),
        h('div', { class: 'pai-rule__ctl' }, r.enabled ? badge('Attiva', 'ok') : badge('Sospesa', 'neutral'), freq, hour,
          actBtn(r.enabled ? 'Sospendi' : 'Attiva', async () => { await db.rpc('ai_set_automation', { p_rule: r.id, p_enabled: !r.enabled, p_frequency: freq.value, p_run_hour: Number(hour.value), p_config: null }); await render(); }, { status }),
          actBtn('Salva frequenza', async () => { await db.rpc('ai_set_automation', { p_rule: r.id, p_enabled: r.enabled, p_frequency: freq.value, p_run_hour: Number(hour.value), p_config: null }); await render(); }, { status }),
          actBtn('Esegui ora', async () => { const x = await db.rpc('ai_run_automation_now', { p_rule: r.id }); flashIn(body, x.duplicate ? 'Già eseguita in questo minuto.' : `Esito: ${x.outcome}`, x.outcome === 'succeeded' ? 'ok' : 'warn'); await VIEWS.automazioni(body); }, { status })));
    })),
    h('section', { class: 'app-card' }, h('h2', {}, 'Esecuzioni recenti'),
      table([{ label: 'Automazione', key: 'rule_id' }, { label: 'Periodo', key: 'run_key' }, { label: 'Stato', render: (j) => st(j.status) }, { label: 'Tentativi', key: 'attempts' },
        { label: 'Fine', render: (j) => dateTime(j.finished_at) }, { label: 'Risultato', render: (j) => (j.error ? `Errore: ${j.error}` : j.result ? JSON.stringify(j.result).slice(0, 160) : '—') }], jobs,
      { empty: 'Nessuna esecuzione registrata.' })));
};

/* ================================================================ KNOWLEDGE BASE */
VIEWS.conoscenza = async (body) => {
  const docs = await db.select('ai_knowledge_documents?select=id,title,scope,source_kind,version,status,created_at,approved_at,revoked_reason,license_note,supersedes_id&order=created_at.desc');
  const status = h('div');
  const SCOPES = [['public', 'Pubblico (clienti e sito)'], ['technical', 'Tecnico (tecnici e staff)'], ['internal', 'Interno (solo staff)']];
  const KINDS = [['faq', 'FAQ'], ['terms', 'Condizioni'], ['price_list', 'Listino'], ['procedure', 'Procedura'], ['manual', 'Manuale'], ['catalog', 'Catalogo'], ['portal_doc', 'Documento del portale']];
  const editor = (doc = null) => {
    const title = h('input', { type: 'text', value: doc?.title || '', maxlength: '200' });
    const scope = h('select', {}, options(SCOPES, doc?.scope || 'public'));
    const kind = h('select', {}, options(KINDS, doc?.source_kind || 'faq'));
    const content = h('textarea', { rows: 12, maxlength: '200000' }, doc?.content || '');
    const lic = h('input', { type: 'text', value: doc?.license_note || '', placeholder: 'Fonte e diritti d’uso del documento' });
    const dlg = modal(doc ? `Nuova versione: ${doc.title}` : 'Nuovo documento',
      h('p', { class: 'app-muted' }, 'Carica solo documenti aziendali autorizzati. Mai conversazioni private o documenti dei clienti. Il documento è usato dall’AI solo dopo l’approvazione.'),
      field('Titolo', title), h('div', { class: 'pai-form' }, field('Ambito', scope), field('Tipo', kind)), field('Contenuto (testo)', content), field('Fonte / licenza', lic),
      actBtn('Salva bozza', async () => { await db.rpc('ai_kb_save_document', { p_id: doc?.id || null, p_title: title.value, p_scope: scope.value, p_source_kind: kind.value, p_content: content.value, p_license_note: lic.value || null }); dlg.close(); await VIEWS.conoscenza(body); }, { cls: 'btn btn--primary' }));
  };
  fill(body, status, h('div', { class: 'ops-head' }, h('h2', {}, 'Knowledge base aziendale'), h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: () => editor() }, 'Nuovo documento')),
    h('div', { class: 'pai-note' }, 'Ricerca testuale nei documenti approvati, separata per ambito: i clienti vedono solo i documenti pubblici, i tecnici anche quelli tecnici. Ogni aggiornamento crea una nuova versione; la revoca è immediata.'),
    table([{ label: 'Titolo', key: 'title' }, { label: 'Ambito', render: (d) => SCOPES.find((x) => x[0] === d.scope)?.[1] }, { label: 'Tipo', render: (d) => KINDS.find((x) => x[0] === d.source_kind)?.[1] },
      { label: 'Versione', key: 'version' }, { label: 'Stato', render: (d) => badge(...({ approved: ['Approvato', 'ok'], draft: ['Bozza', 'warn'], superseded: ['Sostituito', 'neutral'], revoked: ['Revocato', 'error'] }[d.status] || [d.status, 'neutral'])) }, { label: 'Approvato', render: (d) => dateTime(d.approved_at) },
      { label: 'Azioni', render: (d) => h('div', { class: 'pai-inline' },
        d.status === 'draft' ? actBtn('Approva', async () => { await db.rpc('ai_kb_approve', { p_id: d.id }); await VIEWS.conoscenza(body); }, { status }) : null,
        d.status === 'approved' ? actBtn('Nuova versione', async () => { const [full] = await db.select(`ai_knowledge_documents?id=eq.${d.id}&select=*`); editor(full); }, { status }) : null,
        ['approved', 'draft'].includes(d.status) ? actBtn('Revoca', async () => { const why = prompt('Motivo della revoca'); if (!why) return; await db.rpc('ai_kb_revoke', { p_id: d.id, p_reason: why }); await VIEWS.conoscenza(body); }, { status }) : null) }],
    docs, { empty: 'Nessun documento caricato: gli assistenti usano solo il catalogo servizi e i listini pubblicati.' }));
};

/* ================================================================ IMPOSTAZIONI */
VIEWS.impostazioni = async (body) => {
  const s = ov.settings;
  const status = h('div');
  const num = (v, attrs = {}) => h('input', { type: 'number', value: v ?? '', ...attrs });
  const f = {
    monthlyBudgetCents: num(s.monthly_budget_cents / 100, { min: '0', step: '1' }), warnPct: num(s.warn_pct, { min: '1', max: '100' }), nonessentialStopPct: num(s.nonessential_stop_pct, { min: '1', max: '100' }),
    hardStopPct: num(s.hard_stop_pct, { min: '1', max: '200' }), maxModelCalls: num(s.max_model_calls, { min: '1', max: '12' }), maxToolCalls: num(s.max_tool_calls, { min: '0', max: '20' }),
    timeoutMs: num(s.timeout_ms, { min: '3000', max: '60000', step: '1000' }), maxOutputTokens: num(s.max_output_tokens, { min: '100', max: '4000' }),
    userHourlyLimit: num(s.user_hourly_limit, { min: '1' }), anonHourlyLimit: num(s.anon_hourly_limit, { min: '1' }), anonDailyLimit: num(s.anon_daily_limit, { min: '1' }),
    priceInputPerMtokMicros: num(s.price_input_per_mtok_micros == null ? '' : s.price_input_per_mtok_micros / 1e6, { min: '0', step: '0.0001' }),
    priceOutputPerMtokMicros: num(s.price_output_per_mtok_micros == null ? '' : s.price_output_per_mtok_micros / 1e6, { min: '0', step: '0.0001' }),
    retentionDays: num(s.retention_days, { min: '1', max: '730' })
  };
  const dpa = h('input', { type: 'checkbox', checked: s.provider_dpa_confirmed });
  const privacyV = h('input', { type: 'text', value: s.privacy_notice_version || '', placeholder: 'es. 2026-12' });
  const save = async (extra = {}) => {
    const p = { ...Object.fromEntries(Object.entries(f).map(([k, el]) => [k, el.value === '' ? null : Number(el.value)])), providerDpaConfirmed: dpa.checked, privacyNoticeVersion: privacyV.value, ...extra };
    p.monthlyBudgetCents = Math.round(p.monthlyBudgetCents * 100);
    p.priceInputPerMtokMicros = p.priceInputPerMtokMicros == null ? null : Math.round(p.priceInputPerMtokMicros * 1e6);
    p.priceOutputPerMtokMicros = p.priceOutputPerMtokMicros == null ? null : Math.round(p.priceOutputPerMtokMicros * 1e6);
    await db.rpc('ai_update_settings', { p });
    await render();
  };
  const prov = ov.provider || {};
  fill(body, status,
    h('section', { class: `app-card pai-kill ${s.enabled ? 'is-on' : 'is-off'}` },
      h('div', {}, h('h2', {}, 'Interruttore globale'), h('p', {}, s.enabled ? 'PRONTO AI è attivo. Disattivandolo, tutte le richieste ai provider si fermano immediatamente.' : 'PRONTO AI è disattivato: nessuna chiamata ai provider AI.'),
        !s.provider_dpa_confirmed || s.price_input_per_mtok_micros == null ? h('p', { class: 'app-muted' }, 'Per attivarlo servono le tariffe reali del provider e la conferma del DPA (accordo sul trattamento dei dati).') : null),
      actBtn(s.enabled ? 'Disattiva PRONTO AI' : 'Attiva PRONTO AI', () => save({ enabled: !s.enabled }), { cls: `btn ${s.enabled ? 'btn--ghost' : 'btn--primary'}`, status })),
    h('section', { class: 'app-card' }, h('h2', {}, 'Provider AI (variabili d’ambiente del server)'),
      h('dl', { class: 'pai-dl' }, h('dt', {}, 'Stato'), h('dd', {}, prov.configured ? 'Configurato' : 'Non configurato'), h('dt', {}, 'Provider'), h('dd', {}, prov.name || '—'),
        h('dt', {}, 'Modello'), h('dd', {}, prov.model || '—'), h('dt', {}, 'Chiave API'), h('dd', {}, prov.configured ? 'Presente (mai mostrata)' : 'Assente'),
        h('dt', {}, 'Sale per le impronte'), h('dd', {}, prov.hashSaltConfigured ? 'Configurato' : 'Non configurato (AI_HASH_SALT)')),
      h('p', { class: 'app-muted' }, 'Provider, modello e chiave si impostano solo nelle variabili d’ambiente di Netlify (AI_PROVIDER, AI_MODEL, AI_API_KEY). Verifica sul sito del provider i modelli attuali e le tariffe prima di inserirle qui.')),
    h('section', { class: 'app-card' }, h('h2', {}, 'Budget, limiti e conservazione'),
      h('div', { class: 'pai-form' }, field('Budget mensile (€)', f.monthlyBudgetCents), field('Soglia di avviso (%)', f.warnPct), field('Stop non essenziali (%)', f.nonessentialStopPct), field('Stop totale (%)', f.hardStopPct),
        field('Chiamate al modello per messaggio', f.maxModelCalls), field('Strumenti per messaggio', f.maxToolCalls), field('Tempo massimo (ms)', f.timeoutMs), field('Token di risposta massimi', f.maxOutputTokens),
        field('Messaggi/ora per utente', f.userHourlyLimit), field('Messaggi/ora per visitatore', f.anonHourlyLimit), field('Messaggi/giorno per indirizzo', f.anonDailyLimit),
        field('Tariffa ingresso (€ per milione di token)', f.priceInputPerMtokMicros, 'Dalle condizioni attuali del provider'), field('Tariffa uscita (€ per milione di token)', f.priceOutputPerMtokMicros, 'Dalle condizioni attuali del provider'),
        field('Conservazione conversazioni (giorni)', f.retentionDays), field('Versione informativa privacy', privacyV)),
      h('label', { class: 'pai-check' }, dpa, ' DPA con il provider firmato/accettato e verificato (trasferimenti extra UE inclusi)'),
      actBtn('Salva impostazioni', () => save(), { cls: 'btn btn--primary btn--sm', status })),
    h('section', { class: 'app-card' }, h('h2', {}, 'Agenti'),
      table([{ label: 'Agente', key: 'name' }, { label: 'Descrizione', key: 'description' }, { label: 'Essenziale', render: (a) => (a.essential ? 'Sì' : 'No') },
        { label: 'Ruoli', render: (a) => a.allowedRoles.join(', ') }, { label: 'Stato', render: (a) => (a.enabled ? badge('Attivo', 'ok') : badge('Disattivato', 'neutral')) },
        { label: '', render: (a) => actBtn(a.enabled ? 'Disattiva' : 'Attiva', async () => { await db.rpc('ai_set_agent', { p_agent: a.id, p_enabled: !a.enabled, p_max_output_tokens: a.maxOutputTokens, p_hourly_limit: a.hourlyLimit }); await render(); }, { status }) }],
      ov.agents)));
};

/* ================================================================ SICUREZZA */
VIEWS.sicurezza = async (body) => {
  const [events, tools] = await Promise.all([db.select('ai_security_events?select=*&order=created_at.desc&limit=60'), db.select('ai_tool_executions?select=*&order=created_at.desc&limit=60')]);
  const KIND = { prompt_injection_suspected: 'Possibile prompt injection', tool_denied: 'Strumento negato', tool_invalid_args: 'Argomenti non validi', tool_limit: 'Limite raggiunto', rate_limited: 'Limite di frequenza',
    budget_block: 'Blocco budget', disabled_block: 'AI disattivata', role_block: 'Ruolo non autorizzato', output_invalid: 'Output trattenuto', confirm_mismatch: 'Conferma su bozza cambiata', kill_switch: 'Kill switch', stale_approval: 'Approvazione su dati cambiati' };
  fill(body,
    h('div', { class: 'pai-note' }, 'Registro senza dati personali superflui: impronte al posto di IP e token, argomenti degli strumenti senza recapiti.'),
    h('section', { class: 'app-card' }, h('h2', {}, 'Eventi di sicurezza'), table([{ label: 'Quando', render: (e) => dateTime(e.created_at) }, { label: 'Evento', render: (e) => KIND[e.kind] || e.kind },
      { label: 'Gravità', render: (e) => badge(e.severity, e.severity === 'critical' ? 'error' : e.severity === 'warning' ? 'warn' : 'neutral') }, { label: 'Agente', render: (e) => AGENT_NAMES[e.agent_id] || '—' },
      { label: 'Dettaglio', render: (e) => JSON.stringify(e.detail).slice(0, 140) }], events, { empty: 'Nessun evento.' })),
    h('section', { class: 'app-card' }, h('h2', {}, 'Chiamate agli strumenti'), table([{ label: 'Quando', render: (t) => dateTime(t.created_at) }, { label: 'Agente', render: (t) => AGENT_NAMES[t.agent_id] || t.agent_id },
      { label: 'Strumento', key: 'tool' }, { label: 'Tipo', key: 'kind' }, { label: 'Esito', render: (t) => badge(t.status, t.status === 'ok' ? 'ok' : t.status === 'error' ? 'error' : 'warn') },
      { label: 'Durata', render: (t) => (t.duration_ms == null ? '—' : `${t.duration_ms} ms`) }, { label: 'Errore', render: (t) => t.error || '' }], tools, { empty: 'Nessuna chiamata registrata.' })));
};

if (root) {
  boot(root, {
    title: 'PRONTO AI',
    requireRole: ['admin', 'operator'],
    render: async (ctx) => {
      me = ctx.profile; restartFn = ctx.restart;
      window.addEventListener('hashchange', () => render().catch((e) => fill(root, notice('error', e.message))));
      await render();
    }
  });
}
