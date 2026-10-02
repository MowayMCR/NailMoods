// Only feed this mapper data verified by Apple's SignedDataVerifier and Server API.
export const APPLE_PRODUCTS = Object.freeze({ nailmoods_plus: 'plus', nailmoods_pro: 'pro' });
export function appleRecord(transaction, renewal, status, { bundleId, environment, accountToken, now = Date.now() }) {
  if (transaction.bundleId !== bundleId || transaction.environment !== environment) throw Error('apple_app_mismatch');
  if (!APPLE_PRODUCTS[transaction.productId] || transaction.type !== 'Auto-Renewable Subscription') throw Error('unrecognized_product');
  if (!accountToken || transaction.appAccountToken?.toLowerCase() !== accountToken.toLowerCase()) throw Error('purchase_account_mismatch');
  if (!transaction.transactionId || !transaction.originalTransactionId || !Number.isFinite(transaction.signedDate)) throw Error('invalid_transaction');
  if (renewal && (renewal.originalTransactionId !== transaction.originalTransactionId || renewal.environment !== environment)) throw Error('invalid_renewal');
  const expires = Number(transaction.expiresDate);
  if (!Number.isFinite(expires) || !Number.isFinite(transaction.purchaseDate)) throw Error('invalid_expiry');
  let state = ({ 1:'active', 2:'expired', 3:'billing_retry', 4:'grace', 5:'revoked' })[status];
  if (!state) throw Error('unsupported_purchase_state');
  if (transaction.revocationDate || transaction.isUpgraded === true) state = 'revoked';
  const grace = Number(renewal?.gracePeriodExpiresDate);
  const validUntil = state === 'grace' && Number.isFinite(grace) ? grace : expires;
  if (['active','grace'].includes(state) && validUntil <= now) state = 'expired';
  if (state === 'active' && renewal?.autoRenewStatus === 0) state = 'canceled';
  return { provider:'apple_app_store', tier:APPLE_PRODUCTS[transaction.productId], productId:transaction.productId,
    status:state, environment, transactionId:String(transaction.transactionId), originalTransactionId:String(transaction.originalTransactionId),
    startsAt:new Date(transaction.purchaseDate).toISOString(), expiresAt:new Date(validUntil).toISOString(),
    autoRenewing:renewal?.autoRenewStatus === 1, signedAt:new Date(Math.max(transaction.signedDate, renewal?.signedDate || 0)).toISOString(), verifiedAt:new Date(now).toISOString() };
}

export function resolveAccess({ manual, apple = [], google = [], sandboxEnabled = false }, now = Date.now()) {
  const rank = { free:0, plus:1, pro:2 };
  const valid = entry => ['active','grace','canceled'].includes(entry.status) && (!entry.startsAt || Date.parse(entry.startsAt) <= now) && Date.parse(entry.expiresAt) > now;
  const tiers = [];
  if (manual && manual.status === 'active' && (!manual.startsAt || Date.parse(manual.startsAt)<=now) && (!manual.expiresAt || Date.parse(manual.expiresAt)>now)) tiers.push(manual.tier);
  tiers.push(...apple.filter(e=>valid(e) && (e.environment==='Production' || sandboxEnabled)).map(e=>e.tier));
  tiers.push(...google.filter(valid).map(e=>e.tier));
  return tiers.reduce((best,tier)=>rank[tier]>rank[best]?tier:best,'free');
}
