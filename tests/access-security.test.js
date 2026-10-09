import test from 'node:test';import assert from 'node:assert/strict';import {PGlite} from '@electric-sql/pglite';import {readFileSync} from 'node:fs';
import {setup,login,rpc,A,B,C,draft} from './helpers/pro-db.js';
const read=name=>readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
const sessionSQL=read('20261007181005_single_session_enforcement.sql'),teamSQL=read('20261007180957_institute_access_hardening.sql');
test('session replacement blocks RLS, definer RPC and private media; refresh cannot reclaim',async()=>{const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema private;create schema auth;create schema storage;
 grant usage on schema public,private,auth,storage to authenticated;
 create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}')$$;
 create function auth.uid() returns uuid language sql stable as $$select (auth.jwt()->>'sub')::uuid$$;
 create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid references auth.users,created_at timestamptz default clock_timestamp(),not_after timestamptz,updated_at timestamptz);
 create table public.test_data(user_id uuid,body text);alter table public.test_data enable row level security;grant select,insert,update,delete on public.test_data to authenticated;
 create policy own on public.test_data to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
 create function public.read_secret() returns text language plpgsql security definer as $$begin return 'secret';end$$;
 create function public.read_sql_secret() returns text language sql security definer as $$select 'secret'::text$$;
 create table storage.objects(user_id uuid);alter table storage.objects enable row level security;grant select on storage.objects to authenticated;create policy own on storage.objects to authenticated using(user_id=auth.uid());
 insert into auth.users values('${A}'),('${B}');insert into test_data values('${A}','mine'),('${B}','other');insert into storage.objects values('${A}');`);
 await db.exec(sessionSQL);await db.exec(read('20261007184443_session_and_institute_followup.sql').split('create or replace function private.nm_workspace_operational')[0]+'commit;');await db.exec('update private.nm_session_settings set enabled=true');
 const s1='20000000-0000-4000-8000-000000000001',s2='20000000-0000-4000-8000-000000000002';
 const sign=async(s)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:A,role:'authenticated',session_id:s})]);await db.exec('set role authenticated');};
 await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[s1,A]);await sign(s1);assert.equal((await db.query('select * from test_data')).rows.length,1);assert.equal(await rpc(db,'read_secret'),'secret');
 await db.exec('reset role');await db.query('insert into auth.sessions(id,user_id) values($1,$2)',[s2,A]);await sign(s1);
 assert.equal((await db.query('select * from test_data')).rows.length,0);assert.equal((await db.query('select * from storage.objects')).rows.length,0);
 await assert.rejects(rpc(db,'read_secret'),/SESSION_REPLACED/);await assert.rejects(rpc(db,'read_sql_secret'),/SESSION_REPLACED/);await assert.rejects(rpc(db,'nm_session_check'),/SESSION_REPLACED/);
 await assert.rejects(db.query('insert into test_data values($1,$2)',[A,'blocked']),/row-level security/);await assert.rejects(rpc(db,'nm_session_revoke_others'),/SESSION_REPLACED/);
 await db.exec('reset role');await db.query('update auth.sessions set updated_at=now() where id=$1',[s1]);await sign(s1);await assert.rejects(rpc(db,'read_secret'),/SESSION_REPLACED/);
 await sign(s2);assert.equal((await rpc(db,'nm_session_check')).active,true);await rpc(db,'nm_session_revoke_others');assert.equal((await db.query('select * from test_data')).rows.length,1);
 await db.exec('reset role');await db.query('delete from auth.sessions where id=$1',[s2]);await sign(s1);await assert.rejects(rpc(db,'read_secret'),/SESSION_REPLACED/);
 }finally{await db.close();}});
test('institute common code requires approval; email invite binds account; quota and independent grants',async()=>{const db=await setup();try{
 await db.exec(`alter table public.workspace_members add column created_at timestamptz default now();alter table auth.users add column email text;update auth.users set email=case id when '${A}' then 'a@test.fr' when '${B}' then 'b@test.fr' else 'c@test.fr' end;
 create function private.nm_age_band(uuid) returns text language sql as $$select '18_plus'::text$$;
 create function private.billing_entitlement_for_user(uuid) returns jsonb language sql as $$select '{}'::jsonb$$;
 create function private.apple_server_context(uuid,text) returns jsonb language sql as $$select '{"canPurchase":true}'::jsonb$$;
 create function private.google_play_server_context(uuid,boolean default false) returns jsonb language sql as $$select '{"canPurchase":true}'::jsonb$$;`);
 await db.exec(teamSQL);await db.exec(read('20261007183932_institute_invite_receipt.sql'));
 await db.exec(`create function private.nm_session_assert() returns void language sql as $$select$$;create function private.is_workspace_member(w uuid) returns boolean language sql as $$select exists(select 1 from workspace_members where workspace_id=w and user_id=auth.uid())$$;`);await db.exec(read('20261007182521_institute_permission_enforcement.sql'));await db.exec(read('20261007184911_institute_roles_and_recovery.sql'));await db.exec(read('20261007184443_session_and_institute_followup.sql').slice(read('20261007184443_session_and_institute_followup.sql').indexOf('create or replace function private.nm_workspace_operational')));await login(db,A);const wid=await rpc(db,'nm_pro_save',[null,draft()]);await db.exec('reset role');await db.query("update workspace_entitlements set seat_limit=2,granted_tier='pro' where workspace_id=$1",[wid]);
 await login(db,A);const code=await rpc(db,'nm_institute_access',['rotate_code',wid,{}]);assert.ok(code.code);await login(db,C);await rpc(db,'nm_institute_access',['request',null,{code:code.code}]);
 await db.exec('reset role');assert.equal((await db.query('select private.effective_tier($1) t',[C])).rows[0].t,'free');
 await login(db,A);let state=await rpc(db,'nm_institute_access',['state',wid,{}]);assert.equal(state.requests.length,1);await rpc(db,'nm_institute_access',['approve',wid,{id:state.requests[0].id}]);
 await db.exec('reset role');assert.equal((await db.query('select private.effective_tier($1) t',[C])).rows[0].t,'pro');
 await login(db,A);const inv=await rpc(db,'nm_institute_access',['invite_email',wid,{email:'b@test.fr'}]);await login(db,C);assert.equal((await rpc(db,'nm_institute_access',['accept_invite',null,{token:inv.token}])).error,'invitation_unavailable');
 await login(db,B);await assert.rejects(rpc(db,'nm_institute_access',['accept_invite',null,{token:inv.token}]),/workspace_full/);
 await login(db,A);await rpc(db,'nm_pro_team',[wid,'remove',{userId:C}]);await login(db,B);await rpc(db,'nm_institute_access',['accept_invite',null,{token:inv.token}]);assert.equal((await rpc(db,'nm_institute_access',['accept_invite',null,{token:inv.token}])).error,'invitation_unavailable');
 await assert.rejects(rpc(db,'nm_institute_access',['rotate_code',wid,{}]),/manager_required/);
 await db.exec('reset role');assert.equal((await db.query('select private.effective_tier($1) t',[C])).rows[0].t,'free');await db.query('update workspace_entitlements set expires_at=now()-interval \'1 second\' where workspace_id=$1',[wid]);assert.equal((await db.query('select private.effective_tier($1) t',[B])).rows[0].t,'pro'); // own Pro retained
 await login(db,A);await rpc(db,'nm_institute_access',['disable_code',wid,{}]);await login(db,C);assert.equal((await rpc(db,'nm_institute_access',['request',null,{code:code.code}])).error,'code_unavailable');
 // Lowering the quota suspends access without deleting members or their own Pro.
 await db.exec('reset role');await db.query('update workspace_entitlements set seat_limit=1 where workspace_id=$1',[wid]);assert.equal((await db.query('select access_suspended from workspace_members where workspace_id=$1 and user_id=$2',[wid,B])).rows[0].access_suspended,true);assert.equal((await db.query('select private.nm_workspace_operational($1,$2) allowed',[wid,B])).rows[0].allowed,false);assert.equal((await db.query('select private.effective_tier($1) t',[B])).rows[0].t,'pro');
 // Expiration and revocation never activate membership.
 await login(db,A);const expired=await rpc(db,'nm_institute_access',['invite_email',wid,{email:'c@test.fr'}]);assert.ok(expired.id);await db.exec('reset role');await db.query("update private.institute_email_invites set expires_at=now()-interval '1 second' where id=$1",[expired.id]);await login(db,C);assert.equal((await rpc(db,'nm_institute_access',['accept_invite',null,{token:expired.token}])).error,'invitation_unavailable');
 await login(db,A);const revoked=await rpc(db,'nm_institute_access',['invite_email',wid,{email:'c@test.fr'}]);await rpc(db,'nm_institute_access',['revoke_invite',wid,{id:revoked.id}]);await login(db,C);assert.equal((await rpc(db,'nm_institute_access',['accept_invite',null,{token:revoked.token}])).error,'invitation_unavailable');
 // Failed guesses persist, reaching a bounded minute-window limit.
 for(let i=0;i<21;i++)state=await rpc(db,'nm_institute_access',['request',null,{code:'wrong'}]);assert.equal(state.error,'rate_limit');
 }finally{await db.close();}});
