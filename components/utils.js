import { contacts, specialistDomains, forms, backend } from '../config/site.config.js';
import { photos } from '../config/images.config.js';
import { ctx } from './context.js';

export const esc = (s = '') =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export const isSet = (v) => v !== null && v !== undefined && String(v).trim() !== '';

/** Link telefonico/WhatsApp solo se configurati. */
export const phoneHref = () => (isSet(contacts.phone) ? `tel:${contacts.phone.replace(/\s+/g, '')}` : null);
export const whatsappHref = (message = contacts.whatsappMessage) =>
  isSet(contacts.whatsapp)
    ? `https://wa.me/${contacts.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`
    : null;

/** CTA verso il futuro dominio specialistico: se non configurato o non valido → pagina interna. */
export const leakCtaHref = () => {
  const d = specialistDomains.leakDetection;
  if (isSet(d)) {
    try {
      const u = new URL(d);
      if (u.protocol === 'https:') return u.href;
    } catch {
      /* valore non valido: si usa il fallback interno */
    }
  }
  return '/servizi/ricerca-perdite-occulte/';
};
export const leakCtaIsExternal = () => leakCtaHref().startsWith('https://');

export const formsEnabled = () =>
  forms.provider === 'netlify' || (forms.provider === 'endpoint' && isSet(forms.endpoint))
  // 'centrale' (Prompt 5): richieste registrate nella centrale operativa, solo con backend Supabase configurato
  || (forms.provider === 'centrale' && isSet(backend.supabaseUrl) && isSet(backend.supabaseAnonKey));

/** Endpoint della centrale operativa per i moduli pubblici. */
export const REQUEST_ENDPOINT = '/.netlify/functions/request-create';

/**
 * Risolve un'immagine:
 * 1. registro centrale `photos[key]` (src/config/images.config.js)
 * 2. oggetto legacy con `src` (site.config / services)
 * 3. placeholder SVG generato (registrato nel contesto di build)
 */
export function resolveImage(img, placeholderKey, opts = {}) {
  const reg = opts.key ? photos[opts.key] : null;
  const real = reg && isSet(reg.src) ? reg : img && isSet(img.src) ? img : null;
  if (real) return { ...real, alt: real.alt || img?.alt || opts.alt, placeholder: false };
  if (opts.spec) ctx.placeholders.set(placeholderKey, opts.spec);
  return {
    src: `/assets/images/placeholder/${placeholderKey}.svg`,
    alt: `Immagine illustrativa segnaposto: ${opts.alt || img?.alt || placeholderKey}`,
    placeholder: true
  };
}

/**
 * <picture> responsive con AVIF/WebP opzionali.
 * - eager: caricamento prioritario (hero/LCP) con fetchpriority="high"
 * - altrimenti lazy loading
 */
export function picture(img, placeholderKey, {
  className = '', width = 1200, height = 800, eager = false, sizes = '100vw', key = '', alt = '', spec = null, caption = ''
} = {}) {
  const r = resolveImage(img, placeholderKey, { key, alt, spec });
  const loading = eager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"';
  const flag = r.placeholder ? ` data-placeholder="true"${key ? ` data-photo-key="${esc(key)}"` : ''}` : '';
  const badge = r.placeholder ? '<span class="ph-badge" aria-hidden="true">Immagine da sostituire</span>' : '';
  const sources = [
    r.avif && `<source type="image/avif" srcset="${r.avif}" sizes="${sizes}">`,
    r.webp && `<source type="image/webp" srcset="${r.webp}" sizes="${sizes}">`
  ].filter(Boolean).join('');
  const w = r.width || width;
  const h = r.height || height;
  const imgTag = `<img src="${r.src}" alt="${esc(r.alt)}" width="${w}" height="${h}" ${loading} decoding="${eager ? 'sync' : 'async'}">`;
  const pic = sources ? `<picture>${sources}${imgTag}</picture>` : imgTag;
  const cap = caption ? `<figcaption>${esc(caption)}</figcaption>` : '';
  const tag = caption ? 'figure' : 'div';
  return `<${tag} class="media ${className}"${flag}>${pic}${badge}${cap}</${tag}>`;
}

/** URL dell'immagine (per preload della hero). */
export const imageUrl = (img, placeholderKey, opts = {}) => {
  const r = resolveImage(img, placeholderKey, opts);
  return { href: r.avif || r.webp || r.src, type: r.avif ? 'image/avif' : r.webp ? 'image/webp' : r.placeholder ? 'image/svg+xml' : '' };
};

export const trimText = (t, max = 158) => (t.length <= max ? t : t.slice(0, t.lastIndexOf(' ', max - 1)).replace(/[,;:]$/, '') + '…');
