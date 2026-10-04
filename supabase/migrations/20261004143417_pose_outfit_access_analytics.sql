-- Keep the public save RPC SECURITY INVOKER; use the existing public capability projection.
begin;
create or replace function public.save_pose_outfit(p_project jsonb,p_event jsonb default null) returns public.pose_projects language plpgsql security invoker set search_path='' as $$
declare saved public.pose_projects;actor uuid:=auth.uid();space uuid:=(p_project->>'workspace_id')::uuid;begin
 if actor is null or p_project->>'user_id' is distinct from actor::text or p_project#>>'{details,source}' is distinct from 'outfit' then raise exception 'POSE_OWNER_REQUIRED' using errcode='42501';end if;
 if coalesce(public.nm_capabilities()->>'tier','free') not in ('plus','pro') then raise exception 'FEATURE_REQUIRES_PLUS' using errcode='42501';end if;
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

insert into private.analytics_event_catalog(event_name,category,allowed_metadata_keys) values('outfit_imported','creation',array['source']),('pose_event_created','journal',array['source']) on conflict(event_name) do nothing;
commit;
