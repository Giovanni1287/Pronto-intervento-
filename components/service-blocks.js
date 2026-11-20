/**
 * Blocchi riutilizzabili per pagine categoria e landing di servizio.
 */
import { price, priceVisible, salesOpen } from './pricing.js';
import { isProduction } from './context.js';
import { icon } from './icons.js';
import { esc, picture } from './utils.js';
import { breadcrumb } from './layout.js';
import { callButton, whatsappButton } from './buttons.js';
import { categories, categoryUrl, subcategoryUrl } from '../data/services.js';
import { lines } from '../data/pronto-plus.js';
import { landingContent } from '../data/content/index.js';
import { euro } from '../lib/money.js';

const family = lines.find((l) => l.id === 'family');
export const plusCategory = (id) => family.categories.find((c) => c.id === id);

/** Trova una sottocategoria da "categoria/servizio". */
export function findService(ref) {
  const [catSlug, subSlug] = ref.split('/');
  const cat = categories.find((c) => c.slug === catSlug);
  const sub = cat?.subcategories.find((s) => s.slug === subSlug);
  return cat && sub ? { cat, sub, url: subcategoryUrl(cat.slug, sub) } : null;
}

/* ---------------------------------------------------------------- HERO */
export function serviceHero({ cat, crumbs, eyebrow, title, lead, imageHtml, primaryHref, waMessage }) {
  return `<section class="page-hero page-hero--service" aria-labelledby="page-title">
  <div class="page-hero__media">${imageHtml}</div>
  <div class="page-hero__overlay" aria-hidden="true"></div>
  <div class="container page-hero__inner">
    ${breadcrumb(crumbs)}
    <p class="page-hero__eyebrow"><span class="page-hero__icon page-hero__icon--sm">${icon(cat.icon, { size: 22 })}</span>${esc(eyebrow)}</p>
    <h1 id="page-title" class="page-hero__title">${esc(title)}</h1>
    <p class="page-hero__lead">${esc(lead)}</p>
    <div class="hero__actions">
      <a class="btn btn--primary btn--lg" href="${primaryHref}">Richiedi intervento ${icon('arrow', { size: 20 })}</a>
      <a class="btn btn--outline-light btn--lg" href="#contatti">Contattaci</a>
    </div>
    <div class="hero__quick">
      ${callButton('btn--glass')}
      ${whatsappButton('btn--glass btn--wa', waMessage)}
    </div>
  </div>
</section>`;
}

/* ---------------------------------------------------------------- INDICE DI PAGINA */
export function pageNav(items) {
  return `<nav class="page-nav" aria-label="In questa pagina">
  <div class="container"><ul class="page-nav__list">${items
    .map(([id, label]) => `<li><a href="#${id}">${label}</a></li>`)
    .join('')}</ul></div>
</nav>`;
}

/* ---------------------------------------------------------------- GALLERIA */
export function gallery({ id = 'foto', title = 'Fotografie', items, keyBase, cat }) {
  return `<section class="section section--white" id="${id}" aria-labelledby="${id}-title">
  <div class="container">
    <div class="section-head section-head--split" data-reveal>
      <div><p class="eyebrow">Galleria</p><h2 id="${id}-title" class="section-title">${title}</h2></div>
      <p class="section-lead">Immagini illustrative del tipo di lavorazione: non documentano interventi eseguiti dall’impresa.</p>
    </div>
    <div class="gallery">
      ${items
        .map((g, i) =>
          picture(null, `${keyBase}/gallery-${i + 1}`, {
            key: `${keyBase}/gallery-${i + 1}`,
            alt: g.alt,
            width: 800,
            height: 600,
            sizes: '(min-width: 900px) 33vw, (min-width: 600px) 50vw, 100vw',
            className: 'gallery__item',
            caption: `${g.subject} — immagine illustrativa`,
            spec: { w: 800, h: 600, iconName: ['camera', cat.icon, 'layers'][i % 3], subject: g.subject, accent: cat.accent }
          })
        )
        .join('')}
    </div>
  </div>
</section>`;
}

/* ---------------------------------------------------------------- SERVIZI COLLEGATI */
export function relatedServices(refs, { title = 'Servizi collegati' } = {}) {
  const items = refs.map(findService).filter(Boolean);
  return `<section class="section section--ice" id="correlati" aria-labelledby="correlati-title">
  <div class="container">
    <div class="section-head" data-reveal><p class="eyebrow">Approfondisci</p><h2 id="correlati-title" class="section-title">${title}</h2></div>
    <ul class="related-grid">
      ${items
        .map(({ cat, sub, url }) => {
          const c = landingContent(cat.slug, sub.slug);
          return `<li class="related-card" data-reveal style="--accent:${cat.accent}">
          <a href="${url}">
            <span class="related-card__icon">${icon(cat.icon, { size: 22 })}</span>
            <span class="related-card__cat">${esc(cat.name)}</span>
            <h3>${esc(sub.name)}</h3>
            <p>${esc(c?.lead || sub.summary)}</p>
            <span class="related-card__more">Scopri il servizio ${icon('arrow', { size: 18 })}</span>
          </a>
        </li>`;
        })
        .join('')}
    </ul>
  </div>
</section>`;
}

/* ---------------------------------------------------------------- PRONTO+ */
export function plusBand(ids, { context = '' } = {}) {
  const cats = [...new Set(ids)].map(plusCategory).filter(Boolean);
  if (!cats.length) return '';
  return `<section class="plus-band" id="pronto-plus-servizio" aria-labelledby="plus-band-title">
  <div class="container plus-band__inner" data-reveal>
    <div class="plus-band__text">
      <p class="eyebrow eyebrow--orange">Abbonamento annuale${isProduction() ? '' : ' · listino provvisorio'}</p>
      <h2 id="plus-band-title"><span class="plus-word">PRONTO<span>+</span></span> Family ${cats.length === 1 ? `· ${esc(cats[0].name)}` : ''}</h2>
      <p>${context || 'Un pacchetto di assistenza annuale per la casa.'} ${cats.length === 1 && priceVisible(`family-${cats[0].id}-${cats[0].plans[0].tier}`) && priceVisible(`family-${cats[0].id}-${cats[0].plans[1].tier}`) ? `Essential ${price(cats[0].plans[0].priceCents, `family-${cats[0].id}-${cats[0].plans[0].tier}`)}/anno, Plus ${price(cats[0].plans[1].priceCents, `family-${cats[0].id}-${cats[0].plans[1].tier}`)}/anno, IVA inclusa. ` : ''}${salesOpen('family') ? '' : isProduction() ? 'La sottoscrizione online non è ancora attiva.' : 'Listino provvisorio: la sottoscrizione non è ancora attiva.'}</p>
    </div>
    <ul class="plus-band__links">
      ${cats
        .map((c) => `<li><a href="/piani-assistenza/famiglie/#piano-${c.id}">${icon(c.icon, { size: 20 })}<span>${esc(c.name)}</span>${icon('arrow', { size: 16 })}</a></li>`)
        .join('')}
      <li><a class="plus-band__info" href="/?categoria=pronto-plus-family#contatti">Voglio essere informato</a></li>
    </ul>
  </div>
</section>`;
}

/* ---------------------------------------------------------------- FAQ */
export function faqSection(faq, { title = 'Domande frequenti' } = {}) {
  return `<section class="section section--white" id="faq" aria-labelledby="faq-title">
  <div class="container container--narrow">
    <div class="section-head" data-reveal><p class="eyebrow">FAQ</p><h2 id="faq-title" class="section-title">${title}</h2></div>
    <div class="faq">
      ${faq
        .map(
          (f, i) => `<details class="faq__item"${i === 0 ? ' open' : ''}>
        <summary><h3>${esc(f.q)}</h3><span class="faq__toggle" aria-hidden="true"></span></summary>
        <div class="faq__answer"><p>${esc(f.a)}</p></div>
      </details>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

/* ---------------------------------------------------------------- GUIDA RAPIDA */
export function quickGuide(cat, guide) {
  return `<div class="guide" data-reveal>
    <h2 class="guide__title">Problemi più comuni e soluzioni</h2>
    <ul class="guide__list">
      ${guide
        .map((g) => {
          const s = cat.subcategories.find((x) => x.slug === g.service);
          return `<li><a href="${subcategoryUrl(cat.slug, s)}"><span class="guide__problem">${esc(g.problem)}</span><span class="guide__service">${esc(s.name)} ${icon('arrow', { size: 16 })}</span></a></li>`;
        })
        .join('')}
    </ul>
  </div>`;
}

/* ---------------------------------------------------------------- ALTRE CATEGORIE */
export function otherCategories(current) {
  return `<section class="section section--ice" aria-labelledby="others-title">
  <div class="container">
    <h2 id="others-title" class="section-title section-title--sm">Altre aree di intervento</h2>
    <ul class="other-cats">${categories
      .filter((c) => c.slug !== current)
      .map((c) => `<li style="--accent:${c.accent}"><a href="${categoryUrl(c)}">${icon(c.icon, { size: 20 })}<span>${esc(c.name)}</span></a></li>`)
      .join('')}</ul>
  </div>
</section>`;
}
