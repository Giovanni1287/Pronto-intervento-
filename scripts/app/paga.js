/**
 * PAGAMENTO TRAMITE LINK — /paga/#t=<token>
 * Il token sta nel frammento dell'URL (non viene inviato al server né nei referer),
 * poi viaggia solo nell'intestazione X-Payment-Link verso le funzioni.
 * Riepilogo senza dati sensibili, accettazione condizioni, checkout sicuro myPOS.
 */
import { h, fill, euro, notice, fn, backendReady, notConfiguredView, config, submitCheckout, flagOn } from './core.js';
import { steps, summaryCard, termsBlock, securePayNote, linkStore, downloadReceipt } from './pay-common.js';

const root = document.getElementById('app');

async function start() {
  if (!backendReady) return notConfiguredView(root, 'Pagamento online');
  const m = location.hash.match(/(?:^#|&)t=([A-Za-z0-9_-]{24,64})/);
  const token = m?.[1] || sessionStorage.getItem('pir.link.current');
  if (!token) return fill(root, h('div', { class: 'co-card co-card--center' }, h('h1', { class: 'co-title' }, 'Link non valido'), h('p', {}, 'Il collegamento di pagamento è incompleto o scaduto. Richiedi un nuovo link a Pronto Intervento Roma.')));
  try { sessionStorage.setItem('pir.link.current', token); } catch { /* */ }
  if (location.hash) history.replaceState(null, '', location.pathname);
  const r = await fn('order-summary', { headers: { 'X-Payment-Link': token } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) return fill(root, h('div', { class: 'co-card co-card--center' }, h('h1', { class: 'co-title' }, 'Link non valido'), h('p', {}, 'Il collegamento non è valido o non è più attivo. Contatta Pronto Intervento Roma per un nuovo link.')));
  const o = data.order;
  linkStore.set(o.number, token);
  if (['paid', 'partially_refunded', 'refunded'].includes(o.status)) {
    return fill(root, steps(3), h('div', { class: 'co-card co-card--center' }, h('h1', { class: 'co-title' }, 'Pagamento già registrato'),
      h('p', {}, `L’ordine ${o.number} risulta pagato.`), h('button', { class: 'btn btn--primary', type: 'button', onclick: () => downloadReceipt(o.number, token).catch((e) => alert(e.message)) }, 'Scarica la ricevuta')));
  }
  const terms = termsBlock(o, { termsUrl: config.termsUrl });
  const status = h('div', { role: 'status', 'aria-live': 'polite' });
  const btn = h('button', { class: 'btn btn--primary btn--lg btn--block co-pay', type: 'button', disabled: !o.canPay }, o.canPay ? 'Procedi al pagamento sicuro' : 'Link non più pagabile');
  btn.onclick = async () => {
    if (!terms.accepted()) { terms.input.focus(); return fill(status, notice('error', 'Per procedere è necessario accettare le condizioni.')); }
    btn.disabled = true; btn.textContent = 'Collegamento al pagamento sicuro…';
    const res = await fn('checkout-create', { method: 'POST', body: { token, acceptTerms: true, termsVersion: o.termsVersion } });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) { fill(status, notice('error', d.message || 'Pagamento online non disponibile.')); btn.disabled = false; btn.textContent = 'Procedi al pagamento sicuro'; return; }
    submitCheckout(d.checkout);
  };
  fill(root, steps(1),
    h('div', { class: 'co-grid' },
      h('div', {}, summaryCard(o, { customer: o.customerName })),
      h('aside', { class: 'co-side' }, terms.box,
        h('div', { class: 'co-card' }, h('p', { class: 'co-due' }, 'Totale ', h('strong', {}, euro(o.grossCents))),
          o.expiresAt ? h('p', { class: 'co-muted' }, `Link valido fino al ${new Date(o.expiresAt).toLocaleDateString('it-IT')}.`) : null,
          btn, securePayNote(), status))));
}

if (root && backendReady && !flagOn('mypos')) {
  // Prompt 9: pagamenti myPOS non attivi → nessun pulsante di pagamento (anche il server rifiuta: payments_disabled)
  fill(root, h('div', { class: 'app-card app-card--center' }, h('h2', {}, 'Pagamenti online non attivi'),
    h('p', {}, 'Il pagamento online non è ancora disponibile: nessun importo viene richiesto o registrato da questa pagina.')));
} else if (root) start().catch((e) => fill(root, notice('error', e.message)));
