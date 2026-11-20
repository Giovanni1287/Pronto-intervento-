import { page, breadcrumb } from '../components/layout.js';
import { ctx } from '../components/context.js';
import { icon } from '../components/icons.js';
import { esc } from '../components/utils.js';
import { breadcrumbSchema } from '../seo/schema.js';
import { categories, categoryUrl } from '../data/services.js';

const simple = ({ path, title, description, crumbs, content, noindex = false }) => ({
  path,
  noindex,
  html: page({
    title,
    description,
    path,
    robots: noindex ? 'noindex, follow' : null,
    jsonLd: crumbs ? [breadcrumbSchema(crumbs)] : [],
    bodyClass: 'page-simple',
    body: `<section class="section section--light simple-page"><div class="container container--narrow">
      ${crumbs ? breadcrumb(crumbs) : ''}
      ${content}
    </div></section>`
  })
});

/** Privacy: NON viene inventata un'informativa legale. Pagina segnaposto onesta. */
export function privacyPage() {
  const crumbs = [
    { name: 'Home', path: '/' },
    { name: 'Privacy', path: '/privacy/' }
  ];
  return simple({
    path: '/privacy/',
    title: 'Informativa privacy',
    description: 'Informativa sul trattamento dei dati personali di Pronto Intervento Roma.',
    crumbs,
    // finché l'informativa è un segnaposto la pagina non va indicizzata (contenuto non definitivo)
    noindex: true,
    content: `<h1 class="section-title">Informativa privacy</h1>
      <div class="form-notice" role="note">${icon('info', { size: 20 })}<p><strong>Informativa in preparazione.</strong> Il testo dell’informativa sul trattamento dei dati personali (Reg. UE 2016/679) e la cookie policy devono essere redatti con i dati del titolare del trattamento prima della pubblicazione del sito e dell’attivazione dei moduli di contatto.</p></div>
      <p>Questo sito, nella versione attuale, non utilizza cookie di profilazione né strumenti di analisi di terze parti e non trasmette i dati inseriti nei moduli.</p>`
  });
}

export function notFoundPage() {
  return {
    path: '/404.html',
    file: '404.html',
    noindex: true,
    html: page({
      title: 'Pagina non trovata',
      description: 'La pagina richiesta non esiste o è stata spostata. Torna alla home di Pronto Intervento Roma.',
      path: '/404.html',
      robots: 'noindex, follow',
      canonical: false,
      bodyClass: 'page-simple',
      body: `<section class="section section--light simple-page"><div class="container container--narrow center">
        <p class="eyebrow">Errore 404</p>
        <h1 class="section-title">Pagina non trovata</h1>
        <p class="section-lead">La pagina che cerchi non esiste o è stata spostata. Puoi ripartire da uno dei servizi o descriverci il problema.</p>
        <ul class="notfound-links">${categories.map((c) => `<li><a href="${categoryUrl(c)}">${icon(c.icon, { size: 18 })} ${esc(c.name)}</a></li>`).join('')}</ul>
        <p><a class="btn btn--primary" href="/">Torna alla home</a> <a class="btn btn--ghost" href="/servizi/">Vedi i servizi</a> <a class="btn btn--ghost" href="/#contatti">Contattaci</a></p>
      </div></section>`
    })
  };
}

/** Pagina interna di stato (solo build non di produzione): elenco dati mancanti. */
export function statusPage() {
  const rows = ctx.missing
    .map((m) => `<tr><td>${esc(m.area)}</td><td><code>${esc(m.key)}</code></td><td>${esc(m.note)}</td></tr>`)
    .join('');
  return {
    path: '/stato-progetto/',
    noindex: true,
    devOnly: true,
    html: page({
      title: 'Stato del progetto',
      description: 'Configurazioni da completare prima della pubblicazione.',
      path: '/stato-progetto/',
      bodyClass: 'page-simple',
      body: `<section class="section section--light simple-page"><div class="container">
        <p class="eyebrow">Solo anteprima di sviluppo</p>
        <h1 class="section-title">Configurazioni da completare</h1>
        <p class="section-lead">Questa pagina non viene generata nella build di produzione. I valori si modificano in <code>src/config/site.config.js</code> e nei file di <code>src/data/</code>.</p>
        <div class="table-wrap"><table class="status-table">
          <thead><tr><th>Area</th><th>Chiave</th><th>Nota</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
        <p class="muted">Build: ${esc(ctx.env)} · ${esc(ctx.buildDate)}</p>
      </div></section>`
    })
  };
}

/** Cookie policy (Prompt 7): generata solo se Google Analytics 4 è configurato. Testo da completare
 *  con un professionista: finché è un segnaposto la pagina non è indicizzabile. */
export function cookiePolicyPage() {
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Cookie policy', path: '/cookie-policy/' }];
  return simple({
    path: '/cookie-policy/', title: 'Cookie policy', description: 'Cookie e strumenti di misurazione utilizzati dal sito di Pronto Intervento Roma e come gestire le preferenze.', crumbs, noindex: true,
    content: `<h1 class="section-title">Cookie policy</h1>
      <div class="form-notice" role="note">${icon('info', { size: 20 })}<p><strong>Testo in preparazione.</strong> La cookie policy definitiva va redatta e verificata da un professionista prima dell’attivazione delle statistiche.</p></div>
      <h2>Cookie tecnici</h2><p>Necessari al funzionamento del sito (ad esempio per ricordare la scelta sui cookie): non richiedono consenso.</p>
      <h2>Statistiche (Google Analytics 4)</h2><p>Attivate solo se accetti. Servono a conoscere in forma aggregata le pagine visitate e le richieste inviate. Non inviamo a Google nomi, telefoni, email o altri dati che ti identificano e non usiamo segnali pubblicitari.</p>
      <h2>Come cambiare le preferenze</h2><p>Usa il pulsante «Preferenze cookie» in fondo a ogni pagina: puoi revocare il consenso in qualsiasi momento.</p>`
  });
}
