export function tierCapabilities(tier) {
 const personal=tier==='plus'||tier==='pro';
 return {personal,pro:tier==='pro',inspire:true,scan:true};
}
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
