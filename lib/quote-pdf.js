/**
 * PDF del preventivo B2B (lato server, pdf-lib). Deterministico: gli stessi
 * dati (quote_document) producono lo stesso documento.
 * - Non contiene MAI costi interni né margini (non arrivano dal database).
 * - Se i dati aziendali di Pronto Intervento Roma non sono verificati, il
 *   documento lo dichiara e porta la filigrana "BOZZA".
 * - Un preventivo non ancora inviato (bozza/approvato) porta la filigrana "BOZZA".
 */
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { euro } from './money.js';
import { itDate } from './dates.js';

const NAVY = rgb(8 / 255, 29 / 255, 48 / 255);
const BLUE = rgb(0, 107 / 255, 230 / 255);
const ORANGE = rgb(1, 120 / 255, 36 / 255);
const ICE = rgb(243 / 255, 246 / 255, 250 / 255);
const MUTED = rgb(81 / 255, 98 / 255, 122 / 255);
const LINE = rgb(217 / 255, 225 / 255, 236 / 255);
const INK = rgb(0.16, 0.23, 0.31);
const A4 = [595.28, 841.89];
const M = 48;

export const QUOTE_DISCLAIMER =
  'Preventivo non vincolante fino all’accettazione scritta. L’accettazione non attiva automaticamente il contratto: l’attivazione avviene dopo l’approvazione di Pronto Intervento Roma, la firma del contratto e la verifica del pagamento. Il servizio non è una polizza assicurativa.';
export const MATERIALS_EXCLUDED = 'Materiali, ricambi, noleggi di macchinari specialistici e lavori complessi sono esclusi e preventivati a parte.';
const PAYMENT_PLAN = { annual: 'Pagamento annuale anticipato', quarterly: 'Pagamento trimestrale (approvato)', custom: 'Fatturazione personalizzata' };
const LINE_NAME = { business: 'PRONTO+ Business', hotel: 'PRONTO+ Hotel', corporate: 'PRONTO+ Corporate' };

function safe(font, text) {
  return [...String(text ?? '')].map((ch) => { try { font.encodeText(ch); return ch; } catch { return ch === '€' ? 'EUR' : '?'; } }).join('');
}
function wrap(font, text, size, width) {
  const out = [];
  for (const para of safe(font, text).split('\n')) {
    let line = '';
    for (const w of para.split(/\s+/)) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) > width && line) { out.push(line); line = w; } else line = t;
    }
    out.push(line);
  }
  return out;
}
const hours = (m) => (m % 60 === 0 ? `${m / 60} ore` : `${Math.floor(m / 60)} ore e ${m % 60} minuti`);

/** Righe "prestazioni incluse" ricavate dai dati del preventivo (nessun valore inventato). */
export function includedLines(q) {
  const b = q.terms?.benefits || {};
  const out = [];
  const visits = q.includedVisits || 0;
  const calls = b.callFee || 0;
  if (calls) out.push(`${calls} diritti di chiamata (uscite) inclusi`);
  else if (visits) out.push(`${visits} uscite incluse`);
  if (b.smallIntervention) out.push(`${b.smallIntervention} piccoli interventi fino a ${b.smallInterventionMaxMinutes || 45} minuti, durante le uscite incluse`);
  if (b.scheduledVisits) out.push(`${b.scheduledVisits} visite di controllo programmate`);
  const minutes = b.maintenanceMinutes || q.includedMinutes || 0;
  if (minutes) out.push(`Monte ore di piccola manutenzione: ${hours(minutes)}`);
  if (q.terms?.discountPct) out.push(`Sconto del ${q.terms.discountPct}% sulla manodopera ordinaria aggiuntiva`);
  for (const x of q.terms?.included || []) out.push(String(x));
  return out.length ? out : ['Prestazioni come da elenco dei servizi proposti.'];
}

/** Filigrana "BOZZA": preventivo non ancora inviato o dati aziendali non verificati. */
export const quoteIsDraft = (q) => !['sent', 'accepted'].includes(q.status) || !q.company?.verified;

/**
 * @param q oggetto restituito dalla RPC quote_document
 * @param opts { logo?: boolean }
 */
export async function renderQuotePdf(q) {
  const doc = await PDFDocument.create();
  const when = new Date(`${q.date || '2026-01-01'}T12:00:00Z`);
  const company = q.company || {};
  const verified = Boolean(company.verified);
  const draft = quoteIsDraft(q);
  doc.setTitle(`Preventivo ${q.number}`);
  doc.setAuthor(company.name || 'Pronto Intervento Roma');
  doc.setSubject(q.title || 'Preventivo');
  doc.setProducer('Pronto Intervento Roma');
  doc.setCreator('Pronto Intervento Roma');
  doc.setCreationDate(when);
  doc.setModificationDate(when);

  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  let page = doc.addPage(A4);
  let y;
  const width = A4[0] - M * 2;
  const newPage = () => { page = doc.addPage(A4); y = A4[1] - M; };
  const ensure = (h) => { if (y - h < 96) newPage(); };
  const text = (t, x, yy, { font = reg, size = 10, color = NAVY } = {}) => page.drawText(safe(font, t), { x, y: yy, size, font, color });
  const rtext = (t, x, yy, { font = reg, size = 10, color = NAVY } = {}) => text(t, x - font.widthOfTextAtSize(safe(font, t), size), yy, { font, size, color });

  /* ---------- intestazione con logo vettoriale */
  page.drawRectangle({ x: 0, y: A4[1] - 118, width: A4[0], height: 118, color: NAVY });
  page.drawRectangle({ x: 0, y: A4[1] - 122, width: A4[0], height: 4, color: ORANGE });
  const lx = M, ly = A4[1] - 40;
  page.drawSvgPath('M12 2h24a10 10 0 0 1 10 10v24a10 10 0 0 1-10 10H12A10 10 0 0 1 2 36V12A10 10 0 0 1 12 2z', { x: lx, y: ly, color: BLUE });
  page.drawSvgPath('M15 36V13h10.5a7.5 7.5 0 0 1 0 15H15', { x: lx, y: ly, borderColor: rgb(1, 1, 1), borderWidth: 5 });
  page.drawCircle({ x: lx + 36, y: ly - 36, size: 9, color: ORANGE, borderColor: NAVY, borderWidth: 2.5 });
  page.drawSvgPath('M36 31.5v9M31.5 36h9', { x: lx, y: ly, borderColor: rgb(1, 1, 1), borderWidth: 2.6 });
  text('PRONTO INTERVENTO', lx + 60, A4[1] - 54, { font: bold, size: 13, color: rgb(1, 1, 1) });
  text('R O M A', lx + 60, A4[1] - 70, { font: bold, size: 12, color: rgb(47 / 255, 139 / 255, 1) });
  text(`PREVENTIVO ${LINE_NAME[q.line] || 'PRONTO+'}`.toUpperCase(), lx + 60, A4[1] - 96, { font: bold, size: 10, color: rgb(1, 0.82, 0.7) });
  const rx = A4[0] - M;
  rtext(q.number, rx, A4[1] - 54, { font: mono, size: 13, color: rgb(1, 1, 1) });
  rtext(`Data ${itDate(q.date)} · valido fino al ${itDate(q.validUntil)}`, rx, A4[1] - 72, { size: 9, color: rgb(0.8, 0.86, 0.92) });
  rtext(q.status === 'accepted' ? 'ACCETTATO' : q.status === 'sent' ? 'PROPOSTA' : 'BOZZA', rx, A4[1] - 96, { font: bold, size: 9, color: q.status === 'accepted' ? rgb(0.55, 0.9, 0.65) : ORANGE });
  y = A4[1] - 146;

  /* ---------- avviso dati aziendali */
  if (!verified) {
    const msg = wrap(bold, 'Dati aziendali di Pronto Intervento Roma da completare e verificare (ragione sociale, partita IVA, sede legale, PEC): documento non valido come offerta finché non sono inseriti.', 9, width - 24);
    const h = msg.length * 12 + 16;
    page.drawRectangle({ x: M, y: y - h, width, height: h, color: rgb(1, 0.95, 0.9), borderColor: ORANGE, borderWidth: 0.8 });
    msg.forEach((l, i) => text(l, M + 12, y - 16 - i * 12, { font: bold, size: 9, color: rgb(0.42, 0.18, 0.02) }));
    y -= h + 12;
  }

  /* ---------- parti: impresa e cliente */
  const cl = q.client || {};
  const parties = [
    ['Fornitore', [company.legalName || company.name || 'Pronto Intervento Roma', company.vatNumber ? `P.IVA ${company.vatNumber}` : 'P.IVA da completare', company.address || 'Sede legale da completare', company.pec ? `PEC ${company.pec}` : null, company.owner ? `Titolare: ${company.owner}` : null].filter(Boolean)],
    ['Cliente', [cl.name || 'Cliente da indicare', cl.vatNumber ? `P.IVA ${cl.vatNumber}` : null, cl.address || cl.zone || null, cl.pec ? `PEC ${cl.pec}` : cl.email || null, cl.sdi ? `Codice SDI ${cl.sdi}` : cl.contact ? `Referente: ${cl.contact}` : null].filter(Boolean)]
  ];
  const colW = (width - 16) / 2;
  const ph = Math.max(...parties.map(([, ls]) => ls.reduce((n, l) => n + wrap(reg, l, 9.5, colW - 20).length, 0))) * 12.5 + 34;
  parties.forEach(([k, ls], j) => {
    const x = M + j * (colW + 16);
    page.drawRectangle({ x, y: y - ph, width: colW, height: ph, color: ICE, borderColor: LINE, borderWidth: 0.8 });
    text(k.toUpperCase(), x + 10, y - 15, { font: bold, size: 7, color: BLUE });
    let yy = y - 30;
    ls.forEach((l, i) => wrap(i ? reg : bold, l, i ? 9.5 : 10.5, colW - 20).forEach((w) => { text(w, x + 10, yy, { font: i ? reg : bold, size: i ? 9.5 : 10.5, color: i ? INK : NAVY }); yy -= 12.5; }));
  });
  y -= ph + 16;

  const section = (title, body, { size = 10 } = {}) => {
    const lines = Array.isArray(body) ? body.flatMap((l) => wrap(reg, l, size, width)) : wrap(reg, body || '—', size, width);
    ensure(34 + Math.min(lines.length, 5) * 14);
    text(title, M, y, { font: bold, size: 11.5 });
    page.drawLine({ start: { x: M, y: y - 6 }, end: { x: M + width, y: y - 6 }, thickness: 0.8, color: LINE });
    y -= 22;
    for (const l of lines) { ensure(14); text(l, M, y, { size, color: INK }); y -= 14; }
    y -= 8;
  };

  section('Oggetto', q.title || '—');

  /* ---------- tabella dei servizi proposti */
  ensure(60);
  text('Servizi proposti', M, y, { font: bold, size: 11.5 });
  y -= 14;
  const cols = [{ k: 'Descrizione', w: width - 230 }, { k: 'Q.tà', w: 50, r: true }, { k: 'Prezzo unit.', w: 85, r: true }, { k: 'Totale', w: 95, r: true }];
  const header = () => {
    page.drawRectangle({ x: M, y: y - 18, width, height: 18, color: NAVY });
    let x = M + 8;
    cols.forEach((c) => { if (c.r) rtext(c.k.toUpperCase(), x + c.w - 16, y - 12.5, { font: bold, size: 7, color: rgb(1, 1, 1) }); else text(c.k.toUpperCase(), x, y - 12.5, { font: bold, size: 7, color: rgb(1, 1, 1) }); x += c.w; });
    y -= 18;
  };
  header();
  for (const it of q.items || []) {
    const desc = wrap(reg, `${it.description}${it.location ? ` — ${it.location}` : ''}`, 9.5, cols[0].w - 10);
    const h = desc.length * 12 + 10;
    if (y - h < 110) { newPage(); header(); }
    let x = M + 8;
    desc.forEach((l, i) => text(l, x, y - 14 - i * 12, { size: 9.5, color: INK }));
    x += cols[0].w;
    rtext(`${Number(it.quantity).toLocaleString('it-IT')} ${it.unit || ''}`.trim(), x + cols[1].w - 16, y - 14, { size: 9.5, color: INK });
    x += cols[1].w;
    rtext(euro(it.unitPriceCents), x + cols[2].w - 16, y - 14, { size: 9.5, color: INK });
    x += cols[2].w;
    rtext(euro(it.totalCents), x + cols[3].w - 16, y - 14, { font: bold, size: 9.5 });
    y -= h;
    page.drawLine({ start: { x: M, y }, end: { x: M + width, y }, thickness: 0.5, color: LINE });
  }
  if (!(q.items || []).length) { text('Nessuna voce inserita.', M + 8, y - 14, { size: 9.5, color: MUTED }); y -= 24; }

  /* ---------- totali */
  ensure(70);
  y -= 8;
  const tot = [['Imponibile', euro(q.netCents || 0)], [`IVA ${Number(q.vatRate)}% (se applicabile)`, euro(q.vatCents || 0)], ['Totale', euro(q.grossCents || 0)]];
  tot.forEach(([k, v], i) => {
    const last = i === tot.length - 1;
    if (last) page.drawRectangle({ x: M + width - 240, y: y - 6, width: 240, height: 20, color: ICE });
    rtext(k, M + width - 110, y, { font: last ? bold : reg, size: last ? 11 : 9.5, color: last ? NAVY : INK });
    rtext(v, M + width - 8, y, { font: bold, size: last ? 11 : 9.5 });
    y -= last ? 26 : 15;
  });

  /* ---------- condizioni */
  const locs = (q.locations || []).map((l) => (typeof l === 'string' ? l : [l.code, l.name, l.address].filter(Boolean).join(' — ')));
  section('Sedi coperte', locs.length ? locs.map((l) => `• ${l}`) : ['Sedi da indicare nel contratto.']);
  section('Prestazioni incluse', includedLines(q).map((l) => `• ${l}`));
  section('Esclusioni', [MATERIALS_EXCLUDED, 'Interventi fuori fascia oraria, festivi o fuori zona: con le maggiorazioni indicate nel contratto.', 'Le visite di controllo non sostituiscono le verifiche periodiche obbligatorie per legge.']);
  const extra = q.terms?.rates;
  section('Condizioni economiche e di pagamento', [
    `Durata: ${q.durationMonths} mesi dalla data di attivazione. Nessun rinnovo automatico.`,
    [PAYMENT_PLAN[q.paymentPlan] || q.paymentPlan, q.paymentTerms].filter((t, i, a) => t && a.findIndex((x) => String(x).replace(/\.$/, '') === String(t).replace(/\.$/, '')) === i).map((t) => String(t).replace(/\.$/, '')).join('. ') + '.',
    extra ? `Prestazioni non incluse: manodopera ${euro(extra.hourlyLaborCents)} + IVA/ora, diritto di chiamata ${euro(extra.callFeeCents)} + IVA.` : 'Prestazioni non incluse: secondo le tariffe indicate nel contratto.',
    `Validità dell’offerta: fino al ${itDate(q.validUntil)}.`,
    'Il cliente non è considerato pagante finché il pagamento non è verificato dal sistema di pagamento o riconciliato.'
  ]);

  /* ---------- accettazione */
  ensure(130);
  text('Accettazione del cliente', M, y, { font: bold, size: 11.5 });
  page.drawLine({ start: { x: M, y: y - 6 }, end: { x: M + width, y: y - 6 }, thickness: 0.8, color: LINE });
  y -= 24;
  if (q.acceptedBy) {
    text(`Accettato da ${q.acceptedBy} il ${itDate(q.acceptedAt)}.`, M, y, { font: bold, size: 10 });
    y -= 14;
    text('Impronta SHA-256 della versione accettata:', M, y, { size: 8, color: MUTED });
    y -= 11;
    if (q.acceptedHash) { text(q.acceptedHash, M, y, { font: mono, size: 7.2, color: MUTED }); y -= 14; }
  } else {
    const box = (x, label) => {
      page.drawRectangle({ x, y: y - 62, width: colW, height: 62, borderColor: LINE, borderWidth: 0.8 });
      text(label, x + 10, y - 14, { font: bold, size: 7.5, color: MUTED });
    };
    box(M, 'LUOGO E DATA');
    box(M + colW + 16, 'TIMBRO E FIRMA DEL LEGALE RAPPRESENTANTE');
    y -= 76;
  }

  /* ---------- filigrana e piè di pagina */
  const pages = doc.getPages();
  pages.forEach((pg, i) => {
    if (draft) pg.drawText('BOZZA', { x: 150, y: 300, size: 110, font: bold, color: rgb(0.85, 0.2, 0.15), opacity: 0.1, rotate: degrees(40) });
    pg.drawLine({ start: { x: M, y: 74 }, end: { x: A4[0] - M, y: 74 }, thickness: 0.6, color: LINE });
    wrap(reg, QUOTE_DISCLAIMER, 7.5, width - 60).forEach((l, n) => pg.drawText(l, { x: M, y: 61 - n * 9.5, size: 7.5, font: reg, color: MUTED }));
    const pn = `Pagina ${i + 1} di ${pages.length}`;
    pg.drawText(pn, { x: A4[0] - M - reg.widthOfTextAtSize(pn, 8), y: 30, size: 8, font: reg, color: MUTED });
  });
  return doc.save({ useObjectStreams: false });
}
