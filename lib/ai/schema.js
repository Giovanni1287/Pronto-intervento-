/**
 * Validatore JSON Schema minimo (sottoinsieme usato dagli strumenti di PRONTO AI).
 * Gli argomenti proposti dal modello sono DATI NON AFFIDABILI: ogni chiamata a uno
 * strumento passa da qui prima di raggiungere il backend. Proprietà non dichiarate,
 * tipi errati, valori fuori elenco o fuori limite → chiamata rifiutata.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (Number.isInteger(v)) return 'integer';
  return typeof v;
}

function matchesType(v, t) {
  const actual = typeOf(v);
  if (Array.isArray(t)) return t.some((x) => matchesType(v, x));
  if (t === 'number') return actual === 'number' || actual === 'integer';
  return actual === t;
}

export function validate(schema, value, path = '$') {
  const errors = [];
  const err = (msg) => errors.push(`${path}: ${msg}`);
  if (schema.type && !matchesType(value, schema.type)) { err(`tipo atteso ${[].concat(schema.type).join('|')}`); return errors; }
  if (value === null) return errors;
  if (schema.enum && !schema.enum.includes(value)) err('valore non ammesso');
  if (typeof value === 'string') {
    if (schema.minLength != null && value.length < schema.minLength) err(`almeno ${schema.minLength} caratteri`);
    if (schema.maxLength != null && value.length > schema.maxLength) err(`al massimo ${schema.maxLength} caratteri`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) err('formato non valido');
    if (schema.format === 'uuid' && !UUID.test(value)) err('identificativo non valido');
    if (schema.format === 'date' && (!DATE.test(value) || Number.isNaN(Date.parse(value)))) err('data non valida');
    if (schema.format === 'date-time' && (!/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value)))) err('data e ora non valide');
  }
  if (typeof value === 'number') {
    if (schema.minimum != null && value < schema.minimum) err(`minimo ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) err(`massimo ${schema.maximum}`);
  }
  if (Array.isArray(value)) {
    if (schema.maxItems != null && value.length > schema.maxItems) err(`al massimo ${schema.maxItems} elementi`);
    if (schema.minItems != null && value.length < schema.minItems) err(`almeno ${schema.minItems} elementi`);
    if (schema.items) value.forEach((v, i) => errors.push(...validate(schema.items, v, `${path}[${i}]`)));
  }
  if (typeOf(value) === 'object') {
    const props = schema.properties || {};
    for (const k of schema.required || []) if (!(k in value)) err(`campo obbligatorio "${k}"`);
    for (const [k, v] of Object.entries(value)) {
      if (props[k]) errors.push(...validate(props[k], v, `${path}.${k}`));
      else if (schema.additionalProperties === false) err(`campo non previsto "${k}"`);
    }
  }
  return errors;
}

/** Parsing difensivo degli argomenti (stringa JSON per OpenAI, oggetto per Anthropic). */
export function parseArgs(raw) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw !== 'string' || raw.length > 20000) return undefined;
  try { const v = JSON.parse(raw || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : undefined; } catch { return undefined; }
}
