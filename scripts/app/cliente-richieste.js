/**
 * AREA CLIENTE — richieste di intervento (Prompt 5): nuova richiesta collegata
 * all'immobile (e al piano Family che lo copre), stato con cronologia, preventivo
 * da accettare, lavorazioni aggiuntive da autorizzare, rapporto in PDF.
 * Il percorso gratuito di segnalazione dei difetti resta separato (I miei interventi).
 */
import { h, fill, notice, db, euro, dateTime, field, openPdf } from './core.js';
import { opLabel, OP_TONE, URGENCY_LABELS, PAYMENT_STATE_LABELS } from '../lib/operations.js';

export async function requestsView(root, { restart }, header) {
  const [properties, cats, services, rows] = await Promise.all([
    db.select('properties?select=id,address_line,city&order=created_at'),
    db.select('service_categories?select=id,name&active=eq.true&order=sort'),
    db.select('services?select=id,name,category_id&active=eq.true&order=id'),
    db.rpc('my_requests')
  ]);
  const st = h('div', { role: 'status', 'aria-live': 'polite' });
  const run = (fnc, ok) => async (e) => { const b = e?.currentTarget; if (b) b.disabled = true; try { await fnc(); if (ok) alert(ok); restart(); } catch (err) { fill(st, notice('error', err.message)); } finally { if (b) b.disabled = false; } };
  const prop = h('select', { required: true }, properties.map((p) => h('option', { value: p.id }, `${p.address_line}, ${p.city}`)));
  const cat = h('select', { required: true }, h('option', { value: '' }, 'Scegli la categoria'), cats.map((c) => h('option', { value: c.id }, c.name)));
  const svc = h('select', {}, h('option', { value: '' }, 'Non so / altro'));
  cat.addEventListener('change', () => fill(svc, h('option', { value: '' }, 'Non so / altro'), ...services.filter((s) => s.category_id === cat.value).map((s) => h('option', { value: s.id }, s.name))));
  const desc = h('textarea', { rows: 4, required: true, minlength: 10, placeholder: 'Cosa succede? Da quando? Ci sono danni visibili?' });
  const urg = h('select', {}, Object.entries(URGENCY_LABELS).filter(([k]) => k !== 'emergency').map(([k, l]) => h('option', { value: k, selected: k === 'normal' }, l)));
  const slot = h('input', { type: 'text', placeholder: 'es. mattina, dopo le 17' });
  const form = properties.length ? h('form', { class: 'app-card', onsubmit: async (e) => {
    e.preventDefault();
    try {
      const r = await db.rpc('create_customer_request', { p_property: prop.value, p_category: cat.value, p_service: svc.value || null, p_description: desc.value, p_urgency: urg.value, p_slot: slot.value || null });
      fill(st, notice('ok', `Richiesta ${r.number} registrata${r.contractLinked ? ' e collegata al tuo piano PRONTO+ Family' : ''}. Ti contatteremo per i prossimi passi.`));
      setTimeout(restart, 1500);
    } catch (err) { fill(st, notice('error', err.message)); }
  } }, h('h2', {}, 'Nuova richiesta di intervento'),
    h('div', { class: 'app-form-grid' }, field('Immobile', prop), field('Categoria', cat), field('Tipo di intervento', svc), field('Urgenza', urg), field('Preferenza di orario', slot)),
    field('Descrizione', desc),
    h('p', { class: 'app-muted' }, 'Per emergenze con rischio per persone o cose chiama subito i numeri di emergenza e poi l’impresa. Se l’immobile è coperto da un piano Family, la verifica delle prestazioni incluse avviene prima dell’intervento: il credito si scala solo a lavoro eseguito e confermato.'),
    h('button', { class: 'btn btn--primary', type: 'submit' }, 'Invia richiesta'))
    : h('div', { class: 'app-card' }, h('p', {}, 'Per inviare una richiesta aggiungi prima l’immobile nella panoramica.'), h('a', { class: 'btn btn--ghost btn--sm', href: '/area-cliente/' }, 'Vai alla panoramica'));
  const card = (r) => h('article', { class: 'app-card app-int' },
    h('header', { class: 'app-int__head' }, h('div', {}, h('p', { class: 'app-int__num' }, r.number), h('h2', {}, [r.category, r.service].filter(Boolean).join(' · ') || 'Richiesta'),
      h('p', { class: 'app-muted' }, `Inviata il ${dateTime(r.createdAt)}${r.scheduledAt ? ` · appuntamento ${dateTime(r.scheduledAt)}${r.slot ? ` (${r.slot})` : ''}` : ''}${r.technicianName ? ` · tecnico ${r.technicianName}` : ''}`)),
    h('span', { class: `app-badge app-badge--${OP_TONE[r.status] || 'neutral'}` }, r.statusLabel)),
    r.description ? h('p', {}, r.description) : null,
    r.covered ? notice('ok', 'Intervento coperto, in tutto o in parte, dal tuo piano PRONTO+.') : null,
    r.quote ? h('div', { class: 'app-subform' }, h('p', {}, h('b', {}, 'Preventivo: '), `${euro(r.quote.grossCents)} IVA inclusa (${euro(r.quote.netCents)} + IVA ${r.quote.vatRate}%)`,
      r.quote.acceptedAt ? ` · accettato il ${dateTime(r.quote.acceptedAt)}` : ''),
      r.canAcceptQuote ? h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: run(() => db.rpc('customer_accept_quote', { p_id: r.id }), 'Preventivo accettato.') }, 'Accetta il preventivo') : null) : null,
    r.extraWorks.filter((w) => w.status === 'proposed').map((w) => h('div', { class: 'app-subform' }, h('p', {}, h('b', {}, 'Lavorazione aggiuntiva proposta: '), w.description, ` — ${euro(w.priceNetCents)} + IVA`),
      h('div', { class: 'app-actions' }, h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: run(() => db.rpc('customer_decide_extra_work', { p_extra: w.id, p_accept: true })) }, 'Autorizzo'),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: run(() => db.rpc('customer_decide_extra_work', { p_extra: w.id, p_accept: false })) }, 'Non autorizzo')))),
    h('details', {}, h('summary', {}, 'Cronologia'), h('ol', { class: 'ops-timeline' }, r.timeline.map((t) => h('li', {}, h('b', {}, t.label || opLabel(t.status)), h('small', {}, dateTime(t.at)))))),
    h('div', { class: 'app-actions' },
      r.reportNumber ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => openPdf('report-pdf', `?n=${encodeURIComponent(r.reportNumber)}`, 'Rapporto').catch((e) => fill(st, notice('error', e.message))) }, `Rapporto ${r.reportNumber} (PDF)`) : null,
      r.paymentState && !['not_defined', 'to_define', 'no_charge'].includes(r.paymentState) ? h('span', { class: 'app-badge app-badge--neutral' }, PAYMENT_STATE_LABELS[r.paymentState]) : null,
      r.canCancel ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: run(() => { const why = prompt('Motivo dell’annullamento'); if (!why) throw new Error('Motivo obbligatorio'); return db.rpc('transition_intervention', { p_id: r.id, p_to: 'cancelled', p_note: why }); }) }, 'Annulla richiesta') : null));
  fill(root, header('Richieste di intervento'), st, form,
    rows.length ? rows.map(card) : h('div', { class: 'app-card' }, h('p', { class: 'app-muted' }, 'Nessuna richiesta inviata.')),
    h('p', { class: 'app-legal' }, 'Le segnalazioni di difetti dei lavori eseguiti sono sempre gratuite e indipendenti dall’acquisto di servizi aggiuntivi: le trovi in “I miei interventi”.'));
}
