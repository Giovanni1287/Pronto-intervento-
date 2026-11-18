/**
 * Separazione degli ambienti (Prompt 9).
 * - APP_ENVIRONMENT (variabile Netlify): "staging" oppure "production".
 * - Ogni database Supabase dichiara il proprio ambiente (tabella system_environment).
 * Se i due valori non coincidono, le funzioni che scrivono si rifiutano di operare: uno staging
 * configurato per errore con le chiavi di produzione non può modificare dati reali, e viceversa.
 * Esito memorizzato per la durata dell'istanza della funzione.
 */
import { json } from './backend.mjs';

let cache = null;
export function _resetEnvironmentCache() { cache = null; }

export function appEnvironment(env) {
  const v = String(env.APP_ENVIRONMENT || '').trim().toLowerCase();
  return ['staging', 'production', 'development'].includes(v) ? v : null;
}

/** { ok, app, db, reason } — mai eccezioni: in caso di dubbio ok=false con motivazione. */
export async function checkEnvironment({ api, env }) {
  const app = appEnvironment(env);
  if (cache && cache.app === app) return cache;
  let db = null; let reason = null;
  try { db = await api.rpc('system_environment', {}, api.serviceToken()); } catch (e) { reason = `ambiente del database non leggibile (${e.status || e.message})`; }
  let ok;
  if (!app) { ok = false; reason = 'APP_ENVIRONMENT non impostata (staging o production)'; }
  else if (reason) ok = false;
  else if (!db) { ok = app !== 'production'; reason = 'database senza ambiente dichiarato'; }
  else if (db !== app) { ok = false; reason = `il database è "${db}" ma il sito è "${app}"`; }
  else ok = true;
  cache = { ok, app, db, reason };
  return cache;
}

/** Per le funzioni che scrivono: Response 503 se gli ambienti non coincidono, altrimenti null. */
export async function environmentGuard({ api, env, cfg }) {
  if (!appEnvironment(env) && !env.APP_ENVIRONMENT && env.ENVIRONMENT_GUARD !== 'strict') return null; // ambienti precedenti al Prompt 9: nessun blocco
  if (!cfg.serviceReady) return null;
  const r = await checkEnvironment({ api, env });
  if (r.ok) return null;
  return json(503, { error: 'environment_mismatch', message: 'Servizio temporaneamente non disponibile: configurazione dell’ambiente da verificare. Nessun dato è stato registrato.', detail: r.reason });
}

/** Chiave Supabase: ruolo e progetto (formato JWT legacy) oppure tipo (chiavi sb_publishable_/sb_secret_). Mai il valore. */
export function describeSupabaseKey(key, url) {
  if (!key) return { present: false };
  if (/^sb_publishable_/.test(key)) return { present: true, format: 'nuovo', role: 'anon' };
  if (/^sb_secret_/.test(key)) return { present: true, format: 'nuovo', role: 'service_role' };
  const parts = key.split('.');
  if (parts.length !== 3) return { present: true, format: 'sconosciuto', role: null };
  try {
    const p = JSON.parse(Buffer.from(parts[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    let refFromUrl = null;
    try { refFromUrl = new URL(url).hostname.split('.')[0]; } catch { /* URL non valida */ }
    return { present: true, format: 'jwt', role: p.role || null, ref: p.ref || null, refMatchesUrl: p.ref ? p.ref === refFromUrl : null, expires: p.exp ? new Date(p.exp * 1000).toISOString() : null };
  } catch { return { present: true, format: 'sconosciuto', role: null }; }
}
