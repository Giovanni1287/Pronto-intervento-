/**
 * Classificazione deterministica del problema sul catalogo REALE dei servizi
 * (6 categorie, 24 sottocategorie). Usata come strumento dall'assistente e come
 * controllo: la categoria proposta dal modello deve esistere nel catalogo.
 */
import { categories } from '../../data/services.js';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Parole indicative per sottocategoria (oltre a nome e parole chiave del catalogo). */
const HINTS = {
  'idraulica/disostruzione-scarichi-canal-jet': ['scarico intasato', 'scarichi', 'otturat', 'intasat', 'non scarica', 'canal jet', 'tubo intasato', 'colonna'],
  'idraulica/spurgo-fognature': ['fogna', 'fognatur', 'pozzetto', 'fossa', 'biologica', 'autospurgo', 'cattivo odore dallo scarico', 'rigurgit'],
  'idraulica/spurgo-lavandini': ['lavandino', 'lavello', 'lavabo', 'sifone', 'acqua non scende', 'cucina intasat', 'doccia intasat', 'bidet', 'wc intasat', 'water intasat', 'water otturat'],
  'idraulica/videoispezione-tubature': ['videoispezione', 'telecamera', 'ispezione tubi', 'radici'],
  'idraulica/fresatura-colonne-tubazioni': ['fresatura', 'calcare', 'incrostazion', 'colonna di scarico'],
  'elettrica/riparazione-impianti-elettrici': ['presa', 'prese', 'interruttore', 'luce', 'luci', 'lampadario', 'impianto elettrico', 'citofono', 'non funziona la corrente'],
  'elettrica/guasti-corto-circuiti': ['corto circuito', 'cortocircuito', 'salta la corrente', 'salta il salvavita', 'salvavita', 'differenziale', 'blackout', 'senza corrente', 'scintill'],
  'elettrica/quadri-elettrici': ['quadro elettrico', 'quadro', 'magnetotermico', 'contatore'],
  'elettrica/rifacimento-impianti-elettrici': ['rifacimento impianto', 'rifare impianto', 'impianto vecchio', 'adeguamento impianto', 'nuovo impianto elettrico'],
  'ricerca-perdite-occulte/gas-tracciante': ['gas tracciante', 'tracciante'],
  'ricerca-perdite-occulte/geofono': ['geofono'],
  'ricerca-perdite-occulte/termografia': ['termografia', 'termocamera', 'riscaldamento a pavimento', 'pavimento caldo'],
  'ricerca-perdite-occulte/ricerca-perdite-tubazioni-scarico': ['perdita scarico', 'macchia', 'macchie', 'infiltrazione', 'umidita', 'muffa', 'vicino di sotto', 'soffitto bagnato', 'perdita dal soffitto'],
  'ricerca-perdite-occulte/ricerca-perdite-tubazioni-pressione': ['bolletta acqua alta', 'contatore gira', 'pressione cala', 'perdita occulta', 'perdita nascosta', 'caldaia perde pressione', 'perdita impianto'],
  'allagamenti/svuotamenti-post-alluvionali': ['alluvione', 'nubifragio', 'acqua piovana', 'temporale', 'esondazione'],
  'allagamenti/svuotamenti-locali': ['allagat', 'allagamento', 'cantina piena d acqua', 'garage allagato', 'box allagato', 'acqua in cantina', 'svuotare', 'aspirare acqua', 'idrovora'],
  'muratura/piccole-ristrutturazioni': ['ristruttur', 'ristrutturazione'],
  'muratura/riparazioni-murarie': ['crepa', 'crepe', 'intonaco', 'muro rotto', 'buco nel muro', 'piastrell'],
  'muratura/imbiancatura': ['imbianc', 'tinteggi', 'pittura', 'pitturare', 'verniciare pareti'],
  'muratura/cartongesso': ['cartongesso', 'controsoffitto', 'parete divisoria'],
  'muratura/rifacimento-bagni': ['rifare il bagno', 'rifacimento bagno', 'bagno nuovo', 'sostituzione vasca', 'trasformazione vasca'],
  'disinfestazioni/disinfestazioni-insetti': ['scarafagg', 'blatte', 'formiche', 'vespe', 'calabroni', 'zanzare', 'insetti', 'tarme'],
  'disinfestazioni/derattizzazione': ['topi', 'topo', 'ratti', 'ratto', 'roditori', 'derattizz'],
  'disinfestazioni/disinfestazione-pulci-zecche-cimici': ['pulci', 'zecche', 'cimici', 'cimice dei letti', 'punture a letto']
};

/** Termini generici (valgono meno di quelli che indicano l'oggetto: lavandino, quadro, topi…). */
const GENERIC = new Set(['otturat', 'intasat', 'scarichi', 'non scarica', 'luce', 'luci', 'quadro', 'insetti', 'svuotare']);

export const SERVICES = categories.flatMap((c) => c.subcategories.map((s) => ({
  id: `${c.slug}/${s.slug}`, categoryId: c.slug, category: c.name, name: s.name, summary: s.summary,
  url: s.landingReady ? `/servizi/${c.slug}/${s.slug}/` : `/servizi/${c.slug}/`,
  terms: [norm(s.name), ...(s.keywords || []).map((k) => norm(k).replace(/\broma\b/g, '').trim()), ...(HINTS[`${c.slug}/${s.slug}`] || []).map(norm)].filter((t) => t.length > 2)
})));

export const CATEGORIES = categories.map((c) => ({ id: c.slug, name: c.name, tagline: c.tagline, url: `/servizi/${c.slug}/` }));

export const isService = (categoryId, serviceId) =>
  CATEGORIES.some((c) => c.id === categoryId) && (!serviceId || SERVICES.some((s) => s.id === serviceId && s.categoryId === categoryId));

export function classify(text) {
  const t = ` ${norm(text)} `;
  const scored = SERVICES.map((s) => ({ s, score: s.terms.reduce((acc, term) => acc + (t.includes(term) ? (GENERIC.has(term) ? 1 : Math.min(3, term.split(' ').length + 1)) : 0), 0) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);
  if (!scored.length) return { categoryId: null, serviceId: null, confidence: 'none', candidates: [] };
  const top = scored[0];
  const sameCat = scored.filter((x) => x.s.categoryId === top.s.categoryId);
  const tie = scored[1] && scored[1].score === top.score;
  return {
    categoryId: top.s.categoryId,
    serviceId: tie && scored[1].s.categoryId === top.s.categoryId ? null : top.s.id,
    confidence: top.score >= 2 && !tie ? 'high' : 'low',
    candidates: scored.slice(0, 3).map((x) => ({ serviceId: x.s.id, name: x.s.name, category: x.s.category })),
    categoryAlternatives: [...new Set(scored.map((x) => x.s.categoryId))].length > 1 && sameCat.length < scored.length
  };
}
