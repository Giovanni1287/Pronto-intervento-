/**
 * GET /.netlify/functions/certificate-verify?n=PIR-2026-XXXX-XXXX
 * Pagina pubblica del QR: restituisce SOLO dati non personali (RPC verify_certificate_public).
 */
import { supabaseConfig, client, json, notConfigured } from '../lib/backend.mjs';
import { isCertificateNumber } from '../../src/lib/certificates.js';

export default async function handler(req, _context, deps = {}) {
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const n = new URL(req.url).searchParams.get('n') || '';
  if (!isCertificateNumber(n)) return json(400, { found: false, error: 'invalid_number' });
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  const res = await api.rpc('verify_certificate_public', { p_number: n }, cfg.anonKey);
  return json(res?.found ? 200 : 404, res, { 'Cache-Control': 'public, max-age=60' });
}
