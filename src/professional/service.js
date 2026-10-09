import {validateImage} from '../cloud/mediaStorage.js';
export function proService(client){const rpc=async(name,args={})=>{const {data,error}=await client.rpc(name,args);if(error)throw error;return data;};return {
 state:()=>rpc('nm_pro_state'),save:(id,data)=>rpc('nm_pro_save',{p_workspace_id:id,p_data:data}),
 item:(wid,id,kind,data)=>rpc('nm_pro_item',{p_workspace_id:wid,p_id:id,p_kind:kind,p_data:data}),
 team:(wid,action,data={})=>rpc('nm_pro_team',{p_workspace_id:wid,p_action:action,p_data:data}),
 portfolio:(wid,kind,id,enabled,productId=null)=>rpc('nm_pro_portfolio',{p_workspace_id:wid,p_kind:kind,p_content_id:id,p_product_id:productId,p_enabled:enabled}),
 search:(query='',type='',city='')=>rpc('nm_pro_search',{p_query:query,p_type:type,p_city:city}),
 async upload(userId,workspaceId,file){validateImage(file);const ext={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'}[file.type];const path=`${userId}/${workspaceId}/${crypto.randomUUID()}.${ext}`;const {error}=await client.storage.from('nailmoods-pro').upload(path,file,{upsert:false,contentType:file.type});if(error)throw error;return path;},
 async image(path){const {data,error}=await client.storage.from('nailmoods-pro').download(path);if(error)throw error;return URL.createObjectURL(data);}
};}
export const proV2Enabled=()=>import.meta.env?.VITE_PRO_V2_ENABLED==='true';
