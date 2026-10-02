begin;

-- pg_net queues may be readable by database roles on managed installations.
-- Transport only a two-minute, single-use refresh credential, never a reusable
-- secret or purchase token. The Edge response contains counts, not identities.
create table private.google_play_reconcile_nonces (
  nonce_hash text primary key,
  expires_at timestamptz not null
);
alter table private.google_play_reconcile_nonces enable row level security;
revoke all on private.google_play_reconcile_nonces from public,anon,authenticated,service_role;

create or replace function private.google_play_schedule_reconciliation()
returns bigint language plpgsql security definer set search_path='' as $$
declare cfg private.google_play_settings; nonce text;
begin
  select * into cfg from private.google_play_settings where singleton;
  if not cfg.enabled or cfg.reconcile_url is null then return null; end if;
  if cfg.reconcile_url !~ '^https://[a-z]+\.supabase\.co/functions/v1/google-play-verify$' then
    raise exception 'invalid_reconciliation_url';
  end if;
  delete from private.google_play_reconcile_nonces where expires_at<=clock_timestamp();
  nonce:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
  insert into private.google_play_reconcile_nonces(nonce_hash,expires_at)
    values(encode(sha256(convert_to(nonce,'UTF8')),'hex'),clock_timestamp()+interval '2 minutes');
  return net.http_post(url:=cfg.reconcile_url,
    headers:=jsonb_build_object('Content-Type','application/json','x-nm-reconcile-key',nonce),
    body:='{"action":"refresh"}'::jsonb,timeout_milliseconds:=120000);
end $$;
revoke all on function private.google_play_schedule_reconciliation() from public,anon,authenticated,service_role;

create or replace function private.google_play_scheduler_context(p_secret text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.google_play_settings; tokens jsonb; consumed text;
begin
  delete from private.google_play_reconcile_nonces
    where nonce_hash=encode(sha256(convert_to(p_secret,'UTF8')),'hex')
      and expires_at>clock_timestamp()
    returning nonce_hash into consumed;
  if consumed is null then
    raise exception 'invalid_scheduler_key' using errcode='42501';
  end if;
  select * into cfg from private.google_play_settings where singleton;
  with selected as (
    select purchase_token_hash from private.google_play_subscriptions
    where status not in ('expired','revoked')
    order by coalesce(last_checked_at,last_verified_at) limit 10 for update skip locked
  ), marked as (
    update private.google_play_subscriptions s set last_checked_at=clock_timestamp()
    from selected where s.purchase_token_hash=selected.purchase_token_hash
    returning s.user_id,s.purchase_token
  ) select coalesce(jsonb_agg(jsonb_build_object('userId',user_id,'purchaseToken',purchase_token,
    'accountId',private.google_play_account_id(user_id))),'[]'::jsonb) into tokens from marked;
  return jsonb_build_object('enabled',cfg.enabled,'packageName',cfg.package_name,'tokens',tokens,
    'allowedPlans',jsonb_build_object('nailmoods_plus',cfg.plus_base_plan,'nailmoods_pro',cfg.pro_base_plan));
end $$;
revoke all on function private.google_play_scheduler_context(text) from public,anon,authenticated;
grant execute on function private.google_play_scheduler_context(text) to service_role;
commit;
