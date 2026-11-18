/**
 * GET /.netlify/functions/certificate-pdf?n=PIR-2026-XXXX-XXXX
 * Header: Authorization: Bearer <token utente>
 * Il certificato si legge con il token dell'utente (RLS: solo il cliente
 * titolare o un amministratore). Il PDF deriva dal contenuto immutabile:
 * stesso certificato → stesso documento (generazione idempotente).
 */
import { supabaseConfig, client, json, bearer, notConfigured } from '../lib/backend.mjs';
import { isCertificateNumber } from '../../src/lib/certificates.js';
import { renderCertificatePdf } from '../../src/lib/certificate-pdf.js';

export default async function handler(req, _context, deps = {}) {
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const n = new URL(req.url).searchParams.get('n') || '';
  if (!isCertificateNumber(n)) return json(400, { error: 'invalid_number' });
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  const token = bearer(req);
  if (!(await api.user(token))) return json(401, { error: 'unauthorized' });
  const rows = await api.select(`certificates?number=eq.${n}&select=number,revision,status,issued_at,payload,payload_hash`, token);
  const c = rows?.[0];
  if (!c) return json(404, { error: 'not_found' });

  const photos = [];
  for (const path of (c.payload.photos || []).slice(0, 3)) {
    const type = /\.png$/i.test(path) ? 'png' : /\.jpe?g$/i.test(path) ? 'jpg' : null;
    if (!type) continue;
    const bytes = await api.download('interventi', path, token);
    if (bytes) photos.push({ bytes, type });
  }
  const pdf = await renderCertificatePdf(
    { number: c.number, revision: c.revision, status: c.status, issuedAt: c.issued_at, payload: c.payload, payloadHash: c.payload_hash },
    { verifyBaseUrl: env.SITE_URL || env.URL || 'https://prontointerventoroma.it', photos }
  );
  return new Response(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="certificato-${c.number}-r${c.revision}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex'
    }
  });
}
