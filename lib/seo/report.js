/**
 * PRONTO SEO — report PDF e CSV (Prompt 7).
 * Il report riporta SOLO i dati salvati in seo_reports (Search Console + gestionale),
 * con fonte, periodo e data di aggiornamento. Senza dati lo dichiara.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const NAVY = rgb(0.03, 0.11, 0.19); const MUTED = rgb(0.32, 0.38, 0.48); const ORANGE = rgb(1, 0.47, 0.14);
// Helvetica standard: solo caratteri WinAnsi
const win = (s) => String(s ?? '').replace(/[→↗↘]/g, '->').replace(/[–—]/g, '-').replace(/[^\x20-\x7E -ÿ’‘“”€…•]/g, '');
const num = (n, d = 0) => (n === null || n === undefined || Number.isNaN(Number(n)) ? 'n/d' : Number(n).toLocaleString('it-IT', { maximumFractionDigits: d, minimumFractionDigits: d }));
const pct = (r) => (r === null || r === undefined ? 'n/d' : `${num(Number(r) * 100, 2)}%`);
const delta = (a, b) => (b ? `${a - b >= 0 ? '+' : ''}${num(((a - b) / b) * 100, 1)}%` : 'n/d');

export async function reportPdf(report, { domain }) {
  const d = report.data || {};
  const ov = d.overview || {};
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Report PRONTO SEO ${report.kind} ${report.period_from} - ${report.period_to}`);
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]); let y = 800;
  const line = (t, { size = 10, font = reg, color = NAVY, x = 48, gap = 4 } = {}) => {
    if (y < 60) { page = pdf.addPage([595, 842]); y = 800; }
    page.drawText(win(t).slice(0, 110), { x, y, size, font, color }); y -= size + gap;
  };
  const h = (t) => { y -= 8; line(t, { size: 13, font: bold }); page.drawRectangle({ x: 48, y: y + 4, width: 40, height: 2, color: ORANGE }); y -= 6; };

  line('PRONTO SEO', { size: 9, font: bold, color: ORANGE });
  line(`Report ${report.kind === 'weekly' ? 'settimanale' : report.kind === 'monthly' ? 'mensile' : 'personalizzato'} - ${domain}`, { size: 18, font: bold, gap: 8 });
  line(`Periodo: ${report.period_from} - ${report.period_to} · Generato: ${new Date(report.created_at).toISOString().slice(0, 16).replace('T', ' ')} UTC`, { color: MUTED });
  line(`Dati Search Console disponibili fino al: ${ov.dataUntil || 'nessun dato'}`, { color: MUTED });

  h('Ricerca organica (Google Search Console)');
  if (!ov.connected) line('Search Console non collegata o nessun dato nel periodo: nessuna metrica di ricerca riportata.', { color: MUTED });
  else {
    const c = ov.current || {}; const p = ov.prior || {};
    line(`Clic: ${num(c.clicks)} (periodo precedente ${num(p.clicks)}, ${delta(c.clicks, p.clicks)})`);
    line(`Impressioni: ${num(c.impressions)} (periodo precedente ${num(p.impressions)}, ${delta(c.impressions, p.impressions)})`);
    line(`CTR: ${pct(c.ctr)} · Posizione media: ${num(c.position, 1)} (media ponderata, non è un ranking fisso)`);
    if (ov.branded?.available) line(`Ricerche di marchio: ${num(ov.branded.branded.clicks)} clic · non di marchio: ${num(ov.branded.nonBranded.clicks)} clic (classificazione Google)`);
  }
  if ((d.topQueries || []).length) {
    h('Ricerche principali');
    for (const q of d.topQueries.slice(0, 15)) line(`${q.query} - ${num(q.clicks)} clic, ${num(q.impressions)} impr., CTR ${pct(q.ctr)}, pos. ${num(q.position, 1)}`, { size: 9 });
  }
  if ((d.declining || []).length) {
    h('Pagine in calo (da verificare, non necessariamente penalizzazioni)');
    for (const r of d.declining.slice(0, 10)) line(`${r.page} - ${num(r.prevClicks)} -> ${num(r.clicks)} clic (${num(r.changePct, 1)}%)`, { size: 9 });
  }
  if ((d.lowCtr || []).length) {
    h('Pagine con molte impressioni e CTR basso');
    for (const r of d.lowCtr.slice(0, 10)) line(`${r.page} - ${num(r.impressions)} impr., CTR ${pct(r.ctr)}, pos. ${num(r.position, 1)}`, { size: 9 });
  }
  if (d.funnel) {
    const f = d.funnel;
    h('Contatti e conversioni (gestionale)');
    line(`Clic sul telefono: ${num(f.clicks?.phone)} · clic WhatsApp: ${num(f.clicks?.whatsapp)} (clic, non chiamate verificate)`);
    line(`Richieste registrate: ${num(f.stages?.requests)} · qualificate: ${num(f.stages?.qualified)} · preventivi accettati: ${num(f.stages?.quoteAccepted)}`);
    line(`Clienti acquisiti: ${num(f.stages?.customers)} · pagamenti confermati: ${num(f.stages?.paid)}`);
  }
  h('Fonti e note');
  line('Search Console: Search Analytics API (dati aggregati da Google, alcune ricerche possono essere omesse).', { size: 9, color: MUTED });
  line('Contatti: database del gestionale (richieste, lead, preventivi, ordini). Nessun dato personale nel report.', { size: 9, color: MUTED });
  line(`Segnalazioni aperte nel periodo: ${(d.alerts || []).length} · problemi tecnici aperti: ${num(d.issues)}`, { size: 9, color: MUTED });
  return pdf.save();
}

/** CSV con separatore ";" (Excel in italiano) e campi tra virgolette. */
export function toCsv(rows, columns) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [columns.map((c) => esc(c.label)).join(';'), ...rows.map((r) => columns.map((c) => esc(typeof c.value === 'function' ? c.value(r) : r[c.value])).join(';'))].join('\r\n');
}
