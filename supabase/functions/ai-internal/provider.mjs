export const FEATURES=['analyzeOutfit','analyzeInspiration','generateTryOn','generateVariation','analyzeHand'];
// Provider boundary: production credentials, prices and network providers are intentionally absent.
// This adapter validates the full internal circuit and explicitly returns no generated media.
export function createAIService(){return Object.fromEntries(FEATURES.map(feature=>[feature,async({project})=>({experimental:true,generated:false,feature,projectId:project.id,message:'Circuit interne validé. Aucun rendu IA ni analyse de photo effectué.',next:'provider_quality_validation_required'})]));}
export function validRequest(body){return body&&FEATURES.includes(body.feature)&&[body.requestId,body.projectId].every(v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))&&Object.keys(body).every(k=>['feature','requestId','projectId'].includes(k));}
