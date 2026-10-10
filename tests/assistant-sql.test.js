import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {setup,login,A,B,WA,WB} from './helpers/pose-db.js';
async function fixture(){const db=await setup();await db.exec(`
 grant usage on schema private to service_role;
 create function private.nm_account_suspended(actor uuid) returns boolean language sql as $$select exists(select 1 from private.blocked where user_id=actor)$$;
 create table public.media_cleanup_jobs(bucket text,object_path text,reason text,status text default 'pending');create unique index cleanup_active on public.media_cleanup_jobs(bucket,object_path) where status in ('pending','processing','failed');
 create table private.ad_config(platform text primary key,enabled boolean,test_only boolean);
 create table private.ad_reward_tickets(id uuid primary key,user_id uuid,platform text,confirmed_at timestamptz,used_at timestamptz);
 `);await db.exec(fs.readFileSync('supabase/migrations/20261010124945_nailmoods_ai_private_service.sql','utf8'));return db;}
async function configure(db){await db.exec(`reset role;update private.ai2_config set enabled=true,daily_usd=2,monthly_usd=10,operations='{"conversation":{"enabled":true,"maxUsd":0.1,"credits":1}}';insert into private.ai2_accounts values('${A}'),('${B}');select private.ai2_grant('${A}','manual','manual','fixture-A',2,null);select private.ai2_grant('${B}','manual','manual','fixture-B',1,null);`);}
const fp='a'.repeat(64);
async function begin(db,{user=A,workspace=WA,thread=crypto.randomUUID(),request=crypto.randomUUID(),fingerprint=fp}={}){return (await db.query('select public.nm_ai2_begin($1,$2,$3,$4,$5,$6,$7) j',[user,request,thread,workspace,'conversation',fingerprint,'Une pose florale'])).rows[0].j;}
async function finish(db,j,{error=null,cost=.02,result={kind:'plan'}}={}){return (await db.query('select nm_ai2_finish($1,$2,$3,$4,$5,$6) ok',[j.user_id,j.id,result,{input_tokens:10},cost,error])).rows[0].ok;}
test('AI database: closed defaults, least privilege, owner isolation, idempotency and refund',async()=>{const db=await fixture();try{
 await login(db,A);assert.equal((await db.query('select nm_ai2_access() a')).rows[0].a.allowed,false);
 await assert.rejects(begin(db),/permission/);await assert.rejects(db.query('select * from private.ai2_grants'),/permission/);
 await configure(db);await login(db,A,'service_role');const request=crypto.randomUUID(),thread=crypto.randomUUID(),a=await begin(db,{request,thread});assert.equal(a.claimed,true);
 const replay=await begin(db,{request,thread});assert.equal(replay.claimed,false);assert.equal(replay.job.id,a.job.id);
 await assert.rejects(begin(db,{request,thread,fingerprint:'b'.repeat(64)}),/request_conflict/);
 await assert.rejects(begin(db,{user:B,workspace:WB,thread}),/conversation_unavailable/);
 await assert.rejects(begin(db,{workspace:WB}),/workspace_unavailable/);
 assert.equal(await finish(db,a.job,{error:'provider_failed',cost:null}),true);assert.equal(await finish(db,a.job),false);
 await login(db,A);const balance=(await db.query('select nm_ai2_access() a')).rows[0].a.balance;assert.equal(balance.manual,2);
 await login(db,B);assert.equal((await db.query('select nm_ai2_history($1) h',[thread])).rows[0].h.messages.length,0);assert.equal((await db.query('select nm_ai2_delete($1) d',[thread])).rows[0].d,false);
 await assert.rejects(db.query('select nm_ai2_metrics()'),/not_allowed/);
 }finally{await db.close();}});
test('AI ledger: credits consumed once, budget unknown preserved, purchased grants never expire',async()=>{const db=await fixture();try{
 await configure(db);await login(db,A,'service_role');const a=await begin(db);await finish(db,a.job);const b=await begin(db);await finish(db,b.job);
 await assert.rejects(begin(db),/insufficient_credits/);
 await db.exec('reset role');const ledger=(await db.query("select event,sum(quantity)::int n from private.ai2_ledger where user_id=$1 group by event",[A])).rows;assert.equal(ledger.find(r=>r.event==='consume').n,2);
 await assert.rejects(db.query("select private.ai2_grant($1,'purchased','apple','txn',10,now())",[A]),/purchases_disabled/);
 await db.exec(`update private.ai2_config set daily_usd=.04;`);await login(db,A,'service_role');await assert.rejects(begin(db),/budget_exceeded/);
 }finally{await db.close();}});
test('AI deletion racing with completion refunds credit and never restores messages',async()=>{const db=await fixture();try{
 await configure(db);await login(db,A,'service_role');const a=await begin(db);await login(db,A);await db.query('select nm_ai2_delete($1)',[a.job.thread_id]);
 await login(db,A,'service_role');await finish(db,a.job,{result:{imagePath:`${A}/${WA}/ai/${a.job.id}.png`}});
 await login(db,A);const h=(await db.query('select nm_ai2_history($1) h',[a.job.thread_id])).rows[0].h;assert.equal(h.messages.length,0);assert.equal(h.threads.length,0);
 assert.equal((await db.query('select nm_ai2_access() a')).rows[0].a.balance.manual,2);
 assert.equal((await db.query('select nm_ai2_media_cleanup($1) m',[a.job.thread_id])).rows[0].m.length,1);
 }finally{await db.close();}});
test('AI monthly allowance disabled by default; manual tier resolves current entitlement; reward requires real SSV',async()=>{const db=await fixture();try{
 await configure(db);await db.exec(`update private.ai2_config set monthly_plus=3;`);await login(db,B,'service_role');const a=await begin(db,{user:B,workspace:WB});await finish(db,a.job);const b=await begin(db,{user:B,workspace:WB});await finish(db,b.job);
 await db.exec('reset role');assert.equal((await db.query("select count(*)::int n from private.ai2_grants where user_id=$1 and bucket='monthly'",[B])).rows[0].n,1);
 await db.exec(`update private.account_entitlements set tier='free' where user_id='${B}';update private.ai2_config set rewards_enabled=true;insert into private.ad_config values('android',true,true);insert into private.ad_reward_tickets values('30000000-0000-4000-8000-000000000001','${A}','android',now(),null);`);
 await assert.rejects(db.query("select private.ai2_reward('30000000-0000-4000-8000-000000000001')"),/reward_unconfirmed/);
 await db.exec("update private.ad_config set test_only=false");const r=(await db.query("select private.ai2_reward('30000000-0000-4000-8000-000000000001') g")).rows[0].g;assert.equal((await db.query("select private.ai2_reward('30000000-0000-4000-8000-000000000001') g")).rows[0].g,r);
 }finally{await db.close();}});

test('production pilot: only allowlisted administrators can access, reserve or switch AI',async()=>{const db=await fixture();try{
 await configure(db);
 await db.exec(`create table private.account_administrators(user_id uuid primary key);insert into private.account_administrators values('${A}');create function private.nm_account_administrator() returns boolean language sql security definer as $$select exists(select 1 from private.account_administrators where user_id=auth.uid())$$;`);
 await db.exec(fs.readFileSync('supabase/migrations/20261010145456_nailmoods_ai_admin_web_pilot.sql','utf8'));
 await login(db,A);assert.equal((await db.query('select nm_ai2_access() a')).rows[0].a.uiAccess,true);
 await db.query('select nm_ai2_switch(false)');assert.equal((await db.query('select nm_ai2_access() a')).rows[0].a.allowed,false);
 await login(db,A,'service_role');await assert.rejects(begin(db),/ai_disabled/);
 await login(db,A);await db.query('select nm_ai2_switch(true)');
 await login(db,B);assert.equal((await db.query('select nm_ai2_access() a')).rows[0].a.uiAccess,false);await assert.rejects(db.query('select nm_ai2_switch(true)'),/not_allowed/);
 await login(db,B,'service_role');await assert.rejects(begin(db,{user:B,workspace:WB}),/ai_disabled/);
 }finally{await db.close();}});
