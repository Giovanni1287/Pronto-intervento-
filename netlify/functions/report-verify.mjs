/**
 * GET /.netlify/functions/report-verify?n=RAP-2026-XXXXXX
 * Pagina pubblica del QR del rapporto: SOLO dati minimi non sensibili (RPC verify_report_public).
 */
import { supabaseConfig, client, json, notConfigured } from '../lib/backend.mjs';
import { isReportNumber } from '../../src/lib/operations.js';

export default async function handler(req, _context, deps = {}) {
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const n = new URL(req.url).searchParams.get('n') || '';
  if (!isReportNumber(n)) return json(400, { found: false, error: 'invalid_number' });
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  const res = await api.rpc('verify_report_public', { p_number: n }, cfg.anonKey);
  return json(res?.found ? 200 : 404, res, { 'Cache-Control': 'public, max-age=60' });
}
