/**
 * GET /.netlify/functions/quote-pdf?id=<uuid del preventivo>
 * Header: Authorization: Bearer <token utente>
 * I dati arrivano dalla RPC quote_document eseguita con il token dell'utente:
 * amministratori, oppure amministratore/responsabile dell'azienda cliente per
 * preventivi già inviati. Costi interni e margini non sono mai restituiti.
 */
import { supabaseConfig, client, json, bearer, notConfigured } from '../lib/backend.mjs';
import { renderQuotePdf } from '../../src/lib/quote-pdf.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, _context, deps = {}) {
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!UUID.test(id)) return json(400, { error: 'invalid_id' });
  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  const token = bearer(req);
  if (!(await api.user(token))) return json(401, { error: 'unauthorized' });
  let q;
  try { q = await api.rpc('quote_document', { p_quote: id }, token); } catch (err) {
    return json(err.status === 403 || /autorizzato/i.test(err.message) ? 403 : 404, { error: 'not_available' });
  }
  const pdf = await renderQuotePdf(q);
  return new Response(pdf, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="preventivo-${String(q.number).replace(/[^A-Z0-9-]/gi, '')}.pdf"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex'
    }
  });
}
