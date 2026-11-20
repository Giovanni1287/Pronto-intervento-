/**
 * CONTENUTI SEO AGGIUNTIVI DELLE CATEGORIE (Prompt 7, Fase 2): "Quando chiamare un tecnico".
 * Testi originali, prudenti: nessuna promessa di tempi, nessuna istruzione tecnica rischiosa.
 * Le tecnologie applicabili si ricavano dalle landing della categoria (nessun testo duplicato
 * scritto due volte); problemi e soluzioni dalla guida rapida già presente.
 */
export const categorySeo = {
  idraulica: {
    whenToCall: [
      'Più scarichi rallentano insieme o si sentono gorgoglii: il problema può essere nella colonna o nel collettore.',
      'Acqua o liquami risalgono da un pozzetto, dalla doccia o dal piatto doccia.',
      'L’intasamento torna dopo pochi giorni anche dopo la pulizia del sifone.',
      'Cattivi odori persistenti dagli scarichi o dai tombini in cortile.',
      'La fossa biologica o i pozzetti non vengono svuotati da tempo o traboccano.'
    ]
  },
  elettrica: {
    whenToCall: [
      'Il salvavita scatta anche con gli apparecchi scollegati.',
      'Prese, interruttori o spine si scaldano, anneriscono o fanno scintille.',
      'Si sente odore di bruciato vicino a prese o al quadro.',
      'Parti dell’impianto si sono bagnate dopo un’infiltrazione o un allagamento: non toccarle.',
      'Si devono aggiungere linee o sostituire il quadro: sono lavori riservati a imprese abilitate.'
    ],
    safety: 'In presenza di fumo, fiamme o pericolo per le persone chiama il 112. Non aprire quadri o scatole di derivazione.'
  },
  'ricerca-perdite-occulte': {
    whenToCall: [
      'Il contatore dell’acqua avanza con tutti i rubinetti chiusi.',
      'La bolletta aumenta senza cambiamenti nei consumi.',
      'La pressione della caldaia cala e va ricaricata spesso.',
      'Compaiono macchie, muffa o intonaco rigonfio su pareti e soffitti.',
      'Il vicino del piano di sotto segnala infiltrazioni.'
    ]
  },
  allagamenti: {
    whenToCall: [
      'C’è acqua stagnante in cantine, box, magazzini o locali tecnici.',
      'L’acqua ha raggiunto prese, quadri elettrici o la caldaia: non entrare e non toccare gli impianti.',
      'Dopo un temporale i pozzetti non smaltiscono e l’acqua continua a salire.',
      'Fango e detriti vanno rimossi prima di asciugare e ripristinare i locali.'
    ],
    safety: 'Se l’acqua è vicina a impianti elettrici o ci sono persone in difficoltà chiama il 112.'
  },
  muratura: {
    whenToCall: [
      'Crepe che si allargano o si ripresentano dopo la stuccatura.',
      'Intonaco che si stacca o si sfarina, spesso per umidità.',
      'Lavori da coordinare con idraulico ed elettricista, come il rifacimento di un bagno.',
      'Pareti o controsoffitti da realizzare o modificare in cartongesso.'
    ],
    safety: 'Crepe profonde, lesioni strutturali o cedimenti richiedono la valutazione di un tecnico abilitato (ingegnere o geometra).'
  },
  disinfestazioni: {
    whenToCall: [
      'Avvistamenti ripetuti di blatte, formiche o altri insetti in cucina o nei bagni.',
      'Tracce di roditori: escrementi, rosicchiature, rumori nelle intercapedini.',
      'Punture notturne e piccole macchie scure sul materasso (possibili cimici dei letti).',
      'Attività commerciali che devono documentare il monitoraggio degli infestanti.'
    ]
  }
};
