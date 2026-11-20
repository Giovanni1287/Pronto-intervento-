/**
 * Sezione dell'area tecnico per i clienti aziendali (Prompt 3): richieste B2B e
 * visite di manutenzione assegnate. Condivisa da /area-tecnico/ e /tecnico/.
 */
import { h, fill, dateTime, notice, db, field } from './core.js';
import { requestBadge, visitBadge, URGENCY_LABELS } from './b2b-common.js';

/* ---------------- B2B: richieste aziendali e visite di manutenzione assegnate ---------------- */
export async function b2bSection(restart) {
  const asg = await db.select('technician_assignments?active=eq.true&select=request_id,visit_id');
  const rIds = asg.map((a) => a.request_id).filter(Boolean);
  const vIds = asg.map((a) => a.visit_id).filter(Boolean);
  const [reqs, visits] = await Promise.all([
    rIds.length ? db.select(`business_intervention_requests?id=in.(${rIds.join(',')})&select=id,number,status,problem_type,description,declared_urgency,contact_name,contact_phone,preferred_slot,scheduled_at,location_id&order=scheduled_at`) : [],
    vIds.length ? db.select(`maintenance_visits?id=in.(${vIds.join(',')})&select=id,scheduled_at,status,checklist,location_id&order=scheduled_at`) : []
  ]);
  const st = h('div', { role: 'status', 'aria-live': 'polite' });
  const run = async (f) => { try { await f(); restart(); } catch (err) { fill(st, notice('error', err.message)); } };
  const reportForm = (r) => {
    const desc = h('textarea', { rows: 3, required: true, minlength: 10 }); const mins = h('input', { type: 'number', min: 0, required: true });
    const mats = h('textarea', { rows: 2, placeholder: 'Un materiale per riga, es. Sifone 40 mm x 1' }); const notes = h('textarea', { rows: 2 });
    const flags = ['outside_hours', 'holiday', 'complex'].map((k) => { const cb = h('input', { type: 'checkbox', id: `${k}-${r.id}` }); return { k, cb }; });
    const labels = { outside_hours: 'Fuori fascia oraria coperta', holiday: 'Giorno festivo', complex: 'Lavoro complesso (non incluso)' };
    const signer = h('input', { type: 'text', placeholder: 'Nome di chi firma per presa visione (facoltativo)' });
    return h('form', { class: 'app-subform', onsubmit: (e) => { e.preventDefault(); run(async () => {
      const materials = mats.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const m = l.match(/^(.*?)\s+x\s*(\d+)$/i); return m ? { name: m[1], qty: Number(m[2]) } : { name: l }; });
      const f = Object.fromEntries(flags.map(({ k, cb }) => [k, cb.checked]));
      await db.rpc('submit_service_report', { p_request: r.id, p_description: desc.value.trim(), p_minutes: Number(mins.value), p_materials: materials, p_notes: notes.value.trim() || null,
        p_outside_hours: f.outside_hours, p_holiday: f.holiday, p_complex: f.complex, p_photos: [], p_signed_by: signer.value.trim() || null });
      await db.rpc('transition_business_request', { p_request: r.id, p_to: 'completed' });
    }); } },
      field('Lavoro eseguito', desc), field('Minuti di lavoro effettivi', mins), field('Materiali', mats), field('Note tecniche', notes),
      flags.map(({ k, cb }) => h('div', { class: 'field field--check' }, cb, h('label', { for: cb.id }, labels[k]))), field('Presa visione', signer),
      h('button', { class: 'btn btn--primary', type: 'submit' }, 'Registra rapporto e completa'));
  };
  const visitForm = (v) => {
    const items = (v.checklist || []).map((it, i) => { const ok = h('input', { type: 'checkbox', id: `ck-${v.id}-${i}`, checked: true }); const note = h('input', { type: 'text', placeholder: 'Nota', 'aria-label': `Nota: ${it}` }); return { it, ok, note }; });
    const notes = h('textarea', { rows: 2 }); const mins = h('input', { type: 'number', min: 0, value: 0 }); const ack = h('input', { type: 'text', placeholder: 'Nome e cognome' });
    return h('form', { class: 'app-subform', onsubmit: (e) => { e.preventDefault(); run(() => db.rpc('complete_maintenance_visit', { p_visit: v.id,
      p_results: items.map(({ it, ok, note }) => ({ item: it, ok: ok.checked, note: note.value.trim() || null })), p_notes: notes.value.trim() || null, p_work_minutes: Number(mins.value || 0), p_photos: [], p_acknowledged_by: ack.value.trim() || null })); } },
      h('fieldset', {}, h('legend', {}, 'Checklist (controlli di manutenzione ordinaria, non verifiche di legge)'), items.map(({ it, ok, note }) => h('div', { class: 'app-inline' }, h('label', { class: 'chip-check' }, ok, h('span', {}, it)), note))),
      field('Note della visita', notes), field('Minuti di piccola manutenzione eseguita', mins, 'Si scalano dal monte ore solo dopo la conferma del cliente o dell’amministratore.'), field('Firma di presa visione', ack),
      h('button', { class: 'btn btn--primary', type: 'submit' }, 'Registra visita eseguita'));
  };
  return h('section', { class: 'app-card' }, h('h2', {}, 'Clienti aziendali'), st,
    reqs.length ? reqs.map((r) => h('article', { class: 'app-int' },
      h('header', { class: 'app-int__head' }, h('div', {}, h('p', { class: 'app-int__num' }, r.number), h('h3', {}, r.problem_type),
        h('p', { class: 'app-muted' }, `${dateTime(r.scheduled_at)} · urgenza ${URGENCY_LABELS[r.declared_urgency]} · ${r.contact_name} ${r.contact_phone}${r.preferred_slot ? ` · ${r.preferred_slot}` : ''}`)), requestBadge(r.status)),
      h('p', {}, r.description),
      r.status === 'technician_assigned' ? h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: () => run(() => db.rpc('transition_business_request', { p_request: r.id, p_to: 'in_progress' })) }, 'Inizia lavorazione') : null,
      r.status === 'in_progress' ? h('details', { open: true }, h('summary', {}, 'Rapporto di intervento'), reportForm(r)) : null)) : h('p', { class: 'app-muted' }, 'Nessuna richiesta aziendale assegnata.'),
    h('h3', {}, 'Visite di manutenzione programmata'),
    visits.length ? visits.map((v) => h('article', { class: 'app-int' }, h('header', { class: 'app-int__head' }, h('p', {}, dateTime(v.scheduled_at)), visitBadge(v.status)),
      ['scheduled', 'planned'].includes(v.status) ? h('details', {}, h('summary', {}, 'Registra esito'), visitForm(v)) : null)) : h('p', { class: 'app-muted' }, 'Nessuna visita assegnata.'));
}

