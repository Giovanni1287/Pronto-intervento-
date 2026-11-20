/**
 * STRUMENTI DI PRONTO AI — registro tipizzato.
 * Tre classi:
 *  - read:   sola lettura (cataloghi, conoscenza approvata, dati della centrale);
 *  - draft:  bozze e proposte (bozza della richiesta, proposte di assegnazione,
 *            anteprima di preventivo) — nessun effetto reale;
 *  - action: effetti reali SOLO dopo autorizzazione esplicita e controllo del backend.
 *            Nessuno strumento "action" è esposto al modello: le azioni si eseguono
 *            dall'interfaccia (conferma del cliente, coda AZIONI AI DA APPROVARE).
 * Ogni strumento chiama una funzione del database con il token dell'utente (stessi
 * permessi e RLS) o, per i visitatori, con la chiave pubblica. Il modello non può
 * eseguire SQL, codice o richieste HTTP verso destinazioni arbitrarie.
 * NON esistono strumenti per: SQL libero, modificare prezzi o listini, attivare
 * pagamenti, rimborsi, eliminare clienti o documenti, modificare benefici usati o
 * contratti firmati, concedere privilegi amministrativi.
 */
import { classify, SERVICES, CATEGORIES, isService } from './classify.js';
import { stripPersonal } from './redact.js';
import { reportMissingFields } from '../operations.js';

const S = (properties, required = []) => ({ type: 'object', properties, required, additionalProperties: false });
const uuid = { type: 'string', format: 'uuid' };
const dt = { type: 'string', format: 'date-time' };
const date = { type: 'string', format: 'date' };
const shortText = (max) => ({ type: 'string', minLength: 1, maxLength: max });
const MGMT_QUERIES = ['requests_received', 'unassigned', 'top_categories', 'expiring_contracts', 'top_plans_purchased', 'high_cost_interventions', 'receivables',
  'business_quote_requests', 'awaiting_admin_approval'];

export const FORBIDDEN_CAPABILITIES = ['sql_arbitrario', 'modifica_prezzi', 'attiva_pagamenti', 'rimborsi', 'elimina_clienti', 'elimina_documenti',
  'modifica_benefici_usati', 'modifica_contratti_firmati', 'privilegi_admin', 'http_esterno', 'esecuzione_codice'];

export const TOOLS = {
  // ------------------------------------------------------------ Customer Assistant
  classify_problem: {
    kind: 'read', agents: ['customer'],
    description: 'Classifica la descrizione del problema sul catalogo reale dei servizi (categorie e sottocategorie). Restituisce candidati, non certezze.',
    schema: S({ text: shortText(1500) }, ['text']),
    run: async (_ctx, a) => classify(a.text)
  },
  list_services: {
    kind: 'read', agents: ['customer', 'commercial'],
    description: 'Elenca i servizi reali offerti (eventualmente di una categoria) con descrizione breve e pagina del sito.',
    schema: S({ categoryId: { type: 'string', enum: CATEGORIES.map((c) => c.id) } }),
    run: async (_ctx, a) => (a.categoryId ? SERVICES.filter((s) => s.categoryId === a.categoryId) : SERVICES).map(({ terms, ...s }) => s)
  },
  pronto_plus_plans: {
    kind: 'read', agents: ['customer', 'commercial'],
    description: 'Piani PRONTO+ pubblicati (Family, Lavoro Protetto, Business, Hotel) con prezzi, durata, inclusioni ed esclusioni presi dal database. "sellable" indica se la vendita è approvata.',
    schema: S({ line: { type: 'string', enum: ['family', 'protected', 'business', 'hotel'] } }),
    run: async (ctx, a) => ctx.rpc('ai_published_plans', { p_line: a.line ?? null })
  },
  search_knowledge: {
    kind: 'read', agents: ['customer', 'technical', 'dispatch', 'commercial', 'management', 'seo'],
    description: 'Cerca nei documenti aziendali APPROVATI (FAQ, condizioni, procedure). Restituisce estratti con titolo e versione da citare come riferimento.',
    schema: S({ query: shortText(300) }, ['query']),
    run: async (ctx, a) => ctx.rpc('ai_kb_search', { p_query: a.query, p_limit: 4 })
  },
  update_request_draft: {
    kind: 'draft', agents: ['customer'],
    description: 'Aggiorna la bozza della richiesta di intervento (NON la invia). Usa solo categorie e servizi del catalogo. Non inserire nome, telefono o email: il cliente li scrive nel modulo di conferma.',
    schema: S({
      categoryId: { type: ['string', 'null'], enum: [...CATEGORIES.map((c) => c.id), null] },
      serviceId: { type: ['string', 'null'], maxLength: 120 },
      description: { type: 'string', minLength: 10, maxLength: 1500 },
      zone: { type: ['string', 'null'], maxLength: 160 },
      urgency: { type: 'string', enum: ['low', 'normal', 'high'] },
      requestType: { type: 'string', enum: ['intervento', 'preventivo', 'sopralluogo'] },
      missing: { type: 'array', maxItems: 6, items: { type: 'string', maxLength: 60 } }
    }, ['description']),
    run: async (ctx, a) => {
      if (a.categoryId && !isService(a.categoryId, a.serviceId || null)) return { error: 'Categoria o servizio non presenti nel catalogo: usa classify_problem o list_services.' };
      const res = await ctx.service('ai_set_draft', { p_conversation: ctx.conversationId, p_draft: { ...a, categoryId: a.categoryId || null, serviceId: a.serviceId || null }, p_safety: ctx.state.safety });
      ctx.state.draft = res;
      return { saved: true, draft: res.draft, note: 'Bozza aggiornata. Mostra il riepilogo e chiedi al cliente di confermare con il pulsante "Conferma e invia": non dire che la richiesta è registrata.' };
    }
  },
  request_human_help: {
    kind: 'draft', agents: ['customer'],
    description: 'Il cliente vuole parlare con una persona o la situazione richiede un operatore: segnala la conversazione e mostra i contatti.',
    schema: S({ reason: shortText(300) }, ['reason']),
    run: async (ctx) => {
      await ctx.service('ai_set_conversation_status', { p_conversation: ctx.conversationId, p_status: 'escalated' });
      ctx.state.humanHelp = true;
      return { shown: true, note: 'Il pulsante per i contatti diretti è visibile al cliente. Non promettere richiami in tempi precisi.' };
    }
  },

  // ------------------------------------------------------------ Dispatch Assistant
  dispatch_overview: {
    kind: 'read', agents: ['dispatch', 'management'],
    description: 'Richieste da assegnare o programmare con dati mancanti, urgenze da attenzione umana e raggruppamenti per zona e categoria.',
    schema: S({}),
    run: async (ctx) => ctx.rpc('ai_dispatch_overview', {})
  },
  available_slots: {
    kind: 'read', agents: ['dispatch'],
    description: 'Fasce realmente libere dei tecnici (disponibilità meno appuntamenti e assenze) per una richiesta, con controlli di conflitto.',
    schema: S({ interventionId: uuid, from: date, days: { type: 'integer', minimum: 1, maximum: 14 }, durationMinutes: { type: 'integer', minimum: 15, maximum: 600 } }, ['interventionId']),
    run: async (ctx, a) => ctx.rpc('ai_available_slots', { p_intervention: a.interventionId, p_from: a.from ?? null, p_days: a.days ?? 5, p_duration_minutes: a.durationMinutes ?? 120 })
  },
  suggest_technicians: {
    kind: 'read', agents: ['dispatch'],
    description: 'Classifica i tecnici per una fascia oraria con le regole della centrale (specializzazioni, zone, conflitti). Nessuna assegnazione.',
    schema: S({ interventionId: uuid, startsAt: dt, endsAt: dt }, ['interventionId', 'startsAt', 'endsAt']),
    run: async (ctx, a) => ctx.rpc('suggest_technicians', { p_kind: 'intervention', p_target: a.interventionId, p_start: a.startsAt, p_end: a.endsAt })
  },
  check_assignment: {
    kind: 'read', agents: ['dispatch'],
    description: 'Verifica conflitti, assenze, disponibilità e qualifiche per tecnico e fascia.',
    schema: S({ interventionId: uuid, technicianId: uuid, startsAt: dt, endsAt: dt }, ['interventionId', 'technicianId', 'startsAt', 'endsAt']),
    run: async (ctx, a) => ctx.rpc('check_assignment', { p_kind: 'intervention', p_target: a.interventionId, p_technician: a.technicianId, p_start: a.startsAt, p_end: a.endsAt, p_exclude_assignment: null })
  },
  request_detail: {
    kind: 'read', agents: ['dispatch'],
    description: 'Dettaglio operativo di una richiesta (senza recapiti del cliente).',
    schema: S({ interventionId: uuid }, ['interventionId']),
    run: async (ctx, a) => {
      const d = await ctx.rpc('intervention_detail', { p_id: a.interventionId });
      const i = d?.intervention || d || {};
      return { number: i.number, status: i.op_status, categoryId: i.category_id, serviceId: i.service_id, city: i.city, urgency: i.declared_urgency, priority: i.priority,
        description: i.description, scheduledAt: i.scheduled_at, technicianId: i.technician_id, covered: Boolean(i.contract_id), intake: i.intake };
    }
  },
  propose_assignment: {
    kind: 'draft', agents: ['dispatch'],
    description: 'Mette in coda una PROPOSTA di assegnazione (tecnico + fascia) da far approvare a Giovanni o a un operatore autorizzato. Non assegna nulla.',
    schema: S({ interventionId: uuid, technicianId: uuid, startsAt: dt, endsAt: dt, rationale: { type: 'string', minLength: 10, maxLength: 1000 },
      dataUsed: { type: 'array', maxItems: 10, items: { type: 'string', maxLength: 80 } }, missing: { type: 'array', maxItems: 10, items: { type: 'string', maxLength: 80 } } },
      ['interventionId', 'technicianId', 'startsAt', 'endsAt', 'rationale']),
    run: async (ctx, a) => {
      const r = await ctx.rpc('ai_propose_action', { p_action: 'assign_technician', p_target: a.interventionId,
        p_payload: { technicianId: a.technicianId, startsAt: a.startsAt, endsAt: a.endsAt }, p_rationale: a.rationale, p_data_used: a.dataUsed || [], p_missing: a.missing || [],
        p_agent: ctx.agent, p_conversation: ctx.conversationId, p_ttl_minutes: 240 });
      ctx.state.proposals.push(r);
      return { ...r, note: 'Proposta in coda: serve l’approvazione di una persona autorizzata.' };
    }
  },
  propose_appointment: {
    kind: 'draft', agents: ['dispatch'],
    description: 'Mette in coda una PROPOSTA di programmazione (data e fascia) senza tecnico, da approvare.',
    schema: S({ interventionId: uuid, startsAt: dt, endsAt: dt, rationale: { type: 'string', minLength: 10, maxLength: 1000 } }, ['interventionId', 'startsAt', 'endsAt', 'rationale']),
    run: async (ctx, a) => {
      const r = await ctx.rpc('ai_propose_action', { p_action: 'confirm_appointment', p_target: a.interventionId, p_payload: { startsAt: a.startsAt, endsAt: a.endsAt },
        p_rationale: a.rationale, p_data_used: [], p_missing: [], p_agent: ctx.agent, p_conversation: ctx.conversationId, p_ttl_minutes: 240 });
      ctx.state.proposals.push(r);
      return r;
    }
  },

  // ------------------------------------------------------------ Technical Assistant
  my_jobs: {
    kind: 'read', agents: ['technical'],
    description: 'Lavori assegnati al tecnico (senza recapiti del cliente).',
    schema: S({}),
    run: async (ctx) => (await ctx.rpc('my_jobs', {})).map((j) => ({ id: j.id, number: j.number, status: j.status, statusLabel: j.statusLabel, category: j.category, service: j.service,
      city: j.city, scheduledAt: j.scheduledAt, description: j.description }))
  },
  job_detail: {
    kind: 'read', agents: ['technical'],
    description: 'Scheda del lavoro assegnato: descrizione, note per il tecnico, ore, materiali, lavori extra e stato del rapporto (senza recapiti).',
    schema: S({ interventionId: uuid }, ['interventionId']),
    run: async (ctx, a) => {
      const j = await ctx.rpc('my_job', { p_id: a.interventionId });
      return { number: j.number, status: j.status, statusLabel: j.statusLabel, category: j.category, service: j.service, description: j.description,
        notes: j.notes, materials: j.materials, time: j.time, extraWorks: j.extraWorks, editable: j.editable,
        report: j.report && { status: j.report.status, format: j.report.format, work_description: j.report.work_description, diagnosis: j.report.diagnosis,
          started_at: j.report.started_at, ended_at: j.report.ended_at, recommendations: j.report.recommendations } };
    }
  },
  report_missing_fields: {
    kind: 'read', agents: ['technical'],
    description: 'Campi mancanti del rapporto di intervento secondo le regole della centrale.',
    schema: S({ interventionId: uuid }, ['interventionId']),
    run: async (ctx, a) => {
      const j = await ctx.rpc('my_job', { p_id: a.interventionId });
      return { missing: reportMissingFields(j.report, { categoryId: j.category || null, serviceId: j.service || null, addressLine: j.addressLine || null }) };
    }
  },

  // ------------------------------------------------------------ Commercial Assistant
  quote_preview: {
    kind: 'draft', agents: ['commercial'],
    description: 'Anteprima di preventivo calcolata dal DATABASE con listini pubblicati e tariffe approvate. Nessuno sconto o prezzo libero. Non crea né invia preventivi.',
    schema: S({ items: { type: 'array', minItems: 1, maxItems: 20, items: S({
      type: { type: 'string', enum: ['plan', 'rate'] }, planId: { type: 'string', maxLength: 80 }, rate: { type: 'string', enum: ['hourly_labor', 'call_fee'] },
      quantity: { type: 'number', minimum: 0.25, maximum: 1000 } }, ['type']) } }, ['items']),
    run: async (ctx, a) => ctx.rpc('ai_quote_preview', { p_items: a.items })
  },
  margin_estimate: {
    kind: 'read', agents: ['commercial'],
    description: 'Margine stimato di un contratto B2B con la funzione deterministica del backend (importi in centesimi, IVA esclusa).',
    schema: S({ priceNetCents: { type: 'integer', minimum: 0, maximum: 100000000 }, benefits: S({ maintenanceMinutes: { type: 'integer', minimum: 0, maximum: 100000 },
      smallIntervention: { type: 'integer', minimum: 0, maximum: 500 }, smallInterventionMaxMinutes: { type: 'integer', minimum: 0, maximum: 600 },
      callFee: { type: 'integer', minimum: 0, maximum: 500 }, scheduledVisits: { type: 'integer', minimum: 0, maximum: 500 } }),
      laborCents: { type: 'integer', minimum: 0, maximum: 1000000 }, travelCents: { type: 'integer', minimum: 0, maximum: 1000000 }, otherCents: { type: 'integer', minimum: 0, maximum: 100000000 } },
      ['priceNetCents']),
    run: async (ctx, a) => ctx.rpc('ai_margin_estimate', { p_price_net_cents: a.priceNetCents, p_benefits: a.benefits || {}, p_labor_cents: a.laborCents ?? 0,
      p_travel_cents: a.travelCents ?? 0, p_other_cents: a.otherCents ?? 0 })
  },
  contract_expirations: {
    kind: 'read', agents: ['commercial', 'management'],
    description: 'Contratti Family, Lavoro Protetto e Business in scadenza con prestazioni residue.',
    schema: S({ days: { type: 'integer', minimum: 1, maximum: 365 } }),
    run: async (ctx, a) => ctx.rpc('ai_contract_expirations', { p_days: a.days ?? 30 })
  },
  propose_quote_publication: {
    kind: 'draft', agents: ['commercial'],
    description: 'Propone l’invio al cliente di un preventivo B2B GIÀ approvato da un amministratore. L’invio avviene solo dopo una seconda approvazione.',
    schema: S({ quoteId: uuid, rationale: { type: 'string', minLength: 10, maxLength: 1000 } }, ['quoteId', 'rationale']),
    run: async (ctx, a) => {
      const r = await ctx.rpc('ai_propose_action', { p_action: 'publish_approved_quote', p_target: a.quoteId, p_payload: {}, p_rationale: a.rationale, p_data_used: ['business_quotes'],
        p_missing: [], p_agent: ctx.agent, p_conversation: ctx.conversationId, p_ttl_minutes: 1440 });
      ctx.state.proposals.push(r);
      return r;
    }
  },

  // ------------------------------------------------------------ Management Assistant
  business_query: {
    kind: 'read', agents: ['management', 'commercial'],
    description: 'Interroga i dati aziendali SOLO tramite il catalogo di query autorizzate. Ogni risposta indica periodo, fonti, dati mancanti e aggiornamento.',
    schema: S({ query: { type: 'string', enum: MGMT_QUERIES }, from: date, to: date }, ['query']),
    run: async (ctx, a) => ctx.rpc('ai_management_query', { p_query: a.query, p_from: a.from ?? null, p_to: a.to ?? null })
  },
  pending_ai_actions: {
    kind: 'read', agents: ['management', 'dispatch'],
    description: 'Proposte di PRONTO AI in attesa di approvazione e loro esito.',
    schema: S({}),
    run: async (ctx) => (await ctx.rpc('ai_pending_actions', {})).map(({ payload, result, ...x }) => x)
  }
,
  // ------------------------------------------------------------ PRONTO SEO Agent (Prompt 7)
  seo_overview: {
    kind: 'read', agents: ['seo'],
    description: 'Panoramica Search Console della proprietà (clic, impressioni, CTR, posizione media ponderata) con periodo precedente, brand/non brand se disponibile, lead organici. Indica periodo, fonte e ultimo giorno disponibile.',
    schema: S({ from: date, to: date }),
    run: async (ctx, a) => { const o = await ctx.rpc('seo_overview', { p_property: null, p_from: a.from ?? null, p_to: a.to ?? null }); delete o.trend; return o; }
  },
  seo_low_ctr_pages: {
    kind: 'read', agents: ['seo'],
    description: 'Pagine con molte impressioni e CTR inferiore al 60% della media del sito nel periodo.',
    schema: S({ from: date, to: date }),
    run: async (ctx, a) => ctx.rpc('seo_low_ctr_pages', { p_property: null, p_from: a.from ?? null, p_to: a.to ?? null })
  },
  seo_declining_pages: {
    kind: 'read', agents: ['seo'],
    description: 'Pagine con calo dei clic oltre la soglia configurata rispetto al periodo precedente (non implica penalizzazioni).',
    schema: S({ from: date, to: date }),
    run: async (ctx, a) => ctx.rpc('seo_declining_pages', { p_property: null, p_from: a.from ?? null, p_to: a.to ?? null })
  },
  seo_queries: {
    kind: 'read', agents: ['seo'],
    description: 'Ricerche principali con clic, impressioni, CTR, posizione e confronto con il periodo precedente.',
    schema: S({ from: date, to: date, limit: { type: 'integer', minimum: 1, maximum: 100 } }),
    run: async (ctx, a) => { const r = await ctx.rpc('seo_queries_report', { p_property: null, p_from: a.from ?? null, p_to: a.to ?? null, p_limit: a.limit ?? 40 }); return r; }
  },
  seo_page_details: {
    kind: 'read', agents: ['seo'],
    description: 'Scheda di una pagina: metadati attuali, scheda editoriale (keyword proposta, intento), problemi tecnici aperti, stato di indicizzazione noto, prestazioni nel periodo.',
    schema: S({ path: { type: 'string', pattern: '^/[a-z0-9/-]*$', maxLength: 200 } }, ['path']),
    run: async (ctx, a) => {
      const r = await ctx.rpc('seo_pages_report', { p_property: null, p_from: null, p_to: null });
      const p = (r.rows || []).find((x) => x.path === a.path);
      return p ? { period: r.period, dataUntil: r.dataUntil, page: p } : { error: 'Pagina non presente nell’ultimo audit' };
    }
  },
  seo_technical_issues: {
    kind: 'read', agents: ['seo'],
    description: 'Problemi tecnici aperti (dall’audit della build e dai controlli del sito pubblicato) e pagine con pochi collegamenti interni.',
    schema: S({}),
    run: async (ctx) => {
      const r = await ctx.rpc('seo_pages_report', { p_property: null, p_from: null, p_to: null });
      const audit = ctx.loadAudit ? await ctx.loadAudit() : null;
      return {
        issues: (r.rows || []).flatMap((p) => p.issues.map((i) => ({ path: p.path, ...i }))).slice(0, 60),
        indexing: (r.rows || []).filter((p) => p.index?.verdict && p.index.verdict !== 'PASS').map((p) => ({ path: p.path, ...p.index })),
        weakInternalLinks: audit ? audit.pages.filter((p) => p.indexable && (p.inbound ?? 0) < 3).map((p) => ({ path: p.path, inbound: p.inbound })) : 'audit della build non disponibile'
      };
    }
  },
  seo_conversions: {
    kind: 'read', agents: ['seo', 'management'],
    description: 'Imbuto delle conversioni per landing e canale: clic (non chiamate), richieste, lead qualificati, preventivi accettati, clienti, pagamenti collegati.',
    schema: S({ from: date, to: date }),
    run: async (ctx, a) => ctx.rpc('seo_conversion_funnel', { p_from: a.from ?? null, p_to: a.to ?? null })
  },
  seo_propose_change: {
    kind: 'draft', agents: ['seo'],
    description: 'Registra una PROPOSTA (titolo, descrizione, contenuto, collegamenti interni, indicizzazione, nuovo argomento, esperimento di conversione) con motivazione e dati di riferimento. Non modifica il sito: serve l’approvazione dell’amministratore.',
    schema: S({ kind: { type: 'string', enum: ['title', 'description', 'content', 'internal_link', 'indexing', 'new_topic', 'conversion_experiment', 'technical'] },
      path: { type: ['string', 'null'], maxLength: 200 }, currentValue: { type: ['string', 'null'], maxLength: 4000 }, proposedValue: { type: ['string', 'null'], maxLength: 4000 },
      rationale: { type: 'string', minLength: 10, maxLength: 2000 },
      evidence: S({ period: { type: 'string', maxLength: 60 }, source: { type: 'string', maxLength: 120 }, metrics: { type: 'object' } }) }, ['kind', 'rationale']),
    run: async (ctx, a) => ctx.rpc('seo_create_recommendation', { p_kind: a.kind, p_path: a.path ?? null, p_current: a.currentValue ?? null, p_proposed: a.proposedValue ?? null,
      p_rationale: a.rationale, p_evidence: a.evidence || {}, p_source: 'ai', p_property: null })
  },
  seo_create_content_draft: {
    kind: 'draft', agents: ['seo'],
    description: 'Salva una BOZZA di contenuto originale (guida o aggiornamento di landing) da far revisionare: non viene pubblicata.',
    schema: S({ kind: { type: 'string', enum: ['guide', 'landing_update'] }, slug: { type: 'string', pattern: '^[a-z0-9-]{3,80}$' }, title: { type: 'string', minLength: 5, maxLength: 200 },
      summary: { type: 'string', maxLength: 400 },
      sections: { type: 'array', minItems: 1, maxItems: 12, items: S({ h: { type: 'string', maxLength: 160 }, p: { type: 'array', maxItems: 6, items: { type: 'string', maxLength: 1500 } } }, ['h', 'p']) },
      toVerify: { type: 'array', maxItems: 10, items: { type: 'string', maxLength: 200 } } }, ['kind', 'slug', 'title', 'sections']),
    run: async (ctx, a) => ctx.rpc('seo_save_draft', { p_id: null, p_kind: a.kind, p_slug: a.slug, p_title: a.title,
      p_body: { summary: a.summary || '', sections: a.sections, toVerify: a.toVerify || [], note: 'Bozza generata dall’AI: da verificare da un revisore prima della pubblicazione.' }, p_author_kind: 'ai' })
  },
  seo_weekly_report: {
    kind: 'draft', agents: ['seo'],
    description: 'Prepara (o aggiorna) il report settimanale con i dati salvati e restituisce il riepilogo.',
    schema: S({}),
    run: async (ctx) => {
      const r = await ctx.rpc('seo_build_report', { p_kind: 'weekly', p_from: null, p_to: null, p_property: null });
      return { ...r, overview: await ctx.rpc('seo_overview', { p_property: null, p_from: r.from, p_to: r.to }) };
    }
  }
};

export function toolsFor(agent) {
  return Object.entries(TOOLS).filter(([, t]) => t.agents.includes(agent)).map(([name, t]) => ({ name, ...t }));
}

/** Risultato per il modello: senza dati personali superflui e di dimensione limitata. */
export function toolOutput(value, max = 12000) {
  const s = JSON.stringify(stripPersonal(value) ?? null);
  return s.length > max ? `${s.slice(0, max)}…(troncato)` : s;
}
