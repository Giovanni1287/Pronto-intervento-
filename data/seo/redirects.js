/**
 * REDIRECT 301 (Prompt 7). Da compilare al passaggio dal sito attuale al nuovo:
 * ogni URL del vecchio sito ancora indicizzata (da Search Console → Pagine) va
 * reindirizzata alla pagina nuova più pertinente, mai in blocco verso la home.
 * HTTPS e dominio principale (www → senza www) si impostano nel pannello Netlify
 * (Domain management → primary domain, HTTPS forzato): non servono regole qui.
 * Formato: [origine, destinazione, codice]. "301!" forza il redirect anche se il file esiste:
 * su Netlify una regola NON si applica a un percorso servito da un file reale (shadowing),
 * quindi gli alias /…/index.html richiedono il "!".
 *
 * Prompt 8 — rilevazione del sito attuale (18/11/2026, reports/migration/old-site-snapshot-2026-11-18.md):
 * pagina unica su Netlify; URL raggiungibili: "/" (stessa URL nel nuovo sito) e "/index.html".
 * Nessun'altra pagina, sitemap o robots: non servono altre regole. Da ricontrollare in Search Console
 * (Pagine → indicizzate) prima del passaggio: ogni URL in più va mappata qui, mai verso la home in blocco.
 */
export const redirects = [
  ['/index.html', '/', '301!'],
  ['/index.htm', '/', 301],
  ['/servizi/index.html', '/servizi/', '301!']
];
