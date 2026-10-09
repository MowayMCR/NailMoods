import { registerPlugin, Capacitor } from '@capacitor/core';
export const AppleBilling = registerPlugin('NailMoodsStoreKit');
export const isAppleIOS = () => Capacitor.getPlatform() === 'ios';
export const APPLE_PRODUCTS = {plus:'nailmoods_plus',pro:'nailmoods_pro'};
export async function appleRequest(client, body) {
  const {data,error}=await client.functions.invoke('apple-verify',{body});
  if(error){let code;try{code=(await error.context?.json())?.error;}catch{}throw Error(code||'verification_unavailable');}
  if(data?.error)throw Error(data.error);
  return data;
}
export async function appleContext(client, refresh=false) {
  const {environment}=await AppleBilling.getEnvironment({refresh});
  return appleRequest(client,{action:'prepare',environment});
}
// Catalog visibility must not depend on obtaining the app download transaction.
// The server context still gates every purchase and every entitlement change.
export async function loadAppleOffers(client, refresh=false, store=AppleBilling, contextLoader=appleContext) {
  const [access,catalog,prepared]=await Promise.allSettled([
    readBillingEntitlement(client), store.getProducts(), contextLoader(client,refresh)
  ]);
  const errors=[access,catalog,prepared].filter(r=>r.status==='rejected').map(r=>r.reason);
  return {
    state:access.status==='fulfilled'?access.value:null,
    products:catalog.status==='fulfilled'?(catalog.value.products||[]):[],
    context:prepared.status==='fulfilled'?prepared.value:null,
    error:errors[0]||(catalog.status==='fulfilled'&&!catalog.value.products?.length?Error('product_unavailable'):null)
  };
}
export async function readBillingEntitlement(client) {
  const {data,error}=await client.rpc('billing_entitlement_state');if(error)throw error;return data;
}
export async function verifyApplePurchase(client, transaction, environment) {
  const result=await appleRequest(client,{signedTransaction:transaction.signedTransaction,environment});
  if(!result.ok||!result.entitlement)throw Error('verification_unavailable');
  await AppleBilling.finish({transactionId:transaction.transactionId});
  return result;
}
export async function purchaseAppleTier(client,tier,displayed) {
  if(!isAppleIOS()||displayed?.productId!==APPLE_PRODUCTS[tier])throw Error('product_unavailable');
  const context=await appleContext(client);
  if(!context.enabled)throw Error('billing_not_configured');
  if(!context.canPurchase)throw Error(context.manualPriority?'manual_entitlement_active':context.otherProviderActive?'other_subscription_active':'billing_ineligible');
  const current=(await AppleBilling.getProducts()).products.find(p=>p.productId===displayed.productId);
  if(!current||current.formattedPrice!==displayed.formattedPrice||current.periodUnit!==displayed.periodUnit||current.periodValue!==displayed.periodValue)throw Error('price_changed');
  const result=await AppleBilling.purchase({productId:displayed.productId,accountToken:context.accountToken});
  if(result.state==='canceled'||result.state==='pending')return result;
  return {state:'verified',...await verifyApplePurchase(client,result.transaction,context.environment)};
}
export async function reconcileApple(client, restore=false) {
  const context=await appleContext(client);if(!context.enabled)throw Error('billing_not_configured');
  const result=restore?await AppleBilling.restorePurchases():await AppleBilling.unfinishedPurchases();
  let failed=0;
  for(const tx of result.transactions||[])try{await verifyApplePurchase(client,tx,context.environment);}catch{failed++;}
  const refreshed=await appleRequest(client,{action:'refresh',environment:context.environment});
  return {...refreshed,failed:failed+(refreshed.failed||0)};
}
export const manageAppleSubscription=()=>AppleBilling.manageSubscriptions();
export function applePeriod(product) {
  const value=Number(product?.periodValue);const label={day:'jour',week:'semaine',month:'mois',year:'an'}[product?.periodUnit];
  if(!value||!label)return '';
  return value===1?label:`${value} ${label}${label==='mois'?'':'s'}`;
}
export function appleError(error) {
  return ({environment_unavailable:'La connexion Apple n’a pas abouti. Appuie sur Actualiser les offres pour te reconnecter à Apple.',app_not_verified:'Apple n’a pas confirmé les informations de cette application. Appuie sur Actualiser les offres.',product_unavailable:'Apple ne renvoie pas encore les offres Plus et Pro. Leur configuration App Store reste à vérifier.',local_storekit_not_server_verifiable:'Les achats locaux Xcode ne peuvent pas être vérifiés par le serveur.',billing_not_configured:'Les abonnements Apple ne sont pas encore ouverts.',manual_entitlement_active:'Ton accès est déjà offert par NailMoods.',
    other_subscription_active:'Ton offre est déjà active sur ton compte.',billing_ineligible:'Confirme ta majorité et les conditions dans Confidentialité. Les achats Sandbox sont réservés aux comptes de test autorisés.',
    price_changed:'Le prix a changé. Actualise les offres avant de confirmer.',purchase_account_mismatch:'Cet achat appartient à un autre compte NailMoods. Reconnecte-toi au compte utilisé pour l’achat.'})[error?.message]||'La connexion aux abonnements a échoué. Actualise les offres. Tes accès actuels sont conservés.';
}
