/**
 * Wizard di configurazione e prontezza al lancio (Prompt 9) — logica pura, condivisa da
 * funzione server (setup-status), dashboard /admin/setup/ e /admin/lancio/ e test.
 * Ingressi: `db` = setup_db_status() (dati verificati nel database) e `integ` = stato delle
 * integrazioni calcolato dalla funzione server SENZA mai includere segreti.
 * Uno stato "verificato" richiede sempre una prova: esito di una verifica automatica registrata
 * dal server oppure dichiarazione motivata dell'amministratore (voci legali, test sullo staging).
 */
export const STATUS = { todo: 'Da configurare', configured: 'Configurato', checking: 'In verifica', verified: 'Verificato', error: 'Errore' };

const chk = (db, k) => db?.checks?.[k]?.status || 'todo';
const ic = (db, k) => db?.integrationChecks?.[k] || null;
const worst = (list) => (list.includes('error') ? 'error' : list.every((s) => s === 'verified') ? 'verified' : list.every((s) => s === 'todo') ? 'todo'
  : list.some((s) => s === 'checking' || s === 'verified') ? 'checking' : 'configured');

export function buildSetupSteps({ db = {}, integ = {} }) {
  const company = db.company || {};
  const pub = company.public || {};
  const missing = company.missingRequired || [];
  const steps = [];
  const add = (id, title, status, detail, howTo, blocks) => steps.push({ id, title, status, label: STATUS[status], detail, howTo, blocks });

  // 1. dati aziendali
  const companyFields = ['tradeName', 'legalName', 'ownerName', 'vatNumber', 'registeredOffice', 'hours'];
  const companyMissing = missing.filter((f) => companyFields.includes(f));
  add('company', 'Dati aziendali', companyMissing.length === 0 ? 'verified' : companyFields.some((f) => pub[f]) ? 'checking' : 'todo',
    companyMissing.length ? `Da inserire e verificare: ${companyMissing.join(', ')}` : 'Dati obbligatori verificati e pubblicati',
    'Configurazione azienda → compila i campi, poi "Verifica" indicando il documento usato (visura camerale, certificato di attribuzione P.IVA).', ['A', 'B']);

  // 2. contatti
  const contactMissing = missing.filter((f) => ['phone', 'email'].includes(f));
  const forms = integ.site?.formsProvider || null;
  add('contacts', 'Contatti', contactMissing.length ? (pub.phone || pub.email ? 'checking' : 'todo') : 'verified',
    [contactMissing.length ? `Da verificare: ${contactMissing.join(', ')}` : 'Telefono ed email verificati', pub.whatsapp ? 'WhatsApp verificato' : 'WhatsApp facoltativo, non configurato',
      `Moduli: ${forms === 'centrale' ? 'richieste in centrale (Supabase)' : forms === 'netlify' ? 'Netlify Forms' : 'disattivati (resta il telefono)'}`].join(' · '),
    'Inserisci telefono, WhatsApp Business ed email e verificali (contratto telefonico, profilo WhatsApp Business). Un numero non verificato non compare sul sito.', ['A', 'B']);

  // 3. servizi attivi
  add('services', 'Servizi attivi', chk(db, 'services_confirmed') === 'verified' ? 'verified' : db.services ? 'configured' : 'todo',
    `${db.services || 0} servizi nel catalogo${chk(db, 'services_confirmed') === 'verified' ? ', confermati dal titolare' : ', da confermare dal titolare'}`,
    'Rivedi le 6 categorie e le 24 sottocategorie e conferma nel wizard quelle che l’impresa esegue davvero.', ['A']);

  // 4. zone operative
  add('zones', 'Zone operative', db.zonesActive > 0 ? 'verified' : 'todo', db.zonesActive > 0 ? `${db.zonesActive} zone confermate` : 'Nessuna zona confermata: il sito dichiara solo "Roma e provincia, da confermare"',
    'PRONTO SEO → Impostazioni → Zone operative: attiva solo le zone servite davvero.', []);

  // 5. prezzi e condizioni
  const pr = db.pricing || {};
  const legalTerms = chk(db, 'legal_terms');
  add('pricing', 'Prezzi e condizioni', pr.sellable > 0 && legalTerms === 'verified' ? 'verified' : pr.ownerApproved > 0 || pr.approvedNotPublished > 0 ? 'checking' : 'todo',
    `${pr.sellable || 0} listini vendibili su ${pr.plans || 0} · ${pr.drafts || 0} bozze · ${pr.approvedNotPublished || 0} approvati non pubblicati · condizioni: ${STATUS[legalTerms]}`,
    'Prezzi → per ogni piano: bozza → "Approva" (titolare) → "Pubblica". Spunta "Titolare" e "Legale" solo dopo la revisione delle condizioni.', ['B']);

  // 6. Supabase
  const sb = integ.supabase || {};
  const dbi = db.database || {};
  const sbErrors = [];
  if (sb.anonKey?.present && sb.anonKey.role && sb.anonKey.role !== 'anon') sbErrors.push('la chiave pubblica non è una chiave "anon"');
  if (sb.serviceKey?.present && sb.serviceKey.role && sb.serviceKey.role !== 'service_role') sbErrors.push('la chiave server non è "service_role"');
  if (sb.anonKey?.refMatchesUrl === false || sb.serviceKey?.refMatchesUrl === false) sbErrors.push('chiavi di un altro progetto Supabase');
  if (integ.environment && !integ.environment.ok && integ.environment.db) sbErrors.push(integ.environment.reason);
  if (dbi.tablesWithoutForcedRls > 0) sbErrors.push(`${dbi.tablesWithoutForcedRls} tabelle senza RLS forzata`);
  const sbReady = sb.url && sb.anonKey?.present && sb.serviceKey?.present && dbi.migrationMarker;
  const sbVerified = sbReady && !sbErrors.length && integ.environment?.ok && sb.auth?.reachable && chk(db, 'supabase_auth_redirects') === 'verified' && chk(db, 'supabase_storage') === 'verified';
  add('supabase', 'Supabase', sbErrors.length ? 'error' : sbVerified ? 'verified' : sbReady ? 'checking' : sb.url ? 'configured' : 'todo',
    sbErrors.length ? sbErrors.join(' · ') : [sb.url ? `progetto ${sb.projectRef || ''}` : 'URL non impostata', dbi.environment ? `ambiente ${dbi.environment}` : 'ambiente del database non dichiarato',
      sb.auth?.reachable ? `Auth: registrazione ${sb.auth.signupDisabled ? 'chiusa' : 'aperta'}` : 'Auth non verificata'].join(' · '),
    'Crea un progetto Supabase dedicato (uno per lo staging, uno per la produzione), applica le migrazioni, imposta le variabili su Netlify e dichiara l’ambiente. Configura in Auth gli URL di reindirizzamento.', ['B']);

  // 7. myPOS
  const mp = integ.mypos || {};
  const conn = ic(db, 'mypos_connection');
  const mpTest = chk(db, 'mypos_sandbox_test');
  add('mypos', 'myPOS', mp.problems?.length ? 'error' : !mp.ready ? (mp.missing?.length < 5 ? 'configured' : 'todo')
    : conn?.ok && mpTest === 'verified' ? 'verified' : 'checking',
    mp.ready ? `ambiente ${mp.env} · connessione: ${conn ? (conn.ok ? 'verificata' : 'non riuscita') : 'mai provata'} · prova completa: ${STATUS[mpTest]}`
      : `Mancano: ${(mp.missing || []).join(', ') || '—'}${mp.problems?.length ? ` · ${mp.problems.join(' · ')}` : ''}`,
    'Richiedi a myPOS le credenziali SANDBOX, impostale su Netlify (mai nel sito), poi Impostazioni → Pagamenti → "Prova connessione" e la prova completa con carta di test.', ['B']);

  // 8. email
  const em = integ.email || {};
  const emTest = ic(db, 'email_test');
  add('email', 'Email transazionali', em.problems?.length ? 'error' : !em.configured ? 'todo'
    : emTest?.ok && chk(db, 'email_dns') === 'verified' ? 'verified' : 'checking',
    em.configured ? `mittente ${em.from || '—'} · prova: ${emTest ? (emTest.ok ? 'riuscita' : 'non riuscita') : 'mai eseguita'} · DNS (SPF/DKIM/DMARC): ${STATUS[chk(db, 'email_dns')]}`
      : 'Nessun provider: le notifiche restano in coda come "non inviate"',
    'Crea l’account del provider (Resend), verifica il dominio di invio, imposta RESEND_API_KEY e NOTIFY_FROM su Netlify, poi "Invia email di prova". I record DNS email si aggiungono solo con l’autorizzazione del titolare.', ['B']);

  // 9. Search Console
  const g = integ.google || {};
  add('gsc', 'Google Search Console', g.ready && chk(db, 'gsc_access') === 'verified' ? 'verified' : g.ready ? 'checking' : chk(db, 'gsc_access') !== 'todo' ? 'checking' : 'todo',
    g.ready ? `accesso: ${g.serviceAccountEmail ? 'service account' : 'OAuth'}` : 'Credenziali non configurate (la proprietà risulta già verificata via DNS)',
    'Recupera l’accesso alla proprietà esistente di prontointerventoroma.it, aggiungi il service account come utente e imposta GSC_SERVICE_ACCOUNT_JSON.', []);

  // 10. privacy e documentazione legale
  const legal = ['legal_privacy', 'legal_cookie', 'legal_terms', 'legal_protected'].map((k) => chk(db, k));
  add('legal', 'Privacy e documentazione legale', worst(legal),
    `Privacy ${STATUS[legal[0]]} · Cookie ${STATUS[legal[1]]} · Condizioni PRONTO+ ${STATUS[legal[2]]} · Lavoro Protetto ${STATUS[legal[3]]}`,
    'Fai validare a un consulente informativa privacy, cookie policy e condizioni (docs/legale/), poi segna ogni voce come verificata indicando chi l’ha validata.', ['A', 'B']);

  // 11. test finali
  add('tests', 'Test finali', chk(db, 'staging_tests'), chk(db, 'staging_tests') === 'verified' ? 'Scenari eseguiti sullo staging' : 'Scenari dello staging non ancora eseguiti',
    'Sullo staging: richiesta dal sito, assegnazione, rapporto, pagamento sandbox, abbonamento, PRONTO AI. Annota l’esito in docs/OWNER-SETUP-CHECKLIST.md.', ['B']);
  return steps;
}

/**
 * Livello A — sito pubblico; Livello B — piattaforma transazionale.
 * Restituisce { A: { ready, blockers, warnings }, B: { … }, areas: [...] }. Nessun blocco viene mai ignorato.
 */
export function launchReadiness({ db = {}, integ = {} }) {
  const steps = Object.fromEntries(buildSetupSteps({ db, integ }).map((s) => [s.id, s]));
  const flags = db.flags || {};
  const site = integ.site || {};
  const A = { blockers: [], warnings: [] }; const B = { blockers: [], warnings: [] };
  const need = (lvl, cond, msg) => { if (!cond) lvl.blockers.push(msg); };
  // A — sito pubblico
  need(A, steps.company.status === 'verified', 'Dati aziendali obbligatori non verificati (ragione sociale, P.IVA, sede, titolare, orari)');
  need(A, steps.contacts.status === 'verified', 'Telefono ed email non verificati: il sito non ha un contatto funzionante');
  need(A, chk(db, 'legal_privacy') === 'verified', 'Informativa privacy non validata');
  need(A, chk(db, 'legal_cookie') === 'verified' || !site.ga4, 'Cookie policy non validata con Google Analytics attivo');
  need(A, site.buildOk !== false && site.auditErrors === 0, `Build o audit SEO con errori (${site.auditErrors ?? 'non disponibile'})`);
  need(A, site.formsProvider !== null || steps.contacts.status === 'verified', 'Né moduli né telefono funzionanti');
  if (site.formsProvider === 'centrale' && steps.supabase.status !== 'verified') A.blockers.push('Moduli collegati alla centrale ma Supabase non verificato: le richieste potrebbero perdersi');
  if (chk(db, 'photos') !== 'verified') A.warnings.push('Fotografie segnaposto ancora presenti (consigliato sostituire almeno hero e categorie)');
  if (chk(db, 'public_site_review') !== 'verified') A.warnings.push('Revisione finale dei testi pubblici non ancora registrata');
  if (steps.zones.status !== 'verified') A.warnings.push('Zone operative non confermate: il sito resta generico su Roma e provincia');
  if (steps.gsc.status !== 'verified') A.warnings.push('Search Console non collegata (si può completare dopo il lancio)');
  // B — piattaforma transazionale
  for (const id of ['company', 'contacts', 'supabase', 'pricing', 'mypos', 'email', 'legal', 'tests']) need(B, steps[id].status === 'verified', `${steps[id].title}: ${steps[id].label}`);
  need(B, chk(db, 'owner_launch_approval') === 'verified', 'Manca l’approvazione scritta del titolare al lancio');
  need(B, integ.mypos?.env !== 'production' || integ.mypos?.allowLive === true, 'myPOS di produzione non autorizzato (MYPOS_ALLOW_LIVE)');
  if (flags.online_purchases && steps.mypos.status !== 'verified') B.blockers.push('Acquisti online accesi senza myPOS verificato: spegnerli subito');
  if (flags.notifications && steps.email.status !== 'verified') B.warnings.push('Notifiche accese con provider email non verificato');
  if (flags.pronto_ai && !integ.ai?.ready) B.warnings.push('PRONTO AI acceso senza provider configurato: risponde "non disponibile"');
  return { A: { ...A, ready: A.blockers.length === 0 }, B: { ...B, ready: B.blockers.length === 0 }, steps: Object.values(steps) };
}
