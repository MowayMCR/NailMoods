export const salonEnabled=()=>import.meta.env?.VITE_SALON_ENABLED==='true';
export function salonService(client){
 const rpc=async(name,args={})=>{const {data,error}=await client.rpc(name,args);if(error)throw error;return data;};
 return {state:()=>rpc('nm_salon_state'),action:(wid,action,source=null,data={})=>rpc('nm_salon_action',{p_workspace_id:wid,p_action:action,p_kind:source?.kind||null,p_content_id:source?.id||null,p_data:data})};
}
export const contributionLabel=status=>({pending:'Envoyée au salon — en attente de validation',published:'Publiée dans la vitrine',rejected:'Proposition refusée',hidden:'Masquée dans la vitrine'})[status]||'Non publiée';
