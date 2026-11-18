/**
 * /.netlify/functions/mypos-status — Impostazioni → Pagamenti (Prompt 9). Solo amministratori.
 * GET: configurazione (senza segreti), dati registrati (ordini, checkout, notifiche, transazioni,
 *      attivazioni, duplicati) e ultimo esito della prova di connessione.
 * POST { action: 'connection-test' }: interroga myPOS (IPCGetPaymentStatus su un ordine di prova
 *      inesistente) e considera la connessione verificata SOLO se myPOS risponde con una firma
 *      valida per il certificato configurato. L'esito, positivo o negativo, è registrato dal server.
 * Nessun pagamento viene creato o simulato. In produzione la prova è bloccata senza MYPOS_ALLOW_LIVE.
 */
import { supabaseConfig, client, json, notConfigured, bearer } from '../lib/backend.mjs';
import { adminFromToken, myposStatus } from '../lib/integrations.mjs';
import { readConfig, buildStatusRequest, postIpc, parseStatusResponse } from '../../src/lib/mypos.js';
import { appEnvironment } from '../lib/environment.mjs';

export const CONNECTION_TEST_ORDER = 'ORD-CONNTEST0000';

export default async function handler(req, _context, deps = {}) {
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.ready) return notConfigured('Backend Supabase');
  const fetchImpl = deps.fetch || fetch;
  const api = client({ cfg, fetchImpl });
  const token = bearer(req);
  const admin = await adminFromToken(api, token);
  if (!admin) return json(403, { error: 'forbidden' });
  const status = myposStatus(env);

  if (req.method === 'GET') {
    let db = null;
    try { db = await api.rpc('setup_db_status', {}, token); } catch { db = null; }
    return json(200, { config: status, flags: db?.flags || null, data: db?.payments || null, lastConnectionTest: db?.integrationChecks?.mypos_connection || null,
      lastFullTest: db?.checks?.mypos_sandbox_test || null, generatedAt: new Date().toISOString() });
  }
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  let body = {};
  try { body = await req.json(); } catch { /* corpo vuoto */ }
  if (body.action !== 'connection-test') return json(400, { error: 'bad_request' });
  if (!status.ready) return json(409, { error: 'not_ready', message: 'myPOS non è configurato: nessuna prova eseguita.', missing: status.missing, problems: status.problems });
  if (status.env === 'production' && !status.allowLive) return json(409, { error: 'live_blocked', message: 'Produzione non autorizzata (MYPOS_ALLOW_LIVE).' });
  const mcfg = readConfig(env);
  let result;
  try {
    const data = await postIpc(mcfg, buildStatusRequest(mcfg, CONNECTION_TEST_ORDER), fetchImpl);
    const parsed = parseStatusResponse(data, mcfg);
    // risposta firmata da myPOS = credenziali, chiavi e certificato coerenti (l'ordine di prova non esiste: lo stato atteso è "non trovato")
    result = { ok: parsed.verified === true, signatureValid: parsed.verified === true, providerStatus: data?.Status ?? null, message: String(data?.StatusMsg || '').slice(0, 160) || null };
  } catch (e) {
    result = { ok: false, signatureValid: false, error: String(e.message || e).slice(0, 200) };
  }
  if (cfg.serviceReady) {
    await api.rpc('record_integration_check', { p_key: 'mypos_connection', p_ok: result.ok, p_environment: appEnvironment(env) || status.env,
      p_detail: { ...result, myposEnv: status.env }, p_by: admin.id }, api.serviceToken()).catch(() => null);
  }
  return json(result.ok ? 200 : 502, { ...result, myposEnv: status.env, testedAt: new Date().toISOString() });
}
