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
export async function appleContext(client, refresh=false, store=AppleBilling) {
  // Refresh reloads prices/server eligibility, never Apple credentials.
  const {environment}=await store.getEnvironment();
  if(!['Sandbox','Production'].includes(environment))throw Error('local_storekit_not_server_verifiable');
  return appleRequest(client,{action:'prepare',environment});
}
export function applePurchaseBlocker(context, state) {
  if(state?.instituteActive)return 'salon_entitlement_active';
  if(state?.manualPriority||context?.manualPriority)return 'manual_entitlement_active';
  if(!context)return null; // A failed prepare is reported by loadAppleOffers.
  if(!context.enabled)return 'billing_not_configured';
  if(context.otherProviderActive)return 'other_subscription_active';
  if(context.environment==='Sandbox'&&context.sandboxEnabled!==true)return 'sandbox_account_required';
  if(!context.canPurchase)return 'billing_ineligible';
  return null;
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
export async function verifyApplePurchase(client, transaction, environment, store=AppleBilling) {
  if(!['Sandbox','Production'].includes(environment)||transaction.environment&&transaction.environment!==environment)throw Error('purchase_environment_mismatch');
  const result=await appleRequest(client,{signedTransaction:transaction.signedTransaction,environment});
  if(!result.ok||!result.entitlement)throw Error('verification_unavailable');
  await store.finish({transactionId:transaction.transactionId});
  return result;
}
export async function purchaseAppleTier(client,tier,displayed,{store=AppleBilling,contextLoader=appleContext,isIOS=isAppleIOS}={}) {
  if(!isIOS()||displayed?.productId!==APPLE_PRODUCTS[tier])throw Error('product_unavailable');
  const rights=await readBillingEntitlement(client);if(rights?.instituteActive)throw Error('salon_entitlement_active');
  const context=await contextLoader(client);
  const blocker=applePurchaseBlocker(context,rights);if(blocker)throw Error(blocker);
  if(!context?.enabled||!context?.canPurchase)throw Error('verification_unavailable');
  const current=(await store.getProducts()).products.find(p=>p.productId===displayed.productId);
  if(!current||current.formattedPrice!==displayed.formattedPrice||current.periodUnit!==displayed.periodUnit||current.periodValue!==displayed.periodValue)throw Error('price_changed');
  const result=await store.purchase({productId:displayed.productId,accountToken:context.accountToken});
  if(result.state==='canceled'||result.state==='pending')return result;
  return {state:'verified',...await verifyApplePurchase(client,result.transaction,context.environment,store)};
}
export async function reconcileApple(client, restore=false,{store=AppleBilling,contextLoader=appleContext}={}) {
  const context=await contextLoader(client);if(!context.enabled)throw Error('billing_not_configured');
  const result=restore?await store.restorePurchases():await store.unfinishedPurchases();
  let failed=0;
  for(const tx of result.transactions||[])try{await verifyApplePurchase(client,tx,context.environment,store);}catch{failed++;}
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
  return ({environment_unavailable:'Apple ne renvoie pas l’environnement de cette application. Actualiser les offres recharge les prix et les droits sans demander de connexion Apple.',app_not_verified:'Apple n’a pas confirmé les informations de cette application. Réessaie plus tard.',product_unavailable:'Apple ne renvoie pas encore les offres Plus et Pro. Leur configuration App Store reste à vérifier.',local_storekit_not_server_verifiable:'Les achats locaux Xcode ne peuvent pas être vérifiés par le serveur.',billing_not_configured:'Les abonnements Apple ne sont pas encore ouverts.',manual_entitlement_active:'Ton accès est déjà offert par NailMoods.',
    salon_entitlement_active:'Ton accès Pro est inclus dans ton salon. Aucun second abonnement n’est nécessaire.',other_subscription_active:'Ton offre est déjà active sur ton compte.',billing_ineligible:'Dans Profil → Confidentialité, confirme les Conditions d’utilisation actuelles et ta majorité, puis actualise les offres. Si le blocage persiste, contacte contact@nailmoods.com.',sandbox_account_required:'Ce compte NailMoods n’est pas encore autorisé pour les achats de test. Contacte contact@nailmoods.com.',purchase_environment_mismatch:'Cet achat ne correspond pas à l’environnement de test de cette application. Aucun droit n’a été attribué.',
    price_changed:'Le prix a changé. Actualise les offres avant de confirmer.',purchase_account_mismatch:'Cet achat appartient à un autre compte NailMoods. Reconnecte-toi au compte utilisé pour l’achat.'})[error?.message]||'La connexion aux abonnements a échoué. Actualise les offres. Tes accès actuels sont conservés.';
}
