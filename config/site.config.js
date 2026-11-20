/**
 * CONFIGURAZIONE CENTRALE — PRONTO INTERVENTO ROMA
 * ------------------------------------------------------------------
 * Tutti i dati aziendali passano da questo file.
 * I valori `null` o stringa vuota sono DATI MANCANTI: il sito non li inventa,
 * mostra un segnaposto onesto e il build li elenca nel report
 * "configurazioni mancanti". Completarli prima della pubblicazione.
 */

export const site = {
  brand: 'PRONTO INTERVENTO ROMA',
  brandShort: 'Pronto Intervento Roma',
  subscriptionBrand: 'PRONTO+',
  owner: 'Giovanni Romeo',
  lang: 'it',
  locale: 'it_IT',

  /** URL finale. Usato per canonical, sitemap e Open Graph.
   *  Il dominio NON è ancora collegato a Netlify. */
  siteUrl: 'https://prontointerventoroma.it',

  /** Area di servizio dichiarata. Da confermare per le singole prestazioni. */
  serviceArea: {
    label: 'Roma e provincia',
    note: 'Copertura da confermare per le singole prestazioni.',
    /** Elenco zone/quartieri/comuni serviti — DA COMPLETARE con il titolare. */
    zones: []
  }
};

/** CONTATTI — non inventare: completare con i dati reali. */
export const contacts = {
  /** Formato internazionale senza spazi, es. "+390612345678". */
  phone: '',
  /** Numero WhatsApp in formato internazionale senza "+" e spazi, es. "393331234567". */
  whatsapp: '',
  whatsappMessage: 'Buongiorno, vorrei richiedere un intervento tecnico.',
  email: '',
  /** Orari di disponibilità (es. "Lun–Sab 8:00–19:00"). Non dichiarare H24 se non confermato. */
  hours: ''
};

/** DATI AZIENDALI — obbligatori per legge in footer (P.IVA ecc.). */
export const company = {
  legalName: '',
  vatNumber: '',
  taxCode: '',
  rea: '',
  pec: '',
  /** Sede legale/operativa. */
  address: {
    street: '',
    postalCode: '',
    city: '',
    province: '',
    country: 'IT'
  },
  foundingYear: '',
  /** Breve storia aziendale fornita dal titolare. Lasciare vuoto finché non disponibile. */
  story: '',
  /** Abilitazioni e qualifiche CONFERMATE dal titolare (es. 'Abilitazione DM 37/2008 lettera A').
   *  Finché l'elenco è vuoto il sito non ne cita nessuna. */
  certifications: [],
  /** Foto autentica del titolare: percorso in src/assets/images/foto/ */
  ownerPhoto: null
};

/** MODULI DI CONTATTO
 *  provider:
 *   - null      → nessun servizio di ricezione: i moduli sono visibili ma
 *                 l'invio è disattivato e viene spiegato chiaramente all'utente.
 *   - 'netlify' → Netlify Forms (attivo solo dopo deploy su Netlify).
 *   - 'endpoint'→ POST verso `endpoint` (es. Supabase Edge Function, Formspree).
 *   - 'centrale'→ (Prompt 5, consigliato) le richieste entrano nella centrale operativa
 *                 tramite /.netlify/functions/request-create. Attivo solo quando
 *                 backend.supabaseUrl e backend.supabaseAnonKey sono configurati.
 */
export const forms = {
  provider: null,
  endpoint: '',
  privacyPolicyUrl: '/privacy/'
};

/** Dominio specialistico per la ricerca perdite occulte (da definire).
 *  Finché è vuoto, la CTA punta alla pagina interna /servizi/ricerca-perdite-occulte/. */
export const specialistDomains = {
  leakDetection: ''
};

export const seo = {
  defaultTitle: 'Pronto Intervento Roma — Assistenza tecnica per case e aziende',
  titleTemplate: '%s | Pronto Intervento Roma',
  defaultDescription:
    'Assistenza tecnica a Roma e provincia per case e aziende: idraulica, impianti elettrici, ricerca perdite occulte, allagamenti, muratura e disinfestazioni.',
  /** Immagine Open Graph (1200×630). */
  ogImage: '/assets/images/og-default.png',
  /** Deve restare false finché il sito non è approvato per la pubblicazione.
   *  Anche se true, l'indicizzazione è consentita SOLO con SITE_ENV=production. */
  allowIndexing: false
};

/** Immagini principali. `src: null` → viene usato un placeholder professionale
 *  chiaramente marcato come "immagine da sostituire".
 *  Per ogni foto reale compilare `license` e `credit` (licenza commerciale verificabile). */
export const images = {
  hero: {
    src: null,
    alt: 'Tecnico al lavoro su un impianto idraulico in un\'abitazione',
    license: '',
    credit: ''
  },
  leakDetection: {
    src: null,
    alt: 'Strumentazione per la ricerca perdite con termocamera',
    license: '',
    credit: ''
  }
};

/** PRONTO+ — stato commerciale. La vendita resta disattivata finché il titolare
 *  non approva prestazioni e prezzi e un legale non verifica le condizioni. */
export const commerce = {
  salesEnabled: false,
  ownerApproved: false,
  legalReviewed: false,
  /** URL pubblico delle condizioni approvate (vuoto: si mostrano solo le bozze in anteprima). */
  termsUrl: ''
};

/** Backend Supabase: SOLO valori pubblici (URL e anon key), letti dalle variabili
 *  d'ambiente al momento della build. La service role key non va mai qui. */
const env = globalThis.process?.env || {};
export const backend = {
  supabaseUrl: env.PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: env.PUBLIC_SUPABASE_ANON_KEY || ''
};

/** PRONTO AI (Prompt 6) — assistente sul sito pubblico.
 *  Il pulsante dell'assistente compare solo se PUBLIC_AI_WIDGET=true al momento della
 *  build (es. anteprima con backend e provider configurati). Il widget si carica solo
 *  al clic: nessun impatto sul caricamento delle landing SEO.
 *  Provider, modello e chiave (AI_PROVIDER, AI_MODEL, AI_API_KEY) sono variabili
 *  d'ambiente del SERVER (Netlify Functions), mai in questo file né nel browser. */
export const ai = {
  widget: env.PUBLIC_AI_WIDGET === 'true',
  /** Percorsi in cui l'assistente non compare (aree tecniche, pagamenti, verifiche). */
  excludedPaths: ['/admin/', '/tecnico/', '/area-tecnico/', '/area-business/', '/checkout/', '/paga/', '/pagamento/', '/certificato/', '/rapporto/', '/stato-progetto/']
};

/** PRONTO SEO (Prompt 7) — misurazione.
 *  - Eventi di conversione propri (clic telefono/WhatsApp, esito moduli): anonimi, senza cookie
 *    né identificativi, inviati solo se il backend è configurato.
 *  - Google Analytics 4: SOLO con PUBLIC_GA4_MEASUREMENT_ID impostato E consenso dell'utente
 *    (banner con Accetta / Rifiuta / Personalizza). Senza ID non compare alcun banner né script.
 *    Configurazione e testi da verificare con un professionista privacy prima dell'attivazione. */
export const analytics = {
  ga4Id: /^G-[A-Z0-9]{4,12}$/.test(env.PUBLIC_GA4_MEASUREMENT_ID || '') ? env.PUBLIC_GA4_MEASUREMENT_ID : '',
  conversions: Boolean(env.PUBLIC_SUPABASE_URL && env.PUBLIC_SUPABASE_ANON_KEY),
  cookiePolicyUrl: '/cookie-policy/',
  consentVersion: '2026-11'
};
