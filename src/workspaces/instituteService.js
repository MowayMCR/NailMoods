const actions=new Set(['invite','accept','decline','revoke','leave','remove','transfer']);
async function checked(request){const {data,error}=await request;if(error)throw error;return data;}
export const instituteError=error=>{
 const message=String(error?.message||'');
 for(const [key,text] of Object.entries({workspace_full:'Toutes les places autorisées sont occupées.',entitlement_inactive:'L’offre de cet Institut est inactive. Les données restent conservées.',invitation_rate_limit:'Trop d’invitations récentes. Réessaie plus tard.',transfer_before_leaving:'Transfère la propriété à un membre avant de quitter cet Institut.',new_owner_pro_required:'Le nouveau propriétaire doit disposer d’un compte Pro.',invitation_not_pending:'Cette invitation a expiré ou a déjà reçu une réponse.',recipient_unavailable:'Cette personne ne peut pas être invitée avec cet identifiant.',invalid_recipient:'Cette personne est déjà membre ou ne peut pas être invitée.',owner_required:'Seule la propriétaire peut effectuer cette action.',invalid_member_role:'Choisis un rôle proposé.'}))if(message.includes(key))return text;
 return 'Cette action n’a pas abouti. Recharge cet espace puis réessaie.';
};
export function instituteService(client){return {
 async list(){return checked(client.from('workspaces').select('id,name,owner_user_id').eq('kind','institute').order('name'));},
 async inbox(){return checked(client.rpc('institute_inbox'));},
 async state(id){return checked(client.rpc('institute_state',{p_workspace_id:id}));},
 async act(action,workspaceId,{targetId=null,invitationId=null,handle=null}={}){
  if(!actions.has(action))throw new Error('Action inconnue.');
  return checked(client.rpc('institute_action',{p_action:action,p_workspace_id:workspaceId,p_target_user_id:targetId,p_invitation_id:invitationId,p_handle:handle}));
 },
 async setRole(workspaceId,targetId,role){return checked(client.rpc('set_institute_member_role',{p_workspace_id:workspaceId,p_target_user_id:targetId,p_role:role}));}
};}
