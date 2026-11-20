/**
 * Set di icone vettoriali originali (stroke 1.75, griglia 24×24).
 * Uso: icon('wrench', { size: 24, label: 'Idraulica' })
 */
const paths = {
  wrench:
    '<path d="M14.7 6.3a4 4 0 0 0-5.3 5.3l-5.7 5.7a1.8 1.8 0 0 0 2.6 2.6l5.7-5.7a4 4 0 0 0 5.3-5.3l-2.4 2.4-2.3-.4-.4-2.3 2.5-2.3z"/>',
  bolt: '<path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12l1-8z"/>',
  radar:
    '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><path d="M12 12 18.4 5.6"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
  flood:
    '<path d="M3 15c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2"/><path d="M3 19.5c1.5 0 1.5-1.2 3-1.2s1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2 1.5-1.2 3-1.2 1.5 1.2 3 1.2"/><path d="M5 11V6.5L12 3l7 3.5V11"/>',
  brick:
    '<rect x="3" y="4.5" width="18" height="15" rx="1.5"/><path d="M3 9.5h18M3 14.5h18M9 4.5v5M15 9.5v5M9 14.5v5"/>',
  shield:
    '<path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3z"/><path d="m8.8 12 2.2 2.2 4.4-4.4"/>',
  drop: '<path d="M12 3.2s-6 6.6-6 11a6 6 0 0 0 12 0c0-4.4-6-11-6-11z"/>',
  pipe: '<path d="M3 8h8a3 3 0 0 1 3 3v10M3 12h6a1 1 0 0 1 1 1v8M14 21h-4"/><path d="M3 6v8"/>',
  phone:
    '<path d="M5 3.5h3.2l1.6 4-2 1.3a11 11 0 0 0 5.4 5.4l1.3-2 4 1.6V17a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 3 5.7 2 2 0 0 1 5 3.5z"/>',
  whatsapp:
    '<path d="M4 20l1.2-3.6A8 8 0 1 1 8 19.2L4 20z"/><path d="M9 8.6c0 3 2.4 5.6 5.5 6.2l1-1.3-1.8-1-.9.8a4.4 4.4 0 0 1-2.4-2.4l.8-.9-1-1.8-1.2 1z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  check: '<path d="m5 12.5 4.2 4.2L19 7"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  thermo:
    '<path d="M10 4a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0V4z"/><path d="M12 9v7"/>',
  ear: '<path d="M7 9a5 5 0 0 1 10 0c0 3-3 3.5-3 6.5a3 3 0 0 1-5.5 1.6"/><path d="M10 9.5a2 2 0 0 1 4 0"/>',
  gas: '<path d="M8 21h8M10 21V9h4v12M9 9h6l-1-5h-4l-1 5z"/><path d="M17 12c1.5.5 2.5 1.6 2.5 3"/><path d="M18 9c2 .7 3.5 2.4 3.5 4.5"/>',
  gauge: '<path d="M4.5 17a8.5 8.5 0 1 1 15 0"/><path d="m12 13 4-4"/><circle cx="12" cy="13" r="1.3"/>',
  camera:
    '<rect x="3" y="7" width="13" height="10" rx="2"/><path d="m16 11 5-3v8l-5-3"/>',
  building:
    '<path d="M4 21V5l8-2v18M12 8h8v13M2 21h20M7 8h2M7 12h2M7 16h2M15 12h2M15 16h2"/>',
  home: '<path d="M3 11 12 4l9 7"/><path d="M5.5 9.5V20h13V9.5M10 20v-5h4v5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/>'
};

export function icon(name, { size = 24, label = '', className = '' } = {}) {
  const body = paths[name];
  if (!body) throw new Error(`Icona sconosciuta: ${name}`);
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" ${a11y}>${body}</svg>`;
}

export const iconNames = Object.keys(paths);
export const iconPath = (name) => paths[name];
