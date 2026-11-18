# Dominio prontointerventoroma.it — controllo e piano di passaggio

**Nessuna modifica è stata fatta** al dominio, al DNS, alla posta o al progetto Netlify esistente.

## 1. Configurazione riscontrata (DNS pubblico, 18/11/2026)

Fonte: Google Public DNS. Istantanea completa in `reports/migration/dns-snapshot-2026-11-18.txt`.

| Voce | Valore riscontrato | Nota |
|---|---|---|
| Nameserver (gestione DNS) | `dns.technorail.com`, `dns2.technorail.com`, `dns3.arubadns.net`, `dns4.arubadns.cz` | DNS gestito da **Aruba**, probabile registrar: va confermato nel pannello |
| Record A (apex) | `75.2.60.5` | Bilanciatore di Netlify |
| AAAA | nessuno | |
| `www` | CNAME `delfino-soffice-ca8830.netlify.app` | **Progetto Netlify esistente** `delfino-soffice-ca8830` |
| HTTPS | attivo (HSTS `max-age=31536000`, server Netlify) | Certificato Let's Encrypt gestito da Netlify |
| MX | `10 mx.prontointerventoroma.it` | Posta su Aruba: **da non toccare** |
| SPF | `v=spf1 include:_spf.aruba.it ~all` | Da non toccare |
| DKIM | nessuno trovato con i selettori comuni | Il selettore va letto nel pannello Aruba |
| DMARC | `v=DMARC1; p=none; adkim=r; aspf=r;` | Da non toccare |
| Verifica servizi | `google-site-verification=TwKIMgni…` | Proprietà Search Console già verificata via DNS: **non rimuovere** |
| CAA | nessuno | |
| Redirect esistenti | nessun `_redirects` pubblico | Netlify reindirizza `index.htm` |

## 2. Checklist di verifica (prima di qualsiasi passaggio, a cura del titolare)

- [ ] **Registrar.** Accesso al pannello Aruba e intestatario del dominio = impresa di Giovanni Romeo; data di scadenza del dominio.
- [ ] **Account Netlify** che possiede il progetto `delfino-soffice-ca8830`: proprietario, accesso, piano, membri del team.
- [ ] **Deploy del sito attuale.** Come viene pubblicato (repository collegato o caricamento manuale) e quanti deploy restano nello storico (servono al rollback).
- [ ] **DNS.** Record A apex e CNAME `www` puntano al progetto. Va deciso quale dominio sia il primario (oggi la home risponde su apex).
- [ ] **HTTPS.** Certificato valido per apex e `www`, rinnovo automatico attivo.
- [ ] **Posta.** MX, SPF, DKIM, DMARC annotati e **non toccati**. La posta funziona prima e dopo, con una prova di invio e ricezione.
- [ ] **Search Console.** Il record di verifica è presente: va recuperato l'accesso alla proprietà esistente.
- [ ] **Altri record TXT o CNAME di servizi esterni** (es. verifiche Meta o Microsoft): nessuno trovato nei nomi controllati. Va controllata la lista completa nel pannello Aruba.

## 3. Scenari

### A — Mantenere il progetto Netlify esistente e sostituirne il deploy (consigliato)

1. Nel progetto `delfino-soffice-ca8830`:
   - collegare il repository GitHub (Site configuration → Build & deploy → **Link repository**);
   - impostare le variabili di produzione;
   - **disattivare la pubblicazione automatica** (Stop auto publishing), così il deploy compilato resta in attesa.
2. Il primo deploy dal repository produce un URL di anteprima del deploy (`https://<id>--delfino-soffice-ca8830.netlify.app`). Si collauda lì, con noindex, perché l'URL non coincide con il dominio.
3. Approvazione → **Publish deploy**. Il dominio, il DNS e il certificato non cambiano.
4. Rollback: si ripubblica il deploy precedente dallo storico (Deploys → deploy del vecchio sito → Publish deploy). È immediato e non tocca il DNS.

**Rischio di interruzione: minimo.** Nessuna modifica DNS, nessun nuovo certificato, rollback in un clic.

**Verifica preliminare indispensabile.** Il deploy del vecchio sito deve comparire nello storico. Se il sito era stato caricato a mano, va scaricato comunque (Deploys → deploy → Download) e conservato come backup prima del passaggio.

### B — Nuovo progetto Netlify e riassegnazione del dominio

1. Si rimuove il dominio dal progetto esistente e lo si aggiunge al nuovo. Netlify consente lo stesso dominio su un solo progetto.
2. Netlify emette un nuovo certificato per il nuovo progetto. Per alcuni minuti HTTPS può dare errore.
3. Se `www` deve puntare al nuovo sottodominio `*.netlify.app`, va aggiornato il CNAME su Aruba (propagazione secondo il TTL). L'A record `75.2.60.5` resta uguale.
4. Rollback: richiede di ripetere gli stessi passaggi al contrario, con un'altra finestra di indisponibilità.

**Rischio: più alto.** Ci sono più passaggi manuali, una possibile finestra HTTPS e il rollback non è immediato.

**Conclusione.** Lo scenario A minimizza il rischio di interruzione. Il nuovo progetto `pronto-intervento-roma-2` si usa solo come **staging** (NETLIFY_DEPLOYMENT.md), senza dominio ufficiale.

## 4. Passi esatti dello scenario A (da eseguire solo dopo l'approvazione finale)

1. **Backup**: download del deploy attuale del sito vecchio, esportazione della zona DNS da Aruba, screenshot delle impostazioni del progetto Netlify (ROLLBACK_PLAN.md §1).
2. **Repository**: push di `main` approvato su GitHub (privato).
3. **Netlify**, nel progetto `delfino-soffice-ca8830`:
   - attivare *Stop auto publishing*;
   - impostare le variabili di produzione (ENVIRONMENT_VARIABLES.md) **senza** `ALLOW_INDEXING`;
   - collegare il repository (branch `main`).
4. Il deploy viene compilato ma non pubblicato. Collaudo sull'URL del deploy:
   - smoke test (ROLLBACK_PLAN.md §3);
   - moduli e notifiche verso una casella di prova;
   - pagamenti ancora in sandbox o spenti;
   - aree riservate con login.
5. Impostare `ALLOW_INDEXING=true` e fare un nuovo deploy (ancora non pubblicato). Verificare che sull'URL del deploy compaia **ancora** `noindex`: l'host non è il dominio. È la prova che la guardia funziona.
6. **Publish deploy** in una fascia di traffico basso (mattina presto). Verificare subito su `https://prontointerventoroma.it/`:
   - 200, assenza di `noindex`, `robots.txt` senza `Disallow: /`;
   - sitemap raggiungibile;
   - redirect `/index.html` → `/`;
   - HTTPS valido.
7. In Search Console (proprietà già verificata): inviare la sitemap e controllare le URL principali.
8. Monitorare per 72 ore (ROLLBACK_PLAN.md §4). In caso di problema critico, rollback del §2 del piano.

Non vanno modificati nameserver, MX, SPF, DKIM, DMARC né il record `google-site-verification`.
