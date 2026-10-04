-- Preserve Free follow-up for an already saved, owned Journal pose.
begin;
create or replace function private.pose_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare d jsonb;field text;realized date;entry jsonb;entry_date date;removed date;seen text[]:=array[]::text[];prefix text;
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
  -- Outfit and follow-up references are private; AI remains closed.
  if d->'referenceMedia'<>'[]'::jsonb or d->'aiJobIds'<>'[]'::jsonb
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
  if d->>'removedOn' is not null then
   if d->>'removedOn' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'POSE_REMOVAL_DATE_INVALID' using errcode='23514';end if;
   removed:=(d->>'removedOn')::date;
   if realized is null or not isfinite(removed) or removed<realized or removed>(now() at time zone 'Pacific/Kiritimati')::date then raise exception 'POSE_REMOVAL_DATE_INVALID' using errcode='23514';end if;
  end if;
  if jsonb_array_length(d->'followUp')>200 then raise exception 'POSE_FOLLOWUP_LIMIT' using errcode='23514';end if;
  for entry in select value from jsonb_array_elements(d->'followUp') loop
   if jsonb_typeof(entry) is distinct from 'object' or not (entry ?& array['id','date','note','feeling','state','media']) or entry-array['id','date','note','feeling','state','media']<>'{}'::jsonb
    or coalesce(entry->>'id','') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' or entry->>'id'=any(seen)
    or jsonb_typeof(entry->'note') is distinct from 'string' or length(entry->>'note')>2000
    or coalesce(entry->>'feeling','!') not in ('','comfortable','sensitive','other') or coalesce(entry->>'state','!') not in ('','intact','growth','chipped','lifting','other')
    then raise exception 'POSE_FOLLOWUP_INVALID' using errcode='23514';end if;
   seen:=array_append(seen,entry->>'id');
   if realized is null or coalesce(entry->>'date','') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'POSE_FOLLOWUP_DATE_INVALID' using errcode='23514';end if;
   entry_date:=(entry->>'date')::date;
   if not isfinite(entry_date) or entry_date<realized or entry_date>(now() at time zone 'Pacific/Kiritimati')::date then raise exception 'POSE_FOLLOWUP_DATE_INVALID' using errcode='23514';end if;
   if entry->'media'<>'null'::jsonb then
    prefix:=new.user_id::text||'/'||new.workspace_id::text||'/followup/'||new.id::text||'-'||(entry->>'id')||'-';
    if jsonb_typeof(entry->'media') is distinct from 'object' or entry#>>'{media,bucket}' is distinct from 'nailmoods-private'
     or coalesce(entry#>>'{media,contentType}','') not in ('image/jpeg','image/png','image/webp')
     or coalesce((entry#>>'{media,bytes}')::bigint,0) not between 1 and 5242880
     or left(coalesce(entry#>>'{media,path}',''),length(prefix))<>prefix
     or substring(entry#>>'{media,path}' from length(prefix)+1) !~ '^[0-9a-f-]{36}\.(jpg|png|webp)$'
     then raise exception 'POSE_FOLLOWUP_MEDIA_INVALID' using errcode='23514';end if;
    if not exists(select 1 from storage.objects where bucket_id='nailmoods-private' and name=entry#>>'{media,path}' and owner_id=new.user_id::text) then raise exception 'POSE_FOLLOWUP_MEDIA_MISSING' using errcode='23514';end if;
   elsif btrim(entry->>'note')='' and entry->>'state'='' and entry->>'feeling'='' then raise exception 'POSE_FOLLOWUP_EMPTY' using errcode='23514';end if;
  end loop;
  if new.status in ('done','follow_up','removal_due') and realized is null then raise exception 'POSE_REALIZED_DATE_REQUIRED' using errcode='23514';end if;
  if new.source_inspiration_id is not null and not exists(select 1 from public.inspirations i where i.id=new.source_inspiration_id and i.created_by=new.user_id and i.workspace_id=new.workspace_id) then raise exception 'POSE_SOURCE_FORBIDDEN' using errcode='42501';end if;
  if new.journal_entry_id is not null and not exists(select 1 from public.journal_entries j where j.id=new.journal_entry_id and j.created_by=new.user_id and j.workspace_id=new.workspace_id) then raise exception 'POSE_JOURNAL_FORBIDDEN' using errcode='42501';end if;
  if auth.uid() is not null and (d->>'source' in ('outfit','image') or d#>>'{composition,intent}'='photos' or d->'composition' ?| array['photoSources','photoInspiration'] or (tg_op='UPDATE' and (old.details->>'source' in ('outfit','image') or old.details#>>'{composition,intent}'='photos'))) then
   if tg_op='INSERT' then
    -- Following an already owned Journal entry is personal, not a new photo-import feature.
    if not (d->>'source'='journal' and new.journal_entry_id is not null) then perform private.require_feature('photo_projects');end if;
   elsif (d-array['followUp','realizedOn','removedOn']) is distinct from (old.details-array['followUp','realizedOn','removedOn']) then perform private.require_feature('photo_projects');end if;
  end if;
 elsif tg_table_name='pose_plan_items' then
  if not exists(select 1 from pg_catalog.pg_timezone_names where name=new.timezone) then raise exception 'POSE_TIMEZONE_INVALID' using errcode='23514';end if;
  if new.starts_at is not null and (new.starts_at at time zone new.timezone)::date<>new.scheduled_on then raise exception 'POSE_TIME_DATE_MISMATCH' using errcode='23514';end if;
 end if;
 return new;
end $$;



commit;
