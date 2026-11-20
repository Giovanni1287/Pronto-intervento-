/**
 * GUIDE (Prompt 7) — sezione /guide/.
 * Le otto proposte iniziali sono BOZZE redazionali: non vengono pubblicate finché
 * un revisore identificabile (Giovanni Romeo o un tecnico incaricato) non le verifica,
 * le approva e completa i dati mancanti (prezzi indicativi, foto autorizzate).
 * Le bozze generate o suggerite dal PRONTO SEO AGENT seguono lo stesso percorso:
 * bozza → revisione → approvazione nella dashboard → inserimento qui → build.
 */
const DRAFT = { status: 'bozza', author: 'Redazione PRONTO SEO (bozza da revisionare)', review: { approved: false, reviewer: null, date: null } };

export const guides = [
  {
    ...DRAFT, slug: 'quanto-costa-spurgo-roma',
    title: 'Quanto costa uno spurgo a Roma?',
    metaDescription: 'Da cosa dipende il costo di uno spurgo a Roma: tipo di intervento, accessibilità, quantità da smaltire e diagnosi. Differenza tra prezzi indicativi e preventivo.',
    summary: 'Le voci che determinano il prezzo di uno spurgo e perché un preventivo serio arriva dopo aver capito il problema.',
    related: ['idraulica/spurgo-fognature', 'idraulica/disostruzione-scarichi-canal-jet', 'idraulica/videoispezione-tubature'],
    priceNote: 'Prezzi indicativi DA INSERIRE dopo conferma del titolare: in questa bozza non compare alcuna cifra.',
    review: { ...DRAFT.review, notes: 'Mancano le fasce di prezzo indicative approvate dal titolare e le foto autorizzate.' },
    sections: [
      { h: 'Spurgo non è un solo intervento', p: ['Con “spurgo” si indicano lavori diversi: lo svuotamento di una fossa biologica o di un pozzetto con mezzo autospurgo, la disostruzione di una colonna con canal-jet, la pulizia di un singolo lavandino. Ognuno richiede attrezzature, tempi e personale differenti, quindi anche costi differenti.'] },
      { h: 'Le voci che incidono sul costo', p: ['Un preventivo onesto tiene conto di alcuni elementi verificabili:'],
        list: ['tipo di lavorazione e attrezzatura necessaria (sonda manuale, canal-jet, autospurgo);', 'accessibilità del punto di intervento e distanza del mezzo dal pozzetto;', 'quantità di materiale da aspirare e relativo smaltimento secondo le norme sui rifiuti;', 'eventuale videoispezione per individuare la causa;', 'urgenza e fascia oraria, quando previste dalle condizioni.'] },
      { h: 'Prezzo indicativo e preventivo effettivo', p: ['Un prezzo indicativo serve a orientarsi, non è un impegno. Il costo effettivo si conosce dopo aver descritto il problema o dopo un sopralluogo: diffida di cifre definitive date al telefono senza informazioni sulla situazione.'] },
      { h: 'Come prepararsi alla richiesta', p: ['Indica quali scarichi sono coinvolti, da quanto tempo, se il problema riguarda uno o più appartamenti e se esistono pozzetti o fosse accessibili. Foto del punto di accesso aiutano a valutare in anticipo il mezzo necessario.'] }
    ]
  },
  {
    ...DRAFT, slug: 'quando-serve-videoispezione',
    title: 'Quando è necessaria una videoispezione delle tubature?',
    metaDescription: 'Quando conviene una videoispezione degli scarichi: intasamenti ricorrenti, odori, cedimenti, acquisto casa. Cosa si vede e cosa resta da verificare.',
    summary: 'I casi in cui la telecamera evita lavori inutili e quelli in cui non serve.',
    related: ['idraulica/videoispezione-tubature', 'idraulica/disostruzione-scarichi-canal-jet', 'ricerca-perdite-occulte/ricerca-perdite-tubazioni-scarico'],
    review: { ...DRAFT.review, notes: 'Da verificare con il tecnico l’attrezzatura effettivamente utilizzata e il formato del report.' },
    sections: [
      { h: 'Cos’è', p: ['Una telecamera impermeabile, spinta con un’asta flessibile o montata su carrello, percorre la tubazione dall’interno e mostra in tempo reale lo stato delle pareti, i giunti, eventuali radici, schiacciamenti o depositi. Un localizzatore permette di individuare dall’esterno la posizione della testa.'] },
      { h: 'Quando è utile', p: ['Conviene soprattutto quando il problema si ripete o la causa non è evidente:'],
        list: ['intasamenti che tornano dopo poche settimane anche dopo la pulizia;', 'cattivi odori persistenti senza ostruzioni visibili;', 'sospetto di tubazioni rotte, schiacciate o con radici;', 'prima di lavori di rifacimento, per demolire solo dove serve;', 'verifica dopo una disostruzione per controllare il risultato.'] },
      { h: 'Quando non serve', p: ['Per un singolo sifone intasato o un lavandino che scarica lentamente di solito basta una pulizia mirata: la videoispezione si valuta se il problema persiste.'] },
      { h: 'Limiti', p: ['La telecamera mostra l’interno della condotta ma non misura la tenuta: per le perdite si abbina a prove specifiche. Curve strette, diametri ridotti o tubi pieni d’acqua possono limitare la visione e richiedere una pulizia preventiva.'] }
    ]
  },
  {
    ...DRAFT, slug: 'come-riconoscere-perdita-occulta',
    title: 'Come riconoscere una perdita d’acqua occulta',
    metaDescription: 'Segnali di una perdita d’acqua nascosta: contatore che gira, bolletta alta, macchie, pressione della caldaia che cala. Le verifiche prima di chiamare un tecnico.',
    summary: 'I segnali più comuni di una perdita nascosta e le verifiche che puoi fare in sicurezza.',
    related: ['ricerca-perdite-occulte/ricerca-perdite-tubazioni-pressione', 'ricerca-perdite-occulte/termografia', 'ricerca-perdite-occulte/geofono'],
    review: { ...DRAFT.review, notes: 'Revisione tecnica richiesta.' },
    sections: [
      { h: 'I segnali', p: ['Una perdita occulta può non essere visibile per mesi. I segnali più frequenti sono:'],
        list: ['consumo in bolletta più alto senza cambiamenti nelle abitudini;', 'contatore che avanza con tutti i rubinetti chiusi;', 'macchie, aloni, muffa o intonaco che si sfalda;', 'pressione della caldaia che scende e va ricaricata spesso;', 'rumore di acqua che scorre quando nessuno la usa;', 'pavimenti caldi in un punto (impianti a pavimento) o rigonfiamenti.'] },
      { h: 'La prova del contatore', p: ['Chiudi tutti i rubinetti e gli apparecchi che usano acqua, annota la lettura del contatore e ricontrolla dopo un’ora senza prelievi. Se il valore è cambiato, c’è con buona probabilità una perdita a valle del contatore. La prova non indica dove si trova.'] },
      { h: 'Perché non conviene demolire a caso', p: ['La ricerca strumentale (acustica, termografica, con gas tracciante o prove di pressione) serve a individuare il punto con precisione e ad aprire solo dove necessario. Il metodo si sceglie in base al tipo di impianto e ai segnali osservati.'] }
    ]
  },
  {
    ...DRAFT, slug: 'scarichi-lenti-cause',
    title: 'Quali problemi possono causare scarichi lenti?',
    metaDescription: 'Scarichi lenti in cucina o bagno: cause più comuni (grassi, capelli, calcare, pendenze, sfiati) e quando il problema riguarda la colonna condominiale.',
    summary: 'Dalle cause più semplici a quelle strutturali, e come capire se il problema è tuo o della colonna.',
    related: ['idraulica/spurgo-lavandini', 'idraulica/disostruzione-scarichi-canal-jet', 'idraulica/fresatura-colonne-tubazioni'],
    review: { ...DRAFT.review, notes: 'Revisione tecnica richiesta.' },
    sections: [
      { h: 'Le cause più comuni', p: ['Nella maggior parte dei casi lo scarico lento dipende da accumuli nel primo tratto:'],
        list: ['grassi e residui di cibo negli scarichi della cucina;', 'capelli e sapone nei sifoni di lavabi, docce e vasche;', 'calcare che restringe le tubazioni nelle zone con acqua dura;', 'oggetti caduti nello scarico.'] },
      { h: 'Cause meno evidenti', p: ['Se il problema persiste dopo la pulizia del sifone, può dipendere da pendenze insufficienti, da una ventilazione della colonna inadeguata (gorgoglii, sifoni che si svuotano) o da tubazioni danneggiate.'] },
      { h: 'Mio appartamento o colonna?', p: ['Se rallenta un solo apparecchio il problema è quasi sempre locale. Se rallentano più scarichi insieme o il problema compare anche ai piani inferiori, è probabile che sia coinvolta la colonna condominiale: in quel caso va informato l’amministratore.'] },
      { h: 'Cosa evitare', p: ['L’uso ripetuto di prodotti chimici aggressivi può danneggiare guarnizioni e tubazioni datate e non risolve accumuli consistenti.'] }
    ]
  },
  {
    ...DRAFT, slug: 'ricerca-perdite-geofono',
    title: 'Come funziona una ricerca perdite con il geofono',
    metaDescription: 'Il geofono ascolta il rumore dell’acqua che esce da una tubazione in pressione: come funziona, quando è efficace e quali sono i limiti del metodo.',
    summary: 'Il metodo acustico per localizzare perdite su tubazioni in pressione, senza demolizioni preventive.',
    related: ['ricerca-perdite-occulte/geofono', 'ricerca-perdite-occulte/gas-tracciante', 'ricerca-perdite-occulte/ricerca-perdite-tubazioni-pressione'],
    review: { ...DRAFT.review, notes: 'Da confermare la strumentazione posseduta prima della pubblicazione.' },
    sections: [
      { h: 'Il principio', p: ['L’acqua che fuoriesce da una tubazione in pressione produce un rumore caratteristico. Il geofono elettroacustico capta queste vibrazioni attraverso pavimenti e pareti con sonde a contatto, le amplifica e le filtra per separarle dai rumori di fondo.'] },
      { h: 'Come si svolge', p: ['Il tecnico ricostruisce il percorso probabile della tubazione e ascolta in più punti, confrontando intensità e frequenza del segnale. Il punto in cui il rumore è più forte indica la zona della perdita.'] },
      { h: 'Quando funziona meglio', p: ['È indicato per tubazioni in pressione (acqua sanitaria, riscaldamento) e ambienti silenziosi.'], list: ['impianto in pressione e perdita attiva;', 'rumori di fondo ridotti;', 'pavimentazioni che trasmettono bene le vibrazioni.'] },
      { h: 'Limiti', p: ['Su perdite molto piccole, tubi in materiale plastico, grandi profondità o scarichi non in pressione il segnale può essere debole: in questi casi si abbina a gas tracciante, termografia o prove di pressione.'] }
    ]
  },
  {
    ...DRAFT, slug: 'quando-chiamare-elettricista',
    title: 'Quando chiamare un elettricista per un guasto',
    metaDescription: 'Salvavita che scatta, prese calde, odore di bruciato, luci che sfarfallano: quando serve un elettricista e cosa fare in sicurezza nell’attesa.',
    summary: 'I segnali da non sottovalutare e le poche azioni sicure che puoi fare senza toccare l’impianto.',
    related: ['elettrica/guasti-corto-circuiti', 'elettrica/riparazione-impianti-elettrici', 'elettrica/quadri-elettrici'],
    review: { ...DRAFT.review, notes: 'Revisione tecnica obbligatoria (sicurezza elettrica). Citare le abilitazioni solo dopo conferma.' },
    sections: [
      { h: 'Quando serve un tecnico', p: ['Rivolgiti a un elettricista abilitato quando noti:'],
        list: ['il salvavita (differenziale) che scatta ripetutamente;', 'prese, interruttori o spine che si scaldano o anneriscono;', 'odore di bruciato o crepitii da prese e quadro;', 'luci che sfarfallano in più stanze;', 'parti dell’impianto bagnate dopo infiltrazioni o allagamenti.'] },
      { h: 'Cosa puoi fare in sicurezza', p: ['Se il differenziale scatta, scollega gli apparecchi dalle prese e prova a riarmarlo: se resta armato, ricollega un apparecchio alla volta per capire quale provoca lo scatto e non usarlo più. Se scatta anche senza apparecchi collegati il guasto è nell’impianto.'] },
      { h: 'Cosa non fare', p: ['Non aprire scatole di derivazione o il quadro, non sostituire interruttori senza competenze e non bypassare le protezioni. In presenza di acqua vicino a prese o quadri non toccare nulla; se c’è fumo, fiamme o un pericolo per le persone chiama subito il 112.'] },
      { h: 'Dopo l’intervento', p: ['Per lavori sull’impianto l’impresa abilitata rilascia la documentazione prevista dalla normativa (DM 37/2008), da conservare.'] }
    ]
  },
  {
    ...DRAFT, slug: 'assistenza-tecnica-hotel',
    title: 'Come richiedere assistenza tecnica per un hotel',
    metaDescription: 'Come organizzare l’assistenza tecnica di un hotel o B&B: richieste urgenti, manutenzione programmata, priorità per le camere e documentazione degli interventi.',
    summary: 'Dalla segnalazione del guasto in camera alla manutenzione programmata: come impostare un servizio che non disturba gli ospiti.',
    related: ['idraulica/spurgo-lavandini', 'elettrica/guasti-corto-circuiti', 'muratura/riparazioni-murarie'],
    review: { ...DRAFT.review, notes: 'Collegare alla pagina Hotel dopo l’approvazione dei piani.' },
    sections: [
      { h: 'Distinguere urgenze e manutenzione', p: ['Un guasto in una camera occupata ha priorità diversa da una lampada da sostituire in un corridoio. Stabilire in anticipo cosa è urgente (acqua, scarichi, elettricità, riscaldamento) aiuta a organizzare gli interventi.'] },
      { h: 'Cosa indicare nella richiesta', p: ['Una segnalazione completa riduce i tempi:'], list: ['camera o area interessata e se è occupata;', 'descrizione del problema e da quando si presenta;', 'fasce orarie in cui è possibile intervenire;', 'referente presente in struttura.'] },
      { h: 'Manutenzione programmata', p: ['Controlli periodici su scarichi, rubinetterie, impianti elettrici e superfici riducono i guasti in alta stagione. Un contratto di assistenza può prevedere visite programmate e un registro degli interventi.'] },
      { h: 'Per saperne di più', p: ['I piani per le strutture ricettive sono descritti nella pagina dedicata agli hotel.'] }
    ]
  },
  {
    ...DRAFT, slug: 'contratto-manutenzione-aziendale',
    title: 'Come funziona un contratto di manutenzione aziendale',
    metaDescription: 'Cosa include un contratto di manutenzione per aziende e condomini: visite programmate, interventi inclusi, priorità, rendicontazione e cosa resta escluso.',
    summary: 'Le voci da valutare prima di firmare un contratto di manutenzione per la propria sede.',
    related: ['idraulica/videoispezione-tubature', 'elettrica/quadri-elettrici', 'muratura/riparazioni-murarie'],
    review: { ...DRAFT.review, notes: 'Allineare ai pacchetti PRONTO+ Business approvati.' },
    sections: [
      { h: 'Cosa definisce un contratto', p: ['Un contratto di manutenzione stabilisce in anticipo quali prestazioni sono incluse, con quale frequenza e con quali tempi di presa in carico.'],
        list: ['visite di controllo programmate e relative checklist;', 'interventi o ore incluse e come vengono conteggiate;', 'priorità e fasce orarie per le richieste;', 'esclusioni (materiali, lavori straordinari);', 'rendicontazione degli interventi e documenti rilasciati.'] },
      { h: 'Vantaggi', p: ['Un unico referente, costi più prevedibili e uno storico degli interventi utile per pianificare i lavori.'] },
      { h: 'Cosa verificare', p: ['Leggi con attenzione come si contano le prestazioni, cosa succede se non vengono usate e quali interventi restano a parte: le condizioni devono essere chiare prima della firma.'] }
    ]
  }
];

/** Pubblicabile solo con revisione approvata, revisore identificato e data. */
export const isPublishable = (g) => g.status === 'pubblicata' && g.review?.approved === true && Boolean(g.review.reviewer) && Boolean(g.review.date);

export function validateGuides() {
  const errors = [];
  const slugs = new Set();
  for (const g of guides) {
    if (slugs.has(g.slug)) errors.push(`Guida duplicata: ${g.slug}`);
    slugs.add(g.slug);
    if (!/^[a-z0-9-]+$/.test(g.slug)) errors.push(`Slug non valido: ${g.slug}`);
    if (!g.metaDescription || g.metaDescription.length > 165) errors.push(`${g.slug}: meta description assente o lunga`);
    if (g.status === 'pubblicata' && !isPublishable(g)) errors.push(`${g.slug}: "pubblicata" senza revisione approvata`);
  }
  return errors;
}
