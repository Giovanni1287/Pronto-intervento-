/**
 * CONTENUTI — DISINFESTAZIONI (categoria + 3 landing)
 * Non si attribuiscono all'azienda autorizzazioni, prodotti o certificazioni:
 * i metodi sono descritti come approcci in uso nel settore.
 */
export default {
  category: {
    metaTitle: 'Disinfestazioni e derattizzazioni a Roma',
    metaDescription:
      'Disinfestazioni da insetti, derattizzazioni e trattamenti contro cimici dei letti, pulci e zecche a Roma per abitazioni, condomini e attività.',
    h1: 'Disinfestazioni e derattizzazioni a Roma',
    lead: 'Trattamenti contro insetti, roditori e parassiti, con un approccio che parte dall’ispezione e punta a eliminare anche le cause dell’infestazione.',
    intro: [
      'Ogni infestante ha abitudini diverse e richiede un approccio specifico: le blatte cercano calore e umidità vicino agli scarichi, i ratti seguono le reti fognarie e gli spazi tra i muri, le cimici dei letti si nascondono nelle cuciture di materassi e testiere. Un trattamento efficace parte sempre dall’identificazione della specie e dei punti di rifugio.',
      'L’approccio più diffuso nel settore è quello della lotta integrata: ispezione, interventi mirati con prodotti e dispositivi adeguati, monitoraggio nel tempo e misure preventive, come la chiusura di varchi e la gestione di rifiuti e umidità. Questo riduce l’uso di sostanze e rende più duraturo il risultato.',
      'I prodotti impiegati nei trattamenti devono essere autorizzati per l’uso previsto e applicati secondo le indicazioni di etichetta, con attenzione alla presenza di persone, bambini e animali domestici.'
    ],
    guide: [
      { problem: 'Blatte, formiche, zanzare, vespe o calabroni', service: 'disinfestazioni-insetti' },
      { problem: 'Topi o ratti in casa, in cantina o in un locale', service: 'derattizzazione' },
      { problem: 'Punture notturne, cimici dei letti, pulci o zecche', service: 'disinfestazione-pulci-zecche-cimici' }
    ],
    pests: [
      { name: 'Blatte', icon: 'shield', text: 'Attive di notte, si rifugiano vicino a fonti di calore e umidità: cucine, scarichi, vani tecnici.' },
      { name: 'Roditori', icon: 'home', text: 'Ratti e topi lasciano escrementi, tracce di rosicchiatura e segni di passaggio lungo i muri.' },
      { name: 'Zanzare', icon: 'drop', text: 'Si sviluppano in piccole raccolte d’acqua stagnante come sottovasi, tombini e grondaie.' },
      { name: 'Cimici dei letti', icon: 'layers', text: 'Si nascondono in materassi, reti e testiere e si spostano con bagagli e mobili usati.' },
      { name: 'Pulci e zecche', icon: 'radar', text: 'Legate ad animali domestici e aree verdi, possono trasmettere malattie e vanno trattate con attenzione.' },
      { name: 'Vespe e calabroni', icon: 'bolt', text: 'Nidificano in cassonetti, sottotetti e cavità: la rimozione dei nidi richiede protezioni adeguate.' }
    ],
    faq: [
      { q: 'I trattamenti sono pericolosi per bambini e animali?', a: 'I prodotti vanno usati secondo etichetta e con le precauzioni previste: in genere si chiede di allontanare persone e animali durante il trattamento e di rispettare i tempi di rientro indicati.' },
      { q: 'Basta un solo intervento?', a: 'Dipende dall’infestante e dall’entità del problema. Per molte specie è previsto almeno un secondo passaggio o un periodo di monitoraggio, perché uova e individui nascosti possono sopravvivere al primo trattamento.' },
      { q: 'Le attività alimentari hanno esigenze particolari?', a: 'Sì: ristoranti, bar e negozi alimentari devono gestire il controllo degli infestanti all’interno del proprio piano di autocontrollo, con monitoraggio documentato e postazioni registrate.' }
    ]
  },

  landings: {
    'disinfestazioni-insetti': {
      metaTitle: 'Disinfestazione insetti a Roma',
      metaDescription:
        'Disinfestazione da blatte, formiche, zanzare, vespe e calabroni a Roma per case, condomini e attività: ispezione, trattamenti mirati e prevenzione.',
      h1: 'Disinfestazione da insetti a Roma',
      lead: 'Blatte, formiche, zanzare, vespe e calabroni: trattamenti mirati sui punti di rifugio e indicazioni per evitare che il problema ritorni.',
      intro: [
        'Gli insetti infestanti più comuni in città hanno esigenze molto diverse. Le blatte cercano ambienti caldi, umidi e bui, e si concentrano dietro elettrodomestici, nei vani tecnici e lungo gli scarichi. Le formiche seguono piste costanti verso le fonti di cibo. Le zanzare depongono le uova in piccole raccolte d’acqua stagnante, comprese quelle nascoste nei tombini dei cortili.',
        'Per le blatte sono molto usate le esche in gel, applicate in piccole quantità nei punti di passaggio: gli insetti le consumano e le portano nel rifugio, colpendo anche individui che non escono allo scoperto. Contro le zanzare l’intervento più efficace è spesso quello sulle larve, trattando i focolai d’acqua, mentre i trattamenti contro gli adulti hanno un effetto limitato nel tempo.',
        'Vespe e calabroni richiedono un discorso a parte: la rimozione di un nido, specie se in posizione difficile, va eseguita con protezioni adeguate e senza esporre le persone vicine a rischi di punture.'
      ],
      when: [
        'Blatte visibili di notte in cucina, bagno o cantina',
        'File di formiche che entrano da fessure e infissi',
        'Molte zanzare in casa o in giardino anche di giorno',
        'Nidi di vespe o calabroni su balconi, sottotetti o cassonetti',
        'Insetti nelle zone di preparazione di bar e ristoranti'
      ],
      steps: [
        { t: 'Ispezione', d: 'Identificazione della specie, dei punti di rifugio e delle vie di ingresso.' },
        { t: 'Piano di trattamento', d: 'Scelta del metodo in base all’ambiente e alle persone e animali presenti.' },
        { t: 'Intervento mirato', d: 'Esche, trattamenti localizzati, larvicidi o rimozione dei nidi, secondo il caso.' },
        { t: 'Verifica e prevenzione', d: 'Controllo dell’efficacia e indicazioni su igiene, sigillature e gestione dell’acqua stagnante.' }
      ],
      tech: [
        { name: 'Esche in gel', icon: 'drop', text: 'Applicate in piccoli punti nei luoghi di passaggio, agiscono anche sugli insetti nascosti nei rifugi.' },
        { name: 'Trattamenti larvicidi', icon: 'flood', text: 'Rivolti ai focolai di zanzara come tombini e caditoie, per ridurre lo sviluppo degli adulti.' },
        { name: 'Trappole di monitoraggio', icon: 'radar', text: 'Rilevano la presenza e l’andamento dell’infestazione prima e dopo il trattamento.' }
      ],
      gallery: [
        { subject: 'Ispezione in cucina', alt: 'Ispezione con torcia dietro gli elettrodomestici di una cucina' },
        { subject: 'Applicazione di esca', alt: 'Applicazione di esca in gel in un punto di passaggio degli insetti' },
        { subject: 'Tombino in cortile', alt: 'Tombino di un cortile, possibile focolaio di zanzare' }
      ],
      related: ['disinfestazioni/derattizzazione', 'disinfestazioni/disinfestazione-pulci-zecche-cimici', 'idraulica/spurgo-fognature'],
      plus: 'disinfestazioni',
      faq: [
        { q: 'Perché le blatte ricompaiono dopo gli spray?', a: 'Gli spray colpiscono solo gli insetti visibili, mentre la colonia resta nei rifugi e le uova sono protette da un involucro resistente. Esche e trattamenti mirati agiscono più in profondità.' },
        { q: 'Le blatte arrivano dagli scarichi?', a: 'Alcune specie si muovono lungo fognature e cavedi e possono risalire da pozzetti e scarichi poco utilizzati. Sifoni sempre pieni d’acqua e chiusini ben chiusi aiutano a limitarne l’ingresso.' },
        { q: 'Come si riducono le zanzare in giardino?', a: 'Eliminando l’acqua stagnante: sottovasi, secchi, teli, grondaie ostruite. I tombini, che non si possono svuotare, possono essere trattati periodicamente con prodotti larvicidi.' },
        { q: 'Posso rimuovere da solo un nido di vespe?', a: 'È sconsigliato: un nido disturbato può provocare punture multiple, pericolose soprattutto per chi è allergico. Meglio tenersi a distanza e richiedere un intervento.' }
      ]
    },

    derattizzazione: {
      metaTitle: 'Derattizzazione a Roma',
      metaDescription:
        'Derattizzazione a Roma per case, condomini, cantine e attività: ispezione, postazioni di sicurezza, monitoraggio e chiusura dei punti di accesso.',
      h1: 'Derattizzazione a Roma',
      lead: 'Controllo di ratti e topi con postazioni di sicurezza, monitoraggio nel tempo e chiusura dei varchi che permettono ai roditori di entrare.',
      intro: [
        'In ambiente urbano le specie più comuni sono il ratto delle chiaviche, che vive in fognature, cantine e piani bassi, il ratto nero, abile arrampicatore che frequenta sottotetti e controsoffitti, e il topolino domestico, che si insedia anche all’interno delle abitazioni. Riconoscere la specie orienta la scelta dei punti in cui intervenire.',
        'La derattizzazione si basa su postazioni di sicurezza: contenitori chiusi e fissati che contengono le esche e impediscono che bambini e animali domestici possano raggiungerle. Le postazioni vengono numerate, posizionate lungo i percorsi dei roditori e controllate periodicamente, registrando i consumi. In alcuni ambienti si preferiscono trappole meccaniche.',
        'Il risultato diventa duraturo solo se si interviene anche sulle cause: varchi attorno a tubazioni e cavi, griglie mancanti, rifiuti accessibili. Senza queste misure, nuovi individui tendono a occupare gli spazi lasciati liberi.'
      ],
      when: [
        'Escrementi lungo i muri, in dispensa o in cantina',
        'Rumori notturni nei controsoffitti o nelle intercapedini',
        'Cavi, imballaggi o alimenti rosicchiati',
        'Avvistamenti di ratti in cortili, giardini o locali rifiuti',
        'Esigenza di un piano di monitoraggio per un’attività alimentare'
      ],
      steps: [
        { t: 'Ispezione', d: 'Ricerca di tracce, percorsi, tane e punti di ingresso per identificare specie ed estensione del problema.' },
        { t: 'Posizionamento', d: 'Installazione delle postazioni di sicurezza numerate lungo i percorsi, con una planimetria di riferimento.' },
        { t: 'Controlli periodici', d: 'Verifica dei consumi, sostituzione delle esche e registrazione dell’andamento.' },
        { t: 'Esclusione', d: 'Indicazioni o interventi per chiudere varchi, proteggere griglie e ridurre le fonti di cibo.' }
      ],
      tech: [
        { name: 'Postazioni di sicurezza', icon: 'shield', text: 'Contenitori chiusi a chiave e fissati, che rendono le esche inaccessibili a bambini e animali.' },
        { name: 'Trappole meccaniche', icon: 'wrench', text: 'Alternativa senza esche avvelenate, utile in ambienti sensibili o per infestazioni limitate.' },
        { name: 'Schede di monitoraggio', icon: 'layers', text: 'Registro delle postazioni e dei consumi, utile anche per i piani di autocontrollo delle attività.' }
      ],
      gallery: [
        { subject: 'Postazione di sicurezza', alt: 'Postazione di derattizzazione chiusa e fissata lungo un muro' },
        { subject: 'Tracce di roditori', alt: 'Tracce di rosicchiatura su un imballaggio in cantina' },
        { subject: 'Varco da chiudere', alt: 'Varco attorno a una tubazione da sigillare contro i roditori' }
      ],
      related: ['disinfestazioni/disinfestazioni-insetti', 'idraulica/spurgo-fognature', 'muratura/riparazioni-murarie'],
      plus: 'disinfestazioni',
      faq: [
        { q: 'Le esche sono pericolose per cani e gatti?', a: 'Per questo si usano postazioni chiuse e fissate, progettate per impedire l’accesso agli animali domestici. È comunque importante segnalare la presenza di animali prima dell’intervento.' },
        { q: 'Quanto dura una derattizzazione?', a: 'Non è un intervento istantaneo: le esche agiscono in alcuni giorni e le postazioni vanno controllate più volte. Nelle attività e nei condomini si imposta spesso un monitoraggio continuativo.' },
        { q: 'Da dove entrano i ratti in casa?', a: 'Da varchi attorno a tubi e cavi, griglie di aerazione danneggiate, scarichi non protetti e porte che non chiudono bene. Un topolino passa da fessure molto piccole.' },
        { q: 'In condominio chi deve occuparsene?', a: 'Per spazi comuni come cantine, cortili e locali rifiuti la gestione è condominiale e passa dall’amministratore; per gli spazi privati provvede il singolo proprietario o inquilino.' }
      ]
    },

    'disinfestazione-pulci-zecche-cimici': {
      metaTitle: 'Cimici dei letti, pulci e zecche a Roma',
      metaDescription:
        'Disinfestazione da cimici dei letti, pulci e zecche a Roma per abitazioni, hotel e strutture ricettive: ispezione, trattamenti mirati e controllo finale.',
      h1: 'Disinfestazione da cimici dei letti, pulci e zecche a Roma',
      lead: 'Parassiti difficili da individuare e da eliminare: ispezione accurata, trattamenti ripetuti nei tempi giusti e collaborazione di chi vive gli ambienti.',
      intro: [
        'Le cimici dei letti si nutrono di sangue durante la notte e passano il giorno nascoste in cuciture dei materassi, reti, testiere, battiscopa e prese. Viaggiano facilmente in valigie e mobili usati, per questo colpiscono abitazioni e strutture ricettive indipendentemente dal livello di pulizia. I segnali tipici sono punture in fila, piccole macchie scure sulle lenzuola e sui materassi, esuvie e un odore dolciastro nei casi più gravi.',
        'Il trattamento combina più tecniche: il vapore secco ad alta temperatura per materassi e tessuti, trattamenti mirati nei punti di rifugio, il lavaggio ad alte temperature della biancheria. Poiché le uova sono più resistenti degli adulti, è previsto un secondo intervento a distanza di alcuni giorni, seguito da un controllo.',
        'Pulci e zecche sono legate soprattutto agli animali domestici e alle aree verdi. Il trattamento degli ambienti va coordinato con quello dell’animale, da concordare con il veterinario, mentre per le zecche è utile intervenire su giardini e zone erbose. In caso di morso di zecca è bene rivolgersi al proprio medico per le indicazioni del caso.'
      ],
      when: [
        'Punture al risveglio, spesso allineate su braccia e gambe',
        'Piccole macchie scure su lenzuola, materassi e testiere',
        'Segnalazioni di ospiti in hotel, B&B o case vacanza',
        'Pulci in casa dopo il rientro di un animale o un trasloco',
        'Zecche su animali o persone dopo il passaggio in giardino'
      ],
      steps: [
        { t: 'Ispezione dettagliata', d: 'Controllo di letti, arredi e punti di rifugio per confermare la presenza e l’estensione del problema.' },
        { t: 'Preparazione degli ambienti', d: 'Indicazioni su biancheria da lavare, oggetti da sigillare e spazi da liberare prima del trattamento.' },
        { t: 'Trattamenti', d: 'Vapore ad alta temperatura e trattamenti mirati, ripetuti dopo alcuni giorni per colpire le nuove schiuse.' },
        { t: 'Controllo finale', d: 'Verifica dell’assenza di nuovi segni e indicazioni preventive per viaggi, ospiti e animali.' }
      ],
      tech: [
        { name: 'Vapore secco', icon: 'thermo', text: 'Il calore elevato agisce su adulti e uova nei tessuti e nelle cuciture senza bagnare i materiali.' },
        { name: 'Trattamenti residuali mirati', icon: 'shield', text: 'Applicati nei punti di rifugio come fessure, battiscopa e strutture dei letti.' },
        { name: 'Coprimaterassi anti-cimici', icon: 'layers', text: 'Fodere a chiusura totale che isolano il materasso e facilitano i controlli successivi.' }
      ],
      gallery: [
        { subject: 'Ispezione del materasso', alt: 'Ispezione delle cuciture di un materasso con torcia' },
        { subject: 'Trattamento a vapore', alt: 'Trattamento a vapore ad alta temperatura su una testiera del letto' },
        { subject: 'Camera d’albergo', alt: 'Camera d’albergo preparata per un trattamento di disinfestazione' }
      ],
      related: ['disinfestazioni/disinfestazioni-insetti', 'disinfestazioni/derattizzazione', 'muratura/imbiancatura'],
      plus: 'disinfestazioni',
      faq: [
        { q: 'Le cimici dei letti indicano scarsa pulizia?', a: 'No. Si diffondono con bagagli, vestiti e arredi e possono comparire in ambienti perfettamente puliti, compresi hotel di alto livello.' },
        { q: 'Perché servono più trattamenti?', a: 'Le uova sono più protette degli adulti. Un secondo passaggio dopo alcuni giorni colpisce le cimici appena nate, prima che diventino a loro volta adulte e depongano nuove uova.' },
        { q: 'Devo buttare il materasso?', a: 'Non necessariamente: in molti casi il materasso può essere trattato e protetto con un coprimaterasso specifico. La sostituzione si valuta quando è molto infestato o danneggiato.' },
        { q: 'Come si gestiscono le pulci se ho un cane o un gatto?', a: 'Trattando contemporaneamente l’ambiente e l’animale. Per l’animale il riferimento è il veterinario; per la casa si interviene su pavimenti, tappeti, cucce e zone di riposo.' }
      ]
    }
  }
};
