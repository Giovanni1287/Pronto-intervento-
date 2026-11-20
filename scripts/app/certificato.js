/**
 * VERIFICA PUBBLICA DEL CERTIFICATO — /certificato/?n=PIR-2026-XXXX-XXXX
 * Mostra solo dati non personali (stato, data, categoria, servizio, comune,
 * eventuale servizio aggiuntivo). I dettagli restano nell'area cliente.
 */
import { h, clear, fill, notice, statusBadge, date } from './core.js';

const root = document.getElementById('app');
const RE = /^PIR-\d{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/;

async function check(n, out) {
  clear(out);
  if (!RE.test(n)) return out.append(notice('error', 'Formato non valido. Esempio: PIR-2026-7K4Q-9M2X'));
  out.append(h('p', { class: 'app-muted' }, 'Verifica in corso…'));
  let r;
  try { r = await fetch(`/.netlify/functions/certificate-verify?n=${encodeURIComponent(n)}`); } catch { r = null; }
  clear(out);
  if (!r || r.status === 503 || r.status === 404 && !(r.headers.get('content-type') || '').includes('json')) {
    return out.append(notice('warn', 'Il servizio di verifica non è ancora attivo. Contatta l’impresa per verificare il documento.'));
  }
  const d = await r.json();
  if (!d.found) return out.append(notice('error', 'Nessun certificato corrisponde a questo numero.'));
  const ok = d.valid === true;
  out.append(h('div', { class: `app-card cert-result ${ok ? 'cert-result--ok' : 'cert-result--ko'}` },
    h('p', { class: 'cert-result__state' }, ok ? 'Certificato valido' : d.status === 'superseded' ? 'Certificato sostituito da una revisione successiva' : d.status === 'revoked' ? 'Certificato revocato' : 'Contenuto non integro'),
    h('dl', { class: 'app-dl' },
      h('div', {}, h('dt', {}, 'Numero'), h('dd', {}, d.number, ' ', statusBadge(d.status))),
      h('div', {}, h('dt', {}, 'Revisione'), h('dd', {}, String(d.revision))),
      h('div', {}, h('dt', {}, 'Emesso il'), h('dd', {}, date(d.issuedAt))),
      h('div', {}, h('dt', {}, 'Impresa'), h('dd', {}, d.companyName)),
      h('div', {}, h('dt', {}, 'Servizio'), h('dd', {}, `${d.categoryName} · ${d.serviceName}`)),
      h('div', {}, h('dt', {}, 'Data del lavoro'), h('dd', {}, date(d.workDate))),
      h('div', {}, h('dt', {}, 'Comune'), h('dd', {}, d.city)),
      d.protectedPlanName ? h('div', {}, h('dt', {}, 'Servizio aggiuntivo'), h('dd', {}, `${d.protectedPlanName} fino al ${date(d.protectedPlanEndsAt)}`)) : null,
      d.supersededBy ? h('div', {}, h('dt', {}, 'Revisione valida'), h('dd', {}, h('a', { href: `/certificato/?n=${encodeURIComponent(d.supersededBy)}` }, d.supersededBy))) : null,
      h('div', {}, h('dt', {}, 'Integrità del contenuto'), h('dd', {}, d.integrity ? `verificata (impronta ${d.payloadHashShort}…)` : 'NON corrispondente'))),
    h('p', { class: 'app-muted' }, 'Per tutela della riservatezza questa pagina non mostra nomi, indirizzi, recapiti o fotografie.')));
}

if (root) {
  const input = h('input', { type: 'text', id: 'cert-n', autocomplete: 'off', spellcheck: 'false', placeholder: 'PIR-2026-XXXX-XXXX', value: new URLSearchParams(location.search).get('n') || '' });
  const out = h('div', { 'aria-live': 'polite' });
  fill(root, 
    h('form', { class: 'app-card app-verify', onsubmit: (e) => { e.preventDefault(); const n = input.value.trim().toUpperCase(); history.replaceState(null, '', `?n=${encodeURIComponent(n)}`); check(n, out); } },
      h('label', { for: 'cert-n' }, 'Numero del certificato'), input, h('button', { class: 'btn btn--primary', type: 'submit' }, 'Verifica')),
    out);
  if (input.value) check(input.value.trim().toUpperCase(), out);
}
