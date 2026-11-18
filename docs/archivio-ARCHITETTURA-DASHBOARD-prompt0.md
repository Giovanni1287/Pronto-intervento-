> **Archiviato:** superato da `docs/ARCHITETTURA-PRONTO-PLUS.md` e dalle migrazioni in `supabase/migrations/`.

# Architettura futura — Area clienti, Dashboard e PRONTO+

> Documento di progetto. **Nulla di quanto descritto è implementato**: nessuna dashboard, nessun login, nessun pagamento è attivo nel sito attuale.

## 1. Obiettivi

1. Vendere e gestire abbonamenti annuali **PRONTO+** (Family, Business, Hotel & Corporate).
2. Permettere al titolare di modificare **coperture e prezzi** senza toccare il codice.
3. Dare ai clienti un'**area riservata** con contratti, interventi e richieste.
4. Ricevere le richieste dei moduli del sito in un unico database.

## 2. Componenti

```
 Sito statico (Netlify)                    Supabase
 ┌──────────────────────────┐   anon key   ┌──────────────────────────────┐
 │ Pagine pubbliche          │────────────▶│ Auth (email OTP / magic link) │
 │ /area-cliente/  (JS)      │◀────────────│ Postgres + Row Level Security │
 │ /admin/         (JS)      │             │ Edge Functions                │
 └──────────────────────────┘             │  · submit-request (moduli)     │
              │                            │  · create-checkout (myPOS)     │
              │ redirect pagamento         │  · mypos-webhook               │
              ▼                            │ Storage (foto interventi, PDF) │
        myPOS Checkout ──── webhook ──────▶└──────────────────────────────┘
```

- Il sito resta **statico**: area cliente e dashboard saranno pagine JS vanilla che usano `@supabase/supabase-js` (unica dipendenza prevista, caricata solo in quelle pagine).
- Le operazioni sensibili (pagamenti, cambi di stato contratti) avvengono **solo** in Edge Functions con service role, mai dal browser.

## 3. Moduli funzionali

| Modulo | Utente | Funzioni principali |
|---|---|---|
| **Supabase Auth** | tutti | Login email OTP; ruoli `customer`, `admin`, `technician` in `profiles.role` |
| **Area cliente** | customer | Dati anagrafici, immobili/sedi, contratti PRONTO+, storico interventi, nuova richiesta |
| **Dashboard amministrativa** | admin | Richieste in arrivo, clienti, contratti, pianificazione interventi, catalogo prezzi |
| **Catalogo prezzi** | admin | Linee → categorie → piani (Essential/Plus) con prezzo, IVA, coperture, validità; il sito legge solo i prezzi `published` |
| **Contratti** | admin/customer | Contratto annuale con decorrenza, scadenza, rinnovo, stato (`draft`, `pending_payment`, `active`, `expired`, `cancelled`) |
| **Interventi** | admin/technician/customer | Ticket con categoria, priorità, indirizzo, stato, rapporto finale, allegati |
| **Pagamenti myPOS** | sistema | Checkout ospitato myPOS, conferma via webhook firmato, registrazione in `payments`; nessun dato di carta transita dal sito |

## 4. Integrazione con il sito attuale

- `src/data/pronto-plus.js` riflette già la gerarchia **linea → categoria → piano (tier)** della tabella `plan_prices`; in futuro il build (o il client) leggerà i prezzi pubblicati da Supabase al posto di `price: null`.
- I moduli useranno `forms.provider = 'endpoint'` con `forms.endpoint` = URL della Edge Function `submit-request`.
- Le categorie dei moduli usano gli stessi slug di `src/data/services.js` (`categoria/sottocategoria`).

## 5. Sicurezza

- RLS attiva su tutte le tabelle; i clienti vedono solo le proprie righe.
- Chiave `service_role` solo nelle Edge Functions (variabili d'ambiente), mai nel repository.
- Webhook myPOS: verifica firma e idempotenza (`provider_ref` univoco).
- Log delle modifiche ai prezzi (`price_changes`) con autore e data.
- Conformità GDPR: informativa, base giuridica, conservazione dati, esportazione/cancellazione su richiesta.

## 6. Roadmap suggerita

1. Prompt 1 — 24 landing di sottocategoria.
2. Ricezione moduli (Netlify Forms o Edge Function) + informativa privacy.
3. Schema Supabase + Auth + area cliente in sola lettura.
4. Dashboard admin: richieste e catalogo prezzi.
5. Contratti PRONTO+ e pagamenti myPOS (prima in ambiente sandbox).

Bozza dello schema: `docs/supabase/schema.draft.sql`.
