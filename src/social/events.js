import { TECHNOLOGIES, permissions } from '../privacy/policy.js';
export const SOCIAL_EVENTS=Object.freeze(['connection_request_sent','connection_request_accepted','connection_removed','message_sent','content_shared','shared_to_pro','favorite_added','favorite_removed','project_created','project_sent_to_pro','project_completed']);
// Disabled until the existing consented analytics transport is available in Recette.
// Explicitly never accepts a message, handle, project title, image or free text.
export function socialEvent(event,{consent,tier,transport}={}) {
 if(!SOCIAL_EVENTS.includes(event)||!TECHNOLOGIES.analytics||!permissions({consent,tier}).analytics||typeof transport!=='function')return false;
 Promise.resolve().then(()=>transport({event,metadata:{},occurred_at:new Date().toISOString()})).catch(()=>{});return true;
}
