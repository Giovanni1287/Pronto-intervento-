/**
 * Encoder QR Code (ISO/IEC 18004) senza dipendenze.
 * Modalità byte (UTF-8), correzione d'errore M, versioni 1–10 (fino a 213 byte):
 * sufficiente per gli URL di verifica dei certificati.
 * Restituisce una matrice di booleani (true = modulo scuro), senza zona di rispetto.
 */

// [codeword totali, codeword EC per blocco, [[n blocchi, dati per blocco], ...]] — livello M
const VERSIONS = {
  1: [26, 10, [[1, 16]]], 2: [44, 16, [[1, 28]]], 3: [70, 26, [[1, 44]]], 4: [100, 18, [[2, 32]]],
  5: [134, 24, [[2, 43]]], 6: [172, 16, [[4, 27]]], 7: [196, 18, [[4, 31]]], 8: [242, 22, [[2, 38], [2, 39]]],
  9: [292, 22, [[3, 36], [2, 37]]], 10: [346, 26, [[4, 43], [1, 44]]]
};
const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50] };

/* ---------------------------------------------------------------- Reed–Solomon su GF(256) */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
{
  let x = 1;
  for (let i = 0; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 0x100) x ^= 0x11d; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
const gmul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function rsGenerator(degree) {
  let g = [1];
  for (let i = 0; i < degree; i++) {
    const next = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) { next[j] ^= g[j]; next[j + 1] ^= gmul(g[j], EXP[i]); }
    g = next;
  }
  return g;
}
function rsRemainder(data, degree) {
  const gen = rsGenerator(degree);
  const res = new Array(degree).fill(0);
  for (const b of data) {
    const factor = b ^ res.shift();
    res.push(0);
    for (let i = 0; i < degree; i++) res[i] ^= gmul(gen[i + 1], factor);
  }
  return res;
}

/* ---------------------------------------------------------------- dati */
function encodeData(bytes, version) {
  const [total, ecPer, groups] = VERSIONS[version];
  const dataCap = groups.reduce((n, [b, d]) => n + b * d, 0);
  const bits = [];
  const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); };
  put(0b0100, 4);
  put(bytes.length, version < 10 ? 8 : 16);
  for (const b of bytes) put(b, 8);
  put(0, Math.min(4, dataCap * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0xec; data.length < dataCap; pad ^= 0xec ^ 0x11) data.push(pad);

  const blocks = [];
  let k = 0;
  for (const [n, d] of groups) for (let i = 0; i < n; i++) { const blk = data.slice(k, k + d); k += d; blocks.push({ data: blk, ec: rsRemainder(blk, ecPer) }); }
  const out = [];
  const maxD = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.data.length) out.push(b.data[i]);
  for (let i = 0; i < ecPer; i++) for (const b of blocks) out.push(b.ec[i]);
  if (out.length !== total) throw new Error('QR: lunghezza codeword inattesa');
  return out;
}

/* ---------------------------------------------------------------- matrice */
function bch(value, poly, polyLen) {
  let v = value << (polyLen - 1);
  const top = (x) => 31 - Math.clz32(x);
  while (v && top(v) >= polyLen - 1) v ^= poly << (top(v) - (polyLen - 1));
  return v;
}

const MASKS = [
  (r, c) => (r + c) % 2 === 0, (r) => r % 2 === 0, (r, c) => c % 3 === 0, (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0, (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0, (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0
];

function buildBase(version) {
  const size = version * 4 + 17;
  const m = Array.from({ length: size }, () => new Array(size).fill(null));
  const fn = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (r, c, v) => { m[r][c] = v; fn[r][c] = true; };
  const finder = (r0, c0) => {
    for (let r = -1; r <= 7; r++) for (let c = -1; c <= 7; c++) {
      const rr = r0 + r, cc = c0 + c;
      if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
      const on = r >= 0 && r <= 6 && c >= 0 && c <= 6 && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4));
      set(rr, cc, on);
    }
  };
  finder(0, 0); finder(0, size - 7); finder(size - 7, 0);
  for (let i = 8; i < size - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
  const al = ALIGN[version];
  for (const r of al) for (const c of al) {
    if ((r === 6 && c === 6) || (r === 6 && c === al[al.length - 1]) || (r === al[al.length - 1] && c === 6)) continue;
    for (let dr = -2; dr <= 2; dr++) for (let dc = -2; dc <= 2; dc++) set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
  }
  // riserva aree formato e modulo scuro
  for (let i = 0; i < 9; i++) { if (!fn[8][i]) set(8, i, false); if (!fn[i][8]) set(i, 8, false); }
  for (let i = 0; i < 8; i++) { set(8, size - 1 - i, false); set(size - 1 - i, 8, false); }
  set(size - 8, 8, true);
  if (version >= 7) {
    const v = (version << 12) | bch(version, 0x1f25, 13);
    for (let i = 0; i < 18; i++) {
      const bit = ((v >>> i) & 1) === 1;
      const a = Math.floor(i / 3), b = (i % 3) + size - 11;
      set(a, b, bit); set(b, a, bit);
    }
  }
  return { m, fn, size };
}

function placeData(base, codewords) {
  const { m, fn, size } = base;
  const bits = [];
  for (const cw of codewords) for (let i = 7; i >= 0; i--) bits.push((cw >>> i) & 1);
  let k = 0;
  let upward = true;
  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let i = 0; i < size; i++) {
      const r = upward ? size - 1 - i : i;
      for (let dc = 0; dc < 2; dc++) {
        const c = col - dc;
        if (fn[r][c]) continue;
        m[r][c] = k < bits.length ? bits[k] === 1 : false;
        k++;
      }
    }
    upward = !upward;
  }
}

function applyMaskAndFormat(base, mask) {
  const { m, fn, size } = base;
  const out = m.map((row, r) => row.map((v, c) => (fn[r][c] ? v : v !== MASKS[mask](r, c))));
  const data = (0b00 << 3) | mask; // livello M = 00
  const fmt = ((data << 10) | bch(data, 0x537, 11)) ^ 0x5412;
  const bit = (i) => ((fmt >>> i) & 1) === 1;
  // prima copia (attorno al finder in alto a sinistra)
  for (let i = 0; i <= 5; i++) out[i][8] = bit(i);
  out[7][8] = bit(6); out[8][8] = bit(7); out[8][7] = bit(8);
  for (let i = 9; i < 15; i++) out[8][14 - i] = bit(i);
  // seconda copia (finder in alto a destra e in basso a sinistra)
  for (let i = 0; i < 8; i++) out[8][size - 1 - i] = bit(i);
  for (let i = 8; i < 15; i++) out[size - 15 + i][8] = bit(i);
  out[size - 8][8] = true;
  return out;
}

function penalty(mx) {
  const n = mx.length;
  let p = 0;
  const runs = (line) => {
    let s = 0, len = 1;
    for (let i = 1; i <= line.length; i++) {
      if (i < line.length && line[i] === line[i - 1]) len++;
      else { if (len >= 5) s += len - 2; len = 1; }
    }
    return s;
  };
  for (let i = 0; i < n; i++) { p += runs(mx[i]); p += runs(mx.map((r) => r[i])); }
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n - 1; c++) {
    const v = mx[r][c];
    if (v === mx[r][c + 1] && v === mx[r + 1][c] && v === mx[r + 1][c + 1]) p += 3;
  }
  const pat = [true, false, true, true, true, false, true, false, false, false, false];
  const patR = [...pat].reverse();
  const match = (get, len) => { for (let i = 0; i + 11 <= len; i++) { let a = true, b = true; for (let k = 0; k < 11; k++) { const v = get(i + k); if (v !== pat[k]) a = false; if (v !== patR[k]) b = false; } if (a) p += 40; if (b) p += 40; } };
  for (let i = 0; i < n; i++) { match((k) => mx[i][k], n); match((k) => mx[k][i], n); }
  const dark = mx.flat().filter(Boolean).length;
  p += Math.floor(Math.abs((dark * 100) / (n * n) - 50) / 5) * 10;
  return p;
}

export function qrMatrix(text) {
  const bytes = [...new TextEncoder().encode(text)];
  let version = 0;
  for (let v = 1; v <= 10; v++) {
    const cap = VERSIONS[v][2].reduce((n, [b, d]) => n + b * d, 0);
    if (Math.ceil((4 + (v < 10 ? 8 : 16) + bytes.length * 8) / 8) <= cap) { version = v; break; }
  }
  if (!version) throw new Error('Testo troppo lungo per il QR (max versione 10)');
  const base = buildBase(version);
  placeData(base, encodeData(bytes, version));
  let best = null;
  for (let mask = 0; mask < 8; mask++) {
    const mx = applyMaskAndFormat(base, mask);
    const score = penalty(mx);
    if (!best || score < best.score) best = { mx, score, mask };
  }
  return { version, mask: best.mask, size: best.mx.length, modules: best.mx };
}
