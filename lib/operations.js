/**
 * Centrale operativa (Prompt 5): regole condivise tra interfacce, funzioni e test.
 *
 * Le stesse regole sono applicate dal database (migrazioni 2026111715*): qui
 * servono per mostrare in anticipo all'utente cosa è consentito, e i test
 * verificano che le due implementazioni coincidano.
 */

/** I 15 stati operativi, in ordine di avanzamento. */
export const OP_STATUSES = [
  ['new', 'Nuova richiesta'], ['in_review', 'In valutazione'], ['awaiting_quote', 'In attesa di preventivo'], ['quote_sent', 'Preventivo inviato'],
  ['quote_accepted', 'Preventivo accettato'], ['to_schedule', 'Da programmare'], ['scheduled', 'Intervento programmato'], ['technician_assigned', 'Tecnico assegnato'],
  ['en_route', 'Tecnico in viaggio'], ['on_site', 'Tecnico sul posto'], ['in_progress', 'Intervento in corso'], ['completed', 'Intervento completato'],
  ['admin_review', 'In verifica amministrativa'], ['closed', 'Chiuso'], ['cancelled', 'Annullato']
];
export const OP_LABELS = Object.fromEntries(OP_STATUSES);
export const opLabel = (s) => OP_LABELS[s] || s;

/** Tono del badge per stato (stessa palette delle aree riservate). */
export const OP_TONE = {
  new: 'warn', in_review: 'info', awaiting_quote: 'warn', quote_sent: 'info', quote_accepted: 'ok', to_schedule: 'warn', scheduled: 'info',
  technician_assigned: 'info', en_route: 'info', on_site: 'info', in_progress: 'info', completed: 'warn', admin_review: 'warn', closed: 'ok', cancelled: 'neutral'
};

/** Transizioni ammesse per attore: identiche a public.ops_allowed_transitions. */
export const TRANSITIONS = {
  staff: {
    new: ['in_review', 'awaiting_quote', 'to_schedule', 'cancelled'],
    in_review: ['awaiting_quote', 'to_schedule', 'cancelled'],
    awaiting_quote: ['quote_sent', 'to_schedule', 'cancelled'],
    quote_sent: ['quote_accepted', 'awaiting_quote', 'cancelled'],
    quote_accepted: ['to_schedule', 'cancelled'],
    to_schedule: ['scheduled', 'cancelled'],
    scheduled: ['technician_assigned', 'to_schedule', 'cancelled'],
    technician_assigned: ['en_route', 'on_site', 'in_progress', 'scheduled', 'to_schedule', 'cancelled'],
    en_route: ['on_site', 'technician_assigned', 'cancelled'],
    on_site: ['in_progress', 'cancelled'],
    in_progress: ['completed'],
    completed: ['admin_review', 'in_progress'],
    admin_review: ['closed', 'in_progress'],
    closed: ['admin_review']
  },
  technician: {
    technician_assigned: ['en_route', 'on_site'],
    en_route: ['on_site'],
    on_site: ['in_progress'],
    in_progress: ['completed']
  },
  customer: Object.fromEntries(['new', 'in_review', 'awaiting_quote', 'quote_sent', 'to_schedule'].map((s) => [s, ['cancelled']]))
};

export const allowedTransitions = (actor, from) => TRANSITIONS[actor]?.[from] || [];
export const canTransition = (actor, from, to) => allowedTransitions(actor, from).includes(to);

/** Transizioni che richiedono una motivazione scritta. */
export const needsNote = (from, to) => to === 'cancelled' || (to === 'in_progress' && ['completed', 'admin_review'].includes(from)) || from === 'closed';

/** Stato storico (Prompt 2) corrispondente: identico a public.op_legacy_status. */
export function legacyStatus(op, reportApproved = false) {
  if (['new', 'in_review', 'awaiting_quote', 'quote_sent', 'quote_accepted', 'to_schedule'].includes(op)) return 'requested';
  if (['scheduled', 'technician_assigned'].includes(op)) return 'scheduled';
  if (['en_route', 'on_site', 'in_progress'].includes(op)) return 'in_progress';
  if (op === 'completed') return 'completed';
  if (op === 'admin_review') return reportApproved ? 'verified' : 'completed';
  if (op === 'closed') return 'verified';
  return 'cancelled';
}

/** Stati delle richieste aziendali (Prompt 3) nello schema a 15 stati. */
export const B2B_TO_OP = { submitted: 'new', under_review: 'in_review', to_schedule: 'to_schedule', scheduled: 'scheduled', technician_assigned: 'technician_assigned',
  in_progress: 'in_progress', completed: 'completed', closed: 'closed', cancelled: 'cancelled' };

/** Raggruppamenti delle card della dashboard. */
export const DASHBOARD_GROUPS = {
  waiting: ['new', 'in_review', 'awaiting_quote', 'quote_sent'],
  toSchedule: ['quote_accepted', 'to_schedule'],
  scheduled: ['scheduled'],
  technicianAssigned: ['technician_assigned'],
  inProgress: ['en_route', 'on_site', 'in_progress'],
  completed: ['completed', 'admin_review']
};

export const URGENCY_LABELS = { low: 'Bassa', normal: 'Normale', high: 'Alta', emergency: 'Emergenza' };
export const PRIORITY_LABELS = { low: 'Bassa', normal: 'Normale', high: 'Alta', urgent: 'Urgente' };
export const SOURCE_LABELS = {
  homepage: 'Homepage', landing: 'Landing servizio', quote_form: 'Modulo preventivo', family: 'PRONTO+ Family', business: 'PRONTO+ Business',
  hotel: 'PRONTO+ Hotel', corporate: 'PRONTO+ Corporate', customer_area: 'Area cliente', protected_work: 'Lavoro Protetto', admin: 'Inserimento manuale', phone: 'Telefono',
  condominium: 'PRONTO+ Condomini'
};
export const PAYMENT_STATE_LABELS = {
  paid: 'Pagato', partially_paid: 'Pagato in parte', refunded: 'Rimborsato', partially_refunded: 'Rimborsato in parte', requested: 'Pagamento richiesto',
  needs_review: 'Da verificare', order_draft: 'Ordine in bozza', not_defined: 'Importi non definiti', to_define: 'Scheda economica in bozza', covered: 'Coperto da PRONTO+',
  no_charge: 'Nessun addebito', to_request: 'Da richiedere/fatturare'
};
export const ENTRY_KIND_LABELS = { intervento: 'Intervento', sopralluogo: 'Sopralluogo', richiesta_b2b: 'Richiesta aziendale', manutenzione: 'Manutenzione programmata',
  controllo_lavoro_protetto: 'Controllo Lavoro Protetto' };

/* ---------------------------------------------------------------- numeri e recapiti */
export const normalizePhone = (p) => {
  const d = String(p || '').replace(/\D/g, '');
  return d ? d.slice(-10) : null;
};

/**
 * Collegamento alla navigazione: apre un'app esterna (Google Maps, che su iOS/Android
 * passa all'app installata) con il solo indirizzo dell'intervento. Nessuna posizione
 * del tecnico viene letta o inviata.
 */
export function navigationUrl({ addressLine, city, postalCode } = {}) {
  const q = [addressLine, [postalCode, city].filter(Boolean).join(' ')].filter((x) => x && String(x).trim()).join(', ');
  if (!q) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}

/* ---------------------------------------------------------------- scheda economica */
/** Arrotondamento "half away from zero" (come round() di PostgreSQL sui numeric). */
export const roundHalfAway = (x) => Math.sign(x) * Math.round(Math.abs(x));

/** Stesso calcolo di public._econ_recalc: IVA per riga, come gli ordini del Prompt 4. */
export function computeEconomics(e) {
  const v = (k) => Number.isInteger(e[k]) ? e[k] : 0;
  const lines = ['callFeeCents', 'laborCents', 'materialsCents', 'equipmentRentalCents', 'travelCents', 'disposalCents', 'externalCostsCents'].map(v);
  const subtotal = lines.reduce((a, b) => a + b, 0);
  const covered = v('coveredCents');
  const discount = v('discountCents');
  const taxable = subtotal - covered - discount;
  if (taxable < 0) throw new Error('Quota inclusa e sconti superano gli importi delle voci');
  const rate = Number(e.vatRate ?? 22);
  if (![0, 4, 5, 10, 22].includes(rate)) throw new Error('Aliquota IVA non prevista');
  const vat = Math.max(0, [...lines, -covered, -discount].filter((x) => x !== 0).reduce((n, x) => n + roundHalfAway((x * rate) / 100), 0));
  return { subtotalCents: subtotal, taxableCents: taxable, vatCents: vat, totalCents: taxable + vat };
}

/** Prezzo accettato dal cliente: l'importo (al netto della quota inclusa) non supera concordato + lavorazioni aggiuntive autorizzate. */
export function withinAgreedPrice({ subtotalCents, coveredCents = 0 }, agreedCents, authorizedExtrasCents = 0) {
  if (agreedCents === null || agreedCents === undefined) return true;
  return subtotalCents - coveredCents <= agreedCents + authorizedExtrasCents;
}

/** Margine di contribuzione stimato (solo per chi ha il permesso costs.internal). */
export function margin({ revenueNetCents, internalCostCents }) {
  const m = revenueNetCents - internalCostCents;
  return { marginCents: m, marginPct: revenueNetCents > 0 ? Math.round((m * 1000) / revenueNetCents) / 10 : null };
}

/* ---------------------------------------------------------------- rapporto */
/** Dati minimi per dichiarare completato un intervento (stessa regola di public.report_missing_fields). */
export function reportMissingFields(report, intervention = {}) {
  if (!report) return ['rapporto di intervento'];
  const miss = [];
  const len = (s) => String(s || '').trim().length;
  if (len(report.workPerformed ?? report.work_description) < 10) miss.push('lavorazioni eseguite');
  if ((report.format || 'full') === 'full') {
    if (len(report.diagnosis) < 5) miss.push('diagnosi effettuata');
    const s = report.startedAt ?? report.started_at; const e = report.endedAt ?? report.ended_at;
    if (!s || !e) miss.push('orario di inizio e fine');
    else if (new Date(e) <= new Date(s)) miss.push('orario di fine successivo all’inizio');
  }
  if (!intervention.categoryId && !intervention.category_id) miss.push('categoria');
  if ((report.format || 'full') === 'full' && !intervention.serviceId && !intervention.service_id) miss.push('servizio (sottocategoria)');
  if (!intervention.addressLine && !intervention.address_line) miss.push('indirizzo dell’intervento');
  return miss;
}

export const REPORT_DISCLAIMER =
  'Rapporto riepilogativo dell’intervento eseguito. Non costituisce dichiarazione di conformità, certificazione obbligatoria né documento fiscale. La presa visione del cliente è facoltativa e non sostituisce certificazioni previste dalla legge.';
export const LEGAL_DEFECTS_TEXT =
  'Eventuali difetti dei lavori eseguiti si possono segnalare gratuitamente, in qualsiasi momento, indipendentemente dall’acquisto di servizi aggiuntivi: restano valide le tutele previste dalla legge.';

export const isReportNumber = (n) => /^RAP-\d{4}-[0-9A-HJKMNP-TV-Z]{6}$/.test(String(n || ''));

/* ---------------------------------------------------------------- calendario */
export const overlaps = (a, b) => new Date(a.start) < new Date(b.end) && new Date(b.start) < new Date(a.end);

/** Conflitti di un nuovo appuntamento rispetto a quelli esistenti dello stesso tecnico (anteprima lato interfaccia). */
export function calendarConflicts(entries, { technicianId, start, end, excludeAssignmentId = null }) {
  return entries.filter((x) => x.technicianId === technicianId && x.assignmentId !== excludeAssignmentId
    && !['completed', 'admin_review', 'closed', 'cancelled'].includes(x.status) && overlaps({ start, end }, { start: x.startsAt, end: x.endsAt }));
}

/** Giorni della settimana (lunedì primo) che contengono la data, in ora locale. */
export function weekDays(date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

/** Griglia mensile (6 settimane da lunedì). */
export function monthGrid(date) {
  const d = new Date(date);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const start = weekDays(first)[0];
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}
