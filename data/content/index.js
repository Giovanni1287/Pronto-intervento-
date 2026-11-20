/**
 * Indice dei contenuti editoriali: unisce il catalogo (services.js)
 * con i testi di categoria e delle landing (un file per categoria).
 */
import { categories } from '../services.js';
import idraulica from './idraulica.js';
import elettrica from './elettrica.js';
import perdite from './ricerca-perdite-occulte.js';
import allagamenti from './allagamenti.js';
import muratura from './muratura.js';
import disinfestazioni from './disinfestazioni.js';

const byCategory = {
  idraulica,
  elettrica,
  'ricerca-perdite-occulte': perdite,
  allagamenti,
  muratura,
  disinfestazioni
};

export const categoryContent = (slug) => byCategory[slug]?.category;
export const landingContent = (catSlug, subSlug) => byCategory[catSlug]?.landings?.[subSlug];

/** Verifica di coerenza: ogni sottocategoria del catalogo ha i suoi contenuti. */
export function validateContent() {
  const errors = [];
  for (const c of categories) {
    if (!byCategory[c.slug]) errors.push(`Contenuti mancanti per la categoria ${c.slug}`);
    for (const s of c.subcategories) {
      const l = landingContent(c.slug, s.slug);
      if (!l) { errors.push(`Landing mancante: ${c.slug}/${s.slug}`); continue; }
      for (const k of ['metaTitle', 'metaDescription', 'h1', 'lead', 'intro', 'when', 'steps', 'tech', 'gallery', 'related', 'plus', 'faq']) {
        if (!l[k] || (Array.isArray(l[k]) && !l[k].length)) errors.push(`${c.slug}/${s.slug}: campo "${k}" mancante`);
      }
    }
  }
  return errors;
}
