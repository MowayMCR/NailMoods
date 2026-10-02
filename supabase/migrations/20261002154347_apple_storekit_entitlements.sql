-- Separate Apple ledger. Does not mutate or replace manual/Google records.
begin;
create table private.apple_settings(singleton boolean primary key default true check(singleton),enabled boolean not null default false);
insert into private.apple_settings values(true,false);
create table private.apple_account_tokens(
 user_id uuid primary key references auth.users(id) on delete cascade,
 account_token uuid not null unique default gen_random_uuid(), sandbox_enabled boolean not null default false
);
create table private.apple_subscriptions(
 environment text not null check(environment in ('Sandbox','Production')),
 original_transaction_id text not null, transaction_id text not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null default 'apple_app_store' check(provider='apple_app_store'),
 product_id text not null check(product_id in ('nailmoods_plus','nailmoods_pro')),
 tier text not null check(tier in ('plus','pro')),
 status text not null check(status in ('active','canceled','grace','billing_retry','expired','revoked')),
 starts_at timestamptz not null, expires_at timestamptz not null, auto_renewing boolean not null,
 signed_at timestamptz not null, last_verified_at timestamptz not null,
 primary key(environment,original_transaction_id),
 check((tier='pro')=(product_id='nailmoods_pro'))
);
create index apple_subscription_user on private.apple_subscriptions(user_id);
alter table private.apple_settings enable row level security;
alter table private.apple_account_tokens enable row level security;
alter table private.apple_subscriptions enable row level security;
revoke all on private.apple_settings,private.apple_account_tokens,private.apple_subscriptions from public,anon,authenticated,service_role;

create function private.apple_access_tier(p_user uuid) returns text language sql stable security definer set search_path='' as $$
 select case max(case s.tier when 'pro' then 2 else 1 end) when 2 then 'pro' when 1 then 'plus' end
 from private.apple_subscriptions s join private.apple_account_tokens t on t.user_id=s.user_id
 where s.user_id=p_user and s.status in ('active','grace','canceled') and s.starts_at<=now() and s.expires_at>now()
 and (s.environment='Production' or t.sandbox_enabled)
$$;
revoke all on function private.apple_access_tier(uuid) from public,anon,authenticated;
create or replace function private.effective_tier(p_user uuid) returns text language sql stable security definer set search_path='' as $$
 select case when private.nm_age_band(p_user)='15_17' then 'free' else
 coalesce((select case max(case tier when 'pro' then 2 when 'plus' then 1 else 0 end) when 2 then 'pro' when 1 then 'plus' else 'free' end
 from (
  select private.google_play_manual_tier(p_user) tier
  union all select private.apple_access_tier(p_user)
  union all select case when i->>'productId'='nailmoods_pro' then 'pro' else 'plus' end
   from private.google_play_subscriptions s cross join lateral jsonb_array_elements(s.items) i
   where s.user_id=p_user and s.status in ('active','grace','canceled') and (i->>'expiresAt')::timestamptz>now()
  union all select e.tier from private.account_entitlements e where e.user_id=p_user and e.status='active'
   and e.starts_at<=now() and (e.expires_at is null or e.expires_at>now())
 ) rights),'free') end
$$;

create function private.billing_entitlement_for_user(p_user_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare g jsonb; a jsonb;
begin
 g:=private.google_play_entitlement_state(p_user_id);
 select coalesce(jsonb_agg(jsonb_build_object('provider','apple_app_store','tier',s.tier,'productId',s.product_id,'status',s.status,
 'environment',s.environment,'startsAt',s.starts_at,'expiresAt',s.expires_at,'autoRenewing',s.auto_renewing,'lastVerifiedAt',s.last_verified_at)),'[]') into a
 from private.apple_subscriptions s where s.user_id=p_user_id;
 return g||jsonb_build_object('appleSubscriptions',a,'appleActive',private.apple_access_tier(p_user_id) is not null,
 'manualSource',case when g->>'manualTier' is not null then 'manual_beta' end);
end $$;
create function public.billing_entitlement_state() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid()) then raise exception 'authentication_required';end if;
 return private.billing_entitlement_for_user(auth.uid());
end $$;
revoke all on function private.billing_entitlement_for_user(uuid) from public,anon,authenticated;
revoke all on function public.billing_entitlement_state() from public,anon;
grant execute on function public.billing_entitlement_state() to authenticated;

create function private.apple_server_context(p_user_id uuid,p_environment text) returns jsonb language plpgsql security definer set search_path='' as $$
declare g jsonb; t private.apple_account_tokens; cfg private.apple_settings; google_active boolean;
begin
 if p_environment not in ('Sandbox','Production') or p_environment is null then raise exception 'invalid_environment';end if;
 -- Reuse confirmed-account, adult/terms eligibility and rate limits without any new client authority.
 g:=private.google_play_server_context(p_user_id,false);
 insert into private.apple_account_tokens(user_id) values(p_user_id) on conflict do nothing;
 select * into t from private.apple_account_tokens where user_id=p_user_id;
 select * into cfg from private.apple_settings where singleton;
 google_active:=(g->>'hasSubscription')::boolean;
 return jsonb_build_object('enabled',cfg.enabled,'eligible',(g->>'eligible')::boolean,
 'canPurchase',(g->>'eligible')::boolean and not (g->>'manualPriority')::boolean and not google_active
 and (p_environment='Production' or t.sandbox_enabled),
 'manualPriority',(g->>'manualPriority')::boolean,'otherProviderActive',google_active,
 'sandboxEnabled',t.sandbox_enabled,'accountToken',t.account_token,'environment',p_environment);
end $$;
create function private.upsert_apple_subscription(p_user_id uuid,p_record jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare owner uuid; env text:=p_record->>'environment'; orig text:=p_record->>'originalTransactionId'; cfg private.apple_settings;
begin
 if env not in ('Sandbox','Production') or orig !~ '^\d{1,64}$' or (p_record->>'transactionId') !~ '^\d{1,64}$'
 or not exists(select 1 from private.apple_account_tokens where user_id=p_user_id) then raise exception 'invalid_transaction';end if;
 select * into cfg from private.apple_settings where singleton;
 if not cfg.enabled then raise exception 'billing_not_configured';end if;
 if env='Sandbox' and not exists(select 1 from private.apple_account_tokens where user_id=p_user_id and sandbox_enabled) then raise exception 'sandbox_account_required';end if;
 perform pg_advisory_xact_lock(hashtextextended('apple:'||env||':'||orig,0));
 select user_id into owner from private.apple_subscriptions where environment=env and original_transaction_id=orig;
 if owner is not null and owner<>p_user_id then raise exception 'purchase_owned_by_another_account';end if;
 insert into private.apple_subscriptions(environment,original_transaction_id,transaction_id,user_id,product_id,tier,status,
 starts_at,expires_at,auto_renewing,signed_at,last_verified_at)
 values(env,orig,p_record->>'transactionId',p_user_id,p_record->>'productId',p_record->>'tier',p_record->>'status',
 (p_record->>'startsAt')::timestamptz,(p_record->>'expiresAt')::timestamptz,(p_record->>'autoRenewing')::boolean,
 (p_record->>'signedAt')::timestamptz,(p_record->>'verifiedAt')::timestamptz)
 on conflict(environment,original_transaction_id) do update set transaction_id=excluded.transaction_id,product_id=excluded.product_id,
 tier=excluded.tier,status=excluded.status,starts_at=excluded.starts_at,expires_at=excluded.expires_at,
 auto_renewing=excluded.auto_renewing,signed_at=excluded.signed_at,last_verified_at=excluded.last_verified_at
 where excluded.signed_at>=private.apple_subscriptions.signed_at and excluded.last_verified_at>=private.apple_subscriptions.last_verified_at;
 perform private.google_play_refresh_profile(p_user_id);
 return private.billing_entitlement_for_user(p_user_id);
end $$;
create function public.apple_server_context(p_user_id uuid,p_environment text) returns jsonb language sql security definer set search_path='' as $$select private.apple_server_context(p_user_id,p_environment)$$;
create function public.upsert_apple_subscription(p_user_id uuid,p_record jsonb) returns jsonb language sql security definer set search_path='' as $$select private.upsert_apple_subscription(p_user_id,p_record)$$;
create function public.apple_user_for_token(p_token uuid) returns uuid language sql security definer set search_path='' as $$select user_id from private.apple_account_tokens where account_token=p_token$$;
create function public.apple_subscriptions_for_user(p_user_id uuid,p_environment text) returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('transactionId',transaction_id)),'[]') from private.apple_subscriptions where user_id=p_user_id and environment=p_environment
$$;
create function public.billing_entitlement_for_user(p_user_id uuid) returns jsonb language sql security definer set search_path='' as $$select private.billing_entitlement_for_user(p_user_id)$$;
revoke all on function private.apple_server_context(uuid,text),private.upsert_apple_subscription(uuid,jsonb),
 public.apple_server_context(uuid,text),public.upsert_apple_subscription(uuid,jsonb),public.apple_user_for_token(uuid),
 public.apple_subscriptions_for_user(uuid,text),public.billing_entitlement_for_user(uuid) from public,anon,authenticated;
grant execute on function public.apple_server_context(uuid,text),public.upsert_apple_subscription(uuid,jsonb),public.apple_user_for_token(uuid),
 public.apple_subscriptions_for_user(uuid,text),public.billing_entitlement_for_user(uuid) to service_role;

-- Keep the existing Google API contract and reject duplicate cross-platform purchases.
alter function private.google_play_server_context(uuid,boolean) rename to google_play_server_context_without_apple;
create function private.google_play_server_context(p_user_id uuid,p_prepare boolean default false) returns jsonb language plpgsql security definer set search_path='' as $$
declare g jsonb; a boolean;
begin
 g:=private.google_play_server_context_without_apple(p_user_id,p_prepare);
 a:=private.apple_access_tier(p_user_id) is not null;
 return g||jsonb_build_object('otherProviderActive',a,'canPurchase',(g->>'canPurchase')::boolean and not a);
end $$;
revoke all on function private.google_play_server_context(uuid,boolean) from public,anon,authenticated;
commit;
