// Keep older pages when the newest page is refreshed. Deduplicate retries/polling.
export function mergeMessages(previous,incoming) {
 const merged=new Map(previous.map(message=>[message.id,message]));
 for(const message of incoming)merged.set(message.id,message);
 return [...merged.values()].sort((a,b)=>b.created_at.localeCompare(a.created_at)||b.id.localeCompare(a.id));
}
export function notificationLabel(kind) {
 return ({connection_request:'Demande de connexion reçue',connection_accepted:'Connexion acceptée',message_request:'Mise à jour d’une connexion',message:'Nouveau message',inspiration:'Inspiration ou projet partagé',institute_invitation:'Invitation à un institut',workspace_membership:'Équipe mise à jour'})[kind]||'Nouvelle notification';
}
export function messageId(cryptoApi=globalThis.crypto) {
 if(cryptoApi.randomUUID)return cryptoApi.randomUUID();
 const bytes=cryptoApi.getRandomValues(new Uint8Array(16));
 bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const h=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
