/**
 * PAGINE DI ESITO — /pagamento/{verifica,in-attesa,confermato,annullato,non-riuscito}/?ordine=ORD-…
 * Nessuna pagina dichiara un pagamento "confermato" senza la verifica del backend:
 * lo stato si legge sempre dalla funzione payment-status (ordine registrato come
 * pagato solo da notifica firmata myPOS o da riconciliazione).
 */
import { h, fill, euro, dateTime, notice, fn, backendReady, notConfiguredView } from './core.js';
import { steps, ORDER_LABELS, linkStore, downloadReceipt, membershipCard } from './pay-common.js';

const root = document.getElementById('app');
const view = root?.dataset.view;
const q = new URLSearchParams(location.search);
const order = q.get('ordine') || '';
const attempt = q.get('tentativo') || '';
const PAID = ['paid', 'partially_refunded', 'refunded'];
const go = (state) => location.replace(`/pagamento/${state}/?ordine=${encodeURIComponent(order)}`);

async function status({ esito = '', verifica = false } = {}) {
  const qs = new URLSearchParams({ ordine: order });
  if (attempt && esito) { qs.set('tentativo', attempt); qs.set('esito', esito); }
  if (verifica) qs.set('verifica', '1');
  const token = linkStore.get(order);
  const r = await fn('payment-status', { query: `?${qs}`, headers: token ? { 'X-Payment-Link': token } : {} });
  if (r.status === 503) throw Object.assign(new Error('Verifica dei pagamenti non ancora configurata.'), { code: 503 });
  if (!r.ok) throw new Error('Ordine non trovato. Se hai pagato tramite link, riapri il collegamento ricevuto.');
  return r.json();
}

const card = (title, ...body) => h('div', { class: 'co-card co-card--center co-result' }, h('h1', { class: 'co-title' }, title), ...body);
const back = () => h('div', { class: 'co-actions' },
  linkStore.get(order) ? h('a', { class: 'btn btn--primary', href: '/paga/' }, 'Torna al riepilogo') : h('a', { class: 'btn btn--primary', href: '/area-cliente/' }, 'Vai all’area riservata'),
  h('a', { class: 'btn btn--ghost', href: '/#contatti' }, 'Assistenza'));

async function verifica() {
  const box = h('div', { role: 'status', 'aria-live': 'polite' });
  fill(root, steps(3), card('Verifica del pagamento in corso', h('div', { class: 'co-spinner', 'aria-hidden': 'true' }),
    h('p', {}, 'Stiamo attendendo la conferma della transazione dal sistema di pagamento. Non chiudere questa pagina: di solito bastano pochi secondi.'),
    h('p', { class: 'co-muted' }, `Ordine ${order}`), box));
  let n = 0;
  const tick = async () => {
    n += 1;
    const st = await status({ esito: n === 1 ? 'returned' : '', verifica: [4, 10, 20].includes(n) });
    if (PAID.includes(st.status)) return go('confermato');
    if (st.attemptStatus === 'failed' || st.providerStatus === 'unsuccessful') return go('non-riuscito');
    if (st.status === 'cancelled') return go('annullato');
    if (n >= 30) return go('in-attesa');
    fill(box, h('p', { class: 'co-muted' }, `Stato attuale: ${ORDER_LABELS[st.status] || st.status}`));
    setTimeout(() => tick().catch(fail), 3000);
  };
  await tick();
}

async function inAttesa() {
  const st = await status();
  if (PAID.includes(st.status)) return go('confermato');
  const box = h('div', { role: 'status', 'aria-live': 'polite' });
  fill(root, steps(3), card('Pagamento in attesa di conferma',
    h('p', {}, 'Non abbiamo ancora ricevuto la conferma della transazione. Se il pagamento è andato a buon fine la conferma arriverà a breve; il servizio si attiva solo dopo la verifica.'),
    h('p', { class: 'co-muted' }, `Ordine ${order} · ${ORDER_LABELS[st.status] || st.status}`),
    h('button', { class: 'btn btn--primary', type: 'button', onclick: async () => { const s = await status({ verifica: true }); if (PAID.includes(s.status)) go('confermato'); else fill(box, notice('info', 'Ancora nessuna conferma.')); } }, 'Verifica ora'),
    box, back()));
}

async function confermato() {
  const st = await status();
  if (!PAID.includes(st.status)) return go('verifica');
  const token = linkStore.get(order);
  fill(root, steps(4), card('Pagamento confermato',
    h('p', { class: 'co-ok' }, `Abbiamo verificato il pagamento di ${euro(st.paidCents)} per l’ordine ${st.number}.`),
    h('p', {}, st.description),
    st.activation ? notice('ok', `Servizio attivato il ${dateTime(st.activation.activatedAt)}. Lo trovi nella tua area riservata.`)
      : st.kind === 'business_installment' ? notice('info', `Rata registrata. Stato del contratto: ${st.contractStatus === 'active' ? 'attivo' : 'in attesa delle condizioni di attivazione previste dal contratto'}.`)
        : notice('info', 'Pagamento registrato.'),
    st.activation && !token ? membershipCard({ product: st.description, holder: 'Titolare del contratto', startsAt: st.activation.activatedAt, months: 12, number: st.number }) : null,
    h('div', { class: 'co-actions' },
      h('button', { class: 'btn btn--primary', type: 'button', onclick: () => downloadReceipt(order, token).catch((e) => alert(e.message)) }, 'Scarica la ricevuta'),
      token ? null : h('a', { class: 'btn btn--ghost', href: st.kind === 'business_installment' ? '/area-business/#contratti' : '/area-cliente/' }, 'Vai all’area riservata')),
    h('p', { class: 'co-muted' }, 'La ricevuta conferma il pagamento ma non è una fattura: il documento fiscale viene emesso separatamente.')));
}

async function annullato() {
  const st = await status({ esito: 'cancelled' }).catch(() => null);
  if (st && PAID.includes(st.status)) return go('confermato');
  fill(root, steps(2), card('Pagamento annullato',
    h('p', {}, 'Hai interrotto il pagamento sulla pagina di myPOS: nessun addebito è stato confermato e nessun servizio è stato attivato.'),
    order ? h('p', { class: 'co-muted' }, `Ordine ${order}${st ? ` · ${ORDER_LABELS[st.status] || st.status}` : ''}`) : null, back()));
}

async function nonRiuscito() {
  const st = await status().catch(() => null);
  if (st && PAID.includes(st.status)) return go('confermato');
  fill(root, steps(2), card('Pagamento non riuscito',
    h('p', {}, 'La transazione non è andata a buon fine. Nessun servizio è stato attivato e nessun importo risulta incassato. Puoi riprovare oppure usare un altro metodo di pagamento.'),
    order ? h('p', { class: 'co-muted' }, `Ordine ${order}`) : null, back()));
}

function fail(e) {
  if (e?.code === 503) return notConfiguredView(root, 'Verifica dei pagamenti');
  fill(root, card('Stato non disponibile', notice('error', e.message), back()));
}

const VIEWS = { verifica, 'in-attesa': inAttesa, confermato, annullato, 'non-riuscito': nonRiuscito };
if (root) {
  if (!backendReady) notConfiguredView(root, 'Verifica dei pagamenti');
  else if (!/^ORD-[0-9A-Z]{12}$/.test(order) && view !== 'annullato') fill(root, card('Ordine non indicato', h('p', {}, 'Il collegamento non contiene un numero d’ordine valido.'), back()));
  else (VIEWS[view] || verifica)().catch(fail);
}
