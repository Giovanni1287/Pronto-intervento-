/**
 * CONTENUTI — IDRAULICA (categoria + 5 landing)
 * Testi originali. Non dichiarano attrezzature o abilitazioni possedute:
 * descrivono le tecniche in uso nel settore e le modalità possibili.
 */
export default {
  category: {
    metaTitle: 'Idraulica e spurghi a Roma',
    metaDescription:
      'Disostruzione scarichi con canal-jet, spurgo fognature e lavandini, videoispezione e fresatura delle colonne a Roma e provincia. Richiedi un sopralluogo.',
    h1: 'Idraulica e spurghi a Roma',
    lead: 'Scarichi lenti, colonne intasate, fosse da svuotare, tubazioni da controllare: interventi su impianti di scarico per abitazioni, condomini e attività commerciali.',
    intro: [
      'La maggior parte dei problemi idraulici domestici nasce negli scarichi: grassi che si solidificano nelle tubazioni della cucina, capelli e saponi nei sifoni del bagno, calcare che riduce il diametro delle colonne nei palazzi meno recenti. Quando l’acqua defluisce lentamente o risale da un pozzetto, il problema raramente si risolve da solo e tende a peggiorare.',
      'Per questo l’approccio parte dalla diagnosi: capire dove si trova l’ostruzione, di che materiale è fatta e in che condizioni è la tubazione permette di scegliere la tecnica giusta, dalla semplice pulizia di un sifone al lavaggio ad alta pressione, fino alla fresatura delle incrostazioni più dure.'
    ],
    guide: [
      { problem: 'Un solo lavandino o lavello scarica male', service: 'spurgo-lavandini' },
      { problem: 'Più scarichi lenti, gorgoglii o risalite nei pozzetti', service: 'disostruzione-scarichi-canal-jet' },
      { problem: 'Fossa biologica, pozzetti o vasche da svuotare', service: 'spurgo-fognature' },
      { problem: 'Intasamenti ricorrenti di cui non si conosce la causa', service: 'videoispezione-tubature' },
      { problem: 'Colonne con calcare o depositi che il lavaggio non rimuove', service: 'fresatura-colonne-tubazioni' }
    ],
    faq: [
      {
        q: 'Come capisco se il problema è del mio appartamento o della colonna condominiale?',
        a: 'Se si blocca un solo apparecchio, l’ostruzione è quasi sempre nel tratto privato vicino al sifone. Se rallentano più scarichi insieme, o il problema compare anche nei piani sottostanti, è probabile che sia coinvolta la colonna o il collettore comune: in quel caso è utile coinvolgere l’amministratore.'
      },
      {
        q: 'È meglio intervenire subito o aspettare che peggiori?',
        a: 'Conviene intervenire ai primi segnali. Un’ostruzione parziale può diventare totale in poco tempo e, negli scarichi condominiali, provocare risalite di acqua sporca negli appartamenti ai piani bassi.'
      },
      {
        q: 'Gli interventi sugli scarichi richiedono di rompere pavimenti o muri?',
        a: 'Nella maggior parte dei casi no: si lavora dai punti di accesso esistenti, come sifoni, ispezioni e pozzetti. La demolizione diventa necessaria solo se la tubazione è rotta o schiacciata, e la videoispezione aiuta a limitarla al punto esatto.'
      }
    ]
  },

  landings: {
    'disostruzione-scarichi-canal-jet': {
      metaTitle: 'Disostruzione scarichi canal-jet a Roma',
      metaDescription:
        'Disostruzione di scarichi e colonne con canal-jet ad alta pressione a Roma: rimozione di grassi, sedimenti e radici dalle condotte. Richiedi un sopralluogo.',
      h1: 'Disostruzione scarichi con canal-jet a Roma',
      lead: 'Lavaggio ad alta pressione per liberare condotte, colonne e collettori da grassi, sedimenti e depositi, lavorando dai pozzetti e dalle ispezioni esistenti.',
      intro: [
        'Il canal-jet è un sistema di pulizia idrodinamica: una manichetta flessibile, terminata da un ugello, viene inserita nella tubazione e alimentata con acqua ad alta pressione. I getti orientati all’indietro spingono l’ugello lungo la condotta e, allo stesso tempo, staccano dalle pareti grassi, fanghi e sedimenti.',
        'È la tecnica indicata quando l’ostruzione si trova oltre la portata di una sonda manuale: colonne di scarico condominiali, collettori orizzontali, tratti interrati tra il fabbricato e la fognatura. A differenza dei prodotti chimici non aggredisce le tubazioni e, oltre a rimuovere il tappo, pulisce l’intera sezione del tubo.',
        'La pressione e il tipo di ugello si scelgono in base al diametro e al materiale della condotta. Su tubazioni molto vecchie o fragili è prudente verificarne prima le condizioni con una videoispezione.'
      ],
      when: [
        'L’acqua defluisce lentamente da più scarichi contemporaneamente',
        'Si sentono gorgoglii dai sifoni quando si usa un altro apparecchio',
        'Un pozzetto o un chiusino in cortile si riempie o trabocca',
        'Cattivi odori persistenti provenienti dagli scarichi',
        'Intasamenti che si ripresentano a distanza di poche settimane',
        'Scarichi di cucine professionali appesantiti dai grassi'
      ],
      steps: [
        { t: 'Raccolta informazioni', d: 'Quali scarichi sono coinvolti, da quando, se il problema è già successo e dove si trovano pozzetti e ispezioni.' },
        { t: 'Individuazione del tratto', d: 'Si verifica da quale punto di accesso conviene lavorare per raggiungere l’ostruzione con il percorso più breve.' },
        { t: 'Lavaggio idrodinamico', d: 'L’ugello avanza nella condotta; durante il recupero della manichetta il materiale rimosso viene trascinato verso il pozzetto.' },
        { t: 'Verifica del deflusso', d: 'Si controlla che l’acqua scorra regolarmente e, se necessario, si propone una videoispezione per accertare lo stato del tubo.' }
      ],
      tech: [
        { name: 'Unità canal-jet', icon: 'pipe', text: 'Pompa ad alta pressione con manichetta su avvolgitore, installata su mezzo o carrellata per i tratti interni.' },
        { name: 'Ugelli dedicati', icon: 'wrench', text: 'Ugelli a getto posteriore per l’avanzamento, rotanti per le pareti, frangi-radici per le intrusioni vegetali.' },
        { name: 'Aspirazione', icon: 'flood', text: 'Nei pozzetti molto carichi il materiale rimosso può essere aspirato per evitare che si depositi più a valle.' }
      ],
      gallery: [
        { subject: 'Ugello canal-jet', alt: 'Ugello per canal-jet all’imbocco di una tubazione di scarico' },
        { subject: 'Lavaggio da pozzetto', alt: 'Manichetta ad alta pressione inserita in un pozzetto di ispezione' },
        { subject: 'Collettore pulito', alt: 'Interno di un collettore di scarico dopo il lavaggio idrodinamico' }
      ],
      related: ['idraulica/videoispezione-tubature', 'idraulica/fresatura-colonne-tubazioni', 'idraulica/spurgo-fognature'],
      plus: 'spurgo',
      faq: [
        { q: 'Il canal-jet può danneggiare le tubazioni?', a: 'Se la pressione è adeguata al diametro e al materiale, no. Le condotte in buone condizioni sopportano il lavaggio senza problemi; per tubi molto datati, lesionati o in materiali fragili si valuta prima lo stato con una videoispezione.' },
        { q: 'Che differenza c’è con la sonda a molla?', a: 'La sonda meccanica apre un varco nell’ostruzione, ma lascia gran parte dei depositi attaccati alle pareti. Il canal-jet lava l’intera sezione del tubo e raggiunge tratti più lunghi, per questo è più indicato su colonne e collettori.' },
        { q: 'Serve un punto di accesso particolare?', a: 'Si lavora da sifoni, tappi di ispezione e pozzetti. Se lungo la condotta non esistono accessi utilizzabili, si valuta caso per caso la soluzione meno invasiva.' },
        { q: 'Dopo il lavaggio il problema può ripresentarsi?', a: 'Sì, se la causa resta: ad esempio grassi scaricati regolarmente, pendenze insufficienti o tubi deformati. Una videoispezione finale aiuta a capire se esiste un difetto strutturale da correggere.' }
      ]
    },

    'spurgo-fognature': {
      metaTitle: 'Spurgo fognature e fosse biologiche a Roma',
      metaDescription:
        'Spurgo di fognature, fosse biologiche, pozzetti e vasche a Roma con mezzi di aspirazione. Smaltimento dei reflui tramite trasportatori autorizzati.',
      h1: 'Spurgo fognature e fosse biologiche a Roma',
      lead: 'Svuotamento e pulizia di fosse biologiche, pozzetti, vasche di raccolta e condotte fognarie per abitazioni, condomini e attività.',
      intro: [
        'Lo spurgo consiste nell’aspirare il contenuto di fosse, pozzetti e vasche con un mezzo dotato di cisterna e pompa a depressione, rimuovendo fanghi e sedimenti che col tempo riducono la capacità del sistema e ne compromettono il funzionamento.',
        'Negli edifici non allacciati alla rete fognaria, o dotati di fosse biologiche e vasche Imhoff prima dell’allaccio, la manutenzione periodica è indispensabile: quando il fango occupa troppo volume, i solidi passano nelle condotte a valle e provocano intasamenti e cattivi odori. Lo stesso vale per pozzetti sgrassatori e vasche di sollevamento.',
        'I reflui aspirati sono rifiuti: il loro trasporto e smaltimento deve avvenire tramite soggetti autorizzati, accompagnato dalla documentazione prevista dalla normativa ambientale, come il formulario di identificazione del rifiuto.'
      ],
      when: [
        'La fossa biologica non viene svuotata da molto tempo',
        'Odori forti in prossimità di pozzetti e chiusini',
        'Acqua che ristagna o risale dai pozzetti del cortile',
        'Scarichi del piano terra lenti o con rigurgiti',
        'Manutenzione programmata di pozzetti sgrassatori in ristoranti e bar',
        'Vasche di sollevamento con pompe che lavorano in modo anomalo'
      ],
      steps: [
        { t: 'Sopralluogo e accessi', d: 'Si individuano fosse, pozzetti e vasche, la loro capienza indicativa e la possibilità di avvicinare il mezzo di aspirazione.' },
        { t: 'Aspirazione', d: 'Il contenuto viene aspirato nella cisterna; i fanghi più compatti vengono smossi per poterli rimuovere.' },
        { t: 'Lavaggio', d: 'Pareti e condotte di collegamento possono essere lavate ad alta pressione per eliminare le incrostazioni residue.' },
        { t: 'Smaltimento documentato', d: 'I reflui sono conferiti a impianti autorizzati con la documentazione di trasporto prevista.' }
      ],
      tech: [
        { name: 'Mezzo autospurgo', icon: 'flood', text: 'Automezzo con cisterna e pompa a depressione per aspirare liquidi e fanghi anche a distanza dal punto di sosta.' },
        { name: 'Combinato con canal-jet', icon: 'pipe', text: 'I mezzi combinati uniscono aspirazione e lavaggio ad alta pressione in un unico intervento.' },
        { name: 'Tubazioni di aspirazione', icon: 'wrench', text: 'Manichette prolungabili per raggiungere fosse in cortili, giardini e locali interrati.' }
      ],
      gallery: [
        { subject: 'Mezzo autospurgo', alt: 'Mezzo autospurgo con cisterna durante un intervento' },
        { subject: 'Pozzetto in aspirazione', alt: 'Tubo di aspirazione inserito in un pozzetto fognario' },
        { subject: 'Fossa biologica', alt: 'Chiusino aperto di una fossa biologica in un cortile' }
      ],
      related: ['idraulica/disostruzione-scarichi-canal-jet', 'idraulica/videoispezione-tubature', 'allagamenti/svuotamenti-locali'],
      plus: 'spurgo',
      faq: [
        { q: 'Ogni quanto va svuotata una fossa biologica?', a: 'Dipende dal volume della fossa e dal numero di persone che la utilizzano. Per molte abitazioni si parla di una cadenza annuale, ma la frequenza corretta va valutata osservando il livello dei fanghi durante gli interventi.' },
        { q: 'Che documenti riceve il cliente?', a: 'Lo smaltimento dei reflui è accompagnato dal formulario di identificazione del rifiuto, che attesta trasporto e destinazione. È bene conservarlo, soprattutto per attività commerciali e condomini.' },
        { q: 'Il mezzo deve entrare nel cortile?', a: 'Non sempre. Con tubazioni di aspirazione prolungate si possono raggiungere pozzetti distanti dalla strada; la fattibilità dipende dalla distanza e dal dislivello.' },
        { q: 'In condominio chi deve richiedere lo spurgo?', a: 'Per fosse, pozzetti e condotte comuni la richiesta passa normalmente dall’amministratore, che autorizza l’intervento e ne conserva la documentazione.' }
      ]
    },

    'spurgo-lavandini': {
      metaTitle: 'Spurgo lavandini e lavelli intasati a Roma',
      metaDescription:
        'Lavandino, lavello o doccia intasati a Roma? Pulizia di sifoni e scarichi con sonde e lavaggio mirato, senza prodotti aggressivi. Richiedi un intervento.',
      h1: 'Spurgo lavandini e lavelli intasati a Roma',
      lead: 'Intervento su lavandini, lavelli, docce e vasche che scaricano male: si libera il sifone e si verifica il tratto di scarico fino alla colonna.',
      intro: [
        'Un lavandino che si svuota lentamente è quasi sempre il segnale di un accumulo nel sifone o nei primi metri di tubazione: capelli e residui di sapone in bagno, grassi e residui alimentari in cucina, calcare dove l’acqua è particolarmente dura.',
        'L’intervento parte dallo smontaggio e dalla pulizia del sifone. Se l’ostruzione è più avanti si utilizza una sonda a spirale, manuale o elettrica, che raggiunge il tratto incassato nel muro fino all’innesto con la colonna. Nei lavelli da cucina può essere utile un lavaggio mirato per rimuovere i grassi depositati lungo le pareti del tubo.',
        'I disgorganti chimici più aggressivi andrebbero evitati: possono danneggiare guarnizioni e tubazioni datate, raramente sciolgono l’ostruzione per intero e rendono più rischioso il lavoro successivo sul sifone.'
      ],
      when: [
        'L’acqua ristagna nel lavabo, nella doccia o nella vasca',
        'Gorgoglii dallo scarico quando si svuota un altro apparecchio',
        'Cattivo odore che sale dal lavello',
        'Lavastoviglie o lavatrice che scaricano nel lavello e lo fanno traboccare',
        'Intasamenti frequenti nello stesso punto'
      ],
      steps: [
        { t: 'Verifica', d: 'Si capisce se il problema riguarda un solo apparecchio o più scarichi collegati allo stesso tratto.' },
        { t: 'Pulizia del sifone', d: 'Il sifone viene smontato, pulito e rimontato controllando lo stato delle guarnizioni.' },
        { t: 'Sondatura del tratto', d: 'Se necessario si interviene con la sonda a spirale sul tubo a muro fino all’innesto con la colonna.' },
        { t: 'Prova di scarico', d: 'Si fa scorrere un volume d’acqua abbondante e si verifica l’assenza di perdite al sifone.' }
      ],
      tech: [
        { name: 'Sonda a spirale', icon: 'wrench', text: 'Molla flessibile, manuale o motorizzata, con testine intercambiabili per agganciare o frantumare l’ostruzione.' },
        { name: 'Lavaggio mirato', icon: 'drop', text: 'Getto d’acqua in pressione per rimuovere grassi e residui dalle pareti dei tratti di cucina.' },
        { name: 'Ricambi sifone', icon: 'pipe', text: 'Guarnizioni e componenti del sifone deteriorati possono essere sostituiti durante l’intervento.' }
      ],
      gallery: [
        { subject: 'Sifone smontato', alt: 'Sifone di un lavabo smontato per la pulizia' },
        { subject: 'Sonda a spirale', alt: 'Sonda a spirale inserita nello scarico di un lavello' },
        { subject: 'Lavello da cucina', alt: 'Lavello da cucina con scarico ripristinato' }
      ],
      related: ['idraulica/disostruzione-scarichi-canal-jet', 'idraulica/videoispezione-tubature', 'muratura/rifacimento-bagni'],
      plus: 'piccola-idraulica',
      faq: [
        { q: 'Posso usare la soda caustica per sbloccare il lavandino?', a: 'È sconsigliato. I prodotti fortemente caustici possono rovinare guarnizioni e tubi vecchi, sono pericolosi per pelle e occhi e, se l’ostruzione non si scioglie, restano nel sifone durante lo smontaggio.' },
        { q: 'Perché il lavello della cucina si intasa spesso?', a: 'Grassi e oli di cottura si solidificano raffreddandosi lungo le pareti del tubo. Anche pendenze insufficienti nel tratto a muro favoriscono i depositi. Evitare di versare oli nello scarico riduce molto il problema.' },
        { q: 'Si intasa anche la doccia: è collegato?', a: 'Può esserlo se doccia e lavabo confluiscono nello stesso tratto prima della colonna. In bagno la causa più comune sono i capelli che si accumulano nella piletta e nel sifone.' },
        { q: 'Serve smontare i mobili sotto il lavello?', a: 'Di solito basta liberare lo spazio sotto il sifone. Solo in caso di tubazioni particolarmente nascoste può essere necessario rimuovere temporaneamente un pannello.' }
      ]
    },

    'videoispezione-tubature': {
      metaTitle: 'Videoispezione tubature e fognature a Roma',
      metaDescription:
        'Videoispezione di tubazioni e fognature a Roma con telecamera: individua ostruzioni, rotture, radici e contropendenze senza demolire. Richiedi una verifica.',
      h1: 'Videoispezione tubature e fognature a Roma',
      lead: 'Una telecamera all’interno delle condotte per vedere cosa succede davvero: ostruzioni, rotture, radici e deformazioni, senza aprire pavimenti e muri.',
      intro: [
        'La videoispezione permette di osservare l’interno di una tubazione di scarico attraverso una telecamera montata su un cavo spingibile o su un carrello motorizzato. Le immagini, visibili in tempo reale su un monitor, mostrano lo stato delle pareti, la presenza di depositi, crepe, giunti disallineati, intrusioni di radici o tratti schiacciati.',
        'È lo strumento che trasforma un’ipotesi in una diagnosi: prima di scavare o rompere, si sa dove si trova il problema e di che tipo è. Con una sonda trasmittente montata sulla testa della telecamera è inoltre possibile localizzare dalla superficie la posizione e la profondità del punto ispezionato.',
        'Viene richiesta spesso dopo una disostruzione, per verificare che la condotta sia integra, oppure prima dell’acquisto di un immobile, per conoscere le condizioni della rete di scarico, e in caso di sinistri, per documentare un danno.'
      ],
      when: [
        'Intasamenti ricorrenti nello stesso tratto senza una causa evidente',
        'Odori di fognatura in ambienti interni',
        'Cedimenti del pavimento o del terreno lungo il percorso di una condotta',
        'Infiltrazioni o umidità vicino a tubazioni di scarico',
        'Verifica dopo un lavaggio con canal-jet',
        'Valutazione delle condizioni della rete prima di lavori o di un acquisto'
      ],
      steps: [
        { t: 'Preparazione', d: 'Se la condotta è piena di depositi può essere necessario un lavaggio preliminare per rendere visibili le pareti.' },
        { t: 'Ispezione', d: 'La telecamera avanza dal punto di accesso e registra il percorso, annotando la distanza percorsa.' },
        { t: 'Localizzazione', d: 'I punti critici possono essere individuati dalla superficie tramite il segnale della sonda trasmittente.' },
        { t: 'Esito', d: 'Si descrivono le anomalie riscontrate e le possibili soluzioni; il filmato può essere consegnato come documentazione.' }
      ],
      tech: [
        { name: 'Telecamera a spinta', icon: 'camera', text: 'Testa con illuminazione a LED su cavo semirigido, adatta a diametri ridotti e curve degli scarichi domestici.' },
        { name: 'Telecamera su carrello', icon: 'layers', text: 'Sistemi motorizzati per condotte di diametro maggiore e tratti lunghi, con testa orientabile.' },
        { name: 'Localizzatore', icon: 'radar', text: 'Ricevitore che rileva la sonda trasmittente in testa alla telecamera e indica posizione e profondità.' }
      ],
      gallery: [
        { subject: 'Telecamera per tubazioni', alt: 'Testa di una telecamera per videoispezione con illuminazione a LED' },
        { subject: 'Monitor di ispezione', alt: 'Monitor che mostra l’interno di una tubazione durante la videoispezione' },
        { subject: 'Localizzazione in superficie', alt: 'Tecnico che localizza una condotta dalla superficie con un ricevitore' }
      ],
      related: ['idraulica/disostruzione-scarichi-canal-jet', 'ricerca-perdite-occulte/ricerca-perdite-tubazioni-scarico', 'idraulica/fresatura-colonne-tubazioni'],
      plus: 'idraulica',
      faq: [
        { q: 'La videoispezione trova anche le perdite d’acqua?', a: 'Sulle tubazioni di scarico sì, perché mostra rotture e giunti scollegati. Per le tubazioni in pressione dell’acqua potabile e del riscaldamento si usano invece tecniche diverse, come geofono, gas tracciante e termografia.' },
        { q: 'Bisogna pulire il tubo prima dell’ispezione?', a: 'Spesso sì: acqua stagnante e depositi coprono la visuale. In molti casi lavaggio e videoispezione vengono eseguiti in sequenza nello stesso intervento.' },
        { q: 'Posso ricevere il video dell’ispezione?', a: 'La registrazione è una delle utilità principali del servizio e può essere consegnata come documentazione, ad esempio per l’amministratore o per una pratica assicurativa.' },
        { q: 'Che diametri si possono ispezionare?', a: 'Dipende dall’attrezzatura: le telecamere a spinta lavorano sugli scarichi domestici di piccolo diametro, i sistemi su carrello su collettori e fognature più grandi.' }
      ]
    },

    'fresatura-colonne-tubazioni': {
      metaTitle: 'Fresatura colonne di scarico a Roma',
      metaDescription:
        'Fresatura meccanica di colonne e tubazioni di scarico a Roma: rimozione di calcare, incrostazioni, radici e residui di cemento. Richiedi una valutazione.',
      h1: 'Fresatura di colonne e tubazioni di scarico a Roma',
      lead: 'Rimozione meccanica delle incrostazioni che il lavaggio non riesce a staccare, per restituire alle colonne il loro diametro utile.',
      intro: [
        'Con gli anni le colonne di scarico, soprattutto in ghisa e nei palazzi con acqua molto calcarea, si rivestono internamente di strati duri che riducono progressivamente la sezione di passaggio. Su questi depositi il solo getto d’acqua è poco efficace: serve un’azione meccanica.',
        'La fresatura utilizza utensili rotanti, come frese o testine a catene, azionati da un albero flessibile o montati su sistemi robotizzati. Ruotando ad alta velocità asportano calcare, incrostazioni, radici e residui di malta o cemento finiti accidentalmente nello scarico durante lavori edili.',
        'Al termine la tubazione viene lavata e controllata con la telecamera. La fresatura è anche la preparazione necessaria per le tecniche di risanamento senza scavo, come il relining, che richiedono pareti pulite e regolari.'
      ],
      when: [
        'Colonne condominiali che si intasano nonostante lavaggi frequenti',
        'Videoispezione che mostra incrostazioni dure o diametro ridotto',
        'Radici penetrate nei giunti delle condotte esterne',
        'Residui di cemento o malta finiti nello scarico dopo lavori',
        'Preparazione della tubazione per un risanamento interno'
      ],
      steps: [
        { t: 'Videoispezione preliminare', d: 'Si valutano spessore e tipo di deposito e lo stato del tubo per scegliere l’utensile adatto.' },
        { t: 'Fresatura a tratti', d: 'L’utensile avanza gradualmente nella colonna, controllando l’avanzamento per non sollecitare le pareti.' },
        { t: 'Lavaggio', d: 'Il materiale asportato viene allontanato con un lavaggio ad alta pressione.' },
        { t: 'Controllo finale', d: 'Una nuova ispezione con telecamera verifica il risultato e lo stato del tubo.' }
      ],
      tech: [
        { name: 'Fresatrice ad albero flessibile', icon: 'wrench', text: 'Motore con albero rotante che trasmette il moto a frese e catene all’interno della colonna.' },
        { name: 'Testine a catene', icon: 'layers', text: 'Utensili che sfruttano la forza centrifuga per staccare depositi senza aggredire troppo le pareti.' },
        { name: 'Sistemi robotizzati', icon: 'camera', text: 'Robot con telecamera e fresa orientabile, usati sui collettori di diametro maggiore.' }
      ],
      gallery: [
        { subject: 'Fresa per tubazioni', alt: 'Fresa meccanica per la pulizia di tubazioni di scarico' },
        { subject: 'Incrostazioni in colonna', alt: 'Interno di una colonna di scarico con incrostazioni calcaree' },
        { subject: 'Colonna dopo la fresatura', alt: 'Tubazione di scarico con pareti pulite dopo la fresatura' }
      ],
      related: ['idraulica/videoispezione-tubature', 'idraulica/disostruzione-scarichi-canal-jet', 'muratura/riparazioni-murarie'],
      plus: 'spurgo',
      faq: [
        { q: 'Che differenza c’è tra fresatura e canal-jet?', a: 'Il canal-jet lava e rimuove depositi teneri come grassi e fanghi. La fresatura agisce meccanicamente su materiali duri come calcare, radici e cemento, che l’acqua non riesce a staccare.' },
        { q: 'La fresatura è sicura su colonne in ghisa vecchie?', a: 'Dipende dallo stato del tubo. Se la ghisa è molto assottigliata o lesionata il rischio aumenta, per questo l’ispezione preliminare è fondamentale per decidere se e come procedere.' },
        { q: 'Durante l’intervento si possono usare gli scarichi?', a: 'Nella colonna interessata no: gli scarichi collegati vanno sospesi per la durata del lavoro. In condominio è opportuno avvisare i residenti in anticipo.' },
        { q: 'Dopo la fresatura serve il relining?', a: 'Non sempre. Se il tubo è integro basta la pulizia; se presenta fessure o porosità, il risanamento interno può evitare la sostituzione con demolizione.' }
      ]
    }
  }
};
