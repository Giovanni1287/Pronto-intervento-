/**
 * Protezione dello STAGING (Prompt 8) — Netlify Edge Function, attiva solo se nel progetto
 * Netlify è impostata STAGING_BASIC_AUTH="utente:password-lunga".
 * - Nel progetto di PRODUZIONE la variabile NON va impostata: la funzione lascia passare tutto.
 * - Nello staging chiede le credenziali (HTTP Basic, solo su HTTPS) per ogni pagina e risorsa
 *   e aggiunge X-Robots-Tag: noindex, nofollow anche alle risposte autorizzate.
 * - Esclude le Netlify Functions: i webhook (myPOS sandbox, deploy Netlify) hanno la propria
 *   verifica di firma e non possono inviare credenziali Basic. Le aree riservate restano protette
 *   anche dal login Supabase e dalla RLS: questa è una barriera in più, non l'unica.
 * Funziona sul piano gratuito (la protezione con password integrata di Netlify è a pagamento).
 */
const enc = new TextEncoder();
/** confronto a tempo costante (non rivela quanti caratteri coincidono) */
export function safeEqual(a, b) {
  const x = enc.encode(String(a)); const y = enc.encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}
export function decodeBasic(header) {
  const m = /^Basic\s+([A-Za-z0-9+/=]+)$/.exec(header || '');
  if (!m) return null;
  try { return atob(m[1]); } catch { return null; }
}
const readEnv = (k) => (globalThis.Netlify?.env?.get ? globalThis.Netlify.env.get(k) : globalThis.process?.env?.[k]);

export default async function stagingAuth(request, context) {
  const expected = readEnv('STAGING_BASIC_AUTH');
  if (!expected) {
    // Prompt 10: uno staging senza password resta CHIUSO (mai pubblico per dimenticanza):
    // progetto dichiarato di staging oppure sito Netlify "pronto-intervento-roma-2".
    let host = '';
    try { host = new URL(request.url).hostname; } catch { /* URL non valida */ }
    if (readEnv('APP_ENVIRONMENT') === 'staging' || /(^|--)pronto-intervento-roma-2\.netlify\.app$/.test(host)) {
      return new Response('Staging non configurato: impostare STAGING_BASIC_AUTH nelle variabili del progetto Netlify.', { status: 503, headers: { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    return context.next();                                     // produzione: nessun effetto
  }
  if (!/^[^:]{3,}:.{12,}$/.test(expected)) {                   // configurazione debole o errata: chiude, non apre
    return new Response('Staging non configurato correttamente.', { status: 503, headers: { 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store' } });
  }
  const given = decodeBasic(request.headers.get('authorization'));
  if (!given || !safeEqual(given, expected)) {
    return new Response('Accesso riservato: anteprima di collaudo di Pronto Intervento Roma.', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Staging Pronto Intervento Roma", charset="UTF-8"', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
  const res = await context.next();
  const out = new Response(res.body, res);
  out.headers.set('X-Robots-Tag', 'noindex, nofollow');
  out.headers.set('Cache-Control', 'private, no-store');
  return out;
}

export const config = { path: '/*', excludedPath: ['/.netlify/functions/*'] };
