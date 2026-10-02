-- Billing beta 6: private Google ledger, authoritative manual priority, disabled by default.
-- This draft was never deployed before the 2026-10-01 correction.
begin;

create table private.google_play_settings (
  singleton boolean primary key default true check (singleton),
  enabled boolean not null default false,
  package_name text not null default 'com.nailmoods.app',
  plus_base_plan text,
  pro_base_plan text,
  reconcile_url text,
  reconcile_secret text not null default replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),
  check (package_name ~ '^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$'),
  check (not enabled or (nullif(plus_base_plan,'') is not null and nullif(pro_base_plan,'') is not null and reconcile_url is not null))
);
insert into private.google_play_settings(singleton) values(true);
alter table private.google_play_settings enable row level security;
revoke all on private.google_play_settings from public,anon,authenticated;

create table private.google_play_subscriptions (
  purchase_token_hash text primary key,
  purchase_token text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_source text not null default 'google_play' check(subscription_source='google_play'),
  status text not null check(status in ('active','pending','grace','on_hold','canceled','paused','expired','revoked')),
  items jsonb not null check(jsonb_typeof(items)='array'),
  acknowledged_at timestamptz,
  last_verified_at timestamptz not null,
  raw_state text not null,
  updated_at timestamptz not null default now()
);
create index google_play_subscriptions_user_idx on private.google_play_subscriptions(user_id);
create index google_play_subscriptions_verify_idx on private.google_play_subscriptions(last_verified_at) where status not in ('expired','revoked');
alter table private.google_play_subscriptions enable row level security;
revoke all on private.google_play_subscriptions from public,anon,authenticated;

create table private.google_play_request_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  attempts integer not null default 1
);
alter table private.google_play_request_limits enable row level security;
revoke all on private.google_play_request_limits from public,anon,authenticated;

create function private.google_play_account_id(p_user_id uuid)
returns text language sql stable security definer set search_path='' as $$
  select encode(sha256(convert_to('nailmoods|'||package_name||'|'||p_user_id::text,'UTF8')),'hex')
  from private.google_play_settings where singleton
$$;
revoke all on function private.google_play_account_id(uuid) from public,anon,authenticated;

create function private.google_play_manual_tier(p_user_id uuid)
returns text language sql stable security definer set search_path='' as $$
  select e.tier from private.account_entitlements e
  where e.user_id=p_user_id and e.tier in ('plus','pro') and e.status='active'
    and e.source in ('admin','beta_self_selection','legacy','beta_invitation')
    and e.starts_at<=now() and (e.expires_at is null or e.expires_at>now())
$$;
revoke all on function private.google_play_manual_tier(uuid) from public,anon,authenticated;

create or replace function private.effective_tier(p_user uuid)
returns text language sql stable security definer set search_path='' as $$
  select case when private.nm_age_band(p_user)='15_17' then 'free'
  else coalesce(
    private.google_play_manual_tier(p_user),
    (select case max(case when i->>'productId'='nailmoods_pro' then 2 else 1 end) when 2 then 'pro' when 1 then 'plus' end
     from private.google_play_subscriptions s cross join lateral jsonb_array_elements(s.items) i
     where s.user_id=p_user and s.status in ('active','grace','canceled')
       and (i->>'expiresAt')::timestamptz>now()),
    (select tier from private.account_entitlements where user_id=p_user and status='active'
      and starts_at<=now() and (expires_at is null or expires_at>now())),
    'free') end
$$;
revoke all on function private.effective_tier(uuid) from public,anon,authenticated;

-- Projection never creates admin rights. The guard also verifies the computed tier,
-- so even a forged GUC cannot manufacture an entitlement.
create or replace function private.sync_profile_account_entitlement()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' and current_setting('nailmoods.billing_projection',true)='on' then
    if new.account_tier is distinct from private.effective_tier(new.id) then
      raise exception 'invalid_billing_projection' using errcode='42501';
    end if;
    return new;
  end if;
  insert into private.account_entitlements(user_id,tier,status,source,starts_at,expires_at,updated_at)
  values(new.id,new.account_tier,'active',case when tg_op='INSERT' then 'signup' else 'admin' end,now(),null,now())
  on conflict(user_id) do update set
    tier=excluded.tier, status='active',
    source=case when private.account_entitlements.tier=excluded.tier then private.account_entitlements.source else 'admin' end,
    starts_at=case when private.account_entitlements.tier=excluded.tier then private.account_entitlements.starts_at else now() end,
    expires_at=case when private.account_entitlements.tier=excluded.tier then private.account_entitlements.expires_at else null end,
    updated_at=now();
  return new;
end $$;
revoke all on function private.sync_profile_account_entitlement() from public,anon,authenticated;

create function private.google_play_refresh_profile(p_user_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare previous_setting text:=current_setting('nailmoods.billing_projection',true);
begin
  perform pg_advisory_xact_lock(hashtextextended('billing-user:'||p_user_id::text,0));
  perform set_config('nailmoods.billing_projection','on',true);
  update public.profiles set account_tier=private.effective_tier(p_user_id)
    where id=p_user_id and account_tier is distinct from private.effective_tier(p_user_id);
  perform set_config('nailmoods.billing_projection',coalesce(previous_setting,''),true);
end $$;
revoke all on function private.google_play_refresh_profile(uuid) from public,anon,authenticated;

create function private.google_play_entitlement_state(p_user_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; manual text; cfg private.google_play_settings;
begin
  if p_user_id is null then raise exception 'authentication_required' using errcode='42501'; end if;
  perform private.google_play_refresh_profile(p_user_id);
  select * into cfg from private.google_play_settings where singleton;
  manual:=private.google_play_manual_tier(p_user_id);
  select coalesce(jsonb_agg(jsonb_build_object('status',s.status,'items',s.items,
    'acknowledged',s.acknowledged_at is not null,'lastVerifiedAt',s.last_verified_at)),'[]'::jsonb)
    into result from private.google_play_subscriptions s where user_id=p_user_id;
  return jsonb_build_object('tier',private.effective_tier(p_user_id),'manualPriority',manual is not null,
    'manualTier',manual,'subscriptions',result,'enabled',cfg.enabled,'packageName',cfg.package_name);
end $$;
revoke all on function private.google_play_entitlement_state(uuid) from public,anon,authenticated;

create function public.google_play_entitlement_state()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication_required' using errcode='42501'; end if;
  return private.google_play_entitlement_state(auth.uid());
end $$;
revoke all on function public.google_play_entitlement_state() from public,anon;
grant execute on function public.google_play_entitlement_state() to authenticated;

create function private.google_play_server_context(p_user_id uuid,p_prepare boolean default false)
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
revoke all on function private.google_play_server_context(uuid,boolean) from public,anon,authenticated;

create function private.upsert_google_play_subscription(p_user_id uuid,p_record jsonb)
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
revoke all on function private.upsert_google_play_subscription(uuid,jsonb) from public,anon,authenticated;

create function private.google_play_tokens_for_user(p_user_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select coalesce(jsonb_agg(jsonb_build_object('userId',user_id,'purchaseToken',purchase_token,
    'accountId',private.google_play_account_id(user_id))),'[]'::jsonb)
  from (select user_id,purchase_token from private.google_play_subscriptions where user_id=p_user_id
    and (status not in ('expired','revoked') or updated_at>now()-interval '1 day') order by last_verified_at limit 20) s
$$;
revoke all on function private.google_play_tokens_for_user(uuid) from public,anon,authenticated;

create function private.google_play_scheduler_context(p_secret text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.google_play_settings; tokens jsonb;
begin
  select * into cfg from private.google_play_settings where singleton;
  if p_secret is null or sha256(convert_to(p_secret,'UTF8'))<>sha256(convert_to(cfg.reconcile_secret,'UTF8')) then
    raise exception 'invalid_scheduler_key' using errcode='42501';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('userId',user_id,'purchaseToken',purchase_token,
    'accountId',private.google_play_account_id(user_id))),'[]'::jsonb)
  into tokens from (select user_id,purchase_token from private.google_play_subscriptions
    where status not in ('expired','revoked') order by last_verified_at limit 10) s;
  return jsonb_build_object('enabled',cfg.enabled,'packageName',cfg.package_name,'tokens',tokens,
    'allowedPlans',jsonb_build_object('nailmoods_plus',cfg.plus_base_plan,'nailmoods_pro',cfg.pro_base_plan));
end $$;
revoke all on function private.google_play_scheduler_context(text) from public,anon,authenticated;

create function private.google_play_refresh_profiles(p_user_id uuid default null)
returns void language plpgsql security definer set search_path='' as $$
declare owner uuid;
begin
  if p_user_id is not null then perform private.google_play_refresh_profile(p_user_id);
  else
    for owner in select distinct user_id from private.google_play_subscriptions loop
      perform private.google_play_refresh_profile(owner);
    end loop;
  end if;
end $$;
revoke all on function private.google_play_refresh_profiles(uuid) from public,anon,authenticated;

-- Service-only API wrappers. Never grant purchase-writing or token-reading RPCs to clients.
create function public.google_play_server_context(p_user_id uuid,p_prepare boolean default false)
returns jsonb language sql security invoker set search_path='' as $$select private.google_play_server_context(p_user_id,p_prepare)$$;
create function public.upsert_google_play_subscription(p_user_id uuid,p_record jsonb)
returns jsonb language sql security invoker set search_path='' as $$select private.upsert_google_play_subscription(p_user_id,p_record)$$;
create function public.google_play_tokens_for_user(p_user_id uuid)
returns jsonb language sql security invoker set search_path='' as $$select private.google_play_tokens_for_user(p_user_id)$$;
create function public.google_play_scheduler_context(p_secret text)
returns jsonb language sql security invoker set search_path='' as $$select private.google_play_scheduler_context(p_secret)$$;
create function public.google_play_refresh_profiles(p_user_id uuid default null)
returns void language sql security invoker set search_path='' as $$select private.google_play_refresh_profiles(p_user_id)$$;

revoke all on function public.google_play_server_context(uuid,boolean),public.upsert_google_play_subscription(uuid,jsonb),
  public.google_play_tokens_for_user(uuid),public.google_play_scheduler_context(text),public.google_play_refresh_profiles(uuid)
  from public,anon,authenticated;
grant execute on function public.google_play_server_context(uuid,boolean),public.upsert_google_play_subscription(uuid,jsonb),
  public.google_play_tokens_for_user(uuid),public.google_play_scheduler_context(text),public.google_play_refresh_profiles(uuid),
  private.google_play_server_context(uuid,boolean),private.upsert_google_play_subscription(uuid,jsonb),
  private.google_play_tokens_for_user(uuid),private.google_play_scheduler_context(text),private.google_play_refresh_profiles(uuid)
  to service_role;
grant usage on schema private to service_role;

commit;
