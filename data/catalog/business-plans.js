/**
 * PRONTO+ BUSINESS · HOTEL · CORPORATE — LISTINO PROVVISORIO B2B
 * ------------------------------------------------------------------
 * Prezzi in centesimi, IVA ESCLUSA ("+ IVA, se applicabile"), aliquota
 * ordinaria 22%. Tutti i valori sono PROPOSTE COMMERCIALI da approvare dal
 * titolare; dopo l'attivazione del backend si gestiscono dalla dashboard
 * (tabelle plans / plan_versions, linee business · hotel · corporate).
 *
 * Le regole di contabilizzazione (RULES) sono esplicite e salvate in ogni
 * versione del piano e in ogni versione di contratto: una prestazione viene
 * scalata una sola volta, da un solo saldo, con chiave di idempotenza.
 */

export const B2B_VAT_RATE = 22;
export const B2B_STATUS = { ownerApproved: false, legalReviewed: false };

/** Tariffe di riferimento per le prestazioni NON incluse (proposte da confermare). */
export const B2B_RATES = {
  hourlyLaborCents: 4500,   // 45 € + IVA per ora di manodopera ordinaria
  callFeeCents: 4000,       // 40 € + IVA per diritto di chiamata non incluso
  minimumBillableMinutes: 30,
  surcharges: { outOfHoursPct: 30, holidayPct: 50, urgentPct: 20 }
};

/** Limiti operativi comuni (configurabili per contratto). */
export const B2B_LIMITS = {
  zones: ['Roma'],
  zonesNote: 'Comune di Roma; altri comuni della provincia su conferma, con eventuali costi di trasferta.',
  coverageHours: { days: [1, 2, 3, 4, 5], from: '08:00', to: '18:00', label: 'Lunedì–venerdì, 8:00–18:00' },
  materialsIncluded: false,
  complexWorksIncluded: false,
  note: 'I tempi di intervento si concordano: nessun tempo di arrivo è garantito se non previsto da uno SLA firmato.'
};

/**
 * Regole di contabilizzazione delle prestazioni (default, salvate in ogni versione).
 * - Ogni intervento su richiesta usa 1 diritto di chiamata (se disponibile, altrimenti è a pagamento).
 * - Il "piccolo intervento" copre al massimo `maxMinutes` di lavoro e si usa SOLO durante
 *   un'uscita con diritto di chiamata incluso (mai da solo).
 * - Il monte ore (hotel) si scala in blocchi di `roundingMinutes`, arrotondando per eccesso.
 * - Le visite programmate scalano solo il saldo "visite programmate": non usano diritti
 *   di chiamata né monte ore (la manutenzione eseguita durante la visita, se registrata
 *   come lavoro, scala il monte ore solo se `visitWorkUsesHours` è true).
 * - Fuori fascia oraria, fuori zona o per lavori complessi le prestazioni non sono incluse.
 */
export const DEFAULT_RULES = {
  smallInterventionCoverage: 'first_minutes', // 'first_minutes' | 'only_if_within'
  roundingMinutes: 15,
  visitWorkUsesHours: true,
  outsideHours: 'billable_with_surcharge',
  maxCoveredMinutesPerJob: null // null = nessun limite oltre i saldi
};

const plan = (o) => ({ vatRate: B2B_VAT_RATE, durationMonths: 12, locations: 1, discountPct: 0, features: [], ...o, rules: { ...DEFAULT_RULES, ...(o.rules || {}) } });

export const businessPlans = [
  plan({
    id: 'business-start', line: 'business', name: 'Business Start', priceCents: 34900,
    benefits: { callFee: 3, smallIntervention: 1, smallInterventionMaxMinutes: 45, maintenanceMinutes: 0, scheduledVisits: 0 },
    included: ['3 diritti di chiamata ordinari inclusi', '1 piccolo intervento fino a 45 minuti, durante una delle uscite incluse', 'Una sede aziendale', 'Gestione delle richieste tramite portale'],
    features: ['portal']
  }),
  plan({
    id: 'business-pro', line: 'business', name: 'Business Pro', priceCents: 74900, discountPct: 10,
    benefits: { callFee: 6, smallIntervention: 3, smallInterventionMaxMinutes: 45, maintenanceMinutes: 0, scheduledVisits: 0 },
    included: ['6 diritti di chiamata ordinari inclusi', '3 piccoli interventi fino a 45 minuti ciascuno, durante le uscite incluse', 'Una sede aziendale', 'Sconto del 10% sulla manodopera ordinaria aggiuntiva', 'Storico digitale degli interventi'],
    features: ['portal', 'history']
  }),
  plan({
    id: 'business-premium', line: 'business', name: 'Business Premium', priceCents: 149000, discountPct: 15,
    benefits: { callFee: 12, smallIntervention: 6, smallInterventionMaxMinutes: 45, maintenanceMinutes: 0, scheduledVisits: 0 },
    included: ['12 diritti di chiamata ordinari inclusi', '6 piccoli interventi fino a 45 minuti ciascuno, durante le uscite incluse', 'Una sede aziendale', 'Sconto del 15% sulla manodopera ordinaria aggiuntiva', 'Canale dedicato', 'Report annuale degli interventi'],
    features: ['portal', 'history', 'dedicated_channel', 'annual_report']
  }),
  plan({
    id: 'hotel-business-care', line: 'hotel', name: 'Business Care', priceCents: 190000,
    benefits: { callFee: 4, smallIntervention: 0, smallInterventionMaxMinutes: null, maintenanceMinutes: 240, scheduledVisits: 2 },
    included: ['2 visite di controllo programmate', '4 diritti di chiamata inclusi', '4 ore di piccola manutenzione incluse', 'Una sede coperta', 'Report degli interventi'],
    features: ['portal', 'reports']
  }),
  plan({
    id: 'hotel-pro', line: 'hotel', name: 'Hotel Pro', priceCents: 490000,
    benefits: { callFee: 8, smallIntervention: 0, smallInterventionMaxMinutes: null, maintenanceMinutes: 720, scheduledVisits: 4 },
    included: ['4 visite di controllo programmate', '8 diritti di chiamata inclusi', '12 ore di piccola manutenzione incluse', 'Una struttura coperta', 'Canale dedicato', 'Report digitale degli interventi'],
    features: ['portal', 'reports', 'dedicated_channel']
  }),
  plan({
    id: 'hotel-elite', line: 'hotel', name: 'Hotel Elite', priceCents: 990000,
    benefits: { callFee: 16, smallIntervention: 0, smallInterventionMaxMinutes: null, maintenanceMinutes: 1440, scheduledVisits: 6 },
    included: ['6 visite di controllo programmate', '16 diritti di chiamata inclusi', '24 ore di piccola manutenzione incluse', 'Una struttura coperta', 'Referente tecnico dedicato, se disponibile', 'Piano di manutenzione concordato', 'Report periodici'],
    features: ['portal', 'reports', 'dedicated_channel', 'dedicated_contact_if_available', 'maintenance_plan']
  })
];

export const corporateProgram = {
  id: 'corporate', line: 'corporate', name: 'PRONTO+ Corporate',
  fromPriceCents: 1500000, // prezzo indicativo "da 15.000 € + IVA": ogni contratto è personalizzato
  configurable: [
    ['locationsCount', 'Numero di sedi'], ['locations', 'Ubicazione degli immobili'], ['structuresCount', 'Numero di strutture'],
    ['services', 'Servizi richiesti'], ['scheduledInspections', 'Sopralluoghi programmati'], ['annualHours', 'Monte ore annuale'],
    ['interventionsCount', 'Numero di interventi'], ['onCall', 'Condizioni di reperibilità'], ['priority', 'Priorità di gestione'],
    ['extraRates', 'Tariffe aggiuntive'], ['contacts', 'Referenti aziendali'], ['validity', 'Periodo di validità'],
    ['economics', 'Condizioni economiche'], ['sla', 'Eventuali SLA specifici']
  ]
};

/** Esclusioni comuni ai piani B2B. */
export const b2bExclusions = [
  'Materiali, ricambi e noleggi di macchinari specialistici, preventivati a parte.',
  'Lavori complessi, rifacimenti di impianti e opere che richiedono progetti o pratiche: sempre su preventivo.',
  'Interventi fuori dalla fascia oraria coperta, salvo accordi: con maggiorazione indicata nel contratto.',
  'Sedi non indicate nel contratto o fuori dalla zona servita.',
  'Verifiche periodiche obbligatorie per legge e certificazioni di impianto: le visite di controllo non le sostituiscono.',
  'Risarcimenti di danni: i piani non sono polizze assicurative.'
];

export const BUSINESS_SEGMENTS = [
  ['hotel', 'Hotel e alberghi'], ['ricettivo', 'Strutture ricettive, B&B e case vacanza'], ['ristorante', 'Ristoranti'], ['bar', 'Bar e caffetterie'],
  ['negozio', 'Negozi'], ['supermercato', 'Supermercati'], ['ufficio', 'Uffici e studi professionali'], ['centro_commerciale', 'Centri commerciali'],
  ['condominio', 'Condomini'], ['amministratore', 'Amministratori condominiali'], ['industria', 'Aziende industriali'], ['gruppo', 'Grandi gruppi aziendali'], ['multisede', 'Aziende multisede']
];
