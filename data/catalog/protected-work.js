/**
 * PRONTO+ LAVORO PROTETTO — LISTINO PROVVISORIO
 * ------------------------------------------------------------------
 * Servizio commerciale FACOLTATIVO di assistenza post-intervento.
 * NON è un'assicurazione, NON è una garanzia e NON sostituisce, limita o
 * condiziona le tutele previste dalla legge sui lavori eseguiti: le
 * segnalazioni di difetti si presentano sempre, con o senza questo servizio.
 *
 * Prezzi IVA inclusa in centesimi, una tantum. Da approvare dal titolare e
 * verificare con un legale prima della vendita.
 */

export const PROTECTED_VAT_RATE = 22;
export const PROTECTED_STATUS = { ownerApproved: false, legalReviewed: false };

/** Limiti operativi comuni (configurabili). */
export const protectedLimits = {
  /** Comuni in cui si eseguono le visite preventive. */
  zones: ['Roma'],
  zonesNote: 'Comune di Roma; altri comuni della provincia da confermare caso per caso.',
  /** Durata massima di ciascuna visita preventiva. */
  visitMaxMinutes: 60,
  /** Fascia oraria e giorni delle visite (concordate su appuntamento). */
  visitWindow: 'Lunedì–venerdì, in orario lavorativo, su appuntamento',
  /** Entro quanti giorni dal certificato si può acquistare il servizio. */
  purchaseWindowDays: 30,
  /** Preavviso minimo per prenotare una visita. */
  bookingNoticeDays: 3
};

export const protectedPlans = [
  {
    id: 'check',
    name: 'Check',
    priceCents: 5900,
    durationMonths: 6,
    visits: 0,
    callFeeIncludedForVisits: false,
    discount: { pct: 10, scope: 'future-ordinary-maintenance', uses: 1, label: 'Sconto 10% su una futura manutenzione ordinaria' },
    benefits: ['Certificato digitale dell’intervento', 'Follow-up telefonico', 'Promemoria di controllo', 'Sconto del 10% su una futura manutenzione ordinaria'],
    features: { followUpCall: true, reminder: true, report: false, history: false }
  },
  {
    id: 'plus',
    name: 'Plus',
    priceCents: 14900,
    durationMonths: 12,
    visits: 1,
    callFeeIncludedForVisits: true,
    discount: { pct: 10, scope: 'future-ordinary-maintenance-labor', uses: 1, label: 'Sconto 10% sulla manodopera di una futura manutenzione ordinaria' },
    benefits: ['Tutti i benefici Check', '1 visita preventiva concordata', 'Diritto di chiamata incluso per la visita', 'Sconto del 10% sulla manodopera di una futura manutenzione ordinaria', 'Report digitale del controllo'],
    features: { followUpCall: true, reminder: true, report: true, history: false }
  },
  {
    id: 'premium',
    name: 'Premium',
    priceCents: 24900,
    durationMonths: 12,
    visits: 2,
    callFeeIncludedForVisits: true,
    discount: { pct: 15, scope: 'future-ordinary-maintenance-labor', uses: null, label: 'Sconto 15% sulla manodopera di future manutenzioni ordinarie' },
    benefits: ['Tutti i benefici Plus', '2 visite preventive concordate anziché una', 'Diritto di chiamata incluso per entrambe le visite', 'Sconto del 15% sulla manodopera di future manutenzioni ordinarie', 'Storico digitale dei controlli'],
    features: { followUpCall: true, reminder: true, report: true, history: true }
  }
];

/**
 * Listini specialistici: per autospurgo e diagnostica strumentale le visite
 * richiedono mezzi e strumenti dedicati. Prezzi e prestazioni sono separati
 * e restano NON VENDIBILI finché non vengono definiti (`priceCents: null`).
 */
export const protectedSpecialistVariants = [
  { id: 'autospurgo', name: 'Autospurgo', appliesTo: ['idraulica/spurgo-fognature', 'idraulica/disostruzione-scarichi-canal-jet'], plans: { check: null, plus: null, premium: null }, note: 'Visita preventiva con mezzo dedicato: listino da definire.' },
  { id: 'diagnostica', name: 'Diagnostica strumentale', appliesTo: ['ricerca-perdite-occulte/*', 'idraulica/videoispezione-tubature'], plans: { check: null, plus: null, premium: null }, note: 'Controllo con strumentazione: listino da definire.' }
];

/** Ciò che il servizio NON comprende (testo mostrato prima dell'acquisto). */
export const protectedExclusions = [
  'Riparazioni illimitate o nuovi lavori non previsti dal piano.',
  'Copertura di danni futuri o risarcimenti: il servizio non è un’assicurazione.',
  'Materiali, ricambi e lavori diversi dalla visita preventiva.',
  'Visite fuori dalle zone e dagli orari indicati o oltre la durata prevista.'
];
