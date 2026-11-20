/**
 * Logica di dominio B2B (Business, Hotel, Condomini, Corporate).
 * Pura e testabile: il database applica le stesse regole nelle funzioni SQL.
 */
import { assertCents } from './money.js';
import { addMonths } from './dates.js';

/* ================================================================ dati fiscali */

/** Partita IVA italiana: 11 cifre con cifra di controllo (algoritmo di Luhn modificato). */
export function isValidItalianVat(v) {
  const s = String(v || '').replace(/\s+/g, '').replace(/^IT/i, '');
  if (!/^\d{11}$/.test(s) || /^0+$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let d = Number(s[i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return (10 - (sum % 10)) % 10 === Number(s[10]);
}

/* ================================================================ ruoli aziendali */

export const MEMBER_ROLES = Object.freeze({
  company_admin: { label: 'Amministratore aziendale', allLocations: true, manageMembers: true, manageLocations: true, acceptContracts: true, viewContracts: true, viewPrices: true, createRequests: true, viewAllRequests: true },
  maintenance_manager: { label: 'Responsabile della manutenzione', allLocations: true, manageMembers: false, manageLocations: true, acceptContracts: false, viewContracts: true, viewPrices: true, createRequests: true, viewAllRequests: true },
  site_contact: { label: 'Referente di sede', allLocations: false, manageMembers: false, manageLocations: false, acceptContracts: false, viewContracts: false, viewPrices: false, createRequests: true, viewAllRequests: true },
  limited_user: { label: 'Utente con permessi limitati', allLocations: false, manageMembers: false, manageLocations: false, acceptContracts: false, viewContracts: false, viewPrices: false, createRequests: true, viewAllRequests: false }
});

/** Una sede è accessibile a un membro? (i ruoli senza "allLocations" vedono solo le sedi assegnate) */
export function canAccessLocation(member, location) {
  if (!member || !location || member.accountId !== location.accountId) return false; // mai tra aziende diverse
  const r = MEMBER_ROLES[member.role];
  if (!r) return false;
  return r.allLocations || (member.locationIds || []).includes(location.id);
}

/* ================================================================ stati delle richieste */

export const REQUEST_STATUS = Object.freeze({
  submitted: 'Inviata', under_review: 'In valutazione', to_schedule: 'Da programmare', scheduled: 'Programmata',
  technician_assigned: 'Tecnico assegnato', in_progress: 'In lavorazione', completed: 'Completata', closed: 'Chiusa', cancelled: 'Annullata'
});

/** Transizioni ammesse per attore. Il cliente può solo annullare finché la richiesta non è programmata. */
const FLOW = ['submitted', 'under_review', 'to_schedule', 'scheduled', 'technician_assigned', 'in_progress', 'completed', 'closed'];
const TRANSITIONS = {
  admin: {
    submitted: ['under_review', 'cancelled'], under_review: ['to_schedule', 'cancelled'], to_schedule: ['scheduled', 'cancelled'],
    scheduled: ['technician_assigned', 'to_schedule', 'cancelled'], technician_assigned: ['in_progress', 'scheduled', 'cancelled'],
    in_progress: ['completed'], completed: ['closed', 'in_progress'], closed: [], cancelled: []
  },
  technician: { technician_assigned: ['in_progress'], in_progress: ['completed'] },
  client: { submitted: ['cancelled'], under_review: ['cancelled'], to_schedule: ['cancelled'] }
};

export function canTransition(actor, from, to, ctx = {}) {
  if (!REQUEST_STATUS[from] || !REQUEST_STATUS[to]) return { ok: false, reason: 'Stato non valido' };
  if (actor === 'technician' && !ctx.isAssignedTechnician) return { ok: false, reason: 'Richiesta non assegnata a questo tecnico' };
  if (actor === 'client' && !ctx.canManageRequest) return { ok: false, reason: 'Permessi insufficienti sulla richiesta' };
  const allowed = TRANSITIONS[actor]?.[from] || [];
  if (!allowed.includes(to)) return { ok: false, reason: `Transizione non consentita: ${REQUEST_STATUS[from]} → ${REQUEST_STATUS[to]}` };
  if (to === 'completed' && !ctx.hasReport) return { ok: false, reason: 'Serve il rapporto di intervento (ore e materiali)' };
  if (to === 'technician_assigned' && !ctx.hasTechnician) return { ok: false, reason: 'Assegnare un tecnico' };
  return { ok: true };
}
export const requestFlow = FLOW;

/* ================================================================ contabilizzazione prestazioni */

const ceilTo = (m, block) => (block > 1 ? Math.ceil(m / block) * block : m);

/**
 * Calcola cosa scalare dai saldi e cosa addebitare per un lavoro, SENZA doppi conteggi.
 * @param terms   condizioni del contratto: { benefits, rules, discountPct, rates }
 * @param balances saldi residui: { callFee, smallIntervention, maintenanceMinutes, scheduledVisits }
 * @param work    { kind: 'request' | 'visit', minutes, withinHours, inZone, complex, holiday, urgent }
 * @returns { consume: { callFee, smallIntervention, maintenanceMinutes, scheduledVisits }, billable: {...}, notes: [] }
 */
export function settleWork({ terms, balances, work }) {
  const rules = terms.rules || {};
  const rates = terms.rates;
  const consume = { callFee: 0, smallIntervention: 0, maintenanceMinutes: 0, scheduledVisits: 0 };
  const notes = [];
  let billableMinutes = 0;
  let billableCallFee = false;
  const minutes = Math.max(0, Math.round(work.minutes || 0));
  const covered = work.inZone !== false && !work.complex && (work.withinHours !== false || rules.outsideHours === 'covered');

  if (!covered) {
    if (work.complex) notes.push('Lavoro complesso: non incluso, su preventivo.');
    if (work.inZone === false) notes.push('Sede fuori zona: prestazione non inclusa.');
    if (work.withinHours === false) notes.push('Fuori fascia oraria coperta: prestazione a pagamento con maggiorazione.');
    billableMinutes = minutes;
    billableCallFee = work.kind === 'request';
  } else if (work.kind === 'visit') {
    // Visita programmata: scala SOLO il saldo visite; non usa diritti di chiamata.
    if ((balances.scheduledVisits || 0) >= 1) consume.scheduledVisits = 1;
    else notes.push('Visite programmate esaurite: visita a pagamento.');
    if (minutes > 0 && rules.visitWorkUsesHours) {
      const block = ceilTo(minutes, rules.roundingMinutes || 1);
      consume.maintenanceMinutes = Math.min(block, balances.maintenanceMinutes || 0);
      billableMinutes = block - consume.maintenanceMinutes;
    } else if (minutes > 0) billableMinutes = minutes;
  } else {
    // Intervento su richiesta: 1 diritto di chiamata per uscita.
    const callIncluded = (balances.callFee || 0) >= 1;
    if (callIncluded) consume.callFee = 1;
    else { billableCallFee = true; notes.push('Diritti di chiamata esauriti: uscita a pagamento.'); }
    let rest = minutes;
    if (rules.maxCoveredMinutesPerJob) {
      const over = Math.max(0, rest - rules.maxCoveredMinutesPerJob);
      if (over) { billableMinutes += over; rest -= over; notes.push(`Oltre ${rules.maxCoveredMinutesPerJob} minuti per lavoro: eccedenza a pagamento.`); }
    }
    const maxSmall = terms.benefits?.smallInterventionMaxMinutes;
    if (rest > 0 && maxSmall && (balances.smallIntervention || 0) >= 1 && callIncluded) {
      // Il piccolo intervento si usa solo durante un'uscita inclusa.
      if (rest <= maxSmall) { consume.smallIntervention = 1; rest = 0; }
      else if (rules.smallInterventionCoverage === 'first_minutes') { consume.smallIntervention = 1; rest -= maxSmall; notes.push(`Piccolo intervento: coperti i primi ${maxSmall} minuti.`); }
    }
    if (rest > 0 && (balances.maintenanceMinutes || 0) > 0) {
      const block = ceilTo(rest, rules.roundingMinutes || 1);
      consume.maintenanceMinutes = Math.min(block, balances.maintenanceMinutes);
      rest = block - consume.maintenanceMinutes;
    }
    billableMinutes += rest;
  }

  // Importo a pagamento (IVA esclusa): minimo fatturabile, sconto contrattuale, maggiorazioni.
  let laborCents = 0;
  if (billableMinutes > 0 && rates) {
    const m = Math.max(billableMinutes, rates.minimumBillableMinutes || 0);
    laborCents = Math.round((m * rates.hourlyLaborCents) / 60);
    laborCents -= Math.round((laborCents * (terms.discountPct || 0)) / 100);
  }
  const s = rates?.surcharges || {};
  const surchargePct = (work.withinHours === false ? s.outOfHoursPct || 0 : 0) + (work.holiday ? s.holidayPct || 0 : 0) + (work.urgent && !covered ? s.urgentPct || 0 : 0);
  const surchargeCents = Math.round((laborCents * surchargePct) / 100);
  const callFeeCents = billableCallFee && rates ? rates.callFeeCents : 0;
  return {
    consume,
    billable: { minutes: billableMinutes, callFee: billableCallFee, laborCents, surchargePct, surchargeCents, callFeeCents, totalNetCents: laborCents + surchargeCents + callFeeCents, materialsExcluded: true },
    notes
  };
}

/** Saldi iniziali di un contratto dai benefici della versione (una riga per tipo). */
export function initialBalances(benefits, locationsMultiplier = 1) {
  return {
    callFee: (benefits.callFee || 0) * locationsMultiplier,
    smallIntervention: (benefits.smallIntervention || 0) * locationsMultiplier,
    maintenanceMinutes: (benefits.maintenanceMinutes || 0) * locationsMultiplier,
    scheduledVisits: (benefits.scheduledVisits || 0) * locationsMultiplier
  };
}

/** Applica un consumo una sola volta per chiave (registro idempotente). */
export function applyConsumption(balances, ledger, key, consume) {
  if (ledger.some((l) => l.key === key)) return { balances, ledger, duplicate: true };
  const next = { ...balances };
  for (const [k, q] of Object.entries(consume)) {
    if (!q) continue;
    if ((next[k] || 0) < q) throw new Error(`Saldo insufficiente: ${k}`);
    next[k] -= q;
  }
  return { balances: next, ledger: [...ledger, { key, consume }], duplicate: false };
}

/* ================================================================ preventivi e margini */

export function quoteTotals(items, vatRatePct = 22) {
  let net = 0;
  for (const it of items) {
    assertCents(it.unitPriceCents, 'prezzo unitario');
    if (!(it.quantity > 0)) throw new Error('Quantità non valida');
    net += Math.round(it.unitPriceCents * it.quantity);
  }
  const vat = Math.round((net * vatRatePct) / 100);
  return { netCents: net, vatCents: vat, grossCents: net + vat, vatRate: vatRatePct };
}

/**
 * Controllo commerciale: costi interni stimati e margine.
 * Non blocca: segnala se il margine è sotto soglia (blocco solo con regola amministrativa esplicita).
 */
export function commercialCheck({ priceNetCents, includedMinutes = 0, includedVisits = 0, laborCostPerHourCents = 0, travelCostPerVisitCents = 0, otherCostsCents = 0, thresholdPct = 25, blockBelowThreshold = false }) {
  const labor = Math.round((includedMinutes * laborCostPerHourCents) / 60);
  const travel = includedVisits * travelCostPerVisitCents;
  const cost = labor + travel + otherCostsCents;
  const margin = priceNetCents - cost;
  const marginPct = priceNetCents > 0 ? Math.round((margin / priceNetCents) * 1000) / 10 : 0;
  const below = marginPct < thresholdPct;
  return { laborCostCents: labor, travelCostCents: travel, internalCostCents: cost, marginCents: margin, marginPct, belowThreshold: below, warning: below ? `Margine stimato ${marginPct}% inferiore alla soglia del ${thresholdPct}%` : null, blocked: below && blockBelowThreshold };
}

/** Uscite incluse (per il calcolo dei costi): diritti di chiamata + visite programmate. */
export const includedVisitsOf = (b) => (b.callFee || 0) + (b.scheduledVisits || 0);
/** Minuti di lavoro inclusi: monte ore + piccoli interventi × durata massima. */
export const includedMinutesOf = (b) => (b.maintenanceMinutes || 0) + (b.smallIntervention || 0) * (b.smallInterventionMaxMinutes || 0);

/* ================================================================ pagamenti */

/**
 * Piano dei pagamenti: annuale anticipato (default) o trimestrale SOLO se approvato.
 * Importi IVA inclusa per rata; l'eventuale resto di arrotondamento va sull'ultima rata.
 */
export function paymentSchedule({ netCents, vatRate = 22, plan = 'annual', quarterlyApproved = false, startDate }) {
  assertCents(netCents);
  if (plan === 'quarterly' && !quarterlyApproved) throw new Error('Pagamento trimestrale non approvato per questo contratto');
  if (!['annual', 'quarterly'].includes(plan)) throw new Error('Modalità di pagamento non valida');
  const gross = netCents + Math.round((netCents * vatRate) / 100);
  const n = plan === 'quarterly' ? 4 : 1;
  const base = Math.floor(gross / n);
  return Array.from({ length: n }, (_, i) => ({
    number: i + 1,
    dueDate: addMonths(startDate, i * 3).toISOString().slice(0, 10),
    amountCents: i === n - 1 ? gross - base * (n - 1) : base,
    status: 'due'
  }));
}

/** Un contratto risulta pagato solo con rate pagate verificate o riconciliate. */
export function isPaid(installments, { requireAll = false } = {}) {
  const ok = (i) => i.status === 'paid' && Boolean(i.verifiedProviderRef || i.reconciliationRef);
  return requireAll ? installments.every(ok) : installments.length > 0 && ok(installments[0]);
}

/* ================================================================ Corporate */

export const CORPORATE_REQUIRED = ['locationsCount', 'locations', 'services', 'validity', 'economics', 'contacts'];

export function validateCorporateTerms(t) {
  const e = [];
  for (const k of CORPORATE_REQUIRED) if (t[k] === undefined || t[k] === null || t[k] === '' || (Array.isArray(t[k]) && !t[k].length)) e.push(`Campo obbligatorio: ${k}`);
  if (Array.isArray(t.locations) && Number.isInteger(t.locationsCount) && t.locations.length !== t.locationsCount) e.push('Il numero di sedi non corrisponde agli immobili indicati');
  if (t.annualHours !== undefined && !(Number.isInteger(t.annualHours) && t.annualHours >= 0)) e.push('Monte ore non valido');
  if (t.sla && !t.sla.signedBy) e.push('Uno SLA deve indicare chi lo ha approvato');
  return e;
}

/** Stato di attivazione di un contratto B2B: servono entrambe le approvazioni e il pagamento. */
export function activationReadiness({ adminApprovedAt, clientAcceptedAt, clientAcceptedRole, paid }) {
  const missing = [];
  if (!adminApprovedAt) missing.push('Approvazione di Pronto Intervento Roma');
  if (!clientAcceptedAt) missing.push('Accettazione del responsabile aziendale');
  else if (clientAcceptedRole !== 'company_admin') missing.push('L’accettazione deve provenire da un amministratore aziendale autorizzato');
  if (!paid) missing.push('Pagamento verificato o riconciliato');
  return { ready: missing.length === 0, missing };
}
