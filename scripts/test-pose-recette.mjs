import assert from 'node:assert/strict';import fs from 'node:fs';import {createClient} from '@supabase/supabase-js';import {newProject,newPlanItem,newReminder} from '../src/poseCycle/model.js';import {poseRepository} from '../src/poseCycle/repository.js';
const ref='pueqkbwfwxgqzmkauxoz',cfg=JSON.parse(fs.readFileSync('src/cloud/recette-public-config.json')),creds=JSON.parse(fs.readFileSync(process.env.NM_POSE_FIXTURES));
assert.equal(new URL(cfg.VITE_SUPABASE_URL).hostname,ref+'.supabase.co');const clients=[],checks=[];
const ok=(result)=>{assert.ifError(result.error);return result.data;};
async function account(label){const c=createClient(cfg.VITE_SUPABASE_URL,cfg.VITE_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});clients.push(c);const u=ok(await c.auth.signInWithPassword(creds[label])).user;const w=ok(await c.from('workspaces').select('id').eq('owner_user_id',u.id).eq('kind','personal').single());return {c,userId:u.id,workspaceId:w.id,repo:poseRepository(c,{userId:u.id,workspaceId:w.id})};}
let a,b,created=[];
try{a=await account('a');b=await account('b');assert.notEqual(a.userId,b.userId);checks.push('Deux authentifications réelles et espaces personnels distincts');
if(process.env.NM_POSE_STAGE==='ia'){
 const aa=ok(await a.c.rpc('nm_ai_plus_access')),bb=ok(await b.c.rpc('nm_ai_plus_access'));
 assert.equal(aa.allowed,true);assert.equal(aa.visible,true);assert.equal(bb.allowed,false);assert.equal(bb.visible,false);checks.push('IA+ autorisé au compte interne titulaire, masqué pour le second compte');
 const forge=await b.c.schema('private').from('addon_entitlements').insert({user_id:b.userId,feature:'ai_plus',source:'admin',source_ref:'forged',status:'active'});assert.ok(forge.error);checks.push('Attribution IA+ par le client refusée');
}else{
 for(const actor of [a,b]){const p=await actor.repo.create('projects',newProject({...actor,title:'Test isolé lot 1'}));created.push([actor,p]);const plan=await actor.repo.create('plan',newPlanItem(p,{date:'2026-10-10'}));const reminder=await actor.repo.create('reminders',newReminder(plan,{at:'2026-10-09T18:00:00+02:00'}));const other=actor===a?b:a;
 for(const [table,row] of [['pose_projects',p],['pose_plan_items',plan],['pose_reminders',reminder]]){assert.deepEqual(ok(await other.c.from(table).select('*').eq('id',row.id)),[]);const up=await other.c.from(table).update(table==='pose_reminders'?{enabled:false}:{title:'intrusion'}).eq('id',row.id).select('id');assert.ok(up.error||up.data.length===0);const del=await other.c.from(table).delete().eq('id',row.id).select('id');assert.ok(del.error||del.data.length===0);}
 const saved=await actor.repo.save('projects',{...p,title:'Titre repris'});assert.equal((await actor.repo.get('projects',p.id)).title,'Titre repris');await assert.rejects(actor.repo.save('projects',{...p,title:'ancien'}),e=>e.code==='conflict');
 await actor.repo.save('reminders',{...reminder,enabled:false});assert.equal((await actor.repo.get('reminders',reminder.id)).enabled,false);
 await actor.repo.remove('projects',saved);created=created.filter(([,row])=>row.id!==p.id);assert.equal(await actor.repo.get('plan',plan.id),null);assert.equal(await actor.repo.get('reminders',reminder.id),null);}
 checks.push('CRUD, reprise et conflit de révision sur les deux comptes','Projets/planning/rappels : lecture, modification et suppression croisée refusées dans les deux sens','Désactivation des rappels et suppression en cascade vérifiées');
 for(const actor of [a,b]){const access=ok(await actor.c.rpc('nm_ai_plus_access'));assert.equal(access.allowed,false);assert.equal(access.visible,false);}checks.push('IA+ masqué et refusé par défaut pour les deux comptes');
}
fs.writeFileSync('docs/pose-lot2/evidence/recette-'+(process.env.NM_POSE_STAGE||'foundations')+'.json',JSON.stringify({at:new Date().toISOString(),project:ref,realAccounts:2,checks,passed:true},null,2));console.log(JSON.stringify({passed:true,checks}));
}finally{for(const [actor,p] of created)await actor.c.from('pose_projects').delete().eq('id',p.id);for(const c of clients)await c.auth.signOut();}
