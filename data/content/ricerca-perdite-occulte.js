/**
 * CONTENUTI — RICERCA PERDITE OCCULTE (categoria + 5 landing)
 * Le tecnologie sono descritte come metodi del settore: non si dichiara
 * il possesso di strumenti specifici.
 */
export default {
  category: {
    metaTitle: 'Ricerca perdite occulte a Roma',
    metaDescription:
      'Ricerca perdite d’acqua occulte a Roma con metodi non invasivi: gas tracciante, geofono, termografia e prove su tubazioni di scarico e in pressione.',
    h1: 'Ricerca perdite occulte a Roma',
    lead: 'Diagnosi strumentale delle perdite d’acqua non visibili, per individuare l’area della perdita prima di aprire pavimenti e pareti.',
    intro: [
      'Una perdita nascosta raramente si manifesta nel punto in cui si trova: l’acqua percorre massetti, intercapedini e solai e compare a metri di distanza, a volte nell’appartamento del vicino. Rompere dove si vede la macchia significa spesso demolire nel posto sbagliato.',
      'La ricerca strumentale parte dal capire che tipo di tubazione è coinvolta. Sulle linee in pressione, come acqua sanitaria e riscaldamento, si lavora con prove di tenuta, ascolto acustico, gas tracciante e termografia. Sulle tubazioni di scarico, che non sono in pressione, servono invece prove dedicate e videoispezione. Spesso i metodi si combinano: uno restringe l’area, l’altro conferma il punto.',
      'Nessuna tecnologia è infallibile da sola: profondità, materiali, rumore ambientale e tipo di impianto influenzano il risultato. L’obiettivo è ridurre al minimo l’area da aprire e documentare l’esito, anche ai fini di un’eventuale pratica assicurativa.'
    ],
    guide: [
      { problem: 'Il contatore gira con tutti i rubinetti chiusi', service: 'ricerca-perdite-tubazioni-pressione' },
      { problem: 'La caldaia perde pressione e va ricaricata spesso', service: 'termografia' },
      { problem: 'Perdita su tubazione in pressione sotto pavimento', service: 'geofono' },
      { problem: 'Perdita piccola, difficile da sentire o sotto massetti spessi', service: 'gas-tracciante' },
      { problem: 'Infiltrazioni al piano di sotto quando si usa la doccia', service: 'ricerca-perdite-tubazioni-scarico' }
    ],
    faq: [
      { q: 'Quanto è precisa la ricerca perdite?', a: 'In condizioni favorevoli si arriva a indicare il punto con buona approssimazione. In altre, ad esempio con impianti molto profondi o rumore elevato, si individua un’area più ampia. La combinazione di più metodi aumenta l’affidabilità.' },
      { q: 'Serve per la pratica con l’assicurazione?', a: 'Molte polizze coprono i danni da acqua condotta e alcune anche la ricerca del guasto. Un rapporto che descrive metodi usati ed esito è utile per la pratica: conviene verificare con la propria compagnia cosa è previsto.' },
      { q: 'Si deve sempre rompere dopo la ricerca?', a: 'Per riparare una tubazione rotta di solito sì, ma in un punto circoscritto. La ricerca serve proprio a evitare demolizioni estese o eseguite alla cieca.' }
    ]
  },

  landings: {
    'gas-tracciante': {
      metaTitle: 'Ricerca perdite con gas tracciante a Roma',
      metaDescription:
        'Ricerca perdite d’acqua con gas tracciante a Roma: una miscela inerte individua la fuoriuscita anche sotto pavimenti e massetti. Richiedi una verifica.',
      h1: 'Ricerca perdite con gas tracciante a Roma',
      lead: 'Una miscela di gas inerte immessa nella tubazione risale attraverso pavimenti e massetti e viene rilevata in superficie nel punto di fuoriuscita.',
      intro: [
        'Il metodo del gas tracciante si basa su un principio semplice: dopo aver svuotato la tubazione sospetta, la si riempie con una miscela composta in prevalenza da azoto e da una piccola percentuale di idrogeno. Le molecole di idrogeno sono molto piccole e leggere: dove il tubo è forato o il raccordo non tiene, il gas esce e migra verso l’alto attraverso massetti, fughe e materiali porosi.',
        'In superficie un rilevatore molto sensibile individua la presenza del gas, permettendo di circoscrivere il punto della perdita. La miscela comunemente usata è non tossica e non infiammabile alle concentrazioni impiegate, ed è adatta anche agli ambienti abitati.',
        'È particolarmente utile per perdite piccole, che producono poco rumore e sfuggono all’ascolto con il geofono, e per tubazioni posate sotto pavimenti spessi o rivestimenti continui.'
      ],
      when: [
        'Il contatore segnala consumi a rubinetti chiusi ma non si sente alcun rumore',
        'Umidità diffusa sotto un pavimento senza un punto evidente',
        'Perdita sospetta su tubazioni dell’impianto di riscaldamento',
        'Tentativi con altri metodi che non hanno dato un esito chiaro',
        'Impianti sotto massetti spessi o pavimenti in resina'
      ],
      steps: [
        { t: 'Sezionamento', d: 'Si isola il tratto di impianto da verificare chiudendo le valvole e lo si svuota dall’acqua.' },
        { t: 'Immissione del gas', d: 'La miscela viene introdotta in pressione controllata attraverso un raccordo dedicato.' },
        { t: 'Scansione della superficie', d: 'Con il rilevatore si percorre l’area seguendo il tracciato presunto della tubazione.' },
        { t: 'Indicazione del punto', d: 'La zona di massima concentrazione viene segnata e descritta nell’esito dell’intervento.' }
      ],
      tech: [
        { name: 'Miscela azoto-idrogeno', icon: 'gas', text: 'Gas inerte di uso comune nella ricerca perdite, che attraversa i materiali porosi grazie alle piccole dimensioni delle molecole.' },
        { name: 'Rilevatore di idrogeno', icon: 'radar', text: 'Sensore portatile con sonda che misura anche concentrazioni molto basse di gas in superficie.' },
        { name: 'Riduttore e manometro', icon: 'gauge', text: 'Regolano la pressione di immissione e permettono di osservare la tenuta del tratto.' }
      ],
      gallery: [
        { subject: 'Bombola e riduttore', alt: 'Bombola di gas tracciante con riduttore di pressione' },
        { subject: 'Rilevatore in superficie', alt: 'Sonda di un rilevatore di gas appoggiata su un pavimento piastrellato' },
        { subject: 'Collegamento all’impianto', alt: 'Raccordo per l’immissione del gas collegato a un collettore idraulico' }
      ],
      related: ['ricerca-perdite-occulte/geofono', 'ricerca-perdite-occulte/ricerca-perdite-tubazioni-pressione', 'ricerca-perdite-occulte/termografia'],
      plus: 'perdite-occulte',
      faq: [
        { q: 'Il gas tracciante è pericoloso in casa?', a: 'La miscela azoto-idrogeno usata nella ricerca perdite è considerata non tossica e, alla bassa percentuale di idrogeno impiegata, non infiammabile. Durante la prova non è richiesto di lasciare l’abitazione.' },
        { q: 'Funziona sulle tubazioni di scarico?', a: 'Il metodo è pensato per tubazioni che possono essere messe in pressione, come acqua sanitaria e riscaldamento. Per gli scarichi si utilizzano altre prove, come la videoispezione e i test con coloranti.' },
        { q: 'Bisogna lasciare l’impianto senz’acqua a lungo?', a: 'Il tratto in verifica resta svuotato per la durata della prova. Al termine l’impianto viene riempito di nuovo e rimesso in funzione.' },
        { q: 'Attraversa qualsiasi pavimento?', a: 'Il gas migra bene attraverso massetti, fughe e materiali porosi. Superfici molto impermeabili rallentano la risalita, per questo si cercano anche fughe, battiscopa e punti di discontinuità.' }
      ]
    },

    geofono: {
      metaTitle: 'Ricerca perdite con geofono a Roma',
      metaDescription:
        'Ricerca perdite con geofono a Roma: ascolto amplificato del rumore dell’acqua che fuoriesce da tubazioni in pressione sotto pavimenti e terreno.',
      h1: 'Ricerca perdite con geofono a Roma',
      lead: 'L’acqua che sfugge da un tubo in pressione produce un rumore caratteristico: il geofono lo amplifica fino a individuare il punto in cui è più intenso.',
      intro: [
        'Quando una tubazione in pressione presenta un foro o un raccordo che non tiene, l’acqua che fuoriesce genera vibrazioni che si propagano lungo il tubo e attraverso il pavimento o il terreno. Il geofono è uno strumento di ascolto composto da un microfono di contatto, un amplificatore con filtri e una cuffia, che rende udibili questi suoni.',
        'Spostando il sensore a intervalli regolari lungo il percorso della tubazione, l’operatore confronta l’intensità del segnale: il punto in cui il rumore è più forte indica la posizione probabile della perdita. I filtri permettono di attenuare i rumori di fondo e isolare le frequenze tipiche della fuoriuscita d’acqua.',
        'L’efficacia dipende dalla pressione nell’impianto, dalla profondità e dal tipo di materiale: tubi metallici trasmettono meglio il suono rispetto a quelli plastici, e ambienti rumorosi possono richiedere di lavorare in orari più silenziosi.'
      ],
      when: [
        'Contatore che gira a utenze chiuse',
        'Rumore di acqua che scorre nei muri o sotto il pavimento',
        'Perdita su un allaccio interrato tra contatore e edificio',
        'Calo di pressione nella rete idrica domestica',
        'Macchie di umidità che si allargano su pavimenti o pareti'
      ],
      steps: [
        { t: 'Prova di tenuta', d: 'Si conferma che la perdita riguarda una linea in pressione e si individua il tratto interessato.' },
        { t: 'Tracciamento', d: 'Si ricostruisce il percorso probabile della tubazione, anche con l’aiuto di planimetrie e punti di uscita visibili.' },
        { t: 'Ascolto a griglia', d: 'Il sensore viene spostato a passi regolari confrontando l’intensità del segnale.' },
        { t: 'Conferma', d: 'Il punto di massimo segnale può essere verificato con un secondo metodo, come gas tracciante o termografia.' }
      ],
      tech: [
        { name: 'Geofono elettroacustico', icon: 'ear', text: 'Microfono di contatto, amplificatore e cuffie per ascoltare le vibrazioni prodotte dalla fuoriuscita d’acqua.' },
        { name: 'Filtri di frequenza', icon: 'gauge', text: 'Permettono di ridurre traffico, elettrodomestici e altri rumori di fondo durante l’ascolto.' },
        { name: 'Correlatore acustico', icon: 'radar', text: 'Su condotte interrate più lunghe, confronta i segnali di due sensori per calcolare la posizione della perdita.' }
      ],
      gallery: [
        { subject: 'Sensore del geofono', alt: 'Sensore di un geofono appoggiato su un pavimento' },
        { subject: 'Ascolto in cuffia', alt: 'Operatore con cuffie durante l’ascolto con geofono' },
        { subject: 'Allaccio interrato', alt: 'Ricerca perdite su un allaccio idrico in un cortile' }
      ],
      related: ['ricerca-perdite-occulte/gas-tracciante', 'ricerca-perdite-occulte/ricerca-perdite-tubazioni-pressione', 'ricerca-perdite-occulte/termografia'],
      plus: 'perdite-occulte',
      faq: [
        { q: 'Il geofono funziona anche sulle tubazioni di scarico?', a: 'No: gli scarichi non sono in pressione e l’acqua che vi scorre non produce il rumore tipico di una perdita. Per questi casi si usano prove specifiche e la videoispezione.' },
        { q: 'Perché a volte bisogna lavorare la sera?', a: 'Traffico, cantieri ed elettrodomestici disturbano l’ascolto. In condizioni di silenzio il segnale della perdita è più facile da isolare.' },
        { q: 'Funziona su tubi in plastica?', a: 'Sì, ma i materiali plastici attenuano maggiormente il suono rispetto a quelli metallici. In questi casi è frequente affiancare il gas tracciante.' },
        { q: 'Serve la pressione dell’acquedotto?', a: 'Il rumore nasce dalla pressione nell’impianto: se è bassa, si può aumentare temporaneamente la pressione del tratto in prova per rendere la perdita più udibile.' }
      ]
    },

    termografia: {
      metaTitle: 'Termografia per ricerca perdite a Roma',
      metaDescription:
        'Termografia per la ricerca perdite a Roma: la termocamera rileva differenze di temperatura su pavimenti e pareti, utili per tubazioni calde e zone umide.',
      h1: 'Termografia per la ricerca perdite a Roma',
      lead: 'La termocamera rende visibili le differenze di temperatura delle superfici: tubazioni calde, zone umide e percorsi degli impianti emergono senza toccare nulla.',
      intro: [
        'Ogni superficie emette radiazione infrarossa in funzione della propria temperatura. La termocamera la rileva e la trasforma in un’immagine in cui le zone più calde e più fredde risultano evidenti. Nella ricerca perdite questa informazione è preziosa perché l’acqua modifica la temperatura dei materiali che attraversa.',
        'Sugli impianti di riscaldamento e sulle tubazioni dell’acqua calda, una perdita appare come un’area calda che si allarga dal tracciato del tubo. Sull’acqua fredda il segnale è più debole, ma le zone bagnate tendono a raffreddarsi per evaporazione e possono risultare visibili come aree più fredde.',
        'La termografia osserva solo la superficie e richiede un contrasto termico sufficiente: per questo indica soprattutto un’area, da confermare con altri metodi. Resta uno strumento rapido e del tutto non invasivo, utile anche per ricostruire il percorso degli impianti sotto traccia.'
      ],
      when: [
        'La caldaia perde pressione e va ricaricata di frequente',
        'Zone del pavimento più calde del normale',
        'Macchie di umidità su pareti attraversate da tubazioni',
        'Impianti a pavimento radiante con calo di pressione',
        'Necessità di conoscere il percorso delle tubazioni prima di forare'
      ],
      steps: [
        { t: 'Preparazione termica', d: 'Si crea il contrasto necessario, ad esempio facendo circolare acqua calda nel circuito da verificare.' },
        { t: 'Ripresa termografica', d: 'Pareti e pavimenti vengono osservati con la termocamera seguendo il percorso degli impianti.' },
        { t: 'Interpretazione', d: 'Si distinguono anomalie legate alla perdita da quelle dovute a ponti termici, sole o arredi.' },
        { t: 'Conferma e documentazione', d: 'L’area sospetta viene verificata con altri metodi e le immagini termiche allegate all’esito.' }
      ],
      tech: [
        { name: 'Termocamera', icon: 'thermo', text: 'Sensore a infrarossi che produce immagini termiche delle superfici con una scala di temperatura.' },
        { name: 'Contrasto controllato', icon: 'drop', text: 'Circolazione di acqua calda nel circuito per far emergere tubazioni e zone di fuoriuscita.' },
        { name: 'Igrometro', icon: 'gauge', text: 'Misura l’umidità superficiale dei materiali e aiuta a confermare le zone individuate.' }
      ],
      gallery: [
        { subject: 'Termocamera in uso', alt: 'Termocamera inquadrata su una parete per la ricerca perdite' },
        { subject: 'Immagine termica', alt: 'Immagine termica di un pavimento con una zona calda in corrispondenza di una tubazione' },
        { subject: 'Pavimento radiante', alt: 'Serpentina di un impianto radiante resa visibile con la termografia' }
      ],
      related: ['ricerca-perdite-occulte/gas-tracciante', 'ricerca-perdite-occulte/geofono', 'ricerca-perdite-occulte/ricerca-perdite-tubazioni-pressione'],
      plus: 'perdite-occulte',
      faq: [
        { q: 'La termocamera vede attraverso i muri?', a: 'No: misura la temperatura della superficie. Vede l’effetto che una tubazione calda o una zona bagnata producono sul pavimento o sulla parete, non il tubo stesso.' },
        { q: 'Funziona sulle perdite di acqua fredda?', a: 'Con più difficoltà, perché il contrasto è minore. Le zone umide possono risultare più fredde per evaporazione, ma spesso è necessario affiancare altri metodi.' },
        { q: 'Va bene per il riscaldamento a pavimento?', a: 'È uno degli usi più efficaci: facendo circolare acqua calda, il disegno della serpentina diventa visibile e un’anomalia emerge chiaramente.' },
        { q: 'Le immagini possono essere allegate a una pratica?', a: 'Sì, le immagini termiche sono una documentazione utile per descrivere la situazione riscontrata, ad esempio per l’amministratore o l’assicurazione.' }
      ]
    },

    'ricerca-perdite-tubazioni-scarico': {
      metaTitle: 'Perdite da tubazioni di scarico a Roma',
      metaDescription:
        'Infiltrazioni dal bagno o odori di fognatura? Ricerca perdite su tubazioni di scarico a Roma con videoispezione, prove con coloranti e prove di tenuta.',
      h1: 'Ricerca perdite su tubazioni di scarico a Roma',
      lead: 'Gli scarichi perdono solo quando vengono usati: per trovarli servono prove mirate, osservazione con telecamera e verifiche di tenuta.',
      intro: [
        'Le tubazioni di scarico funzionano a gravità e non sono in pressione: una rottura o un giunto scollegato lasciano uscire acqua solo nel momento in cui uno scarico viene utilizzato. Per questo i metodi pensati per le linee in pressione, come il geofono, qui sono poco utili.',
        'Il caso tipico è l’infiltrazione che compare al piano di sotto quando si usa la doccia o la vasca: può dipendere dal tubo, dal raccordo con la piletta, dalla sigillatura del piatto doccia o dall’impermeabilizzazione. Distinguere queste cause è essenziale per non rifare l’intero bagno quando basta intervenire su un dettaglio.',
        'Si procede usando gli scarichi uno alla volta e osservando dove compare l’acqua, con l’aiuto di coloranti traccianti, otturatori per mettere in carico singoli tratti e videoispezione per vedere l’interno della condotta.'
      ],
      when: [
        'Macchie al soffitto del piano di sotto, sotto bagno o cucina',
        'Infiltrazioni che compaiono solo dopo l’uso della doccia',
        'Odori di fognatura in casa con sifoni in ordine',
        'Umidità alla base delle pareti vicino alle colonne di scarico',
        'Cedimenti o avvallamenti lungo il percorso di uno scarico interrato'
      ],
      steps: [
        { t: 'Prove a utilizzo singolo', d: 'Ogni scarico viene usato separatamente per capire quale apparecchio provoca l’infiltrazione.' },
        { t: 'Coloranti traccianti', d: 'Un colorante aggiunto all’acqua permette di riconoscere la provenienza dell’acqua nel punto di comparsa.' },
        { t: 'Prova di tenuta', d: 'Il tratto sospetto viene chiuso con otturatori e messo in carico per osservarne la tenuta.' },
        { t: 'Videoispezione', d: 'La telecamera conferma rotture, giunti aperti o deformazioni e ne indica la posizione.' }
      ],
      tech: [
        { name: 'Coloranti e traccianti', icon: 'drop', text: 'Sostanze coloranti o fluorescenti che rendono riconoscibile l’acqua proveniente da uno specifico scarico.' },
        { name: 'Otturatori', icon: 'pipe', text: 'Palloni o tappi espandibili che chiudono temporaneamente un tratto per metterlo in carico.' },
        { name: 'Telecamera e localizzatore', icon: 'camera', text: 'Mostrano l’interno della condotta e indicano dalla superficie la posizione del difetto.' }
      ],
      gallery: [
        { subject: 'Infiltrazione a soffitto', alt: 'Macchia di infiltrazione sul soffitto sotto un bagno' },
        { subject: 'Prova con colorante', alt: 'Acqua colorata versata in uno scarico durante una prova' },
        { subject: 'Ispezione dello scarico', alt: 'Telecamera inserita in una tubazione di scarico del bagno' }
      ],
      related: ['idraulica/videoispezione-tubature', 'ricerca-perdite-occulte/ricerca-perdite-tubazioni-pressione', 'muratura/rifacimento-bagni'],
      plus: 'perdite-occulte',
      faq: [
        { q: 'Come capisco se perde lo scarico o il tubo dell’acqua?', a: 'Se l’infiltrazione compare solo usando un apparecchio, è probabile che riguardi lo scarico. Se è continua e il contatore gira a rubinetti chiusi, la causa è più probabilmente una tubazione in pressione.' },
        { q: 'Può essere solo il silicone del piatto doccia?', a: 'Sì, è una causa frequente. Le prove separate tra piatto, piletta e tubazione servono proprio a capire se basta rifare una sigillatura.' },
        { q: 'La videoispezione entra negli scarichi del bagno?', a: 'Con telecamere di piccolo diametro si può ispezionare buona parte degli scarichi domestici, compatibilmente con curve e sifoni.' },
        { q: 'L’infiltrazione al vicino è responsabilità mia?', a: 'Dipende da dove si trova il guasto: un tratto privato o una colonna condominiale. Individuarlo con precisione serve anche a chiarire a chi spetta la riparazione.' }
      ]
    },

    'ricerca-perdite-tubazioni-pressione': {
      metaTitle: 'Ricerca perdite tubazioni in pressione a Roma',
      metaDescription:
        'Contatore che gira o caldaia che perde pressione? Prove di tenuta e localizzazione delle perdite su impianti idrici e di riscaldamento a Roma.',
      h1: 'Ricerca perdite su tubazioni in pressione a Roma',
      lead: 'Impianti idrici e di riscaldamento lavorano in pressione: una prova di tenuta conferma la perdita, i metodi strumentali la localizzano.',
      intro: [
        'Le tubazioni dell’acqua sanitaria e del riscaldamento sono sempre sotto pressione: anche un foro minimo disperde acqua in modo continuo, giorno e notte. Il segnale più tipico è il contatore che continua a girare con tutte le utenze chiuse, oppure la caldaia che perde pressione e va ricaricata periodicamente.',
        'La prima fase è la prova di tenuta: si chiude l’impianto o una sua parte e si osserva con un manometro se la pressione cala nel tempo. Chiudendo le valvole dei diversi circuiti si capisce quale tratto è coinvolto, restringendo progressivamente il campo.',
        'Una volta individuato il circuito, la localizzazione si affida ai metodi strumentali più adatti: ascolto con geofono, gas tracciante per le perdite più piccole, termografia per i circuiti caldi. La combinazione dipende dal tipo di impianto e dal punto in cui corre la tubazione.'
      ],
      when: [
        'Il contatore gira con tutti i rubinetti chiusi',
        'Bollette dell’acqua più alte senza cambi di abitudini',
        'La pressione della caldaia scende e va ripristinata spesso',
        'Rumore continuo di acqua nelle pareti',
        'Pavimenti caldi o umidi in punti anomali'
      ],
      steps: [
        { t: 'Verifica al contatore', d: 'Con tutte le utenze chiuse si osserva il contatore per confermare un consumo anomalo.' },
        { t: 'Prova di tenuta', d: 'Il circuito viene isolato e controllato con manometro per misurare il calo di pressione.' },
        { t: 'Sezionamento', d: 'Chiudendo valvole e collettori si individua il ramo dell’impianto interessato.' },
        { t: 'Localizzazione', d: 'Sul ramo individuato si applicano geofono, gas tracciante o termografia per indicare il punto.' }
      ],
      tech: [
        { name: 'Pompa e manometro di prova', icon: 'gauge', text: 'Mettono in pressione il circuito e misurano con precisione eventuali cali nel tempo.' },
        { name: 'Ascolto acustico', icon: 'ear', text: 'Il geofono individua il rumore della fuoriuscita lungo il tracciato del tubo.' },
        { name: 'Gas tracciante e termografia', icon: 'thermo', text: 'Metodi complementari per perdite piccole o su circuiti di riscaldamento.' }
      ],
      gallery: [
        { subject: 'Contatore dell’acqua', alt: 'Contatore dell’acqua con il quadrante in movimento' },
        { subject: 'Prova di tenuta', alt: 'Manometro collegato a un impianto durante una prova di tenuta' },
        { subject: 'Collettore idraulico', alt: 'Collettore idraulico con valvole di sezionamento dei circuiti' }
      ],
      related: ['ricerca-perdite-occulte/geofono', 'ricerca-perdite-occulte/gas-tracciante', 'ricerca-perdite-occulte/termografia'],
      plus: 'perdite-occulte',
      faq: [
        { q: 'Come faccio a controllare il contatore da solo?', a: 'Chiudi tutti i rubinetti, assicurati che lavatrice, lavastoviglie e cassette non stiano caricando e osserva il contatore per qualche minuto. Se le cifre o la rotellina di controllo si muovono, c’è un consumo anomalo.' },
        { q: 'La perdita può essere prima del contatore?', a: 'Sì. Il tratto a monte del contatore normalmente compete al gestore della rete; la ricerca aiuta a capire se la perdita si trova nell’impianto privato o all’esterno.' },
        { q: 'La caldaia perde pressione: è sempre una perdita?', a: 'Non sempre: anche il vaso di espansione o la valvola di sicurezza possono causare cali di pressione. Una verifica dei componenti della caldaia va fatta insieme alla ricerca sull’impianto.' },
        { q: 'Quanta acqua si può perdere con un piccolo foro?', a: 'Anche una perdita minima, essendo continua, può sommarsi a volumi significativi nell’arco di mesi. Per questo conviene intervenire appena il contatore conferma il problema.' }
      ]
    }
  }
};
