-- Only before real outfit data exists. Prefer disabling VITE_POSE_CYCLE_ENABLED otherwise.
begin;
do $$begin if exists(select 1 from public.pose_projects where details->>'source'='outfit') then raise exception 'ROLLBACK_REFUSED_OUTFIT_DATA_PRESENT';end if;end$$;
drop function public.save_pose_outfit(jsonb,jsonb);
drop trigger pose_media_cleanup on public.pose_projects;
drop function private.pose_media_cleanup();
do $$declare prior text;begin prior:=pg_get_functiondef('private.media_cleanup_before_pose(text,text)'::regprocedure);execute replace(prior,'private.media_cleanup_before_pose','public.media_cleanup_in_use');end$$;
drop function private.media_cleanup_before_pose(text,text);
create or replace function private.pose_guard() returns trigger language plpgsql security definer set search_path='' as $$
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
commit;
