/**
 * Certificato digitale di intervento.
 *
 * NON è una dichiarazione di conformità né una certificazione tecnica
 * obbligatoria: è un documento riepilogativo del lavoro eseguito.
 *
 * Integrità: il contenuto (payload) viene firmato con un'impronta SHA-256
 * calcolata dal database al momento dell'emissione; i certificati non si
 * modificano, si sostituiscono con una nuova revisione tracciata.
 */
export const CERTIFICATE_TITLE = 'Certificato digitale di intervento';
export const CERTIFICATE_DISCLAIMER =
  'Documento riepilogativo dell’intervento eseguito. Non costituisce dichiarazione di conformità né certificazione tecnica obbligatoria.';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32: niente I, L, O, U

/** "PIR-2026-7K4Q-9M2X": non sequenziale, per non rendere enumerabili i certificati. */
export function certificateNumber(year, randomBytes) {
  if (!randomBytes || randomBytes.length < 8) throw new Error('Servono almeno 8 byte casuali');
  let s = '';
  for (let i = 0; i < 8; i++) s += ALPHABET[randomBytes[i] % 32];
  return `PIR-${year}-${s.slice(0, 4)}-${s.slice(4)}`;
}

export const isCertificateNumber = (n) => /^PIR-\d{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/.test(String(n || ''));

/** Campi obbligatori prima dell'emissione (dopo la verifica dell'amministratore). */
export function validateForIssue(data) {
  const e = [];
  const req = ['customerName', 'serviceName', 'categoryName', 'workDate', 'addressLine', 'city', 'technicianName', 'workDescription'];
  for (const k of req) if (!data[k] || String(data[k]).trim() === '') e.push(`Campo obbligatorio mancante: ${k}`);
  if (data.photos?.some((p) => !p.consent)) e.push('Sono presenti fotografie senza autorizzazione');
  if (!data.adminVerifiedAt) e.push('Dati non ancora verificati dall’amministratore');
  return e;
}

/** Dati mostrati dalla pagina pubblica del QR code: nessun dato personale. */
export const PUBLIC_FIELDS = ['number', 'status', 'issuedAt', 'revision', 'companyName', 'categoryName', 'serviceName', 'workDate', 'city', 'protectedPlanName', 'protectedPlanEndsAt', 'payloadHashShort'];

export function publicView(cert) {
  const out = {};
  const src = { ...cert.payload, ...cert, payloadHashShort: cert.payloadHash ? cert.payloadHash.slice(0, 16) : null };
  for (const k of PUBLIC_FIELDS) if (src[k] !== undefined) out[k] = src[k];
  return out;
}

/** Stringa canonica (chiavi ordinate) per impronte calcolate lato applicazione. */
export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export async function sha256Hex(text) {
  const buf = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Verifica: stato, revisione corrente e corrispondenza dell'impronta. */
export async function verify(cert, recomputedHash) {
  if (!cert) return { valid: false, reason: 'Certificato inesistente' };
  if (cert.status === 'revoked') return { valid: false, reason: 'Certificato revocato' };
  if (cert.status === 'superseded') return { valid: false, reason: 'Sostituito da una revisione successiva', supersededBy: cert.supersededBy };
  const hash = recomputedHash ?? (await sha256Hex(canonical(cert.payload)));
  if (hash !== cert.payloadHash) return { valid: false, reason: 'Contenuto non corrispondente all’impronta registrata' };
  return { valid: true };
}

/** Informazioni sulle tutele: sempre presenti, indipendenti dal piano acquistato. */
export const LEGAL_PROTECTION_TEXT =
  'Sui lavori eseguiti restano valide le tutele previste dalla legge (ad esempio Codice civile e, ove applicabile, Codice del Consumo), indipendentemente dall’acquisto di servizi aggiuntivi. Eventuali difetti si segnalano dall’area cliente o contattando l’impresa.';
