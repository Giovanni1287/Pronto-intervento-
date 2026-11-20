import { site, contacts, company, images, forms } from '../config/site.config.js';
import { price, priceVisible } from './pricing.js';
import { categories, allSubcategories, categoryUrl, subcategoryUrl } from '../data/services.js';
import { lines } from '../data/pronto-plus.js';
import { euro } from '../lib/money.js';
import { icon } from './icons.js';
import { esc, isSet, picture, leakCtaHref, formsEnabled, phoneHref, whatsappHref, REQUEST_ENDPOINT } from './utils.js';
import { callButton, whatsappButton } from './buttons.js';
import { isProduction } from './context.js';

const missingNote = (text) =>
  isProduction() ? '' : `<p class="missing-note">${icon('info', { size: 18 })}<span>${text}</span></p>`;

/* ================================================================ HERO */
export function hero() {
  return `<section class="hero" aria-labelledby="hero-title">
  <div class="hero__media">${picture(images.hero, 'hero', { key: 'home/hero', width: 1920, height: 1080, eager: true, className: 'media--cover' })}</div>
  <div class="hero__overlay" aria-hidden="true"></div>
  <div class="container hero__inner">
    <div class="hero__content" data-reveal>
      <p class="eyebrow eyebrow--light"><span class="dot" aria-hidden="true"></span>${esc(site.serviceArea.label)} · Case, condomini e aziende</p>
      <h1 id="hero-title" class="hero__title">Pronto Intervento Roma <span class="hero__dash">—</span> <span class="hero__accent">Assistenza tecnica per case e aziende</span></h1>
      <p class="hero__lead">Soluzioni professionali per problemi idraulici, elettrici, scarichi, perdite d’acqua, allagamenti, muratura e disinfestazioni.</p>
      <div class="hero__actions">
        <a class="btn btn--primary btn--lg" href="/#contatti">Richiedi un intervento ${icon('arrow', { size: 20 })}</a>
        <a class="btn btn--outline-light btn--lg" href="/#servizi">Scopri i servizi</a>
      </div>
      <div class="hero__quick">
        ${callButton('btn--glass')}
        ${whatsappButton('btn--glass btn--wa')}
      </div>
    </div>
    <aside class="hero__panel" aria-label="Aree di intervento" data-reveal>
      <p class="hero__panel-title">Aree di intervento</p>
      <ul>
        ${categories
          .map(
            (c) =>
              `<li><a href="${categoryUrl(c)}"><span class="hero__panel-icon">${icon(c.icon, { size: 20 })}</span><span>${esc(c.name)}</span>${icon('arrow', { size: 16, className: 'hero__panel-arrow' })}</a></li>`
          )
          .join('')}
      </ul>
    </aside>
  </div>
</section>`;
}

/* ================================================================ KEY FACTS */
export function facts() {
  const items = [
    ['6', 'aree tecniche', 'layers'],
    [String(allSubcategories.length), 'servizi specialistici', 'wrench'],
    ['Roma', 'e provincia', 'pin'],
    ['Case', 'condomini e aziende', 'building']
  ];
  return `<section class="facts" aria-label="Il servizio in breve">
  <div class="container facts__grid">
    ${items
      .map(
        ([n, l, i]) =>
          `<div class="facts__item" data-reveal><span class="facts__icon">${icon(i, { size: 22 })}</span><p><strong>${n}</strong> <span>${l}</span></p></div>`
      )
      .join('')}
  </div>
</section>`;
}

/* ================================================================ CATEGORIE */
export function serviceCards() {
  return `<section class="section section--light" id="servizi" aria-labelledby="servizi-title">
  <div class="container">
    <div class="section-head" data-reveal>
      <p class="eyebrow">I nostri servizi</p>
      <h2 id="servizi-title" class="section-title">Sei aree tecniche, un unico riferimento</h2>
      <p class="section-lead">Dalla perdita nascosta allo scarico intasato, dal guasto elettrico al ripristino finale: interventi coordinati per abitazioni, condomini, attività commerciali e strutture ricettive.</p>
    </div>
    <div class="cards-grid">
      ${categories
        .map(
          (c, i) => `<article class="service-card" data-reveal style="--d:${i * 60}ms">
        <a class="service-card__link" href="${categoryUrl(c)}" aria-label="${esc(c.name)}: scopri i servizi">
          ${picture(c.image, `cat-${c.slug}`, { key: `category/${c.slug}`, sizes: '(min-width: 900px) 33vw, (min-width: 600px) 50vw, 100vw', width: 800, height: 560, className: 'service-card__media' })}
          <div class="service-card__body">
            <span class="service-card__icon">${icon(c.icon, { size: 26 })}</span>
            <p class="service-card__kicker">${esc(c.tagline)}</p>
            <h3 class="service-card__title">${esc(c.name)}</h3>
            <p class="service-card__text">${esc(c.summary)}</p>
            <span class="service-card__more">${c.subcategories.length} servizi · Scopri ${icon('arrow', { size: 18 })}</span>
          </div>
        </a>
      </article>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

/* ================================================================ CATALOGO 24 */
export function catalog() {
  return `<section class="section section--ice" id="catalogo" aria-labelledby="catalogo-title">
  <div class="container">
    <div class="section-head section-head--split" data-reveal>
      <div>
        <p class="eyebrow">Catalogo completo</p>
        <h2 id="catalogo-title" class="section-title">Tutti i servizi</h2>
      </div>
      <p class="section-lead">${allSubcategories.length} prestazioni specialistiche suddivise per area. Seleziona una categoria per i dettagli o richiedi direttamente un intervento.</p>
    </div>
    <div class="catalog">
      ${categories
        .map(
          (c) => `<div class="catalog__col" data-reveal>
        <h3 class="catalog__title"><a href="${categoryUrl(c)}">${icon(c.icon, { size: 22 })}<span>${esc(c.name)}</span></a></h3>
        <ul class="catalog__list">
          ${c.subcategories.map((s) => `<li>${icon('check', { size: 16 })}<a href="${s.landingReady ? subcategoryUrl(c.slug, s) : categoryUrl(c)}">${esc(s.name)}</a></li>`).join('')}
        </ul>
      </div>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

/* ================================================================ RICERCA PERDITE */
export const leakTech = [
  { id: 'gas-tracciante', name: 'Gas tracciante', icon: 'gas', text: 'Una miscela di gas inerte viene immessa nella tubazione: dove fuoriesce, uno strumento sensibile ne rileva la presenza in superficie.' },
  { id: 'geofono', name: 'Geofono', icon: 'ear', text: 'Microfoni ad alta sensibilità captano il rumore dell’acqua che sfugge dalla condotta in pressione, anche sotto il pavimento.' },
  { id: 'termografia', name: 'Termografia', icon: 'thermo', text: 'La termocamera mostra le variazioni di temperatura delle superfici, utili a seguire tubazioni calde e zone umide.' },
  { id: 'scarico', name: 'Tubazioni di scarico', icon: 'camera', text: 'Prove dedicate e videoispezione per individuare rotture, giunti scollegati e infiltrazioni nelle condotte di scarico.' },
  { id: 'pressione', name: 'Tubazioni in pressione', icon: 'gauge', text: 'Prove di tenuta su impianti idrici e di riscaldamento per verificare la presenza di una perdita e circoscriverla.' }
];

export function leakSection() {
  return `<section class="section section--dark leak" id="ricerca-perdite" aria-labelledby="perdite-title">
  <div class="leak__bg" aria-hidden="true"></div>
  <div class="container leak__grid">
    <div class="leak__intro" data-reveal>
      <p class="eyebrow eyebrow--orange">Diagnosi strumentale</p>
      <h2 id="perdite-title" class="section-title section-title--light">Ricerca Perdite Occulte a Roma</h2>
      <p class="section-lead section-lead--light">Una perdita nascosta può far crescere le bollette, rovinare pavimenti e pareti, coinvolgere i vicini. Con la ricerca strumentale si cerca di localizzare il punto di perdita prima di aprire, limitando le demolizioni all’area necessaria.</p>
      <ul class="leak__signals">
        <li>${icon('check', { size: 18 })} Consumi d’acqua anomali o contatore che gira a rubinetti chiusi</li>
        <li>${icon('check', { size: 18 })} Macchie di umidità, muffa o rigonfiamenti su muri e pavimenti</li>
        <li>${icon('check', { size: 18 })} Calo di pressione nell’impianto di riscaldamento</li>
        <li>${icon('check', { size: 18 })} Infiltrazioni segnalate dall’appartamento sottostante</li>
      </ul>
      <div class="leak__actions">
        <a class="btn btn--orange btn--lg" href="${leakCtaHref()}">Approfondisci la ricerca perdite ${icon('arrow', { size: 20 })}</a>
        <a class="btn btn--outline-light btn--lg" href="/?categoria=ricerca-perdite-occulte#contatti">Richiedi una verifica</a>
      </div>
    </div>
    <div class="leak__visual" data-reveal>
      ${picture(images.leakDetection, 'leak', { key: 'home/leak', sizes: '(min-width: 900px) 40vw, 100vw', width: 900, height: 1100, className: 'leak__media' })}
    </div>
  </div>
  <div class="container">
    <ul class="tech-grid" aria-label="Tecnologie utilizzate nel settore">
      ${leakTech
        .map(
          (t, i) => `<li class="tech-card" data-reveal style="--d:${i * 70}ms">
        <span class="tech-card__icon">${icon(t.icon, { size: 28 })}</span>
        <h3 class="tech-card__title">${t.name}</h3>
        <p>${t.text}</p>
      </li>`
        )
        .join('')}
    </ul>
  </div>
</section>`;
}

/* ================================================================ COME FUNZIONA */
export function process() {
  const steps = [
    ['Descrivi il problema', 'Compila il modulo o contattaci indicando la zona e cosa sta succedendo.'],
    ['Valutazione', 'Analizziamo la richiesta e, se serve, ti chiediamo foto o dettagli aggiuntivi.'],
    ['Intervento concordato', 'Fissiamo tempi e modalità dell’intervento in base al tipo di problema.'],
    ['Ripristino', 'Dove necessario, completiamo il lavoro con le finiture murarie.']
  ];
  return `<section class="section section--white process" aria-labelledby="process-title">
  <div class="container">
    <div class="section-head" data-reveal>
      <p class="eyebrow">Come funziona</p>
      <h2 id="process-title" class="section-title">Dalla richiesta al ripristino</h2>
    </div>
    <ol class="steps">
      ${steps
        .map(
          ([t, d], i) =>
            `<li class="step" data-reveal style="--d:${i * 80}ms"><span class="step__n">${String(i + 1).padStart(2, '0')}</span><h3>${t}</h3><p>${d}</p></li>`
        )
        .join('')}
    </ol>
  </div>
</section>`;
}

/* ================================================================ PRONTO+ */
export function prontoPlus() {
  const family = lines.find((l) => l.id === 'family');
  const others = lines.filter((l) => l.id !== 'family');

  const familyTiles = family.categories
    .map(
      (c) => `<li class="plan-tile" id="plus-${c.id}" data-plan-category="${c.id}">
      <div class="plan-tile__head"><span class="plan-tile__icon">${icon(c.icon, { size: 22 })}</span><h4><a href="/piani-assistenza/famiglie/#piano-${c.id}">${esc(c.name)}</a></h4></div>
      <dl class="plan-tile__tiers">
        ${c.plans
          .map(
            (p) =>
              `<div data-tier="${p.tier}"><dt>${p.name}</dt><dd data-price>${priceVisible(`family-${c.id}-${p.tier}`) && p.priceCents != null ? `${price(p.priceCents, `family-${c.id}-${p.tier}`)}/anno` : 'Prezzo in definizione'}</dd></div>`
          )
          .join('')}
      </dl>
    </li>`
    )
    .join('');

  return `<section class="section section--plus" id="pronto-plus" aria-labelledby="plus-title">
  <div class="container">
    <div class="section-head" data-reveal>
      <p class="eyebrow eyebrow--orange">Abbonamenti annuali</p>
      <h2 id="plus-title" class="section-title section-title--light"><span class="plus-word">PRONTO<span>+</span></span> l’assistenza tecnica in abbonamento</h2>
      <p class="section-lead section-lead--light">Tre linee pensate per esigenze diverse: la casa, l’attività commerciale, le strutture ricettive e le aziende. Gli abbonamenti sono in fase di definizione: puoi già chiedere di essere ricontattato quando saranno disponibili.</p>
    </div>

    <div class="plus-lines">
      ${lines
        .map(
          (l, i) => `<article class="plus-line${l.id === 'family' ? ' plus-line--featured' : ''}" data-reveal style="--d:${i * 80}ms">
        <span class="badge">In arrivo</span>
        <span class="plus-line__icon">${icon(l.id === 'family' ? 'home' : l.id === 'business' ? 'building' : 'layers', { size: 28 })}</span>
        <h3>${esc(l.name)}</h3>
        <p class="plus-line__aud">${esc(l.audience)}</p>
        <p>${esc(l.description)}</p>
        <a class="plus-line__link" href="#${l.anchor}">Dettagli ${icon('arrow', { size: 18 })}</a>
      </article>`
        )
        .join('')}
    </div>

    <div class="plus-family" id="${family.anchor}" data-reveal>
      <div class="plus-family__head">
        <div>
          <h3>${esc(family.name)}</h3>
          <p>Otto aree di copertura, ciascuna con due livelli di servizio: <strong>Essential</strong> e <strong>Plus</strong>.</p>
        </div>
        <a class="btn btn--orange" href="/piani-assistenza/famiglie/">Scopri PRONTO+ Family</a>
      </div>
      <ul class="plan-grid">${familyTiles}</ul>
      <p class="plus-note">${icon('info', { size: 18 })} Listino provvisorio, prezzi IVA inclusa, in attesa di conferma da parte del titolare. La sottoscrizione non è ancora attiva.</p>
    </div>

    <div class="plus-other plus-other--protected" id="pronto-plus-lavoro-protetto" data-reveal>
      <div>
        <h3>PRONTO+ Lavoro Protetto</h3>
        <p>Servizio facoltativo dopo un intervento: follow-up, controlli preventivi e sconti sui lavori futuri. Non sostituisce le garanzie di legge.</p>
      </div>
      <a class="btn btn--outline-light" href="/lavoro-protetto/">Scopri Lavoro Protetto</a>
    </div>

    <div class="plus-others">
      ${others
        .map(
          (l) => `<div class="plus-other" id="${l.anchor}" data-reveal>
        <div>
          <h3>${esc(l.name)}</h3>
          <p>${esc(l.description)}</p>
        </div>
        <a class="btn btn--outline-light" href="${l.href || `/?categoria=${l.anchor}#contatti`}">${l.href ? 'Scopri ' + esc(l.name) : 'Richiedi informazioni'}</a>
      </div>`
        )
        .join('')}
    </div>
  </div>
</section>`;
}

/* ================================================================ CHI SIAMO */
/** Abilitazioni, copertura assicurativa e disponibilità: SOLO se verificate dal titolare (Prompt 9). */
function verifiedCompanyBlocks() {
  const blocks = [];
  if (company.certificationsVerified && company.certifications?.length) blocks.push(`<div class="about__block"><h3>${icon('check', { size: 20 })} Abilitazioni</h3><ul>${company.certifications.map((c) => `<li>${esc(c)}</li>`).join('')}</ul></div>`);
  if (isSet(company.insurance)) blocks.push(`<div class="about__block"><h3>${icon('shield', { size: 20 })} Copertura assicurativa</h3><p>${esc(company.insurance)}</p></div>`);
  if (isSet(company.availability)) blocks.push(`<div class="about__block"><h3>${icon('clock', { size: 20 })} Disponibilità</h3><p>${esc(company.availability)}</p></div>`);
  if (company.operatingOffice && Object.values(company.operatingOffice).some(Boolean)) {
    const o = company.operatingOffice;
    blocks.push(`<div class="about__block"><h3>${icon('pin', { size: 20 })} Sede operativa</h3><p>${esc([o.street, [o.postalCode, o.city].filter(Boolean).join(' '), o.province].filter(Boolean).join(', '))}</p></div>`);
  }
  return blocks.length ? `<div class="about__blocks">${blocks.join('')}</div>` : '';
}

export function about() {
  const ownerImg = company.ownerPhoto
    ? { src: company.ownerPhoto, alt: `${site.owner}, titolare di ${site.brandShort}` }
    : { src: null, alt: `Foto del titolare ${site.owner}` };

  const story = isSet(company.story)
    ? `<p>${esc(company.story)}</p>`
    : missingNote('Storia aziendale da inserire: anno di avvio, esperienza, specializzazioni e certificazioni fornite dal titolare.');

  const zones = site.serviceArea.zones.length
    ? `<ul class="zones">${site.serviceArea.zones.map((z) => `<li>${esc(z)}</li>`).join('')}</ul>`
    : missingNote('Elenco delle zone operative (quartieri e comuni serviti) da completare.');

  return `<section class="section section--light about" id="chi-siamo" aria-labelledby="about-title">
  <div class="container about__grid">
    <div class="about__photo" data-reveal>
      ${picture(ownerImg, 'owner', { key: 'about/owner', sizes: '(min-width: 900px) 40vw, 100vw', width: 800, height: 960, className: 'about__media' })}
      <div class="about__card">
        <p class="about__name">${esc(site.owner)}</p>
        <p class="about__role">Titolare</p>
      </div>
    </div>
    <div class="about__content" data-reveal>
      <p class="eyebrow">Chi siamo</p>
      <h2 id="about-title" class="section-title">L’impresa di ${esc(site.owner)}</h2>
      <p class="section-lead">${esc(site.brand)} è il riferimento per l’assistenza tecnica di abitazioni, condomini e aziende a ${esc(site.serviceArea.label)}: un unico interlocutore per idraulica, impianti elettrici, ricerca perdite, allagamenti, opere murarie e disinfestazioni.</p>
      ${story}
      <div class="about__blocks">
        <div class="about__block">
          <h3>${icon('wrench', { size: 20 })} Servizi</h3>
          <p>${categories.map((c) => esc(c.name)).join(' · ')}</p>
        </div>
        <div class="about__block">
          <h3>${icon('pin', { size: 20 })} Zone operative</h3>
          <p>${esc(site.serviceArea.label)}. ${esc(site.serviceArea.note)}</p>
          ${zones}
        </div>
      </div>
      ${verifiedCompanyBlocks()}
      <a class="btn btn--primary" href="/#contatti">Contatta l’impresa ${icon('arrow', { size: 20 })}</a>
    </div>
  </div>
</section>`;
}

/* ================================================================ CONTATTI */
function categoryOptions(preset = '') {
  const sel = (v) => (v === preset ? ' selected' : '');
  const opts = categories.map(
    (c) =>
      `<optgroup label="${esc(c.name)}"><option value="${c.slug}"${sel(c.slug)}>${esc(c.name)} — generico</option>${c.subcategories
        .map((s) => `<option value="${c.slug}/${s.slug}"${sel(`${c.slug}/${s.slug}`)}>${esc(s.name)}</option>`)
        .join('')}</optgroup>`
  );
  opts.push(
    `<optgroup label="PRONTO+"><option value="pronto-plus-family">PRONTO+ Family</option><option value="pronto-plus-business">PRONTO+ Business</option><option value="pronto-plus-hotel">PRONTO+ Hotel &amp; Corporate</option></optgroup>`,
    `<option value="altro">Altro / non so</option>`
  );
  return opts.join('');
}

function formFields(id, extra = '', preset = '') {
  return `<div class="form-grid">
    <div class="field field--full">
      <label for="${id}-categoria">Categoria <span aria-hidden="true">*</span></label>
      <select id="${id}-categoria" name="categoria" required data-category-select>
        <option value=""${preset ? '' : ' selected'}>Seleziona il tipo di intervento</option>
        ${categoryOptions(preset)}
      </select>
    </div>
    <div class="field">
      <label for="${id}-nome">Nome e cognome <span aria-hidden="true">*</span></label>
      <input id="${id}-nome" name="nome" type="text" autocomplete="name" required>
    </div>
    <div class="field">
      <label for="${id}-telefono">Telefono <span aria-hidden="true">*</span></label>
      <input id="${id}-telefono" name="telefono" type="tel" autocomplete="tel" inputmode="tel" required pattern="[0-9 +\\(\\)\\-]{6,20}">
    </div>
    <div class="field">
      <label for="${id}-email">Email</label>
      <input id="${id}-email" name="email" type="email" autocomplete="email">
    </div>
    <div class="field">
      <label for="${id}-zona">Zona dell’intervento <span aria-hidden="true">*</span></label>
      <input id="${id}-zona" name="zona" type="text" placeholder="Quartiere o comune" required>
    </div>
    ${extra}
    <div class="field field--full">
      <label for="${id}-descrizione">Descrizione del problema <span aria-hidden="true">*</span></label>
      <textarea id="${id}-descrizione" name="descrizione" rows="5" required minlength="10" placeholder="Cosa sta succedendo? Da quando? Ci sono già danni visibili?"></textarea>
    </div>
    <div class="field field--full field--check">
      <input id="${id}-privacy" name="privacy" type="checkbox" required>
      <label for="${id}-privacy">Ho letto l’<a href="${forms.privacyPolicyUrl}">informativa privacy</a> e acconsento al trattamento dei dati per essere ricontattato. <span aria-hidden="true">*</span></label>
    </div>
  </div>`;
}

function formTag(name, title, extraFields, { preset = '', idPrefix = name, hiddenFields = '' } = {}) {
  const enabled = formsEnabled();
  const attrs = [`name="${name}"`, `class="request-form"`, `data-form`, 'novalidate'];
  if (forms.provider === 'netlify') {
    attrs.push('method="POST"', 'data-netlify="true"', 'netlify-honeypot="bot-field"');
  } else if (forms.provider === 'endpoint' && isSet(forms.endpoint)) {
    attrs.push('method="POST"', `action="${esc(forms.endpoint)}"`);
  } else if (forms.provider === 'centrale') {
    attrs.push('method="POST"', `action="${REQUEST_ENDPOINT}"`);
  }
  attrs.push(`data-enabled="${enabled}"`);
  const hidden =
    forms.provider === 'netlify' || forms.provider === 'centrale'
      ? `<input type="hidden" name="form-name" value="${name}"><p hidden><label>Non compilare: <input name="bot-field" tabindex="-1" autocomplete="off"></label></p>`
      : '';
  return `<form ${attrs.join(' ')} aria-label="${title}">
    ${hidden}${hiddenFields}
    ${formFields(idPrefix, extraFields, preset)}
    <div class="form-status" role="status" aria-live="polite" data-form-status></div>
    <button class="btn btn--primary btn--lg btn--block" type="submit"${enabled ? '' : ' disabled aria-disabled="true"'}>${enabled ? 'Invia la richiesta' : 'Invio online non ancora attivo'}</button>
  </form>`;
}

export function contactSection() {
  const enabled = formsEnabled();
  const tel = phoneHref();
  const wa = whatsappHref();
  const notice = enabled
    ? ''
    : `<div class="form-notice" role="note">${icon('info', { size: 20 })}<p><strong>Il servizio di invio online non è ancora attivo.</strong> Puoi compilare il modulo per vedere i campi richiesti, ma la richiesta non verrà trasmessa. ${tel || wa ? 'Per ora contattaci telefonicamente o su WhatsApp.' : ''}</p></div>`;

  const preventivoExtra = `<div class="field">
      <label for="preventivo-cliente">Tipo di cliente</label>
      <select id="preventivo-cliente" name="tipo_cliente">
        <option value="privato">Privato</option>
        <option value="condominio">Condominio</option>
        <option value="azienda">Azienda / negozio</option>
        <option value="hotel">Hotel / struttura ricettiva</option>
      </select>
    </div>
    <div class="field">
      <label for="preventivo-tempi">Tempi desiderati</label>
      <select id="preventivo-tempi" name="tempi">
        <option value="da-concordare">Da concordare</option>
        <option value="entro-settimana">Entro una settimana</option>
        <option value="entro-mese">Entro un mese</option>
        <option value="programmato">Lavoro programmato</option>
      </select>
    </div>`;

  return `<section class="section section--ice contact" id="contatti" aria-labelledby="contatti-title">
  <div class="container contact__grid">
    <div class="contact__info" data-reveal>
      <p class="eyebrow">Contatti</p>
      <h2 id="contatti-title" class="section-title">Richiedi un intervento o un preventivo</h2>
      <p class="section-lead">Descrivi il problema e la zona: ti ricontatteremo per valutare la situazione e concordare l’intervento.</p>
      <div class="contact__buttons">
        ${callButton('btn--primary btn--lg')}
        ${whatsappButton('btn--whatsapp btn--lg')}
      </div>
      <ul class="contact__list">
        ${isSet(contacts.email) ? `<li>${icon('mail', { size: 20 })}<a href="mailto:${esc(contacts.email)}">${esc(contacts.email)}</a></li>` : ''}
        ${isSet(contacts.hours) ? `<li>${icon('clock', { size: 20 })}<span>${esc(contacts.hours)}</span></li>` : ''}
        <li>${icon('pin', { size: 20 })}<span>${esc(site.serviceArea.label)} — ${esc(site.serviceArea.note)}</span></li>
      </ul>
      ${!isSet(contacts.email) || !isSet(contacts.hours) ? missingNote('Email e orari di disponibilità da completare in configurazione.') : ''}
    </div>

    <div class="contact__forms" data-reveal>
      <div class="tabs" role="tablist" aria-label="Tipo di richiesta">
        <button class="tabs__btn" role="tab" id="tab-intervento" aria-controls="panel-intervento" aria-selected="true" type="button">Richiesta intervento</button>
        <button class="tabs__btn" role="tab" id="tab-preventivo" aria-controls="panel-preventivo" aria-selected="false" tabindex="-1" type="button">Richiesta preventivo</button>
      </div>
      ${notice}
      <div class="tabs__panel" role="tabpanel" id="panel-intervento" aria-labelledby="tab-intervento">
        ${formTag('intervento', 'Modulo richiesta intervento', '')}
      </div>
      <div class="tabs__panel" role="tabpanel" id="panel-preventivo" aria-labelledby="tab-preventivo" hidden>
        ${formTag('preventivo', 'Modulo richiesta preventivo', preventivoExtra)}
      </div>
    </div>
  </div>
</section>`;
}

/* ================================================================ CTA BAND */
export function ctaBand(title = 'Hai un problema tecnico in casa o in azienda?', text = 'Raccontaci cosa succede: valuteremo insieme la soluzione più adatta.') {
  return `<section class="cta-band" aria-label="Richiesta intervento">
  <div class="container cta-band__inner" data-reveal>
    <div>
      <h2>${title}</h2>
      <p>${text}</p>
    </div>
    <div class="cta-band__actions">
      <a class="btn btn--orange btn--lg" href="/#contatti">Richiedi un intervento</a>
      ${callButton('btn--outline-light btn--lg')}
    </div>
  </div>
</section>`;
}

/* ================================================================ RICHIESTA (pagine categoria e servizio) */
/**
 * Blocco contatti riutilizzabile con modulo unico "sopralluogo".
 * `preset` = valore categoria (es. "idraulica" o "idraulica/spurgo-fognature"):
 * l'opzione corrispondente è già selezionata nell'HTML generato.
 */
export function requestSection({ preset = '', serviceName = '', path = '/', title, lead } = {}) {
  const enabled = formsEnabled();
  const tel = phoneHref();
  const wa = whatsappHref();
  const waMsg = serviceName
    ? `Buongiorno, vorrei informazioni su: ${serviceName}.`
    : contacts.whatsappMessage;
  const notice = enabled
    ? ''
    : `<div class="form-notice" role="note">${icon('info', { size: 20 })}<p><strong>Il servizio di invio online non è ancora attivo.</strong> Il modulo mostra i dati che ti chiederemo, ma la richiesta non verrà trasmessa. ${tel || wa ? 'Per ora contattaci telefonicamente o su WhatsApp.' : ''}</p></div>`;

  const requestType = `<div class="field">
      <label for="req-tipo">Tipo di richiesta</label>
      <select id="req-tipo" name="tipo_richiesta">
        <option value="sopralluogo">Sopralluogo</option>
        <option value="preventivo">Preventivo</option>
        <option value="intervento">Intervento</option>
        <option value="informazioni">Informazioni</option>
      </select>
    </div>
    <div class="field">
      <label for="req-cliente">Tipo di cliente</label>
      <select id="req-cliente" name="tipo_cliente">
        <option value="privato">Privato</option>
        <option value="condominio">Condominio</option>
        <option value="azienda">Azienda / negozio</option>
        <option value="hotel">Hotel / struttura ricettiva</option>
      </select>
    </div>`;

  return `<section class="section section--ice contact" id="contatti" aria-labelledby="contatti-title">
  <div class="container contact__grid">
    <div class="contact__info" data-reveal>
      <p class="eyebrow">Contatti</p>
      <h2 id="contatti-title" class="section-title">${title || 'Richiedi un sopralluogo o un preventivo'}</h2>
      <p class="section-lead">${lead || 'Indica la zona e descrivi il problema: ti ricontatteremo per valutare la situazione.'}</p>
      <div class="contact__buttons">
        ${callButton('btn--primary btn--lg')}
        ${whatsappButton('btn--whatsapp btn--lg', waMsg)}
      </div>
      <ul class="contact__list">
        ${isSet(contacts.email) ? `<li>${icon('mail', { size: 20 })}<a href="mailto:${esc(contacts.email)}">${esc(contacts.email)}</a></li>` : ''}
        ${isSet(contacts.hours) ? `<li>${icon('clock', { size: 20 })}<span>${esc(contacts.hours)}</span></li>` : ''}
        <li>${icon('pin', { size: 20 })}<span>${esc(site.serviceArea.label)} — ${esc(site.serviceArea.note)}</span></li>
      </ul>
    </div>
    <div class="contact__forms" id="modulo" data-reveal>
      <h3 class="contact__form-title">${serviceName ? `Richiesta per: ${esc(serviceName)}` : 'Modulo di richiesta'}</h3>
      ${notice}
      ${formTag('sopralluogo', 'Modulo richiesta sopralluogo o preventivo', requestType, {
        preset,
        idPrefix: 'req',
        hiddenFields: `<input type="hidden" name="pagina" value="${esc(path)}"><input type="hidden" name="attribuzione" value="" data-attribution>`
      })}
    </div>
  </div>
</section>`;
}
