/**
 * REGISTRO CENTRALE DELLE FOTOGRAFIE
 * ------------------------------------------------------------------
 * Ogni immagine del sito ha una CHIAVE. Se la chiave non è presente qui
 * (o `src` è vuoto) il build usa un placeholder SVG chiaramente marcato.
 *
 * Chiavi:
 *   home/hero · home/leak · about/owner
 *   category/<categoria>                     card e hero della categoria
 *   landing/<categoria>/<servizio>/hero      hero della landing
 *   landing/<categoria>/<servizio>/gallery-1 … gallery-3
 *
 * Esempio di voce (foto reale con varianti moderne):
 *   'landing/idraulica/spurgo-fognature/hero': {
 *     src: '/assets/images/foto/idraulica/spurgo-fognature-hero.jpg',   // fallback JPG
 *     avif: '/assets/images/foto/idraulica/spurgo-fognature-hero.avif', // opzionale
 *     webp: '/assets/images/foto/idraulica/spurgo-fognature-hero.webp', // opzionale
 *     width: 1600, height: 900,
 *     alt: 'Mezzo autospurgo durante lo svuotamento di un pozzetto',
 *     license: 'Unsplash License', credit: 'Nome autore — URL',
 *     authentic: false   // true SOLO per foto di lavori reali di Giovanni Romeo
 *   }
 *
 * Le immagini con `authentic: false` vengono sempre presentate come illustrative.
 * Struttura file consigliata: src/assets/images/foto/<categoria>/<file>
 */
export const photos = {};
