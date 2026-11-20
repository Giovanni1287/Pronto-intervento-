/**
 * PRONTO+ Lavoro Protetto e richieste post-intervento.
 *
 * Due flussi DISTINTI:
 *  A. Segnalazione di difetto / contestazione → sempre consentita al cliente
 *     titolare dell'intervento, con o senza piano, piano scaduto incluso.
 *     Non viene MAI respinta automaticamente: entra in valutazione.
 *  B. Richiesta di servizio aggiuntivo → solo con un piano Lavoro Protetto
 *     attivo, nei limiti di zona, tempo e prestazioni residue.
 */
import { addMonths, addDays, isBefore, daysBetween } from './dates.js';
import { remaining } from './entitlements.js';
import { paymentMatches } from './contracts.js';

export const REQUEST_TYPES = Object.freeze({ DEFECT: 'defect_report', SERVICE: 'additional_service' });

/* ------------------------------------------------------------ offerta (dopo il certificato) */

/**
 * Offerta mostrata al cliente dopo il certificato. Nessun piano è preselezionato
 * e l'offerta non condiziona in alcun modo le tutele di legge.
 */
export function buildOffer({ intervention, certificate, plans, limits, now = new Date() }) {
  if (intervention.status !== 'completed' || !certificate || certificate.status !== 'valid') {
    return { available: false, reason: 'L’offerta è disponibile dopo il certificato dell’intervento', plans: [] };
  }
  const deadline = addDays(certificate.issuedAt, limits.purchaseWindowDays);
  if (!isBefore(now, deadline)) return { available: false, reason: 'Periodo per l’acquisto concluso', plans: [] };
  return {
    available: true,
    deadline: deadline.toISOString(),
    selected: null, // nessuna preselezione
    plans: plans.filter((p) => p.active !== false && Number.isInteger(p.priceCents)).map((p) => ({ ...p, selected: false })),
    legalNotice:
      'Le tutele previste dalla legge sui lavori eseguiti restano valide anche senza acquistare questo servizio. Puoi segnalare un difetto in qualsiasi momento dall’area cliente.'
  };
}

export function createPurchase({ id, orderId, plan, intervention, customerId, now = new Date() }) {
  if (!Number.isInteger(plan.priceCents)) throw new Error('Listino non definito: piano non vendibile');
  const snapshot = Object.freeze(structuredClone(plan));
  return {
    id, orderId, customerId,
    interventionId: intervention.id,
    planId: plan.id,
    snapshot,
    priceCents: plan.priceCents,
    currency: 'EUR',
    status: 'pending_payment',
    createdAt: new Date(now).toISOString(),
    entitlements: [
      { id: `${id}:visit`, type: 'preventive_visit', quantity: plan.visits },
      { id: `${id}:discount`, type: 'discount', quantity: plan.discount.uses, pct: plan.discount.pct }
    ].filter((e) => e.quantity === null || e.quantity > 0)
  };
}

export function activatePurchase(purchase, payment, now = new Date()) {
  if (purchase.status === 'active' && purchase.paymentRef === payment?.providerRef) return purchase;
  if (purchase.status !== 'pending_payment') throw new Error(`Acquisto non attivabile dallo stato ${purchase.status}`);
  const reasons = paymentMatches(purchase, payment);
  if (reasons.length) throw new Error(reasons.join('; '));
  const startsAt = new Date(payment.verifiedAt || now);
  return { ...purchase, status: 'active', paymentRef: payment.providerRef, startsAt: startsAt.toISOString(), endsAt: addMonths(startsAt, purchase.snapshot.durationMonths).toISOString() };
}

export function purchaseStatusAt(p, now = new Date()) {
  if (p.status === 'active' && !isBefore(now, p.endsAt)) return 'expired';
  return p.status;
}

/* ------------------------------------------------------------ flusso A: difetti */

/** Sempre consentita al titolare dell'intervento: nessun controllo su piani o scadenze commerciali. */
export function canReportDefect({ intervention, userId }) {
  if (!intervention || intervention.customerId !== userId) return { allowed: false, reason: 'Intervento non associato al tuo account' };
  return { allowed: true, initialStatus: 'received', note: 'La segnalazione viene registrata e valutata secondo i diritti applicabili.' };
}

export function createDefectReport({ intervention, userId, description, now = new Date() }) {
  const check = canReportDefect({ intervention, userId });
  if (!check.allowed) throw new Error(check.reason);
  if (!description || description.trim().length < 10) throw new Error('Descrivi il difetto riscontrato');
  return {
    type: REQUEST_TYPES.DEFECT,
    interventionId: intervention.id,
    customerId: userId,
    description: description.trim(),
    status: 'received', // mai 'rejected' automaticamente
    createdAt: new Date(now).toISOString(),
    daysSinceWork: daysBetween(intervention.completedAt, now)
  };
}

/* ------------------------------------------------------------ flusso B: servizi aggiuntivi */

export function canRequestService({ purchase, ledger, benefit = 'preventive_visit', property, limits, requestedDate, now = new Date() }) {
  if (!purchase) return { allowed: false, reason: 'Serve un piano Lavoro Protetto attivo' };
  const st = purchaseStatusAt(purchase, now);
  if (st !== 'active') return { allowed: false, reason: st === 'expired' ? 'Piano Lavoro Protetto scaduto' : 'Piano Lavoro Protetto non attivo' };
  const ent = purchase.entitlements.find((e) => e.type === benefit);
  if (!ent) return { allowed: false, reason: 'Prestazione non prevista dal piano' };
  if (remaining(ent, ledger) < 1) return { allowed: false, reason: 'Prestazioni esaurite' };
  if (property && limits && !limits.zones.map((z) => z.toLowerCase()).includes(String(property.city).toLowerCase())) {
    return { allowed: false, reason: `Visite disponibili solo in: ${limits.zones.join(', ')}` };
  }
  if (requestedDate) {
    if (isBefore(requestedDate, addDays(now, limits.bookingNoticeDays))) return { allowed: false, reason: `Prenotazione con almeno ${limits.bookingNoticeDays} giorni di preavviso` };
    if (!isBefore(requestedDate, purchase.endsAt)) return { allowed: false, reason: 'Data oltre la scadenza del piano' };
  }
  return { allowed: true, entitlementId: ent.id };
}
