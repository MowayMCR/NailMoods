export function needsOnboarding(stored,accountScoped){
 if(stored?.onboarding_completed===false)return true;
 if(stored?.onboarding_completed===true)return false;
 // Existing profiles keep their access. New accounts have only server identity fields.
 const established=['shape','length','technique','level','duration'].some(k=>Object.hasOwn(stored||{},k))||Boolean(stored?.styles?.length);
 return Boolean(accountScoped&&!established);
}
export const preferenceFields=[['shape','Forme'],['length','Longueur'],['level','Niveau'],['duration','Temps'],['technique','Type de pose']];
export function completeOnboarding(profile){return {...profile,onboarding_completed:true,onboarding_step:0,guide_completed:false,guide_pending:true};}
