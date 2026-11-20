/**
 * Generatore di placeholder fotografici professionali (SVG, pochi KB).
 * Sono CHIARAMENTE marcati come "Immagine da sostituire": non rappresentano
 * lavori reali e vanno sostituiti con foto a licenza commerciale verificata
 * (vedi docs/IMMAGINI.md e src/config/images.config.js).
 *
 * Ogni categoria ha un motivo grafico proprio (tubazioni, circuito, radar,
 * onde, mattoni, esagoni) e un colore d'accento, così le pagine restano
 * riconoscibili anche prima dell'inserimento delle foto.
 */
import { iconPath } from './icons.js';

const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function motifSvg(motif, w, h, accent) {
  const o = 'stroke="#ffffff" stroke-opacity="0.08" fill="none" stroke-width="2"';
  const a = `stroke="${accent}" stroke-opacity="0.35" fill="none" stroke-width="2.5"`;
  switch (motif) {
    case 'pipes': {
      let d = '';
      for (let i = 0; i < 6; i++) {
        const y = h * (0.15 + i * 0.14);
        d += `<path d="M${w * 0.45} ${y} H${w * 0.78} a30 30 0 0 1 30 30 V${y + h * 0.1}" ${i % 2 ? o : a}/>`;
      }
      return d + `<circle cx="${w * 0.82}" cy="${h * 0.5}" r="${h * 0.32}" ${o}/>`;
    }
    case 'circuit': {
      let d = '';
      for (let i = 0; i < 7; i++) {
        const y = h * (0.12 + i * 0.12);
        const x = w * (0.5 + (i % 3) * 0.06);
        d += `<path d="M${x} ${y} H${x + w * 0.18} l40 40 H${w}" ${i % 3 ? o : a}/><circle cx="${x}" cy="${y}" r="6" ${i % 3 ? o : a}/>`;
      }
      return d;
    }
    case 'radar': {
      let d = '';
      for (let i = 1; i < 9; i++) d += `<circle cx="${w * 0.76}" cy="${h * 0.48}" r="${i * h * 0.075}" ${i % 3 ? o : a}/>`;
      return d + `<path d="M${w * 0.76} ${h * 0.48} L${w * 0.76 + h * 0.6} ${h * 0.2}" ${a}/><path d="M${w * 0.5} ${h * 0.48} H${w}" ${o}/><path d="M${w * 0.76} 0 V${h}" ${o}/>`;
    }
    case 'waves': {
      let d = '';
      for (let i = 0; i < 8; i++) {
        const y = h * (0.2 + i * 0.1);
        let p = `M${w * 0.4} ${y}`;
        for (let x = w * 0.4; x < w; x += 120) p += ` q30 -22 60 0 t60 0`;
        d += `<path d="${p}" ${i % 3 ? o : a}/>`;
      }
      return d;
    }
    case 'bricks': {
      let d = '';
      const bw = 140, bh = 56;
      for (let r = 0; r < Math.ceil(h / bh); r++) {
        for (let c = 0; c < 7; c++) {
          const x = w * 0.5 + c * bw - (r % 2 ? bw / 2 : 0);
          d += `<rect x="${x}" y="${r * bh + 6}" width="${bw - 10}" height="${bh - 10}" rx="4" ${(r + c) % 5 ? o : a}/>`;
        }
      }
      return d;
    }
    case 'hex': {
      let d = '';
      const s = 46;
      for (let r = 0; r < Math.ceil(h / (s * 1.5)) + 1; r++) {
        for (let c = 0; c < 9; c++) {
          const cx = w * 0.48 + c * s * 1.75 + (r % 2 ? s * 0.87 : 0);
          const cy = r * s * 1.5;
          const pts = Array.from({ length: 6 }, (_, k) => {
            const ang = (Math.PI / 3) * k + Math.PI / 6;
            return `${(cx + s * Math.cos(ang)).toFixed(1)},${(cy + s * Math.sin(ang)).toFixed(1)}`;
          }).join(' ');
          d += `<polygon points="${pts}" ${(r * 3 + c) % 7 ? o : a}/>`;
        }
      }
      return d;
    }
    default: {
      let d = '';
      for (let i = 0; i < 9; i++) d += `<circle cx="${w * 0.78}" cy="${h * 0.4}" r="${80 + i * 70}" ${o}/>`;
      return d;
    }
  }
}

export function placeholderSvg({ w, h, iconName = 'layers', subject = '', tone = 'blue', minimal = false, accent, motif }) {
  const acc = accent || (tone === 'orange' ? '#FF7824' : '#006BE6');
  if (minimal) {
    // Variante per sfondi coperti da testo (hero): solo texture, l'etichetta è nel badge HTML.
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Immagine segnaposto: ${escXml(subject)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#081D30"/><stop offset="1" stop-color="#0B3A66"/></linearGradient>
    <radialGradient id="glow" cx="0.78" cy="0.42" r="0.55"><stop offset="0" stop-color="${acc}" stop-opacity="0.42"/><stop offset="1" stop-color="${acc}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  ${motifSvg(motif, w, h, acc)}
</svg>`;
  }
  const c1 = tone === 'orange' ? '#2A1A10' : '#081D30';
  const c2 = tone === 'orange' ? '#5A2E12' : '#0B3A66';
  const s = Math.min(w, h);
  const iconSize = Math.round(s * 0.22);
  const cx = w / 2;
  const cy = h / 2 - s * 0.06;
  const font = Math.max(12, Math.round(s * 0.035));
  const g = Math.round(s / 12);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Immagine segnaposto: ${escXml(subject)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.45" r="0.6"><stop offset="0" stop-color="${acc}" stop-opacity="0.35"/><stop offset="1" stop-color="${acc}" stop-opacity="0"/></radialGradient>
    <pattern id="grid" width="${g}" height="${g}" patternUnits="userSpaceOnUse"><path d="M ${g} 0 L 0 0 0 ${g}" fill="none" stroke="#ffffff" stroke-opacity="0.05" stroke-width="1"/></pattern>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#grid)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <circle cx="${cx}" cy="${cy}" r="${iconSize * 0.95}" fill="#ffffff" fill-opacity="0.06" stroke="${acc}" stroke-opacity="0.5"/>
  <g transform="translate(${cx - iconSize / 2} ${cy - iconSize / 2}) scale(${iconSize / 24})" fill="none" stroke="#ffffff" stroke-opacity="0.85" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${iconPath(iconName)}</g>
  <text x="${cx}" y="${cy + iconSize * 1.45}" text-anchor="middle" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="${font}" font-weight="700" letter-spacing="${font * 0.18}" fill="#ffffff" fill-opacity="0.9">IMMAGINE DA SOSTITUIRE</text>
  <text x="${cx}" y="${cy + iconSize * 1.45 + font * 1.6}" text-anchor="middle" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="${Math.round(font * 0.85)}" fill="#ffffff" fill-opacity="0.6">${escXml(subject)}</text>
</svg>`;
}
