/**
 * Checklist di controllo per le visite di manutenzione programmata (B2B/Hotel).
 * Sono controlli visivi e funzionali di buona manutenzione: NON sostituiscono le
 * verifiche periodiche obbligatorie per legge (es. impianti di terra, ascensori,
 * antincendio, caldaie), che restano a carico dei soggetti abilitati incaricati
 * dal cliente. Modificabili dall'amministratore in dashboard.
 */
export const CHECKLIST_DISCLAIMER =
  'Controlli di manutenzione ordinaria: non costituiscono verifiche periodiche obbligatorie né certificazioni di conformità.';

export const maintenanceChecklists = [
  {
    id: '6f1c2a10-0000-4000-8000-000000000001',
    name: 'Idraulica — controllo generale',
    categoryId: 'idraulica',
    items: [
      'Controllo visivo di rubinetti, flessibili e sifoni nei locali indicati',
      'Verifica assenza di gocciolamenti e tracce di umidità visibili',
      'Prova di scarico di lavabi, docce e WC',
      'Controllo funzionamento cassette di scarico',
      'Verifica accessibilità e manovrabilità delle valvole di intercettazione',
      'Annotazione delle anomalie e proposta di eventuali interventi'
    ]
  },
  {
    id: '6f1c2a10-0000-4000-8000-000000000002',
    name: 'Elettrica — controllo funzionale',
    categoryId: 'elettrica',
    items: [
      'Prova del tasto test dei differenziali accessibili',
      'Controllo visivo di quadri, prese e interruttori (senza smontaggi)',
      'Verifica funzionamento punti luce e luci di cortesia indicati',
      'Segnalazione di prese o placche danneggiate',
      'Annotazione delle anomalie e proposta di eventuali interventi'
    ]
  },
  {
    id: '6f1c2a10-0000-4000-8000-000000000003',
    name: 'Hotel — camere e aree comuni',
    categoryId: 'idraulica',
    items: [
      'Camere a campione: rubinetteria, doccia, scarichi, WC',
      'Camere a campione: prese, luci, interruttori',
      'Aree comuni: servizi igienici e scarichi',
      'Locali tecnici accessibili: tracce di perdite o umidità',
      'Elenco delle camere con anomalie e priorità suggerita'
    ]
  }
];
