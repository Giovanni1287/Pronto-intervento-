/**
 * Pannello di chat PRONTO AI per le aree riservate (console e area tecnico).
 * Parla solo con /.netlify/functions/ai-chat con il token dell'utente: ruolo,
 * permessi, budget e limiti sono verificati dal server a ogni messaggio.
 * Ogni risposta è marcata come generata dall'AI; le proposte create finiscono in
 * "Azioni AI da approvare" e non hanno effetti finché una persona non le approva.
 */
import { h, fill, notice, fn } from './core.js';

const LABEL = { customer: 'Customer Assistant', dispatch: 'Dispatch Assistant', technical: 'Assistente tecnico AI', commercial: 'Commercial Assistant', management: 'Management Assistant', seo: 'PRONTO SEO Agent' };

export function aiChatPanel({ agent, context = null, intro, suggestions = [], replyActions = [], compact = false }) {
  let conversationId = null; let busy = false;
  const log = h('div', { class: 'aic-log', role: 'log', 'aria-live': 'polite', 'aria-label': `Conversazione con ${LABEL[agent]}` });
  const typing = h('div', { class: 'aic-typing', hidden: true, 'aria-label': 'PRONTO AI sta elaborando' }, h('span'), h('span'), h('span'));
  const input = h('textarea', { class: 'aic-input', rows: compact ? '2' : '2', maxlength: '2000', placeholder: 'Scrivi una domanda…', 'aria-label': `Domanda a ${LABEL[agent]}`,
    onkeydown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); } } });
  const sendBtn = h('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, 'Invia');
  const chips = h('div', { class: 'aic-chips' }, suggestions.map((s) => h('button', { type: 'button', class: 'aic-chip', onclick: () => send(s) }, s)));

  const add = (role, text, extra) => {
    const el = h('div', { class: `aic-msg aic-msg--${role}` },
      role === 'assistant' ? h('span', { class: 'aic-msg__who' }, `${LABEL[agent]} · risposta generata dall’AI`) : null,
      h('p', {}, text), extra || null);
    log.append(el);
    log.scrollTop = log.scrollHeight;
  };

  async function send(text) {
    const msg = String(text || '').trim();
    if (!msg || busy) return;
    busy = true; sendBtn.disabled = true; input.value = '';
    add('user', msg);
    typing.hidden = false;
    try {
      const r = await fn('ai-chat', { method: 'POST', body: { agent, message: msg, conversationId, context } });
      let d = {};
      try { d = await r.json(); } catch { /* risposta non JSON */ }
      typing.hidden = true;
      if (!r.ok) { log.append(notice(r.status === 429 ? 'warn' : 'info', d.message || (r.status === 503 ? 'PRONTO AI non è attivo o non è configurato.' : 'Assistente non disponibile in questo momento.'))); return; }
      conversationId = d.conversationId || conversationId;
      const extra = [];
      if (d.proposals?.length) {
        extra.push(h('div', { class: 'aic-props' }, h('b', {}, 'Proposte messe in coda (nessuna eseguita):'),
          h('ul', {}, d.proposals.map((p) => h('li', {}, `${p.number} — ${p.expectedEffect || ''} `, h('a', { href: '/admin/pronto-ai/#azioni' }, 'Apri "Azioni AI da approvare"'))))));
      }
      if (replyActions.length) extra.push(h('div', { class: 'aic-actions' }, replyActions.map((a) => h('button', { type: 'button', class: 'btn btn--ghost btn--sm', onclick: () => a.apply(d.reply) }, a.label))));
      if (d.budgetWarning) extra.push(h('p', { class: 'aic-small' }, 'Avviso: la spesa stimata di PRONTO AI ha superato la soglia di attenzione del budget mensile.'));
      add('assistant', d.reply, extra.length ? h('div', {}, extra) : null);
    } catch {
      typing.hidden = true;
      log.append(notice('error', 'Connessione non riuscita: nessuna operazione eseguita.'));
    } finally { busy = false; sendBtn.disabled = false; }
  }

  const el = h('div', { class: `aic${compact ? ' aic--compact' : ''}` },
    h('div', { class: 'aic-head' }, h('span', { class: 'aic-avatar', 'aria-hidden': 'true' }, 'AI'),
      h('div', {}, h('strong', {}, LABEL[agent]), h('small', {}, 'Assistente basato su intelligenza artificiale · le risposte vanno verificate'))),
    intro ? h('p', { class: 'aic-intro' }, intro) : null,
    chips, log, typing,
    h('form', { class: 'aic-composer', onsubmit: (e) => { e.preventDefault(); send(input.value); } }, input, sendBtn),
    h('button', { type: 'button', class: 'aic-reset', onclick: () => { conversationId = null; fill(log); } }, 'Nuova conversazione'));
  return el;
}
