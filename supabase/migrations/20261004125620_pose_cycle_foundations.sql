-- Lot 1: private foundations. Review and test before any remote deployment.
begin;
do $$begin
 if to_regprocedure('private.require_feature(text)') is null or to_regprocedure('private.require_adult_account()') is null or to_regprocedure('private.nm_support_staff()') is null then raise exception 'POSE_FOUNDATIONS_PREREQUISITES_MISSING';end if;
end$$;
create table public.pose_projects (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 title text not null check(length(trim(title)) between 1 and 120),
 status text not null default 'idea' check(status in ('idea','planned','ready','in_progress','done','follow_up','removal_due','archived')),
 source_inspiration_id uuid references public.inspirations(id) on delete set null,
 journal_entry_id uuid references public.journal_entries(id) on delete set null,
 legacy_key text check(length(legacy_key) between 1 and 240),
 details jsonb not null check(jsonb_typeof(details)='object' and octet_length(details::text)<=1000000),
 revision bigint not null default 1 check(revision>0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(id,user_id,workspace_id),unique(user_id,workspace_id,legacy_key)
);
create unique index pose_projects_journal_unique on public.pose_projects(journal_entry_id) where journal_entry_id is not null;
create index pose_projects_owner_updated on public.pose_projects(user_id,workspace_id,updated_at desc);
create table public.pose_plan_items (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.workspaces(id) on delete cascade,project_id uuid not null,
 title text not null check(length(trim(title)) between 1 and 120),kind text not null check(kind in ('pose','event','follow_up','maintenance','removal','prepare','personal')),
 scheduled_on date not null,timezone text not null,starts_at timestamptz,ends_at timestamptz,
 location text not null default '' check(length(location)<=240),notes text not null default '' check(length(notes)<=2000),
 status text not null default 'scheduled' check(status in ('scheduled','done','canceled')),
 revision bigint not null default 1 check(revision>0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(project_id,user_id,workspace_id) references public.pose_projects(id,user_id,workspace_id) on delete cascade,
 unique(id,user_id,workspace_id),check(ends_at is null or (starts_at is not null and ends_at>starts_at)),
 check(isfinite(scheduled_on) and (starts_at is null or isfinite(starts_at)) and (ends_at is null or isfinite(ends_at)))
);
create index pose_plan_owner_date on public.pose_plan_items(user_id,workspace_id,scheduled_on) where status='scheduled';
create index pose_plan_project on public.pose_plan_items(project_id);
create table public.pose_reminders (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 workspace_id uuid not null references public.workspaces(id) on delete cascade,plan_item_id uuid not null,
 category text not null check(category in ('pose','follow_up','maintenance','removal','project')),
 scheduled_at timestamptz not null check(isfinite(scheduled_at)),enabled boolean not null default true,
 revision bigint not null default 1 check(revision>0),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(plan_item_id,user_id,workspace_id) references public.pose_plan_items(id,user_id,workspace_id) on delete cascade
);
create index pose_reminders_owner_date on public.pose_reminders(user_id,scheduled_at) where enabled;
create index pose_reminders_plan on public.pose_reminders(plan_item_id);
-- Personal ownership, never mere Pro/institute membership.
create function private.pose_owner(p_user uuid,p_workspace uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid()<>p_user then return false;end if;
 perform private.require_adult_account();perform private.require_feature('personal');
 return exists(select 1 from public.workspaces w where w.id=p_workspace and w.owner_user_id=p_user and w.kind='personal');
 exception when insufficient_privilege then return false;
end $$;
revoke all on function private.pose_owner(uuid,uuid) from public,anon;
grant execute on function private.pose_owner(uuid,uuid) to authenticated;
do $$declare t text;begin
 foreach t in array array['pose_projects','pose_plan_items','pose_reminders'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant select,insert,update,delete on public.%I to authenticated',t);
  execute format('create policy pose_owner_read on public.%I for select to authenticated using(private.pose_owner(user_id,workspace_id))',t);
  execute format('create policy pose_owner_insert on public.%I for insert to authenticated with check(private.pose_owner(user_id,workspace_id))',t);
  execute format('create policy pose_owner_update on public.%I for update to authenticated using(private.pose_owner(user_id,workspace_id)) with check(private.pose_owner(user_id,workspace_id))',t);
  execute format('create policy pose_owner_delete on public.%I for delete to authenticated using(private.pose_owner(user_id,workspace_id))',t);
 end loop;
end $$;
create function private.pose_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare d jsonb;field text;realized date;
begin
 if tg_op='UPDATE' then
  if new.id<>old.id or new.user_id<>old.user_id or new.workspace_id<>old.workspace_id or new.created_at<>old.created_at then raise exception 'POSE_IDENTITY_IMMUTABLE' using errcode='23514';end if;
  if tg_table_name='pose_projects' then
   if new.legacy_key is distinct from old.legacy_key then raise exception 'POSE_SOURCE_IMMUTABLE' using errcode='23514';end if;
  elsif tg_table_name='pose_plan_items' then
   if new.project_id<>old.project_id then raise exception 'POSE_PARENT_IMMUTABLE' using errcode='23514';end if;
  elsif tg_table_name='pose_reminders' then
   if new.plan_item_id<>old.plan_item_id then raise exception 'POSE_PARENT_IMMUTABLE' using errcode='23514';end if;
  end if;
  new.revision:=old.revision+1;
 else new.revision:=1;new.created_at:=clock_timestamp();end if;
 new.updated_at:=clock_timestamp();
 if tg_table_name='pose_projects' then
  d:=new.details;
  if d->>'version' is distinct from '1' or coalesce(d->>'source','') not in ('manual','inspiration','journal','collection','outfit','image','event','ai')
   or not (d ?& array['composition','mood','universes','notes','referenceMedia','outfitMedia','occasion','realizedOn','tutorialSessionId','followUp','alternatives','protocolReferences','aiJobIds'])
   or jsonb_typeof(d->'notes') is distinct from 'string' or length(d->>'notes')>4000 or jsonb_typeof(d->'universes') is distinct from 'array' then raise exception 'POSE_DETAILS_INVALID' using errcode='23514';end if;
  if jsonb_array_length(d->'universes')>100 or exists(select 1 from jsonb_array_elements(d->'universes') v where jsonb_typeof(v)<>'string' or length(v#>>'{}')>80) then raise exception 'POSE_UNIVERSES_INVALID' using errcode='23514';end if;
  foreach field in array array['referenceMedia','followUp','alternatives','protocolReferences','aiJobIds'] loop
   if jsonb_typeof(d->field) is distinct from 'array' then raise exception 'POSE_DETAILS_INVALID' using errcode='23514';end if;
  end loop;
  -- New media is withheld until its storage / orphan-cleanup integration.
  if d->'referenceMedia'<>'[]'::jsonb or d->'followUp'<>'[]'::jsonb or d->'aiJobIds'<>'[]'::jsonb or d->'outfitMedia'<>'null'::jsonb
   or d::text ~* '(data:image/|blob:|X-Amz-Signature|[?&]token=)' then raise exception 'POSE_MEDIA_NOT_ENABLED' using errcode='23514';end if;
  if jsonb_typeof(d->'composition') not in ('null','object') then raise exception 'POSE_COMPOSITION_INVALID' using errcode='23514';end if;
  if jsonb_typeof(d->'composition')='object' then
   if jsonb_typeof(d#>'{composition,palette}') is distinct from 'array' or jsonb_typeof(d#>'{composition,nails}') is distinct from 'array' then raise exception 'POSE_COMPOSITION_INVALID' using errcode='23514';end if;
   if jsonb_array_length(d#>'{composition,nails}')<>5 then raise exception 'POSE_COMPOSITION_INVALID' using errcode='23514';end if;
  end if;
  if d->>'realizedOn' is not null then
   if d->>'realizedOn' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'POSE_DATE_INVALID' using errcode='23514';end if;
   realized:=(d->>'realizedOn')::date;
   if not isfinite(realized) or realized>(now() at time zone 'Pacific/Kiritimati')::date then raise exception 'POSE_DATE_INVALID' using errcode='23514';end if;
  end if;
  if new.status in ('done','follow_up','removal_due') and realized is null then raise exception 'POSE_REALIZED_DATE_REQUIRED' using errcode='23514';end if;
  if new.source_inspiration_id is not null and not exists(select 1 from public.inspirations i where i.id=new.source_inspiration_id and i.created_by=new.user_id and i.workspace_id=new.workspace_id) then raise exception 'POSE_SOURCE_FORBIDDEN' using errcode='42501';end if;
  if new.journal_entry_id is not null and not exists(select 1 from public.journal_entries j where j.id=new.journal_entry_id and j.created_by=new.user_id and j.workspace_id=new.workspace_id) then raise exception 'POSE_JOURNAL_FORBIDDEN' using errcode='42501';end if;
  if auth.uid() is not null and (d->>'source' in ('outfit','image') or d#>>'{composition,intent}'='photos' or d->'composition' ?| array['photoSources','photoInspiration']) then
   if tg_op='INSERT' then perform private.require_feature('photo_projects');
   elsif d is distinct from old.details then perform private.require_feature('photo_projects');end if;
  end if;
 elsif tg_table_name='pose_plan_items' then
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) then raise exception 'POSE_TIMEZONE_INVALID' using errcode='23514';end if;
  if new.starts_at is not null and (new.starts_at at time zone new.timezone)::date<>new.scheduled_on then raise exception 'POSE_TIME_DATE_MISMATCH' using errcode='23514';end if;
 end if;
 return new;
end $$;
revoke all on function private.pose_guard() from public,anon,authenticated;
create trigger pose_guard before insert or update on public.pose_projects for each row execute function private.pose_guard();
create trigger pose_guard before insert or update on public.pose_plan_items for each row execute function private.pose_guard();
create trigger pose_guard before insert or update on public.pose_reminders for each row execute function private.pose_guard();
-- Add-on grants are independent of account_entitlements / Google / Apple ledgers.
create table private.addon_entitlements (
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 feature text not null check(feature ~ '^[a-z][a-z0-9_]{1,63}$'),
 source text not null check(source in ('admin','beta','google_play','apple','included','credits')),
 source_ref text not null check(length(source_ref) between 1 and 240),status text not null check(status in ('active','revoked')),
 starts_at timestamptz not null default now(),expires_at timestamptz,
 check(expires_at is null or expires_at>starts_at),unique(user_id,feature,source,source_ref)
);
create index addon_user_feature on private.addon_entitlements(user_id,feature);
create table private.addon_feature_flags (feature text primary key,enabled boolean not null default false,public_enabled boolean not null default false);
insert into private.addon_feature_flags(feature) values('ai_plus');
create table private.addon_internal_accounts (user_id uuid primary key references auth.users(id) on delete cascade);
alter table private.addon_entitlements enable row level security;
alter table private.addon_feature_flags enable row level security;
alter table private.addon_internal_accounts enable row level security;
revoke all on private.addon_entitlements,private.addon_feature_flags,private.addon_internal_accounts from public,anon,authenticated;
grant select,insert,update,delete on private.addon_entitlements,private.addon_feature_flags,private.addon_internal_accounts to service_role;
create function private.ai_plus_access() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=auth.uid(); flags private.addon_feature_flags; internal boolean; entitled boolean;
begin
 perform private.require_adult_account();perform private.require_feature('personal');
 select * into flags from private.addon_feature_flags where feature='ai_plus';
 internal:=private.nm_support_staff() or exists(select 1 from private.addon_internal_accounts where user_id=actor);
 if not coalesce(flags.enabled,false) or not (coalesce(flags.public_enabled,false) or internal) then return jsonb_build_object('visible',false,'allowed',false,'reason','disabled');end if;
 select exists(select 1 from private.addon_entitlements where user_id=actor and feature='ai_plus' and status='active' and starts_at<=now() and (expires_at is null or expires_at>now())) into entitled;
 return jsonb_build_object('visible',true,'allowed',entitled,'reason',case when entitled then 'allowed' else 'entitlement_required' end);
end $$;
revoke all on function private.ai_plus_access() from public,anon;
grant execute on function private.ai_plus_access() to authenticated;
create function public.nm_ai_plus_access() returns jsonb language sql security invoker set search_path='' as $$select private.ai_plus_access()$$;
revoke all on function public.nm_ai_plus_access() from public,anon;
grant execute on function public.nm_ai_plus_access() to authenticated;
comment on table public.pose_projects is 'Private lifecycle, never a public sharing payload; existing sources remain intact.';
comment on table public.pose_reminders is 'Desired reminders only; no scheduling or delivery in lot 1.';
commit;
