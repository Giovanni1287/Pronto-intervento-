# Configurazione aziendale — /admin/configurazione-azienda/ (Prompt 9)

## Principio

Un dato aziendale compare all'esterno (sito, moduli, PDF, preventivi, rapporti, dati strutturati) **solo se è stato verificato**
da un amministratore indicando il documento usato. Nessun dato viene completato, dedotto o inventato: un campo vuoto o non
verificato resta semplicemente assente (e la build lo segnala tra i dati mancanti).

## Dove vivono i dati

| Tabella | Contenuto | Chi la legge |
|---|---|---|
| `company_profile` (riga unica) | 19 campi pubblici + `verified` (per campo: data, autore, documento) | Amministratori (tutto); chiunque **solo** tramite `public_company_profile()` = campi verificati e non vuoti |
| `company_private` (riga unica) | Codice fiscale, REA, dati della polizza, documenti delle qualifiche, note | Solo amministratori (`company_profile_admin`) — mai pubblicata |
| Storage `azienda-pubblico` | Logo (`logo/`) e foto del titolare (`titolare/`) | Lettura pubblica; scrittura solo amministratori e solo in quelle due cartelle |
| Storage `azienda-riservato` | Visure, abilitazioni, polizze | Solo amministratori |
| `company_settings.data` | Copia dei soli campi verificati per i PDF (sincronizzata da trigger) | Generatori PDF lato server |

## Campi

| Campo | Obbligatorio | Formato controllato dal database | Dove compare quando verificato |
|---|---|---|---|
| Nome commerciale (`tradeName`) | ✅ | testo | header, footer, titoli, Schema.org |
| Ragione sociale (`legalName`) | ✅ | testo | footer, PDF, Schema.org `legalName` |
| Titolare (`ownerName`) | ✅ | testo | Chi siamo, footer, Schema.org `founder` |
| Partita IVA (`vatNumber`) | ✅ | `^(IT)?[0-9]{11}$` | footer, PDF, Schema.org `vatID` |
| Sede legale (`registeredOffice`) | ✅ | via, CAP, comune, provincia | footer, PDF, Schema.org `address` |
| Telefono (`phone`) | ✅ | E.164, normalizzato con +39 | pulsanti Chiama, footer, contatti, Schema.org |
| Email (`email`) | ✅ | email | footer, contatti, Schema.org |
| Orari (`hours`) | ✅ | testo | footer, contatti |
| PEC | — | email | footer, PDF |
| Sede operativa | — | come sede legale | Chi siamo |
| WhatsApp Business | — | solo cifre | pulsante WhatsApp |
| Logo, foto del titolare | — | file nel bucket pubblico | Schema.org `logo` (il logo grafico del sito resta quello attuale), Chi siamo (foto) |
| Descrizione | — | testo | Chi siamo |
| Nota sulle zone | — | testo | Chi siamo |
| Disponibilità dei servizi | — | testo | Chi siamo |
| Abilitazioni verificate | — | elenco titolo + ente | Chi siamo, Schema.org `hasCredential` |
| Copertura assicurativa (testo pubblico) | — | testo | Chi siamo |
| Profili social | — | solo `https://` | footer (`rel="me"`), Schema.org `sameAs` |

## Flusso

1. **Salva** (`company_profile_update`): normalizza (telefono +39, P.IVA, URL social https) e **annulla la verifica** dei campi modificati.
2. **Verifica** (`company_profile_verify`): solo campi non vuoti; nota obbligatoria (≥ 5 caratteri) con il documento usato. Registrata con autore e data (audit).
3. Il trigger `_sync_company_settings` aggiorna subito i dati dei PDF (rapporti, preventivi, ricevute).
4. **Aggiorna il sito** (funzione `site-rebuild` → build hook Netlify): la build legge `public_company_profile()` e applica i dati a header, footer, contatti, Chi siamo, landing, moduli e JSON-LD. Senza build hook configurato il pulsante lo dice; si ripubblica dal pannello Netlify.

Una build di **produzione** con Supabase configurato ma non raggiungibile si **interrompe**: meglio non pubblicare che pubblicare dati vecchi.

## Stato al 18/11/2026

Nel database non è stato inserito alcun dato aziendale (nessun progetto Supabase collegato). Nel codice restano solo i dati già noti
dai prompt precedenti (marchio "PRONTO INTERVENTO ROMA", titolare Giovanni Romeo). **Da fornire e verificare:** ragione sociale, P.IVA,
sede legale, telefono (quello del sito attuale, +39 351 922 1277, non è confermato), email, orari. Facoltativi: PEC, WhatsApp, logo, foto,
descrizione, abilitazioni, assicurazione, social.

## Test

`supabase/tests/80_activation.sql` (verifica/annullamento, separazione dei dati riservati, sincronizzazione PDF, bucket di storage),
`tests/unit/activation.test.js` (applicazione al sito e allo Schema.org, social solo https), `scripts/e2e/activation-check.py` (pagina).
