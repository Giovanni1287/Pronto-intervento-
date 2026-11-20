/**
 * Controllo deterministico dell'output del modello prima di mostrarlo.
 * Blocca affermazioni non consentite (arrivi garantiti, richieste "registrate"
 * senza conferma del gestionale, servizio di emergenza pubblico, prezzi non
 * provenienti dagli strumenti) e limita la lunghezza.
 */
const n = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const FALSE_CLAIMS = [
  { code: 'arrival_claim', re: /(tecnico|squadra|operatore)\s+(e\s+)?(sta\s+arrivando|in\s+arrivo|e\s+partito|arrivera\s+(entro|tra|fra))/ },
  { code: 'eta_guarantee', re: /(arriv\w*|interven\w*)\s+(garantit\w*\s+)?(entro|in)\s+\d+\s*(minuti|min|ore|ora)\b.{0,20}(garantit|sicur|certament)?/ },
  { code: 'guarantee', re: /(garantiamo|ti garantisco|le garantisco)\s+(l['’]?\s*)?(arrivo|intervento|tempi)/ },
  { code: 'public_emergency', re: /(siamo|e)\s+(un\s+)?servizio\s+(pubblico\s+)?di\s+emergenza\b/ },
  { code: 'registered_claim', re: /(richiesta|prenotazione|appuntamento)\s+(e\s+stat[ao]\s+)?(registrat|inviat|confermat|fissat|prenotat)\w*/, unlessConfirmed: true },
  { code: 'certification_claim', re: /(certific\w+|dichiarazione di conformita)\s+(rilasciat|emess)\w*/, agents: ['technical'] }
];

const EURO = /(?:€\s?\d[\d.,]*|\d[\d.,]*\s?(?:€|euro\b))/gi;

function amounts(text) {
  return (String(text).match(EURO) || []).map((m) => Number(m.replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'))).filter((x) => Number.isFinite(x));
}

/**
 * @param text       testo del modello
 * @param ctx        { agent, confirmed, toolText } — toolText: risultati degli strumenti di questo turno
 * @returns { text, violations[] }
 */
export function guardOutput(text, { agent, confirmed = false, toolText = '' } = {}) {
  let out = String(text || '').replace(/\u0000/g, '').trim().slice(0, 4000);
  const violations = [];
  const t = n(out);
  for (const c of FALSE_CLAIMS) {
    if (c.agents && !c.agents.includes(agent)) continue;
    if (c.unlessConfirmed && (confirmed || agent !== 'customer')) continue;
    if (c.re.test(t)) violations.push(c.code);
  }
  if (agent === 'customer' || agent === 'commercial') {
    const known = new Set([...amounts(toolText), ...(toolText.match(/"(?:priceCents|grossCents|netCents|vatCents)":\s*(\d+)/g) || []).map((m) => Number(m.split(':')[1]) / 100)]);
    const unknown = amounts(out).filter((a) => a > 0 && ![...known].some((k) => Math.abs(k - a) < 0.01));
    if (unknown.length) violations.push('price_not_from_tools');
  }
  if (violations.length) {
    out = agent === 'customer'
      ? 'Preferisco non darti un’informazione che non posso verificare. Posso aiutarti a preparare la richiesta: la centrale ti ricontatterà con disponibilità e costi confermati. Se c’è un pericolo immediato chiama il 112.'
      : 'Risposta trattenuta dal controllo di sicurezza: conteneva affermazioni non verificate dagli strumenti (' + violations.join(', ') + '). Riformula la domanda o consulta i dati nella dashboard.';
  }
  return { text: out, violations };
}
