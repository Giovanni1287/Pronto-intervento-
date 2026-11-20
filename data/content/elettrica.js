/**
 * CONTENUTI — ELETTRICA (categoria + 4 landing)
 * Nessuna abilitazione dichiarata: i riferimenti normativi sono informativi.
 * L'abilitazione dell'impresa ai sensi del DM 37/2008 va confermata dal titolare
 * (company.certifications in site.config.js) prima di qualsiasi menzione.
 */
export default {
  category: {
    metaTitle: 'Impianti elettrici a Roma',
    metaDescription:
      'Ricerca guasti, riparazione e rifacimento di impianti elettrici, quadri e linee a Roma e provincia, con attenzione alla sicurezza. Richiedi una verifica.',
    h1: 'Impianti elettrici a Roma: guasti, quadri e rifacimenti',
    lead: 'Dalla presa che non funziona al quadro da sostituire: diagnosi dei guasti, riparazioni e adeguamento degli impianti di abitazioni e attività.',
    intro: [
      'Un impianto elettrico può funzionare per decenni senza dare segni evidenti, ma l’invecchiamento di cavi, morsetti e dispositivi di protezione riduce i margini di sicurezza. Aumentano intanto i carichi: piani a induzione, pompe di calore, ricariche e condizionatori chiedono all’impianto più di quanto era stato previsto.',
      'Ogni intervento parte da una verifica: misure, controllo delle protezioni e ricerca della causa. Solo dopo si decide se basta una riparazione puntuale, se conviene aggiornare il quadro o se l’impianto va rifatto. Per legge i lavori sugli impianti elettrici negli edifici devono essere eseguiti da imprese abilitate, che al termine rilasciano la dichiarazione di conformità.'
    ],
    guide: [
      { problem: 'Una presa, un interruttore o un punto luce non funziona', service: 'riparazione-impianti-elettrici' },
      { problem: 'Il salvavita scatta o manca la corrente in una parte della casa', service: 'guasti-corto-circuiti' },
      { problem: 'Quadro datato, con fusibili o senza differenziale', service: 'quadri-elettrici' },
      { problem: 'Impianto vecchio, ristrutturazione o nuovi carichi importanti', service: 'rifacimento-impianti-elettrici' }
    ],
    faq: [
      { q: 'Quando un impianto elettrico va considerato vecchio?', a: 'Non c’è una data unica, ma sono segnali tipici l’assenza dell’interruttore differenziale, la mancanza del conduttore di terra, cavi con isolamento in tela o gomma indurita e prese non adeguate agli apparecchi di oggi.' },
      { q: 'Cos’è la dichiarazione di conformità?', a: 'È il documento previsto dal DM 37/2008 che l’impresa installatrice rilascia al termine dei lavori sull’impianto, attestando che è stato realizzato secondo la regola dell’arte. Va conservata insieme agli allegati.' },
      { q: 'Posso intervenire da solo su una presa?', a: 'Lavorare su parti in tensione è pericoloso anche per interventi apparentemente semplici. È sempre consigliabile affidarsi a personale qualificato, che opera con l’impianto sezionato e verifica l’assenza di tensione.' }
    ]
  },

  landings: {
    'riparazione-impianti-elettrici': {
      metaTitle: 'Riparazione impianti elettrici a Roma',
      metaDescription:
        'Riparazione di prese, interruttori, punti luce e linee elettriche danneggiate a Roma: diagnosi del guasto e ripristino in sicurezza. Richiedi un intervento.',
      h1: 'Riparazione di impianti elettrici a Roma',
      lead: 'Prese annerite, interruttori che scaldano, luci che sfarfallano: si individua il componente difettoso e si ripristina il funzionamento in sicurezza.',
      intro: [
        'Molti guasti domestici dipendono da un singolo componente: una presa consumata, un morsetto allentato, un interruttore deteriorato, una scatola di derivazione dove le connessioni si sono ossidate. Sono difetti piccoli ma da non sottovalutare, perché un contatto imperfetto genera calore e può danneggiare isolamenti e frutti vicini.',
        'La riparazione inizia con il sezionamento della linea interessata e la verifica dell’assenza di tensione. Si individua il punto difettoso con prove e misure, si sostituiscono i componenti compromessi e si controlla lo stato dei conduttori: se l’isolamento appare indurito o bruciato, il problema può estendersi oltre il singolo punto.',
        'Quando un componente da sostituire non è più compatibile con quelli esistenti, o la riparazione rivela un impianto molto datato, viene segnalato insieme alle possibili alternative.'
      ],
      when: [
        'Prese o placche annerite, deformate o calde al tatto',
        'Odore di bruciato vicino a prese, interruttori o scatole',
        'Luci che sfarfallano senza che la lampadina sia guasta',
        'Interruttori che non danno più contatto o fanno scintille',
        'Un punto luce o una linea che hanno smesso di funzionare',
        'Danni causati da infiltrazioni d’acqua vicino all’impianto'
      ],
      steps: [
        { t: 'Descrizione del guasto', d: 'Cosa non funziona, da quando e se ci sono stati eventi particolari come temporali, infiltrazioni o lavori.' },
        { t: 'Messa in sicurezza', d: 'La linea viene sezionata e si verifica l’assenza di tensione prima di aprire scatole e frutti.' },
        { t: 'Ricerca e riparazione', d: 'Si individua il componente difettoso e si sostituisce, controllando connessioni e conduttori vicini.' },
        { t: 'Prove finali', d: 'Si verifica il funzionamento del circuito e l’intervento delle protezioni a monte.' }
      ],
      tech: [
        { name: 'Multimetro e pinza amperometrica', icon: 'gauge', text: 'Misurano tensione, continuità e corrente assorbita per capire dove il circuito si interrompe o si sovraccarica.' },
        { name: 'Rilevatore di tensione', icon: 'bolt', text: 'Strumento per verificare l’assenza di tensione prima di lavorare sui componenti.' },
        { name: 'Termometro a infrarossi', icon: 'thermo', text: 'Evidenzia punti di surriscaldamento su prese, morsetti e dispositivi sotto carico.' }
      ],
      gallery: [
        { subject: 'Presa danneggiata', alt: 'Presa elettrica annerita da surriscaldamento' },
        { subject: 'Misure sul circuito', alt: 'Misura di tensione su una presa con multimetro' },
        { subject: 'Scatola di derivazione', alt: 'Scatola di derivazione aperta con morsetti e conduttori' }
      ],
      related: ['elettrica/guasti-corto-circuiti', 'elettrica/quadri-elettrici', 'elettrica/rifacimento-impianti-elettrici'],
      plus: 'elettrica',
      faq: [
        { q: 'Una presa calda è pericolosa?', a: 'Sì, è un campanello d’allarme. Il calore indica un contatto imperfetto o un sovraccarico: conviene scollegare gli apparecchi e farla controllare, perché il surriscaldamento può danneggiare l’isolamento e innescare un principio d’incendio.' },
        { q: 'Le luci sfarfallano: è un problema dell’impianto?', a: 'Se lo fanno più lampade o in corrispondenza dell’accensione di grossi apparecchi, la causa può essere una connessione allentata o un sovraccarico della linea. Se riguarda una sola lampada, spesso dipende dalla lampada o dal suo alimentatore.' },
        { q: 'Si può sostituire solo il componente guasto?', a: 'Di solito sì, purché il resto della linea sia in buone condizioni e il nuovo componente sia compatibile. Se emergono conduttori deteriorati, la riparazione può richiedere il rifacimento del tratto.' },
        { q: 'Dopo un’infiltrazione d’acqua cosa devo fare?', a: 'Se l’acqua ha raggiunto prese o scatole, è prudente staccare l’interruttore della linea interessata e non riattivarla finché l’impianto non è stato asciugato e verificato.' }
      ]
    },

    'guasti-corto-circuiti': {
      metaTitle: 'Guasti elettrici e corto circuiti a Roma',
      metaDescription:
        'Salvavita che scatta, corto circuito o blackout parziale a Roma? Ricerca del guasto, isolamento della linea difettosa e ripristino in sicurezza.',
      h1: 'Guasti elettrici e corto circuiti a Roma',
      lead: 'Quando il differenziale scatta o una parte della casa resta senza corrente, si cerca la linea in guasto e si ripristina l’impianto in sicurezza.',
      intro: [
        'Gli interruttori del quadro intervengono per motivi diversi, e capire quale è scattato aiuta già a orientare la diagnosi. Il differenziale, il cosiddetto salvavita, interviene quando una parte della corrente si disperde verso terra: un apparecchio con l’isolamento danneggiato, umidità in una scatola, un cavo lesionato. Il magnetotermico, invece, interviene per sovraccarico o per corto circuito, quando la corrente supera i valori previsti.',
        'La ricerca procede per esclusione: si scollegano gli utilizzatori, si separano le linee e si misurano gli isolamenti finché il difetto non viene circoscritto. Un guasto intermittente, che si presenta solo con la pioggia o in certi orari, richiede pazienza e misure ripetute.',
        'Riarmare più volte un interruttore che scatta non è una soluzione: la protezione sta segnalando un problema che va trovato, non aggirato.'
      ],
      when: [
        'Il salvavita scatta e non si riesce a riarmarlo',
        'Il differenziale interviene a intervalli, ad esempio quando piove',
        'Una zona della casa è rimasta senza corrente',
        'Si è sentito uno schiocco con scintille da una presa o da un apparecchio',
        'L’interruttore generale scatta quando si accendono più elettrodomestici',
        'Odore di plastica bruciata dopo un blackout'
      ],
      steps: [
        { t: 'Lettura del quadro', d: 'Si verifica quale protezione è intervenuta e su quali circuiti: già questo distingue dispersione e sovraccarico.' },
        { t: 'Esclusione degli utilizzatori', d: 'Si scollegano gli apparecchi per capire se il guasto è in un elettrodomestico o nell’impianto.' },
        { t: 'Misure di isolamento', d: 'Le linee vengono separate e controllate per individuare il tratto con isolamento compromesso.' },
        { t: 'Riparazione e prova', d: 'Si elimina la causa, si ricollega la linea e si verifica il corretto intervento delle protezioni.' }
      ],
      tech: [
        { name: 'Misuratore di isolamento', icon: 'gauge', text: 'Applica una tensione di prova ai conduttori per rilevare dispersioni che non si vedono a occhio.' },
        { name: 'Tester per differenziali', icon: 'bolt', text: 'Verifica che il salvavita intervenga entro i tempi e le correnti previsti.' },
        { name: 'Cercafili', icon: 'radar', text: 'Aiuta a seguire il percorso dei cavi sotto traccia e a individuare il punto di interruzione.' }
      ],
      gallery: [
        { subject: 'Interruttore differenziale', alt: 'Interruttore differenziale in un quadro elettrico domestico' },
        { subject: 'Misura di isolamento', alt: 'Strumento per la misura dell’isolamento collegato a una linea elettrica' },
        { subject: 'Ricerca guasto', alt: 'Tecnico che controlla le linee di un quadro elettrico' }
      ],
      related: ['elettrica/quadri-elettrici', 'elettrica/riparazione-impianti-elettrici', 'allagamenti/svuotamenti-post-alluvionali'],
      plus: 'elettrica',
      faq: [
        { q: 'Il salvavita scatta subito: cosa posso fare prima di chiamare?', a: 'Si possono spegnere gli interruttori delle singole linee e staccare le spine degli elettrodomestici, poi riarmare il differenziale e riattivare una linea alla volta. Se scatta di nuovo con tutto scollegato, il guasto è nell’impianto e va lasciato a un tecnico.' },
        { q: 'Perché il differenziale scatta solo quando piove?', a: 'È un sintomo tipico di umidità che raggiunge una scatola, una presa esterna, un punto luce in giardino o un cavo con isolamento danneggiato. Il guasto va cercato proprio nelle condizioni in cui si manifesta.' },
        { q: 'Un elettrodomestico può far scattare il salvavita?', a: 'Sì, molto spesso. Lavatrici, scaldabagno e forni con resistenze deteriorate sono tra le cause più frequenti di dispersione verso terra.' },
        { q: 'Che differenza c’è tra sovraccarico e corto circuito?', a: 'Il sovraccarico è un assorbimento superiore a quello sopportato dalla linea, ad esempio troppi apparecchi accesi insieme. Il corto circuito è un contatto diretto tra conduttori che genera correnti molto elevate e fa intervenire immediatamente la protezione.' }
      ]
    },

    'quadri-elettrici': {
      metaTitle: 'Quadri elettrici a Roma',
      metaDescription:
        'Sostituzione, ampliamento e riordino di quadri elettrici a Roma: differenziali, magnetotermici, suddivisione delle linee ed etichettatura. Richiedi una verifica.',
      h1: 'Quadri elettrici a Roma: sostituzione e adeguamento',
      lead: 'Il quadro è il centro di controllo dell’impianto: protezioni adeguate e linee ben suddivise rendono la casa più sicura e i guasti più facili da gestire.',
      intro: [
        'Nel quadro elettrico si trovano i dispositivi che proteggono persone e impianto: gli interruttori magnetotermici, che intervengono su sovraccarichi e corto circuiti, e i differenziali, che rilevano le dispersioni verso terra. Nei quadri più vecchi si incontrano ancora fusibili, un solo differenziale per tutta la casa o, a volte, nessuna protezione differenziale.',
        'Aggiornare il quadro significa scegliere protezioni coerenti con le linee e con gli apparecchi collegati, suddividere i circuiti in modo che un guasto non lasci al buio l’intera abitazione e predisporre spazio per eventuali ampliamenti. Su richiesta si possono valutare anche dispositivi di protezione dalle sovratensioni.',
        'Il riferimento tecnico per gli impianti utilizzatori in bassa tensione è la norma CEI 64-8. Un quadro ordinato, con ogni interruttore etichettato, permette a chiunque in casa di capire quale linea è intervenuta.'
      ],
      when: [
        'Il quadro ha ancora fusibili o interruttori molto datati',
        'Un unico differenziale protegge tutta l’abitazione',
        'Gli interruttori non sono etichettati e non si sa cosa proteggono',
        'Si aggiungono carichi importanti come piano a induzione o pompa di calore',
        'Il contenitore è danneggiato, senza sportello o con parti scoperte',
        'Le protezioni intervengono spesso senza motivo apparente'
      ],
      steps: [
        { t: 'Rilievo delle linee', d: 'Si identificano i circuiti esistenti, i carichi collegati e lo stato del conduttore di terra.' },
        { t: 'Proposta', d: 'Si definisce la nuova composizione del quadro: protezioni, suddivisione delle linee e spazio di riserva.' },
        { t: 'Sostituzione', d: 'Con l’impianto sezionato si installa il nuovo quadro e si ricollegano le linee in modo ordinato.' },
        { t: 'Verifiche ed etichette', d: 'Si provano le protezioni, si etichetta ogni interruttore e si consegna la documentazione prevista.' }
      ],
      tech: [
        { name: 'Interruttori magnetotermici', icon: 'bolt', text: 'Proteggono ogni linea da sovraccarichi e corto circuiti, dimensionati sulla sezione dei cavi.' },
        { name: 'Differenziali', icon: 'shield', text: 'Interrompono il circuito in caso di dispersione verso terra; esistono tipologie diverse in base agli apparecchi collegati.' },
        { name: 'Protezione da sovratensioni', icon: 'layers', text: 'Scaricatori che limitano i picchi di tensione provenienti dalla rete, ad esempio durante i temporali.' }
      ],
      gallery: [
        { subject: 'Quadro elettrico ordinato', alt: 'Quadro elettrico domestico con interruttori etichettati' },
        { subject: 'Cablaggio del quadro', alt: 'Cablaggio interno di un quadro elettrico in fase di montaggio' },
        { subject: 'Vecchio quadro con fusibili', alt: 'Quadro elettrico datato con portafusibili' }
      ],
      related: ['elettrica/guasti-corto-circuiti', 'elettrica/rifacimento-impianti-elettrici', 'elettrica/riparazione-impianti-elettrici'],
      plus: 'elettrica',
      faq: [
        { q: 'Basta sostituire il quadro per mettere a norma l’impianto?', a: 'Non necessariamente. Il quadro migliora molto la protezione, ma lo stato dei cavi, delle prese e dell’impianto di terra va valutato a parte: se sono inadeguati, il solo quadro non basta.' },
        { q: 'Perché conviene avere più differenziali?', a: 'Suddividendo le linee su più differenziali, una dispersione su un circuito non toglie corrente a tutta la casa: frigorifero, caldaia o allarme possono restare alimentati.' },
        { q: 'Quanto dura la sostituzione di un quadro?', a: 'In un’abitazione standard l’intervento si conclude in genere nell’arco di una giornata, con l’interruzione della corrente limitata alla fase di collegamento.' },
        { q: 'Si può ampliare il quadro esistente?', a: 'Se il contenitore ha spazio libero e le protezioni a monte sono adeguate, sì. Se il quadro è pieno o datato, sostituirlo è spesso la soluzione più ordinata.' }
      ]
    },

    'rifacimento-impianti-elettrici': {
      metaTitle: 'Rifacimento impianti elettrici a Roma',
      metaDescription:
        'Rifacimento parziale o completo di impianti elettrici a Roma per abitazioni e locali commerciali: nuove linee, quadro, prese e documentazione di conformità.',
      h1: 'Rifacimento di impianti elettrici a Roma',
      lead: 'Quando riparare non basta più: nuove linee, nuovo quadro e punti di utilizzo pensati per come si vive e si lavora oggi.',
      intro: [
        'Il rifacimento diventa la scelta più sensata quando l’impianto è privo di messa a terra, i cavi hanno isolamenti deteriorati, le linee sono sottodimensionate rispetto ai consumi attuali o quando si affronta una ristrutturazione che modifica gli ambienti.',
        'Può essere completo o parziale: in alcuni casi si riutilizzano le tubazioni esistenti sfilando e sostituendo i cavi, in altri occorre realizzare nuove tracce. La progettazione tiene conto di dove serviranno prese, punti luce, linee dedicate per gli elettrodomestici più energivori e predisposizioni per dati, domotica o ricarica.',
        'Il DM 37/2008 prevede un progetto dell’impianto e, nei casi indicati dalla norma, la sua redazione da parte di un professionista iscritto all’albo. Al termine l’impresa installatrice rilascia la dichiarazione di conformità con i relativi allegati.'
      ],
      when: [
        'Impianto senza conduttore di terra o senza interruttore differenziale',
        'Cavi con isolamento in tela, gomma indurita o visibilmente deteriorati',
        'Prese insufficienti e uso continuo di ciabatte e adattatori',
        'Ristrutturazione con modifica della distribuzione degli ambienti',
        'Nuovi carichi elevati: induzione, pompa di calore, ricarica di veicoli',
        'Apertura di un’attività che richiede linee dedicate'
      ],
      steps: [
        { t: 'Sopralluogo', d: 'Si valutano lo stato dell’impianto esistente, le esigenze di utilizzo e i vincoli dell’immobile.' },
        { t: 'Progetto e preventivo', d: 'Si definiscono linee, punti, quadro e fasi di lavoro, coordinandosi con le altre lavorazioni previste.' },
        { t: 'Esecuzione', d: 'Tracce, posa delle tubazioni, cablaggio, montaggio di quadro e frutti; le opere murarie si chiudono dopo la posa.' },
        { t: 'Collaudo e documenti', d: 'Prove e misure finali e consegna della documentazione di conformità prevista dalla legge.' }
      ],
      tech: [
        { name: 'Distribuzione sottotraccia', icon: 'layers', text: 'Tubazioni corrugate e scatole incassate nelle pareti, con percorsi che facilitano la manutenzione futura.' },
        { name: 'Linee dedicate', icon: 'bolt', text: 'Circuiti separati per cucina, climatizzazione e apparecchi ad alto assorbimento.' },
        { name: 'Strumenti di collaudo', icon: 'gauge', text: 'Misure di isolamento, continuità della terra e prove dei differenziali a fine lavori.' }
      ],
      gallery: [
        { subject: 'Tracce e corrugati', alt: 'Tracce nella parete con tubazioni corrugate per l’impianto elettrico' },
        { subject: 'Cablaggio nuovo impianto', alt: 'Posa dei cavi in un nuovo impianto elettrico' },
        { subject: 'Prese e frutti nuovi', alt: 'Nuove prese e interruttori montati a parete' }
      ],
      related: ['elettrica/quadri-elettrici', 'muratura/piccole-ristrutturazioni', 'muratura/riparazioni-murarie'],
      plus: 'elettrica',
      faq: [
        { q: 'Si può rifare l’impianto senza rompere le pareti?', a: 'In parte sì: se le tubazioni esistenti sono in buono stato e di diametro sufficiente, i cavi nuovi possono essere sfilati al loro interno. Nuovi punti o percorsi richiedono invece tracce, da ripristinare al termine.' },
        { q: 'Quanto tempo richiede il rifacimento di un appartamento?', a: 'Dipende da superficie, numero di punti e coordinamento con le altre lavorazioni. Si definisce con il sopralluogo, insieme alle fasi in cui l’abitazione resterà senza corrente.' },
        { q: 'Serve un progetto firmato da un professionista?', a: 'Il DM 37/2008 indica i casi, legati ad esempio alla superficie e alla potenza impegnata, in cui il progetto deve essere redatto da un professionista iscritto all’albo. Negli altri casi può essere predisposto dal responsabile tecnico dell’impresa installatrice.' },
        { q: 'Conviene farlo insieme ad altri lavori?', a: 'Sì: coordinare impianto elettrico, idraulico e opere murarie evita di riaprire tracce e pavimenti già finiti e riduce tempi e disagi.' }
      ]
    }
  }
};
