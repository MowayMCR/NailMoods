export function tierCapabilities(tier) {
 const personal=tier==='plus'||tier==='pro';
 return {personal,pro:tier==='pro',inspire:true,scan:true};
}
export const ACCOUNT_OFFERS=Object.freeze([
 {tier:'free',name:'Free',tagline:'Découvrir NailMoods',features:['Scan & Génère','Inspiration simple','Navigation et découverte']},
 {tier:'plus',name:'Plus',tagline:'Garder tout mon univers',features:['Collection synchronisée','Journal et favoris','Produits et inspirations sauvegardés']},
 {tier:'pro',name:'Pro',tagline:'Créer mon espace professionnel',features:['Profil Pro et espace professionnel','Collection / nuancier Pro','Partages et futurs échanges avec les comptes Plus']},
]);
export function normalizeAccountTier(value){return ['free','plus','pro'].includes(value)?value:'free';}
export function accountOfferService(client){
 const read=async request=>{const {data,error}=await request;if(error)throw error;return data;};
 return {
  state:()=>read(client.rpc('account_offer_state')),
  choose(tier){
   const safe=normalizeAccountTier(tier);
   if(safe!==tier)throw new Error('Niveau invalide.');
   return read(client.rpc('choose_beta_account_tier',{p_tier:safe}));
  },
 };
}
export const PENDING_ACCOUNT_OFFER_KEY='nm-pending-account-offer-v1';
export function rememberPendingAccountOffer(storage,userId,tier){
 const safe=normalizeAccountTier(tier);
 if(!userId||safe!==tier)return false;
 try{storage.setItem(PENDING_ACCOUNT_OFFER_KEY,JSON.stringify({userId,tier:safe}));return true;}catch{return false;}
}
export function pendingAccountOffer(storage,userId){
 try{const value=JSON.parse(storage.getItem(PENDING_ACCOUNT_OFFER_KEY));return value?.userId===userId&&normalizeAccountTier(value.tier)===value.tier?value:null;}catch{return null;}
}
export function clearPendingAccountOffer(storage){try{storage.removeItem(PENDING_ACCOUNT_OFFER_KEY);return true;}catch{return false;}}
export function betaTierService(client) {
 const read=async request=>{const {data,error}=await request;if(error)throw error;return data;};
 return {
  state:()=>read(client.rpc('beta_tier_state')),
  apply(tier){
   if(!['free','plus','pro'].includes(tier))throw new Error('Niveau invalide.');
   return read(client.rpc('apply_beta_tier',{p_tier:tier}));
  }
 };
}
