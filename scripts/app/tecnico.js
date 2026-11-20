/**
 * AREA TECNICO — /area-tecnico/
 * Il tecnico vede solo gli interventi e i controlli assegnati e ancora aperti (RLS).
 * Registra lavorazioni, materiali, note e fotografie autorizzate dal cliente.
 */
import { h, clear, fill, date, dateTime, notice, statusBadge, boot, db, auth, table, field } from './core.js';
import { b2bSection } from './tecnico-b2b.js';

const root = document.getElementById('app');

async function view({ user, restart }) {
  const [ints, checks] = await Promise.all([
    db.select('interventions?select=id,number,status,scheduled_at,customer_id,customer:profiles(full_name,phone),property:properties(address_line,city),service:services(name),report:intervention_reports(work_description)&order=scheduled_at'),
    db.select('scheduled_checks?select=id,scheduled_at,status&order=scheduled_at')
  ]);
  const form = (i) => {
    const desc = h('textarea', { rows: 4, required: true, minlength: 10 });
    const mats = h('textarea', { rows: 3, placeholder: 'Un materiale per riga, es. Guarnizione 40 mm x 1' });
    const notes = h('textarea', { rows: 2 });
    const mins = h('input', { type: 'number', min: 1, required: true });
    const photos = h('input', { type: 'file', accept: 'image/jpeg,image/png', multiple: true });
    const consent = h('input', { type: 'checkbox', id: `consent-${i.id}` });
    const st = h('div', { role: 'status' });
    return h('form', { class: 'app-subform', onsubmit: async (e) => {
      e.preventDefault();
      try {
        const materials = mats.value.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const m = l.match(/^(.*?)\s+x\s*(\d+)$/i); return m ? { name: m[1], qty: Number(m[2]) } : { name: l }; });
        await db.rpc('submit_intervention_report', { p_intervention: i.id, p_description: desc.value.trim(), p_materials: materials, p_notes: notes.value.trim() || null, p_minutes: Number(mins.value) });
        for (const file of photos.files) {
          const path = `${i.id}/${Date.now()}-${file.name.replace(/[^\w.-]+/g, '_')}`;
          await db.upload('interventi', path, file);
          await db.insert('documents', { intervention_id: i.id, customer_id: i.customer_id, kind: 'photo', storage_path: path, photo_consent: consent.checked, uploaded_by: user.id });
        }
        fill(st, notice('ok', 'Intervento registrato come completato. L’amministratore verificherà i dati prima del certificato.'));
        setTimeout(restart, 1500);
      } catch (err) { fill(st, notice('error', err.message)); }
    } },
      field('Descrizione delle lavorazioni', desc), field('Materiali utilizzati', mats), field('Note tecniche', notes), field('Durata (minuti)', mins),
      field('Fotografie', photos, 'Solo foto pertinenti al lavoro; evitare volti e dati personali.'),
      h('div', { class: 'field field--check' }, consent, h('label', { for: `consent-${i.id}` }, 'Il cliente ha autorizzato l’uso delle fotografie nel certificato.')),
      h('button', { class: 'btn btn--primary', type: 'submit' }, 'Registra come completato'), st);
  };
  fill(root, 
    notice('info', h('span', {}, 'È disponibile la nuova area tecnico per smartphone con ore, materiali, foto e rapporto completo: ', h('a', { href: '/tecnico/' }, 'apri /tecnico/'), '.')),
    h('div', { class: 'app-head' }, h('div', {}, h('p', { class: 'eyebrow' }, 'Area tecnico'), h('h1', { class: 'section-title' }, 'Attività assegnate')),
      h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: async () => { await auth.signOut(); restart(); } }, 'Esci')),
    ints.length ? ints.map((i) => h('article', { class: 'app-card app-int' },
      h('header', { class: 'app-int__head' }, h('div', {}, h('p', { class: 'app-int__num' }, i.number), h('h2', {}, i.service?.name),
        h('p', { class: 'app-muted' }, `${dateTime(i.scheduled_at)} · ${i.property?.address_line}, ${i.property?.city} · ${i.customer?.full_name || ''} ${i.customer?.phone || ''}`)), statusBadge(i.status)),
      ['scheduled', 'in_progress', 'completed'].includes(i.status) ? h('details', { open: i.status !== 'completed' }, h('summary', {}, i.status === 'completed' ? 'Modifica rapporto (fino alla verifica)' : 'Registra intervento'), form(i)) : null))
      : h('div', { class: 'app-card' }, h('p', {}, 'Nessun intervento assegnato al momento.')),
    h('section', { class: 'app-card' }, h('h2', {}, 'Controlli preventivi assegnati'),
      table([{ label: 'Data', render: (c) => dateTime(c.scheduled_at) }, { label: 'Stato', render: (c) => statusBadge(c.status) },
        { label: '', render: (c) => { const rep = h('input', { type: 'text', 'aria-label': 'Esito del controllo', placeholder: 'Esito del controllo' }); return h('div', { class: 'app-inline' }, rep, h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: async () => { await db.rpc('complete_check', { p_check: c.id, p_report: rep.value.trim() }); restart(); } }, 'Segna eseguito')); } }], checks)),
    await b2bSection(restart).catch((err) => notice('error', `Sezione aziendale non disponibile: ${err.message}`)));
}

if (root) boot(root, { title: 'Area tecnico', requireRole: ['technician', 'admin'], render: view });
