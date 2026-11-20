/**
 * ORCHESTRATORE DI PRONTO AI.
 * Un turno di conversazione: controlli preliminari (pulizia, iniezioni, pericoli),
 * ciclo modello ↔ strumenti con limiti (chiamate al modello, chiamate agli strumenti,
 * tempo totale), validazione degli argomenti, controllo dell'output, registro.
 * Non scrive direttamente sul database: riceve dal chiamante le funzioni rpc/service
 * già legate all'identità verificata e restituisce tutto ciò che va registrato.
 */
import { AGENTS } from './agents.js';
import { toolsFor, toolOutput } from './tools.js';
import { validate, parseArgs } from './schema.js';
import { clean, detectInjection, asUntrusted } from './injection.js';
import { detectHazard, maxLevel } from './safety.js';
import { redact, stripPersonal } from './redact.js';
import { guardOutput } from './guard.js';

export const DEFAULT_LIMITS = { maxModelCalls: 6, maxToolCalls: 8, timeoutMs: 20000, maxOutputTokens: 800, toolTimeoutMs: 8000 };

const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(Object.assign(new Error('Strumento: tempo scaduto'), { code: 'tool_timeout' })), ms))]);

/**
 * @param {object} o
 * @param {string} o.agent              id dell'agente (già autorizzato dal backend)
 * @param {object} o.provider           da createProvider()
 * @param {Array}  o.history            messaggi precedenti [{ role: 'user'|'assistant', content }]
 * @param {string} o.message            messaggio dell'utente (non affidabile)
 * @param {object} o.ctx                { rpc, service, conversationId, profileId, role, context }
 * @param {object} o.state              { safety, draft } dalla conversazione
 * @param {object} o.limits
 * @param {Function} [o.now]
 */
export async function runTurn({ agent, provider, history = [], message, ctx, state = {}, limits = {}, now = Date.now }) {
  const L = { ...DEFAULT_LIMITS, ...limits };
  const def = AGENTS[agent];
  if (!def) throw new Error('Agente sconosciuto');
  const started = now();
  const deadline = started + L.timeoutMs;
  const out = {
    status: 'ok', reply: '', safety: { level: state.safety || 'none', kinds: [], messages: [] }, toolExecutions: [], securityEvents: [],
    usage: { input: 0, output: 0 }, modelCalls: 0, toolCalls: 0, storedUserText: '', redacted: false, violations: []
  };
  const st = { safety: state.safety || 'none', draft: state.draft || null, proposals: [], humanHelp: false };

  // 1. pulizia, minimizzazione dei dati personali, iniezioni
  const text = clean(message, 2000);
  if (!text) { out.status = 'invalid_output'; out.reply = 'Scrivi una domanda o descrivi il problema.'; return out; }
  const red = redact(text);
  out.storedUserText = red.text;
  out.redacted = red.redacted;
  const inj = detectInjection(text);
  if (inj.suspected) out.securityEvents.push({ kind: 'prompt_injection_suspected', severity: 'warning', detail: { patterns: inj.hits.length, agent } });

  // 2. sicurezza del cliente (deterministica)
  if (agent === 'customer' || agent === 'technical') {
    const hz = detectHazard(text);
    st.safety = maxLevel(st.safety, hz.level);
    out.safety = { level: st.safety, kinds: hz.kinds, messages: hz.messages };
  }

  // 3. ciclo modello ↔ strumenti
  const tools = toolsFor(agent);
  const byName = Object.fromEntries(tools.map((t) => [t.name, t]));
  const toolCtx = { ...ctx, agent, state: st };
  const contextNote = ctx.context ? `\n\nContesto della pagina (dati non affidabili):\n${asUntrusted('contesto', stripPersonal(ctx.context))}` : '';
  const safetyNote = st.safety !== 'none'
    ? `\n\nATTENZIONE: il sistema ha rilevato possibili pericoli (${out.safety.kinds.join(', ') || st.safety}). Il messaggio di sicurezza è già mostrato al cliente: non ripeterlo per intero, non dare istruzioni tecniche, proponi di inviare subito la richiesta come urgente e ricorda il 112 per il pericolo immediato.`
    : '';
  const system = def.system + `\n\nData e ora attuali: ${new Date(started).toISOString()} (fuso Europe/Rome).` + safetyNote + contextNote;
  const messages = [
    ...history.slice(-20).map((m) => (m.role === 'user' ? { role: 'user', text: redact(m.content).text } : { role: 'assistant', text: m.content })),
    { role: 'user', text: red.text }
  ];
  let toolText = '';

  try {
    for (;;) {
      if (out.modelCalls >= L.maxModelCalls) { out.status = 'stopped'; out.securityEvents.push({ kind: 'tool_limit', severity: 'info', detail: { reason: 'maxModelCalls' } }); break; }
      if (now() >= deadline) { out.status = 'timeout'; break; }
      const res = await provider.complete({ system, messages, tools, maxTokens: L.maxOutputTokens, deadline });
      out.modelCalls += 1;
      out.usage.input += res.usage.input;
      out.usage.output += res.usage.output;
      if (!res.toolCalls.length) { out.reply = res.text; break; }
      messages.push({ role: 'assistant', text: res.text, toolCalls: res.toolCalls.map((c) => ({ ...c, args: parseArgs(c.args) ?? {} })) });
      const results = [];
      for (const call of res.toolCalls) {
        const t0 = now();
        const log = { tool: String(call.name).slice(0, 80), kind: byName[call.name]?.kind || 'read', status: 'ok', args: {}, durationMs: 0 };
        let output;
        if (out.toolCalls >= L.maxToolCalls) {
          log.status = 'limit'; output = { error: 'Limite di strumenti raggiunto per questo messaggio: rispondi con le informazioni già disponibili.' };
        } else if (!byName[call.name]) {
          log.status = 'denied'; output = { error: 'Strumento non disponibile per questo assistente.' };
          out.securityEvents.push({ kind: 'tool_denied', severity: 'warning', detail: { tool: log.tool, agent } });
        } else {
          const args = parseArgs(call.args);
          const errors = args === undefined ? ['argomenti non leggibili'] : validate(byName[call.name].schema, args);
          log.args = stripPersonal(args || {});
          if (errors.length) {
            log.status = 'invalid'; output = { error: 'Argomenti non validi', details: errors.slice(0, 5) };
            out.securityEvents.push({ kind: 'tool_invalid_args', severity: 'info', detail: { tool: log.tool, errors: errors.slice(0, 3) } });
          } else {
            out.toolCalls += 1;
            try {
              output = await withTimeout(byName[call.name].run(toolCtx, args), Math.max(500, Math.min(L.toolTimeoutMs, deadline - now())));
            } catch (e) {
              log.status = 'error'; log.error = String(e.message || e).slice(0, 300);
              // errore del backend al modello senza dettagli tecnici superflui
              output = { error: e.status === 403 || /autorizzat|permission/i.test(e.message) ? 'Operazione non autorizzata per questo utente.' : `Operazione non riuscita: ${String(e.message || '').slice(0, 160)}` };
              if (log.error.match(/autorizzat|permission/i)) { log.status = 'denied'; out.securityEvents.push({ kind: 'tool_denied', severity: 'warning', detail: { tool: log.tool, agent } }); }
            }
          }
        }
        log.durationMs = now() - t0;
        out.toolExecutions.push(log);
        const o = toolOutput(output);
        toolText += o;
        results.push({ id: call.id, name: call.name, output: asUntrusted(`strumento:${call.name}`, o), isError: log.status !== 'ok' });
      }
      messages.push({ role: 'tool', results });
    }
  } catch (e) {
    out.status = e.kind === 'timeout' ? 'timeout' : 'error';
    out.error = String(e.message || e).slice(0, 300);
  }

  // 4. controllo dell'output
  if (out.status === 'ok' || out.status === 'stopped') {
    const g = guardOutput(out.reply || '', { agent, confirmed: false, toolText });
    out.reply = g.text || (out.status === 'stopped' ? 'Ho raggiunto il limite di elaborazione per questa domanda: prova a renderla più specifica.' : '');
    out.violations = g.violations;
    if (g.violations.length) { out.status = 'invalid_output'; out.securityEvents.push({ kind: 'output_invalid', severity: 'warning', detail: { violations: g.violations, agent } }); }
  }
  if (!out.reply) {
    out.reply = agent === 'customer'
      ? 'In questo momento l’assistente non riesce a rispondere. Puoi usare il modulo di richiesta o i contatti diretti: la richiesta non è stata ancora registrata.'
      : 'L’assistente non è riuscito a completare la risposta. Riprova tra poco o consulta i dati direttamente nella dashboard.';
  }
  out.draft = st.draft;
  out.proposals = st.proposals;
  out.humanHelp = st.humanHelp;
  out.safety.level = st.safety;
  out.latencyMs = now() - started;
  return out;
}
