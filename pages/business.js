/**
 * PAGINE B2B: /piani-assistenza/business/ · /hotel-e-strutture-ricettive/ · /corporate/
 * Contenuti originali, listino provvisorio "+ IVA, se applicabile", nessuna
 * promessa di reperibilità H24 o di tempi di arrivo non contrattualizzati.
 */
import { page, breadcrumb } from '../components/layout.js';
import { icon } from '../components/icons.js';
import { esc, picture, imageUrl, isSet } from '../components/utils.js';
import { faqSection } from '../components/service-blocks.js';
import { leadForm } from '../components/lead-form.js';
import { site, company, commerce } from '../config/site.config.js';
import { categories, categoryUrl } from '../data/services.js';
import { businessPlans, corporateProgram, b2bExclusions, B2B_RATES, B2B_LIMITS, B2B_VAT_RATE } from '../data/catalog/business-plans.js';
import { euro as euroRaw } from '../lib/money.js';
import { price, priceVisible, anyPriceVisible, flag } from '../components/pricing.js';
import { isProduction, ctx } from '../components/context.js';
// tariffe B2B di riferimento: visibili in produzione solo se almeno un listino B2B è approvato e pubblicato
const b2bIds = () => [...businessPlans.map((p) => p.id), corporateProgram.id];
const euro = (cents) => (anyPriceVisible(b2bIds()) ? euroRaw(cents) : 'tariffa in definizione');
import { LEGAL_PROTECTION_TEXT } from '../lib/certificates.js';
import { breadcrumbSchema, businessSchema, faqSchema } from '../seo/schema.js';

export const BUSINESS_PATH = '/piani-assistenza/business/';
export const HOTEL_PATH = '/hotel-e-strutture-ricettive/';
export const CORPORATE_PATH = '/corporate/';

const hours = (m) => (m % 60 === 0 ? `${m / 60} ore` : `${m} minuti`);

function statusNotice(line = 'business') {
  if (flag('online_purchases') && flag('mypos') && flag(line)) return '';
  if (isProduction()) return `<div class="sales-notice" role="note">${icon('info', { size: 20 })}<p><strong>Contratti su richiesta.</strong> I piani sono descritti a titolo informativo; prezzi e condizioni si definiscono con un preventivo scritto. Ogni contratto si attiva solo dopo l’accettazione scritta e la conferma del pagamento.</p></div>`;
  return `<div class="sales-notice" role="note">${icon('info', { size: 20 })}<p><strong>Listino provvisorio.</strong> Prezzi e prestazioni sono proposte commerciali in attesa di approvazione da parte del titolare; le condizioni contrattuali sono in revisione legale. Ogni contratto viene attivato solo dopo l’accettazione scritta e la conferma del pagamento.</p></div>`;
}

function planCard(p, featured = false) {
  return `<article class="plan-card${featured ? ' plan-card--plus' : ''}" aria-labelledby="b2b-${p.id}" id="piano-${p.id}">
    <header class="plan-card__head">
      <p class="plan-card__tier">${p.line === 'hotel' ? 'PRONTO+ Hotel' : 'PRONTO+ Business'}</p>
      <h3 id="b2b-${p.id}">${esc(p.name)}</h3>
      <p class="plan-card__price"><span data-price>${price(p.priceCents, p.id)}</span>${priceVisible(p.id) ? '<small>/anno + IVA, se applicabile</small>' : ''}</p>
      <p class="plan-card__vat">IVA ${B2B_VAT_RATE}% esclusa · durata ${p.durationMonths} mesi · nessun rinnovo automatico</p>
    </header>
    <ul class="plan-card__list">${p.included.map((x) => `<li>${icon('check', { size: 18 })}<span>${esc(x)}</span></li>`).join('')}</ul>
    <a class="btn btn--primary btn--block" href="#preventivo" data-plan-ref="${p.id}">Richiedi la proposta</a>
  </article>`;
}

function compareTable(plans, caption) {
  const yes = `${icon('check', { size: 16 })}<span class="visually-hidden">Sì</span>`;
  const no = '—';
  const f = (p, k) => (p.features.includes(k) ? yes : no);
  const rows = [
    ['Prezzo annuale', (p) => (priceVisible(p.id) ? `<strong>${price(p.priceCents, p.id)}</strong><small>+ IVA, se applicabile</small>` : 'In definizione')],
    ['Diritti di chiamata inclusi', (p) => p.benefits.callFee],
    ['Piccoli interventi (max 45 min)', (p) => p.benefits.smallIntervention || no],
    ['Ore di piccola manutenzione', (p) => (p.benefits.maintenanceMinutes ? hours(p.benefits.maintenanceMinutes) : no)],
    ['Visite di controllo programmate', (p) => p.benefits.scheduledVisits || no],
    ['Sedi coperte', (p) => p.locations],
    ['Sconto manodopera aggiuntiva', (p) => (p.discountPct ? `${p.discountPct}%` : no)],
    ['Portale richieste e storico', (p) => (p.features.includes('history') || p.features.includes('reports') ? yes : 'Richieste')],
    ['Canale dedicato', (p) => f(p, 'dedicated_channel')],
    ['Report', (p) => (p.features.includes('annual_report') ? 'Annuale' : p.features.includes('reports') ? 'Interventi' : no)]
  ].filter(([, fn]) => plans.some((p) => fn(p) !== no));
  return `<div class="table-wrap">
    <table class="compare-table">
      <caption>${esc(caption)}</caption>
      <thead><tr><th scope="col">Condizione</th>${plans.map((p) => `<th scope="col">${esc(p.name)}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(([label, fn]) => `<tr><th scope="row">${label}</th>${plans.map((p) => `<td>${fn(p)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table>
  </div>`;
}

/** Regole di utilizzo, limiti e tariffe extra: le stesse salvate nei contratti. */
function rulesSection(id = 'regole') {
  const s = B2B_RATES.surcharges;
  return `<section class="section section--light" id="${id}" aria-labelledby="${id}-title">
  <div class="container">
    <div class="section-head" data-reveal><p class="eyebrow">Regole chiare</p><h2 id="${id}-title" class="section-title">Come si contano le prestazioni</h2>
      <p class="section-lead">Ogni prestazione inclusa si scala una sola volta, da un solo saldo, con regole scritte nel contratto. Nessuna sorpresa a fine anno.</p></div>
    <div class="rules-grid">
      <div class="rule"><h3>${icon('pin', { size: 20 })} Uscita su richiesta</h3><p>Ogni intervento richiesto usa un diritto di chiamata incluso. Esauriti quelli inclusi, l’uscita è a tariffa: ${euro(B2B_RATES.callFeeCents)} + IVA.</p></div>
      <div class="rule"><h3>${icon('clock', { size: 20 })} Piccolo intervento</h3><p>Copre i primi 45 minuti di lavoro e si usa solo durante un’uscita inclusa. Il tempo eccedente è manodopera aggiuntiva.</p></div>
      <div class="rule"><h3>${icon('gauge', { size: 20 })} Monte ore</h3><p>Le ore di piccola manutenzione si scalano a blocchi di 15 minuti, arrotondati per eccesso, solo per lavori registrati nel rapporto tecnico.</p></div>
      <div class="rule"><h3>${icon('layers', { size: 20 })} Visite programmate</h3><p>Ogni visita confermata scala solo il saldo visite: non consuma diritti di chiamata. Il lavoro svolto durante la visita usa il monte ore.</p></div>
    </div>
    <dl class="limits">
      <div><dt>${icon('pin', { size: 20 })} Zona</dt><dd>${esc(B2B_LIMITS.zonesNote)}</dd></div>
      <div><dt>${icon('clock', { size: 20 })} Fascia coperta</dt><dd>${esc(B2B_LIMITS.coverageHours.label)}. Fuori fascia: +${s.outOfHoursPct}%; festivi: +${s.holidayPct}%.</dd></div>
      <div><dt>${icon('wrench', { size: 20 })} Manodopera extra</dt><dd>${euro(B2B_RATES.hourlyLaborCents)} + IVA l’ora, minimo ${B2B_RATES.minimumBillableMinutes} minuti, con lo sconto del piano.</dd></div>
      <div><dt>${icon('info', { size: 20 })} Tempi</dt><dd>${esc(B2B_LIMITS.note)}</dd></div>
    </dl>
    <p class="rules-note">${icon('info', { size: 16 })} Tariffe di riferimento provvisorie. Massimali, tariffe e regole sono riportati nel contratto e restano invariati per tutta la sua durata.</p>
  </div>
</section>`;
}

function inclExcl(title = 'Cosa è incluso e cosa no') {
  return `<section class="section section--white" id="inclusi" aria-labelledby="incl-title">
  <div class="container">
    <div class="section-head" data-reveal><p class="eyebrow">Trasparenza</p><h2 id="incl-title" class="section-title">${title}</h2></div>
    <div class="compare">
      <div class="compare__col" data-reveal>
        <h3 class="section-title section-title--sm">Incluso, nei limiti del piano</h3>
        <ul>
          <li>${icon('check', { size: 18 })}<span>Uscite del tecnico per guasti e piccole riparazioni ordinarie</span></li>
          <li>${icon('check', { size: 18 })}<span>Manodopera dei piccoli interventi e del monte ore previsto</span></li>
          <li>${icon('check', { size: 18 })}<span>Gestione delle richieste e storico dal portale aziendale</span></li>
          <li>${icon('check', { size: 18 })}<span>Rapporto tecnico e certificato digitale per ogni intervento</span></li>
          <li>${icon('check', { size: 18 })}<span>Preventivo scritto prima di ogni lavoro non incluso</span></li>
        </ul>
      </div>
      <div class="compare__col compare__col--alt" data-reveal>
        <h3 class="section-title section-title--sm section-title--light">Escluso</h3>
        <ul>${b2bExclusions.map((x) => `<li>${icon('close', { size: 18 })}<span>${esc(x)}</span></li>`).join('')}</ul>
      </div>
    </div>
  </div>
</section>`;
}

function ownerSection() {
  const ownerImg = company.ownerPhoto ? { src: company.ownerPhoto, alt: `${site.owner}, titolare` } : { src: null, alt: `Foto del titolare ${site.owner}` };
  return `<section class="section section--light b2b-owner" id="azienda" aria-labelledby="owner-title">
  <div class="container about__grid">
    <div class="about__photo" data-reveal>
      ${picture(ownerImg, 'owner', { key: 'about/owner', sizes: '(min-width: 900px) 40vw, 100vw', width: 800, height: 960, className: 'about__media' })}
      <div class="about__card"><p class="about__name">${esc(site.owner)}</p><p class="about__role">Titolare</p></div>
    </div>
    <div class="about__content" data-reveal>
      <p class="eyebrow">L’azienda</p>
      <h2 id="owner-title" class="section-title">Un interlocutore tecnico unico, guidato da ${esc(site.owner)}</h2>
      <p class="section-lead">${esc(site.brandShort)} segue abitazioni, condomini e attività a ${esc(site.serviceArea.label)} con un unico punto di contatto per idraulica, impianti elettrici, ricerca perdite, allagamenti, opere murarie e disinfestazioni.</p>
      <p>Con PRONTO+ Business la relazione diventa continuativa: un contratto annuale, un portale per le richieste, rapporti scritti per ogni lavoro e un riepilogo sempre aggiornato delle prestazioni disponibili.</p>
      ${isSet(company.story) ? `<p>${esc(company.story)}</p>` : ''}
      <a class="btn btn--primary" href="#preventivo">Parla con noi ${icon('arrow', { size: 20 })}</a>
    </div>
  </div>
</section>`;
}

function leadSection({ segment, id, path, title, lead, segmentChoice = false }) {
  return `<section class="section section--ice" id="preventivo" aria-labelledby="${id}-title">
  <div class="container lead-wrap">
    <div class="lead-wrap__intro" data-reveal>
      <p class="eyebrow">Richiesta di preventivo</p>
      <h2 id="${id}-title" class="section-title">${title}</h2>
      <p class="section-lead">${lead}</p>
      <ol class="lead-steps">
        <li><strong>Analisi</strong> delle sedi, degli impianti e delle esigenze ricorrenti.</li>
        <li><strong>Sopralluogo</strong> concordato, se utile, per una proposta realistica.</li>
        <li><strong>Proposta scritta</strong> in PDF con prestazioni, sedi coperte, limiti e prezzo.</li>
        <li><strong>Contratto</strong> attivo solo dopo la tua accettazione e la conferma del pagamento.</li>
      </ol>
    </div>
    <div class="lead-wrap__form" data-reveal>${leadForm({ segment, id, page: path, segmentChoice, title })}</div>
  </div>
</section>`;
}

function areaBand(text = 'Richieste multisede, prestazioni residue, rapporti tecnici, certificati e scadenze in un unico portale riservato alla tua azienda.') {
  return `<section class="cta-band" aria-label="Area Business">
  <div class="container cta-band__inner">
    <div><h2>Area Business</h2><p>${text}</p></div>
    <div class="cta-band__actions"><a class="btn btn--orange btn--lg" href="/area-business/">Accedi all’area Business</a></div>
  </div>
</section>`;
}

const hero = ({ crumbs, key, alt, spec, eyebrow, eyeIcon, title, lead, actions, cls = '' }) => `
<section class="page-hero page-hero--service plus-hero ${cls}" aria-labelledby="page-title">
  <div class="page-hero__media">${picture(null, key, { key, alt, spec, width: 1600, height: 900, eager: true, className: 'media--cover' })}</div>
  <div class="page-hero__overlay" aria-hidden="true"></div>
  <div class="container page-hero__inner">
    ${breadcrumb(crumbs)}
    <p class="page-hero__eyebrow"><span class="page-hero__icon page-hero__icon--sm">${icon(eyeIcon, { size: 22 })}</span>${eyebrow}</p>
    <h1 id="page-title" class="page-hero__title">${title}</h1>
    <p class="page-hero__lead">${lead}</p>
    <div class="hero__actions">${actions}</div>
  </div>
</section>`;

/* ================================================================ BUSINESS */
export function businessPage() {
  const path = BUSINESS_PATH;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'PRONTO+ Business', path }];
  const heroKey = 'pronto-plus/business/hero';
  const heroSpec = { w: 1600, h: 900, iconName: 'building', subject: 'PRONTO+ Business', accent: '#006BE6', motif: 'hex', minimal: true };
  const plans = businessPlans.filter((p) => p.line === 'business');
  const segments = [
    ['building', 'Negozi e supermercati', 'Scarichi, illuminazione, quadri e servizi igienici: meno fermi durante l’orario di apertura.'],
    ['drop', 'Ristoranti e bar', 'Cucine, lavaggi, scarichi grassi e impianti sotto stress quotidiano.'],
    ['user', 'Uffici e studi professionali', 'Piccoli guasti risolti senza cercare ogni volta un tecnico diverso.'],
    ['layers', 'Centri commerciali', 'Più unità, aree comuni e richieste da coordinare con un unico referente.'],
    ['home', 'Condomini', 'Parti comuni, colonne di scarico, autoclavi e illuminazione condominiale.'],
    ['gauge', 'Aziende e attività produttive', 'Servizi tecnici programmati per sedi operative e magazzini.']
  ];
  const faq = [
    { q: 'I prezzi sono IVA inclusa?', a: `No. I prezzi dei piani Business sono indicati IVA esclusa (+ IVA ${B2B_VAT_RATE}%, se applicabile), come d’uso tra imprese.` },
    { q: 'Cosa si intende per piccolo intervento?', a: 'Una riparazione ordinaria eseguibile in non più di 45 minuti durante un’uscita inclusa, senza materiali particolari, lavori complessi o pratiche. Se serve più tempo, la parte eccedente è manodopera aggiuntiva, scontata secondo il piano.' },
    { q: 'Il contratto si rinnova da solo?', a: 'No. Prima della scadenza ricevi un promemoria e una proposta di rinnovo; il rinnovo automatico è possibile solo se lo richiedi esplicitamente e lo autorizzi per iscritto.' },
    { q: 'Garantite l’arrivo entro un certo orario?', a: 'I tempi di intervento si concordano in base alla richiesta e alla disponibilità. Tempi garantiti sono previsti solo se indicati in uno SLA firmato, tipico dei contratti Corporate.' },
    { q: 'Posso pagare a rate?', a: 'Il pagamento standard è annuale anticipato. Il pagamento trimestrale è possibile solo se approvato in fase di proposta.' },
    { q: 'Ho più punti vendita: serve un contratto per ognuno?', a: 'I piani Business coprono una sede. Per più sedi prepariamo un contratto unico con l’elenco delle sedi coperte, gestibile dall’area Business, oppure una proposta Corporate.' },
    { q: 'È un’assicurazione?', a: 'No. È un contratto di assistenza tecnica con prestazioni predefinite: non prevede indennizzi né risarcimenti di danni.' }
  ];
  const body = `
${hero({ crumbs, key: heroKey, alt: 'Tecnico al lavoro in un locale commerciale', spec: heroSpec, eyebrow: 'Assistenza tecnica aziende Roma', eyeIcon: 'building',
  title: '<span class="plus-word">PRONTO<span>+</span></span> Business',
  lead: 'Manutenzione aziende a Roma con un contratto annuale chiaro: uscite incluse, piccoli interventi, un portale per le richieste e un solo interlocutore tecnico.',
  actions: `<a class="btn btn--primary btn--lg" href="#pacchetti">Vedi i pacchetti ${icon('arrow', { size: 20 })}</a><a class="btn btn--outline-light btn--lg" href="#preventivo">Richiedi un preventivo</a>` })}

<section class="section section--light" id="presentazione" aria-labelledby="pres-title">
  <div class="container">
    ${statusNotice()}
    <div class="section-head" data-reveal>
      <p class="eyebrow">PRONTO+ Business</p>
      <h2 id="pres-title" class="section-title">Servizi tecnici per aziende a Roma, organizzati in un contratto</h2>
      <p class="section-lead">Per un’attività un guasto non è solo una riparazione: è un servizio fermo, un cliente insoddisfatto, un turno da riorganizzare. PRONTO+ Business mette a disposizione un pacchetto annuale di uscite e piccoli interventi, con regole scritte e uno storico consultabile in ogni momento.</p>
    </div>
    <div class="benefits">
      <div class="benefit" data-reveal>${icon('clock', { size: 26 })}<h3>Meno tempo perso</h3><p>Una sola richiesta dal portale, senza cercare ogni volta il tecnico giusto.</p></div>
      <div class="benefit" data-reveal>${icon('gauge', { size: 26 })}<h3>Costi prevedibili</h3><p>Canone annuale fisso e tariffe extra già concordate, con sconto sulla manodopera.</p></div>
      <div class="benefit" data-reveal>${icon('layers', { size: 26 })}<h3>Tutto documentato</h3><p>Rapporti tecnici, materiali e certificati digitali per ogni intervento.</p></div>
      <div class="benefit" data-reveal>${icon('shield', { size: 26 })}<h3>Un unico interlocutore</h3><p>Idraulica, elettricità, perdite, scarichi, muratura e disinfestazioni.</p></div>
    </div>
  </div>
</section>

<section class="section section--white" id="settori" aria-labelledby="settori-title">
  <div class="container">
    <div class="section-head" data-reveal><p class="eyebrow">A chi è rivolto</p><h2 id="settori-title" class="section-title">Le attività che seguiamo</h2></div>
    <ul class="b2b-segments">${segments.map(([ic, t, d]) => `<li data-reveal>${icon(ic, { size: 24 })}<h3>${t}</h3><p>${d}</p></li>`).join('')}</ul>
    <p class="b2b-segments__more">Hai un hotel o una struttura ricettiva? Vedi <a href="${HOTEL_PATH}">PRONTO+ Hotel</a>. Più sedi o un gruppo aziendale? Scopri <a href="${CORPORATE_PATH}">PRONTO+ Corporate</a>.</p>
  </div>
</section>

<section class="section section--ice" id="pacchetti" aria-labelledby="pack-title">
  <div class="container">
    <div class="section-head" data-reveal><p class="eyebrow">Pacchetti annuali</p><h2 id="pack-title" class="section-title">Start, Pro e Premium</h2><p class="section-lead">Prezzi annuali IVA esclusa, per una sede. Listino provvisorio in attesa di approvazione.</p></div>
    <div class="plan-cards plan-cards--3">${plans.map((p) => planCard(p, p.id === 'business-pro')).join('')}</div>
  </div>
</section>

<section class="section section--white" id="confronto" aria-labelledby="conf-title">
  <div class="container">
    <div class="section-head" data-reveal><p class="eyebrow">Tabella comparativa</p><h2 id="conf-title" class="section-title">Confronta i pacchetti Business</h2></div>
    ${compareTable(plans, 'Confronto PRONTO+ Business Start, Pro e Premium')}
  </div>
</section>

${inclExcl()}
${rulesSection()}

<section class="section section--dark" id="condomini" aria-labelledby="cond-title">
  <div class="container overview">
    <div>
      <p class="eyebrow eyebrow--orange">Condomini e amministratori</p>
      <h2 id="cond-title" class="section-title section-title--light">Contratto di manutenzione per condomini a Roma</h2>
      <p class="section-lead section-lead--light">Per gli amministratori condominiali prepariamo contratti su misura per le parti comuni: colonne di scarico, autoclavi, illuminazione di scale e cortili, piccole opere murarie e disinfestazioni. Più condomini? Ognuno è una sede con il proprio storico e i propri documenti, consultabili dall’area Business.</p>
      <a class="btn btn--orange" href="#preventivo" data-segment="condominium">Richiedi una proposta per il condominio</a>
    </div>
  </div>
</section>

${leadSection({ segment: 'business', id: 'lead-business', path, segmentChoice: true, title: 'Raccontaci la tua attività', lead: 'Indica sedi, zona e servizi di interesse: prepariamo una proposta scritta, senza impegno.' })}
${faqSection(faq, { title: 'Domande frequenti su PRONTO+ Business' })}
${ownerSection()}
${areaBand()}`;

  return {
    path,
    html: page({
      title: 'Manutenzione aziende Roma | PRONTO+ Business',
      description: 'Assistenza tecnica per aziende, negozi, uffici e condomini a Roma: contratti annuali PRONTO+ Business con uscite incluse e prezzi chiari.',
      path,
      jsonLd: [businessSchema(), breadcrumbSchema(crumbs), faqSchema(faq), offerCatalogSchema('PRONTO+ Business', plans, path)],
      bodyClass: 'page-plus page-b2b',
      attrs: ' style="--accent:#006BE6"',
      preload: imageUrl(null, heroKey, { key: heroKey, spec: heroSpec }),
      body
    })
  };
}

/* ================================================================ HOTEL */
export function hotelPage() {
  const path = HOTEL_PATH;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'Hotel e strutture ricettive', path }];
  const heroKey = 'pronto-plus/hotel/hero';
  const heroSpec = { w: 1600, h: 900, iconName: 'building', subject: 'Hotel e strutture ricettive', accent: '#C9A35B', motif: 'waves', minimal: true };
  const plans = businessPlans.filter((p) => p.line === 'hotel');
  const cat = (slug) => categories.find((c) => c.slug === slug);
  const sub = (c, s) => `/servizi/${c}/${s}/`;
  const services = [
    ['wrench', 'Manutenzione idraulica', 'Rubinetteria, docce, sanitari e perdite nelle camere: interventi programmati per non togliere camere dalla vendita.', categoryUrl(cat('idraulica'))],
    ['bolt', 'Manutenzione elettrica', 'Prese, luci, quadri di piano e guasti ricorrenti, con interventi coordinati con la reception.', categoryUrl(cat('elettrica'))],
    ['pipe', 'Scarichi e fognature', 'Disostruzioni, spurgo e manutenzione delle colonne, anche nelle cucine e nelle aree comuni.', sub('idraulica', 'spurgo-fognature')],
    ['radar', 'Ricerca perdite occulte', 'Localizzazione non distruttiva con termografia, gas tracciante e geofono, per limitare le opere murarie.', categoryUrl(cat('ricerca-perdite-occulte'))],
    ['camera', 'Videoispezioni', 'Ispezione delle tubazioni con telecamera per capire l’origine dei problemi prima di intervenire.', sub('idraulica', 'videoispezione-tubature')],
    ['flood', 'Allagamenti', 'Svuotamento di locali tecnici, cantine e piani interrati, con la massima attenzione agli ospiti.', categoryUrl(cat('allagamenti'))],
    ['brick', 'Riparazioni murarie', 'Ripristini dopo perdite, piccole opere e ritocchi per riportare le camere in ordine.', sub('muratura', 'riparazioni-murarie')],
    ['shield', 'Disinfestazioni', 'Trattamenti programmati e mirati contro insetti e roditori, con la riservatezza che una struttura richiede.', categoryUrl(cat('disinfestazioni'))]
  ];
  const faq = [
    { q: 'Siete disponibili 24 ore su 24?', a: 'La disponibilità fuori orario non è inclusa nei piani standard e si concorda caso per caso. Condizioni di reperibilità e tempi di intervento garantiti possono essere inseriti solo in un contratto personalizzato che li preveda espressamente.' },
    { q: 'Le visite di controllo sostituiscono le verifiche obbligatorie?', a: 'No. Le visite programmate sono controlli di manutenzione ordinaria: non sono verifiche periodiche di legge né certificazioni di impianto, che restano affidate ai soggetti abilitati.' },
    { q: 'Come si usano le ore di piccola manutenzione?', a: 'Si scalano a blocchi di 15 minuti in base al tempo registrato nel rapporto tecnico. Ogni movimento è visibile nell’area Business, con il saldo residuo aggiornato.' },
    { q: 'Possiamo coprire più strutture?', a: 'Sì: ogni struttura è una sede con codice, referente e storico propri. Per catene e gruppi prepariamo una proposta unica o un contratto Corporate.' },
    { q: 'I prezzi includono materiali?', a: 'No. Materiali, ricambi e lavori complessi sono sempre preventivati a parte e approvati prima dell’esecuzione.' },
    { q: 'Come interveniamo nelle camere occupate?', a: 'Gli interventi si programmano con la struttura, privilegiando le fasce concordate e le camere libere, salvo guasti che richiedano un’uscita immediata compatibilmente con la disponibilità.' }
  ];
  const body = `
${hero({ crumbs, key: heroKey, alt: 'Corridoio di un hotel durante un controllo tecnico', spec: heroSpec, eyebrow: 'Manutenzione hotel Roma', eyeIcon: 'building',
  title: 'Assistenza tecnica e manutenzione per Hotel a Roma',
  lead: 'Soluzioni personalizzate per strutture ricettive che desiderano organizzare manutenzioni, verifiche tecniche e richieste di intervento.',
  actions: `<a class="btn btn--gold btn--lg" href="#pacchetti">Scopri i piani Hotel ${icon('arrow', { size: 20 })}</a><a class="btn btn--outline-light btn--lg" href="#preventivo">Richiedi un sopralluogo</a>`, cls: 'hotel-hero' })}

<section class="section section--white hotel-intro" id="presentazione" aria-labelledby="pres-title">
  <div class="container">
    ${statusNotice('hotel')}
    <div class="hotel-intro__grid">
      <div data-reveal>
        <p class="eyebrow eyebrow--gold">Per hotel, B&amp;B e strutture ricettive</p>
        <h2 id="pres-title" class="section-title hotel-title">L’ospite non deve accorgersi della manutenzione</h2>
      </div>
      <div data-reveal>
        <p class="section-lead">Una camera fuori servizio è un costo; un guasto gestito male diventa una recensione. Con la manutenzione programmata per hotel a Roma pianifichiamo controlli periodici, gestiamo le richieste della reception dal portale e documentiamo ogni intervento, così da avere sempre il quadro della struttura.</p>
        <ul class="hotel-points">
          <li>${icon('check', { size: 18 })}<span>Visite di controllo programmate con checklist per camere e aree comuni</span></li>
          <li>${icon('check', { size: 18 })}<span>Richieste dalla reception, anche per più strutture, con stato sempre visibile</span></li>
          <li>${icon('check', { size: 18 })}<span>Rapporti, foto e certificati digitali per ogni lavoro</span></li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section class="section section--ice" id="servizi-hotel" aria-labelledby="serv-title">
  <div class="container">
    <div class="section-head" data-reveal><p class="eyebrow eyebrow--gold">Competenze</p><h2 id="serv-title" class="section-title hotel-title">Servizi tecnici per la struttura</h2></div>
    <ul class="hotel-services">${services.map(([ic, t, d, href]) => `<li class="hotel-service" data-reveal><span class="hotel-service__icon">${icon(ic, { size: 24 })}</span><h3>${t}</h3><p>${d}</p><a href="${href}">Approfondisci<span class="visually-hidden">: ${t}</span> ${icon('arrow', { size: 16 })}</a></li>`).join('')}</ul>
  </div>
</section>

<section class="section section--white" id="pacchetti" aria-labelledby="pack-title">
  <div class="container">
    <div class="section-head" data-reveal><p class="eyebrow eyebrow--gold">Piani annuali</p><h2 id="pack-title" class="section-title hotel-title">Business Care, Hotel Pro, Hotel Elite</h2><p class="section-lead">Prezzi annuali IVA esclusa, per una struttura. Proposte commerciali in attesa di approvazione.</p></div>
    <div class="plan-cards plan-cards--3 plan-cards--hotel">${plans.map((p) => planCard(p, p.id === 'hotel-pro')).join('')}</div>
    <div class="hotel-compare">${compareTable(plans, 'Confronto dei piani PRONTO+ Hotel')}</div>
  </div>
</section>

${rulesSection('regole-hotel')}

<section class="section section--dark" id="verifiche" aria-labelledby="verif-title">
  <div class="container overview">
    <div>
      <p class="eyebrow eyebrow--gold">Manutenzione programmata</p>
      <h2 id="verif-title" class="section-title section-title--light">Visite di controllo, checklist e firma di presa visione</h2>
      <p class="section-lead section-lead--light">Ogni visita è pianificata nel calendario, assegnata a un tecnico e chiusa con checklist, note, foto e firma di presa visione del vostro referente. Le visite sono controlli di manutenzione ordinaria: non sostituiscono le verifiche periodiche obbligatorie e non costituiscono certificazioni di conformità degli impianti.</p>
    </div>
  </div>
</section>

${inclExcl('Incluso ed escluso nei piani Hotel')}
${leadSection({ segment: 'hotel', id: 'lead-hotel', path, title: 'Organizziamo la manutenzione della vostra struttura', lead: 'Indicate numero di camere o strutture, zona e servizi di interesse. Su richiesta concordiamo un sopralluogo.' })}
${faqSection(faq, { title: 'Domande frequenti dagli hotel' })}

<section class="legal-band" aria-labelledby="legal-title">
  <div class="container legal-band__inner">${icon('shield', { size: 32 })}<div><h2 id="legal-title">Un contratto di servizi, non una polizza</h2><p>${esc(LEGAL_PROTECTION_TEXT)}</p></div></div>
</section>
${areaBand('Ogni struttura come sede: richieste dalla reception, saldi di ore e visite, rapporti e certificati sempre consultabili.')}`;

  return {
    path,
    html: page({
      title: 'Manutenzione hotel Roma | PRONTO+ Hotel',
      description: 'Manutenzione programmata e pronto intervento per hotel e strutture ricettive a Roma: piani annuali con visite, ore incluse e report digitali.',
      path,
      jsonLd: [businessSchema(), breadcrumbSchema(crumbs), faqSchema(faq), offerCatalogSchema('PRONTO+ Hotel', plans, path)],
      bodyClass: 'page-plus page-b2b page-hotel',
      attrs: ' style="--accent:#C9A35B"',
      preload: imageUrl(null, heroKey, { key: heroKey, spec: heroSpec }),
      body
    })
  };
}

/* ================================================================ CORPORATE */
export function corporatePage() {
  const path = CORPORATE_PATH;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'PRONTO+ Corporate', path }];
  const heroKey = 'pronto-plus/corporate/hero';
  const heroSpec = { w: 1600, h: 900, iconName: 'layers', subject: 'PRONTO+ Corporate', accent: '#2F8BFF', motif: 'circuit', minimal: true };
  const steps = [
    ['Analisi', 'Mappatura delle sedi, degli impianti e delle esigenze di ciascun immobile.'],
    ['Sopralluoghi', 'Visite concordate per definire priorità, monte ore e frequenze realistiche.'],
    ['Proposta', 'Preventivo scritto con condizioni economiche, SLA eventuali e tariffe aggiuntive.'],
    ['Approvazione', 'Il contratto diventa attivabile solo con l’approvazione del vostro responsabile autorizzato.'],
    ['Gestione', 'Portale multisede, calendario delle manutenzioni, report periodici e rinnovo concordato.']
  ];
  const faq = [
    { q: 'Quanto costa PRONTO+ Corporate?', a: `${priceVisible(corporateProgram.id) || !isProduction() ? `Il prezzo indicativo parte da ${euroRaw(corporateProgram.fromPriceCents)} all’anno + IVA, se applicabile.` : 'Il prezzo dipende da sedi, servizi e livelli richiesti: si definisce con un preventivo.'} Ogni contratto è personalizzato in base a sedi, servizi, monte ore e condizioni richieste.` },
    { q: 'Prevedete SLA e reperibilità?', a: 'Sì, solo se concordati e scritti nel contratto: tempi di presa in carico, fasce di reperibilità e priorità sono parte della proposta personalizzata.' },
    { q: 'Come viene attivato il contratto?', a: 'Dopo l’approvazione interna di Pronto Intervento Roma, l’accettazione da parte del responsabile aziendale autorizzato e la verifica del pagamento o della fatturazione concordata. Nessun contratto Corporate è pubblicato o attivato automaticamente.' },
    { q: 'Possiamo avere una fatturazione personalizzata?', a: 'Sì: rate, scadenze e modalità di fatturazione si definiscono in fase di proposta e vengono riportate nel contratto.' }
  ];
  const body = `
${hero({ crumbs, key: heroKey, alt: 'Responsabile tecnico in una sede aziendale', spec: heroSpec, eyebrow: 'Servizi tecnici per aziende multisede', eyeIcon: 'layers',
  title: '<span class="plus-word">PRONTO<span>+</span></span> Corporate',
  lead: 'Un programma di assistenza tecnica costruito sulle vostre sedi: monte ore, sopralluoghi, priorità e condizioni definite insieme.',
  actions: `<a class="btn btn--primary btn--lg" href="#preventivo">Richiedi un’analisi ${icon('arrow', { size: 20 })}</a><a class="btn btn--outline-light btn--lg" href="#configurazione">Cosa si configura</a>` })}

<section class="section section--light" id="presentazione" aria-labelledby="pres-title">
  <div class="container">
    ${statusNotice('corporate')}
    <div class="corp-price" data-reveal>
      <div>
        <p class="eyebrow">Prezzo indicativo</p>
        ${priceVisible(corporateProgram.id) || !isProduction() ? `<p class="corp-price__value">da <strong>${euroRaw(corporateProgram.fromPriceCents)}</strong>/anno <small>+ IVA, se applicabile</small></p>` : '<p class="corp-price__value">Prezzo su preventivo</p>'}
      </div>
      <p>Ogni contratto Corporate è personalizzato: il prezzo finale dipende da sedi, servizi, monte ore e livelli di servizio richiesti, ed è indicato nella proposta scritta.</p>
    </div>
    <div class="section-head" data-reveal>
      <h2 id="pres-title" class="section-title">Per grandi gruppi, catene e aziende con più immobili</h2>
      <p class="section-lead">Quando le sedi sono molte, servono regole comuni e una visione d’insieme. PRONTO+ Corporate unisce un contratto unico, un portale con ruoli e permessi per i vostri referenti e una reportistica per sede, per categoria e per periodo.</p>
    </div>
  </div>
</section>

<section class="section section--white" id="configurazione" aria-labelledby="conf-title">
  <div class="container">
    <div class="section-head" data-reveal><p class="eyebrow">Su misura</p><h2 id="conf-title" class="section-title">Cosa definiamo insieme</h2></div>
    <ul class="corp-config">${corporateProgram.configurable.map(([, l]) => `<li data-reveal>${icon('check', { size: 18 })}<span>${esc(l)}</span></li>`).join('')}</ul>
  </div>
</section>

<section class="section section--ice process" id="processo" aria-labelledby="proc-title">
  <div class="container">
    <div class="section-head" data-reveal><p class="eyebrow">Percorso</p><h2 id="proc-title" class="section-title">Dalla richiesta al contratto</h2></div>
    <ol class="steps steps--5">${steps.map(([t, d], i) => `<li class="step"><span class="step__n">${String(i + 1).padStart(2, '0')}</span><h3>${t}</h3><p>${d}</p></li>`).join('')}</ol>
  </div>
</section>

${inclExcl('Perimetro del servizio')}
${leadSection({ segment: 'corporate', id: 'lead-corporate', path, title: 'Richiedi un’analisi per le vostre sedi', lead: 'Indicate numero e ubicazione delle sedi e i servizi richiesti: vi contatteremo per definire sopralluoghi e proposta.' })}
${faqSection(faq, { title: 'Domande frequenti su PRONTO+ Corporate' })}
${areaBand()}`;

  return {
    path,
    html: page({
      title: 'PRONTO+ Corporate: aziende multisede',
      description: `PRONTO+ Corporate: contratti personalizzati di manutenzione e assistenza tecnica per gruppi e aziende multisede a Roma${priceVisible(corporateProgram.id) || !isProduction() ? ', da 15.000 € + IVA' : ', con proposta su preventivo'}.`,
      path,
      jsonLd: [businessSchema(), breadcrumbSchema(crumbs), faqSchema(faq)],
      bodyClass: 'page-plus page-b2b',
      attrs: ' style="--accent:#2F8BFF"',
      preload: imageUrl(null, heroKey, { key: heroKey, spec: heroSpec }),
      body
    })
  };
}

/** Catalogo offerte (prezzi IVA esclusa, in euro). */
function offerCatalogSchema(name, allPlans, path) {
  // Prompt 9: nei dati strutturati di produzione solo prezzi approvati e pubblicati dal titolare
  const plans = allPlans.filter((p) => priceVisible(p.id)).map((p) => (isProduction() && ctx.publicPrices?.[p.id] ? { ...p, priceCents: ctx.publicPrices[p.id].priceCents } : p));
  if (!plans.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'OfferCatalog',
    name,
    url: new URL(path, site.siteUrl).href,
    itemListElement: plans.map((p) => ({
      '@type': 'Offer',
      name: `${name} ${p.name}`,
      price: (p.priceCents / 100).toFixed(2),
      priceCurrency: 'EUR',
      priceSpecification: { '@type': 'UnitPriceSpecification', price: (p.priceCents / 100).toFixed(2), priceCurrency: 'EUR', unitText: 'anno', valueAddedTaxIncluded: false },
      description: p.included.join('; ')
    }))
  };
}

export default function businessPages() {
  return [businessPage(), hotelPage(), corporatePage()];
}
