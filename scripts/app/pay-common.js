/**
 * Elementi condivisi del percorso di acquisto (checkout, link di pagamento,
 * pagine di esito). Gli importi mostrati arrivano SEMPRE dal backend: qui si
 * formattano soltanto. Nessun dato di carta viene chiesto o trattato dal sito.
 */
import { h, euro, date, notice, fn } from './core.js';

export const ORDER_LABELS = {
  draft: 'Bozza', awaiting_payment: 'In attesa di pagamento', partially_paid: 'Parzialmente pagato', paid: 'Pagato', partially_refunded: 'Rimborsato in parte',
  refunded: 'Rimborsato', cancelled: 'Annullato', expired: 'Scaduto', needs_review: 'In verifica'
};

export const minutes = (m) => (m % 60 === 0 ? `${m / 60} ${m === 60 ? 'ora' : 'ore'}` : `${m} minuti`);

export function steps(active) {
  const s = ['Riepilogo', 'Condizioni', 'Pagamento sicuro', 'Conferma'];
  return h('ol', { class: 'co-steps', 'aria-label': 'Fasi dell’acquisto' }, s.map((l, i) => h('li', { class: i < active ? 'is-done' : i === active ? 'is-active' : '', 'aria-current': i === active ? 'step' : null }, h('span', {}, String(i + 1)), l)));
}

/** Scheda di riepilogo dell'ordine (dati dal backend). */
export function summaryCard(o, { customer, place } = {}) {
  const rows = [];
  if (customer) rows.push(['Cliente', customer]);
  if (place) rows.push([o.kind === 'business_installment' ? 'Sede / contratto' : 'Immobile coperto', place]);
  if (o.contractNumber) rows.push(['Contratto', `${o.contractNumber}${o.installmentLabel ? ` — ${o.installmentLabel}` : ''}`]);
  if (o.interventionNumber) rows.push(['Intervento', o.interventionNumber]);
  if (o.durationMonths) rows.push(['Durata', `${o.durationMonths} mesi, senza rinnovo automatico`]);
  const incl = [];
  if (o.visits) incl.push(`${o.visits} uscite`);
  if (o.interventions) incl.push(`${o.interventions} interventi`);
  if (o.checkups) incl.push(`${o.checkups} controlli`);
  if (o.maxMinutes) incl.push(`fino a ${minutes(o.maxMinutes)} per intervento`);
  if (o.callFeeIncluded === true) incl.push('diritto di chiamata incluso');
  return h('section', { class: 'co-card co-summary', 'aria-labelledby': 'co-prod' },
    h('p', { class: 'co-eyebrow' }, o.number ? `Ordine ${o.number}` : 'Riepilogo'),
    h('h2', { id: 'co-prod', class: 'co-title' }, o.product || o.description),
    o.product && o.description !== o.product ? h('p', { class: 'co-muted' }, o.description) : null,
    rows.length ? h('dl', { class: 'co-dl' }, rows.map(([k, v]) => h('div', {}, h('dt', {}, k), h('dd', {}, v)))) : null,
    incl.length ? h('p', { class: 'co-chips' }, incl.map((x) => h('span', { class: 'co-chip' }, x))) : null,
    (o.included || []).length ? h('div', { class: 'co-block' }, h('h3', {}, 'Prestazioni incluse'), h('ul', { class: 'co-list co-list--ok' }, o.included.map((x) => h('li', {}, x)))) : null,
    (o.exclusions || []).length ? h('details', { class: 'co-block' }, h('summary', {}, 'Esclusioni'), h('ul', { class: 'co-list co-list--ko' }, o.exclusions.map((x) => h('li', {}, x)))) : null,
    o.notInsurance ? notice('info', 'Servizio di assistenza tecnica: non è un’assicurazione e non prevede risarcimenti.') : null,
    o.legalProtection ? h('p', { class: 'co-legal' }, o.legalProtection) : null,
    o.activationRule ? h('p', { class: 'co-muted' }, o.activationRule === 'full_payment' ? 'Il contratto si attiva a pagamento completo di tutte le rate previste.' : 'Il contratto si attiva al pagamento della prima rata, come previsto dal contratto.') : null,
    totals(o));
}

export function totals(o) {
  const items = o.items || [];
  return h('div', { class: 'co-totals' },
    items.length ? h('table', { class: 'co-items' },
      h('caption', { class: 'visually-hidden' }, 'Voci dell’ordine'),
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Voce'), h('th', { scope: 'col' }, 'IVA'), h('th', { scope: 'col' }, 'Importo'))),
      h('tbody', {}, items.map((i) => h('tr', {}, h('td', {}, i.description, Number(i.quantity) !== 1 ? h('small', {}, ` × ${Number(i.quantity).toLocaleString('it-IT')}`) : null),
        h('td', {}, `${Number(i.vatRate)}%`), h('td', {}, (i.grossCents < 0 ? '−' : '') + euro(Math.abs(i.grossCents))))))) : null,
    h('dl', { class: 'co-sum' },
      h('div', {}, h('dt', {}, 'Imponibile'), h('dd', {}, euro(o.netCents))),
      h('div', {}, h('dt', {}, 'IVA'), h('dd', {}, euro(o.vatCents))),
      h('div', { class: 'co-sum__total' }, h('dt', {}, 'Totale da pagare'), h('dd', {}, euro(o.grossCents - (o.paidCents || 0))))));
}

/** Blocco condizioni con casella NON preselezionata. */
export function termsBlock(o, { termsUrl, id = 'co-terms' } = {}) {
  const cb = h('input', { type: 'checkbox', id, required: true });
  const box = h('section', { class: 'co-card co-terms', 'aria-labelledby': `${id}-t` },
    h('h2', { id: `${id}-t`, class: 'co-title co-title--sm' }, 'Condizioni contrattuali'),
    h('p', { class: 'co-muted' }, `Versione delle condizioni: ${o.termsVersion || '—'}. Prezzo e condizioni restano quelli di questo riepilogo per tutta la durata, anche se il listino cambia.`),
    termsUrl ? h('p', {}, h('a', { href: termsUrl, target: '_blank', rel: 'noopener' }, 'Leggi le condizioni complete')) : h('p', { class: 'co-muted' }, 'Le condizioni definitive sono in revisione legale: la vendita resta disattivata finché non sono pubblicate.'),
    o.kind === 'family_contract' || o.kind === 'protected_purchase' ? h('p', { class: 'co-muted' }, 'Puoi recedere entro 14 giorni dalla conclusione del contratto secondo il Codice del Consumo; il servizio si attiva solo dopo la verifica del pagamento.') : null,
    h('div', { class: 'co-check' }, cb, h('label', { for: id }, 'Ho letto e accetto le condizioni contrattuali e il riepilogo dell’ordine.')));
  return { box, accepted: () => cb.checked, input: cb };
}

export function securePayNote() {
  return h('p', { class: 'co-secure' },
    h('span', { 'aria-hidden': 'true' }, '🔒 '), 'Il pagamento avviene sulla pagina sicura di myPOS: il sito non riceve né conserva i dati della carta. ',
    'L’ordine risulta pagato solo dopo la verifica della transazione da parte del nostro sistema.');
}

/** Tessera digitale (dopo l'attivazione). */
export function membershipCard({ product, holder, place, startsAt, months, number }) {
  const end = startsAt && months ? new Date(new Date(startsAt).setMonth(new Date(startsAt).getMonth() + Number(months))) : null;
  return h('div', { class: 'co-member', role: 'group', 'aria-label': 'Tessera digitale PRONTO+' },
    h('p', { class: 'co-member__brand' }, 'PRONTO', h('span', {}, '+')),
    h('p', { class: 'co-member__plan' }, product),
    h('dl', {}, h('div', {}, h('dt', {}, 'Titolare'), h('dd', {}, holder || '—')), place ? h('div', {}, h('dt', {}, 'Copertura'), h('dd', {}, place)) : null,
      h('div', {}, h('dt', {}, 'Validità'), h('dd', {}, startsAt ? `${date(startsAt)} – ${date(end)}` : '—')), h('div', {}, h('dt', {}, 'Ordine'), h('dd', {}, number))));
}

export async function downloadReceipt(orderNumber, linkToken) {
  const r = await fn('payment-receipt', { query: `?ordine=${encodeURIComponent(orderNumber)}`, headers: linkToken ? { 'X-Payment-Link': linkToken } : {} });
  if (!r.ok) throw new Error(r.status === 503 ? 'Ricevute non ancora configurate' : 'Ricevuta non disponibile');
  window.open(URL.createObjectURL(await r.blob()), '_blank', 'noopener');
}

/** Token del link di pagamento conservato per la sessione (mai nell'URL inviato al server). */
export const linkStore = {
  set(order, token) { try { sessionStorage.setItem(`pir.link.${order}`, token); } catch { /* storage non disponibile */ } },
  get(order) { try { return sessionStorage.getItem(`pir.link.${order}`); } catch { return null; } }
};
