#!/usr/bin/env node
/**
 * Genera reports/esempi/rapporto-intervento-ESEMPIO.pdf con dati FITTIZI e la filigrana
 * "ESEMPIO": serve solo a mostrare l'impaginazione del rapporto (Prompt 5).
 * Uso: node scripts/examples/report-example.mjs
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderReportPdf } from '../../src/lib/report-pdf.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const photo = await fs.readFile(path.join(root, 'tests/fixtures/foto-test.jpg'));
const rep = {
  number: 'RAP-2026-ESEMP1', version: 2, approvedAt: '2026-11-17T16:30:00Z', hash: '9f2c1d7e4b8a0c3f5e6d7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
  company: { name: 'Pronto Intervento Roma', verified: false },
  data: {
    interventionNumber: 'RIC-2026-ESEMPI', date: '2026-11-17', startedAt: '2026-11-17T08:30:00Z', endedAt: '2026-11-17T10:15:00Z', technicianName: 'Tecnico di esempio',
    categoryName: 'Idraulica', serviceName: 'Spurgo fognature', customerName: 'Cliente di esempio', addressLine: 'Via di Esempio 1', city: 'Roma', postalCode: '00100',
    problemDescription: 'ESEMPIO — Fossa biologica piena, scarichi lenti al piano terra.',
    diagnosis: 'ESEMPIO — Fossa satura; nessuna rottura visibile delle tubazioni accessibili.',
    workPerformed: 'ESEMPIO — Aspirazione completa della fossa con autospurgo, lavaggio del pozzetto di ispezione e prova di scarico dei sanitari.',
    materials: [{ name: 'Tubo flessibile (esempio)', quantity: 2, unit: 'm' }],
    timeEntries: [{ kind: 'travel', startedAt: '2026-11-17T08:00:00Z', endedAt: '2026-11-17T08:30:00Z', minutes: 30 }, { kind: 'work', startedAt: '2026-11-17T08:30:00Z', endedAt: '2026-11-17T10:15:00Z', minutes: 105 }],
    unresolvedIssues: 'ESEMPIO — Chiusino del pozzetto incrinato: sostituzione proposta, non autorizzata.',
    recommendations: 'ESEMPIO — Programmare lo spurgo ogni 12 mesi.',
    extraWorks: [{ description: 'Sostituzione del chiusino del pozzetto (esempio)', status: 'proposed' }],
    finalNotes: 'ESEMPIO — Aspirati circa 3 metri cubi.', photos: [], customerAck: { method: 'verbal', name: 'Cliente di esempio', at: '2026-11-17T10:20:00Z' }
  },
  protectedPlan: null, coverage: [{ type: 'intervention', status: 'consumed' }], fiscalRefs: []
};
const pdf = await renderReportPdf(rep, { verifyBaseUrl: 'https://anteprima.example', watermark: 'ESEMPIO', photos: [{ bytes: photo, type: 'jpg', caption: 'Pozzetto dopo il lavaggio (esempio)' }] });
await fs.writeFile(path.join(root, 'reports/esempi/rapporto-intervento-ESEMPIO.pdf'), pdf);
console.log('reports/esempi/rapporto-intervento-ESEMPIO.pdf', pdf.length, 'byte');
