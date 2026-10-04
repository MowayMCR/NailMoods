import {mobileAppId} from '../platform/authLinks.js';
export const projectIdValid=id=>typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
export function projectLink(id,environment){if(!projectIdValid(id)||!mobileAppId(environment))throw Error('Lien de projet invalide.');return `${mobileAppId(environment)}://pose/${id}`;}
export function parseProjectLink(value,environment){try{const u=new URL(value),id=u.pathname.slice(1);return u.protocol===mobileAppId(environment)+':'&&u.hostname==='pose'&&!u.username&&!u.password&&!u.port&&!u.search&&!u.hash&&projectIdValid(id)?id:null;}catch{return null;}}
let pending=null;
export function queueProjectLink(url,environment){const id=parseProjectLink(url,environment);if(!id)return false;pending={id};globalThis.window?.dispatchEvent(new Event('nm-project-link'));return true;}
export function queueNotificationLink(extra){if(extra?.scope!=='pose-planning'||!projectIdValid(extra.projectId)||!projectIdValid(extra.userId))return false;pending={id:extra.projectId,userId:extra.userId};globalThis.window?.dispatchEvent(new Event('nm-project-link'));return true;}
export function takeProjectLink(userId){if(!userId||!pending)return null;const value=pending;pending=null;return !value.userId||value.userId===userId?value.id:null;}
