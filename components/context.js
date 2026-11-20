/** Contesto di build condiviso dai componenti (impostato da scripts/build.js). */
export const ctx = {
  env: 'development', // development | preview | production
  indexable: false,
  missing: [], // configurazioni mancanti rilevate al build
  placeholders: new Map(), // placeholder richiesti dalle pagine: chiave → specifica SVG
  buildDate: new Date().toISOString()
};

export const isProduction = () => ctx.env === 'production';
