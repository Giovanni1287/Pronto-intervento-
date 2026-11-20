/**
 * SCHEDE EDITORIALI SEO (Prompt 7) — una per ogni categoria e landing pubblicata.
 * Keyword e intenti sono PROPOSTE da verificare con i dati reali di Search Console:
 * non derivano da strumenti di stima dei volumi né da scraping dei risultati Google.
 * `toConfirm`: dati tecnici o aziendali che il titolare deve confermare prima di
 * citarli nei testi (le pagine oggi non li dichiarano).
 * `lastReviewed` alimenta anche il <lastmod> della sitemap.
 */
const REVIEW = '2026-11-18';
const PHOTOS = 'Fotografie reali con licenza (oggi segnaposto)';

const e = (keyword, intent, secondary, toConfirm = [], extra = {}) => ({ keyword, intent, secondary, status: 'pubblicata', lastReviewed: REVIEW, toConfirm: [PHOTOS, ...toConfirm], ...extra });

export const editorial = {
  // ---------------------------------------------------------------- pagine generali
  '/': e('pronto intervento Roma', 'Navigazionale/commerciale: trovare un’impresa di assistenza tecnica a Roma', ['assistenza tecnica casa Roma', 'tecnico urgente Roma'], ['Contatti, orari e dati aziendali']),
  '/servizi/': e('servizi assistenza tecnica Roma', 'Informativo/commerciale: panoramica dei servizi', ['manutenzione casa Roma']),
  '/piani-assistenza/famiglie/': e('abbonamento assistenza casa Roma', 'Commerciale: valutare un piano di assistenza', ['PRONTO+ Family'], ['Prezzi e prestazioni approvati dal titolare', 'Condizioni verificate da un legale']),
  '/lavoro-protetto/': e('garanzia intervento idraulico', 'Commerciale: copertura dopo un intervento', ['PRONTO+ Lavoro Protetto'], ['Condizioni verificate da un legale']),
  '/piani-assistenza/business/': e('manutenzione aziende Roma', 'Commerciale B2B: contratti di manutenzione', ['manutenzione condomini Roma', 'facility maintenance Roma'], ['Tariffe B2B approvate']),
  '/hotel-e-strutture-ricettive/': e('manutenzione hotel Roma', 'Commerciale B2B: assistenza tecnica per strutture ricettive', ['assistenza tecnica hotel', 'manutenzione B&B Roma']),
  '/corporate/': e('manutenzione aziende multisede', 'Commerciale B2B: gestione centralizzata più sedi', ['global service manutenzione']),

  // ---------------------------------------------------------------- categorie
  '/servizi/idraulica/': e('idraulico spurghi Roma', 'Commerciale locale: risolvere problemi di scarichi', ['spurgo Roma', 'disostruzione scarichi Roma'], ['Mezzi autospurgo e canal-jet effettivamente disponibili']),
  '/servizi/elettrica/': e('elettricista Roma', 'Commerciale locale: guasti e impianti elettrici', ['impianti elettrici Roma', 'guasto elettrico Roma'], ['Abilitazione DM 37/2008 e dichiarazioni di conformità']),
  '/servizi/ricerca-perdite-occulte/': e('ricerca perdite occulte Roma', 'Commerciale locale: localizzare una perdita senza demolire', ['ricerca perdite acqua Roma', 'perdita occulta'], ['Strumentazione posseduta (geofono, termocamera, gas tracciante)']),
  '/servizi/allagamenti/': e('svuotamento locali allagati Roma', 'Commerciale urgente: rimuovere acqua da locali', ['aspirazione acqua cantina Roma'], ['Disponibilità di pompe e mezzi', 'Fasce orarie di intervento']),
  '/servizi/muratura/': e('riparazioni murarie Roma', 'Commerciale locale: lavori edili di piccola entità', ['piccole ristrutturazioni Roma']),
  '/servizi/disinfestazioni/': e('disinfestazione Roma', 'Commerciale locale: eliminare infestanti', ['derattizzazione Roma'], ['Requisiti e qualifiche per i trattamenti con biocidi']),

  // ---------------------------------------------------------------- idraulica
  '/servizi/idraulica/disostruzione-scarichi-canal-jet/': e('disostruzione scarichi Roma', 'Commerciale: liberare scarichi e colonne intasate', ['canal jet Roma', 'colonna di scarico intasata'], ['Unità canal-jet disponibili']),
  '/servizi/idraulica/spurgo-fognature/': e('spurgo fognature Roma', 'Commerciale: svuotare fosse e pozzetti', ['spurgo fosse biologiche Roma', 'autospurgo Roma'], ['Autorizzazioni al trasporto e smaltimento dei rifiuti']),
  '/servizi/idraulica/spurgo-lavandini/': e('lavandino intasato Roma', 'Commerciale urgente: sbloccare un lavello o lavandino', ['spurgo lavandino', 'lavello cucina otturato']),
  '/servizi/idraulica/videoispezione-tubature/': e('videoispezione tubature Roma', 'Commerciale: diagnosticare un problema negli scarichi', ['videoispezione fognature', 'ispezione telecamera tubi'], ['Attrezzatura di videoispezione e formato del report']),
  '/servizi/idraulica/fresatura-colonne-tubazioni/': e('fresatura colonne di scarico', 'Commerciale: rimuovere incrostazioni dure', ['fresatura tubazioni Roma']),

  // ---------------------------------------------------------------- elettrica
  '/servizi/elettrica/riparazione-impianti-elettrici/': e('riparazione impianto elettrico Roma', 'Commerciale: riparare prese, linee e punti luce', ['elettricista riparazioni Roma'], ['Abilitazione DM 37/2008']),
  '/servizi/elettrica/guasti-corto-circuiti/': e('salta la corrente cosa fare', 'Informativo/urgente: capire e risolvere un guasto', ['corto circuito casa', 'salvavita scatta'], ['Abilitazione DM 37/2008']),
  '/servizi/elettrica/quadri-elettrici/': e('quadro elettrico Roma', 'Commerciale: sostituire o adeguare il quadro', ['sostituzione quadro elettrico'], ['Abilitazione DM 37/2008 e dichiarazione di conformità']),
  '/servizi/elettrica/rifacimento-impianti-elettrici/': e('rifacimento impianto elettrico Roma', 'Commerciale: rifare l’impianto di un’abitazione', ['impianto elettrico nuovo appartamento'], ['Abilitazione DM 37/2008 e dichiarazione di conformità']),

  // ---------------------------------------------------------------- ricerca perdite
  '/servizi/ricerca-perdite-occulte/gas-tracciante/': e('ricerca perdite gas tracciante', 'Commerciale/informativo: metodo con gas tracciante', ['perdita impianto riscaldamento'], ['Strumentazione posseduta']),
  '/servizi/ricerca-perdite-occulte/geofono/': e('ricerca perdite geofono', 'Commerciale/informativo: metodo acustico', ['ricerca perdite acqua acustica'], ['Strumentazione posseduta']),
  '/servizi/ricerca-perdite-occulte/termografia/': e('termografia perdite acqua', 'Commerciale/informativo: metodo termografico', ['termocamera perdita riscaldamento a pavimento'], ['Strumentazione posseduta']),
  '/servizi/ricerca-perdite-occulte/ricerca-perdite-tubazioni-scarico/': e('perdita tubo di scarico', 'Commerciale: infiltrazioni da scarichi', ['infiltrazione vicino di sotto']),
  '/servizi/ricerca-perdite-occulte/ricerca-perdite-tubazioni-pressione/': e('perdita acqua bolletta alta', 'Commerciale/informativo: perdite su tubazioni in pressione', ['contatore acqua gira', 'caldaia perde pressione']),

  // ---------------------------------------------------------------- allagamenti
  '/servizi/allagamenti/svuotamenti-post-alluvionali/': e('svuotamento acqua dopo alluvione', 'Urgente: rimuovere acqua e fango dopo un evento meteo', ['cantina allagata dopo temporale']),
  '/servizi/allagamenti/svuotamenti-locali/': e('svuotamento cantina allagata Roma', 'Urgente: aspirare acqua da cantine, box e magazzini', ['aspirazione acqua garage']),

  // ---------------------------------------------------------------- muratura
  '/servizi/muratura/piccole-ristrutturazioni/': e('piccole ristrutturazioni Roma', 'Commerciale: lavori edili limitati', ['ristrutturazione parziale appartamento']),
  '/servizi/muratura/riparazioni-murarie/': e('riparazioni murarie Roma', 'Commerciale: crepe, intonaci, ripristini', ['ripristino intonaco']),
  '/servizi/muratura/imbiancatura/': e('imbianchino Roma', 'Commerciale: tinteggiatura di interni', ['tinteggiatura appartamento Roma']),
  '/servizi/muratura/cartongesso/': e('cartongesso Roma', 'Commerciale: pareti e controsoffitti', ['controsoffitto cartongesso']),
  '/servizi/muratura/rifacimento-bagni/': e('rifacimento bagno Roma', 'Commerciale: rifare il bagno', ['ristrutturazione bagno Roma']),

  // ---------------------------------------------------------------- disinfestazioni
  '/servizi/disinfestazioni/disinfestazioni-insetti/': e('disinfestazione scarafaggi Roma', 'Commerciale: eliminare insetti infestanti', ['disinfestazione blatte', 'disinfestazione formiche'], ['Qualifiche e prodotti biocidi autorizzati']),
  '/servizi/disinfestazioni/derattizzazione/': e('derattizzazione Roma', 'Commerciale: eliminare topi e ratti', ['topi in casa cosa fare'], ['Qualifiche e prodotti biocidi autorizzati']),
  '/servizi/disinfestazioni/disinfestazione-pulci-zecche-cimici/': e('cimici dei letti Roma', 'Commerciale urgente: eliminare cimici, pulci o zecche', ['disinfestazione cimici letto'], ['Qualifiche e prodotti biocidi autorizzati'])
};

export const EDITORIAL_STATUSES = { bozza: 'Bozza', revisione: 'In revisione', pubblicata: 'Pubblicata', da_aggiornare: 'Da aggiornare' };
