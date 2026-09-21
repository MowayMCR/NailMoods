import {track} from '../analytics/analytics.js';
import { normalizeHandle, handleError } from './handles.js';
async function checked(promise){const {data,error}=await promise;if(error)throw error;return data;}
export function identityService(client){
 return {
  async mine(){const {user}=await checked(client.auth.getUser());if(!user)throw new Error('Connexion nécessaire.');return checked(client.from('profiles').select('username,display_name,discovery_visibility').eq('id',user.id).single());},
  async available(value){const handle=normalizeHandle(value);if(handleError(handle))return false;return checked(client.rpc('nailmoods_handle_available',{p_handle:handle}));},
  async save(value,visibility,displayName){const handle=normalizeHandle(value);const error=handleError(handle);if(error)throw new Error(error);return checked(client.rpc('set_nailmoods_identity',{p_handle:handle,p_visibility:visibility,p_display_name:displayName.trim()}));},
  async search(query,type='',city=''){track('profile_search_started',{});return checked(client.rpc('search_nailmoods',{p_query:query.trim(),p_kind:type||null,p_city:city.trim()||null}));},
 };
}
