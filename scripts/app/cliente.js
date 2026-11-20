/**
 * AREA CLIENTE — /area-cliente/, /area-cliente/i-miei-interventi/, /area-cliente/pagamento/
 * Due flussi distinti per le richieste post-intervento:
 *  A. Segnalazione difetto: SEMPRE disponibile, senza piani a pagamento.
 *  B. Servizio aggiuntivo: solo con Lavoro Protetto attivo e prestazioni residue.
 */
import { h, clear, fill, euro, date, dateTime, notice, statusBadge, boot, db, auth, fn, table, field, downloadCertificate, config } from './core.js';
import { membershipCard, ORDER_LABELS, downloadReceipt } from './pay-common.js';
import { requestsView } from './cliente-richieste.js';

const LEGAL = 'Le tutele previste dalla legge sui lavori eseguiti restano valide anche senza acquistare servizi aggiuntivi. Puoi segnalare un difetto in qualsiasi momento.';

function header(title, profile, restart) {
  return h('div', { class: 'app-head' },
    h('div', {}, h('p', { class: 'eyebrow' }, 'Area cliente'), h('h1', { class: 'section-title' }, title),
      h('p', { class: 'app-muted' }, `Accesso come ${profile?.full_name || profile?.email || 'cliente'}`)),
    h('nav', { class: 'app-tabs', 'aria-label': 'Sezioni area cliente' },
      h('a', { href: '/area-cliente/', 'aria-current': location.pathname === '/area-cliente/' ? 'page' : null }, 'Panoramica'),
      h('a', { href: '/area-cliente/richieste/', 'aria-current': location.pathname.includes('richieste') ? 'page' : null }, 'Richieste'),
      h('a', { href: '/area-cliente/i-miei-interventi/', 'aria-current': location.pathname.includes('i-miei-interventi') ? 'page' : null }, 'I miei interventi'),
      h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: async () => { await auth.signOut(); restart(); } }, 'Esci')));
}

/* ================================================================ PANORAMICA */
async function overview(root, { user, profile, restart }) {
  const [properties, contracts, purchases, balances, orders] = await Promise.all([
    db.select('properties?select=*&order=created_at'),
    db.select('contracts?select=id,property_id,status,price_cents,starts_at,ends_at,snapshot&order=created_at.desc'),
    db.select('protected_purchases?select=id,status,price_cents,starts_at,ends_at,snapshot,intervention_id&order=created_at.desc'),
    db.select('entitlement_balances?select=*'),
    db.select('orders?select=id,number,description,status,gross_cents,paid_cents,created_at,paid_at,snapshot&order=created_at.desc&limit=50').catch(() => [])
  ]);
  const rem = (filter) => balances.filter(filter).map((b) => `${b.type === 'intervention' ? 'Interventi' : b.type === 'checkup' ? 'Controlli' : b.type === 'preventive_visit' ? 'Visite preventive' : 'Sconti'}: ${b.remaining ?? 'illimitati'}`).join(' · ') || '—';

  const name = h('input', { type: 'text', value: profile.full_name || '', autocomplete: 'name' });
  const phone = h('input', { type: 'tel', value: profile.phone || '', autocomplete: 'tel' });
  const mkt = h('input', { type: 'checkbox', id: 'mkt' });
  mkt.checked = profile.marketing_consent === true;
  const pStatus = h('div', { role: 'status' });
  const profileForm = h('form', { class: 'app-card', onsubmit: async (e) => {
    e.preventDefault();
    try { await db.update(`profiles?id=eq.${user.id}`, { full_name: name.value.trim(), phone: phone.value.trim(), marketing_consent: mkt.checked }); fill(pStatus, notice('ok', 'Dati aggiornati.')); }
    catch (err) { fill(pStatus, notice('error', err.message)); }
  } },
    h('h2', {}, 'I tuoi dati'), field('Nome e cognome', name), field('Telefono', phone),
    h('div', { class: 'field field--check' }, mkt, h('label', { for: 'mkt' }, 'Acconsento a ricevere comunicazioni commerciali e promozioni (facoltativo, revocabile in qualsiasi momento).')),
    h('p', { class: 'app-muted' }, 'Le comunicazioni di servizio (interventi, certificati, scadenze) non dipendono da questo consenso.'),
    h('button', { class: 'btn btn--primary', type: 'submit' }, 'Salva'), pStatus);

  const addr = h('input', { type: 'text', required: true, autocomplete: 'street-address' });
  const city = h('input', { type: 'text', required: true, value: 'Roma', autocomplete: 'address-level2' });
  const cap = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'postal-code' });
  const prStatus = h('div', { role: 'status' });
  const propForm = h('form', { class: 'app-inline-form', onsubmit: async (e) => {
    e.preventDefault();
    try { await db.insert('properties', { owner_id: user.id, address_line: addr.value.trim(), city: city.value.trim(), postal_code: cap.value.trim() }); restart(); }
    catch (err) { fill(prStatus, notice('error', err.message)); }
  } }, field('Indirizzo', addr), field('Comune', city), field('CAP', cap), h('button', { class: 'btn btn--ghost', type: 'submit' }, 'Aggiungi immobile'), prStatus);

  fill(root, 
    header('Panoramica', profile, restart),
    h('div', { class: 'app-grid' },
      h('section', { class: 'app-card' }, h('h2', {}, 'Piani PRONTO+ Family'),
        table([
          { label: 'Piano', render: (c) => c.snapshot?.plan_name },
          { label: 'Stato', render: (c) => statusBadge(c.status) },
          { label: 'Validità', render: (c) => (c.starts_at ? `${date(c.starts_at)} → ${date(c.ends_at)}` : '—') },
          { label: 'Prezzo', render: (c) => euro(c.price_cents) },
          { label: 'Prestazioni residue', render: (c) => rem((b) => b.contract_id === c.id) }
        ], contracts, { empty: 'Nessun piano Family.' }),
        h('a', { class: 'btn btn--ghost btn--sm', href: '/piani-assistenza/famiglie/' }, 'Scopri i piani Family')),
      contracts.some((c) => c.status === 'active') ? h('section', { class: 'app-card' }, h('h2', {}, 'Tessere digitali'),
        h('div', { class: 'co-members' }, contracts.filter((c) => c.status === 'active').map((c) => membershipCard({ product: c.snapshot?.plan_name, holder: profile.full_name || profile.email,
          place: (properties.find((p) => p.id === c.property_id) || {}).address_line, startsAt: c.starts_at, months: c.snapshot?.duration_months || 12, number: c.id.slice(0, 8).toUpperCase() })))) : null,
      h('section', { class: 'app-card' }, h('h2', {}, 'Ordini e pagamenti'),
        table([
          { label: 'Ordine', render: (o) => h('span', {}, h('strong', {}, o.number), h('br'), h('small', { class: 'app-muted' }, o.description)) },
          { label: 'Importo', render: (o) => euro(o.gross_cents) },
          { label: 'Stato', render: (o) => ORDER_LABELS[o.status] || o.status },
          { label: '', render: (o) => (o.status === 'awaiting_payment' ? h('a', { class: 'btn btn--primary btn--sm', href: `/checkout/?ordine=${o.id}` }, 'Completa il pagamento')
            : ['paid', 'partially_refunded', 'refunded'].includes(o.status) ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => downloadReceipt(o.number).catch((e) => alertIn(pStatus, e.message)) }, 'Ricevuta') : null) }
        ], orders, { empty: 'Nessun ordine.' }),
        h('p', { class: 'app-muted' }, 'Un ordine risulta pagato solo dopo la verifica della transazione. La ricevuta non è una fattura.')),
      h('section', { class: 'app-card' }, h('h2', {}, 'Servizi Lavoro Protetto'),
        table([
          { label: 'Piano', render: (p) => p.snapshot?.plan_name },
          { label: 'Stato', render: (p) => statusBadge(p.status) },
          { label: 'Validità', render: (p) => (p.starts_at ? `${date(p.starts_at)} → ${date(p.ends_at)}` : '—') },
          { label: 'Residui', render: (p) => rem((b) => b.purchase_id === p.id) }
        ], purchases, { empty: 'Nessun servizio aggiuntivo. Non è necessario per segnalare difetti.' })),
      h('section', { class: 'app-card' }, h('h2', {}, 'I tuoi immobili'),
        table([{ label: 'Indirizzo', key: 'address_line' }, { label: 'Comune', key: 'city' }, { label: 'CAP', key: 'postal_code' }], properties, { empty: 'Aggiungi l’immobile per cui richiedi interventi o piani.' }), propForm),
      profileForm),
    h('p', { class: 'app-legal' }, LEGAL));
}

/* ================================================================ I MIEI INTERVENTI */
async function interventions(root, { user, profile, restart }) {
  const [list, certs, purchases, disputes, requests, balances, checks, plans] = await Promise.all([
    db.select('interventions?select=id,number,status,completed_at,scheduled_at,service:services(name,category:service_categories(name)),property:properties(address_line,city),report:intervention_reports(work_description,materials)&order=created_at.desc'),
    db.select('certificates?select=number,revision,status,issued_at,intervention_id&order=revision.desc'),
    db.select('protected_purchases?select=*'),
    db.select('disputes?select=*&order=created_at.desc'),
    db.select('assistance_requests?select=*&order=created_at.desc'),
    db.select('entitlement_balances?select=*'),
    db.select('scheduled_checks?select=*&order=scheduled_at.desc'),
    db.select('plans?line=eq.protected&variant=eq.standard&active=eq.true&select=id,name,owner_approved,legal_reviewed,versions:plan_versions(price_cents,duration_months,included,status)')
  ]);
  const offerPlans = plans.map((p) => ({ ...p, v: p.versions.find((v) => v.status === 'published') })).filter((p) => p.v);

  const card = (i) => {
    const cert = certs.find((c) => c.intervention_id === i.id && c.status === 'valid');
    const pur = purchases.find((p) => p.intervention_id === i.id && ['active', 'pending_payment', 'expired'].includes(p.status));
    const visit = pur && balances.find((b) => b.purchase_id === pur.id && b.type === 'preventive_visit');
    const myDisputes = disputes.filter((d) => d.intervention_id === i.id);
    const body = h('div', { class: 'app-int__body' });
    const out = h('article', { class: 'app-card app-int', id: `int-${i.number}` },
      h('header', { class: 'app-int__head' },
        h('div', {}, h('p', { class: 'app-int__num' }, i.number), h('h2', {}, i.service?.name || 'Intervento'),
          h('p', { class: 'app-muted' }, `${i.service?.category?.name || ''} · ${date(i.completed_at || i.scheduled_at)} · ${i.property?.city || ''}`)),
        statusBadge(i.status)),
      h('dl', { class: 'app-dl' },
        h('div', {}, h('dt', {}, 'Descrizione'), h('dd', {}, i.report?.[0]?.work_description || i.report?.work_description || 'Disponibile dopo la verifica dell’intervento.')),
        h('div', {}, h('dt', {}, 'Documenti'), h('dd', {}, cert
          ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => downloadCertificate(cert.number).catch((e) => alertIn(body, e.message)) }, `Certificato ${cert.number} (PDF)`)
          : 'Il certificato sarà disponibile dopo la verifica dei dati.')),
        h('div', {}, h('dt', {}, 'Assistenza aggiuntiva'), h('dd', {}, pur
          ? h('span', {}, statusBadge(pur.status), ` ${pur.snapshot?.plan_name || ''} ${pur.ends_at ? `fino al ${date(pur.ends_at)}` : ''} · visite residue: ${visit?.remaining ?? 0}`)
          : 'Nessun programma aggiuntivo.'))),
      h('div', { class: 'app-actions' },
        h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: () => defectForm(body, i, restart) }, 'Segnala un difetto o contesta il lavoro'),
        pur?.status === 'active' && (visit?.remaining ?? 0) > 0
          ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => serviceForm(body, pur, restart) }, 'Richiedi visita di controllo')
          : null,
        cert && !pur && i.status === 'verified' && offerPlans.length
          ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => protectedOffer(body, i, offerPlans) }, 'Valuta Lavoro Protetto (facoltativo)')
          : null),
      myDisputes.length ? h('div', { class: 'app-sub' }, h('h3', {}, 'Le tue segnalazioni'),
        table([{ label: 'Numero', key: 'number' }, { label: 'Data', render: (d) => date(d.created_at) }, { label: 'Stato', render: (d) => statusBadge(d.status) }, { label: 'Esito', render: (d) => d.resolution_note || '—' }], myDisputes)) : null,
      body);
    return out;
  };

  const confirmable = checks.filter((c) => c.status === 'completed' && !c.confirmed_at);
  fill(root, 
    header('I miei interventi', profile, restart),
    h('p', { class: 'app-legal' }, LEGAL),
    confirmable.length ? h('section', { class: 'app-card' }, h('h2', {}, 'Controlli da confermare'),
      h('p', { class: 'app-muted' }, 'Conferma che la visita è stata eseguita: solo dopo la conferma viene scalata dal tuo piano.'),
      table([{ label: 'Data', render: (c) => dateTime(c.completed_at) }, { label: 'Esito', render: (c) => c.report || '—' },
        { label: '', render: (c) => h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: async () => { await db.rpc('confirm_check', { p_check: c.id }); restart(); } }, 'Confermo l’esecuzione') }], confirmable)) : null,
    requests.length ? h('section', { class: 'app-card' }, h('h2', {}, 'Richieste di servizio aggiuntivo'),
      table([{ label: 'Numero', key: 'number' }, { label: 'Data richiesta', render: (r) => date(r.requested_date) }, { label: 'Stato', render: (r) => statusBadge(r.status) }], requests)) : null,
    list.length ? h('div', { class: 'app-list' }, list.map(card)) : h('div', { class: 'app-card' }, h('p', {}, 'Non risultano ancora interventi associati al tuo account.')));
}

function alertIn(el, msg, type = 'error') { fill(el, notice(type, msg)); }

/** A. Segnalazione difetto: nessun controllo su piani o scadenze commerciali. */
function defectForm(container, i, restart) {
  const desc = h('textarea', { rows: 4, required: true, minlength: 10 });
  const st = h('div', { role: 'status' });
  fill(container, h('form', { class: 'app-subform', onsubmit: async (e) => {
    e.preventDefault();
    try { const d = await db.rpc('create_dispute', { p_intervention: i.id, p_description: desc.value.trim() }); alertIn(st, `Segnalazione ${d.number} registrata: verrà valutata secondo i diritti applicabili.`, 'ok'); setTimeout(restart, 1500); }
    catch (err) { alertIn(st, err.message); }
  } },
    h('h3', {}, 'Segnalazione di difetto o contestazione'),
    h('p', { class: 'app-muted' }, 'Disponibile per tutti gli interventi, con o senza piani PRONTO+. La segnalazione viene registrata con data e ora e presa in carico.'),
    field('Descrivi il problema riscontrato', desc), h('button', { class: 'btn btn--primary', type: 'submit' }, 'Invia segnalazione'), st));
}

/** B. Servizio aggiuntivo: visita preventiva prevista dal piano. */
function serviceForm(container, pur, restart) {
  const d = h('input', { type: 'date', required: true });
  const msg = h('textarea', { rows: 3 });
  const st = h('div', { role: 'status' });
  fill(container, h('form', { class: 'app-subform', onsubmit: async (e) => {
    e.preventDefault();
    try { const r = await db.rpc('create_service_request', { p_purchase: pur.id, p_benefit: 'preventive_visit', p_date: d.value, p_message: msg.value.trim() || null }); alertIn(st, `Richiesta ${r.number} registrata. La visita sarà scalata solo dopo l’esecuzione e la tua conferma.`, 'ok'); setTimeout(restart, 1500); }
    catch (err) { alertIn(st, err.message); }
  } }, h('h3', {}, 'Richiesta di visita preventiva'), field('Data preferita', d, 'Con almeno 3 giorni di preavviso, entro la scadenza del piano.'), field('Note (facoltative)', msg),
    h('button', { class: 'btn btn--primary', type: 'submit' }, 'Invia richiesta'), st));
}

/** Offerta facoltativa: nessun piano preselezionato, condizioni da accettare esplicitamente. */
function protectedOffer(container, i, plans) {
  const st = h('div', { role: 'status' });
  const accept = h('input', { type: 'checkbox', id: `acc-${i.id}` });
  const radios = plans.map((p) => h('label', { class: 'app-plan' },
    h('input', { type: 'radio', name: `pw-${i.id}`, value: p.id }),
    h('span', {}, h('strong', {}, p.name), ` — ${euro(p.v.price_cents)} una tantum, IVA inclusa, ${p.v.duration_months} mesi`,
      h('ul', {}, p.v.included.map((x) => h('li', {}, x))))));
  const sellable = config.salesEnabled === true;
  fill(container, h('form', { class: 'app-subform', onsubmit: async (e) => {
    e.preventDefault();
    const chosen = container.querySelector(`input[name="pw-${i.id}"]:checked`);
    if (!chosen) return alertIn(st, 'Seleziona un piano, se desideri acquistarlo.');
    if (!accept.checked) return alertIn(st, 'Per procedere devi accettare le condizioni del servizio.');
    try {
      // l'ordine (prezzo, durata, controlli, esclusioni, condizioni) è creato dal database; il riepilogo completo è nella pagina di checkout
      const r = await fn('order-create', { method: 'POST', body: { kind: 'protected', planId: chosen.value, interventionId: i.id } });
      const data = await r.json();
      if (!r.ok) return alertIn(st, data.message || 'Ordine non disponibile.');
      location.assign(`/checkout/?ordine=${data.order.id}`);
    } catch (err) { alertIn(st, err.message); }
  } },
    h('h3', {}, 'PRONTO+ Lavoro Protetto — servizio facoltativo'),
    notice('info', LEGAL),
    h('fieldset', {}, h('legend', {}, 'Scegli un piano (nessuno è selezionato)'), radios),
    h('div', { class: 'field field--check' }, accept, h('label', { for: `acc-${i.id}` }, 'Ho letto le condizioni del servizio e il diritto di recesso.')),
    sellable ? h('button', { class: 'btn btn--primary', type: 'submit' }, 'Prosegui al riepilogo e al pagamento') : notice('warn', 'La vendita non è ancora attiva: condizioni in fase di approvazione.'),
    st));
}

/** Invia il form firmato a myPOS (il piano si attiva solo con la notifica server-side). */
export function submitCheckout(checkout) {
  const f = h('form', { method: 'POST', action: checkout.action, hidden: true });
  for (const [k, v] of Object.entries(checkout.params)) f.append(h('input', { type: 'hidden', name: k, value: v }));
  document.body.append(f);
  f.submit();
}

/* ================================================================ ESITO PAGAMENTO */
async function payment(root, { profile, restart }) {
  const q = new URLSearchParams(location.search);
  const order = q.get('ordine') || '';
  const box = h('div', { class: 'app-card app-card--center' });
  fill(root, header('Pagamento', profile, restart), box);
  if (q.get('esito') === 'annullato') return box.append(h('h2', {}, 'Pagamento annullato'), h('p', {}, 'Nessun addebito è stato confermato. Puoi riprovare dall’area cliente.'));
  // Il ritorno dal gateway NON conferma nulla: si verifica lo stato registrato dal server.
  for (let n = 0; n < 10; n++) {
    const [p] = (await db.select(`payments?order_id=eq.${encodeURIComponent(order)}&select=status,amount_cents`)) || [];
    clear(box);
    if (p?.status === 'paid') return box.append(h('h2', {}, 'Pagamento confermato'), h('p', {}, `Importo ${euro(p.amount_cents)}. Il servizio è attivo.`), h('a', { class: 'btn btn--primary', href: '/area-cliente/' }, 'Vai alla panoramica'));
    box.append(h('h2', {}, 'Verifica del pagamento in corso'), h('p', {}, 'Attendiamo la conferma dal sistema di pagamento. Il servizio si attiva solo dopo la conferma: non chiudere questa pagina.'));
    await new Promise((r) => setTimeout(r, 3000));
  }
  box.append(notice('warn', 'Conferma non ancora ricevuta. Se l’addebito risulta effettuato, la conferma arriverà a breve: controlla la panoramica più tardi.'));
}

/* ================================================================ avvio */
const root = document.getElementById('app');
const view = root?.dataset.view;
if (root) {
  boot(root, {
    title: 'Area cliente',
    customerArea: true,
    render: (ctx) => (view === 'interventi' ? interventions(root, ctx) : view === 'pagamento' ? payment(root, ctx)
      : view === 'richieste' ? requestsView(root, ctx, (title) => header(title, ctx.profile, ctx.restart)) : overview(root, ctx))
  });
}
