/**
 * CATALOGO SERVIZI — 6 categorie, 24 sottocategorie.
 * ------------------------------------------------------------------
 * Modello dati unico usato da homepage, pagine categoria, sitemap,
 * Schema.org e (in futuro) dalle 24 landing page del Prompt 1.
 *
 * Campi sottocategoria:
 *  - slug           URL futuro: /servizi/<categoria>/<slug>/
 *  - name           Nome commerciale
 *  - summary        Descrizione breve originale
 *  - landingReady   true se la landing dedicata viene generata (contenuti in src/data/content/).
 *                   Il build NON genera link verso landing con landingReady=false.
 *
 * Campi categoria aggiuntivi:
 *  - accent / motif  colore d'accento e motivo grafico che distinguono la categoria
 *  - keywords       Parole chiave di riferimento per la futura landing
 */

export const categories = [
  {
    slug: 'idraulica',
    accent: '#006BE6',
    motif: 'pipes',
    name: 'Idraulica',
    icon: 'wrench',
    tagline: 'Scarichi, tubazioni e spurghi',
    summary:
      'Disostruzione di scarichi, spurghi e controlli delle tubazioni con attrezzature professionali, per abitazioni, condomini e attività commerciali.',
    intro:
      'Gli impianti idraulici e di scarico lavorano ogni giorno senza che ce ne accorgiamo, finché qualcosa si blocca. Interveniamo per individuare la causa del problema e ripristinare il corretto deflusso, scegliendo la tecnica più adatta al tipo di tubazione.',
    image: { src: null, alt: 'Tecnico idraulico al lavoro su una tubazione di scarico', license: '', credit: '' },
    subcategories: [
      {
        slug: 'disostruzione-scarichi-canal-jet',
        name: 'Disostruzione scarichi canal-jet',
        summary: 'Acqua ad alta pressione per rimuovere ostruzioni, grassi e sedimenti dalle condotte di scarico.',
        keywords: ['canal jet roma', 'disostruzione scarichi roma'],
        landingReady: true
      },
      {
        slug: 'spurgo-fognature',
        name: 'Spurgo fognature',
        summary: 'Svuotamento e pulizia di fosse, pozzetti e condotte fognarie con mezzi di aspirazione.',
        keywords: ['spurgo fognature roma', 'autospurgo roma'],
        landingReady: true
      },
      {
        slug: 'spurgo-lavandini',
        name: 'Spurgo lavandini',
        summary: 'Liberazione di lavandini, lavelli e sifoni intasati, con verifica del tratto di scarico a valle.',
        keywords: ['lavandino intasato roma', 'spurgo lavandini roma'],
        landingReady: true
      },
      {
        slug: 'videoispezione-tubature',
        name: 'Videoispezione tubature',
        summary: 'Telecamera robotizzata all\'interno delle condotte per vedere ostruzioni, rotture e radici senza demolire.',
        keywords: ['videoispezione tubature roma', 'videoispezione fognature'],
        landingReady: true
      },
      {
        slug: 'fresatura-colonne-tubazioni',
        name: 'Fresatura colonne e tubazioni',
        summary: 'Fresatura meccanica di incrostazioni calcaree e depositi tenaci nelle colonne di scarico.',
        keywords: ['fresatura colonne scarico roma', 'fresatura tubazioni'],
        landingReady: true
      }
    ]
  },
  {
    slug: 'elettrica',
    accent: '#FFB020',
    motif: 'circuit',
    name: 'Elettrica',
    icon: 'bolt',
    tagline: 'Guasti, quadri e impianti',
    summary:
      'Ricerca guasti, riparazioni e adeguamento di impianti e quadri elettrici, con attenzione alla sicurezza di persone e apparecchiature.',
    intro:
      'Un salvavita che scatta, una presa che non funziona, un quadro datato: dietro ogni anomalia elettrica c\'è una causa precisa da trovare. Verifichiamo l\'impianto e proponiamo la soluzione più sicura, dalla piccola riparazione al rifacimento.',
    image: { src: null, alt: 'Elettricista al lavoro su un quadro elettrico', license: '', credit: '' },
    subcategories: [
      {
        slug: 'riparazione-impianti-elettrici',
        name: 'Riparazione impianti elettrici',
        summary: 'Ripristino di linee, prese, punti luce e componenti danneggiati o non funzionanti.',
        keywords: ['elettricista roma', 'riparazione impianto elettrico roma'],
        landingReady: true
      },
      {
        slug: 'guasti-corto-circuiti',
        name: 'Guasti e corto circuiti',
        summary: 'Individuazione della linea in guasto e messa in sicurezza dopo scatti del differenziale o corto circuiti.',
        keywords: ['corto circuito roma', 'salvavita che scatta'],
        landingReady: true
      },
      {
        slug: 'quadri-elettrici',
        name: 'Quadri elettrici',
        summary: 'Sostituzione, ampliamento e riordino di quadri elettrici con dispositivi di protezione adeguati.',
        keywords: ['quadro elettrico roma', 'sostituzione quadro elettrico'],
        landingReady: true
      },
      {
        slug: 'rifacimento-impianti-elettrici',
        name: 'Rifacimento impianti elettrici',
        summary: 'Rifacimento parziale o completo di impianti obsoleti, in abitazioni e locali commerciali.',
        keywords: ['rifacimento impianto elettrico roma'],
        landingReady: true
      }
    ]
  },
  {
    slug: 'ricerca-perdite-occulte',
    accent: '#19C3E6',
    motif: 'radar',
    name: 'Ricerca perdite occulte',
    icon: 'radar',
    tagline: 'Diagnosi strumentale non invasiva',
    summary:
      'Localizzazione di perdite d\'acqua nascoste in pavimenti e pareti con strumenti di diagnosi, per limitare le demolizioni al punto esatto.',
    intro:
      'Bollette in aumento, macchie di umidità, infiltrazioni al piano di sotto: spesso la perdita non si vede. La ricerca strumentale combina più tecnologie per restringere l\'area e indicare dove intervenire, evitando di rompere alla cieca.',
    image: { src: null, alt: 'Tecnico che utilizza una termocamera per individuare una perdita', license: '', credit: '' },
    subcategories: [
      {
        slug: 'gas-tracciante',
        name: 'Gas tracciante',
        summary: 'Immissione di una miscela di gas inerte nella tubazione e rilevazione del punto di fuoriuscita.',
        keywords: ['ricerca perdite gas tracciante roma'],
        landingReady: true
      },
      {
        slug: 'geofono',
        name: 'Geofono',
        summary: 'Ascolto amplificato del rumore prodotto dall\'acqua in pressione che fuoriesce dalla tubazione.',
        keywords: ['ricerca perdite geofono roma'],
        landingReady: true
      },
      {
        slug: 'termografia',
        name: 'Termografia',
        summary: 'Lettura delle differenze di temperatura sulle superfici per individuare umidità e tubazioni in perdita.',
        keywords: ['termografia perdite acqua roma'],
        landingReady: true
      },
      {
        slug: 'ricerca-perdite-tubazioni-scarico',
        name: 'Ricerca perdite tubazioni di scarico',
        summary: 'Verifica delle condotte di scarico con prove dedicate e videoispezione per trovare rotture e infiltrazioni.',
        keywords: ['perdita tubo di scarico roma'],
        landingReady: true
      },
      {
        slug: 'ricerca-perdite-tubazioni-pressione',
        name: 'Ricerca perdite tubazioni in pressione',
        summary: 'Prove di tenuta e localizzazione su impianti idrici e di riscaldamento sotto pressione.',
        keywords: ['perdita acqua sotto pavimento roma', 'prova di tenuta impianto'],
        landingReady: true
      }
    ]
  },
  {
    slug: 'allagamenti',
    accent: '#3D8BFF',
    motif: 'waves',
    name: 'Allagamenti',
    icon: 'flood',
    tagline: 'Svuotamenti e ripristino',
    summary:
      'Aspirazione e svuotamento di cantine, box, scantinati e locali allagati, dopo piogge intense o guasti agli impianti.',
    intro:
      'Quando l\'acqua invade un locale, ogni ora conta per limitare i danni a pavimenti, muri e beni custoditi. Organizziamo lo svuotamento con pompe e mezzi adeguati al volume d\'acqua e alle dimensioni dell\'ambiente.',
    image: { src: null, alt: 'Pompa per lo svuotamento di un locale allagato', license: '', credit: '' },
    subcategories: [
      {
        slug: 'svuotamenti-post-alluvionali',
        name: 'Svuotamenti post alluvionali',
        summary: 'Rimozione di acqua e fango da locali interrati e piani terra dopo eventi meteo estremi.',
        keywords: ['svuotamento cantina allagata roma', 'alluvione roma'],
        landingReady: true
      },
      {
        slug: 'svuotamenti-locali',
        name: 'Svuotamenti locali di piccole e grandi dimensioni',
        summary: 'Svuotamento di cantine, box, magazzini, autorimesse e ambienti di grandi superfici.',
        keywords: ['svuotamento locali allagati roma', 'aspirazione acqua roma'],
        landingReady: true
      }
    ]
  },
  {
    slug: 'muratura',
    accent: '#E08A4F',
    motif: 'bricks',
    name: 'Muratura',
    icon: 'brick',
    tagline: 'Riparazioni e piccole ristrutturazioni',
    summary:
      'Ripristini murari dopo gli interventi tecnici, piccole ristrutturazioni, imbiancature, cartongesso e rifacimento bagni.',
    intro:
      'Dopo una riparazione dietro un muro o sotto un pavimento serve chiudere e rifinire a regola d\'arte. Ci occupiamo anche di lavori edili di piccola e media entità, coordinando le lavorazioni per ridurre i tempi.',
    image: { src: null, alt: 'Muratore che rifinisce una parete in cantiere', license: '', credit: '' },
    subcategories: [
      {
        slug: 'piccole-ristrutturazioni',
        name: 'Piccole ristrutturazioni',
        summary: 'Interventi edili mirati su singoli ambienti di abitazioni, uffici e negozi.',
        keywords: ['piccole ristrutturazioni roma'],
        landingReady: true
      },
      {
        slug: 'riparazioni-murarie',
        name: 'Riparazioni murarie',
        summary: 'Chiusura tracce, ripristino di intonaci e pavimenti dopo riparazioni idrauliche o elettriche.',
        keywords: ['riparazioni murarie roma', 'ripristino intonaco'],
        landingReady: true
      },
      {
        slug: 'imbiancatura',
        name: 'Imbiancatura',
        summary: 'Tinteggiatura di interni con preparazione delle superfici e trattamenti per l\'umidità.',
        keywords: ['imbianchino roma', 'tinteggiatura appartamento roma'],
        landingReady: true
      },
      {
        slug: 'cartongesso',
        name: 'Cartongesso',
        summary: 'Pareti divisorie, contropareti, controsoffitti e velette in cartongesso.',
        keywords: ['cartongesso roma', 'controsoffitto roma'],
        landingReady: true
      },
      {
        slug: 'rifacimento-bagni',
        name: 'Rifacimento bagni',
        summary: 'Rifacimento del bagno con impianti, rivestimenti e sanitari, coordinato in un\'unica commessa.',
        keywords: ['rifacimento bagno roma', 'ristrutturazione bagno roma'],
        landingReady: true
      }
    ]
  },
  {
    slug: 'disinfestazioni',
    accent: '#2BB673',
    motif: 'hex',
    name: 'Disinfestazioni',
    icon: 'shield',
    tagline: 'Insetti, roditori e parassiti',
    summary:
      'Trattamenti contro insetti, roditori e parassiti per abitazioni, condomini, attività ricettive e commerciali.',
    intro:
      'Infestazioni di insetti o roditori richiedono un intervento mirato e, spesso, un piano di monitoraggio. Valutiamo la situazione e scegliamo il trattamento adatto all\'ambiente, con attenzione a persone e animali domestici.',
    image: { src: null, alt: 'Operatore che effettua un trattamento di disinfestazione', license: '', credit: '' },
    subcategories: [
      {
        slug: 'disinfestazioni-insetti',
        name: 'Disinfestazioni insetti',
        summary: 'Trattamenti contro blatte, formiche, zanzare, vespe e altri insetti infestanti.',
        keywords: ['disinfestazione blatte roma', 'disinfestazione insetti roma'],
        landingReady: true
      },
      {
        slug: 'derattizzazione',
        name: 'Derattizzazione',
        summary: 'Controllo e monitoraggio di ratti e topi con postazioni e piani di intervento periodici.',
        keywords: ['derattizzazione roma'],
        landingReady: true
      },
      {
        slug: 'disinfestazione-pulci-zecche-cimici',
        name: 'Disinfestazione pulci, zecche e cimici dei letti',
        summary: 'Trattamenti specifici per parassiti di abitazioni, hotel e strutture ricettive.',
        keywords: ['cimici dei letti roma', 'disinfestazione pulci roma'],
        landingReady: true
      }
    ]
  }
];

export const allSubcategories = categories.flatMap((c) =>
  c.subcategories.map((s) => ({ ...s, category: c.slug, categoryName: c.name }))
);

export const categoryUrl = (cat) => `/servizi/${cat.slug}/`;
export const subcategoryUrl = (catSlug, sub) => `/servizi/${catSlug}/${sub.slug}/`;
