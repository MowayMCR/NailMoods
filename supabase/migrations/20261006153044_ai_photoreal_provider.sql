begin;
-- Unknown provider cost is NULL, never misleadingly zero.
alter table private.ai_jobs alter column estimated_cost_usd drop not null;
create or replace function private.ai_finish(p_id uuid,p_user uuid,p_result jsonb,p_error text default null) returns boolean language plpgsql security definer set search_path='' as $$
declare generated boolean:=coalesce((p_result->>'generated')::boolean,false); cost numeric;
begin
 if octet_length(coalesce(p_result,'null'::jsonb)::text)>16384 or length(coalesce(p_error,''))>80 then raise exception 'AI_RESULT_INVALID';end if;
 if generated then
  if p_result->>'provider' is distinct from 'openai' or p_result->>'model' is distinct from 'gpt-image-2.5-sunburst' or p_result->>'renderCount' is distinct from '1' then raise exception 'AI_RESULT_INVALID';end if;
  cost:=(p_result->>'estimatedCostUsd')::numeric;
  if cost is not null and (cost<0 or cost>10) then raise exception 'AI_RESULT_INVALID';end if;
 end if;
 update private.ai_jobs set status=case when p_error is null then 'succeeded' else 'failed' end,result=p_result,error_code=p_error,
 provider=case when generated then 'openai' else 'internal-contract' end,
 model=case when generated then 'gpt-image-2.5-sunburst' else 'no-generation-v1' end,
 estimated_cost_usd=case when generated then cost else 0 end,render_count=case when generated then 1 else 0 end,completed_at=clock_timestamp()
 where id=p_id and user_id=p_user and status='reserved' and deleted_at is null;
 return found;
end $$;
-- Service uploads have no user owner_id. Include only this account's private AI paths.
create or replace function private.nm_account_deletion_objects(p_confirmation text)
returns table(bucket text, object_path text) language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.nm_account_deletion_check(p_confirmation);
begin
 return query select o.bucket_id::text,o.name::text from storage.objects o
 where o.owner_id=actor::text or (o.bucket_id='nailmoods-private' and o.name ~ ('^'||actor::text||'/[0-9a-f-]{36}/ai/[0-9a-f-]{36}\.png$'));
end $$;
comment on table private.ai_jobs is 'Private internal usage ledger. Photoreal provider gated by server secrets. Results cleared on deletion; usage retained until account deletion.';
commit;
