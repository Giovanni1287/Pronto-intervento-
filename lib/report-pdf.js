/**
 * PDF del "Rapporto di intervento" (lato server, Prompt 5).
 * Generato SOLO dal rapporto approvato (versione conservata con impronta SHA-256):
 * stesso rapporto → stesso documento. Non è una dichiarazione di conformità né
 * una certificazione obbligatoria. Usa pdf-lib (MIT) e l'encoder QR interno.
 */
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { qrMatrix } from './qr.js';
import { itDate } from './dates.js';
import { LEGAL_PROTECTION_TEXT } from './certificates.js';
import { REPORT_DISCLAIMER, LEGAL_DEFECTS_TEXT } from './operations.js';

const NAVY = rgb(8 / 255, 29 / 255, 48 / 255);
const BLUE = rgb(0, 107 / 255, 230 / 255);
const ORANGE = rgb(1, 120 / 255, 36 / 255);
const ICE = rgb(243 / 255, 246 / 255, 250 / 255);
const MUTED = rgb(81 / 255, 98 / 255, 122 / 255);
const LINE = rgb(217 / 255, 225 / 255, 236 / 255);
const TEXT = rgb(0.16, 0.23, 0.31);
const A4 = [595.28, 841.89];
const M = 48;

const safe = (font, text) => [...String(text ?? '')].map((ch) => { try { font.encodeText(ch); return ch; } catch { return '?'; } }).join('');
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
const time = (d) => (d ? new Date(d).toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }) : '—');
const UNIT = { pz: 'pz', m: 'm', kg: 'kg', l: 'l', conf: 'conf.', h: 'h', mq: 'm²' };

/**
 * @param doc risultato di public.intervention_report_document: { number, version, approvedAt, hash, data, company, protectedPlan, coverage, fiscalRefs }
 * @param opts { verifyBaseUrl, photos: [{ bytes, type: 'jpg'|'png', caption }], watermark }
 */
export async function renderReportPdf(rep, { verifyBaseUrl, photos = [], watermark = '' } = {}) {
  const p = rep.data || {};
  const pdf = await PDFDocument.create();
  const approved = new Date(rep.approvedAt);
  pdf.setTitle(`Rapporto di intervento ${rep.number}`);
  pdf.setAuthor(rep.company?.name || 'Pronto Intervento Roma');
  pdf.setSubject('Rapporto di intervento');
  pdf.setProducer('Pronto Intervento Roma');
  pdf.setCreator('Pronto Intervento Roma');
  pdf.setCreationDate(approved);
  pdf.setModificationDate(approved);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  let page = pdf.addPage(A4);
  const width = A4[0] - M * 2;
  let y;
  const newPage = () => { page = pdf.addPage(A4); y = A4[1] - M; };
  const ensure = (h) => { if (y - h < 90) newPage(); };
  const text = (t, x, yy, { font = reg, size = 10, color = NAVY } = {}) => page.drawText(safe(font, t), { x, y: yy, size, font, color });

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
  text('RAPPORTO DI INTERVENTO', lx + 60, A4[1] - 96, { font: bold, size: 10, color: rgb(1, 0.82, 0.7) });
  const rx = A4[0] - M;
  const rtext = (t, yy, o) => { const f = o.font || reg; text(t, rx - f.widthOfTextAtSize(safe(f, t), o.size), yy, o); };
  rtext(rep.number, A4[1] - 54, { font: mono, size: 13, color: rgb(1, 1, 1) });
  rtext(`Versione ${rep.version} · approvato il ${itDate(rep.approvedAt)}`, A4[1] - 72, { size: 9, color: rgb(0.8, 0.86, 0.92) });
  rtext('APPROVATO DALL’AMMINISTRAZIONE', A4[1] - 96, { font: bold, size: 9, color: rgb(0.55, 0.9, 0.65) });
  y = A4[1] - 146;

  /* ---------- impresa (solo dati verificati dal titolare) */
  const c = rep.company || {};
  const companyLines = c.verified
    ? [c.legalName || c.name, [c.vatNumber && `P.IVA ${c.vatNumber}`, c.address].filter(Boolean).join(' · '), c.pec && `PEC ${c.pec}`].filter(Boolean)
    : [c.name || 'Pronto Intervento Roma', 'Dati societari in attesa di verifica da parte del titolare: non riportati.'];
  const ch = companyLines.length * 12 + 22;
  page.drawRectangle({ x: M, y: y - ch, width, height: ch, color: rgb(1, 1, 1), borderColor: LINE, borderWidth: 0.8 });
  text('IMPRESA', M + 10, y - 14, { font: bold, size: 7, color: BLUE });
  companyLines.forEach((l, i) => text(l, M + 10, y - 28 - i * 12, { font: i === 0 ? bold : reg, size: i === 0 ? 10 : 8.5, color: i === 0 ? NAVY : MUTED }));
  y -= ch + 10;

  /* ---------- dati principali */
  const fields = [
    ['Cliente', p.customerName || '—'],
    ['Immobile', [p.addressLine, [p.postalCode, p.city].filter(Boolean).join(' ')].filter(Boolean).join(', ') || '—'],
    ['Servizio eseguito', [p.categoryName, p.serviceName].filter(Boolean).join(' · ') || '—'],
    ['Tecnico incaricato', p.technicianName || '—'],
    ['Data dell’intervento', p.date ? itDate(p.date) : '—'],
    ['Orari', p.startedAt ? `${time(p.startedAt)} – ${time(p.endedAt)}` : p.durationMinutes ? `${p.durationMinutes} minuti` : '—'],
    ['Numero intervento', p.interventionNumber || '—'],
    ['Documento fiscale', (rep.fiscalRefs || []).join(' · ') || 'Non ancora collegato']
  ];
  const colW = (width - 16) / 2;
  for (let i = 0; i < fields.length; i += 2) {
    const rowH = Math.max(...fields.slice(i, i + 2).map(([, v]) => wrap(bold, v, 10, colW - 20).length)) * 12.5 + 28;
    fields.slice(i, i + 2).forEach(([k, v], j) => {
      const x = M + j * (colW + 16);
      page.drawRectangle({ x, y: y - rowH, width: colW, height: rowH, color: ICE, borderColor: LINE, borderWidth: 0.8 });
      text(k.toUpperCase(), x + 10, y - 14, { font: bold, size: 7, color: BLUE });
      wrap(bold, v, 10, colW - 20).forEach((l, n) => text(l, x + 10, y - 28 - n * 12.5, { font: bold, size: 10 }));
    });
    y -= rowH + 8;
  }

  /* ---------- sezioni */
  const section = (title, body, { size = 9.5 } = {}) => {
    const lines = Array.isArray(body) ? body : wrap(reg, body || '—', size, width);
    ensure(28 + Math.min(lines.length, 5) * 13);
    y -= 6;
    text(title, M, y, { font: bold, size: 11, color: NAVY });
    page.drawLine({ start: { x: M, y: y - 5 }, end: { x: M + width, y: y - 5 }, thickness: 0.8, color: LINE });
    y -= 19;
    for (const l of lines) { ensure(13); text(l, M, y, { size, color: TEXT }); y -= 13; }
  };
  const list = (items, fmt, empty) => (items?.length ? items.flatMap((x) => wrap(reg, `• ${fmt(x)}`, 9.5, width)) : [empty]);

  section('Descrizione del problema', p.problemDescription);
  section('Diagnosi effettuata', p.diagnosis || (p.format === 'summary' ? 'Non indicata (rapporto sintetico).' : '—'));
  section('Lavorazioni eseguite', p.workPerformed);
  section('Materiali utilizzati', list(p.materials, (m) => `${m.name}${m.quantity || m.qty ? ` — ${m.quantity || m.qty} ${UNIT[m.unit] || m.unit || ''}`.trimEnd() : ''}`, 'Nessun materiale indicato.'));
  section('Tempi registrati', list(p.timeEntries, (t) => `${t.kind === 'travel' ? 'Viaggio' : 'Lavoro'}: ${itDate(t.startedAt)} ${time(t.startedAt)}–${time(t.endedAt)} (${t.minutes} min)`, 'Orari riportati nell’intestazione.'));
  if (p.unresolvedIssues) section('Problemi non risolti', p.unresolvedIssues);
  if (p.recommendations) section('Raccomandazioni', p.recommendations);
  if (p.extraWorks?.length) section('Lavorazioni aggiuntive', list(p.extraWorks, (w) => `${w.description} (${w.status === 'authorized' ? 'autorizzata dal cliente' : 'proposta, da autorizzare'})`, ''));
  if (p.extraCostsNote) section('Eventuali costi aggiuntivi', p.extraCostsNote);
  section('Note finali', p.finalNotes || p.technicalNotes || 'Nessuna nota.');

  /* ---------- fotografie autorizzate */
  section('Fotografie autorizzate', photos.length ? [`${photos.length} fotografi${photos.length === 1 ? 'a' : 'e'} autorizzat${photos.length === 1 ? 'a' : 'e'} dal cliente.`] : ['Nessuna fotografia autorizzata allegata.']);
  if (photos.length) {
    const th = 104, tw = 154;
    for (let k = 0; k < photos.length; k += 3) {
      ensure(th + 26);
      let x = M;
      for (const ph of photos.slice(k, k + 3)) {
        const img = ph.type === 'png' ? await pdf.embedPng(ph.bytes) : await pdf.embedJpg(ph.bytes);
        const s = Math.min(tw / img.width, th / img.height);
        page.drawImage(img, { x, y: y - img.height * s, width: img.width * s, height: img.height * s });
        if (ph.caption) text(wrap(reg, ph.caption, 7.5, tw)[0], x, y - th - 10, { size: 7.5, color: MUTED });
        x += tw + 10;
      }
      y -= th + 20;
    }
  }

  /* ---------- presa visione (facoltativa) */
  const ack = p.customerAck || {};
  section('Presa visione del cliente', ack.method && ack.method !== 'none'
    ? `${ack.method === 'signature' ? 'Firma' : 'Presa visione verbale'} di ${ack.name || '—'}${ack.at ? ` il ${itDate(ack.at)} alle ${time(ack.at)}` : ''}. La presa visione è facoltativa e non sostituisce certificazioni obbligatorie.`
    : 'Non raccolta (facoltativa).');

  /* ---------- PRONTO+ e assistenza aggiuntiva */
  if (rep.coverage?.length) section('Prestazioni incluse PRONTO+', `Intervento coperto, in tutto o in parte, da prestazioni incluse nell’abbonamento (${rep.coverage.length}). Eventuali parti extra sono indicate separatamente nel riepilogo di pagamento.`);
  section('Assistenza aggiuntiva', rep.protectedPlan
    ? `PRONTO+ Lavoro Protetto ${rep.protectedPlan.name}: attivo dal ${itDate(rep.protectedPlan.startsAt)} al ${itDate(rep.protectedPlan.endsAt)}. Servizio facoltativo che non sostituisce le garanzie di legge.`
    : 'Nessun servizio di assistenza aggiuntiva acquistato.');
  section('Informazioni sulle tutele applicabili', `${LEGAL_PROTECTION_TEXT} ${LEGAL_DEFECTS_TEXT}`, { size: 9 });

  /* ---------- QR di verifica */
  ensure(150);
  const url = `${String(verifyBaseUrl || '').replace(/\/$/, '')}/rapporto/?n=${encodeURIComponent(rep.number)}`;
  const qr = qrMatrix(url);
  const box = 108;
  const cell = box / (qr.size + 8);
  const qx = A4[0] - M - box, qy = y - 14 - box;
  page.drawRectangle({ x: qx, y: qy, width: box, height: box, color: rgb(1, 1, 1), borderColor: LINE, borderWidth: 0.8 });
  qr.modules.forEach((row, r) => row.forEach((on, col) => {
    if (on) page.drawRectangle({ x: qx + (col + 4) * cell, y: qy + box - (r + 5) * cell, width: cell + 0.05, height: cell + 0.05, color: NAVY });
  }));
  const vw = width - box - 20;
  let vy = qy + box - 8;
  text('Verifica del rapporto', M, vy, { font: bold, size: 11 });
  vy -= 17;
  for (const l of wrap(reg, 'La pagina di verifica mostra solo numero, stato, data, categoria e comune: nessun dato personale.', 9, vw)) { text(l, M, vy, { size: 9, color: MUTED }); vy -= 12; }
  vy -= 4;
  for (const l of wrap(mono, url, 8, vw)) { text(l, M, vy, { font: mono, size: 8, color: BLUE }); vy -= 11; }
  vy -= 5;
  text('Impronta SHA-256 della versione approvata:', M, vy, { font: bold, size: 8, color: MUTED });
  text(String(rep.hash || '').slice(0, 32), M, vy - 11, { font: mono, size: 7.5, color: MUTED });
  text(String(rep.hash || '').slice(32), M, vy - 21, { font: mono, size: 7.5, color: MUTED });

  /* ---------- piè di pagina */
  const pages = pdf.getPages();
  pages.forEach((pg, i) => {
    if (watermark) pg.drawText(watermark, { x: 110, y: 260, size: 64, font: bold, color: rgb(0.85, 0.2, 0.15), opacity: 0.12, rotate: degrees(40) });
    pg.drawLine({ start: { x: M, y: 70 }, end: { x: A4[0] - M, y: 70 }, thickness: 0.6, color: LINE });
    wrap(reg, REPORT_DISCLAIMER, 7.5, width - 70).forEach((l, n) => pg.drawText(l, { x: M, y: 58 - n * 9.5, size: 7.5, font: reg, color: MUTED }));
    const pn = `Pagina ${i + 1} di ${pages.length}`;
    pg.drawText(pn, { x: A4[0] - M - reg.widthOfTextAtSize(pn, 8), y: 30, size: 8, font: reg, color: MUTED });
  });
  return pdf.save({ useObjectStreams: false });
}
