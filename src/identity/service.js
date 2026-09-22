import {track} from '../analytics/analytics.js';
import { normalizeHandle, handleError } from './handles.js';
async function checked(promise){const {data,error}=await promise;if(error)throw error;return data;}
export function identityService(client){
 return {
  async mine(){
   const {user}=await checked(client.auth.getUser());if(!user)throw new Error('Connexion nécessaire.');
   const profile=await checked(client.from('profiles').select('username,display_name,discovery_visibility').eq('id',user.id).single());
   if(!profile.username){
     const handle='membre.'+user.id.replaceAll('-','').slice(0,20);
     const name=profile.display_name?.trim()||'Membre NailMoods';
     try{await this.save(handle,'everyone',name);return {...profile,username:handle,display_name:name,discovery_visibility:'everyone'};}
     catch(error){if(!/minor_public_profile_forbidden|ACCOUNT_SUSPENDED|confirmed_account_required/.test(error.message||''))throw error;}
   }
   return profile;
 },
  async available(value){const handle=normalizeHandle(value);if(handleError(handle))return false;return checked(client.rpc('nailmoods_handle_available',{p_handle:handle}));},
  async save(value,visibility,displayName){const handle=normalizeHandle(value);const error=handleError(handle);if(error)throw new Error(error);return checked(client.rpc('set_nailmoods_identity',{p_handle:handle,p_visibility:visibility,p_display_name:displayName.trim()}));},
  async search(query,type='',city=''){track('profile_search_started',{});return checked(client.rpc('search_nailmoods',{p_query:query.trim(),p_kind:type||null,p_city:city.trim()||null}));},
 };
}
