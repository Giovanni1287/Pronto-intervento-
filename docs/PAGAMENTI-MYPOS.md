# Pagamenti myPOS, abbonamenti e incassi (Prompt 4)

Stato: **integrazione predisposta e testata solo con simulazioni (mock)**. Nessun test con myPOS reale è stato eseguito: in questo ambiente non sono disponibili credenziali sandbox. Pagamenti reali **non attivi**.

## 1. Scelta dell'integrazione

### SDK TypeScript ufficiale (`mypos-online-checkout`)

Ho valutato l'SDK sulla documentazione ufficiale (pagina dell'SDK e relativo API Reference):

- **Runtime.** Node.js 18+ con `fetch` nativo, solo lato server, ESM/CJS. È compatibile con le Netlify Functions, che usano Node 18/20.
- **Client e credenziali.** Il client è `MyPOSClient` con *Store ID, Store password, Key index, chiave privata, chiave pubblica myPOS* e `isSandbox`.
- **Metodi.** `generateCheckoutFields`, `validateNotification`, `getTransactionStatus`, `refund`, `reversal` e altri.
- **Versione e risposta alle notifiche.** La documentazione non indica né il numero di versione né la risposta attesa per le notifiche.

Perché ora non lo uso:

1. Il pacchetto non è installabile né verificabile in questo ambiente, che non ha rete verso npm. Non ho voluto scrivere codice basato su un'interfaccia che non posso eseguire.
2. Il suo modello di credenziali (Store ID e Store password) è diverso da quello documentato nelle pagine per metodo della Checkout API (SID, WalletNumber, KeyIndex, certificato). Il prompt chiede di non mescolare famiglie di credenziali.

### Integrazione adottata: Checkout API IPC 1.4, checkout ospitato

Ogni metodo segue la sua pagina di documentazione:

| Metodo | Uso |
|---|---|
| `IPCPurchase` | Form firmato inviato a `https://www.mypos.com/vmp/checkout-test` (sandbox) oppure `…/vmp/checkout` (produzione) |
| `IPCPurchaseNotify` | Notifica server-to-server su `URL_Notify` (solo HTTPS, senza porta); risposta **HTTP 200 con corpo `OK`** in text/plain |
| `IPCPurchaseRollback` | Storno inviato da myPOS quando non riceve `OK` |
| `IPCGetPaymentStatus` | Consultazione dello stato (`PaymentStatus`: 1 riuscito, 2 in attesa, 3 non riuscito, 4 stornato) |
| `IPCRefund` | Rimborso, disattivato per impostazione predefinita |

**Firma.** I valori dei parametri, nell'ordine di invio, vengono uniti con `-`, codificati in Base64 e firmati RSA-SHA256. La firma è l'ultimo parametro.

**Passare all'SDK in futuro.** Tutto il codice del provider sta in `src/lib/mypos.js` (configurazione, firma, costruzione dei messaggi, verifica). Per passare all'SDK basta sostituire quel modulo e la configurazione delle credenziali. La logica di ordini, incassi e attivazioni nel database resta invariata.

### Collegamenti di pagamento

I *PayLink* myPOS si creano **solo dal portale myPOS**: la documentazione non descrive API per crearli, né notifiche verso il nostro sistema. Per questo "Richiedi pagamento" genera un collegamento verso la pagina `/paga/` del sito, che avvia il **checkout ospitato ufficiale** myPOS (`IPCPurchase`) con l'OrderID dell'ordine.

Non viene costruito nessun URL myPOS "inventato". Un pagamento ricevuto tramite PayLink creato a mano nel portale non porta il nostro OrderID: si registra come incasso manuale (metodo `mypos_paylink`) indicando il riferimento della transazione.

## 2. Flussi

| Acquisto | Creazione dell'ordine | Pagamento | Attivazione |
|---|---|---|---|
| **PRONTO+ Family** (8 categorie × Essential/Plus) | `/checkout/?piano=…`: prezzo, prestazioni ed esclusioni dal catalogo pubblicato; scelta o inserimento dell'abitazione; `create_family_order` | Condizioni accettate (versione registrata), poi checkout myPOS | Contratto attivo 12 mesi, senza rinnovo; prestazioni inizializzate una sola volta |
| **Lavoro Protetto** | Dall'area cliente, per un intervento identificato: `create_protected_order` e riepilogo `/checkout/?ordine=` | Come sopra | Servizio attivo. Il certificato riceve una nuova revisione e la precedente resta conservata come "sostituita" (la documentazione originaria non si cancella) |
| **Business e Hotel** | Area Business, "Paga online" su una rata: `create_installment_order`. Ammesso solo se il pagamento online è tra le **modalità approvate dal titolare** (impostazioni o `terms.paymentMethods` del contratto) | Checkout myPOS, oppure bonifico o RiBa registrati dall'amministratore | Secondo la regola del contratto (`activationRule`) |
| **Corporate** | Preventivo personalizzato → approvazione → accettazione con impronta → contratto con rate personalizzate (acconto, rate, saldo) | Una rata per ordine, collegato alla versione accettata | Predefinita: **solo a pagamento integrale** di tutte le rate. `first_installment` va scritto esplicitamente nel contratto |
| **Interventi singoli** | Dashboard → "Richiedi pagamento": da un intervento completato, una richiesta aziendale completata o un preventivo approvato; voci (manodopera, materiali, trasferta, …), quantità, prezzi, IVA (0, 4, 5, 10 o 22%) | Collegamento `/paga/#t=…` → checkout myPOS | Nessuna attivazione: ordine pagato, ricevuta, documento fiscale da collegare |

Altre regole:

- **Pagamenti parziali.** Un bonifico parziale porta l'ordine a "parzialmente pagato" e non attiva nulla.
- **Stati separati.** Lo stato del pagamento (ordine) e lo stato del contratto restano distinti.

### Carrello multicategoria

Non era implementato nei prompt precedenti e non l'ho aggiunto. Ogni categoria Family si acquista con un ordine distinto e ognuna mantiene il proprio prezzo pubblicato. Le offerte combinate andranno definite dal titolare prima di qualsiasi sviluppo.

## 3. Endpoint (Netlify Functions)

| Funzione | Ruolo |
|---|---|
| `order-create` | Crea l'ordine dalla versione commerciale, con l'identità dell'utente |
| `order-summary` | Riepilogo autorizzato per il titolare, oppure tramite token del link inviato nell'intestazione `X-Payment-Link` |
| `checkout-create` | Verifica la pagabilità e l'accettazione delle condizioni, registra il tentativo e firma `IPCPurchase` |
| `mypos-notify` | Riceve notifiche e storni (service role); risponde `OK` solo dopo la registrazione sicura |
| `payment-status` | Stato per le pagine di esito; consultazione `IPCGetPaymentStatus` facoltativa |
| `payment-receipt` | Ricevuta PDF (non è una fattura) |
| `payments-admin` | Solo amministratori: esecuzione dei rimborsi approvati, verifica dello stato su myPOS, importazione CSV per la riconciliazione |
| `expirations` | Scadenze giornaliere, compresi gli ordini non pagati |

## 4. Sicurezza

- **Importi.** Sono calcolati e verificati dal database (centesimi interi). Si convertono nel formato myPOS (`"149.45"`) solo nel messaggio firmato. Nessun importo inviato dal browser viene usato: un test lo verifica.
- **Verifiche sulla notifica:**
  - firma con il certificato myPOS;
  - OrderID esistente;
  - importo atteso;
  - valuta;
  - `IPC_Trnref` presente.
  Nel database, poi:
  - idempotenza sulla chiave dell'evento;
  - vincolo univoco sulla transazione (provider + riferimento + tipo);
  - vincolo univoco sull'attivazione (una per contratto o servizio).
- **Comunicazioni fuori ordine:**

  | Caso | Comportamento |
  |---|---|
  | Storno prima della notifica | La notifica successiva viene ignorata |
  | Notifica dopo lo storno | Ignorata |
  | Notifica ritardata su ordine scaduto | Pagamento registrato e versione accettata onorata |
  | Pagamento su ordine annullato | Registrato, ordine "da verificare", nessuna attivazione |
  | Secondo pagamento sullo stesso ordine | Registrato come duplicato da rimborsare, nessuna nuova attivazione |
  | Storno dopo il pagamento | Incasso annullato, ordine da verificare, amministratori avvisati |

- **Errori di registrazione.** Se la registrazione fallisce, la funzione risponde con un codice diverso da 200 e senza `OK`. Il pagamento non viene confermato impropriamente e myPOS procede con lo storno.
- **Il redirect non conta.** Il ritorno del browser su `URL_OK` aggiorna solo il tentativo, mai l'ordine.
- **Dati di carta.**
  - Non transitano dal sito, perché il pagamento avviene sul checkout ospitato.
  - Dalle comunicazioni myPOS vengono **scartati** PAN, scadenza, token della carta, dati personali e firma prima di qualsiasi registrazione o log.
  - Non si richiede la tokenizzazione (`CardTokenRequest=0`), quindi non ci sono addebiti ricorrenti.
- **Token del link.**
  - È casuale (24 byte) e nel database resta solo la sua impronta SHA-256.
  - Sta nel frammento dell'URL (`#t=`), che non arriva ai server né ai referer, e viaggia solo nell'intestazione `X-Payment-Link`.
  - Ha una scadenza e può essere rigenerato, il che invalida il precedente.
- **Intestazioni HTTP.** Le pagine di pagamento sono `noindex`, `no-store` e `no-referrer`. La CSP ammette `form-action` solo verso `https://www.mypos.com`.
- **RLS.** I clienti vedono solo i propri ordini (o quelli della propria azienda, se amministratore aziendale o responsabile della manutenzione). Gli incassi li gestisce solo l'amministratore e ogni modifica è registrata (vista `payment_audit_logs`). Non sono ammesse scritture dirette dai client.

## 5. Database (migrazioni `20261117140000…140200`)

**Tabelle riutilizzate:**
- `payments` è il record presso il provider (OrderID myPOS), ora collegato all'ordine.
- `payment_events` garantisce l'idempotenza delle comunicazioni.
- `audit_log` è esposto come vista `payment_audit_logs`.

**Nuove tabelle:**

| Tabella | Contenuto |
|---|---|
| `orders` | Snapshot di prezzo, imposte, condizioni e versione commerciale (`commercial_ref`); stato; importi |
| `order_items` | Voci dell'ordine |
| `payment_attempts` | Tentativi di checkout |
| `payment_transactions` | Incassi, storni e rimborsi verificati |
| `payment_allocations` | Ripartizione degli incassi su ordini e rate |
| `payment_refunds` | Rimborsi: richiesta, approvazione, esecuzione |
| `payment_reconciliation` | Confronto con l'estratto myPOS |
| `invoice_references` | Collegamenti ai documenti fiscali emessi da sistemi esterni |
| `subscription_activations` | Una sola attivazione per contratto o servizio |

**Dati esistenti.** La migrazione ricostruisce gli ordini dei pagamenti già presenti, con transazioni e attivazioni, senza cancellare nulla. È coperta da un test di aggiornamento su un database con dati creati prima della migrazione.

**Stati dell'ordine:** `draft` → `awaiting_payment` → (`partially_paid`) → `paid` → (`partially_refunded`/`refunded`). Possono inoltre diventare `cancelled`, `expired` o `needs_review`. Le transizioni sono ammesse solo tramite `_order_status` e un trigger blocca le modifiche dirette.

## 6. Ambienti e variabili

| Ambiente | myPOS | Note |
|---|---|---|
| Sviluppo locale | Non configurato | Il checkout risponde "non configurato"; `URL_Notify` non sarebbe raggiungibile |
| Test sandbox | `MYPOS_ENV=sandbox` e credenziali sandbox | `SITE_URL` deve essere l'anteprima Netlify HTTPS. Il **dominio ufficiale viene rifiutato** |
| Produzione | `MYPOS_ENV=production` **e** `MYPOS_ALLOW_LIVE=true` | Solo dopo l'autorizzazione del titolare. Un URL di checkout non ufficiale o incoerente viene rifiutato |

Le variabili sono in `.env.example`. Le credenziali myPOS e la chiave privata esistono solo nelle variabili delle Netlify Functions: non vanno mai nel browser né nel repository.

## 7. Da verificare in sandbox (con credenziali reali)

1. Il pagamento riuscito arriva con la notifica firmata e la risposta `OK` (lo stato dell'ordine è visibile in dashboard).
2. Il pagamento annullato porta a `URL_Cancel` e lascia l'ordine non pagato.
3. Con `URL_Notify` irraggiungibile o in errore, myPOS invia il Purchase Rollback e il sistema registra lo storno.
4. Notifica duplicata e importo alterato.
5. Nomi dei parametri:
   - `WalletNumber` in `IPCPurchase` e `walletnumber` nell'esempio di `IPCGetPaymentStatus` (oggi uso `WalletNumber` ovunque);
   - `IPCLanguage=IT`;
   - `CustomerEmail` con `PaymentParametersRequired=3`.
6. Formato e firma delle risposte JSON di `IPCGetPaymentStatus`. Solo dopo questa verifica si può impostare `MYPOS_TRUST_STATUS_QUERY=true`.
7. `IPCRefund`: abilitazione sul conto, rimborsi parziali, formato della risposta. Solo dopo si può impostare `MYPOS_REFUNDS_ENABLED=true`.
8. Formato del CSV esportabile dal portale (colonne riconosciute: riferimento transazione, OrderID, importo, valuta, data, stato).

## 8. Credenziali e autorizzazioni ancora necessarie

| Cosa | Chi | Per |
|---|---|---|
| Conto merchant myPOS con Checkout abilitato; **credenziali sandbox**: SID, Client Number (WalletNumber), Key Index, chiave privata del negozio, certificato pubblico myPOS | Titolare / myPOS | Test reali in sandbox |
| Valuta EUR registrata e approvata sul conto | myPOS | Requisito di `IPCPurchase` |
| Abilitazione dei rimborsi via API (eventuale) | myPOS | `MYPOS_REFUNDS_ENABLED` |
| Progetto Supabase con le migrazioni applicate; service role key solo nelle funzioni | Titolare / sviluppatore | Ordini, notifiche, stato |
| Sito Netlify di anteprima HTTPS (non il dominio ufficiale) | Titolare | `URL_Notify` pubblico per la sandbox |
| Approvazione di prezzi, piani e condizioni (titolare e legale); versione delle condizioni pubblicata | Titolare / legale | Abilitare la vendita |
| Modalità di pagamento B2B approvate (online, bonifico, RiBa, …) | Titolare | Impostazioni della dashboard |
| Sistema di fatturazione elettronica e regole fiscali dell'impresa | Titolare / commercialista | Emissione dei documenti fiscali (la ricevuta del gateway non è una fattura) |
| Credenziali di produzione e `MYPOS_ALLOW_LIVE=true` | Titolare, **dopo** i test sandbox | Pagamenti reali |
| Eventuali addebiti ricorrenti o tokenizzazione | Titolare, consenso del cliente, verifica delle funzioni del conto | Non implementati |
