/**
 * VERIFICA PUBBLICA DEL RAPPORTO — /rapporto/?n=RAP-2026-XXXXXX
 * Solo dati minimi non sensibili: numero, stato, versione, data, categoria e comune.
 * Nessun nome, indirizzo, recapito, tecnico o fotografia.
 */
import { h, clear, fill, notice, date } from './core.js';

const root = document.getElementById('app');
const RE = /^RAP-\d{4}-[0-9A-HJKMNP-TV-Z]{6}$/;

async function check(n, out) {
  clear(out);
  if (!RE.test(n)) return out.append(notice('error', 'Formato non valido. Esempio: RAP-2026-7K4Q9M'));
  out.append(h('p', { class: 'app-muted' }, 'Verifica in corso…'));
  let r;
  try { r = await fetch(`/.netlify/functions/report-verify?n=${encodeURIComponent(n)}`); } catch { r = null; }
  clear(out);
  if (!r || r.status === 503 || (r.status === 404 && !(r.headers.get('content-type') || '').includes('json'))) {
    return out.append(notice('warn', 'Il servizio di verifica non è ancora attivo. Contatta l’impresa per verificare il documento.'));
  }
  const d = await r.json();
  if (!d.found) return out.append(notice('error', 'Nessun rapporto corrisponde a questo numero.'));
  const ok = d.valid === true;
  out.append(h('div', { class: `app-card cert-result ${ok ? 'cert-result--ok' : 'cert-result--ko'}` },
    h('p', { class: 'cert-result__state' }, ok ? 'Rapporto di intervento valido' : d.status === 'in_review' ? 'Rapporto in revisione: la versione approvata non è disponibile' : 'Contenuto non integro'),
    h('dl', { class: 'app-dl' },
      h('div', {}, h('dt', {}, 'Numero'), h('dd', {}, d.number)),
      d.version ? h('div', {}, h('dt', {}, 'Versione approvata'), h('dd', {}, String(d.version))) : null,
      d.approvedAt ? h('div', {}, h('dt', {}, 'Approvato il'), h('dd', {}, date(d.approvedAt))) : null,
      d.workDate ? h('div', {}, h('dt', {}, 'Data del lavoro'), h('dd', {}, date(d.workDate))) : null,
      d.categoryName ? h('div', {}, h('dt', {}, 'Categoria'), h('dd', {}, d.categoryName)) : null,
      d.city ? h('div', {}, h('dt', {}, 'Comune'), h('dd', {}, d.city)) : null,
      d.hashShort ? h('div', {}, h('dt', {}, 'Integrità'), h('dd', {}, d.integrity ? `verificata (impronta ${d.hashShort}…)` : 'NON corrispondente')) : null),
    h('p', { class: 'app-muted' }, 'Il rapporto riepiloga il lavoro eseguito: non è una dichiarazione di conformità né una certificazione obbligatoria. Per riservatezza questa pagina non mostra dati personali.')));
}

if (root) {
  const input = h('input', { type: 'text', id: 'rap-n', autocomplete: 'off', spellcheck: 'false', placeholder: 'RAP-2026-XXXXXX', value: new URLSearchParams(location.search).get('n') || '' });
  const out = h('div', { 'aria-live': 'polite' });
  fill(root,
    h('form', { class: 'app-card app-verify', onsubmit: (e) => { e.preventDefault(); const n = input.value.trim().toUpperCase(); history.replaceState(null, '', `?n=${encodeURIComponent(n)}`); check(n, out); } },
      h('label', { for: 'rap-n' }, 'Numero del rapporto'), input, h('button', { class: 'btn btn--primary', type: 'submit' }, 'Verifica')),
    out);
  if (input.value) check(input.value.trim().toUpperCase(), out);
}
