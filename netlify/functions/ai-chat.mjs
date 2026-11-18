/**
 * POST /.netlify/functions/ai-chat — un turno di conversazione con PRONTO AI.
 * Corpo: { agent, message, conversationId?, conversationToken?, page?, context?, action?: 'history' }
 * Ordine dei controlli: configurazione → identità (Supabase Auth) → interruttore
 * globale, agente, ruolo, budget e limiti (ai_runtime_gate) → titolarità della
 * conversazione → orchestratore (limiti di chiamate e tempo) → registro.
 * Le chiavi (AI_API_KEY, SUPABASE_SERVICE_ROLE_KEY) restano nelle variabili
 * d'ambiente del server. Se il provider non è configurato risponde 503.
 */
import { supabaseConfig, client, json, notConfigured, bearer } from '../lib/backend.mjs';
import { sha256, newConversationToken, validToken, ipHash, readJson, CHANNEL, BLOCK_MESSAGES, FALLBACK_CONTACT, UUID } from '../lib/ai.mjs';
import { providerConfig, createProvider } from '../../src/lib/ai/providers.js';
import { runTurn } from '../../src/lib/ai/orchestrator.js';
import { AGENT_IDS, SUGGESTIONS } from '../../src/lib/ai/agents.js';
import { loadBuildAudit } from './seo-monitor.mjs';

const USAGE_STATUS = { ok: 'ok', error: 'error', timeout: 'timeout', invalid_output: 'invalid_output', stopped: 'stopped' };

function safeContext(agent, c) {
  if (!c || typeof c !== 'object') return null;
  const out = {};
  if (typeof c.interventionId === 'string' && UUID.test(c.interventionId)) out.interventionId = c.interventionId;
  if (agent === 'customer' && typeof c.pageTitle === 'string') out.pageTitle = c.pageTitle.slice(0, 120);
  if (agent === 'customer' && typeof c.serviceId === 'string' && /^[a-z0-9-]+(\/[a-z0-9-]+)?$/.test(c.serviceId)) out.serviceId = c.serviceId;
  return Object.keys(out).length ? out : null;
}

export default async function handler(req, context, deps = {}) {
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  const env = deps.env || process.env;
  const cfg = supabaseConfig(env);
  if (!cfg.serviceReady || !cfg.ready) return notConfigured('Backend Supabase');
  let body;
  try { body = await readJson(req); } catch (e) { return json(e.status || 400, { error: 'bad_request' }); }
  const agent = String(body.agent || 'customer');
  if (!AGENT_IDS.includes(agent)) return json(400, { error: 'unknown_agent' });

  const api = client({ cfg, fetchImpl: deps.fetch || fetch });
  const svc = api.serviceToken();
  const token = bearer(req);
  let user = null;
  try {
    if (token) { user = await api.user(token); if (!user?.id) return json(401, { error: 'unauthorized' }); }
  } catch { return json(502, { error: 'backend_unavailable', message: FALLBACK_CONTACT }); }
  if (agent !== 'customer' && !user) return json(401, { error: 'unauthorized' });

  // visitatore: token di conversazione casuale, nel database solo la sua impronta
  let convToken = null; let issuedToken = null;
  if (!user) {
    convToken = validToken(body.conversationToken) ? body.conversationToken : null;
    if (!convToken) { if (body.conversationId) return json(403, { error: 'forbidden' }); convToken = issuedToken = newConversationToken(); }
  }
  const anonHash = convToken ? sha256(convToken) : null;
  const ipH = ipHash(req, context, env);
  const profileId = user?.id || null;
  const convId = typeof body.conversationId === 'string' && UUID.test(body.conversationId) ? body.conversationId : null;
  const record = (p) => api.rpc('ai_record_usage', { p: { agentId: agent, profileId, anonKeyHash: anonHash, ipHash: ipH, ...p } }, svc).catch(() => null);

  try {
    // ripresa della conversazione (storico) senza chiamare il modello
    if (body.action === 'history') {
      if (!convId) return json(400, { error: 'bad_request' });
      const conv = await api.rpc('ai_open_conversation', { p_id: convId, p_agent: agent, p_profile: profileId, p_anon_hash: anonHash, p_channel: 'site', p_page: null, p_context: {} }, svc);
      const messages = await api.rpc('ai_recent_messages', { p_conversation: conv.id, p_limit: 30 }, svc);
      return json(200, { conversationId: conv.id, messages, draft: conv.draft && { draft: conv.draft, draftHash: conv.draft_hash, version: conv.draft_version },
        safety: { level: conv.safety_level }, requestNumber: conv.intervention_id ? true : undefined, status: conv.status });
    }

    const message = typeof body.message === 'string' ? body.message : '';
    if (!message.trim()) return json(400, { error: 'empty_message' });

    // interruttore globale, agente, ruolo, budget, limiti
    const gate = await api.rpc('ai_runtime_gate', { p_agent: agent, p_profile: profileId, p_anon_hash: anonHash, p_ip_hash: ipH }, svc);
    if (!gate.allowed) {
      await record({ status: gate.status || 'blocked_disabled' });
      if (gate.reason === 'rate' || gate.reason === 'budget' || gate.reason === 'role') {
        await api.rpc('ai_log_security', { p_kind: { rate: 'rate_limited', budget: 'budget_block', role: 'role_block' }[gate.reason], p_severity: 'info', p_conversation: convId,
          p_profile: profileId, p_agent: agent, p_detail: {} }, svc).catch(() => null);
      }
      return json(gate.reason === 'role' ? 403 : gate.reason === 'rate' ? 429 : 503, { error: `ai_${gate.reason}`, blocked: true, message: BLOCK_MESSAGES[gate.reason] || BLOCK_MESSAGES.disabled });
    }
    const pcfg = providerConfig(env);
    if (!pcfg.ready) return json(503, { error: 'ai_not_configured', blocked: true, message: BLOCK_MESSAGES.disabled });
    const provider = deps.provider || createProvider(pcfg, { fetchImpl: deps.fetch || fetch, timeoutMs: Math.min(gate.limits.timeoutMs, 30000), maxRetries: 1 });

    const channel = CHANNEL[agent] || (user ? 'customer_area' : 'site');
    const conv = await api.rpc('ai_open_conversation', { p_id: convId, p_agent: agent, p_profile: profileId, p_anon_hash: anonHash, p_channel: channel,
      p_page: typeof body.page === 'string' ? body.page.slice(0, 200) : null, p_context: safeContext(agent, body.context) || {} }, svc);
    if (conv.intervention_id && agent === 'customer') {
      return json(200, { conversationId: conv.id, reply: 'Questa richiesta è già stata inviata alla centrale. Per un nuovo problema apri una nuova conversazione.', closed: true });
    }
    const history = convId ? await api.rpc('ai_recent_messages', { p_conversation: conv.id, p_limit: 20 }, svc) : [];

    const userToken = user ? token : cfg.anonKey;
    const ctx = {
      conversationId: conv.id, profileId, role: gate.role, context: safeContext(agent, body.context),
      rpc: (fn, args) => api.rpc(fn, args, userToken),          // stessi permessi dell'utente
      service: (fn, args) => api.rpc(fn, args, svc),            // solo funzioni legate alla conversazione verificata
      loadAudit: agent === 'seo' ? () => loadBuildAudit(deps) : null   // audit tecnico della build (solo PRONTO SEO Agent)
    };
    const out = await runTurn({ agent, provider, history, message, ctx, state: { safety: conv.safety_level, draft: conv.draft ? { draft: conv.draft, draftHash: conv.draft_hash } : null },
      limits: { ...gate.limits, toolTimeoutMs: 8000 } });

    // registro: messaggi (ridotti), strumenti, sicurezza, pericolo, utilizzo
    await api.rpc('ai_append_messages', { p_conversation: conv.id, p_messages: [
      { role: 'user', content: out.storedUserText, redacted: out.redacted }, { role: 'assistant', content: out.reply }] }, svc);
    if (out.toolExecutions.length) await api.rpc('ai_log_tool_executions', { p_conversation: conv.id, p_agent: agent, p_profile: profileId, p_items: out.toolExecutions }, svc);
    for (const ev of out.securityEvents) {
      await api.rpc('ai_log_security', { p_kind: ev.kind, p_severity: ev.severity, p_conversation: conv.id, p_profile: profileId, p_agent: agent, p_detail: ev.detail || {} }, svc);
    }
    let draft = out.draft;
    if (agent === 'customer' && out.safety.level !== 'none' && out.safety.level !== conv.safety_level) {
      draft = await api.rpc('ai_set_draft', { p_conversation: conv.id, p_draft: draft?.draft || conv.draft || {}, p_safety: out.safety.level }, svc);
    }
    await record({ conversationId: conv.id, status: USAGE_STATUS[out.status] || 'error', provider: provider.name, model: provider.model, inputTokens: out.usage.input,
      outputTokens: out.usage.output, modelCalls: out.modelCalls, toolCalls: out.toolCalls, latencyMs: out.latencyMs });

    return json(200, {
      conversationId: conv.id, ...(issuedToken ? { conversationToken: issuedToken } : {}), ai: true,
      reply: out.reply, safety: out.safety, draft: draft && draft.draft ? { draft: draft.draft, draftHash: draft.draftHash, version: draft.version } : null,
      proposals: out.proposals, humanHelp: out.humanHelp, status: out.status, budgetWarning: Boolean(gate.warn) && agent !== 'customer',
      suggestions: convId ? [] : SUGGESTIONS[agent].slice(0, 4)
    });
  } catch (err) {
    if (err.status === 403 || /non disponibile|bloccata/i.test(err.message || '')) return json(403, { error: 'forbidden', message: 'Conversazione non disponibile: aprine una nuova.' });
    await record({ conversationId: convId, status: 'error' });
    return json(502, { error: 'backend_unavailable', message: 'Il servizio non risponde in questo momento: nessuna richiesta è stata registrata. ' + FALLBACK_CONTACT });
  }
}
