begin;
create extension if not exists pg_net;
create or replace function private.google_play_server_context(p_user_id uuid,p_prepare boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.google_play_settings; n integer; eligible boolean; existing boolean; manual boolean;
begin
  if not exists(select 1 from auth.users where id=p_user_id and email_confirmed_at is not null) then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  insert into private.google_play_request_limits(user_id) values(p_user_id)
  on conflict(user_id) do update set
    attempts=case when private.google_play_request_limits.window_start<now()-interval '1 minute' then 1 else private.google_play_request_limits.attempts+1 end,
    window_start=case when private.google_play_request_limits.window_start<now()-interval '1 minute' then now() else private.google_play_request_limits.window_start end
  returning attempts into n;
  if n>40 then raise exception 'rate_limit'; end if;
  select * into cfg from private.google_play_settings where singleton;
  eligible:=private.nm_age_band(p_user_id)='18_plus' and not private.nm_account_suspended(p_user_id)
    and exists(select 1 from public.user_consents c cross join private.nm_legal_versions() v
      where c.user_id=p_user_id and c.terms_version=v.terms_version and c.terms_accepted_at is not null);
  manual:=private.google_play_manual_tier(p_user_id) is not null;
  select exists(select 1 from private.google_play_subscriptions s where s.user_id=p_user_id
    and (s.status in ('pending','on_hold','paused') or (s.status in ('active','grace','canceled')
      and exists(select 1 from jsonb_array_elements(s.items) i where (i->>'expiresAt')::timestamptz>now())))) into existing;
  return jsonb_build_object('enabled',cfg.enabled,'eligible',eligible,'canPurchase',eligible and not manual and not existing,
    'manualPriority',manual,'hasSubscription',existing,'packageName',cfg.package_name,
    'accountId',private.google_play_account_id(p_user_id),
    'allowedPlans',jsonb_build_object('nailmoods_plus',cfg.plus_base_plan,'nailmoods_pro',cfg.pro_base_plan));
end $$;

create or replace function private.upsert_google_play_subscription(p_user_id uuid,p_record jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare token text:=p_record->>'purchaseToken'; token_hash text; owner uuid; item jsonb;
  cfg private.google_play_settings; verified_at timestamptz; status_value text:=p_record->>'status';
begin
  if p_user_id is null or nullif(trim(token),'') is null or length(token)>4096
    or jsonb_typeof(p_record->'items') is distinct from 'array'
    or jsonb_array_length(p_record->'items') not between 1 and 10
    or status_value not in ('active','pending','grace','on_hold','canceled','paused','expired','revoked') then
    raise exception 'invalid_google_play_entitlement';
  end if;
  select * into cfg from private.google_play_settings where singleton;
  verified_at:=(p_record->>'verifiedAt')::timestamptz;
  if verified_at is null or verified_at>clock_timestamp()+interval '1 minute' then raise exception 'invalid_verification_time'; end if;
  for item in select * from jsonb_array_elements(p_record->'items') loop
    if coalesce(item->>'productId','') not in ('nailmoods_plus','nailmoods_pro')
      or item->>'basePlanId' is distinct from (case item->>'productId' when 'nailmoods_plus' then cfg.plus_base_plan else cfg.pro_base_plan end)
      or nullif(item->>'basePlanId','') is null
      or (status_value in ('active','grace','canceled') and (item->>'expiresAt')::timestamptz is null) then
      raise exception 'invalid_google_play_line';
    end if;
  end loop;
  token_hash:=encode(sha256(convert_to(token,'UTF8')),'hex');
  perform pg_advisory_xact_lock(hashtextextended('billing-token:'||token_hash,0));
  select user_id into owner from private.google_play_subscriptions where purchase_token_hash=token_hash;
  if owner is not null and owner<>p_user_id then raise exception 'purchase_token_owned_by_another_account' using errcode='42501'; end if;
  if owner is null and (private.nm_age_band(p_user_id) is distinct from '18_plus' or private.nm_account_suspended(p_user_id)
    or not exists(select 1 from public.user_consents c cross join private.nm_legal_versions() v
      where c.user_id=p_user_id and c.terms_version=v.terms_version and c.terms_accepted_at is not null)) then
    raise exception 'billing_ineligible' using errcode='42501';
  end if;
  insert into private.google_play_subscriptions(purchase_token_hash,purchase_token,user_id,status,items,acknowledged_at,last_verified_at,raw_state)
  values(token_hash,token,p_user_id,status_value,p_record->'items',(p_record->>'acknowledgedAt')::timestamptz,verified_at,left(p_record->>'rawState',120))
  on conflict(purchase_token_hash) do update set
    status=excluded.status,items=excluded.items,
    acknowledged_at=coalesce(excluded.acknowledged_at,private.google_play_subscriptions.acknowledged_at),
    last_verified_at=excluded.last_verified_at,raw_state=excluded.raw_state,updated_at=now()
    where excluded.last_verified_at>=private.google_play_subscriptions.last_verified_at;
  return private.google_play_entitlement_state(p_user_id);
end $$;

alter table private.google_play_subscriptions add column last_checked_at timestamptz;

create or replace function private.google_play_scheduler_context(p_secret text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.google_play_settings; tokens jsonb;
begin
  select * into cfg from private.google_play_settings where singleton;
  if p_secret is null or sha256(convert_to(p_secret,'UTF8'))<>sha256(convert_to(cfg.reconcile_secret,'UTF8')) then
    raise exception 'invalid_scheduler_key' using errcode='42501';
  end if;
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

create function private.google_play_schedule_reconciliation()
returns bigint language plpgsql security definer set search_path='' as $$
declare cfg private.google_play_settings;
begin
  select * into cfg from private.google_play_settings where singleton;
  if not cfg.enabled or cfg.reconcile_url is null then return null; end if;
  if cfg.reconcile_url !~ '^https://[a-z]+\.supabase\.co/functions/v1/google-play-verify$' then
    raise exception 'invalid_reconciliation_url';
  end if;
  return net.http_post(url:=cfg.reconcile_url,
    headers:=jsonb_build_object('Content-Type','application/json','x-nm-reconcile-key',cfg.reconcile_secret),
    body:='{"action":"refresh"}'::jsonb,timeout_milliseconds:=120000);
end $$;
revoke all on function private.google_play_schedule_reconciliation() from public,anon,authenticated,service_role;

-- The cron command contains neither purchase tokens nor the scheduler secret.
-- It performs no network call while Billing is disabled.
select cron.schedule('nailmoods-google-play-reconcile','*/5 * * * *',
  'select private.google_play_schedule_reconciliation();');
commit;
