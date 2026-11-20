/**
 * /recensioni/rinuncia/?t=<token> — il cliente rinuncia alle richieste di recensione (Prompt 7).
 * Il token arriva dal link nell'email; il database registra solo l'impronta dell'email.
 */
import { h, fill, notice, db, notConfiguredView, backendReady } from './core.js';

const root = document.getElementById('app');
if (root) {
  const t = new URLSearchParams(location.search).get('t') || '';
  if (!backendReady) notConfiguredView(root, 'La gestione delle preferenze');
  else if (!/^[0-9a-f]{36}$/.test(t)) fill(root, notice('error', 'Collegamento non valido. Se vuoi non ricevere più richieste di recensione, rispondi all’email ricevuta.'));
  else {
    fill(root, h('p', { class: 'app-muted' }, 'Registrazione della preferenza…'));
    db.rpc('review_optout', { p_token: t }).then((ok) => fill(root, ok
      ? notice('ok', 'Fatto: non riceverai altre richieste di recensione da Pronto Intervento Roma.')
      : notice('error', 'Collegamento scaduto o già usato. Se ricevi altre richieste, rispondi all’email per segnalarlo.')))
      .catch(() => fill(root, notice('error', 'Servizio non disponibile in questo momento: riprova più tardi.')));
  }
}
