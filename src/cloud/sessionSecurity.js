export const SESSION_REPLACED_MESSAGE='Votre compte a été ouvert sur un autre appareil. Veuillez vous reconnecter pour continuer ici.';
export function isReplacedSession(error){return /SESSION_REPLACED/.test(String(error?.message||error?.error||''));}
export async function checkActiveSession(client){const {data,error}=await client.rpc('nm_session_check');if(error)throw error;return data;}
// A network failure is not evidence of a second device. Never erase local drafts.
export function watchActiveSession(client,{onReplaced,onOffline=()=>{},intervalMs=30000,target=window}={}){
 let disposed=false,busy=false,revoked=false;
 const check=async()=>{if(disposed||busy||revoked)return;busy=true;try{await checkActiveSession(client);}catch(error){if(isReplacedSession(error)){revoked=true;await onReplaced?.();}else onOffline(error);}finally{busy=false;}};
 const visible=()=>{if(target.document?.visibilityState!=='hidden')void check();};
 const native=e=>{if(e.detail?.isActive)void check();};
 const timer=setInterval(check,intervalMs);target.addEventListener('focus',check);target.addEventListener('online',check);target.addEventListener('nm-native-state',native);target.addEventListener('nm-session-replaced',check);target.document?.addEventListener('visibilitychange',visible);void check();
 return()=>{disposed=true;clearInterval(timer);target.removeEventListener('focus',check);target.removeEventListener('online',check);target.removeEventListener('nm-native-state',native);target.removeEventListener('nm-session-replaced',check);target.document?.removeEventListener('visibilitychange',visible);};
}
export async function revokeOtherSessions(client){const {error}=await client.rpc('nm_session_revoke_others');if(error)throw error;const {error:authError}=await client.auth.signOut({scope:'others'});if(authError)throw authError;}
