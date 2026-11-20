/**
 * Modulo di acquisizione B2B (hotel, aziende, condomini, corporate).
 * Invia a /.netlify/functions/lead-create, che registra il lead tramite la RPC
 * submit_b2b_lead (validazione e anti-duplicato lato server).
 * Il modulo è attivo SOLO se il backend Supabase è configurato: altrimenti il
 * pulsante è disattivato e lo script comunica che nulla è stato inviato.
 */
import { backend, forms } from '../config/site.config.js';
import { categories } from '../data/services.js';
import { BUSINESS_SEGMENTS } from '../data/catalog/business-plans.js';
import { esc, isSet } from './utils.js';

export const LEAD_ENDPOINT = '/.netlify/functions/lead-create';
export const leadFormsEnabled = () => isSet(backend.supabaseUrl) && isSet(backend.supabaseAnonKey);

const SEGMENT_LABEL = { hotel: 'hotel o struttura ricettiva', business: 'attività', condominium: 'condominio', corporate: 'azienda o gruppo' };

/**
 * @param {object} o
 * @param {'hotel'|'business'|'condominium'|'corporate'} o.segment segmento predefinito
 * @param {string} o.id prefisso degli id dei campi (univoco nella pagina)
 * @param {string} o.page percorso della pagina (origine del lead)
 * @param {boolean} [o.segmentChoice] mostra la scelta del segmento (es. aziende/condomini)
 */
export function leadForm({ segment, id, page, segmentChoice = false, title = 'Richiesta di preventivo' }) {
  const enabled = leadFormsEnabled();
  const segField = segmentChoice
    ? `<div class="field field--full">
        <label for="${id}-segmento">Per chi è la richiesta <span aria-hidden="true">*</span></label>
        <select id="${id}-segmento" name="segmento" required>
          <option value="business"${segment === 'business' ? ' selected' : ''}>Azienda o attività commerciale</option>
          <option value="condominium"${segment === 'condominium' ? ' selected' : ''}>Condominio o amministratore condominiale</option>
          <option value="hotel"${segment === 'hotel' ? ' selected' : ''}>Hotel o struttura ricettiva</option>
          <option value="corporate"${segment === 'corporate' ? ' selected' : ''}>Gruppo aziendale o azienda multisede</option>
        </select>
      </div>`
    : `<input type="hidden" name="segmento" value="${segment}">`;
  const services = categories
    .map((c) => `<label class="chip-check" for="${id}-srv-${c.slug}"><input id="${id}-srv-${c.slug}" type="checkbox" name="servizi" value="${c.slug}"><span>${esc(c.name)}</span></label>`)
    .join('');
  return `<form class="request-form lead-form" name="lead-${segment}" data-form data-lead-form method="POST" action="${LEAD_ENDPOINT}" data-enabled="${enabled}" novalidate aria-label="${esc(title)}">
    <input type="hidden" name="pagina" value="${esc(page)}">
    <input type="hidden" name="attribuzione" value="" data-attribution>
    <p hidden><label>Non compilare: <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>
    <div class="form-grid">
      ${segField}
      <div class="field">
        <label for="${id}-azienda">Ragione sociale <span aria-hidden="true">*</span></label>
        <input id="${id}-azienda" name="ragione_sociale" type="text" autocomplete="organization" required minlength="2" maxlength="200">
      </div>
      <div class="field">
        <label for="${id}-referente">Nome del referente <span aria-hidden="true">*</span></label>
        <input id="${id}-referente" name="referente" type="text" autocomplete="name" required maxlength="120">
      </div>
      <div class="field">
        <label for="${id}-email">Email aziendale <span aria-hidden="true">*</span></label>
        <input id="${id}-email" name="email" type="email" autocomplete="email" required maxlength="160">
      </div>
      <div class="field">
        <label for="${id}-telefono">Telefono <span aria-hidden="true">*</span></label>
        <input id="${id}-telefono" name="telefono" type="tel" autocomplete="tel" inputmode="tel" required pattern="[0-9 +.\\(\\)\\-]{6,20}">
      </div>
      <div class="field">
        <label for="${id}-attivita">Tipologia di ${SEGMENT_LABEL[segment] || 'attività'}</label>
        <select id="${id}-attivita" name="attivita">
          <option value="">Seleziona</option>
          ${BUSINESS_SEGMENTS.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label for="${id}-sedi">Numero di sedi o strutture</label>
        <input id="${id}-sedi" name="sedi" type="number" min="1" max="10000" inputmode="numeric" value="1">
      </div>
      <div class="field field--full">
        <label for="${id}-zona">Zona degli immobili <span aria-hidden="true">*</span></label>
        <input id="${id}-zona" name="zona" type="text" required maxlength="160" placeholder="Quartieri di Roma o comuni">
      </div>
      <fieldset class="field field--full chip-group">
        <legend>Servizi di interesse</legend>
        <div class="chip-group__list">${services}</div>
      </fieldset>
      <div class="field field--full">
        <label for="${id}-esigenze">Descrizione delle necessità <span aria-hidden="true">*</span></label>
        <textarea id="${id}-esigenze" name="esigenze" rows="5" required minlength="10" maxlength="4000" placeholder="Tipo di immobili, impianti, problemi ricorrenti, periodi critici, esigenze di reportistica…"></textarea>
      </div>
      <div class="field field--full field--check">
        <input id="${id}-sopralluogo" name="sopralluogo" type="checkbox" value="si">
        <label for="${id}-sopralluogo">Desidero concordare un sopralluogo per una proposta su misura.</label>
      </div>
      <div class="field field--full field--check">
        <input id="${id}-privacy" name="privacy" type="checkbox" value="si" required>
        <label for="${id}-privacy">Ho letto l’<a href="${forms.privacyPolicyUrl}">informativa privacy</a> e acconsento al trattamento dei dati per essere ricontattato in merito a questa richiesta. <span aria-hidden="true">*</span></label>
      </div>
    </div>
    <div class="form-status" role="status" aria-live="polite" data-form-status></div>
    <button class="btn btn--primary btn--lg btn--block" type="submit"${enabled ? '' : ' disabled aria-disabled="true"'}>${enabled ? 'Invia la richiesta' : 'Invio online non ancora attivo'}</button>
    <p class="lead-form__note">La richiesta non vincola e non attiva alcun contratto: riceverai una proposta scritta da valutare.</p>
  </form>`;
}
