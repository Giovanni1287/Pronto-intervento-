/**
 * PRONTO+ FAMILY — LISTINO PROVVISORIO E CONDIZIONI PER CATEGORIA
 * ------------------------------------------------------------------
 * Fonte unica dei dati iniziali: genera le pagine pubbliche e il seed del
 * database (scripts/db/generate-seed.js). Dopo l'attivazione di Supabase i
 * prezzi e le condizioni si gestiscono dalla dashboard (versioni bozza →
 * pubblicato), e questo file resta il listino di partenza.
 *
 * - Prezzi in centesimi, IVA INCLUSA (prezzi per consumatori), aliquota 22%.
 * - Tutte le prestazioni sono PROPOSTE: richiedono la conferma del titolare
 *   prima della vendita (`ownerApproved: false`).
 * - Nessuna promessa sui tempi di intervento.
 */

export const FAMILY_VAT_RATE = 22;
export const FAMILY_DURATION_MONTHS = 12;
export const FAMILY_STATUS = {
  ownerApproved: false, // il titolare deve confermare prestazioni e prezzi
  legalReviewed: false // le condizioni devono essere verificate da un legale
};

/** Regole comuni a tutti i piani Family. */
export const familyCommonRules = [
  'Durata di 12 mesi dalla data di attivazione, che avviene solo dopo la conferma del pagamento.',
  'Valido per un solo immobile a uso abitativo indicato nel contratto, nell’area servita (Roma e provincia, da confermare per singola prestazione).',
  'Le uscite e gli interventi inclusi si concordano per appuntamento: il piano non garantisce tempi di arrivo.',
  'Le prestazioni non utilizzate non si trasferiscono all’anno successivo.',
  'I lavori oltre i limiti del piano vengono preventivati a parte, con lo sconto indicato.',
  'Il piano non sostituisce né riduce le garanzie previste dalla legge sui lavori eseguiti.'
];

/** Esclusioni comuni a tutti i piani Family. */
export const familyCommonExclusions = [
  'Materiali e ricambi, salvo diversa indicazione.',
  'Opere su parti comuni condominiali senza autorizzazione dell’amministratore.',
  'Lavori che richiedono pratiche edilizie, progetti o certificazioni di impianto.',
  'Danni causati da eventi eccezionali, dolo o uso improprio.',
  'Risarcimento di danni a cose o persone: il piano non è una polizza assicurativa.'
];

const plan = (o) => ({
  callFeeIncluded: true,
  materialsIncluded: false,
  extraLaborDiscountPct: 0,
  checkups: 0,
  ...o
});

export const familyCategories = [
  {
    id: 'piccola-idraulica',
    name: 'Piccola Idraulica',
    icon: 'drop',
    technical: 'idraulica',
    summary: 'Piccoli guasti idraulici di casa: rubinetti, sifoni, flessibili, cassette e scarichi dei sanitari.',
    plans: {
      essential: plan({
        priceCents: 14900, visits: 1, interventions: 1, maxMinutes: 60, extraLaborDiscountPct: 10,
        included: ['1 uscita con diritto di chiamata incluso', '1 intervento di piccola idraulica fino a 60 minuti', 'Sconto 10% sulla manodopera oltre i limiti']
      }),
      plus: plan({
        priceCents: 34900, visits: 4, interventions: 3, maxMinutes: 60, checkups: 1, extraLaborDiscountPct: 15,
        included: ['3 interventi di piccola idraulica fino a 60 minuti ciascuno', '1 controllo preventivo dell’impianto idrico domestico', 'Diritto di chiamata incluso per ogni uscita', 'Sconto 15% sulla manodopera oltre i limiti']
      })
    },
    exclusions: ['Sostituzione di sanitari, caldaie e scaldabagni', 'Interventi su colonne condominiali', 'Disostruzioni con canal-jet (vedi Spurgo)']
  },
  {
    id: 'idraulica',
    name: 'Idraulica',
    icon: 'wrench',
    technical: 'idraulica',
    summary: 'Guasti idraulici più impegnativi: perdite visibili, collegamenti, rubinetteria e tratti di tubazione accessibili.',
    plans: {
      essential: plan({
        priceCents: 24900, visits: 1, interventions: 1, maxMinutes: 90, extraLaborDiscountPct: 10,
        included: ['1 uscita con diritto di chiamata incluso', '1 intervento idraulico fino a 90 minuti', 'Sconto 10% sulla manodopera oltre i limiti']
      }),
      plus: plan({
        priceCents: 59900, visits: 4, interventions: 3, maxMinutes: 90, checkups: 1, extraLaborDiscountPct: 15,
        included: ['3 interventi idraulici fino a 90 minuti ciascuno', '1 controllo preventivo di impianto e scarichi', 'Diritto di chiamata incluso per ogni uscita', 'Sconto 15% sulla manodopera oltre i limiti']
      })
    },
    exclusions: ['Rifacimento di impianti o di tratti sotto pavimento', 'Opere murarie di ripristino (vedi Muratura)', 'Ricerca strumentale di perdite occulte (vedi Perdite Occulte)']
  },
  {
    id: 'spurgo',
    name: 'Spurgo',
    icon: 'pipe',
    technical: 'idraulica',
    summary: 'Spurghi ordinari di scarichi, pozzetti e condotte dell’immobile con mezzi dedicati.',
    plans: {
      essential: plan({
        priceCents: 44900, visits: 1, interventions: 1, maxMinutes: 60, extraLaborDiscountPct: 10,
        included: ['1 spurgo ordinario fino a 60 minuti', 'Uscita del mezzo inclusa', 'Sconto 10% su prestazioni di spurgo oltre i limiti']
      }),
      plus: plan({
        priceCents: 84900, visits: 2, interventions: 2, maxMinutes: 60, extraLaborDiscountPct: 15,
        included: ['2 spurghi ordinari fino a 60 minuti ciascuno', 'Uscita del mezzo inclusa per ogni spurgo', 'Sconto 15% su prestazioni di spurgo oltre i limiti']
      })
    },
    exclusions: ['Costi di trasporto e smaltimento dei reflui, a listino', 'Fresatura, videoispezione e lavori di risanamento', 'Fosse e reti condominiali senza autorizzazione dell’amministratore']
  },
  {
    id: 'elettrica',
    name: 'Elettrica',
    icon: 'bolt',
    technical: 'elettrica',
    summary: 'Guasti e piccole riparazioni dell’impianto elettrico domestico.',
    plans: {
      essential: plan({
        priceCents: 19900, visits: 1, interventions: 1, maxMinutes: 60, extraLaborDiscountPct: 10,
        included: ['1 uscita con diritto di chiamata incluso', '1 ricerca guasto o riparazione puntuale fino a 60 minuti', 'Sconto 10% sulla manodopera oltre i limiti']
      }),
      plus: plan({
        priceCents: 49900, visits: 4, interventions: 3, maxMinutes: 60, checkups: 1, extraLaborDiscountPct: 15,
        included: ['3 interventi elettrici fino a 60 minuti ciascuno', '1 verifica funzionale di quadro e differenziali', 'Diritto di chiamata incluso per ogni uscita', 'Sconto 15% sulla manodopera oltre i limiti']
      })
    },
    exclusions: ['Rifacimento o adeguamento dell’impianto', 'Sostituzione del quadro elettrico', 'Rilascio di dichiarazioni di conformità per nuovi lavori']
  },
  {
    id: 'perdite-occulte',
    name: 'Perdite Occulte',
    icon: 'radar',
    technical: 'ricerca-perdite-occulte',
    summary: 'Ricerca strumentale di perdite non visibili su impianti in pressione e scarichi.',
    plans: {
      essential: plan({
        priceCents: 29900, visits: 1, interventions: 1, maxMinutes: 120, extraLaborDiscountPct: 10,
        included: ['1 ricerca perdite strumentale fino a 120 minuti', 'Rapporto con l’area individuata', 'Sconto 10% sulla riparazione successiva (manodopera)']
      }),
      plus: plan({
        priceCents: 74900, visits: 3, interventions: 2, maxMinutes: 120, checkups: 1, extraLaborDiscountPct: 15,
        included: ['2 ricerche perdite strumentali fino a 120 minuti ciascuna', '1 prova di tenuta preventiva dell’impianto', 'Rapporto con l’area individuata', 'Sconto 15% sulla riparazione successiva (manodopera)']
      })
    },
    exclusions: ['Riparazione della tubazione e opere murarie', 'Garanzia di individuazione del punto esatto: l’esito dipende da impianto e materiali', 'Perdite su reti condominiali o a monte del contatore']
  },
  {
    id: 'allagamenti',
    name: 'Allagamenti',
    icon: 'flood',
    technical: 'allagamenti',
    summary: 'Svuotamento di locali dell’immobile allagati per guasti o piogge intense.',
    plans: {
      essential: plan({
        priceCents: 24900, visits: 1, interventions: 1, maxMinutes: 120, extraLaborDiscountPct: 10,
        included: ['1 svuotamento con pompe fino a 120 minuti', 'Uscita inclusa', 'Sconto 10% sulle ore aggiuntive']
      }),
      plus: plan({
        priceCents: 64900, visits: 3, interventions: 2, maxMinutes: 180, checkups: 1, extraLaborDiscountPct: 15,
        included: ['2 svuotamenti con pompe fino a 180 minuti ciascuno', '1 controllo preventivo di pompe di sollevamento e pozzetti', 'Sconto 15% sulle ore aggiuntive']
      })
    },
    exclusions: ['Aspirazione con autospurgo e smaltimento di acque contaminate, a listino', 'Asciugatura, deumidificazione e ripristini', 'Disponibilità garantita durante allerte meteo diffuse']
  },
  {
    id: 'muratura',
    name: 'Muratura',
    icon: 'brick',
    technical: 'muratura',
    summary: 'Piccole riparazioni murarie, anche dopo guasti idraulici ed elettrici.',
    plans: {
      essential: plan({
        priceCents: 22900, visits: 1, interventions: 1, maxMinutes: 120, extraLaborDiscountPct: 10,
        included: ['1 piccola riparazione muraria fino a 120 minuti', 'Uscita inclusa', 'Sconto 10% sulla manodopera oltre i limiti']
      }),
      plus: plan({
        priceCents: 54900, visits: 3, interventions: 3, maxMinutes: 120, extraLaborDiscountPct: 15,
        included: ['3 piccole riparazioni murarie fino a 120 minuti ciascuna', 'Uscita inclusa per ogni intervento', 'Sconto 15% sulla manodopera oltre i limiti']
      })
    },
    exclusions: ['Ristrutturazioni, rifacimenti di bagni e cucine', 'Tinteggiatura di interi ambienti', 'Interventi strutturali o che richiedono pratiche edilizie']
  },
  {
    id: 'disinfestazioni',
    name: 'Disinfestazioni',
    icon: 'shield',
    technical: 'disinfestazioni',
    summary: 'Trattamenti contro insetti infestanti nell’abitazione e controllo dei roditori.',
    plans: {
      essential: plan({
        priceCents: 22900, visits: 1, interventions: 1, maxMinutes: 90, extraLaborDiscountPct: 10,
        included: ['1 trattamento contro insetti striscianti (es. blatte, formiche) fino a 90 minuti', 'Sopralluogo di valutazione', 'Sconto 10% su trattamenti aggiuntivi']
      }),
      plus: plan({
        priceCents: 59900, visits: 3, interventions: 2, maxMinutes: 90, checkups: 1, extraLaborDiscountPct: 15,
        included: ['2 trattamenti contro insetti fino a 90 minuti ciascuno', '1 visita di monitoraggio roditori', 'Sconto 15% su trattamenti aggiuntivi']
      })
    },
    exclusions: ['Trattamenti contro cimici dei letti, a listino dedicato', 'Rimozione di nidi in posizioni che richiedono mezzi speciali', 'Aree verdi esterne di grandi dimensioni']
  }
];

export const familyTiers = [
  { id: 'essential', name: 'Essential', tagline: 'L’intervento che serve, una volta l’anno' },
  { id: 'plus', name: 'Plus', tagline: 'Più interventi e un controllo preventivo' }
];
