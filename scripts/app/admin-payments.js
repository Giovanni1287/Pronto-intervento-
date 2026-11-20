/**
 * DASHBOARD — PAGAMENTI E INCASSI · RICHIEDI PAGAMENTO
 * Distingue: incassi (transazioni verificate), importi al netto dell'IVA,
 * fatturato (documenti fiscali collegati), ricavi ricorrenti contrattualizzati.
 * Un ordine non pagato non è mai un incasso. Ogni scrittura passa dalle
 * funzioni del database (ruolo verificato, audit) o dalla funzione payments-admin.
 */
import { h, fill, euro, date, dateTime, notice, badge, db, fn, table, field } from './core.js';

const ORDER_LABELS = {
  draft: ['Bozza', 'neutral'], awaiting_payment: ['In attesa', 'warn'], partially_paid: ['Parzialmente pagato', 'warn'], paid: ['Pagato', 'ok'],
  partially_refunded: ['Rimborsato in parte', 'info'], refunded: ['Rimborsato', 'neutral'], cancelled: ['Annullato', 'neutral'], expired: ['Scaduto', 'neutral'], needs_review: ['Da verificare', 'error']
};
const KIND = { family_contract: 'PRONTO+ Family', protected_purchase: 'Lavoro Protetto', business_installment: 'Contratto B2B (rata)', service: 'Intervento / servizio' };
const LINE = { family: 'PRONTO+ Family', protected: 'Lavoro Protetto', business: 'Business', hotel: 'Hotel', corporate: 'Corporate', service: 'Interventi e servizi' };
const REFUND = { requested: ['Richiesto', 'warn'], approved: ['Approvato', 'info'], processing: ['In corso', 'info'], completed: ['Eseguito', 'ok'], failed: ['Non riuscito', 'error'], cancelled: ['Annullato', 'neutral'] };
const REC = { matched: ['Corrisponde', 'ok'], amount_mismatch: ['Importo diverso', 'error'], missing_in_system: ['Assente nel sistema', 'error'], missing_in_provider: ['Assente in myPOS', 'warn'], resolved: ['Verificato', 'neutral'] };
const b = (map) => (s) => badge(...(map[s] || [s, 'neutral']));
const toCents = (v) => { const s = String(v).replace(',', '.').trim(); if (!/^-?\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Importo non valido: ${v}`); return Math.round(Number(s) * 100); };
const iso = (d) => d.toISOString().slice(0, 10);
const csvDownload = (name, rows) => {
  const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + rows.map((r) => r.map((x) => `"${String(x ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')], { type: 'text/csv' })), download: name });
  a.click();
};
async function adminFn(body) {
  const r = await fn('payments-admin', { method: 'POST', body });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.message || `Operazione non riuscita (${r.status})`);
  return data;
}

export function paymentsViews({ act, flash, render }) {
  /* ============================================================ PAGAMENTI E INCASSI */
  async function incassi() {
    const now = new Date();
    const from = h('input', { type: 'date', value: iso(new Date(now.getFullYear(), now.getMonth(), 1)), 'aria-label': 'Dal' });
    const to = h('input', { type: 'date', value: iso(now), 'aria-label': 'Al' });
    const fSt = h('select', { 'aria-label': 'Stato ordine' }, h('option', { value: '' }, 'Tutti gli stati'), Object.entries(ORDER_LABELS).map(([k, [l]]) => h('option', { value: k }, l)));
    const fKind = h('select', { 'aria-label': 'Tipo' }, h('option', { value: '' }, 'Tutti i tipi'), Object.entries(KIND).map(([k, l]) => h('option', { value: k }, l)));
    const box = h('div', { class: 'app-stack' });
    const draw = async () => {
      const [rep, orders, refunds, recs] = await Promise.all([
        db.rpc('payments_report', { p_from: from.value, p_to: to.value }),
        db.select(`orders?created_at=gte.${from.value}&created_at=lt.${iso(new Date(new Date(to.value).getTime() + 864e5))}${fSt.value ? `&status=eq.${fSt.value}` : ''}${fKind.value ? `&kind=eq.${fKind.value}` : ''}&select=*,customer:profiles!orders_customer_id_fkey(full_name,email),account:business_accounts(legal_name),tx:payment_transactions(provider,provider_ref,type,method,amount_cents,status,occurred_at),inv:invoice_references(number,document_type,status)&order=created_at.desc&limit=300`),
        db.select('payment_refunds?select=*,order:orders(number,description)&order=created_at.desc&limit=50'),
        db.select('payment_reconciliation?match_status=neq.matched&select=*&order=imported_at.desc&limit=100')
      ]);
      const kpi = [
        ['Incassi registrati (IVA incl.)', euro(rep.collectedGross)], ['Incassi al netto dell’IVA', euro(rep.collectedNet)], ['Rimborsi', euro(rep.refunded)], ['Storni del gateway', euro(rep.reversed)],
        ['Fatturato (documenti fiscali collegati)', euro(rep.invoiced)], ['Da incassare (ordini aperti)', euro(rep.pendingGross)], ['Ordini da verificare', rep.needsReview],
        ['Abbonamenti attivati', Object.values(rep.activations || {}).reduce((n, x) => n + x, 0)], ['Tentativi non riusciti / annullati', `${rep.failedAttempts} / ${rep.cancelledAttempts}`],
        ['Contratti in scadenza (60 gg)', rep.expiring60]
      ];
      const rec = rep.recurringNet || {};
      fill(box,
        notice('info', 'Gli incassi sono solo transazioni verificate (notifica firmata myPOS) o riconciliate con riferimento. Ordini in attesa, annullati o scaduti non sono incassi. Il fatturato deriva dai documenti fiscali emessi dal sistema di fatturazione e collegati agli ordini.'),
        h('div', { class: 'app-kpis' }, kpi.map(([l, v]) => h('div', { class: 'app-kpi' }, h('strong', {}, String(v)), h('span', {}, l)))),
        h('div', { class: 'app-grid' },
          h('section', { class: 'app-card' }, h('h2', {}, 'Incassi per linea'), table([{ label: 'Linea', render: (r) => LINE[r[0]] || r[0] }, { label: 'Lordo', render: (r) => euro(r[1].gross) }, { label: 'Netto IVA', render: (r) => euro(r[1].net) }], Object.entries(rep.byLine || {}), { empty: 'Nessun incasso nel periodo.' })),
          h('section', { class: 'app-card' }, h('h2', {}, 'Ricavi ricorrenti contrattualizzati'), h('p', { class: 'app-muted' }, 'Canoni annui dei contratti attivi oggi, IVA esclusa (non sono incassi).'),
            table([{ label: 'Linea', render: (r) => LINE[r[0]] || r[0] }, { label: 'Annuo netto', render: (r) => euro(r[1]) }], Object.entries(rec)))),
        h('section', { class: 'app-card' }, h('h2', {}, 'Ordini e pagamenti'),
          h('div', { class: 'app-actions' }, act('Esporta CSV del periodo', async () => csvDownload(`incassi-${from.value}-${to.value}.csv`, [
            ['ordine', 'tipo', 'cliente', 'stato', 'netto', 'iva', 'totale', 'incassato', 'rimborsato', 'riferimenti_mypos', 'documenti_fiscali'],
            ...orders.map((o) => [o.number, KIND[o.kind], o.account?.legal_name || o.customer?.full_name || o.snapshot?.customerName, o.status, (o.net_cents / 100).toFixed(2), (o.vat_cents / 100).toFixed(2),
              (o.gross_cents / 100).toFixed(2), (o.paid_cents / 100).toFixed(2), (o.refunded_cents / 100).toFixed(2), o.tx.map((t) => `${t.type}:${t.provider_ref}`).join(' '), o.inv.map((i) => i.number).join(' ')])]))),
          table([
            { label: 'Ordine', render: (o) => h('span', {}, h('strong', {}, o.number), h('br'), h('small', { class: 'app-muted' }, `${KIND[o.kind]} · ${dateTime(o.created_at)}`)) },
            { label: 'Cliente', render: (o) => o.account?.legal_name || o.customer?.full_name || o.snapshot?.customerName || '—' },
            { label: 'Importi', render: (o) => h('span', {}, euro(o.gross_cents), h('br'), h('small', { class: 'app-muted' }, `netto ${euro(o.net_cents)} · incassato ${euro(o.paid_cents)}${o.refunded_cents ? ` · rimborsato ${euro(o.refunded_cents)}` : ''}`)) },
            { label: 'Stato', render: (o) => h('span', {}, b(ORDER_LABELS)(o.status), o.review_reason ? h('small', { class: 'app-muted' }, h('br'), o.review_reason) : null, o.provider_status ? h('small', { class: 'app-muted' }, h('br'), `myPOS: ${o.provider_status}`) : null) },
            { label: 'Transazioni', render: (o) => (o.tx.length ? h('ul', { class: 'app-notes' }, o.tx.map((t) => h('li', {}, `${t.type === 'purchase' ? 'Incasso' : t.type === 'refund' ? 'Rimborso' : 'Storno'} ${euro(t.amount_cents)} · ${t.provider_ref}${t.status !== 'verified' ? ` (${t.status})` : ''}`))) : '—') },
            { label: 'Azioni', render: (o) => orderActions(o) }
          ], orders, { empty: 'Nessun ordine nel periodo.' })),
        h('section', { class: 'app-card' }, h('h2', {}, 'Rimborsi'),
          table([{ label: 'Rimborso', render: (r) => h('span', {}, r.number, h('br'), h('small', { class: 'app-muted' }, r.order?.number)) }, { label: 'Importo', render: (r) => euro(r.amount_cents) },
            { label: 'Motivo', key: 'reason' }, { label: 'Stato', render: (r) => b(REFUND)(r.status) }, { label: 'Riferimento', render: (r) => r.provider_ref || r.failure_reason || '—' },
            { label: '', render: (r) => refundActions(r) }], refunds, { empty: 'Nessun rimborso.' })),
        reconciliationCard(recs, from, to));
    };
    from.onchange = () => draw().catch((e) => flash(e.message, 'error'));
    to.onchange = from.onchange; fSt.onchange = from.onchange; fKind.onchange = from.onchange;
    await draw();
    return h('div', { class: 'app-stack' }, h('div', { class: 'app-card app-inline' }, from, to, fSt, fKind), box);
  }

  function orderActions(o) {
    const out = h('div', { class: 'app-inline' });
    if (['awaiting_payment', 'partially_paid', 'expired', 'needs_review'].includes(o.status)) {
      const amt = h('input', { type: 'text', inputmode: 'decimal', placeholder: `€ (residuo ${((o.gross_cents - o.paid_cents) / 100).toFixed(2)})`, 'aria-label': 'Importo incassato' });
      const m = h('select', { 'aria-label': 'Metodo' }, ['bonifico', 'riba', 'pos', 'contanti', 'mypos_paylink', 'altro'].map((x) => h('option', { value: x }, x)));
      const ref = h('input', { type: 'text', placeholder: 'CRO / riferimento', 'aria-label': 'Riferimento' });
      out.append(h('details', {}, h('summary', {}, 'Registra incasso'), h('div', { class: 'app-inline' }, amt, m, ref, act('Registra', async () => {
        if (!confirm('Confermi di aver verificato l’accredito? L’operazione è tracciata e può attivare il servizio se l’ordine risulta saldato.')) return;
        const r = await db.rpc('register_manual_payment', { p_order: o.id, p_amount: toCents(amt.value || ((o.gross_cents - o.paid_cents) / 100).toFixed(2)), p_method: m.value, p_reference: ref.value.trim(), p_received_on: iso(new Date()), p_note: null });
        flash(`Incasso registrato (${r.outcome}).`); render();
      }, 'btn btn--primary btn--sm'))));
    }
    if (['awaiting_payment', 'expired', 'draft'].includes(o.status) && !o.paid_cents) {
      out.append(act('Annulla', async () => { const why = prompt('Motivo dell’annullamento:'); if (!why) return; await db.rpc('cancel_order', { p_order: o.id, p_reason: why }); flash('Ordine annullato.'); render(); }));
    }
    if (['awaiting_payment', 'expired'].includes(o.status)) out.append(act('Verifica su myPOS', async () => { const r = await adminFn({ action: 'status-check', orderNumber: o.number }); flash(`myPOS: ${r.result?.provider_status || 'n/d'}${r.trusted ? ' (verificato)' : ' (solo informativo)'}`, 'info'); render(); }));
    if (['paid', 'partially_refunded', 'needs_review'].includes(o.status) && o.paid_cents > o.refunded_cents) {
      out.append(act('Prepara rimborso', async () => {
        const v = prompt(`Importo da rimborsare (max ${((o.paid_cents - o.refunded_cents) / 100).toFixed(2)} €):`); if (!v) return;
        const why = prompt('Motivo del rimborso:'); if (!why) return;
        const end = confirm('Il rimborso chiude anche il servizio collegato (recesso)? OK = sì, Annulla = no');
        const mode = o.tx.some((t) => t.provider === 'mypos' && t.type === 'purchase') && confirm('Eseguire il rimborso tramite API myPOS (se abilitata)? Annulla = rimborso manuale dal portale/bonifico');
        await db.rpc('request_refund', { p_order: o.id, p_amount: toCents(v), p_reason: why, p_end_service: end, p_mode: mode ? 'mypos_api' : 'manual' }); flash('Rimborso preparato: va approvato prima dell’esecuzione.'); render();
      }));
    }
    if (['paid', 'partially_refunded', 'refunded'].includes(o.status)) {
      out.append(h('details', {}, h('summary', {}, 'Collega documento fiscale'), (() => {
        const type = h('select', { 'aria-label': 'Tipo documento' }, h('option', { value: 'fattura' }, 'Fattura'), h('option', { value: 'nota_di_credito' }, 'Nota di credito'), h('option', { value: 'altro' }, 'Altro'));
        const num = h('input', { type: 'text', placeholder: 'Numero', 'aria-label': 'Numero documento' });
        const d = h('input', { type: 'date', value: iso(new Date()), 'aria-label': 'Data documento' });
        const amt = h('input', { type: 'text', value: (o.gross_cents / 100).toFixed(2), 'aria-label': 'Importo documento' });
        const sys = h('input', { type: 'text', placeholder: 'Sistema di fatturazione', 'aria-label': 'Sistema' });
        const url = h('input', { type: 'url', placeholder: 'https://… (facoltativo)', 'aria-label': 'Collegamento' });
        return h('div', { class: 'app-inline' }, type, num, d, amt, sys, url, act('Collega', async () => {
          await db.rpc('add_invoice_reference', { p_order: o.id, p_type: type.value, p_number: num.value.trim(), p_date: d.value, p_amount: toCents(amt.value), p_system: sys.value.trim(), p_url: url.value.trim() || null });
          flash('Documento collegato: il cliente riceve la notifica "documento disponibile".'); render();
        }, 'btn btn--primary btn--sm'));
      })()));
    }
    return out;
  }

  function refundActions(r) {
    if (r.status === 'requested') return act('Approva', async () => { if (!confirm(`Approvare il rimborso di ${euro(r.amount_cents)}?`)) return; await db.rpc('approve_refund', { p_refund: r.id }); flash('Rimborso approvato.'); render(); }, 'btn btn--primary btn--sm');
    if (['approved', 'processing'].includes(r.status)) {
      const ref = h('input', { type: 'text', placeholder: 'Riferimento del rimborso', 'aria-label': 'Riferimento rimborso' });
      return h('div', { class: 'app-inline' },
        r.mode === 'mypos_api' ? act('Esegui via myPOS', async () => { await adminFn({ action: 'refund-execute', refundId: r.id }); flash('Rimborso eseguito tramite myPOS.'); render(); }, 'btn btn--primary btn--sm') : null,
        ref, act('Registra esito: eseguito', async () => { await db.rpc('record_refund_result', { p_refund: r.id, p_status: 'completed', p_provider_ref: ref.value.trim(), p_note: 'Registrato da dashboard' }); flash('Rimborso registrato.'); render(); }),
        act('Non riuscito', async () => { const why = prompt('Motivo:'); if (!why) return; await db.rpc('record_refund_result', { p_refund: r.id, p_status: 'failed', p_provider_ref: null, p_note: why }); render(); }));
    }
    return null;
  }

  function reconciliationCard(recs, from, to) {
    const file = h('input', { type: 'file', accept: '.csv,text/csv', 'aria-label': 'Estratto transazioni myPOS (CSV)' });
    const batch = h('input', { type: 'text', value: `MYPOS-${from.value}-${to.value}`, 'aria-label': 'Nome del lotto' });
    return h('section', { class: 'app-card' }, h('h2', {}, 'Riconciliazione con myPOS'),
      h('p', { class: 'app-muted' }, 'Carica l’esportazione CSV delle transazioni dal portale myPOS: ogni riga viene confrontata con le transazioni registrate (riferimento IPC_Trnref e importo). Nessun dato di carta viene importato.'),
      h('div', { class: 'app-inline' }, batch, file, act('Importa e confronta', async () => {
        if (!file.files[0]) throw new Error('Seleziona il file CSV.');
        const r = await adminFn({ action: 'reconcile-import', batch: batch.value.trim(), csv: await file.files[0].text(), from: from.value, to: to.value });
        flash(`Righe: ${r.rows}, corrispondenti: ${r.matched}, da verificare: ${r.issues}.`); render();
      }, 'btn btn--primary btn--sm')),
      table([{ label: 'Lotto', key: 'batch' }, { label: 'Transazione', key: 'provider_ref' }, { label: 'Ordine', render: (x) => x.order_number || '—' }, { label: 'Importo', render: (x) => euro(x.amount_cents) },
        { label: 'Esito', render: (x) => b(REC)(x.match_status) },
        { label: '', render: (x) => (x.match_status !== 'resolved' ? act('Segna verificata', async () => { const note = prompt('Descrivi la verifica effettuata:'); if (!note) return; await db.rpc('resolve_reconciliation', { p_id: x.id, p_note: note }); render(); }) : x.note) }],
      recs, { empty: 'Nessuna differenza aperta.' }));
  }

  /* ============================================================ RICHIEDI PAGAMENTO */
  async function richiedi() {
    const [ints, reqs, quotes, orders] = await Promise.all([
      db.select('interventions?status=in.(completed,verified)&select=id,number,completed_at,customer:profiles!interventions_customer_id_fkey(full_name),service:services(name)&order=completed_at.desc&limit=100'),
      db.select('business_intervention_requests?status=in.(completed,closed)&select=id,number,problem_type,account:business_accounts(legal_name)&order=updated_at.desc&limit=100'),
      db.select('business_quotes?status=in.(approved,sent,accepted)&select=id,number,title,net_cents,account:business_accounts(legal_name)&order=created_at.desc&limit=100'),
      db.select('orders?kind=eq.service&select=id,number,description,status,gross_cents,paid_cents,link_expires_at,created_at,snapshot&order=created_at.desc&limit=100')
    ]);
    const src = h('select', { 'aria-label': 'Origine' },
      h('optgroup', { label: 'Interventi completati' }, ints.map((i) => h('option', { value: `intervention:${i.id}` }, `${i.number} · ${i.service?.name} · ${i.customer?.full_name || ''}`))),
      h('optgroup', { label: 'Richieste aziendali completate' }, reqs.map((r) => h('option', { value: `business_request:${r.id}` }, `${r.number} · ${r.problem_type} · ${r.account?.legal_name || ''}`))),
      h('optgroup', { label: 'Preventivi approvati' }, quotes.map((q) => h('option', { value: `quote:${q.id}` }, `${q.number} · ${q.title} · ${euro(q.net_cents)} + IVA`))));
    const rows = h('tbody');
    const tot = h('p', { class: 'app-kpi' });
    const calc = () => {
      let n = 0; let v = 0;
      rows.querySelectorAll('tr').forEach((tr) => {
        const [q, p, r] = ['qty', 'price', 'vat'].map((k) => tr.querySelector(`[data-k="${k}"]`).value);
        try { const net = Math.round(Number(String(q).replace(',', '.')) * toCents(p || '0')); n += net; v += Math.round((net * Number(r)) / 100); } catch { /* campo incompleto */ }
      });
      fill(tot, h('strong', {}, euro(n + v)), h('span', {}, `Imponibile ${euro(n)} · IVA ${euro(v)} — il totale definitivo è ricalcolato dal server`));
    };
    const addRow = (kind = 'labor', desc = '') => {
      const tr = h('tr', {},
        h('td', {}, h('select', { 'data-k': 'kind', 'aria-label': 'Tipo voce' }, [['labor', 'Manodopera'], ['material', 'Materiali'], ['travel', 'Trasferta'], ['call_fee', 'Diritto di chiamata'], ['service', 'Servizio'], ['discount', 'Sconto'], ['other', 'Altro']].map(([k, l]) => h('option', { value: k, selected: k === kind }, l)))),
        h('td', {}, h('input', { type: 'text', 'data-k': 'desc', value: desc, 'aria-label': 'Descrizione' })),
        h('td', {}, h('input', { type: 'text', inputmode: 'decimal', 'data-k': 'qty', value: '1', 'aria-label': 'Quantità' })),
        h('td', {}, h('input', { type: 'text', inputmode: 'decimal', 'data-k': 'price', placeholder: '€ netto', 'aria-label': 'Prezzo unitario netto' })),
        h('td', {}, h('select', { 'data-k': 'vat', 'aria-label': 'Aliquota IVA' }, [22, 10, 5, 4, 0].map((x) => h('option', { value: x }, `${x}%`)))),
        h('td', {}, h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => { tr.remove(); calc(); } }, 'Rimuovi')));
      tr.addEventListener('input', calc); tr.addEventListener('change', calc);
      rows.append(tr); calc();
    };
    addRow('labor', 'Manodopera'); addRow('material', 'Materiali'); addRow('travel', 'Trasferta');
    const contactEmail = h('input', { type: 'email', 'aria-label': 'Email del cliente (facoltativa)', placeholder: 'Email del cliente (facoltativa)' });
    const days = h('input', { type: 'number', min: 1, max: 60, value: 14, 'aria-label': 'Validità del link (giorni)' });
    const out = h('div');
    const create = async () => {
      const [source, id] = src.value.split(':');
      const items = [...rows.querySelectorAll('tr')].map((tr) => ({ kind: tr.querySelector('[data-k="kind"]').value, description: tr.querySelector('[data-k="desc"]').value.trim(),
        quantity: Number(tr.querySelector('[data-k="qty"]').value.replace(',', '.')), unitNetCents: toCents(tr.querySelector('[data-k="price"]').value || '0'), vatRate: Number(tr.querySelector('[data-k="vat"]').value) }))
        .filter((i) => i.description && i.unitNetCents !== 0);
      const o = await db.rpc('create_service_order', { p_source: source, p_source_id: id, p_items: source === 'quote' && !items.length ? null : items, p_contact: contactEmail.value ? { email: contactEmail.value.trim() } : null });
      const link = await db.rpc('issue_payment_link', { p_order: o.id, p_valid_days: Number(days.value) });
      const url = `${location.origin}/paga/#t=${link.token}`;
      fill(out, h('div', { class: 'app-card' }, h('h3', {}, `Richiesta di pagamento ${o.number} — ${euro(o.gross_cents)}`),
        notice('warn', 'Il collegamento è mostrato una sola volta: nel database resta solo la sua impronta. Copialo ora e condividilo con il cliente.'),
        h('div', { class: 'app-inline' }, h('input', { type: 'text', value: url, readonly: true, 'aria-label': 'Collegamento di pagamento' }),
          h('button', { class: 'btn btn--primary btn--sm', type: 'button', onclick: async () => { await navigator.clipboard.writeText(url); flash('Collegamento copiato.'); } }, 'Copia'),
          h('a', { class: 'btn btn--ghost btn--sm', href: `mailto:${encodeURIComponent(contactEmail.value || '')}?subject=${encodeURIComponent(`Pagamento ${o.number} — Pronto Intervento Roma`)}&body=${encodeURIComponent(`Gentile cliente,\nper il pagamento di ${o.description} può usare il collegamento sicuro:\n${url}\n\nIl pagamento avviene sulla pagina protetta di myPOS.`)}` }, 'Invia per email')),
        h('p', { class: 'app-muted' }, `Valido fino al ${date(link.expires_at)}. Il pagamento avviene sul checkout ospitato ufficiale myPOS; lo stato si aggiorna qui dopo la verifica della transazione.`)));
    };
    return h('div', { class: 'app-stack' },
      notice('info', 'Seleziona un intervento completato o un preventivo approvato, inserisci le voci fatturabili e genera il collegamento di pagamento. Importi e IVA sono ricalcolati dal database; il cliente paga sul checkout sicuro myPOS senza modifiche al sito.'),
      h('section', { class: 'app-card' }, h('h2', {}, 'Nuova richiesta di pagamento'),
        field('Intervento o preventivo', src),
        h('div', { class: 'table-wrap' }, h('table', { class: 'app-table' }, h('thead', {}, h('tr', {}, ['Tipo', 'Descrizione', 'Quantità', 'Prezzo unitario netto (€)', 'IVA', ''].map((x) => h('th', { scope: 'col' }, x)))), rows)),
        h('div', { class: 'app-actions' }, h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onclick: () => addRow('other') }, 'Aggiungi voce')),
        tot, h('div', { class: 'app-form-grid' }, field('Email del cliente', contactEmail, 'Solo per l’invio del collegamento'), field('Validità del collegamento (giorni)', days)),
        act('Crea e genera il collegamento', create, 'btn btn--primary'), out),
      h('section', { class: 'app-card' }, h('h2', {}, 'Richieste di pagamento'),
        table([{ label: 'Ordine', render: (o) => h('span', {}, h('strong', {}, o.number), h('br'), h('small', { class: 'app-muted' }, o.description)) }, { label: 'Totale', render: (o) => euro(o.gross_cents) },
          { label: 'Stato', render: (o) => b(ORDER_LABELS)(o.status) }, { label: 'Scadenza link', render: (o) => date(o.link_expires_at) },
          { label: '', render: (o) => (['draft', 'awaiting_payment', 'expired'].includes(o.status) && !o.paid_cents ? act('Nuovo collegamento', async () => {
            const link = await db.rpc('issue_payment_link', { p_order: o.id, p_valid_days: 14 });
            prompt('Nuovo collegamento (il precedente non è più valido):', `${location.origin}/paga/#t=${link.token}`); render();
          }) : null) }], orders, { empty: 'Nessuna richiesta di pagamento.' })));
  }

  return { pagamenti: incassi, 'richiedi-pagamento': richiedi };
}
