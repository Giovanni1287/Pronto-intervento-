/**
 * Logica pagamenti condivisa (stessa semantica delle funzioni SQL della
 * migrazione 20261117140100): importi in centesimi interi, IVA, stati
 * dell'ordine, pulizia dei dati del gateway. Nessun I/O.
 */
import { assertCents } from './money.js';

export const VAT_RATES = Object.freeze([0, 4, 5, 10, 22]);

/** Voce a partire dal netto unitario: netto = q × unitario (arrotondato), IVA = netto × aliquota. */
export function lineFromNet({ quantity, unitNetCents, vatRate }) {
  if (!(quantity > 0)) throw new Error('Quantità non valida');
  if (!Number.isInteger(unitNetCents)) throw new Error('Prezzo unitario in centesimi interi');
  if (!VAT_RATES.includes(Number(vatRate))) throw new Error(`Aliquota IVA non prevista: ${vatRate}`);
  const net = Math.round(quantity * unitNetCents);
  const vat = Math.round((net * vatRate) / 100);
  return { netCents: net, vatCents: vat, grossCents: net + vat };
}

/** Voce a partire da un prezzo IVA inclusa (listini consumer): scorporo. */
export function lineFromGross({ grossCents, vatRate }) {
  if (!Number.isInteger(grossCents)) throw new Error('Importo in centesimi interi');
  const net = Math.round((grossCents * 100) / (100 + vatRate));
  return { netCents: net, vatCents: grossCents - net, grossCents };
}

export function orderTotals(lines) {
  const t = lines.reduce((a, l) => ({ netCents: a.netCents + l.netCents, vatCents: a.vatCents + l.vatCents, grossCents: a.grossCents + l.grossCents }), { netCents: 0, vatCents: 0, grossCents: 0 });
  if (t.grossCents <= 0) throw new Error('Totale non valido');
  return t;
}

/** Riepilogo IVA per aliquota (per ricevute e PDF). */
export function vatSummary(lines) {
  const m = new Map();
  for (const l of lines) {
    const k = Number(l.vatRate);
    const x = m.get(k) || { vatRate: k, netCents: 0, vatCents: 0 };
    x.netCents += l.netCents; x.vatCents += l.vatCents;
    m.set(k, x);
  }
  return [...m.values()].sort((a, b) => b.vatRate - a.vatRate);
}

export const ORDER_STATUS = Object.freeze({
  draft: 'Bozza', awaiting_payment: 'In attesa di pagamento', partially_paid: 'Parzialmente pagato', paid: 'Pagato',
  partially_refunded: 'Rimborsato in parte', refunded: 'Rimborsato', cancelled: 'Annullato', expired: 'Scaduto', needs_review: 'Da verificare'
});

const TRANSITIONS = {
  draft: ['awaiting_payment', 'cancelled'],
  awaiting_payment: ['partially_paid', 'paid', 'cancelled', 'expired', 'needs_review'],
  partially_paid: ['paid', 'needs_review'],
  expired: ['paid', 'partially_paid', 'awaiting_payment', 'needs_review'],
  paid: ['partially_refunded', 'refunded', 'needs_review'],
  partially_refunded: ['refunded', 'needs_review'],
  needs_review: ['paid', 'partially_refunded', 'refunded', 'cancelled', 'awaiting_payment'],
  cancelled: ['needs_review'],
  refunded: []
};
export const canOrderTransition = (from, to) => (TRANSITIONS[from] || []).includes(to);

/** Un ordine conta come incasso solo se pagato (transazione verificata o riconciliata). */
export const isCollected = (status) => ['paid', 'partially_refunded', 'refunded'].includes(status);

/**
 * Campi del gateway che si possono registrare. Tutto il resto (PAN, scadenza,
 * token della carta, dati personali, firma) viene scartato prima di qualsiasi log.
 */
export const SAFE_PROVIDER_FIELDS = Object.freeze(['IPCmethod', 'IPCVersion', 'SID', 'Amount', 'Currency', 'OrderID', 'IPC_Trnref', 'RequestSTAN', 'RequestDateTime',
  'PaymentMethod', 'PaymentType', 'CardBrand', 'CardType', 'BillingDescriptor', 'PaymentStatus', 'PaymentReference', 'Status', 'StatusMsg']);
export function sanitizeProviderData(params = {}) {
  return Object.fromEntries(Object.entries(params).filter(([k]) => SAFE_PROVIDER_FIELDS.includes(k)));
}

/** Righe carrello myPOS dalle voci (IVA inclusa); se non quadrano, una riga unica col totale. */
export function cartRows(items, totalCents, fallbackName) {
  assertCents(totalCents);
  const rows = (items || []).filter((i) => i.grossCents > 0).map((i) => {
    const q = Number(i.quantity);
    const unit = Number.isInteger(q) && q > 0 && i.grossCents % q === 0 ? { qty: q, price: i.grossCents / q } : { qty: 1, price: i.grossCents };
    return { name: String(i.name || i.description || fallbackName).slice(0, 100), quantity: unit.qty, priceCents: unit.price, amountCents: unit.qty * unit.price };
  });
  const sum = rows.reduce((n, r) => n + r.amountCents, 0);
  if (!rows.length || sum !== totalCents || (items || []).some((i) => i.grossCents < 0)) {
    return [{ name: String(fallbackName).slice(0, 100), quantity: 1, priceCents: totalCents, amountCents: totalCents }];
  }
  return rows;
}

/** Interpreta un CSV di transazioni esportato da myPOS (intestazioni configurabili). */
export function parseReconciliationCsv(text, map = {}) {
  const cols = { ref: map.ref || ['IPC_Trnref', 'Transaction reference', 'Reference', 'Riferimento'], order: map.order || ['OrderID', 'Order ID', 'Ordine'],
    amount: map.amount || ['Amount', 'Importo'], currency: map.currency || ['Currency', 'Valuta'], date: map.date || ['Date', 'DateTime', 'Data'], status: map.status || ['Status', 'Stato'] };
  const lines = String(text).replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = (lines[0].match(/;/g) || []).length > (lines[0].match(/,/g) || []).length ? ';' : ',';
  const split = (l) => { const out = []; let cur = ''; let q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out.map((x) => x.trim()); };
  const head = split(lines[0]);
  const idx = (names) => head.findIndex((h) => names.some((n) => n.toLowerCase() === h.toLowerCase()));
  const I = Object.fromEntries(Object.entries(cols).map(([k, v]) => [k, idx(v)]));
  if (I.ref < 0 || I.amount < 0) throw new Error('CSV non riconosciuto: servono almeno le colonne riferimento transazione e importo');
  return lines.slice(1).map(split).map((r) => {
    const raw = r[I.amount].replace(/\s/g, '');
    const norm = /,\d{1,2}$/.test(raw) ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
    const cents = Math.round(Number(norm) * 100);
    if (!Number.isFinite(cents)) throw new Error(`Importo non valido: ${r[I.amount]}`);
    const d = I.date >= 0 && r[I.date] ? new Date(r[I.date]) : null;
    return { providerRef: r[I.ref], orderNumber: I.order >= 0 ? r[I.order] || null : null, amountCents: Math.abs(cents), currency: I.currency >= 0 ? r[I.currency] || 'EUR' : 'EUR',
      occurredAt: d && !Number.isNaN(d.getTime()) ? d.toISOString() : null, status: I.status >= 0 ? r[I.status] || null : null };
  }).filter((r) => r.providerRef);
}
