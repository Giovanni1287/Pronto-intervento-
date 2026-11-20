import { icon } from './icons.js';
import { phoneHref, whatsappHref } from './utils.js';
import { contacts } from '../config/site.config.js';
import { isProduction } from './context.js';

/**
 * Pulsanti Chiama / WhatsApp.
 * Se il dato non è configurato:
 *  - in produzione il pulsante NON viene mostrato;
 *  - in sviluppo/anteprima appare disattivato con l'etichetta "da configurare".
 */
function contactButton({ href, iconName, label, missingLabel, className }) {
  if (href) {
    const ext = href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
    return `<a class="btn ${className}" href="${href}"${ext}>${icon(iconName, { size: 20 })}<span>${label}</span></a>`;
  }
  if (isProduction()) return '';
  return `<span class="btn ${className} is-disabled" aria-disabled="true" title="Dato da completare in src/config/site.config.js">${icon(iconName, { size: 20 })}<span>${missingLabel}</span></span>`;
}

export const callButton = (className = 'btn--call') =>
  contactButton({
    href: phoneHref(),
    iconName: 'phone',
    label: contacts.phone ? `Chiama ${contacts.phone}` : 'Chiama',
    missingLabel: 'Telefono da configurare',
    className
  });

export const whatsappButton = (className = 'btn--whatsapp', message) =>
  contactButton({
    href: whatsappHref(message),
    iconName: 'whatsapp',
    label: 'WhatsApp',
    missingLabel: 'WhatsApp da configurare',
    className
  });
