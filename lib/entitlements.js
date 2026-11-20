/**
 * Prestazioni incluse e crediti residui (contratti Family e acquisti Lavoro Protetto).
 *
 * Regole:
 * - Un credito si scala SOLO dopo l'effettiva esecuzione, confermata.
 * - Ogni consumo ha una chiave di idempotenza: ripetere la stessa richiesta
 *   non scala due volte.
 * - Non si consuma oltre il residuo né fuori dal periodo di validità.
 * - Lo storico (ledger) è solo in aggiunta: gli storni sono nuove righe.
 */

export function remaining(entitlement, ledger) {
  if (entitlement.quantity === null) return Infinity; // es. sconto senza limite di utilizzi
  const used = ledger.filter((l) => l.entitlementId === entitlement.id).reduce((n, l) => n + l.delta, 0);
  return entitlement.quantity - used;
}

/**
 * @returns {{ ok: boolean, duplicate?: boolean, entry?: object, reason?: string, ledger: object[] }}
 */
export function consume({ entitlement, ledger, idempotencyKey, execution, validity, now = new Date() }) {
  if (!idempotencyKey) return { ok: false, reason: 'Chiave di idempotenza mancante', ledger };
  const existing = ledger.find((l) => l.idempotencyKey === idempotencyKey);
  if (existing) {
    if (existing.entitlementId !== entitlement.id) return { ok: false, reason: 'Chiave già usata per un’altra prestazione', ledger };
    return { ok: true, duplicate: true, entry: existing, ledger };
  }
  if (!execution || execution.status !== 'completed' || !execution.confirmedAt) {
    return { ok: false, reason: 'La prestazione si scala solo dopo esecuzione confermata', ledger };
  }
  const at = new Date(execution.performedAt || execution.confirmedAt).getTime();
  if (validity) {
    if (validity.status !== 'active') return { ok: false, reason: 'Piano non attivo', ledger };
    if (at < new Date(validity.startsAt).getTime() || at > new Date(validity.endsAt).getTime()) {
      return { ok: false, reason: 'Prestazione eseguita fuori dal periodo di validità del piano', ledger };
    }
  }
  if (remaining(entitlement, ledger) < 1) return { ok: false, reason: 'Nessuna prestazione residua', ledger };
  const entry = {
    entitlementId: entitlement.id,
    delta: 1,
    idempotencyKey,
    executionId: execution.id,
    at: new Date(now).toISOString()
  };
  return { ok: true, entry, ledger: [...ledger, entry] };
}

/** Storno (es. prestazione annullata dopo il consumo): riga negativa tracciata. */
export function reverse({ ledger, idempotencyKey, reason, author, now = new Date() }) {
  const original = ledger.find((l) => l.idempotencyKey === idempotencyKey && l.delta > 0);
  if (!original) throw new Error('Consumo da stornare non trovato');
  const key = `reverse:${idempotencyKey}`;
  if (ledger.some((l) => l.idempotencyKey === key)) return ledger;
  if (!reason || !author) throw new Error('Motivo e autore obbligatori per lo storno');
  return [...ledger, { entitlementId: original.entitlementId, delta: -1, idempotencyKey: key, reason, author, at: new Date(now).toISOString() }];
}
