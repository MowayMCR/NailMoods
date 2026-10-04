import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
export const A='10000000-0000-4000-8000-000000000001',B='10000000-0000-4000-8000-000000000002',C='10000000-0000-4000-8000-000000000003';
export const WA='20000000-0000-4000-8000-000000000001',WB='20000000-0000-4000-8000-000000000002';
export async function setup() {
 const db=new PGlite();
 await db.exec(`
 create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema private;
 grant usage on schema public,private,auth to authenticated;grant usage on schema public,auth to anon;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz default now());
 create table public.workspaces(id uuid primary key,owner_user_id uuid references auth.users on delete cascade,kind text);
 create table public.inspirations(id uuid primary key,workspace_id uuid references workspaces on delete cascade,created_by uuid references auth.users on delete cascade,snapshot jsonb default '{}');
 create table public.journal_entries(id uuid primary key,workspace_id uuid references workspaces on delete cascade,created_by uuid references auth.users on delete cascade,performed_on date,snapshot jsonb default '{}');
 create table private.account_entitlements(user_id uuid primary key references auth.users on delete cascade,tier text,source text);
 create table private.google_play_subscriptions(user_id uuid references auth.users on delete cascade,status text);
 create table private.apple_subscriptions(user_id uuid references auth.users on delete cascade,status text);
 create table private.support_staff(user_id uuid references auth.users on delete cascade);
 create table private.blocked(user_id uuid references auth.users on delete cascade);
 create function private.effective_tier(p_user uuid) returns text language sql stable security definer set search_path='' as $$select tier from private.account_entitlements where user_id=p_user$$;
 create function private.require_adult_account() returns uuid language plpgsql security definer set search_path='' as $$begin if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'adult_confirmed_account_required' using errcode='42501';end if;return auth.uid();end$$;
 create function private.require_feature(feature text) returns void language plpgsql security definer set search_path='' as $$begin if auth.uid() is null then raise exception 'AUTHENTICATION_REQUIRED' using errcode='42501';end if;if exists(select 1 from private.blocked where user_id=auth.uid()) then raise exception 'ACCOUNT_SUSPENDED' using errcode='42501';end if;if feature='photo_projects' and private.effective_tier(auth.uid()) not in ('plus','pro') then raise exception 'FEATURE_REQUIRES_PLUS' using errcode='42501';end if;end$$;
 create function private.nm_support_staff() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from private.support_staff where user_id=auth.uid())$$;
 insert into auth.users(id) values('${A}'),('${B}'),('${C}');
 insert into public.workspaces values('${WA}','${A}','personal'),('${WB}','${B}','personal');
 insert into private.account_entitlements values('${A}','free','admin'),('${B}','plus','beta_invitation'),('${C}','pro','admin');
 insert into private.google_play_subscriptions values('${B}','active');insert into private.apple_subscriptions values('${C}','active');
 `);
 await db.exec(readFileSync(new URL('../../supabase/migrations/20261004125620_pose_cycle_foundations.sql',import.meta.url),'utf8'));
 return db;
}
export async function login(db,id=A,role='authenticated'){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id||'']);await db.exec('set role '+role);}
export async function insert(db,table,row){const skip=['revision','created_at','updated_at'];const pairs=Object.entries(row).filter(([k])=>!skip.includes(k));return (await db.query(`insert into public.${table}(${pairs.map(([k])=>k).join(',')}) values(${pairs.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,pairs.map(([,v])=>v))).rows[0];}
