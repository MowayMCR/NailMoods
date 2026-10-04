begin;
-- Internal experiment only: never changes Free/Plus/Pro, billing or beta grants.
create table private.ai_jobs (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null, project_id uuid references public.pose_projects(id) on delete set null,
 feature text not null check(feature in ('analyzeOutfit','analyzeInspiration','generateTryOn','generateVariation','analyzeHand')),
 status text not null default 'reserved' check(status in ('reserved','succeeded','failed')),
 provider text, model text, render_count integer not null default 0 check(render_count>=0),
 estimated_cost_usd numeric(12,6) not null default 0 check(estimated_cost_usd>=0),
 result jsonb, error_code text, created_at timestamptz not null default now(), completed_at timestamptz, deleted_at timestamptz,
 unique(user_id,request_id)
);
create index ai_jobs_user_date on private.ai_jobs(user_id,created_at desc);
create index ai_jobs_project on private.ai_jobs(project_id);
create table private.ai_quotas(user_id uuid primary key references auth.users(id) on delete cascade,daily_limit integer not null default 10 check(daily_limit between 0 and 100));
alter table private.ai_jobs enable row level security;
alter table private.ai_quotas enable row level security;
revoke all on private.ai_jobs,private.ai_quotas from public,anon,authenticated;
grant all on private.ai_jobs,private.ai_quotas to service_role;
create function private.ai_internal_guard() returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); a jsonb;
begin
 if actor is null then raise exception 'authentication_required' using errcode='42501';end if;
 -- Guard remains internal even if a future public feature flag is accidentally enabled.
 if not (private.nm_support_staff() or exists(select 1 from private.addon_internal_accounts where user_id=actor)) then raise exception 'AI_INTERNAL_ONLY' using errcode='42501';end if;
 a:=private.ai_plus_access();
 if not coalesce((a->>'allowed')::boolean,false) then raise exception 'AI_NOT_ALLOWED' using errcode='42501';end if;
 return actor;
end $$;
create function private.ai_job_view(j private.ai_jobs) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_build_object('id',j.id,'projectId',j.project_id,'feature',j.feature,'status',j.status,'result',j.result,'error',j.error_code,'createdAt',j.created_at,'completedAt',j.completed_at)
$$;
create function private.ai_begin(p_request uuid,p_project uuid,p_feature text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.ai_internal_guard(); j private.ai_jobs; quota integer; count_today integer;
begin
 if p_request is null or p_feature not in ('analyzeOutfit','analyzeInspiration','generateTryOn','generateVariation','analyzeHand') or p_feature is null then raise exception 'AI_INVALID_REQUEST';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,713));
 if not exists(select 1 from public.pose_projects where id=p_project and user_id=actor) then raise exception 'AI_PROJECT_UNAVAILABLE' using errcode='42501';end if;
 if p_feature in ('analyzeOutfit','analyzeInspiration','generateTryOn','analyzeHand') then perform private.require_feature('photo_projects');end if;
 select * into j from private.ai_jobs where user_id=actor and request_id=p_request;
 if found then
  if j.feature<>p_feature or j.project_id is distinct from p_project or j.deleted_at is not null then raise exception 'AI_REQUEST_CONFLICT';end if;
  return private.ai_job_view(j)||jsonb_build_object('claimed',false);
 end if;
 select coalesce((select daily_limit from private.ai_quotas where user_id=actor),10) into quota;
 select count(*) into count_today from private.ai_jobs where user_id=actor and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
 if count_today>=quota then raise exception 'AI_QUOTA_EXCEEDED' using errcode='P0001';end if;
 insert into private.ai_jobs(user_id,request_id,project_id,feature) values(actor,p_request,p_project,p_feature) returning * into j;
 return private.ai_job_view(j)||jsonb_build_object('claimed',true);
end $$;
create function private.ai_finish(p_id uuid,p_user uuid,p_result jsonb,p_error text default null) returns boolean language plpgsql security definer set search_path='' as $$
begin
 -- Only the zero-cost experimental adapter is shipped. Client-provided provider/cost values are never accepted.
 if octet_length(coalesce(p_result,'null'::jsonb)::text)>16384 or length(coalesce(p_error,''))>80 then raise exception 'AI_RESULT_INVALID';end if;
 update private.ai_jobs set status=case when p_error is null then 'succeeded' else 'failed' end,result=p_result,error_code=p_error,provider='internal-contract',model='no-generation-v1',estimated_cost_usd=0,render_count=0,completed_at=clock_timestamp()
 where id=p_id and user_id=p_user and status='reserved' and deleted_at is null;
 return found;
end $$;
create function private.ai_history() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.ai_internal_guard();result jsonb;
begin
 select coalesce(jsonb_agg(private.ai_job_view(j) order by j.created_at desc),'[]'::jsonb) into result from (select * from private.ai_jobs where user_id=actor and deleted_at is null order by created_at desc limit 50) j;
 return result;
end $$;
create function private.ai_delete(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.ai_internal_guard();
begin
 update private.ai_jobs set deleted_at=now(),result=null,error_code=null,project_id=null where id=p_id and user_id=actor and deleted_at is null;
 return found;
end $$;
create function public.nm_ai_begin(p_request uuid,p_project uuid,p_feature text) returns jsonb language sql security invoker set search_path='' as $$select private.ai_begin(p_request,p_project,p_feature)$$;
create function public.nm_ai_finish(p_id uuid,p_user uuid,p_result jsonb,p_error text default null) returns boolean language sql security invoker set search_path='' as $$select private.ai_finish(p_id,p_user,p_result,p_error)$$;
create function public.nm_ai_history() returns jsonb language sql security invoker set search_path='' as $$select private.ai_history()$$;
create function public.nm_ai_delete(p_id uuid) returns boolean language sql security invoker set search_path='' as $$select private.ai_delete(p_id)$$;
revoke all on function private.ai_internal_guard(),private.ai_job_view(private.ai_jobs),private.ai_begin(uuid,uuid,text),private.ai_finish(uuid,uuid,jsonb,text),private.ai_history(),private.ai_delete(uuid) from public,anon,authenticated;
revoke all on function public.nm_ai_begin(uuid,uuid,text),public.nm_ai_finish(uuid,uuid,jsonb,text),public.nm_ai_history(),public.nm_ai_delete(uuid) from public,anon,authenticated;
grant execute on function private.ai_begin(uuid,uuid,text),private.ai_history(),private.ai_delete(uuid),public.nm_ai_begin(uuid,uuid,text),public.nm_ai_history(),public.nm_ai_delete(uuid) to authenticated;
grant execute on function private.ai_finish(uuid,uuid,jsonb,text),public.nm_ai_finish(uuid,uuid,jsonb,text) to service_role;
comment on table private.ai_jobs is 'Private internal usage ledger. Content deletion clears results; quota metadata stays until account deletion. No paid provider configured.';
commit;
