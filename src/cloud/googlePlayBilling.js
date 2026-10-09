import { registerPlugin, Capacitor } from '@capacitor/core';
export const BILLING_PRODUCTS = Object.freeze({ plus: 'nailmoods_plus', pro: 'nailmoods_pro' });
export const NailMoodsBilling = registerPlugin('NailMoodsBilling');
export const isGooglePlayAndroid = () => Capacitor.getPlatform() === 'android';

export async function billingRequest(client, body) {
  const response = await client.functions.invoke('google-play-verify', { body });
  if (response.error) {
    let code = '';
    try { code = (await response.error.context?.json())?.error || ''; } catch { /* no response body */ }
    throw new Error(code || 'verification_unavailable');
  }
  if (response.data?.error) throw new Error(response.data.error);
  return response.data;
}
export const prepareGooglePlayPurchase = client => billingRequest(client, { action: 'prepare' });
export async function loadBillingProducts(client) {
  if (!isGooglePlayAndroid()) return { products: [], context: null };
  const context = await prepareGooglePlayPurchase(client);
  if (!context.enabled) return { products: [], context };
  const result = await NailMoodsBilling.getProducts({ basePlans: context.allowedPlans });
  return { products: Array.isArray(result?.products) ? result.products : [], context };
}
export async function syncGooglePlayPurchase(client, purchase, productId) {
  if (!purchase?.purchaseToken) throw new Error('invalid_token');
  const result = await billingRequest(client, { productId, purchaseToken: purchase.purchaseToken });
  if (!result?.ok || !result?.entitlement) throw new Error('verification_unavailable');
  return result;
}
export async function purchaseTier(client, tier, displayedProduct) {
  if (!isGooglePlayAndroid()) throw new Error('billing_not_available');
  const productId = BILLING_PRODUCTS[tier];
  if (!productId || displayedProduct?.productId !== productId) throw new Error('product_unavailable');
  const {data:rights,error:rightsError}=await client.rpc('billing_entitlement_state');if(rightsError)throw rightsError;if(rights?.instituteActive)throw new Error('salon_entitlement_active');
  const context = await prepareGooglePlayPurchase(client);
  if (!context.enabled) throw new Error('billing_not_configured');
  if (!context.eligible) throw new Error('billing_ineligible');
  if (context.manualPriority) throw new Error('manual_entitlement_active');
  if (context.hasSubscription) throw new Error('existing_subscription');
  if (context.allowedPlans[productId] !== displayedProduct.basePlanId) throw new Error('price_changed');
  const result = await NailMoodsBilling.purchase({ ...displayedProduct, accountId: context.accountId });
  if (!result?.purchases?.length) throw new Error('purchase_not_confirmed');
  const synced = [];
  for (const purchase of result.purchases) {
    if (!purchase.productIds?.includes(productId)) throw new Error('purchase_product_mismatch');
    // Android pending is information only. Never use it to grant an entitlement.
    if (purchase.purchaseState === 2) {
      try { synced.push(await syncGooglePlayPurchase(client, purchase, productId)); }
      catch { synced.push({ purchaseState: 'pending' }); }
    } else synced.push(await syncGooglePlayPurchase(client, purchase, productId));
  }
  return synced;
}
export async function restoreGooglePlayPurchases(client) {
  if (!isGooglePlayAndroid()) throw new Error('billing_not_available');
  const result = await NailMoodsBilling.restorePurchases();
  const synced = [], failures = [];
  for (const purchase of result?.purchases || []) {
    const productId = purchase.productIds?.find(id => Object.values(BILLING_PRODUCTS).includes(id));
    if (!productId) continue;
    try { synced.push(await syncGooglePlayPurchase(client, purchase, productId)); }
    catch (error) { if (purchase.purchaseState === 2) synced.push({ purchaseState: 'pending' }); else failures.push(error.message); }
  }
  // Also query stored tokens: queryPurchasesAsync omits expired/held purchases.
  const reconciled = await billingRequest(client, { action: 'refresh' });
  return { synced, failures, reconciliationFailed: reconciled.failed || 0 };
}
export async function readGooglePlayEntitlement(client) {
  const { data, error } = await client.rpc('google_play_entitlement_state');
  if (error) throw error;
  return data;
}
