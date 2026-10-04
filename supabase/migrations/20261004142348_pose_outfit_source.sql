-- Lot 2, recette first. No new outfit or event table.
begin;
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
  -- Outfit reference only; future follow-up and AI media remain closed.
  if d->'referenceMedia'<>'[]'::jsonb or d->'followUp'<>'[]'::jsonb or d->'aiJobIds'<>'[]'::jsonb
   or d::text ~* '(data:image/|blob:|X-Amz-Signature|[?&]token=)' then raise exception 'POSE_MEDIA_NOT_ENABLED' using errcode='23514';end if;
  if d->'outfitMedia'<>'null'::jsonb then
   if d->>'source'<>'outfit' or jsonb_typeof(d->'outfitMedia')<>'object'
    or d#>>'{outfitMedia,bucket}' is distinct from 'nailmoods-private'
    or coalesce(d#>>'{outfitMedia,contentType}','') not in ('image/jpeg','image/png','image/webp')
    or coalesce((d#>>'{outfitMedia,bytes}')::bigint,0) not between 1 and 5242880
    or not (d#>>'{outfitMedia,path}' = any(array[new.user_id::text||'/'||new.workspace_id::text||'/pose/'||new.id::text||'.jpg',new.user_id::text||'/'||new.workspace_id::text||'/pose/'||new.id::text||'.png',new.user_id::text||'/'||new.workspace_id::text||'/pose/'||new.id::text||'.webp']))
    then raise exception 'POSE_OUTFIT_MEDIA_INVALID' using errcode='23514';end if;
   if not exists(select 1 from storage.objects where bucket_id='nailmoods-private' and name=d#>>'{outfitMedia,path}' and owner_id=new.user_id::text) then raise exception 'POSE_OUTFIT_MEDIA_MISSING' using errcode='23514';end if;
  end if;
  if d ? 'outfit' then
   if d#>>'{outfit,version}' is distinct from '1' or coalesce(d#>>'{outfit,mode}','') not in ('match','contrast','quiet','bold','surprise') or jsonb_typeof(d#>'{outfit,collectionOnly}') is distinct from 'boolean' or jsonb_typeof(d#>'{outfit,colors}') is distinct from 'array' then raise exception 'POSE_OUTFIT_INVALID' using errcode='23514';end if;
   if jsonb_array_length(d#>'{outfit,colors}') not between 1 and 5 or exists(select 1 from jsonb_array_elements_text(d#>'{outfit,colors}') c where c !~* '^#[0-9a-f]{6}$') then raise exception 'POSE_OUTFIT_COLORS_INVALID' using errcode='23514';end if;
  end if;
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

-- Retain all pre-existing reference rules (including future deployment differences).
do $$declare old_definition text;begin
 old_definition:=pg_get_functiondef('public.media_cleanup_in_use(text,text)'::regprocedure);
 execute replace(old_definition,'public.media_cleanup_in_use','private.media_cleanup_before_pose');
end$$;
revoke all on function private.media_cleanup_before_pose(text,text) from public,anon,authenticated;
create or replace function public.media_cleanup_in_use(p_bucket text,p_path text) returns boolean language sql stable security definer set search_path='' as $$
 select private.media_cleanup_before_pose(p_bucket,p_path) or exists(select 1 from public.pose_projects where p_bucket='nailmoods-private' and details#>>'{outfitMedia,path}'=p_path)
$$;
revoke all on function public.media_cleanup_in_use(text,text) from public,anon,authenticated;
grant execute on function public.media_cleanup_in_use(text,text) to service_role;
create function private.pose_media_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
declare previous_path text:=old.details#>>'{outfitMedia,path}';begin
 if previous_path is not null and (tg_op='DELETE' or previous_path is distinct from new.details#>>'{outfitMedia,path}') then
  insert into public.media_cleanup_jobs(bucket,object_path,reason) values('nailmoods-private',previous_path,'pose_removed')
   on conflict (bucket,object_path) where status in ('pending','processing','failed') do nothing;
 end if;
 return null;
end$$;
revoke all on function private.pose_media_cleanup() from public,anon,authenticated;
create trigger pose_media_cleanup after update of details or delete on public.pose_projects for each row execute function private.pose_media_cleanup();
-- Atomic, idempotent initial save: one project and optional existing Planning object.
create function public.save_pose_outfit(p_project jsonb,p_event jsonb default null) returns public.pose_projects language plpgsql security invoker set search_path='' as $$
declare saved public.pose_projects;actor uuid:=auth.uid();space uuid:=(p_project->>'workspace_id')::uuid;begin
 if actor is null or p_project->>'user_id' is distinct from actor::text or p_project#>>'{details,source}' is distinct from 'outfit' then raise exception 'POSE_OWNER_REQUIRED' using errcode='42501';end if;
 perform private.require_feature('photo_projects');
 if not private.pose_owner(actor,space) then raise exception 'POSE_OWNER_REQUIRED' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_project->>'id',0));
 select * into saved from public.pose_projects where id=(p_project->>'id')::uuid;
 if found then
  if saved.user_id<>actor or saved.workspace_id<>space or saved.details->>'source'<>'outfit' then raise exception 'POSE_OWNER_REQUIRED' using errcode='42501';end if;
  return saved;
 end if;
 insert into public.pose_projects(id,user_id,workspace_id,title,status,details)
 values((p_project->>'id')::uuid,actor,space,p_project->>'title','idea',p_project->'details') returning * into saved;
 if p_event is not null and p_event<>'null'::jsonb then
  insert into public.pose_plan_items(id,user_id,workspace_id,project_id,title,kind,scheduled_on,timezone,starts_at,ends_at,location,notes)
  values((p_event->>'id')::uuid,actor,space,saved.id,p_event->>'title','event',(p_event->>'scheduled_on')::date,p_event->>'timezone',null,null,coalesce(p_event->>'location',''),coalesce(p_event->>'notes',''));
 end if;
 return saved;
end$$;
revoke all on function public.save_pose_outfit(jsonb,jsonb) from public,anon;
grant execute on function public.save_pose_outfit(jsonb,jsonb) to authenticated;
commit;
