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
export async function appleContext(client) {
  const {environment}=await AppleBilling.getEnvironment();
  return appleRequest(client,{action:'prepare',environment});
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
  if(!context.canPurchase)throw Error(context.manualPriority?'manual_entitlement_active':context.instituteActive?'institute_entitlement_active':context.otherProviderActive?'other_subscription_active':'billing_ineligible');
  const current=(await AppleBilling.getProducts()).products.find(p=>p.productId===displayed.productId);
  if(!current||current.formattedPrice!==displayed.formattedPrice||current.periodUnit!==displayed.periodUnit||current.periodValue!==displayed.periodValue)throw Error('price_changed');
  const result=await AppleBilling.purchase({productId:displayed.productId,accountToken:context.accountToken});
  if(result.state==='canceled'||result.state==='pending')return result;
  return {state:'verified',...await verifyApplePurchase(client,result.transaction,context.environment)};
}
export async function reconcileApple(client, restore=false) {
  const context=await appleContext(client);if(!context.enabled)throw Error('billing_not_configured');
  const result=restore?await AppleBilling.restorePurchases():await AppleBilling.unfinishedPurchases();
  let failed=0,ownershipConflict=false;
  for(const tx of result.transactions||[])try{await verifyApplePurchase(client,tx,context.environment);}catch(error){failed++;if(/purchase_(owned_by_another_account|account_mismatch)/.test(error.message))ownershipConflict=true;}
  if(ownershipConflict)throw Error('purchase_owned_by_another_account');
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
  return ({billing_not_configured:'Les abonnements Apple ne sont pas encore ouverts.',manual_entitlement_active:'Ton accès est déjà offert par NailMoods.',
    institute_entitlement_active:'Ton institut fournit déjà cet accès.',
    purchase_owned_by_another_account:'Cet achat est déjà lié à un autre compte. Reconnecte-toi au compte d’origine, ou utilise l’aide NailMoods avec la référence de transaction, sans mot de passe.',
    other_subscription_active:'Ton offre est déjà active sur ton compte.',billing_ineligible:'Confirme ta majorité et les conditions dans Confidentialité. Les achats Sandbox sont réservés aux comptes de test autorisés.',
    price_changed:'Le prix a changé. Actualise les offres avant de confirmer.',purchase_account_mismatch:'Cet achat appartient à un autre compte NailMoods. Reconnecte-toi au compte utilisé pour l’achat.'})[error?.message]||'La vérification n’a pas abouti. Réessaie la restauration ; ton achat reste à vérifier.';
}
