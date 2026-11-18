/**
 * GET /.netlify/functions/report-pdf?n=RAP-2026-XXXXXX
 * Header: Authorization: Bearer <token utente>
 * Il rapporto si legge con il token dell'utente (RPC intervention_report_document:
 * solo il cliente titolare o il personale autorizzato, accesso registrato).
 * Il PDF deriva dalla versione approvata e immutabile del rapporto.
 */
import { supabaseConfig, client, json, bearer, notConfigured } from '../lib/backend.mjs';
import { isReportNumber } from '../../src/lib/operations.js';
import { renderReportPdf } from '../../src/lib/report-pdf.js';

export default async function handler(req, _context, deps = {}) {
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const n = new URL(req.url).searchParams.get('n') || '';
  if (!isReportNumber(n)) return json(400, { error: 'invalid_number' });
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  const token = bearer(req);
  if (!(await api.user(token))) return json(401, { error: 'unauthorized' });
  let doc;
  try { doc = await api.rpc('intervention_report_document', { p_number: n }, token); } catch (err) {
    return json(err.status === 403 || /autorizzato/i.test(err.message) ? 403 : 404, { error: 'not_available' });
  }
  const photos = [];
  for (const ph of (doc.data?.photos || []).slice(0, 6)) {
    const type = /\.png$/i.test(ph.path) ? 'png' : /\.jpe?g$/i.test(ph.path) ? 'jpg' : null;
    if (!type || /\.\./.test(ph.path)) continue;
    const bytes = await api.download('interventi', ph.path, token);
    if (bytes) photos.push({ bytes, type, caption: ph.caption });
  }
  const pdf = await renderReportPdf(doc, { verifyBaseUrl: env.SITE_URL || env.URL || 'https://prontointerventoroma.it', photos });
  return new Response(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="rapporto-${doc.number}-v${doc.version}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex'
    }
  });
}
