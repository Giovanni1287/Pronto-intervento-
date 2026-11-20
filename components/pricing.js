/**
 * Prezzi e vendite sul sito pubblico (Prompt 9).
 * - In PRODUZIONE un prezzo compare solo se il listino è approvato dal titolare, con condizioni
 *   validate e versione pubblicata (public_price_list letto alla build). Altrimenti "Prezzo in definizione".
 * - In anteprima/sviluppo i prezzi del catalogo restano visibili come BOZZA, con l'avviso "listino provvisorio".
 * - Un pulsante di acquisto è utilizzabile solo con i flag attivi nel database (acquisti online, myPOS e linea).
 * I controlli lato server restano comunque attivi (trigger sugli ordini, RPC, myPOS).
 */
import { ctx } from './context.js';
import { euro } from '../lib/money.js';
import { contacts, forms } from '../config/site.config.js';

export const pricesFromDatabase = () => ctx.publicPrices !== null && ctx.publicPrices !== undefined;
export function priceVisible(planId) {
  if (ctx.env !== 'production') return true;
  return Boolean(ctx.publicPrices && ctx.publicPrices[planId]);
}
/** Prezzo da mostrare: quello pubblicato nel database (produzione) o quello del catalogo (bozza, anteprima). */
export function price(cents, planId, fallback = 'Prezzo in definizione') {
  if (ctx.env === 'production') {
    const pub = ctx.publicPrices?.[planId];
    return pub ? euro(pub.priceCents) : fallback;
  }
  return cents == null ? fallback : euro(cents);
}
export const anyPriceVisible = (ids) => ids.some((id) => priceVisible(id));
export const flag = (key) => Boolean(ctx.flags && ctx.flags[key] === true);
/** Vendita online aperta per una linea: acquisti online + myPOS + flag di linea (tutti dal database). */
export const salesOpen = (line) => flag('online_purchases') && flag('mypos') && flag(line);
/** Esiste davvero un'alternativa di contatto? (telefono verificato o moduli attivi) */
export const contactAvailable = () => Boolean(contacts.phone) || ['netlify', 'centrale'].includes(forms.provider) || (forms.provider === 'endpoint' && Boolean(forms.endpoint));
