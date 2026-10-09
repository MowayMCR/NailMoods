begin;
-- No invented commercial rights: NULL means no personal tier is granted.
alter table public.workspace_entitlements add column granted_tier text check(granted_tier in ('plus','pro'));
alter table public.workspace_members add column access_suspended boolean not null default false;
create table private.institute_join_codes(workspace_id uuid primary key references public.workspaces on delete cascade,code_hash text unique not null,enabled boolean not null default true,created_at timestamptz not null default now());
create table private.institute_join_requests(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,user_id uuid not null references auth.users on delete cascade,status text not null default 'pending' check(status in ('pending','accepted','declined')),created_at timestamptz not null default now(),responded_at timestamptz);
create unique index institute_pending_request on private.institute_join_requests(workspace_id,user_id) where status='pending';
create table private.institute_email_invites(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,email text not null,token_hash text unique not null,status text not null default 'pending' check(status in ('pending','accepted','revoked')),expires_at timestamptz not null,created_at timestamptz not null default now(),accepted_by uuid references auth.users on delete set null);
create table private.institute_attempts(user_id uuid primary key references auth.users on delete cascade,window_at timestamptz not null default now(),attempts int not null default 0);
create table private.institute_audit(id bigint generated always as identity primary key,workspace_id uuid references public.workspaces on delete cascade,actor_id uuid references auth.users on delete set null,action text not null,target_id uuid,created_at timestamptz not null default now());
alter table private.institute_join_codes enable row level security;
alter table private.institute_join_requests enable row level security;
alter table private.institute_email_invites enable row level security;
alter table private.institute_attempts enable row level security;
alter table private.institute_audit enable row level security;
revoke all on private.institute_join_codes,private.institute_join_requests,private.institute_email_invites,private.institute_attempts,private.institute_audit from public,anon,authenticated;
create function private.institute_manager(w uuid,u uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.workspace_members where workspace_id=w and user_id=u and role in ('owner','manager') and not access_suspended)$$;
revoke all on function private.institute_manager(uuid,uuid) from public,anon,authenticated;
create function private.institute_access_tier(u uuid) returns text language sql stable security definer set search_path='' as $$
 select case max(case e.granted_tier when 'pro' then 2 when 'plus' then 1 end) when 2 then 'pro' when 1 then 'plus' end
 from public.workspace_members m join public.workspace_entitlements e using(workspace_id)
 where m.user_id=u and not m.access_suspended and e.active and (e.expires_at is null or e.expires_at>now())
$$;
revoke all on function private.institute_access_tier(uuid) from public,anon,authenticated;
alter function private.effective_tier(uuid) rename to effective_tier_without_institute;
create function private.effective_tier(p_user uuid) returns text language sql stable security definer set search_path='' as $$
 select case when private.nm_age_band(p_user)='15_17' then 'free' else case
 when private.effective_tier_without_institute(p_user)='pro' or private.institute_access_tier(p_user)='pro' then 'pro'
 when private.effective_tier_without_institute(p_user)='plus' or private.institute_access_tier(p_user)='plus' then 'plus' else 'free' end end
$$;
revoke all on function private.effective_tier(uuid),private.effective_tier_without_institute(uuid) from public,anon,authenticated;
-- SQL dependencies to the renamed old function are rebound to the new resolver.
do $migration$ declare f record;begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname not in ('effective_tier','effective_tier_without_institute') and p.prosrc like '%private.effective_tier(%' loop
 execute pg_get_functiondef(f.oid);
 end loop;
end $migration$;
create function private.institute_add_member(w uuid,u uuid) returns void language plpgsql security definer set search_path='' as $$
declare e public.workspace_entitlements;begin
 -- Caller holds the workspace row lock; all legacy membership mutations do too.
 select * into e from public.workspace_entitlements where workspace_id=w for update;
 if not found or not e.active or (e.expires_at is not null and e.expires_at<=now()) then raise exception 'entitlement_inactive';end if;
 if exists(select 1 from public.workspace_members where workspace_id=w and user_id=u) then raise exception 'already_member';end if;
 if (select count(*) from public.workspace_members where workspace_id=w and not access_suspended)>=e.seat_limit then raise exception 'workspace_full';end if;
 if not exists(select 1 from auth.users a join public.user_consents c on c.user_id=a.id where a.id=u and a.email_confirmed_at is not null and c.adult_confirmed_at is not null) or private.nm_account_suspended(u) then raise exception 'confirmed_account_required';end if;
 insert into public.workspace_members(workspace_id,user_id,role) values(w,u,'member');
end $$;
revoke all on function private.institute_add_member(uuid,uuid) from public,anon,authenticated;
-- Hash capability material. No password, JWT or private data in QR payloads.
create function public.nm_institute_access(p_action text,p_workspace uuid default null,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account(); w uuid:=p_workspace; code text; target uuid; req private.institute_join_requests; inv private.institute_email_invites; token text; attempts int; can_manage boolean; result jsonb;
begin
 -- Return a structured rejection, not an exception, so failed attempts persist.
 insert into private.institute_attempts(user_id,attempts) values(actor,1) on conflict(user_id) do update set
 window_at=case when institute_attempts.window_at<now()-interval '1 minute' then now() else institute_attempts.window_at end,
 attempts=case when institute_attempts.window_at<now()-interval '1 minute' then 1 else institute_attempts.attempts+1 end returning institute_attempts.attempts into attempts;
 if attempts>20 then return jsonb_build_object('error','rate_limit');end if;
 if p_action='request' then
 code:=upper(trim(p_data->>'code'));
 select workspace_id into w from private.institute_join_codes where code_hash=encode(sha256(convert_to(coalesce(code,''),'UTF8')),'hex') and enabled;
 elsif p_action='accept_invite' then
 token:=p_data->>'token';
 select workspace_id into w from private.institute_email_invites where token_hash=encode(sha256(convert_to(coalesce(token,''),'UTF8')),'hex');
 end if;
 if w is null then return jsonb_build_object('error','code_unavailable');end if;
 perform 1 from public.workspaces where id=w and (kind='institute' or organization_type in ('institute','brand_team','creator_team')) for update;
 if not found then return jsonb_build_object('error','workspace_unavailable');end if;
 can_manage:=private.institute_manager(w,actor);
 if p_action not in ('request','accept_invite') and not can_manage then raise exception 'manager_required' using errcode='42501';end if;
 case p_action
 when 'rotate_code' then
 code:=upper(replace(gen_random_uuid()::text,'-',''));
 insert into private.institute_join_codes(workspace_id,code_hash) values(w,encode(sha256(convert_to(code,'UTF8')),'hex')) on conflict(workspace_id) do update set code_hash=excluded.code_hash,enabled=true,created_at=now();
 result:=jsonb_build_object('code',code,'qrPayload','nailmoods:institute:request:'||code);
 when 'disable_code' then update private.institute_join_codes set enabled=false where workspace_id=w;
 when 'request' then
 if exists(select 1 from public.workspace_members where workspace_id=w and user_id=actor) then return jsonb_build_object('error','already_member');end if;
 insert into private.institute_join_requests(workspace_id,user_id) values(w,actor) on conflict(workspace_id,user_id) where status='pending' do nothing;
 result:=jsonb_build_object('requested',true);
 when 'approve' then
 select * into req from private.institute_join_requests where workspace_id=w and id=(p_data->>'id')::uuid for update;
 if not found or req.status<>'pending' then raise exception 'request_unavailable';end if;
 perform private.institute_add_member(w,req.user_id);target:=req.user_id;
 update private.institute_join_requests set status='accepted',responded_at=now() where id=req.id;
 when 'decline_request' then update private.institute_join_requests set status='declined',responded_at=now() where workspace_id=w and id=(p_data->>'id')::uuid and status='pending';
 when 'invite_email' then
 if length(trim(p_data->>'email'))>254 or coalesce(p_data->>'email','') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid_email';end if;
 token:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into private.institute_email_invites(workspace_id,email,token_hash,expires_at) values(w,lower(trim(p_data->>'email')),encode(sha256(convert_to(token,'UTF8')),'hex'),now()+interval '7 days');
 result:=jsonb_build_object('token',token,'qrPayload','nailmoods:institute:invite:'||token,'expiresAt',now()+interval '7 days');
 when 'accept_invite' then
 select * into inv from private.institute_email_invites where workspace_id=w and token_hash=encode(sha256(convert_to(coalesce(token,''),'UTF8')),'hex') for update;
 if not found or inv.status<>'pending' or inv.expires_at<=now() or inv.email<>(select lower(email) from auth.users where id=actor) then return jsonb_build_object('error','invitation_unavailable');end if;
 perform private.institute_add_member(w,actor);target:=actor;
 update private.institute_email_invites set status='accepted',accepted_by=actor where id=inv.id;
 when 'revoke_invite' then update private.institute_email_invites set status='revoked' where workspace_id=w and id=(p_data->>'id')::uuid and status='pending';
 when 'state' then
 return jsonb_build_object('codeEnabled',coalesce((select enabled from private.institute_join_codes where workspace_id=w),false),
 'used',(select count(*) from public.workspace_members where workspace_id=w and not access_suspended),
 'limit',(select seat_limit from public.workspace_entitlements where workspace_id=w),
 'requests',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'userId',r.user_id,'name',p.display_name)) from private.institute_join_requests r join public.profiles p on p.id=r.user_id where r.workspace_id=w and r.status='pending'),'[]'),
 'invitations',coalesce((select jsonb_agg(jsonb_build_object('id',id,'email',email,'status',status,'expiresAt',expires_at)) from private.institute_email_invites where workspace_id=w and status='pending' and expires_at>now()),'[]'));
 else raise exception 'unknown_action';
 end case;
 insert into private.institute_audit(workspace_id,actor_id,action,target_id) values(w,actor,p_action,target);
 return coalesce(result,'{}')||jsonb_build_object('ok',true);
end $$;
revoke all on function public.nm_institute_access(text,uuid,jsonb) from public,anon;
grant execute on function public.nm_institute_access(text,uuid,jsonb) to authenticated;
-- Managers can perform team operations, but cannot remove another manager/owner,
-- assign roles, transfer ownership or change commercial rights.
do $migration$ declare def text;begin
 def:=pg_get_functiondef('private.institute_action(text,uuid,uuid,uuid,text)'::regprocedure);
 def:=replace(def,'elsif space.owner_user_id<>actor then raise exception ''owner_required'' using errcode=''42501'';',
 'elsif space.owner_user_id<>actor and not (p_action in (''invite'',''remove'',''revoke'') and private.institute_manager(space.id,actor)) then raise exception ''owner_required'' using errcode=''42501'';');
 def:=replace(def,'case p_action','if p_action=''remove'' and space.owner_user_id<>actor and exists(select 1 from public.workspace_members where workspace_id=space.id and user_id=p_target_user_id and role in (''owner'',''manager'')) then raise exception ''owner_required'';end if; case p_action');
 def:=replace(def,'where workspace_id=space.id;','where workspace_id=space.id and not access_suspended;');
 execute def;
end $migration$;
-- Include institute provenance and prevent equivalent duplicate purchases.
alter function private.billing_entitlement_for_user(uuid) rename to billing_entitlement_without_institute;
create function private.billing_entitlement_for_user(p_user_id uuid) returns jsonb language sql security definer set search_path='' as $$
 select private.billing_entitlement_without_institute(p_user_id)||jsonb_build_object('effectiveTier',private.effective_tier(p_user_id),'instituteTier',private.institute_access_tier(p_user_id),'instituteActive',private.institute_access_tier(p_user_id) is not null)
$$;
revoke all on function private.billing_entitlement_for_user(uuid),private.billing_entitlement_without_institute(uuid) from public,anon,authenticated;
alter function private.apple_server_context(uuid,text) rename to apple_server_context_without_institute;
create function private.apple_server_context(p_user_id uuid,p_environment text) returns jsonb language plpgsql security definer set search_path='' as $$
declare c jsonb;begin c:=private.apple_server_context_without_institute(p_user_id,p_environment); return c||jsonb_build_object('instituteActive',private.institute_access_tier(p_user_id) is not null,'canPurchase',(c->>'canPurchase')::boolean and private.institute_access_tier(p_user_id) is null);end $$;
revoke all on function private.apple_server_context(uuid,text),private.apple_server_context_without_institute(uuid,text) from public,anon,authenticated;
alter function private.google_play_server_context(uuid,boolean) rename to google_play_server_context_before_institute;
create function private.google_play_server_context(p_user_id uuid,p_prepare boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare g jsonb;begin
 g:=private.google_play_server_context_before_institute(p_user_id,p_prepare);
 return g||jsonb_build_object('instituteActive',private.institute_access_tier(p_user_id) is not null,'canPurchase',(g->>'canPurchase')::boolean and private.institute_access_tier(p_user_id) is null);
end $$;
revoke all on function private.google_play_server_context(uuid,boolean),private.google_play_server_context_before_institute(uuid,boolean) from public,anon,authenticated;
-- Rebind all SQL wrappers to newly resolved functions; preserve grants.
do $migration$ declare f record;begin
 for f in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private') and p.proname not like '%without_institute%' and p.proname<>'google_play_server_context_before_institute' and (p.prosrc like '%private.billing_entitlement_for_user(%' or p.prosrc like '%private.apple_server_context(%' or p.prosrc like '%private.google_play_server_context(%') loop execute pg_get_functiondef(f.oid);end loop;
end $migration$;

create function private.institute_rebalance() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.workspaces where id=new.workspace_id for update;
 update public.workspace_members m set access_suspended=(x.rank>new.seat_limit)
 from (select user_id,row_number() over(order by (role='owner') desc,created_at,user_id) rank from public.workspace_members where workspace_id=new.workspace_id) x
 where m.workspace_id=new.workspace_id and m.user_id=x.user_id;
 return new;
end $$;
revoke all on function private.institute_rebalance() from public,anon,authenticated;
create trigger institute_seat_rebalance after update of seat_limit on public.workspace_entitlements for each row execute function private.institute_rebalance();
create function private.institute_membership_audit() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.institute_audit(workspace_id,actor_id,action,target_id) values(coalesce(new.workspace_id,old.workspace_id),auth.uid(),lower(tg_op),coalesce(new.user_id,old.user_id));
 return coalesce(new,old);
end $$;
revoke all on function private.institute_membership_audit() from public,anon,authenticated;
create trigger institute_membership_audit after insert or update or delete on public.workspace_members for each row execute function private.institute_membership_audit();
commit;
