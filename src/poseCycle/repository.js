import {PoseError,assertPrincipal,validateProject,validatePlanItem,validateReminder} from './model.js';
const TABLES={
 projects:{table:'pose_projects',validate:validateProject,columns:['id','user_id','workspace_id','title','status','source_inspiration_id','journal_entry_id','legacy_key','details']},
 plan:{table:'pose_plan_items',validate:validatePlanItem,columns:['id','user_id','workspace_id','project_id','title','kind','scheduled_on','timezone','starts_at','ends_at','location','notes','status']},
 reminders:{table:'pose_reminders',validate:validateReminder,columns:['id','user_id','workspace_id','plan_item_id','category','scheduled_at','enabled']},
};
const values=(row,fields)=>Object.fromEntries(fields.map(k=>[k,row[k]]));
const checked=async request=>{const {data,error}=await request;if(error)throw new PoseError(error.code||'network',error.code==='42501'?'Cette action n’est pas autorisée.':'La sauvegarde n’a pas abouti. Tes données précédentes sont conservées.');return data;};
// Prepared for application integration after validation/migration; never silently
// falls back to anonymous/local storage on a session, permission or server error.
export function poseRepository(client,{userId,workspaceId}) {
 assertPrincipal({userId,workspaceId});let closed=false;
 const definition=kind=>{if(!TABLES[kind])throw new PoseError('table','Type inconnu.');return TABLES[kind];};
 const scope=kind=>client.from(definition(kind).table);
 async function verify(){if(closed)throw new PoseError('closed','Ce compte est fermé.');const {user}=await checked(client.auth.getUser());if(user?.id!==userId)throw new PoseError('session','La session a changé. Reconnecte-toi.');}
 function validate(kind,row){definition(kind).validate(row);if(row.user_id!==userId||row.workspace_id!==workspaceId)throw new PoseError('owner','Le projet appartient à un autre espace.');}
 const owned=q=>q.eq('user_id',userId).eq('workspace_id',workspaceId);
 async function get(kind,id){await verify();return checked(owned(scope(kind).select('*')).eq('id',id).maybeSingle());}
 async function list(kind){await verify();const rows=[];for(let offset=0;;offset+=100){const page=await checked(owned(scope(kind).select('*')).order('id').range(offset,offset+99));rows.push(...page);if(page.length<100)return rows;}}
 async function create(kind,row){await verify();validate(kind,row);return checked(scope(kind).insert(values(row,definition(kind).columns)).select('*').single());}
 async function save(kind,row){await verify();validate(kind,row);if(!Number.isInteger(row.revision)||row.revision<1)throw new PoseError('revision','Recharge la version enregistrée.');const mutable=definition(kind).columns.filter(k=>!['id','user_id','workspace_id','legacy_key','project_id','plan_item_id'].includes(k));const saved=await checked(owned(scope(kind).update(values(row,mutable))).eq('id',row.id).eq('revision',row.revision).select('*').maybeSingle());if(!saved)throw new PoseError('conflict','Cette fiche a changé ou a été supprimée. Recharge-la avant de réessayer.');return saved;}
 async function remove(kind,row){await verify();validate(kind,row);if(!Number.isInteger(row.revision)||row.revision<1)throw new PoseError('revision','Recharge la version enregistrée.');const saved=await checked(owned(scope(kind).delete()).eq('id',row.id).eq('revision',row.revision).select('id').maybeSingle());if(!saved)throw new PoseError('conflict','Cette fiche a changé ou a été supprimée. Recharge-la avant de réessayer.');return true;}
 async function importLegacy(row){validate('projects',row);if(!row.legacy_key)throw new PoseError('legacy','Référence historique manquante.');await verify();const lookup=()=>checked(owned(scope('projects').select('*')).eq('legacy_key',row.legacy_key).maybeSingle());const existing=await lookup();if(existing){if(row.details.source==='journal'&&!existing.journal_entry_id){return save('projects',{...existing,journal_entry_id:row.journal_entry_id,details:{...existing.details,realizedOn:row.details.realizedOn},status:existing.status==='archived'?'archived':'done'});}return existing;}try{return await create('projects',row);}catch(error){if(error.code!=='23505')throw error;const retry=await lookup();if(!retry)throw error;return retry;}}
 return {get,list,create,save,remove,importLegacy,close(){closed=true;}};
}
