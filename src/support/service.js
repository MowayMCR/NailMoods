import {APP_VERSION,platformLabel,safeDiagnostics} from './diagnostics.js';
export async function supportCall(client,action,data={}){const r=await client.rpc('nm_support',{p_action:action,p_data:data});if(r.error)throw r.error;return r.data;}
export async function safetyCall(client,action,data={}){const r=await client.rpc('nm_safety',{p_action:action,p_data:data});if(r.error)throw r.error;return r.data;}
export function ticketPayload({id,category,description,screen,diagnostics=[],attachment=null},env='recette',ua=''){
 return {client_id:id,category,description:description.trim(),screen:['home','create','collection','journal','profile','help'].includes(screen)?screen:'other',diagnostics:safeDiagnostics(diagnostics),attachment,app_version:APP_VERSION,environment:env,platform:platformLabel(ua)};
}
export const ticketStatus={new:'Reçu',under_review:'En cours',resolved:'Résolu',dismissed:'Clôturé'};
export function supportError(error){const m=error?.message||'';return m.includes('rate_limit')?'Tu as déjà envoyé plusieurs demandes. Réessaie dans une heure.':m.includes('confirmed_account')?'Confirme ton adresse email puis reconnecte-toi.':'L’envoi n’est pas confirmé. Ton texte est conservé ; réessaie avec ce même dossier.';}
