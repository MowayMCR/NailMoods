import {track} from '../analytics/analytics.js';
import {mobileAppId} from '../platform/authLinks.js';
import {projectIdValid} from './projectLinks.js';
export function poseShareLink(id,{environment='recette',native=false,webBase}={}){
 if(!projectIdValid(id))throw Error('Fiche partagée invalide.');
 if(native){const scheme=mobileAppId(environment);if(!scheme)throw Error('Environnement inconnu.');return `${scheme}://share/${id}`;}
 const url=new URL(webBase);if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Adresse web invalide.');url.search='';url.hash='partage/'+id;return url.href;
}
export function parsePoseShareLink(value,environment){try{const scheme=mobileAppId(environment);if(!scheme)return null;const u=new URL(value),id=u.pathname.slice(1);return u.protocol===scheme+':'&&u.hostname==='share'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&projectIdValid(id)?id:null;}catch{return null;}}
let pending=null;
export function rememberPoseShare(id){if(!projectIdValid(id))return false;pending=id;return true;}
export function queuePoseShareLink(url,environment){const id=parsePoseShareLink(url,environment);if(!rememberPoseShare(id))return false;globalThis.window?.dispatchEvent(new Event('nm-pose-share-link'));return true;}
export function takePoseShareLink(userId){if(!userId||!pending)return null;const id=pending;pending=null;return id;}
export function shareFailure(error){return /PROJECT_CHANGED/.test(error?.message||'')?'Le projet a changé. Recharge sa fiche et vérifie le nouvel aperçu avant l’envoi.':'Cette fiche ou ce partage n’est pas accessible. Vérifie ta connexion, vos droits et votre relation NailMoods.';}
export function projectShareService(client){const call=async(name,args)=>{const {data,error}=await client.rpc(name,args);if(error)throw error;return data;};return {
 preview:(id,notes=false,images=false)=>call('pose_share_preview',{p_project_id:id,p_include_notes:notes,p_include_images:images}),
 send:async({id,revision,recipient,clientId,notes=false,images=false})=>{const shareId=await call('send_pose_project_to_po',{p_project_id:id,p_revision:revision,p_recipient_workspace_id:recipient,p_client_id:clientId,p_include_notes:notes,p_include_images:images});track('share_to_pro_sent',{});return shareId;},
 list:id=>call('pose_project_shares',{p_project_id:id}),revoke:id=>call('revoke_pose_share',{p_share_id:id}),detail:id=>call('nm_share_detail',{p_id:id}),
};}
