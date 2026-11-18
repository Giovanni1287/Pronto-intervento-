# Immagini — requisiti e registro licenze

## Stato attuale

Tutte le fotografie del sito sono **placeholder generati** (SVG, pochi KB), marcati con l'etichetta "Immagine da sostituire".
Non è stata inserita alcuna foto reale perché non era possibile scaricare e verificare immagini con licenza commerciale in questa fase.

## Regole

- Solo immagini con **licenza commerciale verificabile** (es. Unsplash License, Pexels License, Adobe Stock, Shutterstock, iStock) o foto proprie.
- **Mai** immagini prese da siti concorrenti.
- Le foto di repertorio sono **illustrative**: non presentarle come lavori eseguiti da Giovanni Romeo. Il footer lo dichiara già.
- Foto del titolare e dei lavori reali: solo materiale autentico fornito dall'impresa, con consenso delle persone ritratte.
- Evitare foto con marchi, targhe o volti riconoscibili senza liberatoria.

## Formati consigliati

| Uso | Dimensioni | Formato |
|---|---|---|
| Hero homepage | 1920×1080 | AVIF/WebP + JPG fallback, < 250 KB |
| Hero categoria | 1600×900 | WebP, < 200 KB |
| Card categoria | 800×560 (2× 1600×1120) | WebP, < 120 KB |
| Foto titolare | 800×960 | WebP, < 120 KB |
| Ricerca perdite | 900×1100 | WebP, < 150 KB |

## Come sostituire un placeholder

Tutte le immagini passano dal registro centrale `src/config/images.config.js`. Ogni immagine ha una chiave:

| Chiave | Dove compare | Dimensioni |
|---|---|---|
| `home/hero` | hero homepage (LCP, precaricata) | 1920×1080 |
| `home/leak` | sezione ricerca perdite in home | 900×1100 |
| `about/owner` | foto del titolare | 800×960 |
| `category/<categoria>` | card in home e hero della categoria | 1600×900 |
| `landing/<categoria>/<servizio>/hero` | hero della landing (LCP, precaricata) | 1600×900 |
| `landing/<categoria>/<servizio>/gallery-1…3` | galleria della landing (gallery-1 anche nella card di categoria) | 800×600 |
| `pronto-plus/family/hero` | hero della pagina PRONTO+ Family | 1600×900 |
| `pronto-plus/lavoro-protetto/hero` | hero della pagina Lavoro Protetto | 1600×900 |

1. Copiare i file in `src/assets/images/foto/<categoria>/` (JPG + eventuali WebP/AVIF).
2. Aggiungere la voce nel registro, ad esempio:
   ```js
   'landing/idraulica/spurgo-fognature/hero': {
     src: '/assets/images/foto/idraulica/spurgo-fognature-hero.jpg',
     webp: '/assets/images/foto/idraulica/spurgo-fognature-hero.webp',
     avif: '/assets/images/foto/idraulica/spurgo-fognature-hero.avif',
     width: 1600, height: 900,
     alt: 'Mezzo autospurgo durante lo svuotamento di un pozzetto',
     license: 'Unsplash License', credit: 'Autore — URL', authentic: false
   }
   ```
3. Per le foto di **lavori reali** di Giovanni Romeo impostare `authentic: true`; tutte le altre restano illustrative.
4. `npm run check` — il report elenca quante immagini sono ancora in placeholder.

Il sito genera `<picture>` con sorgenti AVIF/WebP quando presenti, `width`/`height` espliciti, `loading="lazy"` per le immagini secondarie e `fetchpriority="high"` + `<link rel="preload">` per l'immagine hero.

## Registro licenze

| File | Soggetto | Fonte / autore | Licenza | Data verifica |
|---|---|---|---|---|
| — | — | — | — | — |

Soggetti da reperire: tecnici idraulici, spurghi, videoispezione tubazioni, impianti elettrici, ricerca perdite (termocamera/geofono), interventi per allagamenti, muratura, disinfestazioni, assistenza tecnica ad abitazioni e aziende.
