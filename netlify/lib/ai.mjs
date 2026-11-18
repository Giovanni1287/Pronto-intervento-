/**
 * Supporto comune alle funzioni di PRONTO AI (solo server).
 * - Impronte (SHA-256) del token di conversazione dei visitatori e dell'IP:
 *   nel database non si salvano token né indirizzi IP in chiaro.
 * - Identità sempre verificata con Supabase Auth: il ruolo non si deduce dal messaggio.
 */
import { createHash, randomBytes } from 'node:crypto';

export const sha256 = (s) => createHash('sha256').update(String(s)).digest('hex');
export const newConversationToken = () => randomBytes(32).toString('base64url');
export const validToken = (t) => typeof t === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(t);
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function clientIp(req, context) {
  return context?.ip || req.headers.get('x-nf-client-connection-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
}

export function ipHash(req, context, env) {
  // il sale (AI_HASH_SALT) rende le impronte non confrontabili con elenchi di IP noti
  return sha256(`${env.AI_HASH_SALT || 'pronto-ai'}:${clientIp(req, context)}`);
}

export async function readJson(req, max = 16000) {
  const raw = await req.text();
  if (raw.length > max) throw Object.assign(new Error('too_large'), { status: 413 });
  const v = JSON.parse(raw || '{}');
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('bad_request');
  return v;
}

export const CHANNEL = { customer: null, dispatch: 'dashboard', technical: 'technician', commercial: 'dashboard', management: 'dashboard', seo: 'dashboard' };

export const FALLBACK_CONTACT =
  'Puoi inviare la richiesta con il modulo del sito o usare i contatti diretti indicati nella pagina Contatti. Per un pericolo immediato chiama il 112.';

/** Messaggi per i blocchi del controllo di accesso (mai dettagli interni). */
export const BLOCK_MESSAGES = {
  disabled: 'PRONTO AI non è attivo in questo momento. ' + FALLBACK_CONTACT,
  budget: 'PRONTO AI è temporaneamente sospeso. ' + FALLBACK_CONTACT,
  rate: 'Hai inviato molti messaggi in poco tempo: riprova più tardi. ' + FALLBACK_CONTACT,
  role: 'Questo assistente non è disponibile per il tuo profilo.',
  unknown_agent: 'Assistente non disponibile.'
};
