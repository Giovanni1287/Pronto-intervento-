/**
 * Minimizzazione dei dati personali: prima di inviare un testo al provider AI o di
 * salvarlo nei registri, recapiti e codici identificativi vengono sostituiti da
 * segnaposto. Nome, telefono ed email per la richiesta si raccolgono nel modulo di
 * conferma, mai nella chat.
 */
const RULES = [
  ['[email]', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi],
  ['[iban]', /\bIT\d{2}[A-Z]\d{10}[0-9A-Z]{12}\b/gi],
  ['[codice fiscale]', /\b[A-Z]{6}\d{2}[A-EHLMPR-T]\d{2}[A-Z]\d{3}[A-Z]\b/gi],
  ['[carta]', /\b(?:\d[ -]?){13,19}\b/g],
  ['[telefono]', /(?:\+|00)?\d[\d\s./-]{6,16}\d/g]
];

export function redact(text) {
  let out = String(text ?? '');
  let found = false;
  for (const [label, re] of RULES) {
    out = out.replace(re, (m) => {
      // numeri brevi (civici, anni, importi) non sono recapiti
      if (label === '[telefono]' && m.replace(/\D/g, '').length < 8) return m;
      found = true;
      return label;
    });
  }
  return { text: out, redacted: found };
}

/** Rimuove dai risultati degli strumenti i campi personali non necessari al modello. */
const PERSONAL_KEYS = new Set(['contact_phone', 'contactPhone', 'phone', 'contact_email', 'contactEmail', 'email', 'customer_email', 'address_line', 'addressLine',
  'contact', 'tax_code', 'taxCode', 'vat_number', 'iban', 'signature_path', 'link_token_hash']);

export function stripPersonal(value, depth = 0) {
  if (depth > 8 || value == null) return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => stripPersonal(v, depth + 1));
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) if (!PERSONAL_KEYS.has(k)) out[k] = stripPersonal(v, depth + 1);
    return out;
  }
  if (typeof value === 'string') return redact(value).text;
  return value;
}
