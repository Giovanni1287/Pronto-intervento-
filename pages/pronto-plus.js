/**
 * PAGINE PRONTO+: /piani-assistenza/famiglie/ · /lavoro-protetto/ ·
 * bozze delle condizioni (/condizioni-bozza/…, solo anteprima).
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { page, breadcrumb } from '../components/layout.js';
import { icon } from '../components/icons.js';
import { esc, picture, imageUrl } from '../components/utils.js';
import { faqSection } from '../components/service-blocks.js';
import { familyCategories, familyTiers, familyCommonRules, familyCommonExclusions, FAMILY_VAT_RATE } from '../data/catalog/family-plans.js';
import { protectedPlans, protectedLimits, protectedExclusions, protectedSpecialistVariants } from '../data/catalog/protected-work.js';
import { euro, vatBreakdown } from '../lib/money.js';
import { price, priceVisible, salesOpen, contactAvailable } from '../components/pricing.js';
import { isProduction } from '../components/context.js';
import { LEGAL_PROTECTION_TEXT } from '../lib/certificates.js';
import { commerce } from '../config/site.config.js';
import { breadcrumbSchema, businessSchema, faqSchema } from '../seo/schema.js';

export const FAMILY_PATH = '/piani-assistenza/famiglie/';
export const PROTECTED_PATH = '/lavoro-protetto/';

const minutes = (m) => (m % 60 === 0 ? `${m / 60} ${m === 60 ? 'ora' : 'ore'}` : `${m} minuti`);

/** Avviso sullo stato commerciale (onesto: prezzi provvisori, vendita non attiva). */
function statusNotice(kind = 'family') {
  if (salesOpen(kind === 'family' ? 'family' : 'protected_work')) return '';
  const contact = contactAvailable() ? (kind === 'family' ? ' Puoi contattarci per avere informazioni.' : '') : '';
  if (isProduction()) {
    return `<div class="sales-notice" role="note">${icon('info', { size: 20 })}<p><strong>Sottoscrizione online non ancora attiva.</strong> Le prestazioni sono descritte a titolo informativo; i prezzi compaiono solo quando il listino è approvato.${contact}</p></div>`;
  }
  return `<div class="sales-notice" role="note">${icon('info', { size: 20 })}<p><strong>Listino provvisorio, vendita non ancora attiva.</strong> Prezzi e prestazioni sono indicativi e in attesa di conferma da parte del titolare; le condizioni sono in revisione legale. ${kind === 'family' ? (contactAvailable() ? 'Puoi chiedere di essere informato all’apertura delle sottoscrizioni.' : '') : 'Il servizio sarà proposto dall’area cliente dopo un intervento.'}</p></div>`;
}

function buyButton(label, planRef) {
  if (salesOpen('family') && priceVisible(planRef)) {
    return `<a class="btn btn--primary btn--block" href="/checkout/?piano=${encodeURIComponent(planRef)}">${label}</a>`;
  }
  return `<button class="btn btn--primary btn--block" type="button" disabled aria-disabled="true">Sottoscrizione non ancora attiva</button>
    ${contactAvailable() ? '<a class="plan-card__info" href="/contatti/">Chiedi informazioni</a>' : ''}`;
}

/* ================================================================ FAMILY */

function planRows(p, pid) {
  return [
    ['Prezzo annuale', priceVisible(pid) ? `<strong>${price(p.priceCents, pid)}</strong><small>IVA inclusa</small>` : 'In definizione'],
    ['Uscite incluse', p.visits],
    ['Interventi inclusi', p.interventions],
    ['Durata massima per intervento', minutes(p.maxMinutes)],
    ['Controlli preventivi', p.checkups || '—'],
    ['Diritto di chiamata', p.callFeeIncluded ? 'Incluso' : 'Escluso'],
    ['Materiali', p.materialsIncluded ? 'Inclusi' : 'Esclusi'],
    ['Sconto oltre i limiti', `${p.extraLaborDiscountPct}%`]
  ];
}

function categoryPanel(c, i) {
  const cols = familyTiers.map((t) => {
    const p = c.plans[t.id];
    const vat = vatBreakdown(p.priceCents, FAMILY_VAT_RATE);
    const pid = `family-${c.id}-${t.id}`;
    return `<article class="plan-card${t.id === 'plus' ? ' plan-card--plus' : ''}" aria-labelledby="plan-${c.id}-${t.id}">
      <header class="plan-card__head">
        <p class="plan-card__tier">${t.name}</p>
        <h4 id="plan-${c.id}-${t.id}">${esc(c.name)} ${t.name}</h4>
        <p class="plan-card__tag">${esc(t.tagline)}</p>
        <p class="plan-card__price"><span data-price>${price(p.priceCents, pid)}</span>${priceVisible(pid) ? '<small>/anno, IVA inclusa</small>' : ''}</p>
        ${priceVisible(pid) && !isProduction() ? `<p class="plan-card__vat">di cui IVA ${FAMILY_VAT_RATE}%: ${euro(vat.vat)}</p>` : ''}
      </header>
      <ul class="plan-card__list">${p.included.map((x) => `<li>${icon('check', { size: 18 })}<span>${esc(x)}</span></li>`).join('')}</ul>
      ${buyButton('Sottoscrivi', `family-${c.id}-${t.id}`)}
    </article>`;
  });
  const rows = planRows(c.plans.essential, `family-${c.id}-essential`).map(([label], r) => {
    const e = planRows(c.plans.essential, `family-${c.id}-essential`)[r][1];
    const pl = planRows(c.plans.plus, `family-${c.id}-plus`)[r][1];
    return `<tr><th scope="row">${label}</th><td>${e}</td><td>${pl}</td></tr>`;
  });
  return `<div class="cat-panel" role="tabpanel" id="piano-${c.id}" aria-labelledby="tab-${c.id}" data-cat-panel${i ? ' data-hidden' : ''}>
    <div class="cat-panel__intro">
      <span class="cat-panel__icon">${icon(c.icon, { size: 28 })}</span>
      <div><h3>${esc(c.name)}</h3><p>${esc(c.summary)}</p></div>
    </div>
    <div class="plan-cards">${cols.join('')}</div>
    <div class="table-wrap cat-panel__table">
      <table class="compare-table">
        <caption>Confronto ${esc(c.name)}: Essential e Plus</caption>
        <thead><tr><th scope="col">Condizione</th><th scope="col">Essential</th><th scope="col">Plus</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>
    <div class="cat-panel__excl">
      <h4>Esclusioni specifiche</h4>
      <ul>${c.exclusions.map((x) => `<li>${icon('close', { size: 16 })}<span>${esc(x)}</span></li>`).join('')}</ul>
    </div>
  </div>`;
}

export function familyPage() {
  const path = FAMILY_PATH;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'PRONTO+ Family', path }];
  const heroOpts = { key: 'pronto-plus/family/hero', alt: 'Tecnico al lavoro in un’abitazione', spec: { w: 1600, h: 900, iconName: 'home', subject: 'PRONTO+ Family', accent: '#FF7824', motif: 'hex', minimal: true } };
  const faq = [
    { q: 'PRONTO+ Family è un’assicurazione?', a: 'No. È un pacchetto annuale di prestazioni tecniche predefinite: uscite, interventi e controlli indicati nella scheda del piano. Non prevede indennizzi o risarcimenti.' },
    { q: 'Quando si attiva il piano?', a: 'Solo dopo la conferma del pagamento da parte del sistema di pagamento. Da quel momento dura 12 mesi e non si rinnova automaticamente.' },
    { q: 'Cosa succede se un intervento supera i limiti del piano?', a: 'La parte eccedente viene preventivata prima di procedere, con lo sconto sulla manodopera previsto dal piano. Nulla viene addebitato senza il tuo consenso.' },
    { q: 'Il piano cambia le garanzie sui lavori?', a: 'No. Le tutele previste dalla legge sui lavori eseguiti valgono sempre, con o senza un piano PRONTO+, e i difetti si possono segnalare in qualsiasi momento.' },
    { q: 'Se il listino cambia, cambia anche il mio piano?', a: 'No. Prezzo e condizioni restano quelli accettati al momento della sottoscrizione per tutta la durata del contratto.' },
    { q: 'Posso recedere dopo la sottoscrizione online?', a: 'Sì: il consumatore può recedere entro 14 giorni dalla conclusione del contratto, secondo le condizioni e il Codice del Consumo. Le modalità saranno indicate nelle condizioni approvate.' },
    { q: 'I prezzi includono l’IVA?', a: 'Sì, i prezzi indicati per le famiglie sono comprensivi di IVA al 22%.' }
  ];
  const overview = familyCategories
    .map((c) => `<tr><th scope="row"><a href="#piano-${c.id}" data-cat-link="${c.id}">${icon(c.icon, { size: 18 })}<span>${esc(c.name)}</span></a></th><td>${price(c.plans.essential.priceCents, `family-${c.id}-essential`)}</td><td>${price(c.plans.plus.priceCents, `family-${c.id}-plus`)}</td><td>${c.plans.essential.interventions} / ${c.plans.plus.interventions}</td></tr>`)
    .join('');
  const body = `
<section class="page-hero page-hero--service plus-hero" aria-labelledby="page-title">
  <div class="page-hero__media">${picture(null, 'pronto-plus/family/hero', { ...heroOpts, width: 1600, height: 900, eager: true, className: 'media--cover' })}</div>
  <div class="page-hero__overlay" aria-hidden="true"></div>
  <div class="container page-hero__inner">
    ${breadcrumb(crumbs)}
    <p class="page-hero__eyebrow"><span class="page-hero__icon page-hero__icon--sm">${icon('home', { size: 22 })}</span>Piani di assistenza annuali per la casa</p>
    <h1 id="page-title" class="page-hero__title"><span class="plus-word">PRONTO<span>+</span></span> Family</h1>
    <p class="page-hero__lead">Scegli l’area tecnica che ti interessa e il livello di servizio: interventi inclusi, condizioni chiare e un prezzo annuale fisso.</p>
    <div class="hero__actions">
      <a class="btn btn--primary btn--lg" href="#categorie">Scegli la categoria ${icon('arrow', { size: 20 })}</a>
      <a class="btn btn--outline-light btn--lg" href="/area-cliente/">Area cliente</a>
    </div>
  </div>
</section>

<section class="section section--light" id="presentazione" aria-labelledby="pres-title">
  <div class="container">
    ${statusNotice('family')}
    <div class="section-head" data-reveal>
      <p class="eyebrow">Come funziona</p>
      <h2 id="pres-title" class="section-title">Un piano per ogni esigenza della casa</h2>
      <p class="section-lead">PRONTO+ Family è organizzato in otto categorie, ognuna con due livelli. Puoi attivare una sola categoria o combinarne più di una per lo stesso immobile.</p>
    </div>
    <ol class="steps">
      <li class="step"><span class="step__n">01</span><h3>Scegli</h3><p>Categoria e livello, Essential o Plus, in base a cosa ti serve.</p></li>
      <li class="step"><span class="step__n">02</span><h3>Sottoscrivi</h3><p>Online dall’area cliente: condizioni e scheda del piano restano salvate.</p></li>
      <li class="step"><span class="step__n">03</span><h3>Attivazione</h3><p>Il piano parte solo dopo la conferma del pagamento e dura 12 mesi.</p></li>
      <li class="step"><span class="step__n">04</span><h3>Usa le prestazioni</h3><p>Richiedi gli interventi inclusi e controlla i residui dall’area cliente.</p></li>
    </ol>
  </div>
</section>

<section class="section section--ice" id="categorie" aria-labelledby="cat-title">
  <div class="container">
    <div class="section-head" data-reveal>
      <p class="eyebrow">Otto categorie</p>
      <h2 id="cat-title" class="section-title">Confronta Essential e Plus</h2>
    </div>
    <div class="cat-tabs" role="tablist" aria-label="Categorie PRONTO+ Family">
      ${familyCategories.map((c, i) => `<button class="cat-tabs__btn" role="tab" type="button" id="tab-${c.id}" aria-controls="piano-${c.id}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}">${icon(c.icon, { size: 18 })}<span>${esc(c.name)}</span></button>`).join('')}
    </div>
    <div class="cat-panels">${familyCategories.map(categoryPanel).join('')}</div>
  </div>
</section>

<section class="section section--white" id="prezzi" aria-labelledby="prezzi-title">
  <div class="container">
    <div class="section-head" data-reveal><p class="eyebrow">Listino provvisorio</p><h2 id="prezzi-title" class="section-title">Prezzi annuali</h2><p class="section-lead">Prezzi per famiglie, IVA inclusa. In attesa di conferma da parte del titolare.</p></div>
    <div class="table-wrap">
      <table class="compare-table compare-table--overview">
        <caption class="visually-hidden">Prezzi annuali di tutte le categorie PRONTO+ Family</caption>
        <thead><tr><th scope="col">Categoria</th><th scope="col">Essential</th><th scope="col">Plus</th><th scope="col">Interventi inclusi (E / P)</th></tr></thead>
        <tbody>${overview}</tbody>
      </table>
    </div>
  </div>
</section>

<section class="section section--light" id="regole" aria-labelledby="regole-title">
  <div class="container compare">
    <div class="compare__col" data-reveal>
      <h2 id="regole-title" class="section-title section-title--sm">Prestazioni e regole comuni</h2>
      <ul>${familyCommonRules.map((r) => `<li>${icon('check', { size: 18 })}<span>${esc(r)}</span></li>`).join('')}</ul>
    </div>
    <div class="compare__col compare__col--alt" data-reveal>
      <h2 class="section-title section-title--sm section-title--light">Esclusioni comuni</h2>
      <ul>${familyCommonExclusions.map((r) => `<li>${icon('close', { size: 18 })}<span>${esc(r)}</span></li>`).join('')}</ul>
    </div>
  </div>
</section>

<section class="legal-band" aria-labelledby="legal-title">
  <div class="container legal-band__inner">
    ${icon('shield', { size: 32 })}
    <div>
      <h2 id="legal-title">Le tue tutele di legge non dipendono da PRONTO+</h2>
      <p>${esc(LEGAL_PROTECTION_TEXT)}</p>
    </div>
  </div>
</section>

${faqSection(faq, { title: 'Domande frequenti su PRONTO+ Family' })}

<section class="cta-band" aria-label="Area cliente">
  <div class="container cta-band__inner">
    <div><h2>Gestisci piani e interventi dall’area cliente</h2><p>Contratti, prestazioni residue, certificati e richieste di assistenza in un unico posto.</p></div>
    <div class="cta-band__actions">
      <a class="btn btn--orange btn--lg" href="/area-cliente/">Vai all’area cliente</a>
      <a class="btn btn--outline-light btn--lg" href="/?categoria=pronto-plus-family#contatti">Richiedi informazioni</a>
    </div>
  </div>
</section>
${legalDraftLinks(['01-condizioni-pronto-plus-family', '03-reclami-e-segnalazioni', '04-informativa-privacy-area-clienti'])}`;

  return {
    path,
    html: page({
      title: 'PRONTO+ Family: assistenza per la casa',
      description: 'PRONTO+ Family: otto piani annuali di assistenza tecnica per la casa a Roma, Essential e Plus, con interventi inclusi e prezzi IVA inclusa.',
      path,
      jsonLd: [businessSchema(), breadcrumbSchema(crumbs), faqSchema(faq)],
      bodyClass: 'page-plus',
      attrs: ' style="--accent:#FF7824"',
      preload: imageUrl(null, 'pronto-plus/family/hero', heroOpts),
      body
    })
  };
}

/* ================================================================ LAVORO PROTETTO */

export function protectedWorkPage() {
  const path = PROTECTED_PATH;
  const crumbs = [{ name: 'Home', path: '/' }, { name: 'PRONTO+ Lavoro Protetto', path }];
  const heroOpts = { key: 'pronto-plus/lavoro-protetto/hero', alt: 'Controllo preventivo dopo un intervento tecnico', spec: { w: 1600, h: 900, iconName: 'shield', subject: 'Lavoro Protetto', accent: '#19C3E6', motif: 'radar', minimal: true } };
  const faq = [
    { q: 'Se non acquisto Lavoro Protetto perdo la garanzia sul lavoro?', a: 'No. Le tutele previste dalla legge sul lavoro eseguito restano tutte valide. Puoi segnalare un difetto dall’area cliente in qualsiasi momento, con o senza questo servizio.' },
    { q: 'È un’assicurazione?', a: 'No. Non copre danni futuri e non prevede risarcimenti: offre follow-up, visite preventive concordate e sconti sui lavori futuri, nei limiti del piano scelto.' },
    { q: 'Quando posso acquistarlo?', a: `Dopo un intervento, quando il certificato digitale è disponibile, entro ${protectedLimits.purchaseWindowDays} giorni. Nessun piano viene aggiunto o preselezionato automaticamente.` },
    { q: 'Il certificato digitale si paga?', a: 'No: il certificato digitale viene emesso per ogni intervento completato, indipendentemente dall’acquisto di servizi aggiuntivi.' },
    { q: 'Come prenoto una visita preventiva?', a: `Dall’area cliente, con almeno ${protectedLimits.bookingNoticeDays} giorni di preavviso. Le visite durano fino a ${protectedLimits.visitMaxMinutes} minuti e vengono scalate solo dopo l’esecuzione.` },
    { q: 'Posso recedere?', a: 'Sì, entro 14 giorni dall’acquisto, secondo le condizioni e il Codice del Consumo; se hai già usufruito di una prestazione è dovuto un importo proporzionato.' }
  ];
  const cards = protectedPlans
    .map((p) => `<article class="plan-card${p.id === 'plus' ? ' plan-card--plus' : ''}" aria-labelledby="pw-${p.id}">
      <header class="plan-card__head">
        <p class="plan-card__tier">Lavoro Protetto</p>
        <h3 id="pw-${p.id}">${esc(p.name)}</h3>
        <p class="plan-card__price"><span data-price>${price(p.priceCents, `protected-${p.id}`)}</span>${priceVisible(`protected-${p.id}`) ? '<small>una tantum, IVA inclusa</small>' : ''}</p>
        <p class="plan-card__vat">Durata del servizio: ${p.durationMonths} mesi</p>
      </header>
      <ul class="plan-card__list">${p.benefits.map((b) => `<li>${icon('check', { size: 18 })}<span>${esc(b)}</span></li>`).join('')}</ul>
      <p class="plan-card__note">Acquistabile dall’area cliente dopo un intervento.</p>
    </article>`)
    .join('');
  const steps = [
    ['Intervento completato', 'Il tecnico registra lavoro, materiali, note e foto autorizzate.'],
    ['Verifica', 'L’impresa controlla i dati prima di emettere il documento.'],
    ['Certificato digitale', 'Ricevi il certificato con QR code di verifica, per ogni intervento.'],
    ['Scelta facoltativa', 'Se ti interessa, valuti Lavoro Protetto con prezzi e condizioni chiari.'],
    ['Attivazione', 'Solo dopo la conferma sicura del pagamento.']
  ];
  const body = `
<section class="page-hero page-hero--service plus-hero" aria-labelledby="page-title" style="--accent:#19C3E6">
  <div class="page-hero__media">${picture(null, 'pronto-plus/lavoro-protetto/hero', { ...heroOpts, width: 1600, height: 900, eager: true, className: 'media--cover' })}</div>
  <div class="page-hero__overlay" aria-hidden="true"></div>
  <div class="container page-hero__inner">
    ${breadcrumb(crumbs)}
    <p class="page-hero__eyebrow"><span class="page-hero__icon page-hero__icon--sm">${icon('shield', { size: 22 })}</span>Assistenza facoltativa dopo l’intervento</p>
    <h1 id="page-title" class="page-hero__title"><span class="plus-word">PRONTO<span>+</span></span> Lavoro Protetto</h1>
    <p class="page-hero__lead">Follow-up, controlli preventivi e vantaggi sui lavori futuri, da aggiungere se vuoi dopo un intervento. Le tutele di legge restano sempre tue.</p>
    <div class="hero__actions">
      <a class="btn btn--primary btn--lg" href="#piani">Vedi i piani ${icon('arrow', { size: 20 })}</a>
      <a class="btn btn--outline-light btn--lg" href="/area-cliente/i-miei-interventi/">Segnala un difetto</a>
    </div>
  </div>
</section>

<section class="legal-band legal-band--top" aria-labelledby="tutele-title">
  <div class="container legal-band__inner">
    ${icon('shield', { size: 32 })}
    <div>
      <h2 id="tutele-title">Servizio facoltativo: non sostituisce le garanzie di legge</h2>
      <p>${esc(LEGAL_PROTECTION_TEXT)} Le segnalazioni di difetti si presentano <strong>anche senza</strong> acquistare Lavoro Protetto e anche dopo la sua scadenza.</p>
      <a class="legal-band__link" href="/area-cliente/i-miei-interventi/">Segnala un difetto dall’area cliente ${icon('arrow', { size: 16 })}</a>
    </div>
  </div>
</section>

<section class="section section--light" id="cos-e" aria-labelledby="cose-title">
  <div class="container compare">
    <div class="compare__col" data-reveal>
      <h2 id="cose-title" class="section-title section-title--sm">Cosa comprende</h2>
      <ul>
        <li>${icon('check', { size: 18 })}<span>Follow-up telefonico e promemoria di controllo</span></li>
        <li>${icon('check', { size: 18 })}<span>Visite preventive concordate, nei piani Plus e Premium</span></li>
        <li>${icon('check', { size: 18 })}<span>Sconti sulla manodopera di future manutenzioni ordinarie</span></li>
        <li>${icon('check', { size: 18 })}<span>Report e storico digitale dei controlli</span></li>
      </ul>
    </div>
    <div class="compare__col compare__col--alt" data-reveal>
      <h2 class="section-title section-title--sm section-title--light">Cosa non è</h2>
      <ul>${protectedExclusions.map((x) => `<li>${icon('close', { size: 18 })}<span>${esc(x)}</span></li>`).join('')}</ul>
    </div>
  </div>
</section>

<section class="section section--ice" id="piani" aria-labelledby="piani-title">
  <div class="container">
    ${statusNotice('protected')}
    <div class="section-head" data-reveal><p class="eyebrow">Listino provvisorio</p><h2 id="piani-title" class="section-title">Check, Plus e Premium</h2><p class="section-lead">Prezzi una tantum, IVA inclusa. Nessun piano è preselezionato: la scelta è tua e facoltativa.</p></div>
    <div class="plan-cards plan-cards--3">${cards}</div>
  </div>
</section>

<section class="section section--white process" id="processo" aria-labelledby="proc-title">
  <div class="container">
    <div class="section-head" data-reveal><p class="eyebrow">Dopo l’intervento</p><h2 id="proc-title" class="section-title">Come funziona</h2></div>
    <ol class="steps steps--5">${steps.map(([t, d], i) => `<li class="step"><span class="step__n">${String(i + 1).padStart(2, '0')}</span><h3>${t}</h3><p>${d}</p></li>`).join('')}</ol>
  </div>
</section>

<section class="section section--light" id="limiti" aria-labelledby="limiti-title">
  <div class="container">
    <div class="section-head" data-reveal><p class="eyebrow">Condizioni operative</p><h2 id="limiti-title" class="section-title">Limiti di zona, tempo e durata</h2></div>
    <dl class="limits">
      <div><dt>${icon('pin', { size: 20 })} Zona</dt><dd>${esc(protectedLimits.zonesNote)}</dd></div>
      <div><dt>${icon('clock', { size: 20 })} Durata visite</dt><dd>Fino a ${protectedLimits.visitMaxMinutes} minuti ciascuna</dd></div>
      <div><dt>${icon('layers', { size: 20 })} Giorni e orari</dt><dd>${esc(protectedLimits.visitWindow)}</dd></div>
      <div><dt>${icon('info', { size: 20 })} Preavviso</dt><dd>Almeno ${protectedLimits.bookingNoticeDays} giorni per prenotare una visita</dd></div>
    </dl>
    <h3 class="limits__sub">Listini specialistici</h3>
    <ul class="limits__special">${protectedSpecialistVariants.map((v) => `<li><strong>${esc(v.name)}</strong> — ${esc(v.note)}</li>`).join('')}</ul>
  </div>
</section>

<section class="section section--dark" id="certificato" aria-labelledby="cert-title">
  <div class="container overview">
    <div>
      <p class="eyebrow eyebrow--orange">Per ogni intervento</p>
      <h2 id="cert-title" class="section-title section-title--light">Certificato digitale di intervento</h2>
      <p class="section-lead section-lead--light">Un documento in PDF con numero univoco, descrizione del lavoro, materiali, note e QR code di verifica. È emesso per ogni intervento completato, con o senza servizi aggiuntivi. Non è una dichiarazione di conformità né una certificazione tecnica obbligatoria.</p>
      <a class="btn btn--orange" href="/certificato/">Verifica un certificato</a>
    </div>
  </div>
</section>

${faqSection(faq, { title: 'Domande frequenti su Lavoro Protetto' })}
${legalDraftLinks(['02-condizioni-lavoro-protetto', '03-reclami-e-segnalazioni', '04-informativa-privacy-area-clienti'])}`;

  return {
    path,
    html: page({
      title: 'PRONTO+ Lavoro Protetto dopo l’intervento',
      description: 'PRONTO+ Lavoro Protetto: servizio facoltativo di follow-up, controlli preventivi e sconti dopo un intervento. Non sostituisce le garanzie di legge.',
      path,
      jsonLd: [businessSchema(), breadcrumbSchema(crumbs), faqSchema(faq)],
      bodyClass: 'page-plus',
      attrs: ' style="--accent:#19C3E6"',
      preload: imageUrl(null, 'pronto-plus/lavoro-protetto/hero', heroOpts),
      body
    })
  };
}

/* ================================================================ BOZZE CONDIZIONI (solo anteprima) */

const LEGAL_DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../docs/legale');
const LEGAL_TITLES = {
  '01-condizioni-pronto-plus-family': 'Condizioni PRONTO+ Family',
  '02-condizioni-lavoro-protetto': 'Condizioni Lavoro Protetto',
  '03-reclami-e-segnalazioni': 'Reclami e segnalazioni',
  '04-informativa-privacy-area-clienti': 'Informativa privacy area clienti'
};

function legalDraftLinks(ids) {
  if (commerce.termsUrl) return `<p class="container legal-links"><a href="${esc(commerce.termsUrl)}">Condizioni contrattuali</a></p>`;
  if (isProduction()) return '';
  return `<aside class="container legal-links" aria-label="Bozze delle condizioni">
    <p><strong>Solo anteprima:</strong> bozze delle condizioni in revisione legale —
    ${ids.map((id) => `<a href="/condizioni-bozza/${id}/">${LEGAL_TITLES[id]}</a>`).join(' · ')}</p>
  </aside>`;
}

/** Markdown minimale (titoli, paragrafi, elenchi, tabelle, citazioni, grassetto, codice). */
export function miniMarkdown(md) {
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<mark>$1</mark>');
  const out = [];
  const lines = md.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (!l.trim()) continue;
    let m;
    if ((m = l.match(/^(#{1,3}) (.*)/))) { const lv = m[1].length; out.push(`<h${lv}>${inline(m[2])}</h${lv}>`); continue; }
    if (l.startsWith('> ')) { out.push(`<blockquote>${inline(l.slice(2))}</blockquote>`); continue; }
    if (l.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      i--;
      const cells = (r) => r.split('|').slice(1, -1).map((c) => c.trim());
      const [h, , ...b] = rows;
      out.push(`<div class="table-wrap"><table class="compare-table"><thead><tr>${cells(h).map((c) => `<th scope="col">${inline(c)}</th>`).join('')}</tr></thead><tbody>${b.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    if (l.startsWith('- ')) {
      const items = [];
      while (i < lines.length && lines[i].startsWith('- ')) items.push(lines[i++].slice(2));
      i--;
      out.push(`<ul>${items.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>`);
      continue;
    }
    out.push(`<p>${inline(l)}</p>`);
  }
  return out.join('\n');
}

export async function legalDraftPages() {
  const pages = [];
  for (const id of Object.keys(LEGAL_TITLES)) {
    const md = await fs.readFile(path.join(LEGAL_DIR, `${id}.md`), 'utf8');
    const p = `/condizioni-bozza/${id}/`;
    let html = miniMarkdown(md);
    html = html.replace(/^<h1>[\s\S]*?<\/h1>/, ''); // il titolo del file diventa l'H1 della pagina
    pages.push({
      path: p,
      noindex: true,
      devOnly: true,
      html: page({
        title: `${LEGAL_TITLES[id]} (bozza)`,
        description: `${LEGAL_TITLES[id]}: bozza in revisione legale, non vincolante e non pubblicata.`,
        path: p,
        bodyClass: 'page-simple',
        body: `<section class="section section--light simple-page legal-doc"><div class="container container--narrow">
          ${breadcrumb([{ name: 'Home', path: '/' }, { name: 'Bozze condizioni', path: p }])}
          <p class="eyebrow">Bozza · solo anteprima · non vincolante</p>
          <h1 class="section-title">${LEGAL_TITLES[id]}</h1>
          ${html}
        </div></section>`
      })
    });
  }
  return pages;
}
