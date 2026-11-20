/** Importi sempre in centesimi interi (mai float). */

export function assertCents(v, label = 'importo') {
  if (!Number.isInteger(v) || v < 0) throw new Error(`${label} non valido: deve essere un intero in centesimi ≥ 0`);
  return v;
}

/** "149 €" / "1.900 €" per importi interi, "149,50 €" altrimenti (formato italiano). */
export function euro(cents) {
  assertCents(cents);
  const whole = cents % 100 === 0;
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
    useGrouping: 'always' // "1.900 €" anche sotto le 10.000 unità
  }).format(cents / 100).replace(/ /g, ' ');
}

/** Scorporo IVA da un prezzo lordo (IVA inclusa). */
export function vatBreakdown(grossCents, ratePct) {
  assertCents(grossCents);
  const net = Math.round((grossCents * 100) / (100 + ratePct));
  return { gross: grossCents, net, vat: grossCents - net, rate: ratePct };
}

/** Conversione per gateway: centesimi → "149.00". */
export const toDecimalString = (cents) => (assertCents(cents) / 100).toFixed(2);

/** "149.00" / "149" / 149 → 14900 (rifiuta valori ambigui). */
export function fromDecimal(v) {
  const s = String(v).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Importo non valido: ${v}`);
  const [i, d = ''] = s.split('.');
  return Number(i) * 100 + Number(d.padEnd(2, '0'));
}
