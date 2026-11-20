/**
 * Specializzazioni operative dei tecnici (centrale operativa, Prompt 5).
 *
 * - `categoryId`: categoria tecnica del catalogo servizi (services.js).
 * - `familyCategory`: categoria commerciale PRONTO+ Family corrispondente (se esiste).
 * - `implies`: specializzazioni comprese (es. chi è abilitato all'idraulica copre la piccola idraulica).
 * - `services`: servizi del catalogo per cui questa specializzazione è RICHIESTA in assegnazione.
 *
 * La presenza di una specializzazione nel profilo NON è una verifica delle
 * abilitazioni professionali: quelle si registrano a parte (abilitazioni verificate),
 * e i requisiti obbligatori per specializzazione si configurano dal titolare
 * (tabella qualification_requirements, vuota finché non definita).
 *
 * Mappatura servizi → specializzazioni: PROVVISORIA, da confermare con il titolare.
 */
export const specializations = [
  { id: 'piccola-idraulica', name: 'Piccola idraulica', categoryId: 'idraulica', familyCategory: 'piccola-idraulica', implies: [], services: ['idraulica/spurgo-lavandini'] },
  { id: 'idraulica', name: 'Idraulica', categoryId: 'idraulica', familyCategory: 'idraulica', implies: ['piccola-idraulica'], services: [] },
  { id: 'spurghi', name: 'Spurghi', categoryId: 'idraulica', familyCategory: 'spurgo', implies: [], services: ['idraulica/spurgo-fognature', 'idraulica/disostruzione-scarichi-canal-jet', 'idraulica/fresatura-colonne-tubazioni'] },
  { id: 'videoispezioni', name: 'Videoispezioni', categoryId: 'idraulica', familyCategory: null, implies: [], services: ['idraulica/videoispezione-tubature'] },
  { id: 'ricerca-perdite', name: 'Ricerca perdite', categoryId: 'ricerca-perdite-occulte', familyCategory: 'perdite-occulte', implies: [],
    services: ['ricerca-perdite-occulte/gas-tracciante', 'ricerca-perdite-occulte/geofono', 'ricerca-perdite-occulte/termografia', 'ricerca-perdite-occulte/ricerca-perdite-tubazioni-scarico', 'ricerca-perdite-occulte/ricerca-perdite-tubazioni-pressione'] },
  { id: 'elettricita', name: 'Elettricità', categoryId: 'elettrica', familyCategory: 'elettrica', implies: [],
    services: ['elettrica/riparazione-impianti-elettrici', 'elettrica/guasti-corto-circuiti', 'elettrica/quadri-elettrici', 'elettrica/rifacimento-impianti-elettrici'] },
  { id: 'allagamenti', name: 'Allagamenti', categoryId: 'allagamenti', familyCategory: 'allagamenti', implies: [], services: ['allagamenti/svuotamenti-post-alluvionali', 'allagamenti/svuotamenti-locali'] },
  { id: 'muratura', name: 'Muratura', categoryId: 'muratura', familyCategory: 'muratura', implies: [],
    services: ['muratura/piccole-ristrutturazioni', 'muratura/riparazioni-murarie', 'muratura/imbiancatura', 'muratura/cartongesso', 'muratura/rifacimento-bagni'] },
  { id: 'disinfestazioni', name: 'Disinfestazioni', categoryId: 'disinfestazioni', familyCategory: 'disinfestazioni', implies: [],
    services: ['disinfestazioni/disinfestazioni-insetti', 'disinfestazioni/derattizzazione', 'disinfestazioni/disinfestazione-pulci-zecche-cimici'] }
];

/** Specializzazione generica di una categoria (usata quando la richiesta indica solo la categoria). */
export const categoryDefaultSpecialization = {
  idraulica: 'idraulica', 'ricerca-perdite-occulte': 'ricerca-perdite', elettrica: 'elettricita',
  allagamenti: 'allagamenti', muratura: 'muratura', disinfestazioni: 'disinfestazioni'
};
