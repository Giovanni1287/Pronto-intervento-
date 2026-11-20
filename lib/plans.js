/**
 * Versioni dei piani, promozioni e storico modifiche.
 *
 * Regole:
 * - Una versione è `draft`, `published` o `archived`.
 * - Solo le bozze sono modificabili; una versione pubblicata è immutabile.
 * - Pubblicare una bozza archivia la versione pubblicata precedente dello stesso piano.
 * - I contratti conservano una copia (snapshot) della versione: nessuna modifica
 *   successiva di prezzi o condizioni li riguarda.
 */
import { assertCents } from './money.js';

export const STATUS = Object.freeze({ DRAFT: 'draft', PUBLISHED: 'published', ARCHIVED: 'archived' });

/** Campi economici e contrattuali di una versione. */
export const VERSION_FIELDS = [
  'priceCents', 'vatRate', 'durationMonths', 'visits', 'interventions', 'maxMinutes', 'checkups',
  'callFeeIncluded', 'materialsIncluded', 'extraLaborDiscountPct', 'capCents', 'included', 'exclusions', 'conditions'
];

export function validateVersion(v) {
  const e = [];
  try { assertCents(v.priceCents, 'prezzo'); } catch (err) { e.push(err.message); }
  if (v.priceCents === 0) e.push('Il prezzo non può essere zero');
  if (!Number.isInteger(v.durationMonths) || v.durationMonths < 1 || v.durationMonths > 36) e.push('Durata non valida (1–36 mesi)');
  if (v.vatRate !== undefined && !(v.vatRate >= 0 && v.vatRate <= 30)) e.push('Aliquota IVA non valida');
  for (const k of ['visits', 'interventions', 'checkups']) {
    if (v[k] !== undefined && (!Number.isInteger(v[k]) || v[k] < 0)) e.push(`${k} deve essere un intero ≥ 0`);
  }
  if (Number.isInteger(v.visits) && Number.isInteger(v.interventions) && v.visits < v.interventions + (v.checkups || 0)) {
    e.push('Le uscite devono coprire interventi e controlli inclusi');
  }
  if (v.maxMinutes !== undefined && v.maxMinutes !== null && (!Number.isInteger(v.maxMinutes) || v.maxMinutes < 15 || v.maxMinutes > 480)) {
    e.push('Durata massima per intervento non valida (15–480 minuti)');
  }
  if (v.extraLaborDiscountPct !== undefined && !(v.extraLaborDiscountPct >= 0 && v.extraLaborDiscountPct <= 50)) e.push('Sconto non valido (0–50%)');
  if (v.capCents !== undefined && v.capCents !== null) { try { assertCents(v.capCents, 'massimale'); } catch (err) { e.push(err.message); } }
  if (!Array.isArray(v.included) || v.included.length === 0) e.push('Indicare almeno una prestazione inclusa');
  return e;
}

/** Nuova bozza a partire da una versione esistente (o da zero). */
export function createDraft({ planId, from = null, changes = {}, author, now = new Date(), nextVersion }) {
  if (!author) throw new Error('Autore obbligatorio per lo storico');
  const base = from ? pick(from, VERSION_FIELDS) : {};
  const draft = {
    id: `${planId}-v${nextVersion}`,
    planId,
    version: nextVersion,
    status: STATUS.DRAFT,
    ...structuredClone(base),
    ...structuredClone(changes),
    createdBy: author,
    createdAt: new Date(now).toISOString(),
    basedOn: from?.id || null
  };
  return draft;
}

/** Modifica di una bozza: le versioni pubblicate o archiviate non sono modificabili. */
export function editDraft(version, changes, author, now = new Date()) {
  if (version.status !== STATUS.DRAFT) throw new Error('Solo le bozze sono modificabili: crea una nuova versione');
  const next = { ...version, ...structuredClone(changes), updatedBy: author, updatedAt: new Date(now).toISOString() };
  return { version: next, history: diffVersions(version, next).map((d) => ({ ...d, versionId: version.id, author, at: next.updatedAt, action: 'edit' })) };
}

/**
 * Pubblicazione: la bozza diventa pubblicata, la precedente pubblicata dello
 * stesso piano viene archiviata. Restituisce la nuova lista e le voci di storico.
 */
export function publish(versions, draftId, author, now = new Date()) {
  const draft = versions.find((v) => v.id === draftId);
  if (!draft) throw new Error('Bozza non trovata');
  if (draft.status !== STATUS.DRAFT) throw new Error('Si possono pubblicare solo bozze');
  const errors = validateVersion(draft);
  if (errors.length) throw new Error(`Bozza non valida: ${errors.join('; ')}`);
  const at = new Date(now).toISOString();
  const history = [];
  const out = versions.map((v) => {
    if (v.id === draftId) {
      history.push({ action: 'publish', versionId: v.id, author, at });
      return Object.freeze({ ...v, status: STATUS.PUBLISHED, publishedAt: at, publishedBy: author });
    }
    if (v.planId === draft.planId && v.status === STATUS.PUBLISHED) {
      history.push({ action: 'archive', versionId: v.id, author, at });
      return Object.freeze({ ...v, status: STATUS.ARCHIVED, archivedAt: at });
    }
    return v;
  });
  return { versions: out, history };
}

export const publishedVersion = (versions, planId) => versions.find((v) => v.planId === planId && v.status === STATUS.PUBLISHED) || null;

/** Differenze tra due versioni (per lo storico). */
export function diffVersions(a, b) {
  const out = [];
  for (const k of VERSION_FIELDS) {
    if (JSON.stringify(a?.[k]) !== JSON.stringify(b?.[k])) out.push({ field: k, from: a?.[k] ?? null, to: b?.[k] ?? null });
  }
  return out;
}

/** Offerte vendibili: piano attivo, versione pubblicata, approvazioni presenti. */
export function sellableOffers(plans, versions, { requireApproval = true } = {}) {
  return plans
    .filter((p) => p.active !== false)
    .map((p) => ({ plan: p, version: publishedVersion(versions, p.id) }))
    .filter((o) => o.version && (!requireApproval || (o.plan.ownerApproved && o.plan.legalReviewed)));
}

/* ------------------------------------------------------------ promozioni */

/**
 * Promozione: { id, kind: 'percent'|'fixed', value, planIds: [] | ['*'],
 *               startsAt, endsAt, active, minPriceCents? }
 * Si applica solo al momento della sottoscrizione: il prezzo finale viene
 * salvato nel contratto e non cambia se la promozione viene modificata.
 */
export function promotionApplies(promo, planId, now = new Date()) {
  if (!promo || promo.active === false) return false;
  const t = new Date(now).getTime();
  if (promo.startsAt && t < new Date(promo.startsAt).getTime()) return false;
  if (promo.endsAt && t > new Date(promo.endsAt).getTime()) return false;
  return promo.planIds.includes('*') || promo.planIds.includes(planId);
}

export function applyPromotion(priceCents, promo, planId, now = new Date()) {
  assertCents(priceCents);
  if (!promotionApplies(promo, planId, now)) return { finalCents: priceCents, discountCents: 0, promotionId: null };
  let discount = promo.kind === 'percent' ? Math.round((priceCents * promo.value) / 100) : promo.value;
  if (promo.kind === 'percent' && !(promo.value > 0 && promo.value <= 90)) throw new Error('Percentuale promozione non valida');
  if (promo.kind === 'fixed') assertCents(promo.value, 'sconto');
  const floor = promo.minPriceCents ?? 100; // mai a zero o negativo
  const finalCents = Math.max(floor, priceCents - discount);
  return { finalCents, discountCents: priceCents - finalCents, promotionId: promo.id };
}

/** La migliore promozione applicabile (una sola, non cumulabili). */
export function bestPromotion(priceCents, promos, planId, now = new Date()) {
  return promos
    .map((p) => applyPromotion(priceCents, p, planId, now))
    .reduce((best, r) => (r.finalCents < best.finalCents ? r : best), { finalCents: priceCents, discountCents: 0, promotionId: null });
}

function pick(o, keys) {
  const r = {};
  for (const k of keys) if (o[k] !== undefined) r[k] = o[k];
  return r;
}

/** Converte il listino statico in piani + versioni pubblicate iniziali. */
export function catalogToVersions(familyCategories, { vatRate, durationMonths, author = 'seed', now = new Date('2026-11-17T00:00:00Z') }) {
  const plans = [];
  const versions = [];
  for (const c of familyCategories) {
    for (const [tier, p] of Object.entries(c.plans)) {
      const planId = `family-${c.id}-${tier}`;
      plans.push({ id: planId, line: 'family', category: c.id, tier, name: `${c.name} ${tier === 'plus' ? 'Plus' : 'Essential'}`, active: true, ownerApproved: false, legalReviewed: false });
      const d = createDraft({
        planId,
        nextVersion: 1,
        author,
        now,
        changes: {
          priceCents: p.priceCents, vatRate, durationMonths, visits: p.visits, interventions: p.interventions, maxMinutes: p.maxMinutes,
          checkups: p.checkups, callFeeIncluded: p.callFeeIncluded, materialsIncluded: p.materialsIncluded,
          extraLaborDiscountPct: p.extraLaborDiscountPct, capCents: p.capCents ?? null, included: p.included, exclusions: c.exclusions, conditions: {}
        }
      });
      versions.push(d);
    }
  }
  let all = versions;
  for (const v of versions) all = publish(all, v.id, author, now).versions;
  return { plans, versions: all };
}
