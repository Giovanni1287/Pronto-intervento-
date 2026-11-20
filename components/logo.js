/**
 * Logo originale PRONTO INTERVENTO ROMA.
 * Marchio: "P" tubolare (richiamo a tubazioni e impianti) su badge blu,
 * con il "+" arancione di PRONTO+ come segno di pronto intervento.
 */
export const logoMark = (size = 40, idSuffix = 'h') => `
<svg class="logo-mark" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="lg-${idSuffix}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#006BE6"/>
      <stop offset="1" stop-color="#0A2A4A"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#lg-${idSuffix})"/>
  <path d="M15 36V13h10.5a7.5 7.5 0 0 1 0 15H15" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="36" cy="36" r="9" fill="#FF7824" stroke="#081D30" stroke-width="2.5"/>
  <path d="M36 31.5v9M31.5 36h9" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
</svg>`;

export const logo = ({ href = '/', idSuffix = 'h', variant = 'dark' } = {}) => `
<a class="logo logo--${variant}" href="${href}" aria-label="Pronto Intervento Roma — Home">
  ${logoMark(42, idSuffix)}
  <span class="logo-text">
    <span class="logo-top">PRONTO INTERVENTO</span>
    <span class="logo-bottom">ROMA</span>
  </span>
</a>`;

/** Versione standalone per file .svg (favicon, documenti). */
export const logoSvgFile = () => `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="64" viewBox="0 0 320 64">
  <title>Pronto Intervento Roma</title>
  <g transform="translate(8 8)">
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#006BE6"/><stop offset="1" stop-color="#0A2A4A"/></linearGradient></defs>
    <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#g)"/>
    <path d="M15 36V13h10.5a7.5 7.5 0 0 1 0 15H15" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="36" cy="36" r="9" fill="#FF7824" stroke="#081D30" stroke-width="2.5"/>
    <path d="M36 31.5v9M31.5 36h9" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>
  </g>
  <text x="70" y="30" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="17" font-weight="800" letter-spacing="1.5" fill="#081D30">PRONTO INTERVENTO</text>
  <text x="70" y="51" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif" font-size="17" font-weight="800" letter-spacing="7" fill="#006BE6">ROMA</text>
</svg>`;

export const faviconSvg = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#006BE6"/><stop offset="1" stop-color="#0A2A4A"/></linearGradient></defs><rect x="2" y="2" width="44" height="44" rx="12" fill="url(#g)"/><path d="M15 36V13h10.5a7.5 7.5 0 0 1 0 15H15" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="36" cy="36" r="9" fill="#FF7824" stroke="#081D30" stroke-width="2.5"/><path d="M36 31.5v9M31.5 36h9" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>`;
