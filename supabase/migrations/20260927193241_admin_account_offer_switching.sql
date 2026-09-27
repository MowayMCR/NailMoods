-- Administrators can select any offer for their own account during closed beta.
-- This role is private, independent of the chosen offer and of support access.
create table private.account_administrators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.account_administrators enable row level security;
revoke all on private.account_administrators from public, anon, authenticated;

create function private.nm_account_administrator()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and exists (select 1 from private.account_administrators a join auth.users u on u.id=a.user_id
      where a.user_id=auth.uid() and u.email_confirmed_at is not null)
    and not private.nm_account_suspended(auth.uid());
$$;
revoke all on function private.nm_account_administrator() from public, anon, authenticated;

-- Production exposes its version registry; older Recette uses the published
-- 0.3-beta terms version. Never write or accept consent on the user's behalf.
create function private.account_offer_terms_current()
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare required_version text := '0.3-beta'; accepted boolean;
begin
  if auth.uid() is null then return false; end if;
  if to_regprocedure('private.nm_legal_versions()') is not null then
    execute 'select terms_version from private.nm_legal_versions()' into required_version;
  end if;
  select c.terms_version=required_version and c.terms_accepted_at is not null
    into accepted from public.user_consents c where c.user_id=auth.uid() order by c.event_id desc limit 1;
  return coalesce(accepted,false);
end $$;
revoke all on function private.account_offer_terms_current() from public, anon, authenticated;

create or replace function private.account_offer_state()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); current_tier text; pro_status text;
  entitlement private.account_entitlements; founder private.beta_founders;
  administrator boolean; accepted_terms boolean; band text; selection_reason text;
begin
  if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select private.effective_tier(actor),p.professional_status into strict current_tier,pro_status from public.profiles p where p.id=actor;
  select * into entitlement from private.account_entitlements e where e.user_id=actor;
  select * into founder from private.beta_founders f where f.user_id=actor;
  administrator:=private.nm_account_administrator();
  band:=private.nm_age_band(actor); accepted_terms:=private.account_offer_terms_current();
  selection_reason:=case when not administrator then 'selection_disabled'
    when band='unknown' then 'age_confirmation_required'
    when band<>'18_plus' then 'age_restricted'
    when not accepted_terms then 'consent_required' else null end;
  return jsonb_build_object(
    'tier',current_tier,'canChoose',selection_reason is null,'reason',selection_reason,
    'administrator',administrator,'ageBand',band,'termsAccepted',accepted_terms,'adultConfirmed',band='18_plus',
    'beta',true,'source',entitlement.source,'selectedAt',entitlement.updated_at,
    'professionalStatus',pro_status,'needsProSetup',current_tier='pro' and pro_status is null,
    'choices',jsonb_build_array('free','plus','pro'),
    'founder',case when founder.user_id is null then null else jsonb_build_object('badge',founder.badge,'tier',founder.awarded_tier,'expiresAt',founder.expires_at) end
  );
end $$;

create or replace function private.choose_beta_account_tier(p_tier text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid:=auth.uid(); previous text; allowed boolean; administrator boolean; band text; selection_source text;
begin
  if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_tier is null or p_tier not in ('free','plus','pro') then raise exception 'invalid_tier' using errcode='22023'; end if;
  -- A concurrent administrator revocation waits for this self-service change.
  perform 1 from private.account_administrators where user_id=actor for key share;
  administrator:=private.nm_account_administrator();
  select s.enabled into allowed from private.account_offer_settings s where s.setting_key='beta_self_selection' for share;
  if not administrator and not coalesce(allowed,false) then raise exception 'selection_disabled' using errcode='42501'; end if;
  if private.nm_account_suspended(actor) then raise exception 'ACCOUNT_SUSPENDED' using errcode='42501'; end if;
  band:=private.nm_age_band(actor);
  if band='unknown' then raise exception 'age_confirmation_required' using errcode='42501'; end if;
  if band='15_17' and p_tier<>'free' then raise exception 'age_restricted_tier' using errcode='42501'; end if;
  if not private.account_offer_terms_current() then raise exception 'consent_required' using errcode='42501'; end if;
  select p.account_tier into strict previous from public.profiles p where p.id=actor for update;
  selection_source:=case when administrator then 'admin' else 'beta_self_selection' end;
  insert into private.account_entitlements(user_id,tier,status,source,starts_at,expires_at,updated_at)
    values(actor,p_tier,'active',selection_source,now(),null,now())
    on conflict(user_id) do update set tier=excluded.tier,status='active',source=excluded.source,
      starts_at=case when private.account_entitlements.tier is distinct from excluded.tier then now() else private.account_entitlements.starts_at end,
      expires_at=null,updated_at=now();
  update public.profiles set account_tier=p_tier where id=actor;
  if previous is distinct from p_tier then
    insert into private.account_tier_selection_events(user_id,previous_tier,selected_tier,source) values(actor,previous,p_tier,selection_source);
  end if;
  return private.account_offer_state();
end $$;
revoke all on function private.account_offer_state(),private.choose_beta_account_tier(text) from public,anon;
grant execute on function private.account_offer_state(),private.choose_beta_account_tier(text) to authenticated;
