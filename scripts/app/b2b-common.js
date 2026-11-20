/** Etichette e utilità condivise dall'area Business e dalla dashboard (B2B). */
import { badge } from './core.js';

export const REQUEST_LABELS = {
  submitted: ['Inviata', 'info'], under_review: ['In valutazione', 'warn'], to_schedule: ['Da programmare', 'warn'], scheduled: ['Programmata', 'info'],
  technician_assigned: ['Tecnico assegnato', 'info'], in_progress: ['In lavorazione', 'info'], completed: ['Completata', 'ok'], closed: ['Chiusa', 'neutral'], cancelled: ['Annullata', 'neutral']
};
export const CONTRACT_LABELS = {
  draft: ['Bozza', 'warn'], awaiting_client: ['Da accettare', 'warn'], awaiting_payment: ['In attesa di pagamento', 'warn'], active: ['Attivo', 'ok'], expired: ['Scaduto', 'neutral'], cancelled: ['Annullato', 'neutral'],
  approved: ['Approvata', 'info'], accepted: ['Accettata', 'ok'], superseded: ['Sostituita', 'neutral'], rejected: ['Rifiutata', 'neutral']
};
export const QUOTE_LABELS = { draft: ['Bozza', 'warn'], approved: ['Approvato', 'info'], sent: ['Inviato', 'info'], accepted: ['Accettato', 'ok'], rejected: ['Rifiutato', 'neutral'], expired: ['Scaduto', 'neutral'] };
export const LEAD_LABELS = {
  new: ['Nuovo', 'info'], contacted: ['Contattato', 'info'], qualified: ['Qualificato', 'info'], inspection_proposed: ['Sopralluogo proposto', 'warn'],
  quote_sent: ['Preventivo inviato', 'warn'], negotiating: ['In trattativa', 'warn'], won: ['Acquisito', 'ok'], lost: ['Non acquisito', 'neutral']
};
export const VISIT_LABELS = { planned: ['Pianificata', 'neutral'], scheduled: ['Programmata', 'info'], completed: ['Eseguita, da confermare', 'warn'], confirmed: ['Confermata', 'ok'], cancelled: ['Annullata', 'neutral'] };
export const INSTALLMENT_LABELS = { due: ['Da pagare', 'warn'], paid: ['Pagata', 'ok'], cancelled: ['Annullata', 'neutral'] };
export const ROLE_LABELS = { company_admin: 'Amministratore aziendale', maintenance_manager: 'Responsabile della manutenzione', site_contact: 'Referente di sede', limited_user: 'Utente con permessi limitati' };
export const KIND_LABELS = { business: 'Business', hotel: 'Hotel', condominium: 'Condominio', corporate: 'Corporate' };
export const LINE_LABELS = { business: 'PRONTO+ Business', hotel: 'PRONTO+ Hotel', corporate: 'PRONTO+ Corporate' };
export const URGENCY_LABELS = { low: 'Bassa', normal: 'Normale', high: 'Alta' };
export const BENEFIT_LABELS = { call_fee: 'Diritti di chiamata', small_intervention: 'Piccoli interventi', maintenance_minutes: 'Ore di piccola manutenzione', scheduled_visit: 'Visite programmate' };

export const labelBadge = (map) => (s) => badge(...(map[s] || [s, 'neutral']));
export const requestBadge = labelBadge(REQUEST_LABELS);
export const contractBadge = labelBadge(CONTRACT_LABELS);
export const quoteBadge = labelBadge(QUOTE_LABELS);
export const leadBadge = labelBadge(LEAD_LABELS);
export const visitBadge = labelBadge(VISIT_LABELS);
export const installmentBadge = labelBadge(INSTALLMENT_LABELS);

/** "12 ore", "45 minuti", "3" a seconda dell'unità. */
export const qty = (unit, n) => (unit === 'minutes' ? (n % 60 === 0 ? `${n / 60} ore` : `${Math.floor(n / 60)} h ${n % 60} min`) : String(n));

/** Permessi dell'interfaccia (il database applica comunque gli stessi vincoli). */
export const CAN = {
  company_admin: { contracts: true, pay: true, members: true, locations: true, confirmVisits: true, allLocations: true },
  maintenance_manager: { contracts: true, pay: false, members: false, locations: true, confirmVisits: true, allLocations: true },
  site_contact: { contracts: false, pay: false, members: false, locations: false, confirmVisits: false, allLocations: false },
  limited_user: { contracts: false, pay: false, members: false, locations: false, confirmVisits: false, allLocations: false }
};
