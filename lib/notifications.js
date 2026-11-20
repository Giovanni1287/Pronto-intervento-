/**
 * Notifiche con provider configurabili.
 * - Nessun provider configurato → stato `not_sent` (mai "inviata").
 * - Lo stato `sent` si registra solo dopo una risposta positiva del provider.
 * - Le comunicazioni commerciali richiedono il consenso marketing; quelle di
 *   servizio (transazionali) no.
 */
import { itDate } from './dates.js';
import { euro } from './money.js';

const euroText = (c) => (Number.isInteger(c) ? euro(c) : '—');

export const EVENTS = Object.freeze({
  INTERVENTION_COMPLETED: { id: 'intervention_completed', kind: 'transactional' },
  CERTIFICATE_AVAILABLE: { id: 'certificate_available', kind: 'transactional' },
  SERVICE_ACTIVATED: { id: 'service_activated', kind: 'transactional' },
  CHECK_BOOKED: { id: 'check_booked', kind: 'transactional' },
  CHECK_COMPLETED: { id: 'check_completed', kind: 'transactional' },
  PLAN_EXPIRING: { id: 'plan_expiring', kind: 'transactional' },
  REQUEST_CREATED: { id: 'request_created', kind: 'transactional' },
  REQUEST_UPDATED: { id: 'request_updated', kind: 'transactional' },
  ORDER_CREATED: { id: 'order_created', kind: 'transactional' },
  PAYMENT_CONFIRMED: { id: 'payment_confirmed', kind: 'transactional' },
  PAYMENT_FAILED: { id: 'payment_failed', kind: 'transactional' },
  DOCUMENT_AVAILABLE: { id: 'document_available', kind: 'transactional' },
  REFUND_PROCESSED: { id: 'refund_processed', kind: 'transactional' },
  // centrale operativa (Prompt 5)
  REQUEST_TAKEN: { id: 'request_taken', kind: 'transactional' },
  QUOTE_SENT: { id: 'quote_sent', kind: 'transactional' },
  INTERVENTION_SCHEDULED: { id: 'intervention_scheduled', kind: 'transactional' },
  TECHNICIAN_ASSIGNED: { id: 'technician_assigned', kind: 'transactional' },
  APPOINTMENT_RESCHEDULED: { id: 'appointment_rescheduled', kind: 'transactional' },
  REPORT_AVAILABLE: { id: 'report_available', kind: 'transactional' },
  JOB_ASSIGNED: { id: 'job_assigned', kind: 'transactional' },
  REPORT_CHANGES_REQUESTED: { id: 'report_changes_requested', kind: 'transactional' },
  // PRONTO AI (Prompt 6): avvisi interni agli amministratori e promemoria di servizio approvato
  AI_APPROVAL_PENDING: { id: 'ai_approval_pending', kind: 'transactional' },
  AI_AUTOMATION_REPORT: { id: 'ai_automation_report', kind: 'transactional' },
  AI_BUDGET_WARNING: { id: 'ai_budget_warning', kind: 'transactional' },
  CHECK_REMINDER: { id: 'check_reminder', kind: 'transactional' },
  // PRONTO SEO (Prompt 7)
  SEO_ALERT: { id: 'seo_alert', kind: 'transactional' },
  REVIEW_REQUEST: { id: 'review_request', kind: 'transactional' },
  PROMOTION: { id: 'promotion', kind: 'marketing' }
});

const byId = Object.fromEntries(Object.values(EVENTS).map((e) => [e.id, e]));

export const templates = {
  intervention_completed: (d) => ({ subject: `Intervento ${d.interventionNumber} completato`, text: `Il tuo intervento "${d.serviceName}" del ${itDate(d.workDate)} risulta completato. Riceverai il certificato dopo la verifica dei dati.` }),
  certificate_available: (d) => ({ subject: `Certificato ${d.certificateNumber} disponibile`, text: `Il certificato digitale dell’intervento è disponibile nella tua area cliente: ${d.link}.` }),
  service_activated: (d) => ({ subject: `${d.planName} attivo`, text: `Il servizio ${d.planName} è attivo dal ${itDate(d.startsAt)} al ${itDate(d.endsAt)}.` }),
  check_booked: (d) => ({ subject: 'Controllo prenotato', text: `Il controllo è fissato per il ${itDate(d.date)}${d.slot ? `, ${d.slot}` : ''}.` }),
  check_completed: (d) => ({ subject: 'Controllo completato', text: `Il controllo del ${itDate(d.date)} è stato completato. Il report è nella tua area cliente.` }),
  plan_expiring: (d) => ({ subject: `${d.planName} in scadenza`, text: `Il servizio ${d.planName} scade il ${itDate(d.endsAt)}. Prestazioni residue: ${d.remaining}.` }),
  request_created: (d) => ({ subject: `Richiesta ${d.requestNumber} ricevuta`, text: `Abbiamo registrato la tua richiesta (${d.typeLabel}). Ti aggiorneremo sull’esito.` }),
  request_updated: (d) => ({ subject: `Aggiornamento richiesta ${d.requestNumber}`, text: `Nuovo stato: ${d.statusLabel}.${d.message ? ` ${d.message}` : ''}` }),
  // pagamenti: nessun dato sensibile e nessun link con token nei messaggi; i dettagli sono nell'area riservata
  order_created: (d) => ({ subject: `Ordine ${d.orderNumber} registrato`, text: `Abbiamo registrato l’ordine ${d.orderNumber} (${d.description}), importo ${euroText(d.amountCents)}. Il servizio si attiva solo dopo la verifica del pagamento.` }),
  payment_confirmed: (d) => ({ subject: `Pagamento confermato — ordine ${d.orderNumber}`, text: `Il pagamento di ${euroText(d.amountCents)} per l’ordine ${d.orderNumber} è stato verificato. La ricevuta è disponibile nella tua area riservata (non è una fattura).` }),
  payment_failed: (d) => ({ subject: `Pagamento non riuscito — ordine ${d.orderNumber}`, text: `Il pagamento dell’ordine ${d.orderNumber} non risulta completato. Nessun servizio è stato attivato: puoi riprovare dall’area riservata.` }),
  document_available: (d) => ({ subject: 'Nuovo documento disponibile', text: `${d.documentLabel} è disponibile nella tua area riservata.` }),
  refund_processed: (d) => ({ subject: `Rimborso elaborato — ordine ${d.orderNumber}`, text: `È stato elaborato un rimborso di ${euroText(d.amountCents)} per l’ordine ${d.orderNumber}. I tempi di accredito dipendono dal circuito di pagamento.` }),
  promotion: (d) => ({ subject: d.subject, text: d.text }),
  // centrale operativa: solo dati di servizio, nessun importo interno né dato di altri clienti
  request_taken: (d) => ({ subject: `Richiesta ${d.requestNumber} presa in carico`, text: `La tua richiesta ${d.requestNumber} è stata presa in carico: ti contatteremo per i prossimi passi.` }),
  quote_sent: (d) => ({ subject: `Preventivo per la richiesta ${d.requestNumber}`, text: `È disponibile il preventivo per la richiesta ${d.requestNumber}${Number.isInteger(d.amountCents) ? ` (${euroText(d.amountCents)} IVA inclusa)` : ''}. Puoi accettarlo dall’area cliente o rispondendo a questo messaggio.` }),
  intervention_scheduled: (d) => ({ subject: `Intervento ${d.interventionNumber} programmato`, text: `L’intervento è programmato per il ${itDate(d.date)}${d.slot ? `, fascia ${d.slot}` : ''}.` }),
  technician_assigned: (d) => ({ subject: `Intervento ${d.interventionNumber}: tecnico assegnato`, text: `Il tecnico ${d.technicianName || 'incaricato'} verrà il ${itDate(d.date)}${d.slot ? `, fascia ${d.slot}` : ''}.` }),
  appointment_rescheduled: (d) => ({ subject: `Appuntamento ${d.interventionNumber || d.requestNumber} spostato`, text: `Il nuovo appuntamento è il ${itDate(d.date)}${d.slot ? `, fascia ${d.slot}` : ''}.` }),
  report_available: (d) => ({ subject: `Rapporto di intervento ${d.reportNumber} disponibile`, text: `Il rapporto dell’intervento ${d.interventionNumber} è disponibile${d.link ? ` nell’area cliente: ${d.link}` : '. Puoi richiederne copia ai nostri contatti.'}` }),
  job_assigned: (d) => ({ subject: `Nuovo lavoro assegnato${d.interventionNumber ? ` — ${d.interventionNumber}` : ''}`, text: `Hai un nuovo lavoro il ${itDate(d.date)}. Dettagli nell’area tecnico${d.link ? `: ${d.link}` : ''}.` }),
  report_changes_requested: (d) => ({ subject: `Rapporto ${d.interventionNumber}: correzione richiesta`, text: `L’amministrazione chiede una correzione del rapporto: ${d.message || ''}` }),
  ai_approval_pending: (d) => ({ subject: `PRONTO AI: proposta ${d.number} da approvare`, text: `È in coda una proposta di PRONTO AI da verificare in "Azioni AI da approvare". Nessuna azione è stata eseguita.` }),
  ai_automation_report: (d) => ({ subject: `PRONTO AI — ${d.rule}`, text: d.error ? `Automazione "${d.rule}" non riuscita: ${d.error}.` : `Report "${d.rule}" disponibile nella dashboard PRONTO AI (${d.runKey}).` }),
  ai_budget_warning: (d) => ({ subject: 'PRONTO AI: soglia di budget raggiunta', text: `La spesa stimata di PRONTO AI ha raggiunto il ${d.pct}% del budget mensile. Verifica la sezione COSTI PRONTO AI.` }),
  seo_alert: (d) => ({ subject: 'PRONTO SEO: segnalazione da verificare', text: `${d.message || 'Nuova segnalazione nella dashboard PRONTO SEO.'} Dettagli in /admin/seo/.` }),
  // richiesta cortese, una sola volta, senza vantaggi in cambio e con rinuncia immediata
  review_request: (d) => ({ subject: 'Com’è andato il nostro intervento?', text: `Grazie per averci scelto per l’intervento ${d.number || ''}. Se vuoi, puoi lasciare una recensione sulla nostra scheda Google: ${d.reviewUrl}. La tua opinione, qualunque sia, ci aiuta a migliorare. Non riceverai solleciti. Per non ricevere più richieste di questo tipo: ${d.optoutUrl || '/recensioni/rinuncia/?t=' + (d.optoutToken || '')}` }),
  check_reminder: (d) => ({ subject: 'Controllo incluso nel tuo Lavoro Protetto', text: `Ti ricordiamo che il tuo Lavoro Protetto include un controllo che puoi prenotare dall’area cliente${d.link ? `: ${d.link}` : ''}.` })
};

export function render(eventId, data) {
  const t = templates[eventId];
  if (!t) throw new Error(`Evento sconosciuto: ${eventId}`);
  return t(data);
}

/**
 * @param provider oggetto { name, send({ to, subject, text }) → Promise<{ id }> } oppure null
 */
export async function dispatch({ eventId, data, recipient, consents = {}, provider = null, channel = 'email', allowedDomains = null }) {
  const ev = byId[eventId];
  if (!ev) throw new Error(`Evento sconosciuto: ${eventId}`);
  // WhatsApp: previsto solo tramite API ufficiale WhatsApp Business, se autorizzata. Nessuna automazione non ufficiale.
  if (channel !== 'email') return { status: 'not_sent', reason: `Canale ${channel} non attivo`, eventId };
  if (ev.kind === 'marketing' && consents.marketing !== true) return { status: 'skipped_no_consent', eventId };
  if (!recipient?.email) return { status: 'not_sent', reason: 'Destinatario senza email', eventId };
  if (!provider) return { status: 'not_sent', reason: 'Nessun provider di notifica configurato', eventId };
  // Prompt 8 — staging: con NOTIFY_ALLOWED_DOMAINS impostata si scrive SOLO a indirizzi di quei domini (caselle di prova)
  if (allowedDomains?.length && !allowedDomains.includes(String(recipient.email).split('@').pop().toLowerCase())) {
    return { status: 'not_sent', reason: 'Destinatario fuori dai domini di prova consentiti (staging)', eventId };
  }
  const msg = render(eventId, data);
  try {
    const res = await provider.send({ to: recipient.email, ...msg });
    if (!res?.id) return { status: 'failed', reason: 'Risposta del provider senza identificativo', eventId };
    return { status: 'sent', provider: provider.name, providerMessageId: res.id, eventId };
  } catch (err) {
    return { status: 'failed', reason: String(err.message || err), eventId };
  }
}

/** Provider email via API HTTP Resend (attivo solo con RESEND_API_KEY). */
export function resendProvider({ apiKey, from, fetchImpl = globalThis.fetch }) {
  if (!apiKey || !from) return null;
  return {
    name: 'resend',
    async send({ to, subject, text }) {
      const r = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject, text })
      });
      if (!r.ok) throw new Error(`Resend HTTP ${r.status}`);
      return r.json();
    }
  };
}
