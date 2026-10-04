export const AI_FEATURES=Object.freeze(['analyzeOutfit','analyzeInspiration','generateTryOn','generateVariation','analyzeHand']);
// UI projection only. The independent server entitlement remains authoritative.
export const AI_PLUS_PUBLIC_ENABLED=false;
export async function readAIPlusAccess(client) {
 const {data,error}=await client.rpc('nm_ai_plus_access');
 if(error){if(error.code==='PGRST202')return {visible:false,allowed:false,reason:'not_deployed'};throw error;}
 return {visible:data?.visible===true,allowed:data?.allowed===true,reason:typeof data?.reason==='string'?data.reason:'disabled'};
}
export function publicAIEntryVisible(access) {return AI_PLUS_PUBLIC_ENABLED&&access?.visible===true;}
// No provider, pricing, SKU, credential or render endpoint in lot 1.
