#!/usr/bin/env node
/**
 * npm run seo:apply — porta nel repository SOLO le modifiche a title/description
 * APPROVATE nella dashboard PRONTO SEO (seo_recommendations con stato "approved").
 * Scrive src/data/seo/meta-overrides.js; poi: build, verifica dell'audit, commit e
 * pubblicazione restano passaggi manuali. Dopo la pubblicazione, segnare la proposta
 * come "applicata" nella dashboard.
 *
 * Variabili: SUPABASE_URL (o PUBLIC_SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY — solo in locale,
 * mai nel codice client. Opzioni: --dry-run (mostra senza scrivere), --from-file=<json> (test).
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TARGET = path.join(ROOT, 'src/data/seo/meta-overrides.js');
const LIMITS = { title: [20, 65], description: [70, 160] };

export function mergeOverrides(current, changes) {
  const out = structuredClone(current); const skipped = [];
  for (const c of changes) {
    const v = String(c.value || '').replace(/\s+/g, ' ').trim();
    const [min, max] = LIMITS[c.kind] || [0, 0];
    if (!/^\/[a-z0-9\-/]*\/$/.test(c.path || '')) { skipped.push([c.number, 'percorso non valido']); continue; }
    if (!LIMITS[c.kind]) { skipped.push([c.number, 'tipo non gestito']); continue; }
    if (v.length < min || v.length > max) { skipped.push([c.number, `${c.kind} di ${v.length} caratteri (consentiti ${min}–${max})`]); continue; }
    if (/<|>/.test(v)) { skipped.push([c.number, 'contiene markup']); continue; }
    out[c.path] = { ...(out[c.path] || {}), [c.kind]: v, source: `seo_recommendation:${c.number}`, approvedBy: c.approvedBy || 'non indicato', approvedAt: String(c.approvedAt || '').slice(0, 10) };
  }
  return { overrides: out, skipped };
}

export function renderFile(overrides) {
  const head = (/^\/\*\*[\s\S]*?\*\//.exec(HEADER) || [''])[0];
  return `${head}\nexport const overrides = ${JSON.stringify(overrides, null, 2).replace(/"([a-zA-Z]+)":/g, '$1:')};\n`;
}
const HEADER = `/**
 * Modifiche APPROVATE a titoli e descrizioni (PRONTO SEO, Prompt 7).
 * Chiave: percorso della pagina. Ogni voce indica chi l'ha approvata e da dove viene.
 * Aggiornare con \`npm run seo:apply\` (scarica solo le proposte approvate dal database)
 * oppure a mano, registrando l'approvazione nella dashboard.
 */`;

async function fetchApproved(env) {
  const url = env.SUPABASE_URL || env.PUBLIC_SUPABASE_URL; const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY non impostate: nessuna modifica scaricata.');
  const r = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/seo_approved_meta_changes`, { method: 'POST', headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: '{}' });
  if (!r.ok) throw new Error(`Lettura non riuscita (${r.status})`);
  return r.json();
}

async function main() {
  const args = process.argv.slice(2);
  const fromFile = args.find((a) => a.startsWith('--from-file='))?.split('=')[1];
  const changes = fromFile ? JSON.parse(await readFile(fromFile, 'utf8')) : await fetchApproved(process.env);
  const { overrides: current } = await import(`${pathToFileURL(TARGET).href}?t=${Date.now()}`);
  const { overrides, skipped } = mergeOverrides(current, changes);
  console.log(`Modifiche approvate lette: ${changes.length}; scartate: ${skipped.length}`);
  skipped.forEach(([n, why]) => console.log(`  - ${n}: ${why}`));
  if (args.includes('--dry-run')) { console.log(renderFile(overrides)); return; }
  await writeFile(TARGET, renderFile(overrides));
  console.log(`Scritto ${path.relative(ROOT, TARGET)}. Ora: npm run seo:audit, verifica, commit e pubblicazione; poi segna le proposte come applicate.`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((e) => { console.error(e.message); process.exit(1); });
