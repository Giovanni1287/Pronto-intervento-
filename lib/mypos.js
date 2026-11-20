/**
 * myPOS Checkout API (IPC 1.4, checkout ospitato) — SOLO lato server (node:crypto).
 *
 * Una sola famiglia di API: "Checkout API" documentata su developers.mypos.com
 * (IPCPurchase · IPCPurchaseNotify · IPCPurchaseRollback · IPCGetPaymentStatus ·
 * IPCRefund), credenziali SID + WalletNumber + KeyIndex + chiave privata del
 * negozio + certificato pubblico myPOS. Non si mescolano le credenziali "Store ID /
 * Store password" dell'SDK TypeScript (vedi docs/PAGAMENTI-MYPOS.md).
 *
 * Firma IPC: i valori dei parametri, nell'ordine di invio, uniti con "-",
 * codificati in Base64 e firmati RSA-SHA256; firma in Base64 come ultimo
 * parametro. Le comunicazioni di myPOS si verificano allo stesso modo con il
 * certificato pubblico myPOS.
 *
 * Questo modulo non contiene chiavi e non abilita pagamenti reali: l'ambiente
 * di produzione richiede MYPOS_ENV=production e MYPOS_ALLOW_LIVE=true.
 */
import crypto from 'node:crypto';
import { toDecimalString, fromDecimal } from './money.js';
import { cartRows, sanitizeProviderData } from './payments.js';

export const IPC_VERSION = '1.4';
export const SANDBOX_URL = 'https://www.mypos.com/vmp/checkout-test';
export const PRODUCTION_URL = 'https://www.mypos.com/vmp/checkout';
const OFFICIAL_DOMAIN = /(^|\.)prontointerventoroma\.it$/i;

export function signatureBase(params) {
  const values = Object.entries(params).filter(([k]) => k !== 'Signature').map(([, v]) => String(v ?? ''));
  return Buffer.from(values.join('-'), 'utf8').toString('base64');
}

export function sign(params, privateKeyPem) {
  const s = crypto.createSign('RSA-SHA256');
  s.update(signatureBase(params));
  return s.sign(privateKeyPem, 'base64');
}

export function verifySignature(params, publicCertPem) {
  if (!params?.Signature || !publicCertPem) return false;
  try {
    const v = crypto.createVerify('RSA-SHA256');
    v.update(signatureBase(params));
    return v.verify(publicCertPem, params.Signature, 'base64');
  } catch {
    return false;
  }
}

/**
 * Configurazione per ambiente (sviluppo locale, sandbox, produzione).
 * Non pronta se: credenziali mancanti, URL del sito non HTTPS pubblico (URL_Notify),
 * sandbox sul dominio ufficiale, produzione non autorizzata, credenziali di famiglie diverse.
 */
export function readConfig(env) {
  const mode = env.MYPOS_ENV || 'sandbox';
  const official = mode === 'production' ? PRODUCTION_URL : SANDBOX_URL;
  const cfg = {
    env: mode,
    url: env.MYPOS_CHECKOUT_URL || official,
    sid: env.MYPOS_SID,
    wallet: env.MYPOS_WALLET,
    keyIndex: env.MYPOS_KEY_INDEX || '1',
    privateKey: env.MYPOS_PRIVATE_KEY,
    publicCert: env.MYPOS_PUBLIC_CERT,
    language: env.MYPOS_LANGUAGE || 'IT',
    siteUrl: (env.SITE_URL || env.URL || '').replace(/\/$/, ''),
    refundsEnabled: env.MYPOS_REFUNDS_ENABLED === 'true',
    statusQueryEnabled: env.MYPOS_STATUS_QUERY_ENABLED !== 'false',
    trustStatusQuery: env.MYPOS_TRUST_STATUS_QUERY === 'true'
  };
  const missing = ['sid', 'wallet', 'privateKey', 'publicCert', 'siteUrl'].filter((k) => !cfg[k]);
  const problems = [];
  if (!['sandbox', 'production'].includes(mode)) problems.push('MYPOS_ENV deve essere "sandbox" o "production"');
  if (![SANDBOX_URL, PRODUCTION_URL].includes(cfg.url) || cfg.url !== official) problems.push('URL di checkout non ufficiale o non coerente con l’ambiente');
  if (cfg.siteUrl) {
    let u;
    try { u = new URL(cfg.siteUrl); } catch { u = null; }
    if (!u || u.protocol !== 'https:' || u.port) problems.push('SITE_URL deve essere un indirizzo HTTPS pubblico senza porta (requisito di URL_Notify)');
    else if (mode === 'sandbox' && OFFICIAL_DOMAIN.test(u.hostname)) problems.push('I test sandbox non si eseguono sul dominio ufficiale');
  }
  if (env.MYPOS_STORE_ID || env.MYPOS_STORE_PASSWORD) problems.push('Credenziali "Store ID/Store password" (SDK) insieme a quelle IPC: usare una sola famiglia di API');
  const liveBlocked = mode !== 'sandbox' && env.MYPOS_ALLOW_LIVE !== 'true';
  return { ...cfg, ready: missing.length === 0 && problems.length === 0 && !liveBlocked, missing, problems, liveBlocked };
}

/** Parametri firmati per il checkout ospitato (importo e voci dall'ordine nel database, mai dal browser). */
export function buildPurchase({ cfg, order, customer = {}, attemptId = '' }) {
  if (!cfg.ready) throw new Error('myPOS non configurato');
  const q = `ordine=${encodeURIComponent(order.orderId)}${attemptId ? `&tentativo=${encodeURIComponent(attemptId)}` : ''}`;
  const rows = cartRows(order.items, order.amountCents, order.description);
  const params = {
    IPCmethod: 'IPCPurchase',
    IPCVersion: IPC_VERSION,
    IPCLanguage: cfg.language,
    SID: cfg.sid,
    WalletNumber: cfg.wallet,
    Amount: toDecimalString(order.amountCents),
    Currency: 'EUR',
    OrderID: order.orderId,
    URL_OK: `${cfg.siteUrl}/pagamento/verifica/?${q}`,
    URL_Cancel: `${cfg.siteUrl}/pagamento/annullato/?${q}`,
    URL_Notify: `${cfg.siteUrl}/.netlify/functions/mypos-notify`,
    CardTokenRequest: '0', // nessuna memorizzazione della carta: niente addebiti ricorrenti
    KeyIndex: cfg.keyIndex,
    PaymentParametersRequired: '3'
  };
  if (customer.email) params.CustomerEmail = customer.email;
  params.Note = String(order.description || '').slice(0, 100);
  params.CartItems = String(rows.length);
  rows.forEach((r, i) => {
    const n = i + 1;
    params[`Article_${n}`] = r.name;
    params[`Quantity_${n}`] = String(r.quantity);
    params[`Price_${n}`] = toDecimalString(r.priceCents);
    params[`Amount_${n}`] = toDecimalString(r.amountCents);
    params[`Currency_${n}`] = 'EUR';
  });
  params.Signature = sign(params, cfg.privateKey);
  return { action: cfg.url, method: 'POST', params };
}

function signedRequest(cfg, method, extra) {
  const params = { IPCmethod: method, IPCVersion: IPC_VERSION, IPCLanguage: cfg.language, SID: cfg.sid, WalletNumber: cfg.wallet, KeyIndex: cfg.keyIndex, ...extra, OutputFormat: 'JSON' };
  params.Signature = sign(params, cfg.privateKey);
  return params;
}

/** IPCGetPaymentStatus (consultazione dal backend). */
export const buildStatusRequest = (cfg, orderId) => signedRequest(cfg, 'IPCGetPaymentStatus', { OrderID: orderId });

/** IPCRefund (solo con MYPOS_REFUNDS_ENABLED=true e rimborso approvato nel database). */
export const buildRefundRequest = (cfg, { trnref, amountCents, refundOrderId }) =>
  signedRequest(cfg, 'IPCRefund', { IPC_Trnref: trnref, OrderID: refundOrderId, Amount: toDecimalString(amountCents), Currency: 'EUR' });

export async function postIpc(cfg, params, fetchImpl = fetch) {
  const r = await fetchImpl(cfg.url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(params).toString() });
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Risposta myPOS non in formato JSON (HTTP ${r.status})`); }
  return data;
}

/**
 * Esito di IPCGetPaymentStatus. `verified` è vero solo se la risposta porta una
 * firma valida con il certificato myPOS: senza verifica l'esito è solo informativo.
 */
export function parseStatusResponse(data, cfg) {
  const flat = Object.fromEntries(Object.entries(data || {}).filter(([, v]) => typeof v !== 'object'));
  let amountCents = null;
  try { amountCents = flat.Amount != null ? fromDecimal(String(flat.Amount)) : null; } catch { amountCents = null; }
  return {
    ok: String(flat.Status) === '0',
    paymentStatus: Number(flat.PaymentStatus || 0),
    providerRef: flat.IPC_Trnref || null,
    amountCents,
    currency: flat.Currency || null,
    verified: verifySignature(flat, cfg.publicCert),
    safe: sanitizeProviderData(flat)
  };
}

const ROLLBACK = 'IPCPurchaseRollback';

/**
 * Elabora una comunicazione di myPOS su URL_Notify.
 * - IPCPurchaseNotify: firma, ordine, importo, valuta, riferimento transazione; poi
 *   conferma TRANSAZIONALE e idempotente nel database. Risposta "OK" (HTTP 200)
 *   SOLO dopo la registrazione sicura: in caso contrario myPOS non riceve "OK" e
 *   procede con lo storno (Purchase Rollback).
 * - IPCPurchaseRollback: firma verificata, pagamento segnato come stornato.
 * I dati di carta non vengono mai passati al database né ai log.
 *
 * @param deps.findOrder(orderId) → { orderId, amountCents, currency, status } | null
 * @param deps.confirmPayment({ eventKey, orderId, providerRef, amountCents, currency, payload }) → { duplicate, outcome }
 * @param deps.rollbackPayment({ eventKey, orderId, amountCents, currency, payload })
 */
export async function handleNotify(params, publicCert, deps) {
  if (!verifySignature(params, publicCert)) return { http: 400, body: 'INVALID SIGNATURE', outcome: 'rejected_signature' };
  const isRollback = params.IPCmethod === ROLLBACK || (!params.IPCmethod && !params.IPC_Trnref);
  if (!isRollback && params.IPCmethod && params.IPCmethod !== 'IPCPurchaseNotify') return { http: 400, body: 'UNSUPPORTED', outcome: 'rejected_method' };
  const order = await deps.findOrder(params.OrderID);
  if (!order) return { http: 404, body: 'UNKNOWN ORDER', outcome: 'rejected_order' };
  let amountCents;
  try { amountCents = fromDecimal(params.Amount); } catch { return { http: 400, body: 'INVALID AMOUNT', outcome: 'rejected_amount' }; }
  if (params.Currency !== (order.currency || 'EUR')) return { http: 400, body: 'CURRENCY MISMATCH', outcome: 'rejected_currency' };
  const payload = sanitizeProviderData(params);
  if (isRollback) {
    if (!deps.rollbackPayment) return { http: 503, body: 'NOT CONFIGURED', outcome: 'rollback_unhandled' };
    const key = `mypos:rollback:${params.OrderID}:${params.IPC_Trnref || params.RequestSTAN || amountCents}`;
    try { await deps.rollbackPayment({ eventKey: key, orderId: params.OrderID, amountCents, currency: params.Currency, payload }); } catch { return { http: 500, body: 'ERROR', outcome: 'error' }; }
    return { http: 200, body: 'OK', outcome: 'rollback_recorded' };
  }
  if (amountCents !== order.amountCents) return { http: 400, body: 'AMOUNT MISMATCH', outcome: 'rejected_amount' };
  const providerRef = params.IPC_Trnref;
  if (!providerRef) return { http: 400, body: 'MISSING TRNREF', outcome: 'rejected_ref' };
  const eventKey = `mypos:notify:${params.OrderID}:${providerRef}`;
  let res;
  try {
    res = await deps.confirmPayment({ eventKey, orderId: params.OrderID, providerRef, amountCents, currency: params.Currency, payload });
  } catch {
    // registrazione non riuscita: nessun "OK" (myPOS considererà il pagamento non confermato)
    return { http: 500, body: 'ERROR', outcome: 'error' };
  }
  return { http: 200, body: 'OK', outcome: res?.duplicate ? 'duplicate_ignored' : res?.outcome || 'confirmed' };
}
