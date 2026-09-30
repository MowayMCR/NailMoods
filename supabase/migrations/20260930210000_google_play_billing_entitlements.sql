-- Phase 14F — Google Play Billing entitlements (non destructive)
-- Manual/admin entitlements remain authoritative over Google Play.
begin;

create table if not exists private.google_play_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null check (product_id in ('nailmoods_plus','nailmoods_pro')),
  base_plan_id text,
  purchase_token text not null,
  purchase_token_sha256 text generated always as (encode(sha256(convert_to(purchase_token,'UTF8')),'hex')) stored,
  status text not null check (status in ('active','pending','grace','on_hold','canceled','expired','revoked')),
  starts_at timestamptz,
  expires_at timestamptz,
  auto_renewing boolean,
  acknowledged_at timestamptz,
  last_verified_at timestamptz not null default now(),
  raw_state text,
  updated_at timestamptz not null default now(),
  unique (user_id, product_id),
  unique (purchase_token_sha256)
);

create index if not exists google_play_subscriptions_user_idx
on private.google_play_subscriptions(user_id, status, expires_at desc);

alter table private.google_play_subscriptions enable row level security;
revoke all on private.google_play_subscriptions from public, anon, authenticated;

create or replace function private.google_play_product_tier(p_product_id text)
returns text
language sql
immutable
set search_path=''
as $$
  select case p_product_id
    when 'nailmoods_plus' then 'plus'
    when 'nailmoods_pro' then 'pro'
    else null
  end
$$;

create or replace function private.has_manual_entitlement(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists (
    select 1 from private.account_entitlements e
    where e.user_id=p_user_id
      and e.source in ('admin','beta_self_selection','legacy')
      and e.status='active'
      and (e.expires_at is null or e.expires_at > now())
  )
$$;

create or replace function private.upsert_google_play_subscription(
  p_user_id uuid,
  p_product_id text,
  p_base_plan_id text,
  p_purchase_token text,
  p_status text,
  p_starts_at timestamptz,
  p_expires_at timestamptz,
  p_auto_renewing boolean,
  p_acknowledged_at timestamptz,
  p_raw_state text
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  v_tier text;
  v_effective text;
  v_manual boolean;
begin
  if p_user_id is null or p_product_id not in ('nailmoods_plus','nailmoods_pro')
     or p_status not in ('active','pending','grace','on_hold','canceled','expired','revoked')
     or nullif(trim(p_purchase_token),'') is null then
    raise exception 'invalid_google_play_entitlement' using errcode='22023';
  end if;
  v_tier := private.google_play_product_tier(p_product_id);
  insert into private.google_play_subscriptions(
    user_id,product_id,base_plan_id,purchase_token,status,starts_at,expires_at,
    auto_renewing,acknowledged_at,last_verified_at,raw_state,updated_at
  ) values (
    p_user_id,p_product_id,p_base_plan_id,p_purchase_token,p_status,p_starts_at,p_expires_at,
    p_auto_renewing,p_acknowledged_at,now(),left(p_raw_state,120),now()
  )
  on conflict (user_id,product_id) do update set
    base_plan_id=excluded.base_plan_id,
    purchase_token=excluded.purchase_token,
    status=excluded.status,
    starts_at=excluded.starts_at,
    expires_at=excluded.expires_at,
    auto_renewing=excluded.auto_renewing,
    acknowledged_at=excluded.acknowledged_at,
    last_verified_at=now(),
    raw_state=excluded.raw_state,
    updated_at=now();

  v_manual := private.has_manual_entitlement(p_user_id);
  if not v_manual then
    v_effective := case
      when p_status in ('active','grace') and coalesce(p_expires_at, 'infinity'::timestamptz) > now()
        then v_tier
      else 'free'
    end;
    update public.profiles
      set account_tier=v_effective
      where id=p_user_id;
  else
    select p.account_tier into v_effective
    from public.profiles p where p.id=p_user_id;
  end if;

  return jsonb_build_object(
    'tier',v_effective,
    'subscriptionTier',v_tier,
    'subscriptionStatus',p_status,
    'manualPriority',v_manual,
    'expiresAt',p_expires_at
  );
end
$$;

create or replace function private.google_play_entitlement_state()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare actor uuid:=auth.uid(); manual boolean; effective text; sub jsonb;
begin
 if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
 manual:=private.has_manual_entitlement(actor);
 select jsonb_agg(to_jsonb(s) - 'purchase_token' - 'purchase_token_sha256')
 into sub from private.google_play_subscriptions s where s.user_id=actor;
 select p.account_tier into effective from public.profiles p where p.id=actor;
 return jsonb_build_object('tier',effective,'manualPriority',manual,'subscriptions',coalesce(sub,'[]'::jsonb));
end
$$;

revoke all on function private.google_play_product_tier(text) from public,anon,authenticated;
revoke all on function private.has_manual_entitlement(uuid) from public,anon,authenticated;
revoke all on function private.upsert_google_play_subscription(uuid,text,text,text,text,timestamptz,timestamptz,boolean,timestamptz,text) from public,anon,authenticated;
revoke all on function private.google_play_entitlement_state() from public,anon,authenticated;
grant execute on function private.google_play_entitlement_state() to authenticated;

create or replace function public.google_play_entitlement_state()
returns jsonb language sql security invoker set search_path=''
as $$ select private.google_play_entitlement_state() $$;
revoke all on function public.google_play_entitlement_state() from public,anon;
grant execute on function public.google_play_entitlement_state() to authenticated;

commit;
