/**
 * Contratti PRONTO+ Family.
 *
 * - Il contratto nasce `pending_payment` con una copia congelata (snapshot)
 *   della versione del piano: prezzi e condizioni non cambiano più.
 * - Si attiva SOLO con un pagamento verificato lato server, di importo e valuta
 *   corretti e riferito allo stesso ordine.
 * - Le prestazioni incluse diventano "entitlements" con quantità.
 */
import { addMonths, addDays, isBefore } from './dates.js';
import { applyPromotion } from './plans.js';

export const CONTRACT_STATUS = Object.freeze({
  PENDING: 'pending_payment', ACTIVE: 'active', EXPIRED: 'expired', CANCELLED: 'cancelled', WITHDRAWN: 'withdrawn'
});

const deepFreeze = (o) => {
  Object.values(o).forEach((v) => v && typeof v === 'object' && deepFreeze(v));
  return Object.freeze(o);
};

export function createContract({ id, orderId, customerId, propertyId, plan, version, promotion = null, now = new Date() }) {
  if (version.status !== 'published') throw new Error('Si può sottoscrivere solo una versione pubblicata');
  if (plan.active === false) throw new Error('Offerta non attiva');
  const price = applyPromotion(version.priceCents, promotion, plan.id, now);
  const snapshot = deepFreeze(structuredClone({ planId: plan.id, planName: plan.name, versionId: version.id, version: version.version, ...version }));
  const entitlements = [
    { id: `${id}:interventions`, type: 'intervention', quantity: version.interventions, maxMinutes: version.maxMinutes },
    { id: `${id}:checkups`, type: 'checkup', quantity: version.checkups || 0, maxMinutes: version.maxMinutes }
  ].filter((e) => e.quantity > 0);
  return {
    id,
    orderId,
    customerId,
    propertyId,
    status: CONTRACT_STATUS.PENDING,
    priceCents: price.finalCents,
    listPriceCents: version.priceCents,
    discountCents: price.discountCents,
    promotionId: price.promotionId,
    currency: 'EUR',
    snapshot,
    entitlements: deepFreeze(entitlements),
    createdAt: new Date(now).toISOString(),
    startsAt: null,
    endsAt: null
  };
}

/** Verifica che un pagamento confermato corrisponda all'ordine. */
export function paymentMatches(order, payment) {
  const reasons = [];
  if (!payment || payment.status !== 'verified') reasons.push('Pagamento non verificato lato server');
  if (payment?.orderId !== order.orderId) reasons.push('Ordine non corrispondente');
  if (payment?.amountCents !== order.priceCents) reasons.push('Importo non corrispondente');
  if (payment?.currency !== (order.currency || 'EUR')) reasons.push('Valuta non corrispondente');
  return reasons;
}

export function activateContract(contract, payment, now = new Date()) {
  if (contract.status === CONTRACT_STATUS.ACTIVE && contract.paymentRef === payment?.providerRef) return contract; // idempotente
  if (contract.status !== CONTRACT_STATUS.PENDING) throw new Error(`Contratto non attivabile dallo stato ${contract.status}`);
  const reasons = paymentMatches(contract, payment);
  if (reasons.length) throw new Error(reasons.join('; '));
  const startsAt = new Date(payment.verifiedAt || now);
  return {
    ...contract,
    status: CONTRACT_STATUS.ACTIVE,
    paymentRef: payment.providerRef,
    startsAt: startsAt.toISOString(),
    endsAt: addMonths(startsAt, contract.snapshot.durationMonths).toISOString()
  };
}

/** Stato effettivo a una data (un contratto attivo oltre la scadenza è scaduto). */
export function statusAt(contract, now = new Date()) {
  if (contract.status === CONTRACT_STATUS.ACTIVE && contract.endsAt && !isBefore(now, contract.endsAt)) return CONTRACT_STATUS.EXPIRED;
  return contract.status;
}

export function isExpiringSoon(contract, now = new Date(), days = 30) {
  return statusAt(contract, now) === CONTRACT_STATUS.ACTIVE && !isBefore(now, addDays(contract.endsAt, -days));
}

/** Divisione dei contratti per la dashboard. */
export function partitionByStatus(contracts, now = new Date()) {
  const out = { active: [], expired: [], pending: [], other: [] };
  for (const c of contracts) {
    const s = statusAt(c, now);
    (s === 'active' ? out.active : s === 'expired' ? out.expired : s === 'pending_payment' ? out.pending : out.other).push(c);
  }
  return out;
}
