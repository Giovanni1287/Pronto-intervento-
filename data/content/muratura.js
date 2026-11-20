/**
 * CONTENUTI — MURATURA (categoria + 5 landing)
 * Distingue piccole riparazioni e ristrutturazioni complesse. I riferimenti
 * a pratiche edilizie sono informativi e rimandano a un tecnico abilitato.
 */
export default {
  category: {
    metaTitle: 'Riparazioni murarie e ristrutturazioni a Roma',
    metaDescription:
      'Riparazioni murarie, piccole ristrutturazioni, imbiancatura, cartongesso e rifacimento bagni a Roma, anche dopo interventi idraulici ed elettrici.',
    h1: 'Muratura a Roma: riparazioni e piccole ristrutturazioni',
    lead: 'Dal ripristino dopo una riparazione idraulica al rifacimento del bagno: lavori edili interni coordinati con gli impianti.',
    intro: [
      'Molti interventi tecnici si concludono con un lavoro murario: una traccia da chiudere dopo la sostituzione di un tubo, un intonaco da rifare dopo un’infiltrazione, un pavimento da ripristinare dopo la ricerca di una perdita. Gestirli all’interno dello stesso intervento evita di coordinare più imprese e lasciare lavori a metà.',
      'Oltre ai ripristini, la categoria comprende lavori di manutenzione e piccola ristrutturazione su singoli ambienti di abitazioni, uffici e negozi. Per i lavori più estesi è importante capire fin dall’inizio di che tipo di intervento si tratta, perché cambiano tempi, costi e adempimenti.'
    ],
    guide: [
      { problem: 'Tracce, intonaci o piastrelle da ripristinare dopo un guasto', service: 'riparazioni-murarie' },
      { problem: 'Pareti da rinfrescare, macchie o muffa', service: 'imbiancatura' },
      { problem: 'Nuova parete, controparete o controsoffitto', service: 'cartongesso' },
      { problem: 'Bagno da rifare, con impianti e rivestimenti', service: 'rifacimento-bagni' },
      { problem: 'Rinnovare una cucina, una stanza o un piccolo negozio', service: 'piccole-ristrutturazioni' }
    ],
    comparison: {
      title: 'Piccole riparazioni o ristrutturazione?',
      intro: 'La distinzione non dipende solo dalla dimensione del lavoro, ma da cosa viene modificato.',
      columns: [
        {
          name: 'Piccole riparazioni e manutenzione',
          items: [
            'Ripristino di intonaci, tracce e rivestimenti esistenti',
            'Tinteggiature e trattamenti delle superfici',
            'Sostituzione di elementi senza modificare gli spazi',
            'Tempi brevi, spesso uno o pochi giorni',
            'In genere rientrano nella manutenzione ordinaria'
          ]
        },
        {
          name: 'Ristrutturazioni più complesse',
          items: [
            'Spostamento o realizzazione di tramezzi',
            'Rifacimento degli impianti di uno o più ambienti',
            'Interventi che cambiano la distribuzione degli spazi',
            'Più lavorazioni da coordinare in sequenza',
            'Possono richiedere una pratica edilizia, come la CILA, e un tecnico abilitato'
          ]
        }
      ],
      note: 'Gli adempimenti dipendono dal tipo di intervento e dalle norme vigenti: per i lavori che modificano spazi, impianti o parti strutturali va sempre sentito un tecnico abilitato prima di iniziare.'
    },
    faq: [
      { q: 'Per ripristinare un muro dopo una riparazione serve un permesso?', a: 'Il ripristino di intonaci, tracce e finiture rientra in genere nella manutenzione ordinaria. Diverso è il caso in cui si modificano spazi, impianti o strutture: allora va verificato con un tecnico quale pratica è necessaria.' },
      { q: 'Si possono eseguire i lavori con la casa abitata?', a: 'Per riparazioni e lavori su un singolo ambiente spesso sì, organizzando protezioni e fasi di lavoro. Per interventi estesi o rumorosi si concordano tempi e aree da liberare.' },
      { q: 'Una crepa nel muro è sempre un problema strutturale?', a: 'No: molte crepe sono cavillature superficiali dell’intonaco. Lesioni che si allargano, attraversano la parete o compaiono insieme a porte che non chiudono vanno però valutate da un ingegnere o da un tecnico strutturista.' }
    ]
  },

  landings: {
    'piccole-ristrutturazioni': {
      metaTitle: 'Piccole ristrutturazioni a Roma',
      metaDescription:
        'Piccole ristrutturazioni a Roma su singoli ambienti di case, uffici e negozi: demolizioni, impianti, pavimenti, rivestimenti e finiture coordinate.',
      h1: 'Piccole ristrutturazioni a Roma',
      lead: 'Interventi mirati su una cucina, una stanza, un ingresso o un piccolo locale commerciale, con le lavorazioni coordinate in un’unica commessa.',
      intro: [
        'Una piccola ristrutturazione riguarda in genere uno o pochi ambienti: rinnovare una cucina, rifare un pavimento, aprire o chiudere un passaggio, adeguare un locale per una nuova attività. Non è solo una somma di lavori: l’ordine in cui si eseguono demolizioni, impianti, massetti e finiture determina la qualità del risultato.',
        'Il lavoro parte da un sopralluogo e da una descrizione chiara di cosa si vuole ottenere. Da lì si definiscono le lavorazioni, le eventuali parti di impianto da adeguare e i materiali, distinguendo ciò che è manutenzione da ciò che modifica gli spazi.',
        'Se l’intervento comporta lo spostamento di tramezzi, la modifica degli impianti o altre opere che richiedono una pratica edilizia, questa va predisposta da un tecnico abilitato prima dell’inizio dei lavori.'
      ],
      when: [
        'Cucina o stanza da rinnovare senza ristrutturare l’intera casa',
        'Pavimenti o rivestimenti consumati o danneggiati',
        'Locale commerciale da adeguare a una nuova attività',
        'Ambienti da ridistribuire con una nuova parete o un nuovo passaggio',
        'Ripristino completo di un ambiente dopo un danno da acqua'
      ],
      steps: [
        { t: 'Sopralluogo', d: 'Si rilevano misure, stato di impianti e superfici e si chiariscono obiettivi e vincoli.' },
        { t: 'Preventivo dettagliato', d: 'Lavorazioni, materiali, fasi e verifiche sugli eventuali adempimenti edilizi.' },
        { t: 'Esecuzione per fasi', d: 'Demolizioni, impianti, massetti e finiture nell’ordine corretto, con protezione degli ambienti vicini.' },
        { t: 'Consegna', d: 'Pulizia finale, verifica delle finiture e consegna della documentazione degli impianti modificati.' }
      ],
      tech: [
        { name: 'Demolizioni controllate', icon: 'brick', text: 'Rimozione di pavimenti, rivestimenti e tramezzi con attenzione a polveri, rumore e impianti sottotraccia.' },
        { name: 'Massetti e sottofondi', icon: 'layers', text: 'Preparazione dei piani di posa, livellati e compatibili con il pavimento scelto.' },
        { name: 'Coordinamento impianti', icon: 'wrench', text: 'Idraulica ed elettrica eseguite prima delle finiture, per non dover riaprire lavori conclusi.' }
      ],
      gallery: [
        { subject: 'Cucina in ristrutturazione', alt: 'Cucina durante i lavori di ristrutturazione con pareti grezze' },
        { subject: 'Posa del pavimento', alt: 'Posa di un nuovo pavimento in un ambiente ristrutturato' },
        { subject: 'Ambiente finito', alt: 'Ambiente interno rinnovato con nuove finiture' }
      ],
      related: ['muratura/rifacimento-bagni', 'muratura/cartongesso', 'elettrica/rifacimento-impianti-elettrici'],
      plus: 'muratura',
      faq: [
        { q: 'Quando una ristrutturazione è “piccola”?', a: 'Quando riguarda uno o pochi ambienti e non stravolge l’organizzazione della casa. Anche un lavoro piccolo, però, può richiedere una pratica edilizia se sposta pareti o modifica impianti.' },
        { q: 'Chi si occupa della pratica edilizia?', a: 'La pratica, come la CILA, è presentata da un tecnico abilitato, ad esempio un architetto, un ingegnere o un geometra. Il tecnico verifica anche la conformità dell’immobile.' },
        { q: 'Quanto durano i lavori?', a: 'Dipende dalle lavorazioni e dai tempi di asciugatura di massetti e intonaci. Il cronoprogramma viene definito nel preventivo, distinguendo le fasi più rumorose.' },
        { q: 'Si possono sfruttare le detrazioni fiscali?', a: 'Alcuni interventi possono rientrare nelle agevolazioni previste dalla normativa in vigore. Requisiti e percentuali cambiano nel tempo: è bene verificarli con un professionista prima di iniziare.' }
      ]
    },

    'riparazioni-murarie': {
      metaTitle: 'Riparazioni murarie a Roma',
      metaDescription:
        'Riparazioni murarie a Roma: chiusura di tracce, ripristino di intonaci e rivestimenti dopo guasti idraulici, elettrici e infiltrazioni. Richiedi un sopralluogo.',
      h1: 'Riparazioni murarie a Roma',
      lead: 'Chiusura di tracce e aperture, ripristino di intonaci, piastrelle e pavimenti dopo riparazioni agli impianti o danni da acqua.',
      intro: [
        'Dopo la riparazione di un tubo o di una linea elettrica restano spesso un’apertura nel muro, una traccia nel pavimento, alcune piastrelle rimosse. La riparazione muraria chiude il lavoro e restituisce l’ambiente com’era, per quanto possibile anche nell’aspetto.',
        'Quando il danno è dovuto a un’infiltrazione, la tempistica è importante: intonaci e massetti bagnati devono asciugare prima di essere ripristinati, altrimenti l’umidità residua fa rigonfiare pitture e distaccare le finiture. Prima si elimina la causa, poi si lascia asciugare, infine si ricostruisce.',
        'Le crepe meritano una valutazione a parte. Le cavillature superficiali si trattano con stuccature e rasature; lesioni profonde o in evoluzione possono indicare un problema strutturale, che va esaminato da un tecnico prima di qualsiasi intervento estetico.'
      ],
      when: [
        'Aperture lasciate da riparazioni idrauliche o elettriche',
        'Intonaco rigonfio o distaccato dopo un’infiltrazione',
        'Piastrelle rotte o mancanti da sostituire',
        'Crepe e cavillature su pareti e soffitti',
        'Angoli, spigoli e battiscopa danneggiati'
      ],
      steps: [
        { t: 'Verifica della causa', d: 'Si accerta che la causa del danno sia stata risolta e che le superfici siano asciutte.' },
        { t: 'Preparazione', d: 'Rimozione delle parti incoerenti e pulizia del supporto per garantire l’adesione dei nuovi materiali.' },
        { t: 'Ricostruzione', d: 'Chiusura con malte compatibili, rasatura e, dove serve, posa di piastrelle simili alle esistenti.' },
        { t: 'Finitura', d: 'Carteggiatura e tinteggiatura della zona o della parete per uniformare il risultato.' }
      ],
      tech: [
        { name: 'Malte compatibili', icon: 'brick', text: 'Materiali scelti in base al supporto esistente, per evitare distacchi e fessurazioni tra vecchio e nuovo.' },
        { name: 'Reti di rinforzo', icon: 'layers', text: 'Reti in fibra annegate nella rasatura per ridurre il rischio di nuove cavillature sui ripristini.' },
        { name: 'Igrometro', icon: 'gauge', text: 'Misura l’umidità del supporto per capire quando è possibile procedere con le finiture.' }
      ],
      gallery: [
        { subject: 'Ripristino di traccia', alt: 'Traccia in una parete chiusa con malta prima della rasatura' },
        { subject: 'Intonaco danneggiato', alt: 'Intonaco rigonfio e distaccato a causa dell’umidità' },
        { subject: 'Rasatura', alt: 'Rasatura di una parete con spatola' }
      ],
      related: ['muratura/imbiancatura', 'ricerca-perdite-occulte/ricerca-perdite-tubazioni-pressione', 'muratura/piccole-ristrutturazioni'],
      plus: 'muratura',
      faq: [
        { q: 'Si riesce a trovare una piastrella uguale a quella esistente?', a: 'Non sempre, soprattutto con rivestimenti datati. Si cerca il modello più simile o si recuperano piastrelle da zone meno visibili; in alcuni casi conviene rifare una parete intera.' },
        { q: 'Dopo un’infiltrazione quanto bisogna aspettare?', a: 'Dipende dallo spessore dei materiali bagnati e dalla ventilazione. La misura dell’umidità del supporto indica quando si può procedere senza rischiare nuovi distacchi.' },
        { q: 'Le crepe si possono semplicemente stuccare?', a: 'Le cavillature superficiali sì, con una rasatura adeguata. Se la crepa è passante, si allarga o si riapre dopo la stuccatura, è necessaria una valutazione tecnica.' },
        { q: 'La riparazione si vede dopo la tinteggiatura?', a: 'Una buona rasatura riduce al minimo la differenza; per un risultato uniforme si consiglia spesso di tinteggiare l’intera parete e non solo la zona riparata.' }
      ]
    },

    imbiancatura: {
      metaTitle: 'Imbiancatura e tinteggiatura interni a Roma',
      metaDescription:
        'Imbiancatura di appartamenti, uffici e negozi a Roma: preparazione delle superfici, stuccature, pitture traspiranti, lavabili e trattamenti per muffa.',
      h1: 'Imbiancatura e tinteggiatura di interni a Roma',
      lead: 'Pareti e soffitti rinnovati partendo da una preparazione accurata delle superfici, con pitture scelte in base all’ambiente.',
      intro: [
        'La durata e l’aspetto di una tinteggiatura dipendono più dalla preparazione che dalla pittura. Prima di imbiancare si rimuovono le parti che si sfogliano, si stuccano fori e cavillature, si carteggia e si applica un fissativo che uniforma l’assorbimento del supporto.',
        'La pittura si sceglie in base all’ambiente: traspirante per camere e soggiorni, lavabile per corridoi, cucine e ambienti molto vissuti, con additivi antimuffa dove l’umidità è elevata. Anche il colore incide sul numero di mani necessarie, soprattutto quando si passa da tinte scure a tinte chiare.',
        'Se sulle pareti compare muffa, la sola pittura non basta: va capito se dipende da condensa, ponti termici o infiltrazioni. Il trattamento risanante è efficace solo se si interviene anche sulla causa.'
      ],
      when: [
        'Pareti ingrigite, macchiate o segnate dall’uso',
        'Pittura che si sfoglia o si polverizza',
        'Macchie di muffa negli angoli o dietro i mobili',
        'Cambio di inquilino o vendita dell’immobile',
        'Ripristino dopo riparazioni murarie o infiltrazioni risolte'
      ],
      steps: [
        { t: 'Protezione', d: 'Pavimenti, infissi e arredi vengono coperti; prese e placche protette o smontate.' },
        { t: 'Preparazione', d: 'Raschiatura, stuccatura, carteggiatura e applicazione del fissativo.' },
        { t: 'Tinteggiatura', d: 'Applicazione delle mani necessarie a coprire in modo uniforme, rispettando i tempi di asciugatura.' },
        { t: 'Pulizia e controllo', d: 'Rimozione delle protezioni, ritocchi e pulizia degli ambienti.' }
      ],
      tech: [
        { name: 'Pitture traspiranti', icon: 'drop', text: 'Lasciano passare il vapore acqueo e sono indicate per gli ambienti abitativi.' },
        { name: 'Pitture lavabili', icon: 'shield', text: 'Resistono meglio a pulizia e sfregamenti in corridoi, cucine e locali commerciali.' },
        { name: 'Trattamenti antimuffa', icon: 'layers', text: 'Soluzioni risananti e pitture additivate per ambienti soggetti a condensa.' }
      ],
      gallery: [
        { subject: 'Preparazione delle pareti', alt: 'Stuccatura di una parete prima della tinteggiatura' },
        { subject: 'Tinteggiatura a rullo', alt: 'Pittura bianca applicata a rullo su una parete interna' },
        { subject: 'Ambiente imbiancato', alt: 'Stanza con pareti appena tinteggiate' }
      ],
      related: ['muratura/riparazioni-murarie', 'muratura/cartongesso', 'muratura/piccole-ristrutturazioni'],
      plus: 'muratura',
      faq: [
        { q: 'Quante mani di pittura servono?', a: 'Di solito due, su un supporto ben preparato. Possono servirne di più in caso di forti cambi di colore o su superfici molto assorbenti.' },
        { q: 'La pittura antimuffa risolve il problema?', a: 'Aiuta a limitare la ricomparsa, ma se la muffa dipende da condensa o infiltrazioni bisogna intervenire anche sulla ventilazione, sull’isolamento o sulla perdita.' },
        { q: 'Si può imbiancare con i mobili in casa?', a: 'Sì, spostandoli al centro della stanza e coprendoli con teli. Per lavori su tutta la casa si procede per ambienti.' },
        { q: 'Dopo quanto si possono riutilizzare le stanze?', a: 'Le pitture all’acqua asciugano al tatto in poche ore; è consigliabile arieggiare bene e attendere prima di riposizionare i mobili contro le pareti.' }
      ]
    },

    cartongesso: {
      metaTitle: 'Cartongesso: pareti e controsoffitti a Roma',
      metaDescription:
        'Lavori in cartongesso a Roma: pareti divisorie, contropareti isolanti, controsoffitti, velette e nicchie, con lastre adatte anche ad ambienti umidi.',
      h1: 'Pareti e controsoffitti in cartongesso a Roma',
      lead: 'Pareti divisorie, contropareti, controsoffitti e velette: soluzioni a secco veloci da realizzare e adatte a nascondere impianti.',
      intro: [
        'Il cartongesso è un sistema costruttivo a secco: lastre di gesso rivestito avvitate su un’orditura di profili metallici. Rispetto a una parete in muratura si realizza più rapidamente, con meno peso e meno sporco, e lascia un’intercapedine utile per far passare impianti o inserire materiale isolante.',
        'Esistono lastre per usi diversi: standard per gli ambienti asciutti, idrorepellenti per bagni e cucine, con prestazioni al fuoco migliorate dove richiesto. Abbinate a pannelli isolanti nell’intercapedine, le contropareti migliorano il comfort termico e acustico delle pareti esistenti.',
        'La qualità di un lavoro in cartongesso si vede nelle giunzioni: stuccatura con nastro di rinforzo, rasatura e carteggiatura accurate rendono la superficie pronta per la tinteggiatura senza segni visibili.'
      ],
      when: [
        'Dividere una stanza o creare un nuovo ambiente',
        'Abbassare un soffitto o nascondere tubazioni e canaline',
        'Migliorare l’isolamento acustico tra due ambienti',
        'Realizzare nicchie, velette e illuminazione a scomparsa',
        'Rivestire pareti irregolari o danneggiate'
      ],
      steps: [
        { t: 'Rilievo', d: 'Misure, quote, posizione degli impianti e funzione della parete o del controsoffitto.' },
        { t: 'Orditura', d: 'Posa dei profili metallici a pavimento, soffitto e parete, con montanti a interasse regolare.' },
        { t: 'Lastre e isolante', d: 'Inserimento dell’eventuale isolante e avvitatura delle lastre adatte all’ambiente.' },
        { t: 'Stuccatura e finitura', d: 'Trattamento delle giunzioni, rasatura e preparazione alla tinteggiatura.' }
      ],
      tech: [
        { name: 'Lastre per ambienti umidi', icon: 'drop', text: 'Lastre idrorepellenti indicate per bagni, cucine e locali con umidità elevata.' },
        { name: 'Isolanti in intercapedine', icon: 'layers', text: 'Pannelli in lana minerale o altri materiali per migliorare isolamento termico e acustico.' },
        { name: 'Profili metallici', icon: 'brick', text: 'Guide e montanti in acciaio zincato che formano la struttura portante delle lastre.' }
      ],
      gallery: [
        { subject: 'Orditura metallica', alt: 'Orditura metallica di una parete in cartongesso in costruzione' },
        { subject: 'Controsoffitto', alt: 'Controsoffitto in cartongesso con faretti incassati' },
        { subject: 'Stuccatura dei giunti', alt: 'Stuccatura dei giunti tra lastre di cartongesso' }
      ],
      related: ['muratura/piccole-ristrutturazioni', 'muratura/imbiancatura', 'elettrica/rifacimento-impianti-elettrici'],
      plus: 'muratura',
      faq: [
        { q: 'Una parete in cartongesso è resistente?', a: 'Per l’uso quotidiano sì. Per appendere pensili, mensole pesanti o sanitari sospesi si prevedono rinforzi nell’orditura o tasselli specifici già in fase di costruzione.' },
        { q: 'Il cartongesso isola dai rumori?', a: 'Una parete con doppia lastra e isolante nell’intercapedine può offrire un buon isolamento acustico. Le prestazioni dipendono dalla stratigrafia e dalla cura dei dettagli.' },
        { q: 'Si può usare in bagno?', a: 'Sì, con lastre idrorepellenti e, nelle zone esposte all’acqua come la doccia, con un’impermeabilizzazione prima del rivestimento.' },
        { q: 'Per una parete in cartongesso serve una pratica edilizia?', a: 'Se modifica la distribuzione degli spazi può essere necessaria, come per una parete in muratura. Va verificato con un tecnico abilitato.' }
      ]
    },

    'rifacimento-bagni': {
      metaTitle: 'Rifacimento bagni a Roma',
      metaDescription:
        'Rifacimento bagni a Roma: demolizioni, impianti idraulici e scarichi, impermeabilizzazione, rivestimenti e sanitari coordinati in un unico intervento.',
      h1: 'Rifacimento del bagno a Roma',
      lead: 'Un bagno nuovo dalle tubazioni alle finiture: impianti, impermeabilizzazione, rivestimenti e sanitari eseguiti nella sequenza corretta.',
      intro: [
        'Rifare un bagno significa intervenire in uno spazio ridotto dove convivono impianto idraulico, scarichi, impianto elettrico, impermeabilizzazioni e finiture. Molti problemi dei bagni rifatti, come infiltrazioni dalla doccia o scarichi lenti, nascono da dettagli eseguiti in fretta e poi nascosti sotto le piastrelle.',
        'Dopo le demolizioni si verificano lo stato delle colonne e delle tubazioni esistenti, si realizzano i nuovi impianti rispettando le pendenze degli scarichi e si impermeabilizzano le zone esposte all’acqua, a partire dalla doccia. Solo dopo si posano massetti, rivestimenti e sanitari.',
        'Quando il rifacimento comporta lo spostamento di sanitari, la modifica degli impianti o della distribuzione, può essere necessaria una pratica edilizia da predisporre con un tecnico abilitato.'
      ],
      when: [
        'Infiltrazioni ricorrenti verso il piano di sotto',
        'Tubazioni datate, ruggine o perdite ripetute',
        'Sostituzione della vasca con una doccia',
        'Rivestimenti e sanitari usurati o danneggiati',
        'Bagno da rendere più accessibile e facile da usare'
      ],
      steps: [
        { t: 'Progetto del bagno', d: 'Disposizione dei sanitari, scelta dei materiali, verifica di scarichi e colonne esistenti.' },
        { t: 'Demolizioni e impianti', d: 'Rimozione di rivestimenti e sanitari, nuovi impianti idraulici, scarichi ed elettrici.' },
        { t: 'Impermeabilizzazione e posa', d: 'Guaine nelle zone a rischio, massetti, piastrelle e piatto doccia.' },
        { t: 'Montaggio e collaudo', d: 'Sanitari, rubinetterie e accessori; prova di tenuta degli impianti e degli scarichi.' }
      ],
      tech: [
        { name: 'Impermeabilizzazione', icon: 'shield', text: 'Guaine liquide e bandelle sugli angoli della zona doccia, prima della posa del rivestimento.' },
        { name: 'Scarichi con pendenza', icon: 'pipe', text: 'Tubazioni posate con pendenze adeguate e raccordi a ridotta perdita di carico.' },
        { name: 'Sanitari sospesi', icon: 'wrench', text: 'Telai di supporto a parete che facilitano la pulizia e liberano il pavimento.' }
      ],
      gallery: [
        { subject: 'Bagno in demolizione', alt: 'Bagno durante la demolizione dei vecchi rivestimenti' },
        { subject: 'Impermeabilizzazione doccia', alt: 'Guaina impermeabilizzante applicata nella zona doccia' },
        { subject: 'Bagno rinnovato', alt: 'Bagno rinnovato con doccia e sanitari sospesi' }
      ],
      related: ['muratura/piccole-ristrutturazioni', 'ricerca-perdite-occulte/ricerca-perdite-tubazioni-scarico', 'idraulica/spurgo-lavandini'],
      plus: 'muratura',
      faq: [
        { q: 'Quanto tempo resta inutilizzabile il bagno?', a: 'Per l’intera durata dei lavori, che dipende da dimensioni, lavorazioni e asciugatura dei materiali. Se è l’unico bagno di casa, si pianificano le fasi per ridurre il disagio.' },
        { q: 'Si può sostituire la vasca con la doccia senza rifare tutto?', a: 'In alcuni casi sì, intervenendo solo sulla zona della vasca. Bisogna però verificare scarico, pendenze e impermeabilizzazione, e trovare rivestimenti compatibili con quelli esistenti.' },
        { q: 'Si possono spostare i sanitari?', a: 'Sì, compatibilmente con la posizione della colonna di scarico e con le pendenze necessarie. Il wc, in particolare, ha vincoli più stringenti per il diametro del suo scarico.' },
        { q: 'Perché l’impermeabilizzazione è così importante?', a: 'Fughe e piastrelle non sono impermeabili: senza una guaina sotto il rivestimento, l’acqua della doccia può raggiungere il massetto e provocare infiltrazioni anche a distanza di tempo.' }
      ]
    }
  }
};
