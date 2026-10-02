export const PRODUCTS = Object.freeze({ nailmoods_plus: 'plus', nailmoods_pro: 'pro' });
const STATES = Object.freeze({
  SUBSCRIPTION_STATE_ACTIVE: 'active', SUBSCRIPTION_STATE_IN_GRACE_PERIOD: 'grace',
  SUBSCRIPTION_STATE_CANCELED: 'canceled', SUBSCRIPTION_STATE_ON_HOLD: 'on_hold',
  SUBSCRIPTION_STATE_PAUSED: 'paused', SUBSCRIPTION_STATE_EXPIRED: 'expired',
  SUBSCRIPTION_STATE_PENDING: 'pending', SUBSCRIPTION_STATE_PENDING_PURCHASE_CANCELED: 'expired',
});
export function verifiedSubscription(purchase, { accountId, allowedPlans, expectedProduct } = {}) {
  if (!accountId || purchase?.externalAccountIdentifiers?.obfuscatedExternalAccountId !== accountId) throw new Error('purchase_account_mismatch');
  const status = STATES[purchase.subscriptionState];
  if (!status) throw new Error('unsupported_purchase_state');
  const lines = purchase.lineItems;
  if (!Array.isArray(lines) || !lines.length || lines.length > 10) throw new Error('invalid_purchase_lines');
  const items = lines.map(line => {
    const productId = line.productId, basePlanId = line.offerDetails?.basePlanId;
    if (!PRODUCTS[productId] || !basePlanId || allowedPlans?.[productId] !== basePlanId) throw new Error('unrecognized_product_or_plan');
    const millis = Date.parse(line.expiryTime || '');
    if (!Number.isFinite(millis) && !['pending', 'expired'].includes(status)) throw new Error('invalid_expiry');
    return { productId, basePlanId, expiresAt: Number.isFinite(millis) ? new Date(millis).toISOString() : null,
      autoRenewing: line.autoRenewingPlan?.autoRenewEnabled === true };
  });
  if (expectedProduct && !items.some(item => item.productId === expectedProduct)) throw new Error('purchase_product_mismatch');
  return { status, items, rawState: purchase.subscriptionState,
    needsAcknowledgement: purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING' && ['active', 'grace', 'canceled'].includes(status),
    acknowledged: purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED' };
}
export function purchaseUrls(packageName, purchaseToken, productId) {
  if (!/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(packageName || '')) throw new Error('invalid_package');
  const root = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${encodeURIComponent(packageName)}/purchases`;
  const token = encodeURIComponent(purchaseToken);
  return { get: `${root}/subscriptionsv2/tokens/${token}`,
    acknowledge: `${root}/subscriptions/${encodeURIComponent(productId)}/tokens/${token}:acknowledge` };
}
// Access is derived only from Google and server-owned account/plan configuration.
export async function verifyAndPersist({ packageName, purchaseToken, accountId, allowedPlans, expectedProduct,
  fetchGoogle, persist, now = () => new Date().toISOString() }) {
  if (typeof purchaseToken !== 'string' || !purchaseToken.trim() || purchaseToken.length > 4096) throw new Error('invalid_token');
  const verifiedAt = now();
  const response = await fetchGoogle(purchaseUrls(packageName, purchaseToken, '').get);
  if (!response.ok) throw new Error('google_verification_unavailable');
  const verified = verifiedSubscription(await response.json(), { accountId, allowedPlans, expectedProduct });
  let acknowledgedAt = verified.acknowledged ? verifiedAt : null;
  // Save verified delivery before acknowledging; a failed acknowledgement remains
  // pending and is retried by reconciliation. Never pretend an HTTP error succeeded.
  let entitlement = await persist({ ...verified, purchaseToken, verifiedAt, acknowledgedAt });
  if (verified.needsAcknowledgement) {
    const ack = await fetchGoogle(purchaseUrls(packageName, purchaseToken, verified.items[0].productId).acknowledge,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (ack.ok) {
      acknowledgedAt = now();
      entitlement = await persist({ ...verified, purchaseToken, verifiedAt, acknowledgedAt });
    }
  }
  return { ok: true, purchaseState: verified.status, acknowledged: Boolean(acknowledgedAt), entitlement };
}
