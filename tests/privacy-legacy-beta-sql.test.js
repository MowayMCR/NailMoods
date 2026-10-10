import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {setup,login,C} from './helpers/pro-db.js';
const migration=name=>readFileSync(new URL('../supabase/migrations/'+name,import.meta.url),'utf8');
test('0.9 rollout preserves old beta signup/refusal without inventing a new consent',async()=>{
 const db=await setup();try{
 await db.exec(`alter table auth.users add column raw_user_meta_data jsonb default '{}';
 alter table public.user_consents drop constraint user_consents_pkey;
 alter table public.user_consents add column event_id bigserial primary key,add column privacy_version text default '0.8-beta',add column terms_version text default '0.6-beta',add column terms_accepted_at timestamptz default now(),add column age_band text default '18_plus',add column analytics_consent boolean default false,add column ads_consent boolean default false,add column personalized_ads_consent boolean default false;
 create table private.account_age_policy(user_id uuid primary key,birth_year integer,age_band text,declared_at timestamptz,source text,updated_at timestamptz);
 insert into private.account_age_policy(user_id,age_band) values('${C}','18_plus');
 create function private.nm_age_band(actor uuid) returns text language sql stable as $$select coalesce((select age_band from private.account_age_policy where user_id=actor),'unknown')$$;`);
 await db.exec(migration('20260929051745_phase14d_adult_beta_policy.sql'));
 await db.exec(migration('20261010120913_privacy_09_legacy_beta_compatibility.sql'));
 await db.exec(`create or replace function private.nm_legal_versions() returns table(privacy_version text,terms_version text) language sql immutable as $$select '0.9-beta'::text,'0.6-beta'::text$$;
 create trigger signup_terms after insert on auth.users for each row execute function private.record_signup_terms();`);
 const legacy='90000000-0000-4000-8000-000000000001',current='90000000-0000-4000-8000-000000000002';
 const meta=v=>({terms_accepted:true,terms_version:'0.6-beta',privacy_version:v,adult_confirmed:true,analytics_consent:true});
 for(const [id,v] of [[legacy,'0.8-beta'],[current,'0.9-beta']])await db.query('insert into auth.users(id,raw_user_meta_data) values($1,$2)',[id,meta(v)]);
 const rows=(await db.query('select user_id,privacy_version,analytics_consent,ads_consent from public.user_consents where user_id in ($1,$2) order by user_id',[legacy,current])).rows;
 assert.equal(rows[0].privacy_version,'0.8-beta');assert.equal(rows[0].analytics_consent,false);assert.equal(rows[0].ads_consent,false);
 assert.equal(rows[1].privacy_version,'0.9-beta');assert.equal(rows[1].analytics_consent,true);
 for(const invalid of [undefined,'0.7-beta','0.10-beta'])await assert.rejects(db.query('insert into auth.users(id,raw_user_meta_data) values(gen_random_uuid(),$1)',[meta(invalid)]),/terms_acceptance_required/);
 await assert.rejects(db.query('insert into auth.users(id,raw_user_meta_data) values(gen_random_uuid(),$1)',[{...meta('0.8-beta'),adult_confirmed:false}]),/18 ans/);
 await login(db,C);
 const save=async version=>(await db.query("select (private.record_privacy_choices($1,'0.6-beta',false,'18_plus'::text,true,false,false)).*",[version])).rows[0];
 assert.equal((await save('0.8-beta')).analytics_consent,false);
 const accepted=await save('0.9-beta');assert.equal(accepted.analytics_consent,true);assert.equal(accepted.privacy_version,'0.9-beta');
 await assert.rejects(save(null),/policy_version_changed/);await assert.rejects(save('0.7-beta'),/policy_version_changed/);
 await db.exec('reset role');assert.equal((await db.query('select privacy_version from public.user_consents where user_id=$1 order by event_id limit 1',[C])).rows[0].privacy_version,'0.8-beta');
 }finally{await db.close();}
});
