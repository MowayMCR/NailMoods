begin;
alter table private.ai2_config add column provider jsonb not null default '{}';
create or replace function private.ai2_access() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.ai2_actor();cfg private.ai2_config;allowed boolean;begin
 perform private.require_adult_account();
 if private.nm_account_suspended(actor) then raise exception 'account_suspended' using errcode='42501';end if;
 select * into cfg from private.ai2_config where id;
 allowed:=exists(select 1 from private.ai2_accounts a join private.account_administrators adm using(user_id) where a.user_id=actor);
 return jsonb_build_object('uiAccess',allowed,'allowed',allowed and cfg.enabled,'admin',allowed,'enabled',cfg.enabled,'dailyBudget',cfg.daily_usd,'monthlyBudget',cfg.monthly_usd,'tier',private.effective_tier(actor),'operations',case when allowed then cfg.operations else '{}'::jsonb end,'balance',coalesce((select jsonb_object_agg(bucket,n) from (select bucket,sum(remaining) n from private.ai2_grants where user_id=actor and (expires_at is null or expires_at>now()) group by bucket) q),'{}'::jsonb));
end$$;
create or replace function private.ai2_begin(actor uuid,request_value uuid,thread_value uuid,workspace_value uuid,operation_value text,fingerprint_value text,prompt_value text) returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.ai2_config;j private.ai2_jobs;g private.ai2_grants;t private.ai2_threads;cost numeric;credits integer;need integer;take integer;tier_value text;allocation integer;op jsonb;begin
 -- A single global transaction lock makes budget admission + credit reservation atomic.
 perform pg_advisory_xact_lock(71320261010);
 select * into cfg from private.ai2_config where id for update;
 if actor is null or not cfg.enabled or not exists(select 1 from private.ai2_accounts a join private.account_administrators adm using(user_id) where a.user_id=actor) or private.nm_account_suspended(actor) then raise exception 'ai_disabled';end if;
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


create function private.ai2_switch(value boolean) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.ai2_actor();begin
 if not private.nm_account_administrator() or not exists(select 1 from private.ai2_accounts where user_id=actor) then raise exception 'not_allowed' using errcode='42501';end if;
 perform pg_advisory_xact_lock(71320261010);
 update private.ai2_config set enabled=value where id;
 return private.ai2_access();
end$$;
create function public.nm_ai2_switch(p_enabled boolean) returns jsonb language sql security invoker set search_path='' as $$select private.ai2_switch(p_enabled)$$;
revoke all on function private.ai2_switch(boolean),public.nm_ai2_switch(boolean) from public,anon,authenticated;
grant execute on function private.ai2_switch(boolean),public.nm_ai2_switch(boolean) to authenticated;
create function private.ai2_provider(actor uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from private.ai2_accounts a join private.account_administrators adm using(user_id) where a.user_id=actor) or private.nm_account_suspended(actor) then raise exception 'not_allowed';end if;
 return (select provider || jsonb_build_object('AI_PROVIDER_ENABLED',case when enabled then 'true' else 'false' end) from private.ai2_config where id);
end$$;
create function public.nm_ai2_provider(p_user uuid) returns jsonb language sql security invoker set search_path='' as $$select private.ai2_provider(p_user)$$;
revoke all on function private.ai2_provider(uuid),public.nm_ai2_provider(uuid) from public,anon,authenticated;
grant execute on function private.ai2_provider(uuid),public.nm_ai2_provider(uuid) to service_role;
commit;
