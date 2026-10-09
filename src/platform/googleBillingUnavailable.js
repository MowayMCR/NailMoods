// Replaced at build time on iOS: no Google bridge or endpoint is bundled.
export const BILLING_PRODUCTS = Object.freeze({plus:'nailmoods_plus',pro:'nailmoods_pro'});
export const isGooglePlayAndroid = () => false;
export const NailMoodsBilling = Object.freeze({});
const unavailable = async () => {throw Error('billing_not_available');};
export const billingRequest = unavailable;
export const prepareGooglePlayPurchase = unavailable;
export const loadBillingProducts = async () => ({products:[],context:null});
export const syncGooglePlayPurchase = unavailable;
export const purchaseTier = unavailable;
export const restoreGooglePlayPurchases = unavailable;
export const readGooglePlayEntitlement = unavailable;
