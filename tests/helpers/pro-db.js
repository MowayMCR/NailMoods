import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
export const A='10000000-0000-4000-8000-000000000001',B='10000000-0000-4000-8000-000000000002',C='10000000-0000-4000-8000-000000000003';
export async function login(db,id=A){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');}
export async function setup(){const db=new PGlite();await db.exec(`
 create role anon;create role authenticated;create schema auth;create schema private;create schema storage;
 grant usage on schema public,private,auth,storage to authenticated;
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table auth.users(id uuid primary key,email_confirmed_at timestamptz default now());
 create table public.profiles(id uuid primary key references auth.users on delete cascade,account_tier text default 'pro',username text,display_name text,discovery_visibility text default 'everyone');
 create table public.user_consents(user_id uuid primary key,adult_confirmed_at timestamptz default now());
 create table public.workspaces(id uuid primary key default gen_random_uuid(),owner_user_id uuid references auth.users on delete cascade,kind text,name text,public_handle text,created_at timestamptz default now());
 create table public.pro_profiles(workspace_id uuid primary key references workspaces on delete cascade,user_id uuid,display_name text,bio text,city text,avatar_url text,is_public boolean default false,styles text[] default '{}',updated_at timestamptz default now());
 create table public.workspace_members(workspace_id uuid references workspaces on delete cascade,user_id uuid references auth.users on delete cascade,role text,primary key(workspace_id,user_id));
 create table public.workspace_entitlements(workspace_id uuid primary key references workspaces on delete cascade,active boolean,seat_limit int,expires_at timestamptz);
 create table public.workspace_invitations(id uuid primary key default gen_random_uuid(),workspace_id uuid references workspaces on delete cascade,invited_by uuid,invited_user_id uuid,status text default 'pending',created_at timestamptz default now(),expires_at timestamptz default now()+interval '7 days',responded_at timestamptz);
 create table public.user_notifications(user_id uuid,kind text,workspace_id uuid,invitation_id uuid);
 create table public.journal_entries(id uuid primary key default gen_random_uuid(),workspace_id uuid,created_by uuid,visibility text,performed_on date,snapshot jsonb);
 create table public.inspirations(id uuid primary key default gen_random_uuid(),workspace_id uuid,created_by uuid,is_public boolean,title text,snapshot jsonb);
 create table private.publication_reviews(kind text check(kind in ('journal','inspiration')),entity_id uuid,author uuid,fingerprint text,image_path text,image_bucket text,title text,status text,created_at timestamptz default now(),updated_at timestamptz default now(),reviewer uuid,primary key(kind,entity_id));
 create function public.nm_publication_review(p_action text,p_kind text,p_id uuid) returns jsonb language sql as $$select '{}'::jsonb$$;
 create table private.analytics_event_catalog(event_name text primary key,category text,allowed_metadata_keys text[]);
 create table private.blocked(user_id uuid);create table private.staff(user_id uuid);create table private.suspended(user_id uuid);
 create function private.nm_blocked(id uuid) returns boolean language sql stable as $$select exists(select 1 from private.blocked where user_id=id)$$;
 create function private.nm_account_suspended(id uuid) returns boolean language sql stable as $$select exists(select 1 from private.suspended where user_id=id)$$;
 create function private.effective_tier(id uuid) returns text language sql stable security definer set search_path='' as $$select account_tier from public.profiles where profiles.id=$1$$;
 create function private.require_adult_account() returns uuid language plpgsql stable security definer set search_path='' as $$begin if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid()) then raise exception 'auth_required';end if;return auth.uid();end$$;
 create function private.require_feature(f text) returns void language plpgsql stable security definer set search_path='' as $$begin perform private.require_adult_account();if private.nm_account_suspended(auth.uid()) then raise exception 'ACCOUNT_SUSPENDED';end if;if f='pro' and private.effective_tier(auth.uid())<>'pro' then raise exception 'FEATURE_REQUIRES_PRO';end if;if f in ('discovery','social') and private.effective_tier(auth.uid())='free' then raise exception 'FEATURE_REQUIRES_PLUS';end if;end$$;
 create function private.nm_support_staff() returns boolean language sql stable as $$select exists(select 1 from private.staff where user_id=auth.uid())$$;
 create function private.discovery_allowed() returns boolean language sql stable as $$select private.effective_tier(auth.uid()) in ('plus','pro')$$;
 create function private.discovery_preview(j jsonb) returns jsonb language sql immutable as $$select j-'private'$$;
 create function private.institute_inbox() returns jsonb language sql stable security definer set search_path='' as $$select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'workspace_id',w.id,'workspace_name',w.name)),'[]') from public.workspace_invitations i join public.workspaces w on w.id=i.workspace_id where i.invited_user_id=auth.uid() and i.status='pending' and i.expires_at>now()$$;
 create function private.get_public_profile(h text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('journal',coalesce((select jsonb_agg(j.id) from public.journal_entries j where j.workspace_id=w.id and j.visibility='public'),'[]'),'inspirations',coalesce((select jsonb_agg(i.id) from public.inspirations i where i.workspace_id=w.id and i.is_public),'[]')) from public.workspaces w where w.public_handle=h
 $$;
 create function public.get_public_profile(h text) returns jsonb language sql security invoker as $$select private.get_public_profile(h)$$;
 create function private.nm_public_profile_v2(h text) returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('handle',w.public_handle,'displayName',w.name,'journal','[]'::jsonb,'inspirations','[]'::jsonb) from public.workspaces w join public.pro_profiles p on p.workspace_id=w.id where w.public_handle=h and p.is_public and not private.nm_blocked(w.owner_user_id) and private.effective_tier(w.owner_user_id)='pro'$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant select,insert,delete on storage.objects to authenticated;
 insert into auth.users(id) values('${A}'),('${B}'),('${C}');
 insert into public.profiles(id,username,display_name,account_tier) values('${A}','artist.a','Artiste A','pro'),('${B}','artist.b','Artiste B','pro'),('${C}','client.c','Cliente C','free');
 insert into public.user_consents(user_id) values('${A}'),('${B}'),('${C}');
 `);await db.exec(readFileSync(new URL('./pro-legacy-institute.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../../supabase/migrations/20261005123741_pro_v2_showcases.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../../supabase/migrations/20261005130218_pro_v2_editorial_review.sql',import.meta.url),'utf8'));await db.exec(readFileSync(new URL('../../supabase/migrations/20261005130814_pro_v2_legacy_visibility.sql',import.meta.url),'utf8'));return db;}
export async function rpc(db,name,args=[]){return (await db.query(`select public.${name}(${args.map((_,i)=>'$'+(i+1)).join(',')}) as data`,args)).rows[0].data;}
export const draft=(name='Studio A',handle='studio.a')=>({name,handle,professionalType:'nail_artist',organizationType:'institute',isPublic:true,fields:{bio:'Ma bio',city:'Paris',website:'https://example.com',universes:['Witchy'],specialties:['French']},visibility:{bio:'public',city:'private',website:'organization',universes:'public',specialties:'public'}});
