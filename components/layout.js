import { site, seo, contacts, company, ai, analytics } from '../config/site.config.js';
import { categories, categoryUrl } from '../data/services.js';
import { ctx, isProduction } from './context.js';
import { esc, isSet, phoneHref, whatsappHref } from './utils.js';
import { logo } from './logo.js';
import { icon } from './icons.js';
import { resolveMeta } from '../seo/meta.js';
import { SOCIAL_LABELS } from '../config/company-runtime.js';

export const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Servizi', href: '/servizi/', children: true },
  { label: 'Chi siamo', href: '/#chi-siamo' },
  { label: 'PRONTO+ Family', href: '/piani-assistenza/famiglie/' },
  { label: 'Business e Hotel', href: '/piani-assistenza/business/' },
  { label: 'Contatti', href: '/#contatti' }
];

/* ---------------------------------------------------------------- HEAD */
export function head({ title, description, path, jsonLd = [], ogType = 'website', preload = null, robots: robotsOverride = null, canonical: withCanonical = true }) {
  const meta = resolveMeta({ path, title, description });
  const fullTitle = meta.title;
  const desc = meta.description;
  const canonical = new URL(path, site.siteUrl).href;
  const ogImage = new URL(seo.ogImage, site.siteUrl).href;
  const robots = robotsOverride || (ctx.indexable ? 'index, follow, max-image-preview:large' : 'noindex, nofollow');
  const ld = jsonLd.filter(Boolean)
    .map((o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`)
    .join('\n  ');

  return `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta name="robots" content="${robots}">
  ${withCanonical ? `<link rel="canonical" href="${canonical}">` : ''}
  <meta name="theme-color" content="#081D30">
  <meta property="og:type" content="${ogType}">
  <meta property="og:locale" content="${site.locale}">
  <meta property="og:site_name" content="${esc(site.brandShort)}">
  <meta property="og:title" content="${esc(fullTitle)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="preload" href="/assets/css/main.css" as="style">
  ${preload ? `<link rel="preload" as="image" href="${preload.href}"${preload.type ? ` type="${preload.type}"` : ''} fetchpriority="high">` : ''}
  <link rel="stylesheet" href="/assets/css/main.css">
  ${analytics.conversions ? '<meta name="pir-track" content="1">' : ''}
  ${analytics.ga4Id ? `<meta name="pir-ga4" content="${analytics.ga4Id}" data-consent-version="${analytics.consentVersion}">` : ''}
  <script src="/assets/js/main.js" defer></script>
  ${ld}
</head>`;
}

/* ---------------------------------------------------------------- DEV BANNER */
function devBanner() {
  if (isProduction()) return '';
  const n = ctx.missing.length;
  return `<div class="dev-banner" role="note">
  <div class="container dev-banner__inner">
    <strong>Anteprima di sviluppo</strong> · non indicizzata · ${n} configurazion${n === 1 ? 'e' : 'i'} da completare prima della pubblicazione
    <a href="/stato-progetto/">Vedi elenco</a>
  </div>
</div>`;
}

/* ---------------------------------------------------------------- HEADER */
export function header(currentPath = '/') {
  const sub = categories
    .map(
      (c) =>
        `<li><a href="${categoryUrl(c)}">${icon(c.icon, { size: 20 })}<span><strong>${esc(c.name)}</strong><small>${esc(c.tagline)}</small></span></a></li>`
    )
    .join('');

  const items = navItems
    .map((item) => {
      const current = item.href === currentPath ? ' aria-current="page"' : '';
      if (item.children) {
        return `<li class="nav__item nav__item--has-sub">
          <a class="nav__link" href="${item.href}"${current}>${item.label}</a>
          <button class="nav__sub-toggle" type="button" aria-expanded="false" aria-controls="sub-servizi" aria-label="Mostra le categorie di servizio">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
          </button>
          <ul class="nav__sub" id="sub-servizi">${sub}</ul>
        </li>`;
      }
      return `<li class="nav__item"><a class="nav__link" href="${item.href}"${current}>${item.label}</a></li>`;
    })
    .join('');

  const tel = phoneHref();
  const headerCall = tel
    ? `<a class="btn btn--ghost-light btn--sm header__call" href="${tel}">${icon('phone', { size: 18 })}<span>${esc(contacts.phone)}</span></a>`
    : '';

  return `<a class="skip-link" href="#main">Vai al contenuto</a>
${devBanner()}
<header class="site-header" data-header>
  <div class="container site-header__inner">
    ${logo({ idSuffix: 'header', variant: 'light' })}
    <nav class="nav" id="site-nav" aria-label="Navigazione principale">
      <ul class="nav__list">${items}</ul>
      <div class="nav__mobile-cta">
        <a class="btn btn--primary btn--block" href="/#contatti">Richiedi un intervento</a>
        <a class="btn btn--ghost-light btn--block" href="/area-cliente/">${icon('user', { size: 18 })}<span>Area cliente</span></a>
      </div>
    </nav>
    <div class="site-header__actions">
      ${headerCall}
      <a class="header__account" href="/area-cliente/" aria-label="Area cliente">${icon('user', { size: 20 })}</a>
      <a class="btn btn--primary btn--sm header__cta" href="/#contatti">Richiedi intervento</a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav" aria-label="Apri il menu">
        <span class="nav-toggle__open">${icon('menu', { size: 26 })}</span>
        <span class="nav-toggle__close">${icon('close', { size: 26 })}</span>
      </button>
    </div>
  </div>
</header>`;
}

/* ---------------------------------------------------------------- FOOTER */
export function footer() {
  const a = company.address;
  const addressLine = [a.street, [a.postalCode, a.city, a.province && `(${a.province})`].filter(Boolean).join(' ')]
    .filter(isSet)
    .join(', ');

  const legalRows = [
    ['Ragione sociale', company.legalName],
    ['P.IVA', company.vatNumber],
    ['Codice fiscale', company.taxCode],
    ['REA', company.rea],
    ['PEC', company.pec],
    ['Sede', addressLine]
  ];

  const legal = legalRows
    .map(([k, v]) =>
      isSet(v)
        ? `<li><span>${k}</span> ${esc(v)}</li>`
        : isProduction()
          ? ''
          : `<li class="is-missing"><span>${k}</span> da completare</li>`
    )
    .join('');

  const tel = phoneHref();
  const wa = whatsappHref();
  const contactItems = [
    tel && `<li><a href="${tel}">${icon('phone', { size: 18 })} ${esc(contacts.phone)}</a></li>`,
    wa && `<li><a href="${wa}" target="_blank" rel="noopener">${icon('whatsapp', { size: 18 })} WhatsApp</a></li>`,
    isSet(contacts.email) && `<li><a href="mailto:${esc(contacts.email)}">${icon('mail', { size: 18 })} ${esc(contacts.email)}</a></li>`,
    isSet(contacts.hours) && `<li>${icon('clock', { size: 18 })} ${esc(contacts.hours)}</li>`,
    `<li>${icon('pin', { size: 18 })} ${esc(site.serviceArea.label)}</li>`,
    // Prompt 9: profili social verificati dal titolare (solo indirizzi https)
    ...Object.entries(company.social || {}).map(([k, url]) => `<li><a href="${esc(url)}" target="_blank" rel="noopener me">${esc(SOCIAL_LABELS[k] || k)}</a></li>`)
  ]
    .filter(Boolean)
    .join('');

  const year = new Date().getFullYear();

  return `<footer class="site-footer">
  <div class="container site-footer__grid">
    <div class="site-footer__brand">
      ${logo({ idSuffix: 'footer', variant: 'light' })}
      <p>Assistenza tecnica per case e aziende a ${esc(site.serviceArea.label)}: idraulica, elettrica, ricerca perdite, allagamenti, muratura e disinfestazioni.</p>
      <p class="site-footer__owner">Titolare: ${esc(site.owner)}</p>
    </div>
    <div>
      <h2 class="site-footer__title">Servizi</h2>
      <ul class="site-footer__links">
        ${categories.map((c) => `<li><a href="${categoryUrl(c)}">${esc(c.name)}</a></li>`).join('')}
      </ul>
    </div>
    <div>
      <h2 class="site-footer__title">PRONTO+</h2>
      <ul class="site-footer__links">
        <li><a href="/piani-assistenza/famiglie/">PRONTO+ Family</a></li>
        <li><a href="/lavoro-protetto/">PRONTO+ Lavoro Protetto</a></li>
        <li><a href="/piani-assistenza/business/">PRONTO+ Business e Condomini</a></li>
        <li><a href="/hotel-e-strutture-ricettive/">PRONTO+ Hotel</a></li>
        <li><a href="/corporate/">PRONTO+ Corporate</a></li>
      </ul>
      <h2 class="site-footer__title">Azienda</h2>
      <ul class="site-footer__links">
        <li><a href="/#chi-siamo">Chi siamo</a></li>
        <li><a href="/#contatti">Contatti</a></li>
        <li><a href="/area-cliente/">Area cliente</a></li>
        <li><a href="/area-business/">Area Business</a></li>
        <li><a href="/certificato/">Verifica certificato</a></li>
        <li><a href="/privacy/">Privacy</a></li>
        ${analytics.ga4Id ? `<li><a href="${analytics.cookiePolicyUrl}">Cookie policy</a></li><li><button type="button" class="link-button" data-consent-open>Preferenze cookie</button></li>` : ''}
      </ul>
    </div>
    <div>
      <h2 class="site-footer__title">Contatti</h2>
      <ul class="site-footer__contacts">${contactItems}</ul>
    </div>
  </div>
  <div class="site-footer__legal">
    <div class="container">
      <ul class="site-footer__company">${legal}</ul>
      <p>© ${year} ${esc(site.brandShort)}. Le immagini presenti nel sito hanno scopo illustrativo.</p>
    </div>
  </div>
</footer>`;
}

/* ---------------------------------------------------------------- MOBILE STICKY BAR */
export function mobileBar() {
  const tel = phoneHref();
  const wa = whatsappHref();
  const items = [
    tel && `<a href="${tel}">${icon('phone', { size: 20 })}<span>Chiama</span></a>`,
    wa && `<a href="${wa}" target="_blank" rel="noopener">${icon('whatsapp', { size: 20 })}<span>WhatsApp</span></a>`,
    `<a href="/#contatti" class="is-primary">${icon('arrow', { size: 20 })}<span>Richiedi intervento</span></a>`
  ].filter(Boolean);
  return `<nav class="mobile-bar" aria-label="Azioni rapide">${items.join('')}</nav>`;
}

/* ---------------------------------------------------------------- PRONTO AI (Prompt 6)
 * Solo il pulsante: il widget (JS e CSS) si scarica al primo clic. */
export function aiLauncher(path) {
  if (!ai.widget || ai.excludedPaths.some((p) => String(path || '').startsWith(p))) return '';
  return `<button type="button" class="ai-launcher" data-ai-launcher aria-haspopup="dialog" aria-label="Apri PRONTO AI, assistente virtuale basato su intelligenza artificiale">
  <span class="ai-launcher__icon" aria-hidden="true">AI</span><span class="ai-launcher__text">Assistente <b>PRONTO AI</b></span>
</button>`;
}

/* ---------------------------------------------------------------- CONSENSO (Prompt 7)
 * Presente solo se Google Analytics 4 è configurato. Nessuno script di analisi prima della scelta. */
export function consentBanner() {
  if (!analytics.ga4Id) return '';
  return `<div class="consent" data-consent hidden role="dialog" aria-modal="false" aria-labelledby="consent-title">
  <div class="consent__box">
    <h2 id="consent-title" class="consent__title">Cookie e statistiche</h2>
    <p>Usiamo cookie tecnici necessari al funzionamento del sito. Con il tuo consenso usiamo anche Google Analytics 4 per statistiche aggregate sulle visite: nessun nome, telefono o email viene inviato a Google. Puoi cambiare idea in qualsiasi momento da «Preferenze cookie» in fondo alla pagina. <a href="${analytics.cookiePolicyUrl}">Cookie policy</a> · <a href="/privacy/">Privacy</a></p>
    <div class="consent__custom" data-consent-custom hidden>
      <label class="consent__opt"><input type="checkbox" checked disabled> Tecnici (necessari)</label>
      <label class="consent__opt"><input type="checkbox" data-consent-analytics> Statistiche (Google Analytics 4)</label>
    </div>
    <div class="consent__actions">
      <button type="button" class="btn btn--primary btn--sm" data-consent-reject>Rifiuta</button>
      <button type="button" class="btn btn--ghost btn--sm" data-consent-customize>Personalizza</button>
      <button type="button" class="btn btn--ghost btn--sm" data-consent-save hidden>Salva le scelte</button>
      <button type="button" class="btn btn--primary btn--sm" data-consent-accept>Accetta</button>
    </div>
  </div>
</div>`;
}

/* ---------------------------------------------------------------- PAGE */
export function page({ title, description, path, jsonLd, body, bodyClass = '', preload = null, attrs = '', robots = null, extraHead = '', canonical = true, ogType = 'website' }) {
  return `<!doctype html>
<html lang="${site.lang}">
${head({ title, description, path, jsonLd, preload, robots, canonical, ogType }).replace('</head>', `${extraHead}</head>`)}
<body class="${bodyClass}"${attrs}>
${header(path)}
<main id="main">
${body}
</main>
${footer()}
${mobileBar()}
${aiLauncher(path)}
${/\bpage-app\b/.test(bodyClass) ? "" : consentBanner()}
</body>
</html>
`;
}

/* ---------------------------------------------------------------- BREADCRUMB */
export function breadcrumb(items) {
  const html = items
    .map((it, i) =>
      i === items.length - 1
        ? `<li><span aria-current="page">${esc(it.name)}</span></li>`
        : `<li><a href="${it.path}">${esc(it.name)}</a></li>`
    )
    .join('');
  return `<nav class="breadcrumb" aria-label="Percorso di navigazione"><ol>${html}</ol></nav>`;
}
