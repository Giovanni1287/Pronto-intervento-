#!/usr/bin/env node
/**
 * Anteprima locale di /dist — server statico senza dipendenze.
 * Prompt 8: riproduce il comportamento di Netlify che conta per i test:
 *  - intestazioni di netlify.toml ([[headers]]) e di dist/_headers, con le regole che
 *    combaciano applicate tutte (più CSP = il browser le applica tutte, come in produzione);
 *  - redirect 301/302 di dist/_redirects e di netlify.toml ([[redirects]]);
 *  - pagina 404 con stato 404.
 * Differenze dichiarate: "upgrade-insecure-requests" è tolta in locale (http://localhost);
 * SERVE_CSP_EXTRA (solo test) aggiunge origini simulate a connect-src/img-src.
 */
import http from 'node:http';
import { promises as fs, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = process.env.SERVE_DIR ? path.resolve(process.env.SERVE_DIR) : path.join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 4173;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf'
};

/** Regole di intestazione di netlify.toml (sottoinsieme TOML usato dal progetto). */
export function parseTomlHeaders(text) {
  const rules = [];
  for (const block of text.split(/^\[\[headers\]\]\s*$/m).slice(1)) {
    const body = block.split(/^\[\[(?!headers)|^\[(?!headers)/m)[0];
    const pattern = /^\s*for\s*=\s*"([^"]+)"/m.exec(body)?.[1];
    const values = {};
    const vals = body.split(/^\s*\[headers\.values\]\s*$/m)[1] || '';
    for (const line of vals.split('\n')) {
      const m = /^\s*([A-Za-z0-9-]+)\s*=\s*"((?:[^"\\]|\\.)*)"\s*$/.exec(line);
      if (m) values[m[1]] = m[2].replace(/\\"/g, '"');
    }
    if (pattern) rules.push({ pattern, values });
  }
  return rules;
}
/** Regole di dist/_headers. */
export function parseHeadersFile(text) {
  const rules = []; let cur = null;
  for (const line of text.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (!/^\s/.test(line)) { cur = { pattern: line.trim(), values: {} }; rules.push(cur); continue; }
    const m = /^\s+([A-Za-z0-9-]+):\s*(.*)$/.exec(line);
    if (m && cur) cur.values[m[1]] = m[2].trim();
  }
  return rules;
}
export function parseRedirects(text) {
  return text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
    .map((l) => l.split(/\s+/)).filter((p) => p.length >= 2).map(([from, to, status = '301']) => ({ from, to, status: Number(String(status).replace('!', '')), force: String(status).endsWith('!') }));
}
export function parseTomlRedirects(text) {
  return text.split(/^\[\[redirects\]\]\s*$/m).slice(1).map((b) => ({
    from: /^\s*from\s*=\s*"([^"]+)"/m.exec(b)?.[1], to: /^\s*to\s*=\s*"([^"]+)"/m.exec(b)?.[1], status: Number(/^\s*status\s*=\s*(\d+)/m.exec(b)?.[1] || 301), force: /^\s*force\s*=\s*true/m.test(b)
  })).filter((r) => r.from && r.to);
}
export const matches = (pattern, p) => new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`).test(p)
  || (pattern.endsWith('/*') && p === pattern.slice(0, -2));

/** Intestazioni per un percorso: tutte le regole che combaciano; più valori della stessa intestazione → più righe. */
export function headersFor(p, rules, { local = true, cspExtra = '' } = {}) {
  const out = {};
  for (const r of rules) {
    if (!matches(r.pattern, p)) continue;
    for (const [k, v] of Object.entries(r.values)) {
      let val = v;
      if (/^content-security-policy$/i.test(k)) {
        if (local) val = val.replace(/;\s*upgrade-insecure-requests/, '');
        if (cspExtra) val = val.replace(/(connect-src|img-src) ([^;]*)/g, `$1 $2 ${cspExtra}`);
      }
      const key = k.toLowerCase();
      if (key === 'content-security-policy') (out[key] ||= []).push(val);
      else out[key] = val;
    }
  }
  return out;
}

function loadRules() {
  const toml = existsSync(path.join(ROOT, 'netlify.toml')) ? readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8') : '';
  const hf = existsSync(path.join(DIST, '_headers')) ? readFileSync(path.join(DIST, '_headers'), 'utf8') : '';
  const rf = existsSync(path.join(DIST, '_redirects')) ? readFileSync(path.join(DIST, '_redirects'), 'utf8') : '';
  return { headers: [...parseTomlHeaders(toml), ...parseHeadersFile(hf)], redirects: [...parseRedirects(rf), ...parseTomlRedirects(toml)] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const cspExtra = (process.env.SERVE_CSP_EXTRA || '').trim();
  http.createServer(async (req, res) => {
    const { headers: rules, redirects } = loadRules();
    const url = new URL(req.url, 'http://x');
    const p = decodeURIComponent(url.pathname);
    let file = path.join(DIST, p.endsWith('/') ? `${p}index.html` : p);
    if (!file.startsWith(DIST)) { res.writeHead(403); res.end(); return; }
    // come Netlify: una regola senza "!" non si applica se il percorso corrisponde a un file reale (shadowing)
    const exists = await fs.stat(file).then((s) => s.isFile()).catch(() => false);
    const red = redirects.find((r) => r.status >= 300 && r.status < 400 && r.from === p && (r.force || !exists));
    if (red) { res.writeHead(red.status, { Location: red.to + url.search }); res.end(); return; }
    try {
      if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
      const body = await fs.readFile(file);
      res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'X-Robots-Tag': 'noindex', ...headersFor(p, rules, { cspExtra }) });
      res.end(body);
    } catch {
      const body = await fs.readFile(path.join(DIST, '404.html')).catch(() => 'Not found');
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', ...headersFor('/404.html', rules, { cspExtra }) });
      res.end(body);
    }
  }).listen(PORT, () => console.log(`Anteprima locale: http://localhost:${PORT}`));
}
