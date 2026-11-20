/**
 * Pagine applicative (aree riservate e verifica certificato).
 * Sempre noindex, escluse dalla sitemap. La logica è in src/scripts/app/*.js.
 * Senza backend configurato le pagine mostrano lo stato "non ancora attiva".
 */
import { page, breadcrumb } from '../components/layout.js';
import { esc } from '../components/utils.js';
import { backend, commerce } from '../config/site.config.js';
import { ctx } from '../components/context.js';

const appConfig = () =>
  `<script type="application/json" id="app-config">${JSON.stringify({ supabaseUrl: backend.supabaseUrl, supabaseAnonKey: backend.supabaseAnonKey, salesEnabled: commerce.salesEnabled, termsUrl: commerce.termsUrl || '', flags: ctx.flags || {} }).replace(/</g, '\\u003c')}</script>`;

const APPS = [
  { path: '/area-cliente/', title: 'Area cliente', h: 'Area cliente', script: 'cliente', view: 'panoramica', desc: 'Accesso all’area cliente di Pronto Intervento Roma: piani PRONTO+, interventi e certificati.' },
  { path: '/area-cliente/i-miei-interventi/', title: 'I miei interventi', h: 'I miei interventi', script: 'cliente', view: 'interventi', desc: 'I tuoi interventi, i certificati digitali e le richieste di assistenza.' },
  { path: '/area-cliente/pagamento/', title: 'Esito del pagamento', h: 'Pagamento', script: 'cliente', view: 'pagamento', desc: 'Verifica dell’esito del pagamento dei servizi PRONTO+: attivazione solo dopo conferma.' },
  { path: '/admin/', title: 'Dashboard amministrativa', h: 'Dashboard', script: 'admin', view: 'admin', desc: 'Pannello amministrativo riservato di Pronto Intervento Roma: listini, clienti e interventi.' },
  { path: '/area-business/', title: 'Area Business', h: 'Area Business', script: 'business', view: 'business', desc: 'Area riservata alle aziende clienti PRONTO+: sedi, contratti, richieste di intervento, documenti e scadenze.' },
  { path: '/area-tecnico/', title: 'Area tecnico', h: 'Area tecnico', script: 'tecnico', view: 'tecnico', desc: 'Area riservata ai tecnici: interventi assegnati, rapporti di lavoro e controlli preventivi.' },
  { path: '/checkout/', title: 'Riepilogo e pagamento', h: 'Riepilogo e pagamento', script: 'checkout', view: 'checkout', desc: 'Riepilogo dell’acquisto PRONTO+ e pagamento sicuro tramite myPOS.' },
  { path: '/paga/', title: 'Pagamento richiesto', h: 'Pagamento', script: 'paga', view: 'paga', desc: 'Pagamento sicuro di un intervento o servizio richiesto da Pronto Intervento Roma.' },
  { path: '/pagamento/verifica/', title: 'Verifica del pagamento', h: 'Verifica del pagamento', script: 'pagamento', view: 'verifica', desc: 'Verifica dell’esito del pagamento PRONTO+: lo stato è confermato solo dopo il controllo della transazione.' },
  { path: '/pagamento/in-attesa/', title: 'Pagamento in attesa', h: 'Pagamento in attesa', script: 'pagamento', view: 'in-attesa', desc: 'Pagamento in attesa di conferma: il servizio si attiva solo dopo la verifica della transazione.' },
  { path: '/pagamento/confermato/', title: 'Pagamento confermato', h: 'Pagamento confermato', script: 'pagamento', view: 'confermato', desc: 'Pagamento confermato dopo la verifica della transazione: ricevuta e stato del servizio acquistato.' },
  { path: '/pagamento/annullato/', title: 'Pagamento annullato', h: 'Pagamento annullato', script: 'pagamento', view: 'annullato', desc: 'Pagamento annullato sulla pagina myPOS: nessun addebito confermato e nessun servizio attivato.' },
  { path: '/pagamento/non-riuscito/', title: 'Pagamento non riuscito', h: 'Pagamento non riuscito', script: 'pagamento', view: 'non-riuscito', desc: 'Pagamento non riuscito: nessun importo incassato e nessun servizio attivato, puoi riprovare.' },
  { path: '/certificato/', title: 'Verifica certificato di intervento', h: 'Verifica un certificato', script: 'certificato', view: 'verifica', desc: 'Verifica pubblica dei certificati digitali di intervento di Pronto Intervento Roma.' },
  // Prompt 5 — centrale operativa
  { path: '/area-cliente/richieste/', title: 'Richieste di intervento', h: 'Richieste di intervento', script: 'cliente', view: 'richieste', desc: 'Invia una richiesta di intervento, segui lo stato, accetta preventivi e scarica i rapporti.' },
  { path: '/admin/centrale-operativa/', title: 'Centrale operativa', h: 'Centrale operativa', script: 'centrale', view: 'centrale', ops: true, desc: 'Centrale operativa riservata: richieste, stati, assegnazioni, rapporti, costi e statistiche.' },
  { path: '/admin/calendario/', title: 'Calendario interventi', h: 'Calendario interventi', script: 'calendario', view: 'calendario', ops: true, desc: 'Calendario riservato degli interventi, sopralluoghi, manutenzioni e controlli.' },
  { path: '/admin/tecnici/', title: 'Gestione tecnici', h: 'Gestione tecnici', script: 'tecnici', view: 'tecnici', ops: true, desc: 'Gestione riservata dei tecnici: specializzazioni, zone, disponibilità, abilitazioni e accessi.' },
  { path: '/tecnico/', title: 'Area tecnico', h: 'Area tecnico', script: 'tecnico-mobile', view: 'tecnico', ops: true, mobile: true, desc: 'Area riservata ai tecnici, da smartphone: lavori assegnati, ore, materiali, foto e rapporto di intervento.' },
  // Prompt 6 — PRONTO AI
  { path: '/admin/pronto-ai/', title: 'PRONTO AI', h: 'PRONTO AI', script: 'pronto-ai', view: 'pronto-ai', ops: true, desc: 'PRONTO AI riservato: assistenti AI, azioni da approvare, automazioni, knowledge base, costi e sicurezza.' },
  // Prompt 7 — PRONTO SEO
  { path: '/admin/seo/', title: 'PRONTO SEO', h: 'PRONTO SEO', script: 'pronto-seo', view: 'pronto-seo', ops: true, desc: 'PRONTO SEO riservato: Search Console, pagine, ricerche, Google Business Profile, conversioni, proposte SEO e report.' },
  // Prompt 9 — attivazione operativa (solo amministratori; i permessi sono verificati dal database)
  { path: '/admin/configurazione-azienda/', title: 'Configurazione azienda', h: 'Configurazione azienda', script: 'attivazione', view: 'configurazione-azienda', ops: true, desc: 'Configurazione riservata dei dati aziendali: dati pubblici verificati e dati riservati.' },
  { path: '/admin/setup/', title: 'Setup della piattaforma', h: 'Setup', script: 'attivazione', view: 'setup', ops: true, desc: 'Wizard riservato di configurazione: dati, contatti, servizi, zone, prezzi, Supabase, myPOS, email, Search Console, documenti legali e test.' },
  { path: '/admin/impostazioni/pagamenti/', title: 'Impostazioni pagamenti', h: 'Pagamenti', script: 'attivazione', view: 'pagamenti', ops: true, desc: 'Impostazioni riservate dei pagamenti myPOS: configurazione, prova di connessione e prova completa in sandbox.' },
  { path: '/admin/funzionalita/', title: 'Funzionalità', h: 'Funzionalità', script: 'attivazione', view: 'funzionalita', ops: true, desc: 'Interruttori riservati delle funzionalità della piattaforma, con controllo lato server.' },
  { path: '/admin/lancio/', title: 'Lancio GO / NO-GO', h: 'Lancio', script: 'attivazione', view: 'lancio', ops: true, desc: 'Cruscotto riservato GO / NO-GO per il sito pubblico e per la piattaforma transazionale.' },
  { path: '/recensioni/rinuncia/', title: 'Rinuncia alle richieste di recensione', h: 'Rinuncia alle richieste di recensione', script: 'recensioni-rinuncia', view: 'rinuncia', desc: 'Conferma della rinuncia a ricevere richieste di recensione da Pronto Intervento Roma.' },
  { path: '/rapporto/', title: 'Verifica rapporto di intervento', h: 'Verifica un rapporto', script: 'rapporto', view: 'verifica', desc: 'Verifica pubblica dei rapporti di intervento di Pronto Intervento Roma: solo dati non personali.' }
];

export const APP_PATHS = APPS.map((a) => a.path);

export default function appPages() {
  return APPS.map((a) => ({
    path: a.path,
    noindex: true,
    app: true,
    html: page({
      title: a.title,
      description: a.desc,
      path: a.path,
      robots: 'noindex, nofollow',
      bodyClass: `page-app page-app--${a.script}`,
      extraHead: `${appConfig()}\n  ${a.ops || a.script === 'cliente' ? '<link rel="stylesheet" href="/assets/css/ops.css">\n  ' : ''}<script type="module" src="/assets/js/app/${a.script}.js"></script>\n`,
      body: `<section class="section section--ice app-section${a.ops ? ' ops-section' : ''}${a.mobile ? ' tm-section' : ''}">
  <div class="container${['admin', 'business'].includes(a.script) || (a.ops && !a.mobile) ? ' container--wide' : ''}${['checkout', 'paga', 'pagamento'].includes(a.script) ? ' co-container' : ''}${a.mobile ? ' tm-container' : ''}">
    ${a.view === 'verifica' && a.script !== 'pagamento' ? `${breadcrumb([{ name: 'Home', path: '/' }, { name: a.h, path: a.path }])}
    <p class="eyebrow">${a.script === 'rapporto' ? 'Rapporto di intervento' : 'Certificato digitale di intervento'}</p>
    <h1 class="section-title">${esc(a.h)}</h1>
    <p class="section-lead">Inserisci il numero riportato sul documento o inquadra il QR code. La verifica mostra solo dati non personali.</p>` : ''}
    <div id="app" data-view="${a.view}" class="app-root" aria-live="polite">
      <noscript><p>Per usare quest’area è necessario JavaScript.</p></noscript>
      ${a.view === 'verifica' && a.script !== 'pagamento' ? '' : `<h1 class="section-title">${esc(a.h)}</h1>`}
      <p class="app-muted">Caricamento…</p>
    </div>
  </div>
</section>`
    })
  }));
}
