/**
 * TEMPLATE LANDING DI SERVIZIO — /servizi/<categoria>/<servizio>/
 * Struttura: hero · servizio · quando · come funziona · tecnologie · foto ·
 * servizi collegati · PRONTO+ · FAQ · contatti (modulo con servizio preselezionato).
 */
import { page } from '../components/layout.js';
import { requestSection } from '../components/sections.js';
import {
  serviceHero, pageNav, gallery, relatedServices, plusBand, faqSection, plusCategory
} from '../components/service-blocks.js';
import { icon } from '../components/icons.js';
import { esc, picture, imageUrl } from '../components/utils.js';
import { categories, categoryUrl, subcategoryUrl } from '../data/services.js';
import { landingContent } from '../data/content/index.js';
import { site } from '../config/site.config.js';
import { breadcrumbSchema, landingServiceSchema, faqSchema, businessSchema } from '../seo/schema.js';

export default function landingPages() {
  const out = [];
  for (const cat of categories) {
    for (const sub of cat.subcategories) {
      if (!sub.landingReady) continue;
      const c = landingContent(cat.slug, sub.slug);
      if (!c) throw new Error(`Contenuti mancanti per ${cat.slug}/${sub.slug}`);
      const path = subcategoryUrl(cat.slug, sub);
      const keyBase = `landing/${cat.slug}/${sub.slug}`;
      const preset = `${cat.slug}/${sub.slug}`;
      const crumbs = [
        { name: 'Home', path: '/' },
        { name: 'Servizi', path: '/servizi/' },
        { name: cat.name, path: categoryUrl(cat) },
        { name: sub.name, path }
      ];
      const heroOpts = {
        key: `${keyBase}/hero`,
        alt: c.gallery[0].alt,
        spec: { w: 1600, h: 900, iconName: cat.icon, subject: sub.name, accent: cat.accent, motif: cat.motif, minimal: true }
      };
      const heroImg = picture(null, `${keyBase}/hero`, { ...heroOpts, width: 1600, height: 900, eager: true, className: 'media--cover' });
      const plus = plusCategory(c.plus);

      const body = `
${serviceHero({
  cat,
  crumbs,
  eyebrow: sub.name,
  title: c.h1,
  lead: c.lead,
  imageHtml: heroImg,
  primaryHref: '#modulo',
  waMessage: `Buongiorno, vorrei informazioni su: ${sub.name}.`
})}
${pageNav([
  ['servizio', 'Il servizio'],
  ['quando', 'Quando richiederlo'],
  ['come-funziona', 'Come funziona'],
  ['tecnologie', 'Tecnologie'],
  ['foto', 'Foto'],
  ['faq', 'FAQ'],
  ['contatti', 'Contatti']
])}

<section class="section section--light" id="servizio" aria-labelledby="servizio-title">
  <div class="container service-intro">
    <div class="service-intro__text" data-reveal>
      <p class="eyebrow">${esc(cat.name)}</p>
      <h2 id="servizio-title" class="section-title">Il servizio</h2>
      ${c.intro.map((p) => `<p class="prose">${esc(p)}</p>`).join('')}
    </div>
    <aside class="service-aside" data-reveal aria-label="In breve">
      <h3 class="service-aside__title">In breve</h3>
      <dl>
        <div><dt>Categoria</dt><dd><a href="${categoryUrl(cat)}">${esc(cat.name)}</a></dd></div>
        <div><dt>Zona</dt><dd>${esc(site.serviceArea.label)}</dd></div>
        <div><dt>Per</dt><dd>Abitazioni, condomini, attività commerciali</dd></div>
        <div><dt>Primo passo</dt><dd>Descrizione del problema e valutazione</dd></div>
      </dl>
      <a class="btn btn--primary btn--block" href="#modulo">Richiedi un sopralluogo</a>
    </aside>
  </div>
</section>

<section class="section section--ice" id="quando" aria-labelledby="quando-title">
  <div class="container">
    <div class="section-head" data-reveal>
      <p class="eyebrow">Segnali da non trascurare</p>
      <h2 id="quando-title" class="section-title">Quando richiedere il servizio</h2>
    </div>
    <ul class="signal-grid">
      ${c.when.map((w, i) => `<li class="signal" data-reveal style="--d:${i * 50}ms">${icon('check', { size: 20 })}<span>${esc(w)}</span></li>`).join('')}
    </ul>
  </div>
</section>

<section class="section section--white process" id="come-funziona" aria-labelledby="come-title">
  <div class="container">
    <div class="section-head" data-reveal>
      <p class="eyebrow">Procedura</p>
      <h2 id="come-title" class="section-title">Come funziona</h2>
    </div>
    <ol class="steps">
      ${c.steps.map((s, i) => `<li class="step" data-reveal style="--d:${i * 80}ms"><span class="step__n">${String(i + 1).padStart(2, '0')}</span><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></li>`).join('')}
    </ol>
  </div>
</section>

<section class="section section--dark tech-section" id="tecnologie" aria-labelledby="tech-title">
  <div class="tech-section__bg" aria-hidden="true"></div>
  <div class="container">
    <div class="section-head" data-reveal>
      <p class="eyebrow eyebrow--orange">Tecnologie e attrezzature</p>
      <h2 id="tech-title" class="section-title section-title--light">Strumenti e tecniche impiegati</h2>
      <p class="section-lead section-lead--light">Le tecnologie tipicamente utilizzate per questo tipo di lavoro. Metodi e attrezzature vengono scelti caso per caso in base alla situazione rilevata.</p>
    </div>
    <ul class="tech-grid tech-grid--${c.tech.length}">
      ${c.tech.map((t, i) => `<li class="tech-card" data-reveal style="--d:${i * 70}ms"><span class="tech-card__icon">${icon(t.icon, { size: 28 })}</span><h3 class="tech-card__title">${esc(t.name)}</h3><p>${esc(t.text)}</p></li>`).join('')}
    </ul>
  </div>
</section>

${gallery({ items: c.gallery, keyBase, cat, title: `${esc(sub.name)}: immagini` })}
${relatedServices(c.related)}
${plusBand([c.plus], { context: `Per questo tipo di servizio è prevista la copertura PRONTO+ Family «${esc(plus.name)}».` })}
${faqSection(c.faq, { title: `Domande frequenti su ${esc(sub.name.toLowerCase())}` })}
${requestSection({
  preset,
  serviceName: sub.name,
  path,
  title: 'Richiedi un sopralluogo o un preventivo',
  lead: `Il modulo è già impostato su «${esc(sub.name)}». Indica la zona e descrivi la situazione: ti ricontatteremo per valutare l’intervento.`
})}`;

      out.push({
        path,
        category: cat.slug,
        html: page({
          title: c.metaTitle,
          description: c.metaDescription,
          path,
          jsonLd: [businessSchema(), landingServiceSchema(cat, sub, c, path), breadcrumbSchema(crumbs), faqSchema(c.faq)],
          bodyClass: `page-landing theme-${cat.slug}`,
          attrs: ` data-cat="${cat.slug}" style="--accent:${cat.accent}"`,
          preload: imageUrl(null, `${keyBase}/hero`, heroOpts),
          body
        })
      });
    }
  }
  return out;
}
