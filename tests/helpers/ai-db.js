import fs from 'node:fs';
import {setup,A,B} from './pose-db.js';
export async function aiFixture(){
 const db=await setup();
 await db.exec(`grant usage on schema private to service_role;
 create function private.nm_account_suspended(actor uuid) returns boolean language sql as $$select exists(select 1 from private.blocked where user_id=actor)$$;
 create table public.media_cleanup_jobs(bucket text,object_path text,reason text,status text default 'pending');create unique index cleanup_active on public.media_cleanup_jobs(bucket,object_path) where status in ('pending','processing','failed');
 create table private.ad_config(platform text primary key,enabled boolean,test_only boolean);
 create table private.ad_reward_tickets(id uuid primary key,user_id uuid,platform text,confirmed_at timestamptz,used_at timestamptz);
 create table private.account_administrators(user_id uuid primary key);
 create function private.nm_account_administrator() returns boolean language sql security definer as $$select exists(select 1 from private.account_administrators where user_id=auth.uid())$$;
 `);
 for(const file of ['20261010124945_nailmoods_ai_private_service.sql','20261010145456_nailmoods_ai_admin_web_pilot.sql','20261010150500_nailmoods_ai_commercial_queue.sql'])await db.exec(fs.readFileSync('supabase/migrations/'+file,'utf8'));
 await db.exec(`update private.ai2_config set enabled=true,daily_usd=100,monthly_usd=1000,operations='{"conversation":{"enabled":true,"maxUsd":0.1,"credits":1}}';
 insert into private.ai2_accounts(user_id,limits) values('${A}','{"dailyUsd":20,"monthlyUsd":100,"dailyRequests":100}'),('${B}','{"dailyUsd":20,"monthlyUsd":100,"dailyRequests":100}');insert into private.account_administrators values('${A}'),('${B}');
 select private.ai2_grant('${A}','manual','manual','a',100,null);select private.ai2_grant('${B}','manual','manual','b',100,null);`);
 return db;
}
export async function enqueue(db,user,workspace,request=crypto.randomUUID(),thread=crypto.randomUUID()){
 return (await db.query('select nm_ai2_enqueue($1,$2,$3,$4,$5,$6,$7,$8) r',[user,request,thread,workspace,'conversation','a'.repeat(64),'Une pose',{body:{prompt:'Une pose',workspaceId:workspace},products:[],history:[]}])).rows[0].r;
}
