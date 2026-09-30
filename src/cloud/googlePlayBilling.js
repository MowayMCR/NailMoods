import { registerPlugin } from '@capacitor/core';

export const BILLING_PRODUCTS = Object.freeze({
  plus: 'nailmoods_plus',
  pro: 'nailmoods_pro',
});

export const NailMoodsBilling = registerPlugin('NailMoodsBilling');

export async function loadBillingProducts() {
  const result = await NailMoodsBilling.getProducts();
  return Array.isArray(result?.products) ? result.products : [];
}

export async function syncGooglePlayPurchase(client, purchase, productId) {
  const response = await client.functions.invoke('google-play-verify', {
    body: { productId, purchaseToken: purchase.purchaseToken },
  });
  if (response.error) throw response.error;
  return response.data;
}

export async function purchaseTier(client, tier) {
  const productId = BILLING_PRODUCTS[tier];
  if (!productId) throw new Error('invalid_billing_tier');
  const result = await NailMoodsBilling.purchase({ productId });
  const purchases = result?.purchases || [];
  const synced = [];
  for (const purchase of purchases) {
    const ids = Array.isArray(purchase.productIds) ? purchase.productIds : [];
    const purchasedProduct = ids.includes(productId) ? productId : ids[0] || productId;
    synced.push(await syncGooglePlayPurchase(client, purchase, purchasedProduct));
  }
  return synced;
}

export async function restoreGooglePlayPurchases(client) {
  const result = await NailMoodsBilling.restorePurchases();
  const synced = [];
  for (const purchase of result?.purchases || []) {
    for (const productId of (purchase.productIds || [])) {
      if (BILLING_PRODUCTS.plus === productId || BILLING_PRODUCTS.pro === productId) {
        synced.push(await syncGooglePlayPurchase(client, purchase, productId));
      }
    }
  }
  return synced;
}

export async function readGooglePlayEntitlement(client) {
  const { data, error } = await client.rpc('google_play_entitlement_state');
  if (error) throw error;
  return data;
}
