/**
 * Ricevuta di conferma del pagamento (PDF, lato server). Deterministica.
 * NON è una fattura né un documento fiscale: lo dichiara in modo evidente e,
 * se presente, riporta solo il riferimento al documento emesso dal sistema di
 * fatturazione dell'impresa.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { euro } from './money.js';
import { itDate } from './dates.js';
import { vatSummary } from './payments.js';

const NAVY = rgb(8 / 255, 29 / 255, 48 / 255);
const BLUE = rgb(0, 107 / 255, 230 / 255);
const ORANGE = rgb(1, 120 / 255, 36 / 255);
const ICE = rgb(243 / 255, 246 / 255, 250 / 255);
const MUTED = rgb(81 / 255, 98 / 255, 122 / 255);
const LINE = rgb(217 / 255, 225 / 255, 236 / 255);
const A4 = [595.28, 841.89];
const M = 48;
export const RECEIPT_DISCLAIMER = 'Ricevuta di conferma del pagamento: non costituisce fattura né documento fiscale. Il documento fiscale è emesso separatamente secondo le norme applicabili.';
const METHOD = { card: 'Carta (checkout myPOS)', bank_transfer: 'Bonifico', riba: 'RiBa', cash: 'Contanti', pos: 'POS', mypos_paylink: 'myPOS PayLink', other: 'Altro' };

const safe = (font, t) => [...String(t ?? '')].map((ch) => { try { font.encodeText(ch); return ch; } catch { return '?'; } }).join('');

export async function renderReceiptPdf(r) {
  const doc = await PDFDocument.create();
  const when = new Date(r.paidAt || r.createdAt || '2026-01-01T00:00:00Z');
  doc.setTitle(`Ricevuta ${r.number}`); doc.setAuthor(r.company?.name || 'Pronto Intervento Roma'); doc.setProducer('Pronto Intervento Roma');
  doc.setCreator('Pronto Intervento Roma'); doc.setCreationDate(when); doc.setModificationDate(when);
  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  const page = doc.addPage(A4);
  const text = (t, x, y, { font = reg, size = 10, color = NAVY } = {}) => page.drawText(safe(font, t), { x, y, size, font, color });
  const rtext = (t, x, y, o = {}) => { const f = o.font || reg; text(t, x - f.widthOfTextAtSize(safe(f, t), o.size || 10), y, o); };

  page.drawRectangle({ x: 0, y: A4[1] - 110, width: A4[0], height: 110, color: NAVY });
  page.drawRectangle({ x: 0, y: A4[1] - 114, width: A4[0], height: 4, color: ORANGE });
  const lx = M, ly = A4[1] - 34;
  page.drawSvgPath('M12 2h24a10 10 0 0 1 10 10v24a10 10 0 0 1-10 10H12A10 10 0 0 1 2 36V12A10 10 0 0 1 12 2z', { x: lx, y: ly, color: BLUE });
  page.drawSvgPath('M15 36V13h10.5a7.5 7.5 0 0 1 0 15H15', { x: lx, y: ly, borderColor: rgb(1, 1, 1), borderWidth: 5 });
  page.drawCircle({ x: lx + 36, y: ly - 36, size: 9, color: ORANGE, borderColor: NAVY, borderWidth: 2.5 });
  text('PRONTO INTERVENTO', lx + 60, A4[1] - 48, { font: bold, size: 13, color: rgb(1, 1, 1) });
  text('RICEVUTA DI PAGAMENTO', lx + 60, A4[1] - 66, { font: bold, size: 10, color: rgb(1, 0.82, 0.7) });
  rtext(r.number, A4[0] - M, A4[1] - 48, { font: mono, size: 13, color: rgb(1, 1, 1) });
  rtext(`Pagato il ${itDate(r.paidAt)}`, A4[0] - M, A4[1] - 66, { size: 9, color: rgb(0.8, 0.86, 0.92) });

  let y = A4[1] - 140;
  const box = (h) => page.drawRectangle({ x: M, y: y - h, width: A4[0] - 2 * M, height: h, color: rgb(1, 0.95, 0.9), borderColor: ORANGE, borderWidth: 0.8 });
  box(26); text(RECEIPT_DISCLAIMER.split('. ')[0] + '.', M + 10, y - 16, { font: bold, size: 8.5, color: rgb(0.42, 0.18, 0.02) }); y -= 42;

  const kv = [['Impresa', [r.company?.legalName || r.company?.name, r.company?.vatNumber && `P.IVA ${r.company.vatNumber}`].filter(Boolean).join(' · ') || 'Pronto Intervento Roma'],
    ['Cliente', r.customerName || '—'], ['Oggetto', r.description], ['Riferimento', [r.contractNumber && `Contratto ${r.contractNumber}`, r.interventionNumber && `Intervento ${r.interventionNumber}`].filter(Boolean).join(' · ') || '—'],
    ['Stato del pagamento', { paid: 'Pagato', partially_refunded: 'Pagato, rimborsato in parte', refunded: 'Rimborsato' }[r.status] || r.status]];
  for (const [k, v] of kv) { text(k.toUpperCase(), M, y, { font: bold, size: 7, color: BLUE }); text(String(v).slice(0, 95), M + 120, y, { size: 10 }); y -= 18; }

  y -= 8;
  page.drawRectangle({ x: M, y: y - 18, width: A4[0] - 2 * M, height: 18, color: NAVY });
  text('DESCRIZIONE', M + 8, y - 12.5, { font: bold, size: 7, color: rgb(1, 1, 1) });
  rtext('IVA', A4[0] - M - 150, y - 12.5, { font: bold, size: 7, color: rgb(1, 1, 1) });
  rtext('TOTALE', A4[0] - M - 8, y - 12.5, { font: bold, size: 7, color: rgb(1, 1, 1) });
  y -= 18;
  for (const it of r.items || []) {
    text(String(it.description).slice(0, 70), M + 8, y - 14, { size: 9.5 });
    rtext(`${Number(it.vatRate)}%`, A4[0] - M - 150, y - 14, { size: 9.5 });
    rtext((it.grossCents < 0 ? '-' : '') + euro(Math.abs(it.grossCents)), A4[0] - M - 8, y - 14, { font: bold, size: 9.5 });
    y -= 22; page.drawLine({ start: { x: M, y }, end: { x: A4[0] - M, y }, thickness: 0.5, color: LINE });
  }
  y -= 14;
  const vs = vatSummary(r.items || []);
  for (const v of vs) { rtext(`Imponibile ${Number(v.vatRate)}%: ${euro(Math.max(v.netCents, 0))} · IVA ${euro(Math.max(v.vatCents, 0))}`, A4[0] - M - 8, y, { size: 9, color: MUTED }); y -= 14; }
  page.drawRectangle({ x: A4[0] - M - 240, y: y - 8, width: 240, height: 22, color: ICE });
  rtext('Totale pagato', A4[0] - M - 110, y, { font: bold, size: 11 }); rtext(euro(r.paidCents), A4[0] - M - 8, y, { font: bold, size: 11 }); y -= 34;

  text('Transazioni registrate', M, y, { font: bold, size: 11.5 }); y -= 18;
  for (const t of r.transactions || []) {
    text(`${t.type === 'purchase' ? 'Pagamento' : t.type === 'refund' ? 'Rimborso' : 'Storno'} · ${METHOD[t.method] || t.method} · ${itDate(t.at)}`, M, y, { size: 9.5 });
    rtext(euro(t.amountCents), A4[0] - M, y, { size: 9.5 }); y -= 12;
    text(`Riferimento: ${t.reference}`, M, y, { font: mono, size: 8, color: MUTED }); y -= 18;
  }
  if ((r.invoices || []).length) {
    y -= 6; text('Documenti fiscali collegati', M, y, { font: bold, size: 11.5 }); y -= 18;
    for (const i of r.invoices) { text(`${i.type === 'nota_di_credito' ? 'Nota di credito' : 'Fattura'} n. ${i.number} del ${itDate(i.date)}`, M, y, { size: 9.5 }); y -= 14; }
  } else {
    y -= 6; text('Documento fiscale: emesso separatamente dall’impresa (riferimento non ancora collegato).', M, y, { size: 9, color: MUTED });
  }
  page.drawLine({ start: { x: M, y: 70 }, end: { x: A4[0] - M, y: 70 }, thickness: 0.6, color: LINE });
  RECEIPT_DISCLAIMER.split(/(?<=\.) /).forEach((line, i) => text(line, M, 56 - i * 10, { size: 7.5, color: MUTED }));
  return doc.save({ useObjectStreams: false });
}
