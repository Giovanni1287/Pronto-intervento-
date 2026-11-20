/**
 * ZONE OPERATIVE (Prompt 7) — località PROPOSTE, tutte da confermare.
 * Nessuna zona è dichiarata servita finché Giovanni non la attiva nella dashboard
 * /admin/seo/ (tabella service_zones). In build, se Supabase è configurato, l'elenco
 * delle zone attive viene letto con la funzione pubblica public_service_zones();
 * altrimenti vale il campo `active` qui sotto (oggi sempre false).
 * Una pagina territoriale dedicata nasce SOLO con contenuto distintivo approvato
 * (`content` di almeno 2 paragrafi originali e `contentApproved: true`): niente pagine
 * identiche con il solo nome del quartiere cambiato, niente indirizzi o sedi fittizie.
 */
export const zones = [
  { slug: 'roma-centro', name: 'Roma Centro', area: 'Municipio I e quartieri centrali', active: false },
  { slug: 'roma-nord', name: 'Roma Nord', area: 'Quadrante nord della città', active: false },
  { slug: 'roma-sud', name: 'Roma Sud', area: 'Quadrante sud della città', active: false },
  { slug: 'roma-est', name: 'Roma Est', area: 'Quadrante est della città', active: false },
  { slug: 'roma-ovest', name: 'Roma Ovest', area: 'Quadrante ovest della città', active: false },
  { slug: 'ostia', name: 'Ostia', area: 'Litorale romano (Municipio X)', active: false },
  { slug: 'fiumicino', name: 'Fiumicino', area: 'Comune di Fiumicino', active: false },
  { slug: 'ladispoli', name: 'Ladispoli', area: 'Comune di Ladispoli', active: false },
  { slug: 'cerveteri', name: 'Cerveteri', area: 'Comune di Cerveteri', active: false },
  { slug: 'pomezia', name: 'Pomezia', area: 'Comune di Pomezia', active: false },
  { slug: 'ciampino', name: 'Ciampino', area: 'Comune di Ciampino', active: false },
  { slug: 'tivoli', name: 'Tivoli', area: 'Comune di Tivoli', active: false },
  { slug: 'guidonia', name: 'Guidonia', area: 'Comune di Guidonia Montecelio', active: false }
];

let fromDb = null;
/** Impostato dalla build con i dati della dashboard (solo zone attive e campi pubblici). */
export function setZonesFromDatabase(rows) {
  fromDb = Array.isArray(rows) ? rows.filter((r) => r && r.slug && zones.some((z) => z.slug === r.slug)) : null;
}

export function activeZones() {
  if (fromDb) return fromDb.filter((r) => r.active).map((r) => ({ ...zones.find((z) => z.slug === r.slug), ...r }));
  return zones.filter((z) => z.active);
}

export const zoneHasOwnPage = (z) => z.contentApproved === true && Array.isArray(z.content) && z.content.filter((p) => String(p).length > 200).length >= 2 && Boolean(z.metaDescription);
