/**
 * Generazione del PDF del "Certificato digitale di intervento" (lato server).
 * Deterministico: stesso certificato (immutabile) → stesso documento.
 * Usa pdf-lib (MIT) e l'encoder QR interno.
 */
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { qrMatrix } from './qr.js';
import { CERTIFICATE_TITLE, CERTIFICATE_DISCLAIMER, LEGAL_PROTECTION_TEXT } from './certificates.js';
import { itDate } from './dates.js';

const NAVY = rgb(8 / 255, 29 / 255, 48 / 255);
const BLUE = rgb(0, 107 / 255, 230 / 255);
const ORANGE = rgb(1, 120 / 255, 36 / 255);
const ICE = rgb(243 / 255, 246 / 255, 250 / 255);
const MUTED = rgb(81 / 255, 98 / 255, 122 / 255);
const LINE = rgb(217 / 255, 225 / 255, 236 / 255);
const A4 = [595.28, 841.89];
const M = 48; // margine

/** Testo compatibile con i font standard PDF (WinAnsi): sostituisce i caratteri non codificabili. */
function safe(font, text) {
  return [...String(text ?? '')].map((ch) => { try { font.encodeText(ch); return ch; } catch { return '?'; } }).join('');
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

/**
 * @param cert { number, revision, status, issuedAt, payload, payloadHash }
 * @param opts { verifyBaseUrl, photos: [{ bytes, type: 'jpg'|'png', caption }], watermark?: testo per documenti di esempio }
 */
export async function renderCertificatePdf(cert, { verifyBaseUrl, photos = [], watermark = '' } = {}) {
  const p = cert.payload;
  const doc = await PDFDocument.create();
  const issued = new Date(cert.issuedAt);
  doc.setTitle(`${CERTIFICATE_TITLE} ${cert.number}`);
  doc.setAuthor(p.companyName || 'Pronto Intervento Roma');
  doc.setSubject('Certificato digitale di intervento');
  doc.setProducer('Pronto Intervento Roma');
  doc.setCreator('Pronto Intervento Roma');
  doc.setCreationDate(issued);
  doc.setModificationDate(issued);

  const reg = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);
  let page = doc.addPage(A4);
  let y = A4[1];
  const width = A4[0] - M * 2;

  const newPage = () => { page = doc.addPage(A4); y = A4[1] - M; };
  const ensure = (h) => { if (y - h < 90) newPage(); };
  const text = (t, x, yy, { font = reg, size = 10, color = NAVY } = {}) => page.drawText(safe(font, t), { x, y: yy, size, font, color });

  /* ---------- intestazione con logo vettoriale */
  page.drawRectangle({ x: 0, y: A4[1] - 118, width: A4[0], height: 118, color: NAVY });
  page.drawRectangle({ x: 0, y: A4[1] - 122, width: A4[0], height: 4, color: ORANGE });
  const lx = M, ly = A4[1] - 40;
  page.drawSvgPath('M12 2h24a10 10 0 0 1 10 10v24a10 10 0 0 1-10 10H12A10 10 0 0 1 2 36V12A10 10 0 0 1 12 2z', { x: lx, y: ly, color: BLUE, scale: 1 });
  page.drawSvgPath('M15 36V13h10.5a7.5 7.5 0 0 1 0 15H15', { x: lx, y: ly, borderColor: rgb(1, 1, 1), borderWidth: 5, scale: 1 });
  page.drawCircle({ x: lx + 36, y: ly - 36, size: 9, color: ORANGE, borderColor: NAVY, borderWidth: 2.5 });
  page.drawSvgPath('M36 31.5v9M31.5 36h9', { x: lx, y: ly, borderColor: rgb(1, 1, 1), borderWidth: 2.6, scale: 1 });
  text('PRONTO INTERVENTO', lx + 60, A4[1] - 54, { font: bold, size: 13, color: rgb(1, 1, 1) });
  text('R O M A', lx + 60, A4[1] - 70, { font: bold, size: 12, color: rgb(47 / 255, 139 / 255, 1) });
  text(CERTIFICATE_TITLE.toUpperCase(), lx + 60, A4[1] - 96, { font: bold, size: 10, color: rgb(1, 0.82, 0.7) });

  const rx = A4[0] - M;
  const rtext = (t, yy, opts) => { const f = opts.font || reg; const w = f.widthOfTextAtSize(safe(f, t), opts.size); text(t, rx - w, yy, opts); };
  rtext(cert.number, A4[1] - 54, { font: mono, size: 13, color: rgb(1, 1, 1) });
  rtext(`Revisione ${cert.revision} · emesso il ${itDate(cert.issuedAt)}`, A4[1] - 72, { size: 9, color: rgb(0.8, 0.86, 0.92) });
  rtext(cert.status === 'valid' ? 'VALIDO' : cert.status === 'superseded' ? 'SOSTITUITO DA REVISIONE SUCCESSIVA' : 'REVOCATO', A4[1] - 96, { font: bold, size: 9, color: cert.status === 'valid' ? rgb(0.55, 0.9, 0.65) : ORANGE });

  y = A4[1] - 150;

  /* ---------- dati principali (due colonne) */
  const fields = [
    ['Impresa', p.companyName],
    ['Cliente', p.customerName],
    ['Servizio effettuato', `${p.categoryName} · ${p.serviceName}`],
    ['Data del lavoro', p.workDate ? itDate(p.workDate) : '—'],
    ['Indirizzo dell’intervento', `${p.addressLine}, ${p.city}`],
    ['Tecnico incaricato', p.technicianName],
    ['Numero intervento', p.interventionNumber || '—'],
    ['Documento fiscale', p.fiscalDocumentRef || 'Non ancora collegato']
  ];
  const colW = (width - 16) / 2;
  for (let i = 0; i < fields.length; i += 2) {
    const rowH = Math.max(...fields.slice(i, i + 2).map(([, v]) => wrap(bold, v, 10.5, colW - 20).length)) * 13 + 30;
    fields.slice(i, i + 2).forEach(([k, v], j) => {
      const x = M + j * (colW + 16);
      page.drawRectangle({ x, y: y - rowH, width: colW, height: rowH, color: ICE, borderColor: LINE, borderWidth: 0.8 });
      text(k.toUpperCase(), x + 10, y - 15, { font: bold, size: 7, color: BLUE });
      wrap(bold, v, 10.5, colW - 20).forEach((l, n) => text(l, x + 10, y - 30 - n * 13, { font: bold, size: 10.5 }));
    });
    y -= rowH + 10;
  }

  /* ---------- sezioni testuali */
  const section = (title, body, { size = 10 } = {}) => {
    const lines = Array.isArray(body) ? body : wrap(reg, body || '—', size, width);
    ensure(30 + Math.min(lines.length, 6) * 14);
    y -= 8;
    text(title, M, y, { font: bold, size: 11.5, color: NAVY });
    page.drawLine({ start: { x: M, y: y - 6 }, end: { x: M + width, y: y - 6 }, thickness: 0.8, color: LINE });
    y -= 22;
    for (const l of lines) { ensure(14); text(l, M, y, { size, color: rgb(0.16, 0.23, 0.31) }); y -= 14; }
  };
  section('Descrizione delle lavorazioni', p.workDescription);
  const mats = Array.isArray(p.materials) && p.materials.length
    ? p.materials.flatMap((mt) => wrap(reg, `• ${mt.name || mt}${mt.qty ? ` — quantità ${mt.qty}` : ''}`, 10, width))
    : ['Nessun materiale indicato.'];
  section('Materiali utilizzati', mats);
  section('Note tecniche', p.technicalNotes || 'Nessuna nota.');

  /* ---------- fotografie autorizzate */
  section('Fotografie autorizzate', photos.length ? [`${photos.length} fotografi${photos.length === 1 ? 'a' : 'e'} autorizzat${photos.length === 1 ? 'a' : 'e'} dal cliente.`] : ['Nessuna fotografia autorizzata allegata.']);
  if (photos.length) {
    const th = 110, tw = 146;
    ensure(th + 20);
    let x = M;
    for (const ph of photos.slice(0, 3)) {
      const img = ph.type === 'png' ? await doc.embedPng(ph.bytes) : await doc.embedJpg(ph.bytes);
      const s = Math.min(tw / img.width, th / img.height);
      page.drawImage(img, { x, y: y - img.height * s, width: img.width * s, height: img.height * s });
      x += tw + 12;
    }
    y -= th + 12;
  }

  /* ---------- Lavoro Protetto */
  section('Servizio aggiuntivo PRONTO+ Lavoro Protetto', p.protectedPlanName
    ? `Piano ${p.protectedPlanName}: attivo dal ${itDate(p.protectedPlanStartsAt)} al ${itDate(p.protectedPlanEndsAt)}. Servizio facoltativo che non sostituisce le garanzie di legge.`
    : 'Nessun servizio aggiuntivo acquistato. Il certificato e le tutele di legge non dipendono da servizi aggiuntivi.');

  /* ---------- tutele */
  section('Informazioni sulle tutele applicabili', LEGAL_PROTECTION_TEXT, { size: 9.5 });

  /* ---------- QR di verifica + impronta */
  ensure(150);
  const url = `${verifyBaseUrl.replace(/\/$/, '')}/certificato/?n=${encodeURIComponent(cert.number)}`;
  const qr = qrMatrix(url);
  const box = 108;
  const cell = box / (qr.size + 8);
  const qx = A4[0] - M - box, qy = y - 14 - box;
  page.drawRectangle({ x: qx, y: qy, width: box, height: box, color: rgb(1, 1, 1), borderColor: LINE, borderWidth: 0.8 });
  qr.modules.forEach((row, r) => row.forEach((on, c) => {
    if (on) page.drawRectangle({ x: qx + (c + 4) * cell, y: qy + box - (r + 5) * cell, width: cell + 0.05, height: cell + 0.05, color: NAVY });
  }));
  const vx = M, vw = width - box - 20;
  let vy = qy + box - 8;
  text('Verifica del certificato', vx, vy, { font: bold, size: 11.5 });
  vy -= 18;
  for (const l of wrap(reg, 'Inquadra il QR code o visita l’indirizzo qui sotto: la pagina di verifica mostra solo stato, data, servizio e comune, senza dati personali.', 9.5, vw)) { text(l, vx, vy, { size: 9.5, color: MUTED }); vy -= 13; }
  vy -= 4;
  for (const l of wrap(mono, url, 8, vw)) { text(l, vx, vy, { font: mono, size: 8, color: BLUE }); vy -= 11; }
  vy -= 6;
  text('Impronta SHA-256 del contenuto:', vx, vy, { font: bold, size: 8, color: MUTED });
  vy -= 11;
  text(cert.payloadHash.slice(0, 32), vx, vy, { font: mono, size: 7.5, color: MUTED });
  text(cert.payloadHash.slice(32), vx, vy - 10, { font: mono, size: 7.5, color: MUTED });

  /* ---------- piè di pagina su ogni pagina */
  const pages = doc.getPages();
  pages.forEach((pg, i) => {
    if (watermark) pg.drawText(watermark, { x: 110, y: 260, size: 64, font: bold, color: rgb(0.85, 0.2, 0.15), opacity: 0.12, rotate: degrees(40) });
    pg.drawLine({ start: { x: M, y: 70 }, end: { x: A4[0] - M, y: 70 }, thickness: 0.6, color: LINE });
    wrap(reg, CERTIFICATE_DISCLAIMER, 8, width - 60).forEach((l, n) => pg.drawText(l, { x: M, y: 56 - n * 10, size: 8, font: reg, color: MUTED }));
    const pn = `Pagina ${i + 1} di ${pages.length}`;
    pg.drawText(pn, { x: A4[0] - M - reg.widthOfTextAtSize(pn, 8), y: 36, size: 8, font: reg, color: MUTED });
  });

  return doc.save({ useObjectStreams: false });
}
