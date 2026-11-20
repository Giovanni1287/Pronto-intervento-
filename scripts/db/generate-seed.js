#!/usr/bin/env node
/**
 * Genera supabase/seed.sql dalle fonti del sito (unica fonte di verità):
 * catalogo tecnico (services.js), listino Family e Lavoro Protetto (catalog/).
 * Le versioni iniziali vengono pubblicate; i piani restano NON approvati
 * (owner_approved = false, legal_reviewed = false) e la vendita disattivata.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categories } from '../../src/data/services.js';
import { familyCategories, FAMILY_VAT_RATE, FAMILY_DURATION_MONTHS } from '../../src/data/catalog/family-plans.js';
import { protectedPlans, protectedLimits, protectedSpecialistVariants, PROTECTED_VAT_RATE, protectedExclusions } from '../../src/data/catalog/protected-work.js';
import { businessPlans, corporateProgram, b2bExclusions, B2B_RATES, B2B_LIMITS } from '../../src/data/catalog/business-plans.js';
import { maintenanceChecklists } from '../../src/data/catalog/maintenance-checklists.js';
import { specializations } from '../../src/data/catalog/specializations.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const q = (v) => (v === null || v === undefined ? 'null' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const j = (v) => `${q(JSON.stringify(v))}::jsonb`;

const out = ['-- GENERATO da scripts/db/generate-seed.js — non modificare a mano', 'begin;', ''];
out.push('insert into public.company_settings (id, data, sales_enabled) values (1, ' + j({
  company_name: 'Pronto Intervento Roma', owner: 'Giovanni Romeo', protected_purchase_window_days: protectedLimits.purchaseWindowDays,
  booking_notice_days: protectedLimits.bookingNoticeDays, protected_zones: protectedLimits.zones, visit_max_minutes: protectedLimits.visitMaxMinutes
}) + ', false) on conflict (id) do nothing;');
// impostazioni B2B aggiunte senza sovrascrivere valori già personalizzati dall'amministratore
out.push('update public.company_settings set data = ' + j({ b2b_rates: B2B_RATES, b2b_limits: B2B_LIMITS, margin_threshold_pct: 25, block_below_margin: false,
  // Prompt 4: modalità di pagamento B2B approvate dal titolare (online solo se aggiunto "mypos"), versioni delle condizioni
  b2b_payment_methods: ['bonifico'], terms_version_family: 'bozza-2026-11', terms_version_protected: 'bozza-2026-11', terms_version_service: 'bozza-2026-11' }) + ' || data where id = 1;', '');

categories.forEach((c, i) => {
  out.push(`insert into public.service_categories (id, name, sort) values (${q(c.slug)}, ${q(c.name)}, ${i}) on conflict (id) do update set name = excluded.name;`);
  for (const s of c.subcategories) out.push(`insert into public.services (id, category_id, name) values (${q(`${c.slug}/${s.slug}`)}, ${q(c.slug)}, ${q(s.name)}) on conflict (id) do update set name = excluded.name;`);
});
out.push('');

const version = (planId, v) =>
  `insert into public.plan_versions (plan_id, version, status, price_cents, vat_rate, duration_months, visits, interventions, checkups, max_minutes, call_fee_included, materials_included, extra_labor_discount_pct, included, exclusions, conditions, price_basis, published_at)
   values (${q(planId)}, 1, 'published', ${v.priceCents}, ${v.vatRate}, ${v.durationMonths}, ${v.visits}, ${v.interventions}, ${v.checkups}, ${q(v.maxMinutes)}, ${v.callFeeIncluded}, ${v.materialsIncluded}, ${v.discount}, ${j(v.included)}, ${j(v.exclusions)}, ${j(v.conditions)}, ${q(v.priceBasis || 'gross')}, now())
   on conflict (plan_id, version) do nothing;`;

for (const c of familyCategories) {
  for (const [tier, p] of Object.entries(c.plans)) {
    const id = `family-${c.id}-${tier}`;
    out.push(`insert into public.plans (id, line, category, tier, name) values (${q(id)}, 'family', ${q(c.id)}, ${q(tier)}, ${q(`Family ${c.name} ${tier === 'plus' ? 'Plus' : 'Essential'}`)}) on conflict (id) do nothing;`);
    out.push(version(id, { priceCents: p.priceCents, vatRate: FAMILY_VAT_RATE, durationMonths: FAMILY_DURATION_MONTHS, visits: p.visits, interventions: p.interventions, checkups: p.checkups, maxMinutes: p.maxMinutes, callFeeIncluded: p.callFeeIncluded, materialsIncluded: p.materialsIncluded, discount: p.extraLaborDiscountPct, included: p.included, exclusions: c.exclusions, conditions: { technicalCategory: c.technical } }));
  }
}
out.push('');
for (const p of protectedPlans) {
  const id = `protected-${p.id}`;
  out.push(`insert into public.plans (id, line, category, tier, name) values (${q(id)}, 'protected', null, ${q(p.id)}, ${q(`Lavoro Protetto ${p.name}`)}) on conflict (id) do nothing;`);
  out.push(version(id, { priceCents: p.priceCents, vatRate: PROTECTED_VAT_RATE, durationMonths: p.durationMonths, visits: p.visits, interventions: 0, checkups: 0, maxMinutes: protectedLimits.visitMaxMinutes, callFeeIncluded: p.callFeeIncludedForVisits, materialsIncluded: false, discount: p.discount.pct, included: p.benefits, exclusions: protectedExclusions, conditions: { discount: { pct: p.discount.pct, uses: p.discount.uses, scope: p.discount.scope }, features: p.features } }));
}
// listini specialistici: piani creati ma disattivati e senza versione (non vendibili finché non definiti)
for (const v of protectedSpecialistVariants) {
  for (const tier of Object.keys(v.plans)) {
    out.push(`insert into public.plans (id, line, category, tier, variant, name, active) values (${q(`protected-${tier}-${v.id}`)}, 'protected', null, ${q(tier)}, ${q(v.id)}, ${q(`Lavoro Protetto ${tier} — ${v.name}`)}, false) on conflict (id) do nothing;`);
  }
}
out.push('');
// PRONTO+ Business e Hotel: prezzi IVA esclusa (price_basis = 'net'); condizioni contabili esplicite nei terms
for (const p of businessPlans) {
  out.push(`insert into public.plans (id, line, category, tier, name) values (${q(p.id)}, ${q(p.line)}, null, ${q(p.id)}, ${q(`PRONTO+ ${p.name}`)}) on conflict (id) do nothing;`);
  out.push(version(p.id, { priceCents: p.priceCents, vatRate: p.vatRate, durationMonths: p.durationMonths, visits: 0, interventions: 0, checkups: 0, maxMinutes: null,
    callFeeIncluded: p.benefits.callFee > 0, materialsIncluded: false, discount: p.discountPct, included: p.included, exclusions: b2bExclusions, priceBasis: 'net',
    conditions: { benefits: p.benefits, rules: p.rules, rates: B2B_RATES, limits: B2B_LIMITS, discountPct: p.discountPct, features: p.features, locations: p.locations } }));
}
// Corporate: sempre personalizzato, nessun listino vendibile
out.push(`insert into public.plans (id, line, category, tier, name, active) values (${q(corporateProgram.id)}, 'corporate', null, 'corporate', ${q(corporateProgram.name)}, false) on conflict (id) do nothing;`);
out.push('');
for (const c of maintenanceChecklists) {
  out.push(`insert into public.maintenance_checklists (id, name, category_id, items) values (${q(c.id)}, ${q(c.name)}, ${q(c.categoryId)}, ${j(c.items)}) on conflict (id) do nothing;`);
}
out.push('');
// Prompt 5: specializzazioni operative, mappatura servizi → specializzazione richiesta, impostazioni della centrale
// (blocco condizionale: lo stesso seed si applica anche a database non ancora migrati al Prompt 5)
out.push('do $seed$ begin', "if to_regclass('public.technician_specializations') is not null then");
specializations.forEach((s, i) => {
  out.push(`insert into public.technician_specializations (id, name, category_id, family_category, implies, sort) values (${q(s.id)}, ${q(s.name)}, ${q(s.categoryId)}, ${q(s.familyCategory)}, ${q(`{${s.implies.join(',')}}`)}, ${i + 1}) on conflict (id) do update set name = excluded.name, category_id = excluded.category_id, family_category = excluded.family_category, implies = excluded.implies;`);
  for (const svc of s.services) out.push(`insert into public.service_specializations (service_id, specialization_id) values (${q(svc)}, ${q(s.id)}) on conflict do nothing;`);
});
out.push('end if;', 'end $seed$;');
out.push('update public.company_settings set data = ' + j({ ops_default_slot_minutes: 120, ops_duplicate_window_days: 7, ops_public_daily_limit: 5, ops_auto_assign_rules: null }) + ' || data where id = 1;');
out.push('', 'commit;', '');
await fs.writeFile(path.join(root, 'supabase/seed.sql'), out.join('\n'));
console.log(`seed.sql generato: ${out.length} righe`);
