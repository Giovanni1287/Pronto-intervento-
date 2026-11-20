/**
 * PRONTO+ — Linee commerciali (presentazione).
 * ------------------------------------------------------------------
 * I prezzi Family arrivano dal listino provvisorio (src/data/catalog/family-plans.js);
 * dopo l'attivazione di Supabase la fonte è la tabella `plan_versions`
 * gestita dalla dashboard (vedi docs/ARCHITETTURA-PRONTO-PLUS.md).
 * Nessun pagamento è attivo.
 */
import { familyCategories } from './catalog/family-plans.js';

const familyPrice = (id, tier) => familyCategories.find((c) => c.id === id)?.plans[tier]?.priceCents ?? null;

export const planTiers = [
  { id: 'essential', name: 'Essential' },
  { id: 'plus', name: 'Plus' }
];

export const lines = [
  {
    id: 'family',
    name: 'PRONTO+ Family',
    anchor: 'pronto-plus-family',
    audience: 'Per abitazioni e famiglie',
    description:
      'Un abbonamento annuale per la casa, organizzato per area tecnica: scegli le coperture che ti servono e il livello di servizio.',
    status: 'in-definizione',
    categories: [
      { id: 'piccola-idraulica', name: 'Piccola Idraulica', icon: 'drop' },
      { id: 'idraulica', name: 'Idraulica', icon: 'wrench' },
      { id: 'spurgo', name: 'Spurgo', icon: 'pipe' },
      { id: 'elettrica', name: 'Elettrica', icon: 'bolt' },
      { id: 'perdite-occulte', name: 'Perdite Occulte', icon: 'radar' },
      { id: 'allagamenti', name: 'Allagamenti', icon: 'flood' },
      { id: 'muratura', name: 'Muratura', icon: 'brick' },
      { id: 'disinfestazioni', name: 'Disinfestazioni', icon: 'shield' }
    ].map((c) => ({
      ...c,
      plans: planTiers.map((t) => ({ tier: t.id, name: t.name, priceCents: familyPrice(c.id, t.id), features: [] }))
    }))
  },
  {
    id: 'business',
    name: 'PRONTO+ Business',
    anchor: 'pronto-plus-business',
    href: '/piani-assistenza/business/',
    audience: 'Per negozi, uffici, attività e condomini',
    description:
      'Assistenza tecnica programmata per attività commerciali e studi professionali, pensata per ridurre i fermi e semplificare la gestione.',
    status: 'in-definizione',
    categories: []
  },
  {
    id: 'hotel-corporate',
    name: 'PRONTO+ Hotel & Corporate',
    anchor: 'pronto-plus-hotel',
    href: '/hotel-e-strutture-ricettive/',
    audience: 'Per hotel, strutture ricettive e aziende',
    description:
      'Accordi su misura per strutture con più unità, camere o sedi, con referente dedicato e reportistica degli interventi.',
    status: 'in-definizione',
    categories: []
  }
];
