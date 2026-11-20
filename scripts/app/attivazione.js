/**
 * ATTIVAZIONE OPERATIVA (Prompt 9) — pagine riservate agli amministratori:
 *   /admin/configurazione-azienda/   dati aziendali pubblici (con verifica) e riservati
 *   /admin/setup/                    wizard di configurazione (11 voci)
 *   /admin/impostazioni/pagamenti/   stato myPOS, prova di connessione, prova completa
 *   /admin/funzionalita/             interruttori delle funzionalità (con controllo lato server)
 *   /admin/lancio/                   GO / NO-GO per livello A (sito pubblico) e B (piattaforma)
 * Regole: nessun segreto viene chiesto o mostrato (le chiavi si impostano nel pannello Netlify/Supabase/
 * myPOS); nessun esito è simulato: le verifiche automatiche sono eseguite e registrate dal server, le
 * verifiche manuali richiedono una nota su come sono state fatte. I permessi sono del database.
 */
import { h, fill, notice, badge, boot, db, fn, dateTime, field, table } from './core.js';
import { opsBar, actBtn } from './ops-common.js';

const root = document.getElementById('app');
const VIEW = root?.dataset.view;
let me; let restartFn;

const STATUS_TONE = { todo: 'neutral', configured: 'info', checking: 'warn', verified: 'ok', error: 'error' };
const STATUS_LABEL = { todo: 'Da configurare', configured: 'Configurato', checking: 'In verifica', verified: 'Verificato', error: 'Errore' };
const stBadge = (s) => badge(STATUS_LABEL[s] || s, STATUS_TONE[s] || 'neutral');
const page = (eyebrow, title, ...content) => fill(root, opsBar(me, restartFn), h('div', { class: 'ops-page' },
  h('div', { class: 'ops-head' }, h('div', {}, h('p', { class: 'eyebrow' }, eyebrow), h('h1', { class: 'section-title app-h1' }, title))), ...content));
async function callFn(name, opts) {
  const r = await fn(name, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok && r.status !== 502) throw new Error(data.message || `Operazione non riuscita (${r.status})`);
  return { ok: r.ok, status: r.status, data };
}

/* ================================================================ CONFIGURAZIONE AZIENDA */
const FIELDS = {
  tradeName: ['Nome commerciale', 'text'], legalName: ['Ragione sociale', 'text'], ownerName: ['Titolare', 'text'], vatNumber: ['Partita IVA', 'text'],
  pec: ['PEC', 'email'], registeredOffice: ['Sede legale', 'address'], operatingOffice: ['Sede operativa', 'address'], phone: ['Telefono', 'tel'],
  whatsapp: ['WhatsApp Business', 'tel'], email: ['Email', 'email'], logoPath: ['Logo', 'image:logo'], ownerPhotoPath: ['Foto del titolare', 'image:titolare'],
  description: ['Descrizione aziendale', 'textarea'], serviceZonesNote: ['Zone servite (nota pubblica)', 'textarea'], hours: ['Orari di disponibilità', 'text'],
  serviceAvailability: ['Disponibilità dei servizi', 'textarea'], qualifications: ['Abilitazioni verificate (una per riga: titolo | ente)', 'qualifications'],
  insurancePublic: ['Copertura assicurativa (testo pubblico)', 'textarea'], social: ['Profili social (indirizzi https)', 'social']
};
const SOCIAL = ['facebook', 'instagram', 'linkedin', 'youtube', 'tiktok', 'google'];
const ADDR = [['street', 'Via e numero'], ['postalCode', 'CAP'], ['city', 'Comune'], ['province', 'Provincia']];

function editorFor(key, value) {
  const [, type] = FIELDS[key];
  if (type === 'address') {
    const inputs = Object.fromEntries(ADDR.map(([k]) => [k, h('input', { type: 'text', value: value?.[k] || '', 'aria-label': `${FIELDS[key][0]}: ${k}` })]));
    return { el: h('div', { class: 'ops-form__row' }, ADDR.map(([k, l]) => field(l, inputs[k]))), get: () => Object.fromEntries(ADDR.map(([k]) => [k, inputs[k].value.trim()])) };
  }
  if (type === 'qualifications') {
    const ta = h('textarea', { rows: 3, 'aria-label': FIELDS[key][0] }, (value || []).map((q) => [q.title, q.issuer].filter(Boolean).join(' | ')).join('\n'));
    return { el: ta, get: () => ta.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [title, issuer] = l.split('|').map((x) => x.trim()); return { title, issuer: issuer || null }; }) };
  }
  if (type === 'social') {
    const inputs = Object.fromEntries(SOCIAL.map((k) => [k, h('input', { type: 'url', value: value?.[k] || '', placeholder: 'https://…', 'aria-label': k })]));
    return { el: h('div', { class: 'ops-form__row' }, SOCIAL.map((k) => field(k, inputs[k]))), get: () => Object.fromEntries(SOCIAL.filter((k) => inputs[k].value.trim()).map((k) => [k, inputs[k].value.trim()])) };
  }
  if (type.startsWith('image:')) {
    const folder = type.split(':')[1];
    const file = h('input', { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/svg+xml', 'aria-label': FIELDS[key][0] });
    return { el: h('div', {}, value ? h('p', { class: 'app-muted' }, `File attuale: ${value}`) : null, file), get: async () => {
      const f = file.files?.[0];
      if (!f) return value || '';
      if (f.size > 3 * 1024 * 1024) throw new Error('Immagine troppo grande (massimo 3 MB)');
      const path = `${folder}/${Date.now()}-${f.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`;
      await db.upload('azienda-pubblico', path, f);
      return path;
    } };
  }
  const input = type === 'textarea' ? h('textarea', { rows: 3, 'aria-label': FIELDS[key][0] }, value || '') : h('input', { type, value: value || '', 'aria-label': FIELDS[key][0] });
  return { el: input, get: () => input.value.trim() };
}
const showValue = (key, v) => {
  if (v === null || v === undefined || v === '') return '—';
  const type = FIELDS[key][1];
  if (type === 'address') return ADDR.map(([k]) => v[k]).filter(Boolean).join(', ') || '—';
  if (type === 'qualifications') return (v || []).map((q) => [q.title, q.issuer].filter(Boolean).join(' — ')).join('; ') || '—';
  if (type === 'social') return Object.entries(v || {}).map(([k, u]) => `${k}: ${u}`).join(' · ') || '—';
  return String(v);
};

/** Valore vuoto (stringa, oggetto con campi vuoti, elenco vuoto) = null: si confrontano solo modifiche reali. */
const norm = (v) => {
  if (v === undefined || v === null || v === '') return null;
  if (Array.isArray(v)) return v.length ? v : null;
  if (typeof v === 'object') return Object.values(v).some((x) => x !== null && x !== '') ? v : null;
  return v;
};
async function configurazioneAzienda() {
  const status = h('div', { role: 'status', 'aria-live': 'polite' });
  const data = await db.rpc('company_profile_admin');
  const byField = Object.fromEntries(data.fields.map((f) => [f.field, f]));
  const editors = {};
  const rows = Object.keys(FIELDS).map((key) => {
    const f = byField[key] || {};
    const ed = editorFor(key, f.value);
    editors[key] = ed;
    const chk = h('input', { type: 'checkbox', value: key, 'aria-label': `Seleziona ${FIELDS[key][0]} per la verifica`, disabled: f.empty });
    return { key, chk, el: h('div', { class: `cfg-field${f.verified ? ' is-verified' : ''}` },
      h('div', { class: 'cfg-field__head' }, h('b', {}, FIELDS[key][0]), f.required ? badge('Obbligatorio', 'warn') : badge('Facoltativo', 'neutral'),
        f.empty ? badge('Vuoto', 'neutral') : f.verified ? badge(`Verificato · ${f.verified.source}`, 'ok') : badge('Non verificato: non pubblicato', 'error'), h('label', { class: 'chip-check' }, chk, h('span', {}, 'da verificare'))),
      h('p', { class: 'app-muted' }, `Valore attuale: ${showValue(key, f.value)}`), ed.el) };
  });
  const source = h('input', { type: 'text', placeholder: 'es. visura camerale del 10/11/2026', 'aria-label': 'Documento usato per la verifica' });
  const save = actBtn('Salva i dati', async () => {
    const patch = {};
    for (const key of Object.keys(FIELDS)) {
      const v = norm(await editors[key].get());
      const cur = norm(byField[key]?.value);
      if (JSON.stringify(v) !== JSON.stringify(cur)) patch[key] = v;
    }
    if (!Object.keys(patch).length) { fill(status, notice('info', 'Nessuna modifica da salvare.')); return; }
    await db.rpc('company_profile_update', { p: patch });
    await configurazioneAzienda();
    root.querySelector('[role=status]')?.append(notice('ok', `Salvato. I campi modificati (${Object.keys(patch).join(', ')}) tornano "non verificati" e non sono pubblicati finché non li verifichi.`));
  }, { cls: 'btn btn--primary', status });
  const verify = actBtn('Verifica i campi selezionati', async () => {
    const keys = rows.filter((r) => r.chk.checked).map((r) => r.key);
    if (!keys.length) throw new Error('Seleziona almeno un campo da verificare.');
    await db.rpc('company_profile_verify', { p_fields: keys, p_source: source.value });
    await configurazioneAzienda();
  }, { cls: 'btn btn--ghost', status });
  const rebuild = actBtn('Aggiorna il sito con i dati verificati', async () => {
    const r = await callFn('site-rebuild', { method: 'POST', body: {} });
    fill(status, notice(r.ok ? 'ok' : 'error', r.data.message || 'Richiesta inviata.'));
  }, { status });

  // dati riservati: mai pubblicati, mai nei documenti destinati ai clienti
  const pv = data.private || {};
  const priv = { taxCode: h('input', { type: 'text', value: pv.taxCode || '', 'aria-label': 'Codice fiscale' }), rea: h('input', { type: 'text', value: pv.rea || '', 'aria-label': 'REA' }),
    insCompany: h('input', { type: 'text', value: pv.insurance?.company || '', 'aria-label': 'Compagnia' }), insPolicy: h('input', { type: 'text', value: pv.insurance?.policy || '', 'aria-label': 'Numero polizza' }),
    insMax: h('input', { type: 'text', value: pv.insurance?.maximum || '', 'aria-label': 'Massimale' }), insExp: h('input', { type: 'date', value: pv.insurance?.expiresOn || '', 'aria-label': 'Scadenza polizza' }),
    notes: h('textarea', { rows: 2, 'aria-label': 'Note riservate' }, pv.notes || ''), doc: h('input', { type: 'file', accept: 'application/pdf,image/*', 'aria-label': 'Documento riservato' }),
    docTitle: h('input', { type: 'text', placeholder: 'es. Abilitazione DM 37/08 lettera A', 'aria-label': 'Descrizione del documento' }) };
  const docs = pv.qualificationDocuments || [];
  const savePriv = actBtn('Salva i dati riservati', async () => {
    const patch = { taxCode: priv.taxCode.value, rea: priv.rea.value, notes: priv.notes.value,
      insurance: { company: priv.insCompany.value.trim() || null, policy: priv.insPolicy.value.trim() || null, maximum: priv.insMax.value.trim() || null, expiresOn: priv.insExp.value || null } };
    const f = priv.doc.files?.[0];
    if (f) {
      if (!priv.docTitle.value.trim()) throw new Error('Descrivi il documento caricato.');
      if (f.size > 10 * 1024 * 1024) throw new Error('Documento troppo grande (massimo 10 MB)');
      const path = `documenti/${Date.now()}-${f.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-')}`;
      await db.upload('azienda-riservato', path, f);
      patch.qualificationDocuments = [...docs, { title: priv.docTitle.value.trim(), path, uploadedAt: new Date().toISOString() }];
    }
    await db.rpc('company_private_update', { p: patch });
    await configurazioneAzienda();
  }, { cls: 'btn btn--primary', status });

  page('Configurazione', 'Configurazione azienda',
    notice('info', 'Solo i campi verificati compaiono su sito, moduli, PDF, preventivi, documenti di intervento e dati strutturati. Ogni modifica annulla la verifica del campo. Non inserire dati non confermati dal titolare.'),
    data.missingRequired?.length ? notice('warn', `Obbligatori ancora da inserire o verificare: ${data.missingRequired.map((k) => FIELDS[k]?.[0] || k).join(', ')}`) : notice('ok', 'Tutti i campi obbligatori sono verificati.'),
    status,
    h('section', { class: 'app-card' }, h('h2', {}, 'Dati pubblici'), rows.map((r) => r.el),
      h('div', { class: 'ops-actions' }, save, field('Verificato su', source), verify, rebuild)),
    h('section', { class: 'app-card' }, h('h2', {}, 'Dati riservati (mai pubblicati)'),
      h('div', { class: 'ops-form__row' }, field('Codice fiscale', priv.taxCode), field('REA', priv.rea)),
      h('h3', {}, 'Assicurazione'), h('div', { class: 'ops-form__row' }, field('Compagnia', priv.insCompany), field('Polizza n.', priv.insPolicy), field('Massimale', priv.insMax), field('Scadenza', priv.insExp)),
      h('h3', {}, 'Documentazione delle qualifiche'),
      table([{ label: 'Documento', render: (d) => d.title }, { label: 'Caricato', render: (d) => dateTime(d.uploadedAt) }], docs, { empty: 'Nessun documento caricato.' }),
      h('div', { class: 'ops-form__row' }, field('Descrizione', priv.docTitle), field('File (PDF o immagine)', priv.doc)),
      field('Note', priv.notes), h('div', { class: 'ops-actions' }, savePriv)));
}

/* ================================================================ SETUP (wizard) */
async function loadSetup() {
  const r = await callFn('setup-status');
  if (!r.ok) throw new Error(r.data.message || 'Stato non disponibile');
  return r.data;
}
const MANUAL = {
  legal: [['legal_privacy', 'Informativa privacy'], ['legal_cookie', 'Cookie policy'], ['legal_terms', 'Condizioni di vendita'], ['legal_protected', 'Condizioni Lavoro Protetto']],
  services: [['services_confirmed', 'Servizi confermati dal titolare']], zones: [], email: [['email_dns', 'Record SPF/DKIM/DMARC del mittente']],
  supabase: [['supabase_auth_redirects', 'URL di redirect di Auth'], ['supabase_storage', 'Bucket di Storage']],
  mypos: [['mypos_sandbox_test', 'Prova completa in sandbox']], gsc: [['gsc_access', 'Accesso a Search Console']],
  tests: [['staging_tests', 'Test sullo staging'], ['public_site_review', 'Revisione del sito pubblico'], ['photos', 'Fotografie definitive'], ['owner_launch_approval', 'Approvazione del titolare']]
};
function manualCheck(key, label, cur, status) {
  const sel = h('select', { 'aria-label': `Stato: ${label}` }, Object.entries(STATUS_LABEL).map(([k, l]) => h('option', { value: k, selected: k === (cur?.status || 'todo') }, l)));
  const note = h('input', { type: 'text', value: cur?.note || '', placeholder: 'Come è stato verificato (obbligatorio per "Verificato")', 'aria-label': `Nota: ${label}` });
  return h('div', { class: 'cfg-check' }, h('b', {}, label), sel, note,
    actBtn('Registra', async () => { await db.rpc('set_setup_check', { p_key: key, p_status: sel.value, p_note: note.value }); await setup(); }, { status }));
}
async function setup() {
  const status = h('div', { role: 'status', 'aria-live': 'polite' });
  const s = await loadSetup();
  const done = s.steps.filter((x) => x.status === 'verified').length;
  page('Configurazione', 'Setup della piattaforma',
    notice('info', 'Le chiavi (Supabase, myPOS, email, Google) non si inseriscono qui né in chat: si impostano nelle variabili d’ambiente del pannello Netlify o nei pannelli dei provider. Questa pagina mostra solo se sono presenti e se le prove sono riuscite.'),
    h('p', {}, h('b', {}, `${done}/${s.steps.length}`), ' voci verificate.'), status,
    h('ol', { class: 'setup-steps' }, s.steps.map((st) => h('li', { class: `setup-step setup-step--${st.status}` },
      h('div', { class: 'setup-step__head' }, h('h2', {}, st.title), stBadge(st.status),
        st.blocks?.includes('A') ? badge('Blocca il sito pubblico', 'error') : st.blocks?.includes('B') ? badge('Blocca la piattaforma', 'warn') : badge('Completabile dopo', 'neutral')),
      h('p', {}, st.detail), h('details', {}, h('summary', {}, 'Come si configura'), h('p', {}, st.howTo)),
      (MANUAL[st.id] || []).map(([k, l]) => manualCheck(k, l, s.db?.checks?.[k], status)),
      st.id === 'email' ? actBtn('Invia un’email di prova al mio indirizzo', async () => {
        const r = await callFn('email-test', { method: 'POST', body: {} });
        fill(status, notice(r.ok ? 'ok' : 'error', r.ok ? `Email di prova inviata a ${r.data.to} (provider: ${r.data.provider}). Controlla la ricezione.` : r.data.message || r.data.error || 'Invio non riuscito'));
      }, { status }) : null,
      st.id === 'mypos' ? h('a', { class: 'btn btn--ghost btn--sm', href: '/admin/impostazioni/pagamenti/' }, 'Apri Impostazioni → Pagamenti') : null,
      st.id === 'company' || st.id === 'contacts' ? h('a', { class: 'btn btn--ghost btn--sm', href: '/admin/configurazione-azienda/' }, 'Apri Configurazione azienda') : null,
      st.id === 'pricing' ? h('a', { class: 'btn btn--ghost btn--sm', href: '/admin/#prezzi' }, 'Apri Gestione prezzi') : null)
    )));
}

/* ================================================================ PAGAMENTI */
async function pagamenti() {
  const status = h('div', { role: 'status', 'aria-live': 'polite' });
  const r = await callFn('mypos-status');
  if (!r.ok) throw new Error(r.data.message || 'Stato non disponibile');
  const { config: c, flags, data, lastConnectionTest: lt, lastFullTest: ft } = r.data;
  const yes = (v) => (v ? 'Sì' : 'No');
  const checklist = [
    ['Ordine creato', data?.ordersCreated > 0], ['Pagamento avviato (checkout myPOS)', data?.checkoutsStarted > 0], ['Notifica firmata verificata', data?.verifiedNotifications > 0],
    ['Transazione registrata', data?.transactionsRecorded > 0], ['Contratto attivato dal pagamento', data?.contractsActivatedByPayment > 0], ['Protezione dai duplicati (notifica ripetuta respinta)', data?.duplicatesBlocked > 0]
  ];
  page('Impostazioni', 'Pagamenti — myPOS',
    c.env === 'production' && !c.allowLive ? notice('warn', 'Ambiente myPOS di produzione configurato ma NON autorizzato: nessun pagamento reale è possibile (MYPOS_ALLOW_LIVE).') : null,
    notice('info', 'Credenziali, chiave privata e certificato myPOS si impostano solo nelle variabili d’ambiente di Netlify. Qui non compaiono mai. Nessun pagamento viene simulato.'),
    status,
    h('section', { class: 'app-card' }, h('h2', {}, 'Configurazione'),
      table([{ label: 'Voce', render: (x) => x[0] }, { label: 'Stato', render: (x) => x[1] }], [
        ['Ambiente', c.env || 'non configurato'], ['Configurazione completa', yes(c.ready)], ['Variabili mancanti', c.missing?.join(', ') || 'nessuna'], ['Problemi', c.problems?.join(' · ') || 'nessuno'],
        ['URL di notifica da registrare in myPOS', c.notifyUrl || '—'], ['Rimborsi via API', yes(c.refundsEnabled)], ['Verifica stato via API', yes(c.statusQueryEnabled)],
        ['Funzionalità “myPOS” attiva', yes(flags?.mypos)], ['Acquisti online attivi', yes(flags?.online_purchases)]
      ])),
    h('section', { class: 'app-card' }, h('h2', {}, 'Prova di connessione'),
      h('p', {}, lt ? [stBadge(lt.ok ? 'verified' : 'error'), ` Ultima prova: ${dateTime(lt.at)} (${lt.environment || '—'}) — ${lt.detail?.signatureValid ? 'risposta firmata da myPOS verificata' : lt.detail?.error || lt.detail?.message || 'firma non valida'}`] : 'Nessuna prova eseguita.'),
      h('p', { class: 'app-muted' }, 'Interroga myPOS sullo stato di un ordine di prova inesistente: la connessione è verificata solo se myPOS risponde con una firma valida. Nessun addebito.'),
      c.ready ? actBtn('Esegui la prova di connessione', async () => {
        const t = await callFn('mypos-status', { method: 'POST', body: { action: 'connection-test' } });
        await pagamenti();
        root.querySelector('[role=status]')?.append(notice(t.ok ? 'ok' : 'error', t.ok ? 'Connessione verificata: risposta firmata da myPOS.' : `Connessione non verificata: ${t.data.error || t.data.message || 'risposta non valida'}`));
      }, { cls: 'btn btn--primary', status }) : h('p', {}, badge('Prova non disponibile: configurazione incompleta', 'neutral'))),
    h('section', { class: 'app-card' }, h('h2', {}, 'Prova completa in sandbox'),
      h('p', { class: 'app-muted' }, 'Ogni voce risulta superata solo se il database ha registrato l’evento reale (da un acquisto di prova in sandbox sullo staging).'),
      h('ul', { class: 'cfg-list' }, checklist.map(([l, ok]) => h('li', {}, stBadge(ok ? 'verified' : 'todo'), ' ', l))),
      h('p', {}, `Ultimo checkout avviato: ${dateTime(data?.lastCheckoutAt)} · notifiche respinte: ${data?.rejected ?? 0}`),
      manualCheck('mypos_sandbox_test', 'Esito della prova completa', ft, status)));
}

/* ================================================================ FUNZIONALITÀ */
async function funzionalita() {
  const status = h('div', { role: 'status', 'aria-live': 'polite' });
  const flags = await db.rpc('feature_flags_admin');
  const admin = me.role === 'admin';
  page('Configurazione', 'Funzionalità',
    notice('info', 'Gli interruttori sono verificati anche dal database e dalle funzioni server: spegnere una funzionalità blocca le operazioni, non solo i pulsanti. Spegnere una funzionalità richiesta da altre spegne anche quelle. Dopo una modifica, aggiorna il sito perché le pagine pubbliche si allineino.'),
    status,
    h('div', { class: 'flag-list' }, flags.map((f) => {
      const note = h('input', { type: 'text', placeholder: 'Motivo (facoltativo)', 'aria-label': `Motivo: ${f.label}` });
      return h('section', { class: 'app-card flag' },
        h('div', { class: 'flag__head' }, h('h2', {}, f.label), badge(f.enabled ? 'Attiva' : 'Disattivata', f.enabled ? 'ok' : 'neutral')),
        h('p', {}, f.description), f.requires?.length ? h('p', { class: 'app-muted' }, `Richiede: ${f.requires.join(', ')}`) : null,
        f.updatedAt ? h('p', { class: 'app-muted' }, `Ultima modifica: ${dateTime(f.updatedAt)}${f.updatedBy ? ` — ${f.updatedBy}` : ''}${f.note ? ` (${f.note})` : ''}`) : null,
        admin ? h('div', { class: 'ops-actions' }, note, actBtn(f.enabled ? 'Disattiva' : 'Attiva', async () => {
          await db.rpc('set_feature_flag', { p_key: f.key, p_enabled: !f.enabled, p_note: note.value });
          await funzionalita();
        }, { cls: f.enabled ? 'btn btn--ghost btn--sm' : 'btn btn--primary btn--sm', status })) : null);
    })),
    admin ? h('div', { class: 'ops-actions' }, actBtn('Aggiorna il sito pubblico', async () => {
      const r = await callFn('site-rebuild', { method: 'POST', body: {} });
      fill(status, notice(r.ok ? 'ok' : 'error', r.data.message || 'Richiesta inviata.'));
    }, { status })) : null);
}

/* ================================================================ LANCIO */
async function lancio() {
  const s = await loadSetup();
  const { A, B } = s.readiness;
  const area = (title, lvl, what) => h('section', { class: `app-card launch launch--${lvl.ready ? 'go' : 'nogo'}` },
    h('div', { class: 'launch__head' }, h('h2', {}, title), badge(lvl.ready ? 'GO' : 'NO-GO', lvl.ready ? 'ok' : 'error')), h('p', { class: 'app-muted' }, what),
    lvl.blockers.length ? [h('h3', {}, 'Bloccanti'), h('ul', {}, lvl.blockers.map((b) => h('li', {}, b)))] : h('p', {}, 'Nessun elemento bloccante.'),
    lvl.warnings.length ? [h('h3', {}, 'Da completare (non bloccanti)'), h('ul', {}, lvl.warnings.map((b) => h('li', {}, b)))] : null);
  const i = s.integ || {}; const d = s.db || {};
  const states = [
    ['Sito pubblico', `${i.site?.siteEnv || '—'} · audit SEO: ${i.site?.auditErrors ?? '—'} errori · indicizzazione ${i.site?.allowIndexing ? 'consentita' : 'bloccata'}`],
    ['Dati aziendali', s.steps.find((x) => x.id === 'company')?.label], ['Moduli', i.site?.formsProvider || 'disattivati'],
    ['Database', `${d.database?.environment || 'ambiente non dichiarato'} · migrazione ${d.database?.migrationMarker || '—'} · tabelle senza RLS forzata: ${d.database?.tablesWithoutForcedRls ?? '—'}`],
    ['Autenticazione', `registrazione ${d.flags?.customer_registration ? 'aperta' : 'su invito'} · accesso clienti ${d.flags?.customer_login ? 'attivo' : 'disattivato'}`],
    ['Pagamenti', s.steps.find((x) => x.id === 'mypos')?.detail], ['Condizioni e listini', s.steps.find((x) => x.id === 'pricing')?.detail],
    ['Email', s.steps.find((x) => x.id === 'email')?.detail], ['PRONTO AI', `${d.flags?.pronto_ai ? 'attivo' : 'disattivato'} · provider ${i.ai?.ready ? 'configurato' : 'non configurato'}`],
    ['SEO', s.steps.find((x) => x.id === 'gsc')?.detail], ['Staging', `${i.site?.stagingProtected ? 'protetto da password' : 'non protetto'} · ${i.site?.deployUrl || '—'}`],
    ['Dominio', 'Non collegato: il dominio ufficiale resta sul sito attuale fino all’approvazione (vedi piano di lancio)']
  ];
  page('Lancio', 'GO / NO-GO',
    notice('info', 'Il risultato è calcolato dai dati verificati: non si forza manualmente. Un GO non pubblica nulla: la messa in produzione e il collegamento del dominio restano azioni separate, da autorizzare.'),
    h('div', { class: 'app-grid' }, area('Livello A — sito pubblico', A, 'Sito informativo con contatti funzionanti: nessuna vendita online.'),
      area('Livello B — piattaforma transazionale', B, 'Registrazione clienti, abbonamenti, pagamenti myPOS, notifiche automatiche.')),
    h('section', { class: 'app-card' }, h('h2', {}, 'Stato per area'), table([{ label: 'Area', render: (x) => x[0] }, { label: 'Stato', render: (x) => x[1] || '—' }], states)),
    h('p', { class: 'app-muted' }, `Calcolato il ${dateTime(s.generatedAt)}`));
}

const VIEWS = { 'configurazione-azienda': configurazioneAzienda, setup, pagamenti, funzionalita, lancio };
const TITLES = { 'configurazione-azienda': 'Configurazione azienda', setup: 'Setup', pagamenti: 'Pagamenti', funzionalita: 'Funzionalità', lancio: 'Lancio' };
if (root && VIEWS[VIEW]) {
  boot(root, {
    title: TITLES[VIEW],
    requireRole: VIEW === 'funzionalita' ? ['admin', 'operator'] : ['admin'],
    render: async (ctx) => {
      me = ctx.profile; restartFn = ctx.restart;
      try { await VIEWS[VIEW](); } catch (e) { fill(root, opsBar(me, restartFn), h('div', { class: 'ops-page' }, notice('error', e.message))); }
    }
  });
}
