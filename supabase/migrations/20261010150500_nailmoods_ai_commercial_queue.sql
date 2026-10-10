begin;
alter table private.ai2_config add column concurrency integer not null default 2 check(concurrency between 1 and 32),
 add column queue_limit integer not null default 50 check(queue_limit between 1 and 1000),
 add column circuit_until timestamptz, add column consecutive_failures integer not null default 0,
 add column tier_limits jsonb not null default '{"free":{"dailyUsd":0.2,"monthlyUsd":1,"dailyRequests":5},"plus":{"dailyUsd":0.5,"monthlyUsd":3,"dailyRequests":15},"pro":{"dailyUsd":1,"monthlyUsd":6,"dailyRequests":30}}';
alter table private.ai2_accounts add column limits jsonb not null default '{}';
alter table private.ai2_jobs add column started_at timestamptz;
create index ai2_jobs_reserved on private.ai2_jobs(user_id,created_at) where status='reserved';
create index ai2_jobs_unresolved on private.ai2_jobs(created_at) where not cost_known;
create index ai2_grants_balance on private.ai2_grants(user_id,expires_at) where remaining>0;
create table private.ai2_queue(job_id uuid primary key references private.ai2_jobs on delete cascade,payload jsonb not null check(octet_length(payload::text)<=1500000),state text not null default 'queued' check(state in ('queued','running')),enqueued_at timestamptz not null default now(),lease_until timestamptz);
create index ai2_queue_waiting on private.ai2_queue(enqueued_at) where state='queued';
create table private.ai2_dispatch_nonces(nonce_hash text primary key,expires_at timestamptz not null);
alter table private.ai2_queue enable row level security;
alter table private.ai2_dispatch_nonces enable row level security;
revoke all on private.ai2_queue,private.ai2_dispatch_nonces from public,anon,authenticated,service_role;

-- Retain the audited atomic credit and global-budget admission in one transaction.
alter function private.ai2_begin(uuid,uuid,uuid,uuid,text,text,text) rename to ai2_begin_core;
create function private.ai2_enqueue(actor uuid,request_value uuid,thread_value uuid,workspace_value uuid,operation_value text,fingerprint_value text,prompt_value text,payload_value jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.ai2_config; caps jsonb;op jsonb; cost numeric;r jsonb;tier_value text;begin
 perform pg_advisory_xact_lock(71320261010);
 select * into cfg from private.ai2_config where id;
 -- Replays still pass through the original authorization and fingerprint checks.
 if not exists(select 1 from private.ai2_jobs where user_id=actor and request_id=request_value) then
  if cfg.circuit_until>now() then raise exception 'provider_circuit_open';end if;
  if (select count(*) from private.ai2_queue)>=cfg.queue_limit then raise exception 'queue_full';end if;
  if (select count(*) from private.ai2_jobs where user_id=actor and status='reserved')>=2 then raise exception 'account_busy';end if;
  tier_value:=coalesce(private.effective_tier(actor),'free');
  caps:=coalesce(cfg.tier_limits->tier_value,'{}')||coalesce((select limits from private.ai2_accounts where user_id=actor),'{}');
  op:=cfg.operations->operation_value;cost:=(op->>'maxUsd')::numeric;
  if not (caps ?& array['dailyUsd','monthlyUsd','dailyRequests']) then raise exception 'quota_configuration_required';end if;
  if (select count(*) from private.ai2_jobs where user_id=actor and created_at>=date_trunc('day',now(),'UTC'))>=(caps->>'dailyRequests')::integer then raise exception 'daily_quota_exceeded';end if;
  if cost+coalesce((select sum(coalesce(accounted_usd,reserve_usd)) from private.ai2_jobs where user_id=actor and (created_at>=date_trunc('day',now(),'UTC') or not cost_known)),0)>(caps->>'dailyUsd')::numeric
  or cost+coalesce((select sum(coalesce(accounted_usd,reserve_usd)) from private.ai2_jobs where user_id=actor and (created_at>=date_trunc('month',now(),'UTC') or not cost_known)),0)>(caps->>'monthlyUsd')::numeric then raise exception 'account_budget_exceeded';end if;
  if op ? 'dailyRequests' and (select count(*) from private.ai2_jobs where user_id=actor and operation=operation_value and created_at>=date_trunc('day',now(),'UTC'))>=(op->>'dailyRequests')::integer then raise exception 'operation_quota_exceeded';end if;
 end if;
 r:=private.ai2_begin_core(actor,request_value,thread_value,workspace_value,operation_value,fingerprint_value,prompt_value);
 if (r->>'claimed')::boolean then insert into private.ai2_queue(job_id,payload) values((r->'job'->>'id')::uuid,payload_value);end if;
 return r;
end$$;
-- Old server admission cannot bypass the queue. Old clients go through the Edge API.
create function private.ai2_begin(actor uuid,request_value uuid,thread_value uuid,workspace_value uuid,operation_value text,fingerprint_value text,prompt_value text) returns jsonb language plpgsql security definer set search_path='' as $$begin raise exception 'queue_required';end$$;

alter function private.ai2_finish(uuid,uuid,jsonb,jsonb,numeric,text) rename to ai2_finish_core;
create function private.ai2_finish(actor uuid,job_value uuid,result_value jsonb,usage_value jsonb,cost_value numeric,error_value text default null) returns boolean language plpgsql security definer set search_path='' as $$
declare ok boolean;begin
 perform pg_advisory_xact_lock(71320261010);
 ok:=private.ai2_finish_core(actor,job_value,result_value,usage_value,cost_value,error_value);
 if ok then
  delete from private.ai2_queue where job_id=job_value;
  if error_value in ('provider_busy','provider_failed','provider_interrupted','moderation_unavailable','worker_interrupted') then
   update private.ai2_config set consecutive_failures=consecutive_failures+1,circuit_until=case when consecutive_failures+1>=3 then now()+interval '5 minutes' else circuit_until end where id;
  elsif error_value is null then update private.ai2_config set consecutive_failures=0 where id;end if;
 end if;return ok;
end$$;
create function private.ai2_queue_sweep() returns integer language plpgsql security definer set search_path='' as $$
declare item record;n integer:=0;begin
 perform pg_advisory_xact_lock(71320261010);
 for item in select j.id,j.user_id,q.state from private.ai2_queue q join private.ai2_jobs j on j.id=q.job_id join private.ai2_threads t on t.id=j.thread_id
 where (q.state='queued' and (q.enqueued_at<now()-interval '5 minutes' or t.deleted_at is not null or not (select enabled from private.ai2_config where id))) or (q.state='running' and q.lease_until<now()) loop
  perform private.ai2_finish(item.user_id,item.id,null,null,case when item.state='queued' then 0 else null end,case when item.state='queued' then 'queue_expired' else 'worker_interrupted' end);n:=n+1;
 end loop;return n;
end$$;
create function private.ai2_claim(actor uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.ai2_config;q private.ai2_queue;j private.ai2_jobs;settings jsonb;begin
 perform pg_advisory_xact_lock(71320261010);
 perform private.ai2_queue_sweep();select * into cfg from private.ai2_config where id;
 if not cfg.enabled or cfg.circuit_until>now() or (select count(*) from private.ai2_queue where state='running')>=cfg.concurrency then return null;end if;
 select queue.* into q from private.ai2_queue queue join private.ai2_jobs job on job.id=queue.job_id
 where queue.state='queued' and (actor is null or job.user_id=actor)
 and exists(select 1 from private.ai2_accounts a join private.account_administrators adm using(user_id) where a.user_id=job.user_id)
 and not private.nm_account_suspended(job.user_id)
 and not exists(select 1 from private.ai2_queue other join private.ai2_jobs active on active.id=other.job_id where other.state='running' and active.user_id=job.user_id)
 order by queue.enqueued_at,queue.job_id limit 1 for update of queue skip locked;
 if not found then return null;end if;
 update private.ai2_queue set state='running',lease_until=now()+interval '3 minutes' where job_id=q.job_id;
 update private.ai2_jobs set started_at=now() where id=q.job_id returning * into j;
 settings:=private.ai2_provider(j.user_id);
 settings:=settings||coalesce(cfg.operations->j.operation->'provider','{}');
 return jsonb_build_object('job',to_jsonb(j),'payload',q.payload,'provider',settings);
end$$;
create function private.ai2_status(job_value uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.ai2_actor();r jsonb;begin
 select jsonb_build_object('jobId',j.id,'status',case when j.status='reserved' then coalesce(q.state,'reserved') else j.status end,'result',j.result,'error',j.error_code) into r from private.ai2_jobs j left join private.ai2_queue q on q.job_id=j.id where j.id=job_value and j.user_id=actor;
 if r is null then raise exception 'not_allowed';end if;return r;
end$$;
create function private.ai2_health() returns jsonb language plpgsql security definer set search_path='' as $$begin
 if not private.nm_account_administrator() or not exists(select 1 from private.ai2_accounts where user_id=private.ai2_actor()) then raise exception 'not_allowed';end if;
 return jsonb_build_object('queued',(select count(*) from private.ai2_queue where state='queued'),'running',(select count(*) from private.ai2_queue where state='running'),'oldestWaitSeconds',(select coalesce(extract(epoch from now()-min(enqueued_at)),0) from private.ai2_queue where state='queued'),'circuitUntil',(select circuit_until from private.ai2_config where id),'concurrency',(select concurrency from private.ai2_config where id),'last24h',(select jsonb_build_object('requests',count(*),'failed',count(*) filter(where status='failed'),'unknownCosts',count(*) filter(where not cost_known),'queueP95Seconds',percentile_cont(0.95) within group(order by extract(epoch from started_at-created_at)),'runtimeP95Seconds',percentile_cont(0.95) within group(order by extract(epoch from completed_at-started_at))) from private.ai2_jobs where created_at>now()-interval '24 hours'));
end$$;
create function private.ai2_consume_dispatch(nonce_value text) returns boolean language plpgsql security definer set search_path='' as $$declare used text;begin
 if nonce_value is null or nonce_value!~'^[a-f0-9]{64}$' then return false;end if;
 delete from private.ai2_dispatch_nonces where nonce_hash=encode(sha256(convert_to(nonce_value,'UTF8')),'hex') and expires_at>clock_timestamp() returning nonce_hash into used;return used is not null;
end$$;
create function private.ai2_dispatch(url_value text) returns integer language plpgsql security definer set search_path='' as $$
declare nonce text;slots integer;i integer;begin
 if url_value!~'^https://[a-z]+\.supabase\.co/functions/v1/nailmoods-ai$' then raise exception 'invalid_dispatch_url';end if;
 perform private.ai2_queue_sweep();delete from private.ai2_dispatch_nonces where expires_at<=now();
 if not (select enabled and coalesce(circuit_until<=now(),true) from private.ai2_config where id) then return 0;end if;
 slots:=least((select concurrency from private.ai2_config where id),(select count(*) from private.ai2_queue where state='queued'));
 for i in 1..slots loop
 nonce:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into private.ai2_dispatch_nonces values(encode(sha256(convert_to(nonce,'UTF8')),'hex'),now()+interval '2 minutes');
 perform net.http_post(url:=url_value,headers:=jsonb_build_object('Content-Type','application/json','x-nm-ai-dispatch',nonce),body:='{"action":"dispatch"}',timeout_milliseconds:=5000);
 end loop;return slots;
end$$;
create function public.nm_ai2_enqueue(p_user uuid,p_request uuid,p_thread uuid,p_workspace uuid,p_operation text,p_fingerprint text,p_prompt text,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.ai2_enqueue(p_user,p_request,p_thread,p_workspace,p_operation,p_fingerprint,p_prompt,p_payload)$$;
create function public.nm_ai2_claim(p_user uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.ai2_claim(p_user)$$;
create function public.nm_ai2_consume_dispatch(p_nonce text) returns boolean language sql security invoker set search_path='' as $$select private.ai2_consume_dispatch(p_nonce)$$;
create function public.nm_ai2_status(p_job uuid) returns jsonb language sql security invoker set search_path='' as $$select private.ai2_status(p_job)$$;
create function public.nm_ai2_health() returns jsonb language sql security invoker set search_path='' as $$select private.ai2_health()$$;
do $$declare p record;begin
 for p in select proc.oid::regprocedure sig,proc.proname from pg_proc proc join pg_namespace n on n.oid=proc.pronamespace where n.nspname in ('private','public') and proc.proname in ('ai2_enqueue','ai2_claim','ai2_consume_dispatch','ai2_queue_sweep','ai2_dispatch','ai2_begin_core','ai2_begin','ai2_finish_core','ai2_finish','ai2_health','ai2_status','nm_ai2_enqueue','nm_ai2_claim','nm_ai2_consume_dispatch','nm_ai2_health','nm_ai2_status') loop
 execute format('revoke all on function %s from public,anon,authenticated,service_role',p.sig);
 if p.proname in ('ai2_status','ai2_health','nm_ai2_status','nm_ai2_health') then execute format('grant execute on function %s to authenticated',p.sig);
 elsif p.proname in ('ai2_enqueue','ai2_claim','ai2_consume_dispatch','ai2_finish','nm_ai2_enqueue','nm_ai2_claim','nm_ai2_consume_dispatch') then execute format('grant execute on function %s to service_role',p.sig);end if;
 end loop;end$$;
alter table private.ai2_config add column last_probe jsonb;
create function private.ai2_record_probe(value jsonb) returns boolean language plpgsql security definer set search_path='' as $$begin
 update private.ai2_config set last_probe=jsonb_build_object('keyPresent',value->'keyPresent','authenticated',value->'authenticated','status',value->'status','textModelAvailable',value->'textModelAvailable','imageModelAvailable',value->'imageModelAvailable','checkedAt',now()) where id;return true;
end$$;
create function public.nm_ai2_record_probe(p_value jsonb) returns boolean language sql security invoker set search_path='' as $$select private.ai2_record_probe(p_value)$$;
revoke all on function private.ai2_record_probe(jsonb),public.nm_ai2_record_probe(jsonb) from public,anon,authenticated;
grant execute on function private.ai2_record_probe(jsonb),public.nm_ai2_record_probe(jsonb) to service_role;
create or replace function private.ai2_reward(ticket_value uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare t private.ad_reward_tickets;g uuid;begin
 perform pg_advisory_xact_lock(71320261010);
 if not (select rewards_enabled from private.ai2_config where id) then raise exception 'rewards_disabled';end if;
 select * into t from private.ad_reward_tickets where id=ticket_value for update;
 if not found or t.confirmed_at is null or not exists(select 1 from private.ad_config where platform=t.platform and enabled and not test_only) then raise exception 'reward_unconfirmed';end if;
 if t.used_at is not null and not exists(select 1 from private.ai2_grants where source='admob_ssv' and source_ref=t.id::text and user_id=t.user_id) then raise exception 'reward_already_used';end if;
 g:=private.ai2_grant(t.user_id,'reward','admob_ssv',t.id::text,1,now()+interval '7 days');
 update private.ad_reward_tickets set used_at=coalesce(used_at,now()) where id=t.id;return g;
end$$;

create index ai2_grants_user_fk on private.ai2_grants(user_id);
create index ai2_holds_grant_fk on private.ai2_holds(grant_id);
create index ai2_jobs_thread_fk on private.ai2_jobs(thread_id);
create index ai2_ledger_grant_fk on private.ai2_ledger(grant_id);
create index ai2_ledger_job_fk on private.ai2_ledger(job_id);
create index ai2_ledger_user_time on private.ai2_ledger(user_id,created_at);
create index ai2_messages_thread_time on private.ai2_messages(thread_id,id desc);
create index ai2_threads_user_time on private.ai2_threads(user_id,created_at desc);
create index ai2_threads_workspace_fk on private.ai2_threads(workspace_id);
commit;
