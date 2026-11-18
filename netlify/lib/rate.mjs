/**
 * Limite di frequenza per connessione (Prompt 8) sui moduli pubblici.
 * Usa l'impronta salata dell'IP (mai l'IP in chiaro) e la funzione rate_limit_hit (solo service role).
 * Se il controllo non è disponibile (backend senza la migrazione, errore di rete) la richiesta
 * PROCEDE: una richiesta di intervento non deve mai andare persa per un problema del contatore.
 */
import { ipHash } from './ai.mjs';

export async function overLimit({ api, cfg, req, context, env, bucket, limit, windowSeconds = 3600 }) {
  if (!cfg.serviceReady) return false;
  try {
    const ok = await api.rpc('rate_limit_hit', { p_bucket: bucket, p_key_hash: ipHash(req, context, env), p_limit: limit, p_window_seconds: windowSeconds }, api.serviceToken());
    return ok === false;
  } catch { return false; }
}
export const TOO_MANY = 'Abbiamo ricevuto molte richieste da questa connessione in poco tempo. Riprova più tardi oppure chiamaci: ti rispondiamo subito.';
