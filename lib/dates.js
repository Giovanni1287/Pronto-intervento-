/** Utilità date (UTC, nessuna dipendenza). */

const toDate = (d) => (d instanceof Date ? new Date(d.getTime()) : new Date(d));

/** Aggiunge mesi mantenendo il giorno; se il mese non lo ha usa l'ultimo giorno (31/01 + 1 → 28/02). */
export function addMonths(date, months) {
  const d = toDate(date);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

export const addDays = (date, days) => new Date(toDate(date).getTime() + days * 86400000);

export const isBefore = (a, b) => toDate(a).getTime() < toDate(b).getTime();

export const daysBetween = (a, b) => Math.floor((toDate(b).getTime() - toDate(a).getTime()) / 86400000);

export const isoDate = (d) => toDate(d).toISOString().slice(0, 10);

/** "17/11/2026" */
export const itDate = (d) => {
  const x = toDate(d);
  return `${String(x.getUTCDate()).padStart(2, '0')}/${String(x.getUTCMonth() + 1).padStart(2, '0')}/${x.getUTCFullYear()}`;
};
