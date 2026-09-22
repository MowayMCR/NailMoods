import {APP_VERSION,platformLabel,safeDiagnostics} from './diagnostics.js';
export async function supportCall(client,action,data={}){
 if(action==='review'){const r=await client.rpc('nm_support_review_v3',{p_kind:data.kind,p_id:data.id,p_status:data.status,p_priority:data.priority||'normal',p_reply:data.reply||'',p_internal_note:data.internalNote||''});if(r.error)throw r.error;return r.data;}
 if(action==='queue'){const r=await client.rpc('nm_support_queue_v3',{p_status:data.status||null,p_priority:data.priority||null,p_kind:data.kind||null,p_offset:data.offset||0});if(r.error)throw r.error;return r.data;}
 if(action==='history'){const r=await client.rpc('nm_support_history',{p_kind:data.kind,p_id:data.id});if(r.error)throw r.error;return r.data;}
 if(action==='withdrawPublic'){const r=await client.rpc('nm_support_moderate_v3',{p_report_id:data.id,p_action:'withdraw_public_content'});if(r.error)throw r.error;return r.data;}
 if(action==='accountRestriction'){const r=await client.rpc('nm_support_suspend_account_v3',{p_report_id:data.id,p_action:data.action});if(r.error)throw r.error;return r.data;}
 const r=await client.rpc('nm_support',{p_action:action,p_data:data});if(r.error)throw r.error;return r.data;
}
export async function safetyCall(client,action,data={}){const r=await client.rpc('nm_safety',{p_action:action,p_data:data});if(r.error)throw r.error;return r.data;}
export function ticketPayload({id,category,description,screen,diagnostics=[],attachment=null},env='recette',ua=''){
 return {client_id:id,category,description:description.trim(),screen:['home','create','collection','journal','profile','help'].includes(screen)?screen:'other',diagnostics:safeDiagnostics(diagnostics),attachment,app_version:APP_VERSION,environment:env,platform:platformLabel(ua)};
}
export const ticketStatus={new:'Nouveau',under_review:'En cours',waiting_info:'En attente d’information',resolved:'Résolu',dismissed:'Rejeté / sans suite'};
export function supportError(error){const m=error?.message||'';return m.includes('rate_limit')?'Tu as déjà envoyé plusieurs demandes. Réessaie dans une heure.':m.includes('confirmed_account')?'Confirme ton adresse email puis reconnecte-toi.':'L’envoi n’est pas confirmé. Ton texte est conservé ; réessaie avec ce même dossier.';}
