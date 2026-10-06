export const FEATURES=['analyzeOutfit','analyzeInspiration','generateTryOn','generateVariation','analyzeHand'];
// Existing no-cost contract remains available independently of the paid image adapter.
export function createAIService(){return Object.fromEntries(FEATURES.map(feature=>[feature,async({project})=>({experimental:true,generated:false,feature,projectId:project.id,message:'Circuit interne validé. Aucun rendu IA ni analyse de photo effectué.',next:'provider_quality_validation_required'})]));}
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function validRequest(body){
 if(!body||typeof body!=='object'||Array.isArray(body))return false;
 if(['read','delete'].includes(body.action))return uuid(body.jobId)&&Object.keys(body).every(k=>['action','jobId'].includes(k));
 return FEATURES.includes(body.feature)&&[body.requestId,body.projectId].every(uuid)&&Object.keys(body).every(k=>['feature','requestId','projectId','referenceImage'].includes(k))&&(!('referenceImage' in body)||(body.feature==='generateVariation'&&typeof body.referenceImage==='string'&&body.referenceImage.startsWith('data:image/png;base64,')&&body.referenceImage.length<=1_400_000));
}
