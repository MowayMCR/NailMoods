import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setup,login,rpc,draft,A,B,C} from './helpers/pro-db.js';
const permissions=readFileSync(new URL('../supabase/migrations/20261009102000_salon_publication_permissions.sql',import.meta.url),'utf8');
const migration=readFileSync(new URL('../supabase/migrations/20261009074158_salon_collaborative_portfolio.sql',import.meta.url),'utf8');
test('Salon consent, moderation, credit, privacy, expiry and departure preserve personal creations',async()=>{
 const db=await setup();try{
 await db.exec(migration);await db.exec(permissions);await login(db,A);const wid=await rpc(db,'nm_pro_save',[null,draft()]);
 await assert.rejects(rpc(db,'nm_pro_team',[wid,'invite',{handle:'artist.b'}]),/workspace_full/);
 await db.exec('reset role');await db.query('update workspace_entitlements set seat_limit=2 where workspace_id=$1',[wid]);
 await login(db,A);const invite=await rpc(db,'nm_pro_team',[wid,'invite',{handle:'artist.b'}]);
 await login(db,C);await assert.rejects(rpc(db,'nm_pro_team',[wid,'accept',{invitationId:invite.invitation_id}]),/invitation_unavailable/);
 await login(db,B);await rpc(db,'nm_pro_team',[wid,'accept',{invitationId:invite.invitation_id}]);
 await db.exec('reset role');const cid=(await db.query("insert into journal_entries(created_by,visibility,performed_on,snapshot) values($1,'public',current_date,$2) returning id",[B,{id:'local-pose',title:'Pose B',notes:'NEVER PUBLIC',idea:{title:'French'}}])).rows[0].id;
 await login(db,A);await rpc(db,'nm_salon_action',[wid,'member_permission',null,null,{userId:B,canPublish:false}]);
 await login(db,B);await assert.rejects(rpc(db,'nm_salon_action',[wid,'submit','journal',cid,{}]),/publication_not_allowed/);
 await login(db,A);await rpc(db,'nm_salon_action',[wid,'member_permission',null,null,{userId:B,canPublish:true}]);
 await login(db,B);assert.equal((await rpc(db,'nm_salon_action',[wid,'submit','journal',cid,{caption:'French rose'}])).status,'pending');
 await assert.rejects(rpc(db,'nm_salon_action',[wid,'approve','journal',cid,{}]),/owner_required/);
 assert.equal((await rpc(db,'nm_pro_public',['studio.a'])).professional.portfolio.length,0);
 await login(db,A);await rpc(db,'nm_salon_action',[wid,'approve','journal',cid,{}]);
 let pub=await rpc(db,'nm_pro_public',['studio.a']);assert.equal(pub.professional.portfolio[0].authorHandle,'artist.b');assert.equal(pub.professional.portfolio[0].caption,'French rose');assert.ok(!JSON.stringify(pub).includes('NEVER PUBLIC'));
 await db.exec('reset role');await db.query("update journal_entries set visibility='private' where id=$1",[cid]);
 await login(db,A);assert.equal((await rpc(db,'nm_pro_public',['studio.a'])).professional.portfolio.length,0);assert.equal((await rpc(db,'nm_salon_state')).spaces[0].contributions.length,0);
 await db.exec('reset role');await db.query("update journal_entries set visibility='public' where id=$1",[cid]);await db.query("update workspace_entitlements set expires_at=now()-interval '1 minute' where workspace_id=$1",[wid]);
 await login(db,B);await assert.rejects(rpc(db,'nm_salon_action',[wid,'submit','journal',cid,{}]),/entitlement_inactive/);assert.equal((await rpc(db,'nm_pro_public',['studio.a'])).professional.portfolio.length,0);
 await rpc(db,'nm_pro_team',[wid,'leave',{}]);await rpc(db,'nm_salon_action',[wid,'withdraw','journal',cid,{}]);
 await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from journal_entries where id=$1',[cid])).rows[0].n,1);assert.equal((await db.query('select account_tier from profiles where id=$1',[B])).rows[0].account_tier,'pro');
 }finally{await db.close();}
});
test('Direct publication and legacy callers use the same moderated references',async()=>{const db=await setup();try{
 await db.exec(migration);await db.exec(permissions);await login(db,A);const wid=await rpc(db,'nm_pro_save',[null,draft()]);
 await db.exec('reset role');const id=(await db.query("insert into inspirations(created_by,is_public,title,snapshot) values($1,true,'Imported photo','{}') returning id",[A])).rows[0].id;
 await login(db,A);await rpc(db,'nm_pro_portfolio',[wid,'inspiration',id,null,true]);assert.equal((await rpc(db,'nm_pro_public',['studio.a'])).professional.portfolio.length,0);
 await rpc(db,'nm_salon_action',[wid,'settings',null,null,{moderation:false}]);await rpc(db,'nm_salon_action',[wid,'submit','inspiration',id,{caption:'Imported'}]);assert.equal((await rpc(db,'nm_pro_public',['studio.a'])).professional.portfolio.length,1);
 await rpc(db,'nm_salon_action',[wid,'hide','inspiration',id,{}]);assert.equal((await rpc(db,'nm_pro_public',['studio.a'])).professional.portfolio.length,0);
 await assert.rejects(db.query('select * from private.salon_settings'),/permission denied/);
 await login(db,C);await assert.rejects(rpc(db,'nm_salon_action',[wid,'settings',null,null,{moderation:false}]),/entitlement_inactive/);
 }finally{await db.close();}});

test('Ad configuration is off, client cannot confirm a reward, demo cannot grant credits',async()=>{const db=await setup();try{
 await db.exec('create role service_role;');
 await db.exec(readFileSync(new URL('../supabase/migrations/20261009095000_admob_disabled_reward_ledger.sql',import.meta.url),'utf8'));
 await login(db,C);assert.equal((await rpc(db,'nm_ad_state',['ios'])).config.enabled,false);
 await assert.rejects(rpc(db,'nm_ad_confirm_reward',[A,'forged']),/permission denied/);
 await db.exec('reset role');await db.query('insert into private.ad_reward_tickets(id,user_id,platform) values($1,$2,$3)',[A,C,'ios']);
 await db.query("update private.ad_config set enabled=true where platform='ios'");
 assert.equal((await db.query('select private.ad_confirm_reward($1,$2) result',[A,'demo-tx'])).rows[0].result,false);
 await db.query("update private.ad_config set test_only=false where platform='ios'");
 assert.equal((await db.query('select private.ad_confirm_reward($1,$2) result',[A,'verified-server-tx'])).rows[0].result,true);
 assert.equal((await db.query('select private.ad_confirm_reward($1,$2) result',[A,'verified-server-tx'])).rows[0].result,false);
 await login(db,A);assert.equal((await rpc(db,'nm_ad_state',['ios'])).config.enabled,false);
 }finally{await db.close();}});
