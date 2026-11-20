/**
 * CONTENUTI — ALLAGAMENTI (categoria + 2 landing)
 * Nessuna promessa di intervento immediato o di tempi garantiti:
 * disponibilità e tempi vanno confermati dal titolare.
 */
export default {
  category: {
    metaTitle: 'Svuotamento locali allagati a Roma',
    metaDescription:
      'Svuotamento di cantine, box, scantinati e locali allagati a Roma dopo piogge intense o guasti: pompe, aspirazione di acqua e fango, indicazioni per i danni.',
    h1: 'Allagamenti a Roma: svuotamento di locali e cantine',
    lead: 'Rimozione di acqua e fango da cantine, box, magazzini e piani interrati, dopo eventi meteo intensi o guasti agli impianti.',
    intro: [
      'Un locale allagato va gestito con ordine: prima la sicurezza, poi lo svuotamento, infine l’asciugatura e la ricerca della causa. Acqua e impianto elettrico sono una combinazione pericolosa, e i materiali impregnati continuano a subire danni anche dopo che l’acqua è stata tolta.',
      'Le modalità di intervento cambiano molto in base all’origine dell’acqua. Dopo un nubifragio l’acqua porta con sé fango, detriti e spesso reflui fognari, e lo svuotamento ha senso solo quando il livello esterno si è abbassato. Se invece la causa è un tubo rotto o una pompa di sollevamento guasta, l’acqua è più pulita ma occorre fermare subito la fonte.',
      'Tempi e disponibilità dipendono dal numero di richieste, che durante le allerte meteo può essere molto alto: le richieste vengono valutate e organizzate in base alla gravità della situazione.'
    ],
    guide: [
      { problem: 'Cantine e piani interrati invasi da acqua e fango dopo la pioggia', service: 'svuotamenti-post-alluvionali' },
      { problem: 'Locale allagato per un tubo rotto o una pompa guasta', service: 'svuotamenti-locali' },
      { problem: 'Garage, magazzini o grandi superfici da svuotare', service: 'svuotamenti-locali' }
    ],
    faq: [
      { q: 'Cosa devo fare subito se il locale è allagato?', a: 'Togliere corrente alla zona interessata dal quadro, se è possibile farlo senza entrare nell’acqua, chiudere l’acqua se la causa è un tubo, non toccare apparecchi elettrici e scattare foto per documentare i danni.' },
      { q: 'L’assicurazione copre l’allagamento?', a: 'Dipende dalla polizza: alcune coprono i danni da acqua condotta, altre anche eventi atmosferici o alluvioni. Fotografie, descrizione dei fatti e documentazione degli interventi sono utili in ogni caso.' },
      { q: 'Dopo lo svuotamento il locale è a posto?', a: 'No: muri e pavimenti restano impregnati. Servono ventilazione e deumidificazione, la rimozione dei materiali danneggiati e, se l’acqua era sporca, una pulizia accurata delle superfici.' }
    ]
  },

  landings: {
    'svuotamenti-post-alluvionali': {
      metaTitle: 'Svuotamenti post alluvione a Roma',
      metaDescription:
        'Svuotamento di cantine, box e piani interrati dopo alluvioni e nubifragi a Roma: aspirazione di acqua, fango e detriti e indicazioni per il ripristino.',
      h1: 'Svuotamento di locali dopo alluvioni e nubifragi a Roma',
      lead: 'Dopo un evento meteo intenso, acqua e fango invadono cantine, box e piani terra: si organizza lo svuotamento quando le condizioni lo consentono.',
      intro: [
        'Le piogge intense mettono in crisi reti fognarie e caditoie, e l’acqua cerca la strada più bassa: rampe dei garage, bocche di lupo, cantine, locali seminterrati. A differenza di un guasto idraulico, l’acqua alluvionale è torbida, carica di fango e detriti e può contenere reflui fognari risaliti dagli scarichi.',
        'Per questo lo svuotamento richiede attrezzature in grado di gestire liquidi sporchi e materiali solidi: pompe per acque cariche, motopompe dove manca l’alimentazione elettrica e, per i depositi di fango, l’aspirazione con mezzi dedicati. Il pompaggio è efficace quando il livello dell’acqua all’esterno si è abbassato: svuotare un locale mentre la strada è ancora allagata rischia di essere inutile.',
        'Una volta rimossa l’acqua, il lavoro non è finito: fango e residui vanno asportati, le superfici pulite e gli ambienti asciugati, valutando gli impianti elettrici prima di riattivarli.'
      ],
      when: [
        'Cantine, box o seminterrati allagati dopo un temporale',
        'Fango e detriti depositati sui pavimenti dopo il deflusso dell’acqua',
        'Acqua risalita dagli scarichi a pavimento durante la pioggia',
        'Rampe e corsie di garage condominiali invase dall’acqua',
        'Pompe di sollevamento sommerse o fuori servizio'
      ],
      steps: [
        { t: 'Valutazione della richiesta', d: 'Superficie, altezza dell’acqua, presenza di fango, accessibilità e condizioni dell’impianto elettrico.' },
        { t: 'Messa in sicurezza', d: 'Si verifica che i locali siano privi di tensione e accessibili senza rischi prima di iniziare.' },
        { t: 'Pompaggio e aspirazione', d: 'Si rimuove l’acqua con pompe adatte alle acque cariche e si aspirano fanghi e depositi.' },
        { t: 'Indicazioni per il ripristino', d: 'Si segnalano pulizia, asciugatura, verifiche agli impianti ed eventuali opere murarie necessarie.' }
      ],
      tech: [
        { name: 'Pompe per acque cariche', icon: 'flood', text: 'Elettropompe sommergibili progettate per liquidi con fango e parti solide in sospensione.' },
        { name: 'Motopompe', icon: 'gauge', text: 'Pompe con motore a scoppio, utili quando nei locali non è disponibile o sicura l’alimentazione elettrica.' },
        { name: 'Aspirazione con autospurgo', icon: 'pipe', text: 'Per fanghi densi e grandi volumi, aspirati direttamente in cisterna e avviati a smaltimento.' }
      ],
      gallery: [
        { subject: 'Cantina allagata', alt: 'Cantina invasa da acqua torbida dopo un nubifragio' },
        { subject: 'Pompa per acque cariche', alt: 'Pompa sommergibile con tubo di mandata in un locale allagato' },
        { subject: 'Rimozione del fango', alt: 'Pavimento coperto di fango dopo il deflusso dell’acqua' }
      ],
      related: ['allagamenti/svuotamenti-locali', 'idraulica/spurgo-fognature', 'muratura/riparazioni-murarie'],
      plus: 'allagamenti',
      faq: [
        { q: 'Conviene svuotare subito anche se fuori piove ancora?', a: 'Se l’acqua continua a entrare dall’esterno, il pompaggio rischia di non avere effetto e di dover essere ripetuto. È più utile intervenire quando il livello esterno è sceso e l’ingresso dell’acqua si è fermato.' },
        { q: 'L’acqua alluvionale è pericolosa?', a: 'Può contenere reflui fognari, carburanti e sostanze provenienti dalla strada. È consigliabile evitare il contatto diretto, usare stivali e guanti e pulire con cura le superfici dopo lo svuotamento.' },
        { q: 'Si possono riattivare subito luce e caldaia?', a: 'No: impianti e apparecchi raggiunti dall’acqua vanno fatti verificare prima di essere rimessi in tensione o in funzione.' },
        { q: 'Come posso ridurre il rischio in futuro?', a: 'Valvole antiriflusso sugli scarichi, pompe di sollevamento con manutenzione regolare, soglie e paratie sugli accessi più bassi sono tra le misure più comuni da valutare.' }
      ]
    },

    'svuotamenti-locali': {
      metaTitle: 'Svuotamento cantine, box e magazzini a Roma',
      metaDescription:
        'Svuotamento di locali allagati di piccole e grandi dimensioni a Roma: cantine, box, magazzini e autorimesse. Pompe, aspiraliquidi e aspirazione in cisterna.',
      h1: 'Svuotamento di locali allagati di piccole e grandi dimensioni',
      lead: 'Dalla cantina con pochi centimetri d’acqua all’autorimessa condominiale: attrezzature e modalità scelte in base al volume da rimuovere.',
      intro: [
        'Il primo dato da stimare è il volume: superficie del locale per altezza dell’acqua. Pochi centimetri in una cantina si gestiscono con una pompa sommergibile e un aspiraliquidi per l’ultimo velo, mentre un’autorimessa interrata con decine di centimetri d’acqua richiede più pompe in parallelo o l’aspirazione con mezzi dotati di cisterna.',
        'Altrettanto importante è sapere da dove arriva l’acqua. Un tubo rotto, uno scaldabagno che ha ceduto, una pompa di sollevamento ferma o un’infiltrazione dal terreno richiedono azioni diverse per fermare la fonte prima di svuotare. Se la causa non è evidente, dopo lo svuotamento conviene una ricerca mirata.',
        'Le pompe sommergibili non riescono ad aspirare l’ultimo strato d’acqua: per asciugare il pavimento si usano aspiraliquidi e tergipavimenti, poi deumidificatori e ventilazione per gli ambienti chiusi.'
      ],
      when: [
        'Cantina o box con acqua sul pavimento',
        'Magazzino o negozio allagato per la rottura di una tubazione',
        'Autorimessa interrata con pompa di sollevamento in avaria',
        'Locale tecnico o vano ascensore con acqua sul fondo',
        'Piscine interrate, vasche o serbatoi da svuotare'
      ],
      steps: [
        { t: 'Stima del volume', d: 'Superficie, altezza dell’acqua e distanza dal punto di scarico determinano l’attrezzatura necessaria.' },
        { t: 'Arresto della fonte', d: 'Si individua e si ferma l’ingresso dell’acqua, quando la causa è interna all’edificio.' },
        { t: 'Svuotamento', d: 'Pompe sommergibili o aspirazione in cisterna, con scarico verso un recapito idoneo.' },
        { t: 'Asciugatura del fondo', d: 'Aspiraliquidi per l’ultimo strato e indicazioni su deumidificazione e verifiche successive.' }
      ],
      tech: [
        { name: 'Pompe sommergibili', icon: 'flood', text: 'Elettropompe per acque chiare o cariche, dimensionate in base al volume e alla prevalenza necessaria.' },
        { name: 'Aspiraliquidi industriali', icon: 'drop', text: 'Rimuovono l’ultimo strato d’acqua che le pompe non riescono ad aspirare.' },
        { name: 'Aspirazione in cisterna', icon: 'pipe', text: 'Per grandi volumi o acque sporche, con trasporto del liquido verso un recapito autorizzato.' }
      ],
      gallery: [
        { subject: 'Autorimessa interrata', alt: 'Autorimessa interrata con acqua sul pavimento' },
        { subject: 'Pompe in parallelo', alt: 'Più pompe sommergibili collegate in un locale allagato' },
        { subject: 'Asciugatura del pavimento', alt: 'Aspiraliquidi industriale durante l’asciugatura di un pavimento' }
      ],
      related: ['allagamenti/svuotamenti-post-alluvionali', 'ricerca-perdite-occulte/ricerca-perdite-tubazioni-pressione', 'idraulica/spurgo-fognature'],
      plus: 'allagamenti',
      faq: [
        { q: 'Dove viene scaricata l’acqua pompata?', a: 'Normalmente in un pozzetto o in una caditoia collegati alla fognatura, se l’acqua è compatibile. Acque molto sporche o contaminate vanno aspirate in cisterna e smaltite come rifiuto.' },
        { q: 'Perché resta sempre un velo d’acqua?', a: 'Le pompe sommergibili hanno un livello minimo di aspirazione. Per lo strato finale si usano aspiraliquidi, poi la ventilazione completa l’asciugatura.' },
        { q: 'La pompa di sollevamento del condominio si è fermata: cosa fare?', a: 'Avvisare subito l’amministratore, evitare di usare scarichi che confluiscono nella vasca e far verificare pompa, galleggianti e alimentazione elettrica.' },
        { q: 'Dopo un allagamento ricorrente cosa conviene controllare?', a: 'Pompe e galleggianti, valvole antiriflusso, pendenze delle rampe e lo stato delle tubazioni vicine: un allagamento che si ripete ha quasi sempre una causa individuabile.' }
      ]
    }
  }
};
