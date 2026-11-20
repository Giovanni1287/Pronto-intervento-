/**
 * CHECKOUT — /checkout/
 *   ?piano=<id piano Family>     → scelta dell'immobile, riepilogo, condizioni, pagamento
 *   ?ordine=<uuid ordine>        → ordine già creato (Lavoro Protetto, rata Business/Hotel/Corporate)
 * Prezzi, imposte e condizioni arrivano dal catalogo amministrativo e dall'ordine
 * nel database; il pulsante di pagamento invia al checkout sicuro myPOS.
 */
import { h, fill, euro, notice, boot, db, fn, config, submitCheckout, flagOn, backendReady } from './core.js';
import { steps, summaryCard, termsBlock, securePayNote } from './pay-common.js';

const root = document.getElementById('app');
const params = new URLSearchParams(location.search);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function json(r) { try { return await r.json(); } catch { return {}; } }

async function pay(btn, status, body) {
  btn.disabled = true;
  btn.textContent = 'Collegamento al pagamento sicuro…';
  try {
    const r = await fn('checkout-create', { method: 'POST', body });
    const data = await json(r);
    if (!r.ok) throw new Error(data.message || 'Pagamento online non disponibile.');
    fill(status, notice('info', 'Ti stiamo indirizzando alla pagina di pagamento sicura di myPOS…'));
    submitCheckout(data.checkout);
  } catch (err) {
    fill(status, notice('error', err.message));
    btn.disabled = false;
    btn.textContent = 'Procedi al pagamento sicuro';
  }
}

/* ---------------------------------------------------------------- ordine esistente */
async function existingOrder(id, profile) {
  const r = await fn('order-summary', { query: `?id=${id}` });
  const data = await json(r);
  if (!r.ok) return fill(root, h('div', { class: 'co-card co-card--center' }, h('h1', { class: 'co-title' }, 'Ordine non disponibile'), h('p', {}, data.message || 'Ordine non trovato o non accessibile con questo account.')));
  const o = data.order;
  const status = h('div', { role: 'status', 'aria-live': 'polite' });
  const terms = o.termsAccepted ? null : termsBlock(o, { termsUrl: config.termsUrl });
  const btn = h('button', { class: 'btn btn--primary btn--lg btn--block co-pay', type: 'button' }, 'Procedi al pagamento sicuro');
  btn.onclick = () => {
    if (terms && !terms.accepted()) { terms.input.focus(); return fill(status, notice('error', 'Per procedere è necessario accettare le condizioni.')); }
    pay(btn, status, { orderId: o.id, acceptTerms: true, termsVersion: o.termsVersion });
  };
  const payable = o.canPay && o.status === 'awaiting_payment' && !(o.paidCents > 0);
  fill(root,
    steps(terms ? 1 : 2),
    h('div', { class: 'co-grid' },
      h('div', {}, summaryCard(o, { customer: profile.full_name || profile.email, place: o.property ? `${o.property.address}, ${o.property.city}` : o.contractNumber })),
      h('aside', { class: 'co-side' },
        terms ? terms.box : notice('ok', 'Condizioni già accettate (versione conservata con l’ordine).'),
        payable ? h('div', { class: 'co-card' }, h('p', { class: 'co-due' }, 'Totale ', h('strong', {}, euro(o.grossCents))), btn, securePayNote(), status)
          : notice(o.status === 'paid' ? 'ok' : 'warn', o.status === 'paid' ? 'Questo ordine risulta già pagato.' : o.paidCents > 0 ? 'Ordine parzialmente incassato: per il saldo contatta l’amministrazione.' : `Ordine non pagabile online (stato: ${o.status}).`))));
}

/* ---------------------------------------------------------------- nuovo acquisto Family */
async function familyPlan(planId, profile) {
  const [plans, props, settings] = await Promise.all([
    db.select(`plans?id=eq.${encodeURIComponent(planId)}&line=eq.family&select=id,name,active,owner_approved,legal_reviewed,versions:plan_versions(id,status,price_cents,vat_rate,duration_months,visits,interventions,checkups,max_minutes,call_fee_included,materials_included,extra_labor_discount_pct,included,exclusions)`),
    db.select('properties?select=id,address_line,city,postal_code&order=created_at'),
    db.select('company_settings?id=eq.1&select=data,sales_enabled').catch(() => [])
  ]);
  const p = plans?.[0];
  const v = p?.versions?.find((x) => x.status === 'published');
  if (!p || !v) return fill(root, h('div', { class: 'co-card co-card--center' }, h('h1', { class: 'co-title' }, 'Pacchetto non disponibile'), h('p', {}, 'Il pacchetto richiesto non è pubblicato.'), h('a', { class: 'btn btn--primary', href: '/piani-assistenza/famiglie/' }, 'Torna ai piani')));
  const sellable = p.active && p.owner_approved && p.legal_reviewed && settings?.[0]?.sales_enabled === true;
  const termsVersion = settings?.[0]?.data?.terms_version_family || null;
  const net = Math.round((v.price_cents * 100) / (100 + Number(v.vat_rate)));
  const preview = { kind: 'family_contract', product: `PRONTO+ ${p.name}`, description: `PRONTO+ ${p.name}`, durationMonths: v.duration_months, visits: v.visits, interventions: v.interventions,
    checkups: v.checkups, maxMinutes: v.max_minutes, callFeeIncluded: v.call_fee_included, included: v.included, exclusions: v.exclusions, termsVersion,
    items: [{ description: `PRONTO+ ${p.name} — 12 mesi`, quantity: 1, vatRate: v.vat_rate, grossCents: v.price_cents }], netCents: net, vatCents: v.price_cents - net, grossCents: v.price_cents };

  const select = h('select', { id: 'co-prop', required: true }, h('option', { value: '' }, props.length ? 'Seleziona l’abitazione' : 'Nessuna abitazione registrata'),
    props.map((x) => h('option', { value: x.id }, `${x.address_line}, ${x.city}`)));
  if (props.length === 1) select.value = props[0].id;
  const addr = h('input', { type: 'text', id: 'co-addr', autocomplete: 'street-address' });
  const city = h('input', { type: 'text', id: 'co-city', value: 'Roma', autocomplete: 'address-level2' });
  const cap = h('input', { type: 'text', id: 'co-cap', inputmode: 'numeric', maxlength: 5, autocomplete: 'postal-code' });
  const propBox = h('section', { class: 'co-card' }, h('h2', { class: 'co-title co-title--sm' }, 'Abitazione coperta'),
    h('div', { class: 'field' }, h('label', { for: 'co-prop' }, 'Immobile'), select),
    h('details', { open: !props.length }, h('summary', {}, 'Aggiungi un’altra abitazione'),
      h('div', { class: 'co-form' }, h('div', { class: 'field' }, h('label', { for: 'co-addr' }, 'Indirizzo'), addr), h('div', { class: 'field' }, h('label', { for: 'co-city' }, 'Comune'), city),
        h('div', { class: 'field' }, h('label', { for: 'co-cap' }, 'CAP'), cap),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: async () => {
          if (addr.value.trim().length < 5) return fill(status, notice('error', 'Indica l’indirizzo completo.'));
          try {
            const [n] = await db.insert('properties', { owner_id: profile.id, address_line: addr.value.trim(), city: city.value.trim(), postal_code: cap.value.trim() || null });
            select.append(h('option', { value: n.id }, `${n.address_line}, ${n.city}`)); select.value = n.id; fill(status, notice('ok', 'Abitazione aggiunta.'));
          } catch (err) { fill(status, notice('error', err.message)); }
        } }, 'Salva abitazione'))));
  const terms = termsBlock(preview, { termsUrl: config.termsUrl });
  const status = h('div', { role: 'status', 'aria-live': 'polite' });
  const btn = h('button', { class: 'btn btn--primary btn--lg btn--block co-pay', type: 'button', disabled: !sellable }, sellable ? 'Procedi al pagamento sicuro' : 'Sottoscrizione non ancora attiva');
  btn.onclick = async () => {
    if (!select.value) { select.focus(); return fill(status, notice('error', 'Seleziona o aggiungi l’abitazione coperta.')); }
    if (!terms.accepted()) { terms.input.focus(); return fill(status, notice('error', 'Per procedere è necessario accettare le condizioni.')); }
    btn.disabled = true;
    try {
      const r = await fn('order-create', { method: 'POST', body: { kind: 'family', planId: p.id, propertyId: select.value } });
      const data = await json(r);
      if (!r.ok) throw new Error(data.message || 'Ordine non creato.');
      history.replaceState(null, '', `/checkout/?ordine=${data.order.id}`);
      await pay(btn, status, { orderId: data.order.id, acceptTerms: true, termsVersion: data.order.termsVersion });
    } catch (err) { fill(status, notice('error', err.message)); btn.disabled = false; }
  };
  fill(root,
    steps(0),
    h('div', { class: 'co-grid' },
      h('div', {}, summaryCard(preview, { customer: profile.full_name || profile.email }), propBox),
      h('aside', { class: 'co-side' }, terms.box,
        h('div', { class: 'co-card' }, h('p', { class: 'co-due' }, 'Totale ', h('strong', {}, euro(v.price_cents)), h('small', {}, ' IVA inclusa')),
          sellable ? null : notice('warn', 'La vendita online non è ancora attiva: prezzi e condizioni sono in fase di approvazione.'),
          btn, securePayNote(), status))));
}

if (root && backendReady && !(flagOn('online_purchases') && flagOn('mypos'))) {
  // Prompt 9: acquisti online o myPOS non attivi → nessun riepilogo né pulsante di pagamento
  fill(root, h('div', { class: 'app-card app-card--center' }, h('h2', {}, 'Acquisti online non attivi'),
    h('p', {}, 'L’acquisto online dei servizi PRONTO+ non è ancora disponibile: nessun pagamento viene richiesto o registrato da questa pagina.'),
    h('a', { class: 'btn btn--primary', href: '/#contatti' }, 'Vai ai contatti')));
} else if (root) {
  boot(root, {
    title: 'Acquisto PRONTO+',
    customerArea: true,
    render: async ({ profile }) => {
      const order = params.get('ordine');
      const plan = params.get('piano');
      if (order && UUID.test(order)) return existingOrder(order, profile);
      if (plan && /^family-[a-z0-9-]{3,60}$/.test(plan)) return familyPlan(plan, profile);
      fill(root, h('div', { class: 'co-card co-card--center' }, h('h1', { class: 'co-title' }, 'Scegli un pacchetto'), h('p', {}, 'Seleziona il piano dalla pagina PRONTO+ Family.'),
        h('a', { class: 'btn btn--primary', href: '/piani-assistenza/famiglie/' }, 'Vai ai piani')));
    }
  });
}
