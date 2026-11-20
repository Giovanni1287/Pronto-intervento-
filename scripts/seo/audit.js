#!/usr/bin/env node
/**
 * Audit SEO tecnico su una build di produzione SIMULATA come indicizzabile
 * (cartella .seo-audit-build/, mai pubblicata). Scrive reports/seo-audit.md e .json.
 *   npm run seo:audit
 */
import { execFileSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const out = path.join(root, '.seo-audit-build');
let log = '';
try {
  log = execFileSync(process.execPath, [path.join(root, 'scripts/build.js')], {
    env: { ...process.env, SITE_ENV: 'production', BUILD_OUT_DIR: '.seo-audit-build', SEO_SIMULATE_INDEXABLE: 'true' }, stdio: 'pipe'
  }).toString();
} catch (e) { log = String(e.stdout || '') + String(e.stderr || ''); }
const audit = JSON.parse(await fs.readFile(path.join(out, 'seo-audit.json'), 'utf8'));
await fs.mkdir(path.join(root, 'reports'), { recursive: true });
await fs.copyFile(path.join(out, 'seo-audit.md'), path.join(root, 'reports/seo-audit.md'));
await fs.writeFile(path.join(root, 'reports/seo-audit.json'), JSON.stringify(audit, null, 1));
await fs.rm(out, { recursive: true, force: true });
console.log(`Audit SEO (produzione simulata indicizzabile): ${audit.summary.publicPages} pagine pubbliche · ${audit.summary.errors} errori · ${audit.summary.warnings} avvisi`);
for (const p of audit.pages) for (const i of p.issues) if (i.severity !== 'info') console.log(`  ${i.severity === 'error' ? '✖' : '!'} ${p.path} — ${i.message}`);
for (const i of audit.siteIssues) console.log(`  ${i.severity === 'error' ? '✖' : '!'} ${i.message}`);
if (!log.includes('Build completata')) console.log(log.slice(-1500));
process.exit(audit.summary.errors ? 1 : 0);
