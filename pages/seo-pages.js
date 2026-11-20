/**
 * PRONTO SEO (Prompt 7) — pagine pubbliche aggiunte:
 *  /servizi/          indice dei servizi (prima i breadcrumb puntavano a /#servizi)
 *  /zone-operative/   zone CONFERMATE dal titolare (se nessuna zona è confermata: solo anteprima, noindex)
 *  /zone-operative/<zona>/  solo per zone con contenuto distintivo approvato
 *  /guide/ e /guide/<articolo>/  solo articoli APPROVATI; le bozze compaiono solo in anteprima, noindex
 */
import { page, breadcrumb } from '../components/layout.js';
import { requestSection } from '../components/sections.js';
import { icon } from '../components/icons.js';
import { esc, picture, imageUrl } from '../components/utils.js';
import { categories, categoryUrl, subcategoryUrl } from '../data/services.js';
import { ctx, isProduction } from '../components/context.js';
import { site } from '../config/site.config.js';
import { breadcrumbSchema, businessSchema, articleSchema, itemListSchema } from '../seo/schema.js';
import { zones, activeZones, zoneHasOwnPage } from '../data/seo/zones.js';
import { guides, isPublishable } from '../data/guides/index.js';

const hero = ({ crumbs, eyebrow, title, lead, key, iconName = 'wrench', alt }) => {
  const spec = { w: 1600, h: 900, iconName, subject: title, minimal: true };
  return `<section class="page-hero page-hero--service plus-hero" aria-labelledby="page-title">
  <div class="page-hero__media">${picture(null, key, { key, alt, spec, width: 1600, height: 900, eager: true, className: 'media--cover' })}</div>
  <div class="page-hero__overlay" aria-hidden="true"></div>
  <div class="container page-hero__inner">
    ${breadcrumb(crumbs)}
    <p class="page-hero__eyebrow"><span class="page-hero__icon page-hero__icon--sm">${icon(iconName, { size: 22 })}</span>${esc(eyebrow)}</p>
    <h1 id="page-title" class="page-hero__title">${esc(title)}</h1>
    <p class="page-hero__lead">${esc(lead)}</p>
  </div>
</section>`;
};
const preloadOf = (key, alt, title) => imageUrl(null, key, { key, alt, spec: { w: 1600, h: 900, iconName: 'wrench', subject: title, minimal: true } });

/* ================================================================ /servizi/ */
export function servicesHubPage() {
  const path = '/servizi/';
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Servizi', path }];
  const title = 'Servizi di assistenza tecnica a Roma';
  const lead = 'Sei aree di intervento per abitazioni, condomini e attività: scegli il problema e trova il servizio adatto, oppure descrivilo e ti indichiamo noi la soluzione.';
  const key = 'servizi/hero';
  const alt = 'Attrezzature per l’assistenza tecnica in un’abitazione';
  const cards = categories.map((c) => `<li class="hub-cat" style="--accent:${c.accent}">
      <h2 class="hub-cat__title"><a href="${categoryUrl(c)}"><span class="hub-cat__icon">${icon(c.icon, { size: 24 })}</span>${esc(c.name)}</a></h2>
      <p class="hub-cat__lead">${esc(c.summary)}</p>
      <ul class="hub-cat__subs">${c.subcategories.map((s) => `<li><a href="${s.landingReady ? subcategoryUrl(c.slug, s) : categoryUrl(c)}">${esc(s.name)}</a><span>${esc(s.summary)}</span></li>`).join('')}</ul>
      <a class="hub-cat__more" href="${categoryUrl(c)}">Tutto su ${esc(c.name.toLowerCase())} ${icon('arrow', { size: 16 })}</a>
    </li>`).join('');
  const body = `
${hero({ crumbs, eyebrow: 'Servizi', title, lead, key, alt })}
<section class="section section--light" aria-labelledby="hub-intro-title">
  <div class="container container--narrow">
    <h2 id="hub-intro-title" class="section-title">Come orientarsi</h2>
    <p class="prose">Molti problemi di casa si manifestano in un punto ma nascono altrove: una macchia sul soffitto può dipendere da uno scarico del piano di sopra, un interruttore che scatta da un elettrodomestico guasto, l’umidità di una parete da una tubazione nascosta. Per questo ogni area di intervento parte da una valutazione della causa, prima di proporre la lavorazione.</p>
    <p class="prose">Se non sai quale servizio scegliere, descrivi cosa vedi nel modulo di richiesta: la centrale valuta la situazione e ti ricontatta con la proposta più adatta. Prezzi e tempi si definiscono con un preventivo, dopo aver capito il problema.</p>
  </div>
</section>
<section class="section section--ice" aria-label="Aree di intervento">
  <div class="container"><ul class="hub-grid">${cards}</ul></div>
</section>
<section class="section section--white" aria-labelledby="hub-plus-title">
  <div class="container container--narrow">
    <h2 id="hub-plus-title" class="section-title">Assistenza continuativa</h2>
    <p class="prose">Per chi preferisce un riferimento stabile ci sono i piani <a href="/piani-assistenza/famiglie/">PRONTO+ Family</a> per la casa, <a href="/lavoro-protetto/">PRONTO+ Lavoro Protetto</a> dopo un intervento e i contratti per <a href="/piani-assistenza/business/">aziende e condomini</a>, <a href="/hotel-e-strutture-ricettive/">hotel</a> e <a href="/corporate/">realtà multisede</a>.</p>
  </div>
</section>
${requestSection({ path, title: 'Descrivi il problema', lead: 'Indica la zona e cosa sta succedendo: ti ricontatteremo per valutare l’intervento.' })}`;
  return {
    path, kind: 'hub',
    html: page({
      title, description: 'Idraulica e spurghi, impianti elettrici, ricerca perdite occulte, allagamenti, muratura e disinfestazioni a Roma e provincia: tutti i servizi in un’unica pagina.',
      path, jsonLd: [businessSchema(), breadcrumbSchema(crumbs), itemListSchema(categories.map((c) => ({ name: c.name, path: categoryUrl(c) })))],
      bodyClass: 'page-hub', preload: preloadOf(key, alt, title), body
    })
  };
}

/* ================================================================ /zone-operative/ */
export function zonePages() {
  const active = activeZones();
  const path = '/zone-operative/';
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Zone operative', path }];
  const title = 'Zone operative a Roma e provincia';
  const key = 'zone-operative/hero';
  const alt = 'Mappa stilizzata di Roma e provincia';
  const confirmed = active.length > 0;
  // Senza zone confermate la pagina esiste solo in anteprima e non è indicizzabile
  if (!confirmed && isProduction()) return [];
  const list = confirmed
    ? `<ul class="zone-grid">${active.map((z) => `<li class="zone-card"><h3>${zoneHasOwnPage(z) ? `<a href="/zone-operative/${z.slug}/">${esc(z.name)}</a>` : esc(z.name)}</h3><p>${esc(z.description || z.area)}</p>${z.note ? `<p class="muted">${esc(z.note)}</p>` : ''}</li>`).join('')}</ul>`
    : `<div class="form-notice" role="note">${icon('info', { size: 20 })}<p><strong>Anteprima.</strong> Nessuna zona è ancora confermata dal titolare: le località proposte (${zones.map((z) => esc(z.name)).join(', ')}) si attivano dalla dashboard PRONTO SEO. Finché l’elenco è vuoto questa pagina non viene pubblicata.</p></div>`;
  const body = `
${hero({ crumbs, eyebrow: 'Dove interveniamo', title, lead: `Area di servizio dichiarata: ${site.serviceArea.label}. Qui trovi le zone confermate e come vengono organizzati gli interventi.`, key, alt, iconName: 'pin' })}
<section class="section section--light" aria-labelledby="zone-title">
  <div class="container">
    <div class="section-head"><h2 id="zone-title" class="section-title">Zone servite</h2>
      <p class="section-lead">La disponibilità per una singola prestazione dipende dal tipo di lavoro e dal calendario: la centrale la conferma al momento della richiesta.</p></div>
    ${list}
  </div>
</section>
${requestSection({ path, title: 'Verifica la tua zona', lead: 'Indica comune o quartiere e il problema: ti confermiamo se e quando possiamo intervenire.' })}`;
  const pages = [{
    path, kind: 'zones', noindex: !confirmed, devOnly: !confirmed,
    html: page({ title, description: `Le zone di Roma e provincia in cui Pronto Intervento Roma svolge interventi di idraulica, elettrica, ricerca perdite, allagamenti, muratura e disinfestazioni.`,
      path, robots: confirmed ? null : 'noindex, nofollow', jsonLd: [breadcrumbSchema(crumbs)], bodyClass: 'page-zones', preload: preloadOf(key, alt, title), body })
  }];
  // pagine territoriali SOLO con contenuto distintivo approvato
  for (const z of active.filter(zoneHasOwnPage)) {
    const zp = `/zone-operative/${z.slug}/`;
    const zc = [...crumbs, { name: z.name, path: zp }];
    pages.push({
      path: zp, kind: 'zone',
      html: page({ title: `Assistenza tecnica a ${z.name}`, description: z.metaDescription, path: zp, jsonLd: [breadcrumbSchema(zc)], bodyClass: 'page-zones',
        body: `${hero({ crumbs: zc, eyebrow: 'Zona operativa', title: `Assistenza tecnica a ${z.name}`, lead: z.description, key: `zone/${z.slug}`, alt: `Zona di ${z.name}`, iconName: 'pin' })}
<section class="section section--light"><div class="container container--narrow">${z.content.map((p) => `<p class="prose">${esc(p)}</p>`).join('')}</div></section>
${requestSection({ path: zp, title: `Richiedi un intervento a ${z.name}` })}` })
    });
  }
  return pages;
}

/* ================================================================ /guide/ */
export function guidePages() {
  const visible = guides.filter((g) => isPublishable(g) || !isProduction());
  const published = guides.filter(isPublishable);
  if (!visible.length) return [];
  const path = '/guide/';
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Guide', path }];
  const title = 'Guide pratiche per la casa e l’azienda';
  const key = 'guide/hero';
  const alt = 'Tecnico che spiega un intervento a un cliente';
  const indexNoindex = published.length === 0;
  const draftBadge = (g) => (isPublishable(g) ? '' : '<span class="guide-badge">Bozza non pubblicata · solo anteprima</span>');
  const out = [{
    path, kind: 'guides', noindex: indexNoindex, devOnly: indexNoindex,
    html: page({ title, description: 'Guide di Pronto Intervento Roma su scarichi, perdite d’acqua, impianti elettrici e manutenzione: cosa controllare e quando chiamare un tecnico.',
      path, robots: indexNoindex ? 'noindex, nofollow' : null, jsonLd: [breadcrumbSchema(crumbs)], bodyClass: 'page-guides', preload: preloadOf(key, alt, title),
      body: `${hero({ crumbs, eyebrow: 'Guide', title, lead: 'Risposte concrete ai dubbi più frequenti, scritte e revisionate dai tecnici. I prezzi indicati negli articoli sono indicativi: il costo effettivo si definisce con un preventivo.', key, alt, iconName: 'info' })}
<section class="section section--light"><div class="container"><ul class="guide-grid">${visible.map((g) => `<li class="guide-card">${draftBadge(g)}<h2><a href="/guide/${g.slug}/">${esc(g.title)}</a></h2><p>${esc(g.summary)}</p></li>`).join('')}</ul></div></section>` })
  }];
  for (const g of visible) {
    const gp = `/guide/${g.slug}/`;
    const gc = [...crumbs, { name: g.title, path: gp }];
    const pub = isPublishable(g);
    const reviewer = g.review?.reviewer;
    out.push({
      path: gp, kind: 'guide', noindex: !pub, devOnly: !pub,
      html: page({ title: g.metaTitle || g.title, description: g.metaDescription, path: gp, robots: pub ? null : 'noindex, nofollow', ogType: 'article',
        jsonLd: pub ? [breadcrumbSchema(gc), articleSchema(g, gp)] : [breadcrumbSchema(gc)], bodyClass: 'page-guide',
        body: `<article class="section section--light guide"><div class="container container--narrow">
  ${breadcrumb(gc)}
  ${pub ? '' : `<div class="form-notice" role="note">${icon('info', { size: 20 })}<p><strong>Bozza in revisione — non pubblicata.</strong> ${esc(g.review?.notes || 'Testo da verificare e approvare prima della pubblicazione.')}</p></div>`}
  <p class="eyebrow">Guida</p>
  <h1 class="section-title">${esc(g.title)}</h1>
  <p class="guide__meta">${pub ? `Revisione tecnica: ${esc(reviewer)} · aggiornata il ${esc(g.review.date)}` : `Autore della bozza: ${esc(g.author)} · stato: ${esc(g.status)}`}</p>
  <p class="section-lead">${esc(g.summary)}</p>
  ${g.sections.map((s) => `<h2>${esc(s.h)}</h2>${s.p.map((x) => `<p class="prose">${esc(x)}</p>`).join('')}${s.list ? `<ul class="prose-list">${s.list.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}`).join('')}
  ${g.priceNote ? `<div class="form-notice" role="note">${icon('info', { size: 20 })}<p>${esc(g.priceNote)}</p></div>` : ''}
  <h2>Servizi collegati</h2>
  <ul class="prose-list">${g.related.map((r) => { const [c, s] = r.split('/'); const cat = categories.find((x) => x.slug === c); const sub = cat?.subcategories.find((x) => x.slug === s); return sub ? `<li><a href="${subcategoryUrl(c, sub)}">${esc(sub.name)}</a></li>` : cat ? `<li><a href="${categoryUrl(cat)}">${esc(cat.name)}</a></li>` : ''; }).join('')}</ul>
  <p><a class="btn btn--primary" href="/#contatti">Richiedi un preventivo</a></p>
</div></article>` })
    });
  }
  return out;
}

export { ctx };
