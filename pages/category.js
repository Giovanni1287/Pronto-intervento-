/**
 * TEMPLATE PAGINA CATEGORIA — /servizi/<categoria>/
 * Hero tematizzata · introduzione e guida rapida · servizi (link alle landing) ·
 * blocco specifico di categoria · PRONTO+ · FAQ · contatti con categoria preselezionata.
 */
import { page } from '../components/layout.js';
import { requestSection, leakTech } from '../components/sections.js';
import {
  serviceHero, plusBand, faqSection, quickGuide, otherCategories, pageNav, plusCategory
} from '../components/service-blocks.js';
import { categories, categoryUrl, subcategoryUrl } from '../data/services.js';
import { categoryContent, landingContent } from '../data/content/index.js';
import { icon } from '../components/icons.js';
import { esc, picture, imageUrl, leakCtaHref, leakCtaIsExternal } from '../components/utils.js';
import { breadcrumbSchema, serviceSchema, businessSchema, faqSchema } from '../seo/schema.js';
import { categorySeo } from '../data/content/category-seo.js';

/* ---------------------------------------------------------------- blocchi specifici */
function leakSpecial() {
  const external = leakCtaIsExternal();
  return `<section class="section section--dark leak-lab" id="tecnologie" aria-labelledby="lab-title">
  <div class="leak-lab__grid-bg" aria-hidden="true"></div>
  <div class="container leak-lab__layout">
    <div data-reveal>
      <p class="eyebrow eyebrow--orange">Laboratorio diagnostico</p>
      <h2 id="lab-title" class="section-title section-title--light">Cinque metodi, un obiettivo: aprire nel punto giusto</h2>
      <p class="section-lead section-lead--light">Ogni tecnica legge un segnale diverso: il suono dell’acqua in pressione, la risalita di un gas, una differenza di temperatura, il comportamento di uno scarico sotto prova. Combinandole si restringe l’area fino a indicare dove intervenire.</p>
      <div class="leak-lab__cta">
        <a class="btn btn--orange btn--lg" href="${external ? leakCtaHref() : '#servizi-categoria'}"${external ? ' rel="noopener"' : ''} data-specialist-cta>${external ? 'Vai al sito dedicato alla ricerca perdite' : 'Vedi i servizi di ricerca perdite'} ${icon('arrow', { size: 20 })}</a>
        <p class="leak-lab__note">${external ? 'Approfondimenti tecnici sul sito specialistico.' : 'Un sito dedicato alla ricerca perdite occulte è in preparazione.'}</p>
      </div>
    </div>
    <div class="radar" aria-hidden="true" data-reveal>
      <svg viewBox="0 0 320 320" width="320" height="320">
        <defs><linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#19C3E6" stop-opacity="0"/><stop offset="1" stop-color="#19C3E6" stop-opacity=".55"/></linearGradient></defs>
        <g fill="none" stroke="#19C3E6" stroke-opacity=".28"><circle cx="160" cy="160" r="40"/><circle cx="160" cy="160" r="80"/><circle cx="160" cy="160" r="120"/><circle cx="160" cy="160" r="155"/><path d="M5 160h310M160 5v310"/></g>
        <g class="radar__sweep"><path d="M160 160 L315 160 A155 155 0 0 0 270 50 Z" fill="url(#sweep)"/></g>
        <circle class="radar__blip" cx="214" cy="112" r="6" fill="#FF7824"/>
        <circle cx="160" cy="160" r="5" fill="#19C3E6"/>
      </svg>
    </div>
  </div>
  <div class="container">
    <ul class="tech-grid">
      ${leakTech
        .map((t, i) => {
          const subSlug = { 'gas-tracciante': 'gas-tracciante', geofono: 'geofono', termografia: 'termografia', scarico: 'ricerca-perdite-tubazioni-scarico', pressione: 'ricerca-perdite-tubazioni-pressione' }[t.id];
          return `<li class="tech-card tech-card--link" data-reveal style="--d:${i * 70}ms"><a href="/servizi/ricerca-perdite-occulte/${subSlug}/"><span class="tech-card__icon">${icon(t.icon, { size: 28 })}</span><h3 class="tech-card__title">${t.name}</h3><p>${t.text}</p><span class="tech-card__more">Approfondisci ${icon('arrow', { size: 16 })}</span></a></li>`;
        })
        .join('')}
    </ul>
  </div>
</section>`;
}

function comparisonBlock(cmp) {
  return `<section class="section section--white" id="confronto" aria-labelledby="cmp-title">
  <div class="container">
    <div class="section-head" data-reveal><p class="eyebrow">Orientarsi</p><h2 id="cmp-title" class="section-title">${esc(cmp.title)}</h2><p class="section-lead">${esc(cmp.intro)}</p></div>
    <div class="compare">
      ${cmp.columns
        .map((col, i) => `<div class="compare__col${i ? ' compare__col--alt' : ''}" data-reveal><h3>${esc(col.name)}</h3><ul>${col.items.map((it) => `<li>${icon('check', { size: 18 })}<span>${esc(it)}</span></li>`).join('')}</ul></div>`)
        .join('')}
    </div>
    <p class="compare__note">${icon('info', { size: 18 })}<span>${esc(cmp.note)}</span></p>
  </div>
</section>`;
}

function pestsBlock(pests) {
  return `<section class="section section--white" id="infestanti" aria-labelledby="pests-title">
  <div class="container">
    <div class="section-head" data-reveal><p class="eyebrow">Conoscere il problema</p><h2 id="pests-title" class="section-title">Gli infestanti più comuni in città</h2></div>
    <ul class="pests">
      ${pests.map((p, i) => `<li class="pest" data-reveal style="--d:${i * 50}ms"><span class="pest__icon">${icon(p.icon, { size: 22 })}</span><h3>${esc(p.name)}</h3><p>${esc(p.text)}</p></li>`).join('')}
    </ul>
  </div>
</section>`;
}

/* ---------------------------------------------------------------- pagine */
export default function categoryPages() {
  return categories.map((cat) => {
    const content = categoryContent(cat.slug);
    const path = categoryUrl(cat);
    const crumbs = [
      { name: 'Home', path: '/' },
      { name: 'Servizi', path: '/servizi/' },
      { name: cat.name, path }
    ];
    const heroOpts = {
      key: `category/${cat.slug}`,
      alt: cat.image.alt,
      spec: { w: 1600, h: 900, iconName: cat.icon, subject: cat.name, accent: cat.accent, motif: cat.motif, minimal: true }
    };
    const heroImg = picture(cat.image, `hero-${cat.slug}`, { ...heroOpts, width: 1600, height: 900, eager: true, className: 'media--cover' });

    const subs = cat.subcategories
      .map((s, i) => {
        const lc = landingContent(cat.slug, s.slug);
        const href = s.landingReady ? subcategoryUrl(cat.slug, s) : `/?categoria=${encodeURIComponent(`${cat.slug}/${s.slug}`)}#contatti`;
        return `<li class="sub-card" data-reveal style="--d:${i * 60}ms">
          <a class="sub-card__inner" href="${href}">
            ${picture(null, `landing/${cat.slug}/${s.slug}/gallery-1`, {
              key: `landing/${cat.slug}/${s.slug}/gallery-1`,
              alt: lc?.gallery?.[0]?.alt || s.name,
              width: 800, height: 600,
              sizes: '(min-width: 900px) 33vw, (min-width: 600px) 50vw, 100vw',
              className: 'sub-card__media',
              spec: { w: 800, h: 600, iconName: 'camera', subject: lc?.gallery?.[0]?.subject || s.name, accent: cat.accent }
            })}
            <div class="sub-card__body">
              <h3>${esc(s.name)}</h3>
              <p class="sub-card__text">${esc(s.summary)}</p>
              <span class="sub-card__link">${s.landingReady ? 'Scopri il servizio' : 'Richiedi questo servizio'} ${icon('arrow', { size: 18 })}</span>
            </div>
          </a>
        </li>`;
      })
      .join('');

    const plusIds = [...new Set(cat.subcategories.map((s) => landingContent(cat.slug, s.slug)?.plus).filter(Boolean))];
    const special =
      cat.slug === 'ricerca-perdite-occulte' ? leakSpecial()
      : content.comparison ? comparisonBlock(content.comparison)
      : content.pests ? pestsBlock(content.pests)
      : '';

    const extra = categorySeo[cat.slug] || {};
    // tecnologie applicabili: dalle landing della categoria (nessun testo duplicato da riscrivere)
    const techs = [];
    for (const s of cat.subcategories) for (const t of landingContent(cat.slug, s.slug)?.tech || []) if (!techs.some((x) => x.name === t.name)) techs.push({ ...t, sub: s });
    const techBlock = cat.slug === 'ricerca-perdite-occulte' ? '' : `<section class="section section--white" id="tecnologie" aria-labelledby="cat-tech-title">
  <div class="container">
    <div class="section-head" data-reveal><p class="eyebrow">Tecnologie applicabili</p><h2 id="cat-tech-title" class="section-title">Strumenti e tecniche</h2>
      <p class="section-lead">Le tecniche tipicamente impiegate in quest’area. Metodi e attrezzature si scelgono caso per caso dopo la valutazione.</p></div>
    <ul class="cat-tech">${techs.slice(0, 9).map((t) => `<li><h3>${esc(t.name)}</h3><p>${esc(t.text)}</p><a href="${subcategoryUrl(cat.slug, t.sub)}">${esc(t.sub.name)}</a></li>`).join('')}</ul>
  </div>
</section>`;
    const whenBlock = extra.whenToCall ? `<section class="section section--light" id="quando-chiamare" aria-labelledby="when-title">
  <div class="container container--narrow">
    <div class="section-head" data-reveal><p class="eyebrow">Segnali da non trascurare</p><h2 id="when-title" class="section-title">Quando chiamare un tecnico</h2></div>
    <ul class="signal-grid">${extra.whenToCall.map((w) => `<li class="signal">${icon('check', { size: 20 })}<span>${esc(w)}</span></li>`).join('')}</ul>
    ${extra.safety ? `<p class="safety-note" role="note">${icon('info', { size: 18 })} ${esc(extra.safety)}</p>` : ''}
  </div>
</section>` : '';

    const navItems = [['panoramica', 'Panoramica'], ['servizi-categoria', 'Servizi']];
    navItems.push(['tecnologie', 'Tecnologie']);
    if (extra.whenToCall) navItems.push(['quando-chiamare', 'Quando chiamare']);
    if (content.comparison) navItems.push(['confronto', 'Riparazioni o ristrutturazione']);
    if (content.pests) navItems.push(['infestanti', 'Infestanti']);
    navItems.push(['faq', 'FAQ'], ['contatti', 'Contatti']);

    const body = `
${serviceHero({
  cat,
  crumbs,
  eyebrow: cat.tagline,
  title: content.h1,
  lead: content.lead,
  imageHtml: heroImg,
  primaryHref: '#modulo',
  waMessage: `Buongiorno, vorrei informazioni sui servizi di ${cat.name.toLowerCase()}.`
})}
${pageNav(navItems)}

<section class="section section--light" id="panoramica" aria-labelledby="overview-title">
  <div class="container overview">
    <div class="overview__text" data-reveal>
      <p class="eyebrow">${esc(cat.tagline)}</p>
      <h2 id="overview-title" class="section-title">Panoramica</h2>
      ${content.intro.map((p) => `<p class="prose">${esc(p)}</p>`).join('')}
    </div>
    ${quickGuide(cat, content.guide)}
  </div>
</section>

<section class="section section--ice" id="servizi-categoria" aria-labelledby="subs-title">
  <div class="container">
    <div class="section-head" data-reveal>
      <p class="eyebrow">${cat.subcategories.length} servizi</p>
      <h2 id="subs-title" class="section-title">Servizi di ${esc(cat.name.toLowerCase())}</h2>
    </div>
    <ul class="sub-grid">${subs}</ul>
  </div>
</section>
${techBlock}
${whenBlock}
${special}
${plusBand(plusIds, { context: `Le coperture PRONTO+ Family collegate a quest’area sono: ${plusIds.map((id) => esc(plusCategory(id)?.name || id)).join(', ')}.` })}
${faqSection(content.faq)}
${requestSection({
  preset: cat.slug,
  serviceName: cat.name,
  path,
  lead: `Il modulo è impostato sulla categoria «${esc(cat.name)}»: puoi indicare anche il servizio specifico.`
})}
${otherCategories(cat.slug)}`;

    return {
      path,
      category: cat.slug,
      html: page({
        title: content.metaTitle,
        description: content.metaDescription,
        path,
        jsonLd: [businessSchema(), serviceSchema(cat), breadcrumbSchema(crumbs), faqSchema(content.faq)],
        bodyClass: `page-category theme-${cat.slug}`,
        attrs: ` data-cat="${cat.slug}" style="--accent:${cat.accent}"`,
        preload: imageUrl(cat.image, `hero-${cat.slug}`, heroOpts),
        body
      })
    };
  });
}
