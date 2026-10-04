import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {setup,login,insert,A,B,C,WA,WB} from './helpers/pose-db.js';
import {newProject,newPlanItem,newReminder} from '../src/poseCycle/model.js';
const fresh=()=>newProject({userId:A,workspaceId:WA});
const withDB=fn=>async()=>{const db=await setup();try{await fn(db);}finally{await db.close();}};
test('SQL: own project CRUD, revision conflict, historical import uniqueness and immutable ownership',withDB(async db=>{
 await login(db);const p=await insert(db,'pose_projects',{...fresh(),legacy_key:'journal:old'});assert.equal(p.revision,1);
 assert.equal((await db.query('select * from pose_projects')).rows.length,1);
 await assert.rejects(insert(db,'pose_projects',{...fresh(),legacy_key:'journal:old'}),e=>e.code==='23505');
 await assert.rejects(db.query('update pose_projects set user_id=$1 where id=$2',[B,p.id]),e=>e.code==='23514');
 const updated=(await db.query("update pose_projects set title='Modifié' where id=$1 and revision=1 returning *",[p.id])).rows[0];assert.equal(updated.revision,2);
 assert.equal((await db.query("update pose_projects set title='Écrasé' where id=$1 and revision=1 returning *",[p.id])).rows.length,0);
 await db.query('delete from pose_projects where id=$1 and revision=2',[p.id]);assert.equal((await db.query('select * from pose_projects')).rows.length,0);
}));
test('SQL: all three tables reject peer/anonymous writes and reads; project deletion cascades planning/reminders',withDB(async db=>{
 await login(db);const p=await insert(db,'pose_projects',fresh());const plan=await insert(db,'pose_plan_items',newPlanItem(p,{date:'2026-10-25'}));const reminder=await insert(db,'pose_reminders',newReminder(plan,{at:'2026-10-24T10:00:00Z'}));
 await login(db,B);
 for(const [table,row] of [['pose_projects',p],['pose_plan_items',plan],['pose_reminders',reminder]]){
  assert.equal((await db.query('select * from '+table)).rows.length,0);
  assert.equal((await db.query('update '+table+' set updated_at=now() where id=$1 returning id',[row.id])).rows.length,0);
  assert.equal((await db.query('delete from '+table+' where id=$1 returning id',[row.id])).rows.length,0);
  await assert.rejects(insert(db,table,{...row,id:crypto.randomUUID()}),e=>e.code==='42501');
 }
 await assert.rejects(insert(db,'pose_plan_items',{...plan,id:crypto.randomUUID(),user_id:B,workspace_id:WB}),e=>e.code==='23503');
 await assert.rejects(insert(db,'pose_reminders',{...reminder,id:crypto.randomUUID(),user_id:B,workspace_id:WB}),e=>e.code==='23503');
 await login(db,null,'anon');for(const table of ['pose_projects','pose_plan_items','pose_reminders'])for(const verb of ['select * from','delete from'])await assert.rejects(db.query(`${verb} ${table}`),e=>e.code==='42501');
 await login(db);await db.query('delete from pose_projects where id=$1',[p.id]);assert.equal((await db.query('select * from pose_plan_items')).rows.length,0);assert.equal((await db.query('select * from pose_reminders')).rows.length,0);
}));
test('SQL: explicit dates/DST, canceled actions, reminder edits and invalid media are checked',withDB(async db=>{
 await login(db);const p=await insert(db,'pose_projects',fresh());
 const plan=await insert(db,'pose_plan_items',newPlanItem(p,{date:'2026-10-25',startsAt:'2026-10-25T02:30:00+02:00'}));
 await db.query("update pose_plan_items set starts_at='2026-10-25T02:30:00+01:00',status='canceled' where id=$1",[plan.id]);
 await assert.rejects(db.query("update pose_plan_items set timezone='Mars/Unknown' where id=$1",[plan.id]),e=>e.code==='23514');
 await assert.rejects(db.query("update pose_plan_items set scheduled_on='2026-10-26' where id=$1",[plan.id]),e=>e.code==='23514');
 const r=await insert(db,'pose_reminders',newReminder(plan,{at:'2026-10-24T09:00:00Z'}));await db.query('update pose_reminders set enabled=false where id=$1',[r.id]);await db.query('delete from pose_reminders where id=$1',[r.id]);
 await assert.rejects(db.query("update pose_projects set status='done' where id=$1",[p.id]),e=>e.code==='23514');
 await assert.rejects(db.query("update pose_projects set details=jsonb_set(details,'{referenceMedia}','[\"https://private\"]') where id=$1",[p.id]),e=>e.code==='23514');
}));
test('SQL: source links cannot point into another account and Journal rows are never rewritten',withDB(async db=>{
 await db.query('insert into inspirations(id,workspace_id,created_by) values($1,$2,$3)',[C,WB,B]);await db.query("insert into journal_entries(id,workspace_id,created_by,performed_on,snapshot) values($1,$2,$3,'2026-09-28','{\"photo\":\"private\"}')",[A,WA,A]);
 const before=JSON.stringify((await db.query('select * from journal_entries')).rows);
 await login(db);await assert.rejects(insert(db,'pose_projects',{...fresh(),source_inspiration_id:C}),e=>e.code==='42501');const p=await insert(db,'pose_projects',{...fresh(),journal_entry_id:A});await db.query('delete from pose_projects where id=$1',[p.id]);
 await db.exec('reset role');assert.equal(JSON.stringify((await db.query('select * from journal_entries')).rows),before);
}));
test('SQL: IA+ independent from Free/Plus/Pro and manual/store rights, hidden until internal flag AND entitlement',withDB(async db=>{
 const before=JSON.stringify((await db.query('select * from private.account_entitlements order by user_id')).rows);
 await db.query("insert into private.addon_internal_accounts values($1)",[A]);
 await login(db);assert.equal((await db.query('select nm_ai_plus_access() access')).rows[0].access.allowed,false);
 await db.exec("reset role;update private.addon_feature_flags set enabled=true");
 await login(db);assert.deepEqual((await db.query('select nm_ai_plus_access() access')).rows[0].access,{visible:true,allowed:false,reason:'entitlement_required'});
 for(const id of [A,B,C]){
  await db.exec('reset role');await db.query("insert into private.addon_entitlements(user_id,feature,source,source_ref,status) values($1,'ai_plus','beta','lot1','active')",[id]);
  await db.query('insert into private.addon_internal_accounts values($1) on conflict do nothing',[id]);await login(db,id);
  assert.equal((await db.query('select nm_ai_plus_access() access')).rows[0].access.allowed,true);
  for(const table of ['addon_entitlements','addon_feature_flags','addon_internal_accounts'])await assert.rejects(db.query('select * from private.'+table),e=>e.code==='42501');
  await assert.rejects(db.query("update private.addon_feature_flags set public_enabled=true"),e=>e.code==='42501');
 }
 await db.exec('reset role');assert.equal(JSON.stringify((await db.query('select * from private.account_entitlements order by user_id')).rows),before);
 await db.query('delete from private.addon_internal_accounts where user_id=$1',[B]);await login(db,B);assert.equal((await db.query('select nm_ai_plus_access() access')).rows[0].access.visible,false);
 await db.exec('reset role');await db.query("update private.addon_entitlements set expires_at=now()-interval '1 day',starts_at=now()-interval '2 days' where user_id=$1",[A]);await login(db,A);assert.equal((await db.query('select nm_ai_plus_access() access')).rows[0].access.allowed,false);
 await db.exec("reset role;update private.addon_feature_flags set enabled=false");await login(db,C);assert.equal((await db.query('select nm_ai_plus_access() access')).rows[0].access.allowed,false);
}));
test('SQL: suspension/confirmation guards and existing photo-project rights cannot be bypassed by IA+',withDB(async db=>{
 await login(db);const p=await insert(db,'pose_projects',fresh());
 await assert.rejects(insert(db,'pose_projects',{...fresh(),details:{...fresh().details,source:'outfit'}}),e=>e.code==='42501');
 await db.exec('reset role');await db.query('insert into private.blocked values($1)',[A]);await login(db);
 assert.equal((await db.query('select * from pose_projects')).rows.length,0);await assert.rejects(db.query('select nm_ai_plus_access()'),e=>e.code==='42501');
 await db.exec('reset role');await db.query('delete from private.blocked where user_id=$1',[A]);await db.query('update auth.users set email_confirmed_at=null where id=$1',[A]);await login(db);
 assert.equal((await db.query('select * from pose_projects')).rows.length,0);await assert.rejects(db.query('select nm_ai_plus_access()'),e=>e.code==='42501');
 await db.exec('reset role');await db.query('delete from auth.users where id=$1',[A]);assert.equal((await db.query('select * from pose_projects where id=$1',[p.id])).rows.length,0);
}));
test('SQL: anonymous inserts/updates fail, private grants cannot be forged, revoked/future grants deny access',withDB(async db=>{
 await login(db,null,'anon');await assert.rejects(insert(db,'pose_projects',fresh()),e=>e.code==='42501');
 for(const table of ['pose_projects','pose_plan_items','pose_reminders'])await assert.rejects(db.query('update '+table+' set updated_at=now()'),e=>e.code==='42501');
 await db.exec('reset role');await db.query('insert into private.support_staff values($1)',[A]);await db.exec('update private.addon_feature_flags set enabled=true');await login(db);
 assert.equal((await db.query('select nm_ai_plus_access() access')).rows[0].access.allowed,false);
 await assert.rejects(db.query("insert into private.addon_entitlements(user_id,feature,source,source_ref,status) values($1,'ai_plus','admin','forged','active')",[A]),e=>e.code==='42501');
 await db.exec('reset role');await db.query("insert into private.addon_entitlements(user_id,feature,source,source_ref,status) values($1,'ai_plus','admin','test','revoked')",[A]);await login(db);assert.equal((await db.query('select nm_ai_plus_access() access')).rows[0].access.allowed,false);
 await db.exec("reset role;update private.addon_entitlements set status='active',starts_at=now()+interval '1 day'");await login(db);assert.equal((await db.query('select nm_ai_plus_access() access')).rows[0].access.allowed,false);
}));
test('SQL: local catalog security checks and rollback preserve the old schema',withDB(async db=>{
 const names=['pose_projects','pose_plan_items','pose_reminders','addon_entitlements','addon_feature_flags','addon_internal_accounts'];
 const rows=(await db.query('select relname,relrowsecurity from pg_class where relname=any($1)',[names])).rows;assert.equal(rows.length,6);assert.ok(rows.every(r=>r.relrowsecurity));
 assert.equal((await db.query("select has_function_privilege('anon','public.nm_ai_plus_access()','execute') allowed")).rows[0].allowed,false);
 assert.equal((await db.query("select has_table_privilege('authenticated','private.addon_entitlements','insert') allowed")).rows[0].allowed,false);
 const sql=readFileSync(new URL('../docs/pose-foundations/ROLLBACK.sql',import.meta.url),'utf8');await db.exec(sql);assert.equal((await db.query("select to_regclass('public.pose_projects') gone")).rows[0].gone,null);assert.equal((await db.query('select count(*) n from private.account_entitlements')).rows[0].n,3);
}));
