/**
 * Adattatore dei provider AI (solo lato server).
 * Formato interno dei messaggi, indipendente dal provider:
 *   { role: 'user', text }
 *   { role: 'assistant', text, toolCalls: [{ id, name, args }] }
 *   { role: 'tool', results: [{ id, name, output, isError }] }
 * Provider supportati (API ufficiali verificate a novembre 2026):
 *   - anthropic: Messages API  POST https://api.anthropic.com/v1/messages
 *                (header x-api-key, anthropic-version: 2023-06-01; blocchi tool_use / tool_result)
 *   - openai:    Responses API POST https://api.openai.com/v1/responses
 *                (tools type "function", elementi function_call / function_call_output, store: false)
 * Il modello si sceglie con AI_MODEL (nessun modello predefinito "di memoria").
 * Timeout per chiamata, nuovi tentativi limitati solo per errori temporanei (429/5xx/rete).
 */
export class ProviderError extends Error {
  constructor(message, { status, retryable = false, kind = 'error' } = {}) { super(message); this.status = status; this.retryable = retryable; this.kind = kind; }
}

export function providerConfig(env = process.env) {
  const provider = String(env.AI_PROVIDER || '').trim().toLowerCase();
  const cfg = {
    provider,
    model: String(env.AI_MODEL || '').trim(),
    apiKey: String(env.AI_API_KEY || '').trim(),
    baseUrl: String(env.AI_BASE_URL || '').trim().replace(/\/$/, ''),
    envKillSwitch: String(env.AI_ENABLED || '').trim().toLowerCase() === 'false'
  };
  cfg.ready = ['anthropic', 'openai'].includes(provider) && Boolean(cfg.model && cfg.apiKey) && !cfg.envKillSwitch;
  return cfg;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRYABLE = new Set([408, 409, 425, 429, 500, 502, 503, 504, 529]);

async function post(fetchImpl, url, headers, body, { timeoutMs, maxRetries, deadline }) {
  let attempt = 0;
  for (;;) {
    const left = deadline ? deadline - Date.now() : timeoutMs;
    if (left <= 500) throw new ProviderError('Tempo massimo della richiesta superato', { kind: 'timeout' });
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), Math.min(timeoutMs, left));
    let res;
    try {
      res = await fetchImpl(url, { method: 'POST', headers, body: JSON.stringify(body), signal: ctl.signal });
    } catch (e) {
      clearTimeout(timer);
      if (e?.name === 'AbortError') throw new ProviderError('Il provider AI non ha risposto in tempo', { kind: 'timeout' });
      if (attempt++ < maxRetries) { await sleep(400 * 2 ** attempt); continue; }
      throw new ProviderError('Provider AI non raggiungibile', { retryable: true });
    }
    clearTimeout(timer);
    if (res.ok) return res.json();
    let detail = '';
    try { detail = (await res.json())?.error?.message || ''; } catch { /* corpo non JSON */ }
    if (RETRYABLE.has(res.status) && attempt++ < maxRetries) {
      const ra = Number(res.headers?.get?.('retry-after'));
      await sleep(Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 2000) : 400 * 2 ** attempt);
      continue;
    }
    // il dettaglio del provider resta nei registri tecnici, mai mostrato all'utente
    throw new ProviderError(`Provider AI: HTTP ${res.status}${detail ? ` — ${detail.slice(0, 200)}` : ''}`, { status: res.status, retryable: RETRYABLE.has(res.status) });
  }
}

// ---------------------------------------------------------------- Anthropic Messages API
export function toAnthropic(messages) {
  return messages.map((m) => {
    if (m.role === 'user') return { role: 'user', content: m.text };
    if (m.role === 'assistant') {
      const content = [];
      if (m.text) content.push({ type: 'text', text: m.text });
      for (const c of m.toolCalls || []) content.push({ type: 'tool_use', id: c.id, name: c.name, input: c.args || {} });
      return { role: 'assistant', content };
    }
    return { role: 'user', content: m.results.map((r) => ({ type: 'tool_result', tool_use_id: r.id, content: r.output, ...(r.isError ? { is_error: true } : {}) })) };
  });
}

export function fromAnthropic(data) {
  const blocks = Array.isArray(data?.content) ? data.content : [];
  return {
    text: blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim(),
    toolCalls: blocks.filter((b) => b.type === 'tool_use').map((b) => ({ id: b.id, name: b.name, args: b.input })),
    usage: { input: data?.usage?.input_tokens || 0, output: data?.usage?.output_tokens || 0 },
    stop: data?.stop_reason === 'max_tokens' ? 'max_tokens' : data?.stop_reason === 'tool_use' ? 'tool_use' : 'end'
  };
}

// ---------------------------------------------------------------- OpenAI Responses API
export function toOpenAI(messages) {
  const items = [];
  for (const m of messages) {
    if (m.role === 'user') items.push({ role: 'user', content: m.text });
    else if (m.role === 'assistant') {
      if (m.text) items.push({ role: 'assistant', content: m.text });
      for (const c of m.toolCalls || []) items.push({ type: 'function_call', call_id: c.id, name: c.name, arguments: JSON.stringify(c.args || {}) });
    } else for (const r of m.results) items.push({ type: 'function_call_output', call_id: r.id, output: r.output });
  }
  return items;
}

export function fromOpenAI(data) {
  const out = Array.isArray(data?.output) ? data.output : [];
  const text = out.filter((o) => o.type === 'message').flatMap((o) => o.content || []).filter((c) => c.type === 'output_text').map((c) => c.text).join('\n').trim();
  return {
    text,
    toolCalls: out.filter((o) => o.type === 'function_call').map((o) => ({ id: o.call_id, name: o.name, args: o.arguments })),
    usage: { input: data?.usage?.input_tokens || 0, output: data?.usage?.output_tokens || 0 },
    stop: data?.status === 'incomplete' ? 'max_tokens' : out.some((o) => o.type === 'function_call') ? 'tool_use' : 'end'
  };
}

/**
 * complete({ system, messages, tools: [{ name, description, schema }], maxTokens, deadline })
 * → { text, toolCalls, usage: { input, output }, stop }
 */
export function createProvider(cfg, { fetchImpl = fetch, timeoutMs = 20000, maxRetries = 1 } = {}) {
  if (!cfg?.ready) return { name: 'disabled', model: null, ready: false, complete: async () => { throw new ProviderError('Provider AI non configurato', { kind: 'not_configured' }); } };
  const opts = (deadline) => ({ timeoutMs, maxRetries, deadline });
  if (cfg.provider === 'anthropic') {
    const url = `${cfg.baseUrl || 'https://api.anthropic.com'}/v1/messages`;
    const headers = { 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
    return {
      name: 'anthropic', model: cfg.model, ready: true,
      async complete({ system, messages, tools = [], maxTokens = 800, deadline }) {
        const body = { model: cfg.model, max_tokens: maxTokens, system, messages: toAnthropic(messages) };
        if (tools.length) body.tools = tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.schema }));
        return fromAnthropic(await post(fetchImpl, url, headers, body, opts(deadline)));
      }
    };
  }
  const url = `${cfg.baseUrl || 'https://api.openai.com'}/v1/responses`;
  const headers = { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' };
  return {
    name: 'openai', model: cfg.model, ready: true,
    async complete({ system, messages, tools = [], maxTokens = 800, deadline }) {
      // store: false → le conversazioni non vengono conservate dal provider per il recupero via API
      const body = { model: cfg.model, instructions: system, input: toOpenAI(messages), max_output_tokens: maxTokens, store: false };
      if (tools.length) body.tools = tools.map((t) => ({ type: 'function', name: t.name, description: t.description, parameters: t.schema, strict: false }));
      return fromOpenAI(await post(fetchImpl, url, headers, body, opts(deadline)));
    }
  };
}
