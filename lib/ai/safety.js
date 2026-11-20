/**
 * Sicurezza del cliente — rilevazione DETERMINISTICA (non dipende dal modello).
 * Se nel messaggio compaiono segnali di pericolo, il backend mostra messaggi di
 * sicurezza prestabiliti, marca la richiesta come urgente e la segnala alla centrale.
 * Mai istruzioni tecniche su impianti elettrici, gas o altri sistemi pericolosi.
 * Pronto Intervento Roma NON è un servizio pubblico di emergenza: per il pericolo
 * immediato si indica il 112 (Numero Unico di Emergenza).
 */
const n = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const SIGNS = [
  { kind: 'gas', level: 'emergency', re: /(odore|puzza|sento|perdita|fuga)\s+(di\s+)?gas|\bgas\b.{0,30}(odore|puzza|perde|fuga|sento)|sibilo.{0,20}gas/ },
  { kind: 'fire', level: 'emergency', re: /\b(fiamm\w*|incendi\w*|fuoco|brucia\w*|fumo|scintill\w*|odore di bruciato|sta prendendo fuoco)\b/ },
  { kind: 'water_electric', level: 'emergency', re: /(acqua|bagnat\w*|allagat\w*|infiltrazion\w*|gocciola\w*).{0,60}(presa|prese|quadro|contatore|interruttor\w*|corrente|elettric\w*|cavi|fili|lampadar\w*)|(presa|prese|quadro|contatore|corrente|elettric\w*|cavi|fili).{0,60}(acqua|bagnat\w*|allagat\w*)/ },
  { kind: 'exposed_cables', level: 'hazard', re: /(cav[io]|fil[io])\s+(elettric\w*\s+)?(scopert\w*|spellat\w*|a vista|tranciat\w*|penzol\w*|nud[io])|(scossa|scosse|preso la scossa|prende la scossa)/ },
  { kind: 'flooding_electric', level: 'emergency', re: /(allagament\w*|allagat\w*|acqua alta|sommers\w*).{0,80}(elettric\w*|corrente|prese|quadro|caldaia)/ },
  { kind: 'person_danger', level: 'emergency', re: /(ferit\w*|svenut\w*|non respira|intossicat\w*|bambin\w* (chius\w*|bloccat\w*)|persona (bloccat\w*|intrappolat\w*)|crollo|crollat\w*|sta crollando|soffitto.{0,20}(cede|ceduto|crolla))/ },
  { kind: 'carbon_monoxide', level: 'emergency', re: /(monossido|caldaia.{0,30}(fumo|odore|mal di testa)|mal di testa.{0,40}caldaia)/ }
];

const MESSAGES = {
  gas: 'Se senti odore di gas: non accendere né spegnere luci o apparecchi elettrici, non usare fiamme o il citofono, apri le finestre solo se puoi farlo senza rischi ed esci dall’edificio. Da fuori chiama il 112 o il numero di pronto intervento gas indicato sulla bolletta.',
  fire: 'In caso di fiamme, fumo o odore di bruciato allontanati subito e chiama il 112. Non cercare di intervenire sull’impianto.',
  water_electric: 'Acqua vicino a prese, quadri o apparecchi elettrici è un pericolo: non toccare prese, interruttori o apparecchi e non camminare nell’acqua. Se c’è un pericolo immediato per le persone chiama il 112.',
  exposed_cables: 'Non toccare cavi scoperti o danneggiati e tieni lontani bambini e animali. Non tentare riparazioni da solo: serve un tecnico qualificato.',
  flooding_electric: 'Con un allagamento vicino a impianti elettrici o alla caldaia non entrare nell’acqua e non toccare apparecchi o interruttori. Se ci sono persone in pericolo chiama il 112.',
  person_danger: 'Se una persona è ferita, intrappolata o in pericolo chiama subito il 112.',
  carbon_monoxide: 'Se sospetti fumi o monossido dalla caldaia: esci all’aria aperta e chiama il 112. Non restare negli ambienti.'
};

export const NOT_EMERGENCY_SERVICE = 'Pronto Intervento Roma non è un servizio pubblico di emergenza e non può garantire tempi di arrivo non confermati dalla centrale.';

export function detectHazard(text) {
  const t = n(text);
  const kinds = SIGNS.filter((s) => s.re.test(t));
  if (!kinds.length) return { level: 'none', kinds: [], messages: [] };
  const level = kinds.some((k) => k.level === 'emergency') ? 'emergency' : 'hazard';
  return { level, kinds: kinds.map((k) => k.kind), messages: [...kinds.map((k) => MESSAGES[k.kind]), NOT_EMERGENCY_SERVICE] };
}

/** Il livello registrato non si abbassa con i messaggi successivi. */
export const maxLevel = (a, b) => (['none', 'hazard', 'emergency'].indexOf(a) >= ['none', 'hazard', 'emergency'].indexOf(b) ? a : b);
