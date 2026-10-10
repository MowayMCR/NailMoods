begin;
-- Isolated AI service. All commercial assumptions and provider calls default OFF.
create table private.ai2_config (
 id boolean primary key default true check(id), enabled boolean not null default false,
 daily_usd numeric(12,6) not null default 0 check(daily_usd>=0), monthly_usd numeric(12,6) not null default 0 check(monthly_usd>=0),
 daily_requests integer not null default 10 check(daily_requests between 0 and 100),
 operations jsonb not null default '{}', monthly_plus integer not null default 0 check(monthly_plus>=0), monthly_pro integer not null default 0 check(monthly_pro>=0),
 purchases_enabled boolean not null default false, rewards_enabled boolean not null default false
);
insert into private.ai2_config default values;
create table private.ai2_accounts(user_id uuid primary key references auth.users on delete cascade);
create table private.ai2_threads(id uuid primary key,user_id uuid not null references auth.users on delete cascade,workspace_id uuid not null references public.workspaces on delete cascade,title text not null check(length(title)<=100),created_at timestamptz not null default now(),deleted_at timestamptz);
create table private.ai2_grants(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,bucket text not null check(bucket in ('purchased','monthly','reward','manual')),source text not null,source_ref text not null,quantity integer not null check(quantity>0),remaining integer not null check(remaining>=0 and remaining<=quantity),expires_at timestamptz,created_at timestamptz not null default now(),unique(source,source_ref),check(bucket<>'purchased' or expires_at is null));
create table private.ai2_jobs(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,thread_id uuid not null references private.ai2_threads,request_id uuid not null,fingerprint text not null,operation text not null,tier text not null,status text not null default 'reserved' check(status in ('reserved','succeeded','failed','cancelled')),credit_cost integer not null check(credit_cost>=0),reserve_usd numeric(12,6) not null check(reserve_usd>0),accounted_usd numeric(12,6),cost_known boolean not null default false,usage jsonb,result jsonb,media_path text,error_code text,created_at timestamptz not null default now(),completed_at timestamptz,unique(user_id,request_id));
create index ai2_jobs_time on private.ai2_jobs(created_at);
create index ai2_jobs_user on private.ai2_jobs(user_id,created_at);
create table private.ai2_holds(job_id uuid references private.ai2_jobs on delete cascade,grant_id uuid references private.ai2_grants on delete cascade,quantity integer not null check(quantity>0),primary key(job_id,grant_id));
create table private.ai2_ledger(id bigint generated always as identity primary key,user_id uuid not null references auth.users on delete cascade,job_id uuid references private.ai2_jobs on delete cascade,grant_id uuid references private.ai2_grants on delete cascade,event text not null check(event in ('grant','reserve','consume','refund')),quantity integer not null check(quantity>0),created_at timestamptz not null default now());
create table private.ai2_messages(id bigint generated always as identity primary key,thread_id uuid not null references private.ai2_threads on delete cascade,job_id uuid not null references private.ai2_jobs on delete cascade,role text not null check(role in ('user','assistant')),content jsonb not null,created_at timestamptz not null default now(),unique(job_id,role));
-- No direct Data API exposure. RPCs below separate authenticated reads from service writes.
do $$declare t text;begin foreach t in array array['ai2_config','ai2_accounts','ai2_threads','ai2_grants','ai2_jobs','ai2_holds','ai2_ledger','ai2_messages'] loop
 execute format('alter table private.%I enable row level security',t);
 execute format('revoke all on private.%I from public,anon,authenticated',t);
 end loop;end$$;

create function private.ai2_actor() returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();begin
 if actor is null then raise exception 'authentication_required' using errcode='42501';end if;
 if to_regprocedure('private.nm_session_assert()') is not null then execute 'select private.nm_session_assert()';end if;
 return actor;
end$$;
create function private.ai2_access() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.ai2_actor();cfg private.ai2_config;allowed boolean;begin
 perform private.require_adult_account();
 if private.nm_account_suspended(actor) then raise exception 'account_suspended' using errcode='42501';end if;
 select * into cfg from private.ai2_config where id;
 allowed:=cfg.enabled and exists(select 1 from private.ai2_accounts where user_id=actor);
 return jsonb_build_object('allowed',allowed,'admin',private.nm_support_staff(),'tier',private.effective_tier(actor),'operations',case when allowed then cfg.operations else '{}'::jsonb end,'balance',coalesce((select jsonb_object_agg(bucket,n) from (select bucket,sum(remaining) n from private.ai2_grants where user_id=actor and (expires_at is null or expires_at>now()) group by bucket) q),'{}'::jsonb));
end$$;
create function private.ai2_grant(actor uuid,bucket_value text,source_value text,reference_value text,amount integer,expiry timestamptz default null) returns uuid language plpgsql security definer set search_path='' as $$
declare g private.ai2_grants;begin
 if actor is null or amount is null or amount<=0 or amount>100000 or length(reference_value) not between 1 and 250 then raise exception 'invalid_grant';end if;
 if bucket_value='purchased' and (not (select purchases_enabled from private.ai2_config where id) or source_value not in ('apple','google_play') or expiry is not null) then raise exception 'purchases_disabled';end if;
 if bucket_value='reward' and source_value<>'admob_ssv' then raise exception 'invalid_reward';end if;
 select * into g from private.ai2_grants where source=source_value and source_ref=reference_value;
 if found then if g.user_id<>actor or g.quantity<>amount or g.bucket<>bucket_value then raise exception 'grant_conflict';end if;return g.id;end if;
 insert into private.ai2_grants(user_id,bucket,source,source_ref,quantity,remaining,expires_at) values(actor,bucket_value,source_value,reference_value,amount,amount,expiry) returning * into g;
 insert into private.ai2_ledger(user_id,grant_id,event,quantity) values(actor,g.id,'grant',amount);
 return g.id;
end$$;

create function private.ai2_begin(actor uuid,request_value uuid,thread_value uuid,workspace_value uuid,operation_value text,fingerprint_value text,prompt_value text) returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.ai2_config;j private.ai2_jobs;g private.ai2_grants;t private.ai2_threads;cost numeric;credits integer;need integer;take integer;tier_value text;allocation integer;op jsonb;begin
 -- A single global transaction lock makes budget admission + credit reservation atomic.
 perform pg_advisory_xact_lock(71320261010);
 select * into cfg from private.ai2_config where id for update;
 if actor is null or not cfg.enabled or not exists(select 1 from private.ai2_accounts where user_id=actor) or private.nm_account_suspended(actor) then raise exception 'ai_disabled';end if;
 if request_value is null or thread_value is null or fingerprint_value!~'^[a-f0-9]{64}$' or length(prompt_value) not between 1 and 3000 then raise exception 'invalid_request';end if;
 if not exists(select 1 from public.workspaces where id=workspace_value and owner_user_id=actor) then raise exception 'workspace_unavailable';end if;
 select * into j from private.ai2_jobs where user_id=actor and request_id=request_value;
 if found then
  if j.fingerprint<>fingerprint_value or j.thread_id<>thread_value or j.operation<>operation_value then raise exception 'request_conflict';end if;
  return jsonb_build_object('claimed',false,'job',to_jsonb(j));
 end if;
 op:=cfg.operations->operation_value;
 if op is null or not coalesce((op->>'enabled')::boolean,false) then raise exception 'capability_disabled';end if;
 cost:=(op->>'maxUsd')::numeric;credits:=(op->>'credits')::integer;
 if cost is null or cost<=0 or cost>10 or credits is null or credits<0 or credits>100 then raise exception 'configuration_invalid';end if;
 if (select count(*) from private.ai2_jobs where user_id=actor and created_at>=date_trunc('day',now(),'UTC'))>=cfg.daily_requests then raise exception 'daily_quota_exceeded';end if;
 if cost+coalesce((select sum(coalesce(accounted_usd,reserve_usd)) from private.ai2_jobs where created_at>=date_trunc('day',now(),'UTC') or not cost_known),0)>cfg.daily_usd
 or cost+coalesce((select sum(coalesce(accounted_usd,reserve_usd)) from private.ai2_jobs where created_at>=date_trunc('month',now(),'UTC') or not cost_known),0)>cfg.monthly_usd then raise exception 'budget_exceeded';end if;
 tier_value:=coalesce(private.effective_tier(actor),'free');
 allocation:=case tier_value when 'plus' then cfg.monthly_plus when 'pro' then cfg.monthly_pro else 0 end;
 if allocation>0 and not exists(select 1 from private.ai2_grants where source='monthly' and source_ref=actor::text||':'||to_char(now() at time zone 'UTC','YYYY-MM')) then
 perform private.ai2_grant(actor,'monthly','monthly',actor::text||':'||to_char(now() at time zone 'UTC','YYYY-MM'),allocation,date_trunc('month',now(),'UTC')+interval '1 month');end if;
 if coalesce((select sum(remaining) from private.ai2_grants where user_id=actor and (expires_at is null or expires_at>now())),0)<credits then raise exception 'insufficient_credits';end if;
 select * into t from private.ai2_threads where id=thread_value;
 if found and (t.user_id<>actor or t.workspace_id<>workspace_value or t.deleted_at is not null) then raise exception 'conversation_unavailable';end if;
 if not found then insert into private.ai2_threads(id,user_id,workspace_id,title) values(thread_value,actor,workspace_value,left(prompt_value,100));end if;
 if exists(select 1 from private.ai2_jobs where thread_id=thread_value and status='reserved') then raise exception 'conversation_busy';end if;
 insert into private.ai2_jobs(user_id,request_id,thread_id,fingerprint,operation,tier,credit_cost,reserve_usd) values(actor,request_value,thread_value,fingerprint_value,operation_value,tier_value,credits,cost) returning * into j;
 need:=credits;
 for g in select * from private.ai2_grants where user_id=actor and remaining>0 and (expires_at is null or expires_at>now()) order by expires_at nulls last,created_at,id for update loop
 exit when need=0;take:=least(need,g.remaining);
 update private.ai2_grants set remaining=remaining-take where id=g.id;
 insert into private.ai2_holds values(j.id,g.id,take);
 insert into private.ai2_ledger(user_id,job_id,grant_id,event,quantity) values(actor,j.id,g.id,'reserve',take);
 need:=need-take;end loop;
 insert into private.ai2_messages(thread_id,job_id,role,content) values(thread_value,j.id,'user',jsonb_build_object('text',prompt_value));
 return jsonb_build_object('claimed',true,'job',to_jsonb(j));
end$$;

create function private.ai2_finish(actor uuid,job_value uuid,result_value jsonb,usage_value jsonb,cost_value numeric,error_value text default null) returns boolean language plpgsql security definer set search_path='' as $$
declare j private.ai2_jobs;h private.ai2_holds;deleted boolean;ok boolean;begin
 perform pg_advisory_xact_lock(71320261010);
 select * into j from private.ai2_jobs where id=job_value and user_id=actor for update;
 if not found or j.status<>'reserved' then return false;end if;
 if cost_value<0 or octet_length(coalesce(result_value,'null')::text)>100000 or octet_length(coalesce(usage_value,'null')::text)>5000 then raise exception 'invalid_result';end if;
 select deleted_at is not null into deleted from private.ai2_threads where id=j.thread_id;
 ok:=error_value is null and result_value is not null and not deleted;
 update private.ai2_jobs set status=case when deleted then 'cancelled' when ok then 'succeeded' else 'failed' end,result=case when ok then result_value end,media_path=result_value->>'imagePath',usage=usage_value,accounted_usd=cost_value,cost_known=cost_value is not null,error_code=left(error_value,80),completed_at=now() where id=j.id;
 for h in select * from private.ai2_holds where job_id=j.id loop
 if not ok then update private.ai2_grants set remaining=remaining+h.quantity where id=h.grant_id;end if;
 insert into private.ai2_ledger(user_id,job_id,grant_id,event,quantity) values(actor,j.id,h.grant_id,case when ok then 'consume' else 'refund' end,h.quantity);
 end loop;
 if deleted and result_value->>'imagePath' is not null then insert into public.media_cleanup_jobs(bucket,object_path,reason) values('nailmoods-private',result_value->>'imagePath','pose_removed') on conflict(bucket,object_path) where status in ('pending','processing','failed') do nothing;end if;
 if ok then insert into private.ai2_messages(thread_id,job_id,role,content) values(j.thread_id,j.id,'assistant',result_value);end if;
 -- Preserve full estimates, including calls whose output was invalid or not saved.
 if cost_value>j.reserve_usd then update private.ai2_config set enabled=false where id;end if;
 return true;
end$$;
create function private.ai2_history(thread_value uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.ai2_actor();begin
 return jsonb_build_object('threads',coalesce((select jsonb_agg(to_jsonb(t) order by t.created_at desc) from (select id,title,created_at from private.ai2_threads where user_id=actor and deleted_at is null order by created_at desc limit 50)t),'[]'::jsonb),'messages',coalesce((select jsonb_agg(to_jsonb(m) order by m.id) from (select m.id,m.role,m.content,m.created_at from private.ai2_messages m join private.ai2_threads t on t.id=m.thread_id where t.user_id=actor and t.deleted_at is null and t.id=thread_value order by m.id desc limit 40)m),'[]'::jsonb));
end$$;
create function private.ai2_delete(thread_value uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.ai2_actor();begin
 perform pg_advisory_xact_lock(71320261010);
 update private.ai2_threads set deleted_at=now(),title='Supprimée' where id=thread_value and user_id=actor and deleted_at is null;
 if not found then return false;end if;
 insert into public.media_cleanup_jobs(bucket,object_path,reason) select 'nailmoods-private',media_path,'pose_removed' from private.ai2_jobs where thread_id=thread_value and media_path is not null on conflict(bucket,object_path) where status in ('pending','processing','failed') do nothing;
 delete from private.ai2_messages where thread_id=thread_value;
 update private.ai2_jobs set result=null where thread_id=thread_value;
 return true;
end$$;
create function private.ai2_metrics() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform private.ai2_actor();if not private.nm_support_staff() then raise exception 'not_allowed' using errcode='42501';end if;
 return jsonb_build_object('enabled',(select enabled from private.ai2_config where id),'activeUsers',(select count(distinct user_id) from private.ai2_jobs where created_at>now()-interval '30 days'),'byOperation',coalesce((select jsonb_agg(to_jsonb(q)) from (select operation,tier,status,count(*) requests,sum(credit_cost) credits,sum(accounted_usd) estimated_usd,count(*) filter(where not cost_known) unknown_costs from private.ai2_jobs group by operation,tier,status)q),'[]'::jsonb),'daily',coalesce((select jsonb_agg(to_jsonb(q)) from (select (created_at at time zone 'UTC')::date as day,sum(accounted_usd) estimated_usd,sum(case when not cost_known then reserve_usd else 0 end) unresolved_reserve_usd from private.ai2_jobs group by 1 order by 1 desc limit 31)q),'[]'::jsonb),'adRevenue',null,'invoicedCost',null);
end$$;
-- Server-only AdMob bridge: must refer to an actual confirmed SSV ticket.
create function private.ai2_reward(ticket_value uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare t private.ad_reward_tickets;g uuid;begin
 perform pg_advisory_xact_lock(71320261010);
 if not (select rewards_enabled from private.ai2_config where id) then raise exception 'rewards_disabled';end if;
 select * into t from private.ad_reward_tickets where id=ticket_value for update;
 if not found or t.confirmed_at is null or not exists(select 1 from private.ad_config where platform=t.platform and enabled and not test_only) then raise exception 'reward_unconfirmed';end if;
 g:=private.ai2_grant(t.user_id,'reward','admob_ssv',t.id::text,1,now()+interval '7 days');
 update private.ad_reward_tickets set used_at=coalesce(used_at,now()) where id=t.id;return g;
end$$;

create function public.nm_ai2_access() returns jsonb language sql security invoker set search_path='' as $$select private.ai2_access()$$;
create function public.nm_ai2_history(p_thread uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.ai2_history(p_thread)$$;
create function public.nm_ai2_delete(p_thread uuid) returns boolean language sql security invoker set search_path='' as $$select private.ai2_delete(p_thread)$$;
create function public.nm_ai2_metrics() returns jsonb language sql security invoker set search_path='' as $$select private.ai2_metrics()$$;
create function public.nm_ai2_begin(p_user uuid,p_request uuid,p_thread uuid,p_workspace uuid,p_operation text,p_fingerprint text,p_prompt text) returns jsonb language sql security invoker set search_path='' as $$select private.ai2_begin(p_user,p_request,p_thread,p_workspace,p_operation,p_fingerprint,p_prompt)$$;
create function public.nm_ai2_finish(p_user uuid,p_job uuid,p_result jsonb,p_usage jsonb,p_cost numeric,p_error text default null) returns boolean language sql security invoker set search_path='' as $$select private.ai2_finish(p_user,p_job,p_result,p_usage,p_cost,p_error)$$;
create function private.ai2_media_cleanup(thread_value uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.ai2_actor();begin
 return coalesce((select jsonb_agg(j.media_path) from private.ai2_jobs j join private.ai2_threads t on t.id=j.thread_id where t.id=thread_value and t.user_id=actor and t.deleted_at is not null and j.media_path is not null),'[]'::jsonb);
end$$;
create function private.ai2_media_cleaned(actor uuid,thread_value uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 update private.ai2_jobs j set media_path=null where j.thread_id=thread_value and j.user_id=actor and exists(select 1 from private.ai2_threads t where t.id=thread_value and t.user_id=actor and t.deleted_at is not null);return true;
end$$;
create function public.nm_ai2_media_cleanup(p_thread uuid) returns jsonb language sql security invoker set search_path='' as $$select private.ai2_media_cleanup(p_thread)$$;
create function public.nm_ai2_media_cleaned(p_user uuid,p_thread uuid) returns boolean language sql security invoker set search_path='' as $$select private.ai2_media_cleaned(p_user,p_thread)$$;
-- Service-only recovery, no provider retry and no new spending. Run before activation, then daily.
create function private.ai2_maintenance() returns integer language plpgsql security definer set search_path='' as $$
declare j private.ai2_jobs;n integer:=0;begin
 perform pg_advisory_xact_lock(71320261010);
 for j in select * from private.ai2_jobs where status='reserved' and created_at<now()-interval '15 minutes' loop
 perform private.ai2_finish(j.user_id,j.id,null,null,null,'worker_interrupted');n:=n+1;end loop;
 update private.ai2_threads set deleted_at=now(),title='Expirée' where deleted_at is null and id not in(select thread_id from private.ai2_jobs where created_at>now()-interval '90 days');
 insert into public.media_cleanup_jobs(bucket,object_path,reason) select 'nailmoods-private',j.media_path,'pose_removed' from private.ai2_jobs j join private.ai2_threads t on t.id=j.thread_id where t.deleted_at is not null and j.media_path is not null on conflict(bucket,object_path) where status in ('pending','processing','failed') do nothing;
 delete from private.ai2_messages where thread_id in(select id from private.ai2_threads where deleted_at is not null);
 update private.ai2_jobs set result=null,usage=null where thread_id in(select id from private.ai2_threads where deleted_at is not null);
 return n;
end$$;
create function public.nm_ai2_maintenance() returns integer language sql security invoker set search_path='' as $$select private.ai2_maintenance()$$;
-- Explicit privilege list; never inherit default PUBLIC execution for definer code.
do $$declare p record;begin
 for p in select proc.oid::regprocedure sig,proc.proname,n.nspname from pg_proc proc join pg_namespace n on n.oid=proc.pronamespace where n.nspname in ('private','public') and (proc.proname like 'ai2_%' or proc.proname like 'nm_ai2_%') loop
 execute format('revoke all on function %s from public,anon,authenticated',p.sig);
 if p.proname in ('ai2_access','ai2_history','ai2_delete','ai2_metrics','nm_ai2_access','nm_ai2_history','nm_ai2_delete','nm_ai2_metrics','ai2_media_cleanup','nm_ai2_media_cleanup') then execute format('grant execute on function %s to authenticated',p.sig);end if;
 if p.proname in ('ai2_begin','ai2_finish','ai2_reward','nm_ai2_begin','nm_ai2_finish','ai2_media_cleaned','nm_ai2_media_cleaned','ai2_maintenance','nm_ai2_maintenance') then execute format('grant execute on function %s to service_role',p.sig);end if;
 end loop;
end$$;
commit;
