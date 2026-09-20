-- Phase 12 — choix d'offre bêta, applicable à Recette puis Production.
-- profiles.account_tier reste le niveau effectif utilisé par l'application.
-- L'entitlement privé conserve la provenance et prépare la future facturation.
begin;

create table if not exists private.account_offer_settings (
  setting_key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  check (setting_key = 'beta_self_selection')
);

insert into private.account_offer_settings(setting_key, enabled)
values ('beta_self_selection', true)
on conflict (setting_key) do update
set enabled = excluded.enabled, updated_at = now();

create table if not exists private.account_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null check (tier in ('free','plus','pro')),
  status text not null default 'active' check (status in ('active','expired','locked')),
  source text not null check (source in ('legacy','beta_self_selection','admin','subscription')),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > starts_at)
);

create table if not exists private.account_tier_selection_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  previous_tier text not null check (previous_tier in ('free','plus','pro')),
  selected_tier text not null check (selected_tier in ('free','plus','pro')),
  source text not null default 'beta_self_selection',
  changed_at timestamptz not null default now()
);

create index if not exists account_tier_selection_events_user_changed_idx
on private.account_tier_selection_events(user_id, changed_at desc);

alter table private.account_offer_settings enable row level security;
alter table private.account_entitlements enable row level security;
alter table private.account_tier_selection_events enable row level security;
revoke all on private.account_offer_settings from public, anon, authenticated;
revoke all on private.account_entitlements from public, anon, authenticated;
revoke all on private.account_tier_selection_events from public, anon, authenticated;

-- Backfill sans changer aucun niveau existant.
insert into private.account_entitlements(user_id, tier, status, source)
select p.id, p.account_tier, 'active', 'legacy'
from public.profiles p
on conflict (user_id) do nothing;

create or replace function private.account_offer_state()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_tier text;
  pro_status text;
  accepted_terms boolean;
  confirmed_adult boolean;
  selection_enabled boolean;
  entitlement private.account_entitlements;
begin
  if actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  select p.account_tier, p.professional_status
  into strict current_tier, pro_status
  from public.profiles p
  where p.id = actor;

  select
    coalesce(c.terms_version = '0.1-beta' and c.terms_accepted_at is not null, false),
    coalesce(c.adult_confirmed_at is not null, false)
  into accepted_terms, confirmed_adult
  from public.user_consents c
  where c.user_id = actor
  order by c.event_id desc
  limit 1;

  accepted_terms := coalesce(accepted_terms, false);
  confirmed_adult := coalesce(confirmed_adult, false);

  select s.enabled into selection_enabled
  from private.account_offer_settings s
  where s.setting_key = 'beta_self_selection';

  select * into entitlement
  from private.account_entitlements e
  where e.user_id = actor;

  return jsonb_build_object(
    'tier', current_tier,
    'canChoose', coalesce(selection_enabled, false) and accepted_terms and confirmed_adult,
    'reason', case
      when not coalesce(selection_enabled, false) then 'selection_disabled'
      when not accepted_terms or not confirmed_adult then 'consent_required'
      else null
    end,
    'termsAccepted', accepted_terms,
    'adultConfirmed', confirmed_adult,
    'beta', true,
    'source', entitlement.source,
    'selectedAt', entitlement.updated_at,
    'professionalStatus', pro_status,
    'needsProSetup', current_tier = 'pro' and pro_status is null,
    'choices', jsonb_build_array('free','plus','pro')
  );
end
$$;

create or replace function private.choose_beta_account_tier(p_tier text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  previous text;
  allowed boolean;
  accepted_terms boolean;
  confirmed_adult boolean;
begin
  if actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if p_tier is null or p_tier not in ('free','plus','pro') then
    raise exception 'invalid_tier' using errcode = '22023';
  end if;

  select s.enabled into allowed
  from private.account_offer_settings s
  where s.setting_key = 'beta_self_selection'
  for share;
  if not coalesce(allowed, false) then
    raise exception 'selection_disabled' using errcode = '42501';
  end if;

  select
    coalesce(c.terms_version = '0.1-beta' and c.terms_accepted_at is not null, false),
    coalesce(c.adult_confirmed_at is not null, false)
  into accepted_terms, confirmed_adult
  from public.user_consents c
  where c.user_id = actor
  order by c.event_id desc
  limit 1;

  if not coalesce(accepted_terms, false) or not coalesce(confirmed_adult, false) then
    raise exception 'consent_required' using errcode = '42501';
  end if;

  select p.account_tier into strict previous
  from public.profiles p
  where p.id = actor
  for update;

  insert into private.account_entitlements(user_id, tier, status, source, starts_at, expires_at, updated_at)
  values(actor, p_tier, 'active', 'beta_self_selection', now(), null, now())
  on conflict (user_id) do update
  set tier = excluded.tier,
      status = 'active',
      source = 'beta_self_selection',
      starts_at = case
        when private.account_entitlements.tier is distinct from excluded.tier then now()
        else private.account_entitlements.starts_at
      end,
      expires_at = null,
      updated_at = now();

  update public.profiles
  set account_tier = p_tier
  where id = actor;

  if previous is distinct from p_tier then
    insert into private.account_tier_selection_events(user_id, previous_tier, selected_tier)
    values(actor, previous, p_tier);
  end if;

  return private.account_offer_state();
end
$$;

revoke all on function private.account_offer_state() from public, anon, authenticated;
revoke all on function private.choose_beta_account_tier(text) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.account_offer_state() to authenticated;
grant execute on function private.choose_beta_account_tier(text) to authenticated;

create or replace function public.account_offer_state()
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.account_offer_state() $$;

create or replace function public.choose_beta_account_tier(p_tier text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.choose_beta_account_tier(p_tier) $$;

revoke all on function public.account_offer_state() from public, anon;
revoke all on function public.choose_beta_account_tier(text) from public, anon;
grant execute on function public.account_offer_state() to authenticated;
grant execute on function public.choose_beta_account_tier(text) to authenticated;

-- Un client ne doit toujours pas pouvoir contourner la RPC contrôlée.
do $$
begin
  if has_column_privilege('authenticated','public.profiles','account_tier','UPDATE') then
    raise exception 'unsafe_account_tier_grant';
  end if;
end
$$;

commit;
