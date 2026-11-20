/**
 * Dati aziendali dal database (Prompt 9): la build legge public_company_profile() — SOLO campi
 * verificati dal titolare — e li applica alla configurazione condivisa da header, footer, pagine,
 * moduli e dati strutturati. I dati riservati (codice fiscale, polizze, documenti) non arrivano mai qui.
 * Un campo assente resta vuoto: nessun dato viene inventato o completato.
 */
import { site, contacts, company } from './site.config.js';

export const SOCIAL_LABELS = { facebook: 'Facebook', instagram: 'Instagram', linkedin: 'LinkedIn', youtube: 'YouTube', tiktok: 'TikTok', google: 'Google' };

export function applyCompanyProfile(p, { storageUrl = '' } = {}) {
  if (!p || typeof p !== 'object') return [];
  const applied = [];
  const set = (obj, key, value, label) => { if (value !== undefined && value !== null && value !== '') { obj[key] = value; applied.push(label); } };
  set(site, 'brandShort', p.tradeName, 'nome commerciale');
  set(site, 'owner', p.ownerName, 'titolare');
  set(contacts, 'phone', p.phone, 'telefono');
  set(contacts, 'whatsapp', p.whatsapp, 'WhatsApp');
  set(contacts, 'email', p.email, 'email');
  set(contacts, 'hours', p.hours, 'orari');
  set(company, 'legalName', p.legalName, 'ragione sociale');
  set(company, 'vatNumber', p.vatNumber ? p.vatNumber.replace(/^IT/, '') : '', 'partita IVA');
  set(company, 'pec', p.pec, 'PEC');
  set(company, 'story', p.description, 'descrizione');
  if (p.registeredOffice && typeof p.registeredOffice === 'object') {
    const r = p.registeredOffice;
    company.address = { ...company.address, street: r.street || '', postalCode: r.postalCode || '', city: r.city || '', province: r.province || '' };
    applied.push('sede legale');
  }
  if (p.operatingOffice && typeof p.operatingOffice === 'object' && Object.values(p.operatingOffice).some(Boolean)) { company.operatingOffice = { ...p.operatingOffice }; applied.push('sede operativa'); }
  if (Array.isArray(p.qualifications)) {
    const list = p.qualifications.filter((q) => q && q.title).map((q) => [q.title, q.issuer].filter(Boolean).join(' — '));
    if (list.length) { company.certifications = list; company.certificationsVerified = true; applied.push('abilitazioni'); }
  }
  set(company, 'insurance', p.insurancePublic, 'assicurazione');
  set(company, 'availability', p.serviceAvailability, 'disponibilità dei servizi');
  set(company, 'zonesNote', p.serviceZonesNote, 'nota sulle zone');
  if (p.social && typeof p.social === 'object') {
    const social = Object.entries(p.social).filter(([k, v]) => SOCIAL_LABELS[k] && /^https:\/\//.test(String(v)));
    if (social.length) { company.social = Object.fromEntries(social); applied.push('social'); }
  }
  // immagini pubbliche nel bucket "azienda-pubblico" (caricate dall'amministrazione)
  const img = (path) => (path && storageUrl ? `${storageUrl.replace(/\/$/, '')}/storage/v1/object/public/azienda-pubblico/${String(path).replace(/^\/+/, '')}` : null);
  if (p.ownerPhotoPath && img(p.ownerPhotoPath)) { company.ownerPhoto = img(p.ownerPhotoPath); applied.push('foto del titolare'); }
  if (p.logoPath && img(p.logoPath)) { company.logoUrl = img(p.logoPath); applied.push('logo'); }
  return applied;
}
