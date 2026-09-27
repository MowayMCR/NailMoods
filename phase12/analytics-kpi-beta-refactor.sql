-- NailMoods Production: beta KPI refactor.
-- Safe, additive / replace-only migration. No user data is copied or deleted.

begin;

-- One database source of truth for the legal versions used by consent RPCs.
create or replace function private.nm_legal_versions()
returns table (privacy_version text, terms_version text)
language sql
immutable
security invoker
set search_path = ''
as $$
  select '0.4-beta'::text, '0.3-beta'::text
$$;

-- Keep metadata pseudonymous and bounded. `item_count` is an integer only.
update private.analytics_event_catalog
set allowed_metadata_keys = array(select distinct unnest(allowed_metadata_keys || array['item_count']))
where event_name = 'product_added';

update private.analytics_event_catalog
set allowed_metadata_keys = array(select distinct unnest(allowed_metadata_keys || array['technique_count','technique_placement']))
where event_name in ('generation_started','generation_succeeded','generation_failed','generation_regenerated','generation_saved','generation_abandoned');

create or replace function private.record_analytics_events(p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_analytics uuid;
  v_tier text;
  v_prof text;
  v_event jsonb;
  v_count integer := 0;
  v_allowed text[];
  v_meta jsonb;
begin
  if v_user is null or jsonb_typeof(p_events) <> 'array'
    or jsonb_array_length(p_events) > 25 or pg_column_size(p_events) > 65536 then
    raise exception 'invalid_analytics_batch';
  end if;

  if not coalesce((
    select c.analytics_consent is true and c.privacy_version = v.privacy_version
    from public.user_consents c
    cross join private.nm_legal_versions() v
    where c.user_id = v_user
    order by c.event_id desc
    limit 1
  ), false) then
    return 0;
  end if;

  insert into private.analytics_identities(user_id) values (v_user)
  on conflict(user_id) do nothing;
  select analytics_user_id into v_analytics from private.analytics_identities where user_id = v_user;

  select private.effective_tier(v_user), professional_status into v_tier, v_prof
  from public.profiles where id = v_user;
  v_tier := case when v_tier in ('free','plus','pro') then v_tier else 'free' end;

  for v_event in select value from jsonb_array_elements(p_events) loop
    select allowed_metadata_keys into v_allowed
    from private.analytics_event_catalog where event_name = v_event->>'event_name';
    if v_allowed is null then continue; end if;

    select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into v_meta
    from jsonb_each(coalesce(v_event->'metadata','{}'::jsonb))
    where key = any(v_allowed) and jsonb_typeof(value) in ('string','number','boolean','null');

    insert into private.analytics_events(
      occurred_at, analytics_user_id, session_id, event_name, screen, workspace_type,
      account_tier, professional_status, app_version, metadata, duration_ms, success, error_code
    ) values (
      greatest(now()-interval '24 hours', least(now()+interval '5 minutes', coalesce((v_event->>'occurred_at')::timestamptz, now()))),
      v_analytics, (v_event->>'session_id')::uuid, v_event->>'event_name', left(v_event->>'screen',80),
      left(v_event->>'workspace_type',30), v_tier, left(v_prof,60), left(coalesce(v_event->>'app_version','unknown'),30),
      v_meta, least(86400000,greatest(0,(v_event->>'duration_ms')::integer)), (v_event->>'success')::boolean,
      left(regexp_replace(v_event->>'error_code','[^a-zA-Z0-9_.-]','','g'),80)
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- Compatibility overload kept for existing sessions; it follows the same
-- central legal-version source without changing any consent choice.
create or replace function private.record_privacy_choices(
  p_privacy_version text, p_terms_version text, p_accept_terms boolean, p_confirm_adult boolean,
  p_analytics_consent boolean, p_ads_consent boolean, p_personalized_ads_consent boolean
) returns public.user_consents
language plpgsql security definer set search_path = ''
as $$
declare current_user_id uuid := auth.uid(); previous public.user_consents; result public.user_consents;
  needs_terms boolean; needs_adult boolean;
begin
  if current_user_id is null or not exists(select 1 from auth.users where id=current_user_id) then raise exception 'authentication_required' using errcode='42501'; end if;
  if exists(select 1 from private.nm_legal_versions() v where p_privacy_version is distinct from v.privacy_version or p_terms_version is distinct from v.terms_version) then raise exception 'policy_version_changed'; end if;
  perform 1 from public.profiles where id=current_user_id for update;
  select * into previous from public.user_consents where user_id=current_user_id order by event_id desc limit 1;
  needs_terms := previous.terms_version is distinct from p_terms_version or previous.terms_accepted_at is null;
  needs_adult := previous.adult_confirmed_at is null;
  if needs_terms and coalesce(p_accept_terms,false) is not true then raise exception 'terms_acceptance_required' using errcode='42501'; end if;
  if needs_adult and coalesce(p_confirm_adult,false) is not true then raise exception 'adult_confirmation_required' using errcode='42501'; end if;
  if coalesce(p_ads_consent,false) or coalesce(p_personalized_ads_consent,false) then raise exception 'optional_technologies_not_enabled'; end if;
  insert into public.user_consents(user_id,privacy_version,terms_version,terms_accepted_at,adult_confirmed_at,analytics_consent,ads_consent,personalized_ads_consent)
  values(current_user_id,p_privacy_version,case when needs_terms then p_terms_version else previous.terms_version end,case when needs_terms then now() else previous.terms_accepted_at end,case when needs_adult then now() else previous.adult_confirmed_at end,coalesce(p_analytics_consent,false),false,false)
  returning * into result;
  return result;
end $$;

-- Current (age-band) consent RPC: versions are no longer duplicated here.
create or replace function private.record_privacy_choices(
  p_privacy_version text, p_terms_version text, p_accept_terms boolean, p_age_band text,
  p_analytics_consent boolean, p_ads_consent boolean, p_personalized_ads_consent boolean
) returns public.user_consents
language plpgsql security definer set search_path = ''
as $$
declare actor uuid:=auth.uid(); previous public.user_consents; result public.user_consents;
  existing_band text; chosen_band text; needs_terms boolean;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor) then raise exception 'authentication_required' using errcode='42501'; end if;
 if exists(select 1 from private.nm_legal_versions() v where p_privacy_version is distinct from v.privacy_version or p_terms_version is distinct from v.terms_version) then raise exception 'policy_version_changed'; end if;
 if coalesce(p_ads_consent,false) or coalesce(p_personalized_ads_consent,false) then raise exception 'optional_technologies_not_enabled'; end if;
 perform 1 from public.profiles where id=actor for update;
 select * into previous from public.user_consents where user_id=actor order by event_id desc limit 1;
 existing_band:=private.nm_age_band(actor); chosen_band:=coalesce(p_age_band,case when existing_band='unknown' then null else existing_band end);
 if chosen_band not in ('15_17','18_plus') then raise exception 'age_band_required' using errcode='42501'; end if;
 if existing_band<>'unknown' and chosen_band<>existing_band then raise exception 'age_band_immutable' using errcode='42501'; end if;
 needs_terms:=previous.terms_version is distinct from p_terms_version or previous.terms_accepted_at is null;
 if needs_terms and coalesce(p_accept_terms,false) is not true then raise exception 'terms_acceptance_required' using errcode='42501'; end if;
 if existing_band='unknown' then insert into private.account_age_policy(user_id,age_band,declared_at,source) values(actor,chosen_band,now(),'user_confirmation') on conflict(user_id) do update set age_band=excluded.age_band,declared_at=excluded.declared_at,source=excluded.source,updated_at=now() where private.account_age_policy.age_band='unknown'; end if;
 if chosen_band='15_17' then update private.account_entitlements set tier='free',updated_at=now() where user_id=actor; update public.profiles set account_tier='free',username=null,discovery_visibility='nobody' where id=actor; end if;
 insert into public.user_consents(user_id,privacy_version,terms_version,terms_accepted_at,adult_confirmed_at,age_band,analytics_consent,ads_consent,personalized_ads_consent)
 values(actor,p_privacy_version,case when needs_terms then p_terms_version else previous.terms_version end,case when needs_terms then now() else previous.terms_accepted_at end,case when chosen_band='18_plus' then coalesce(previous.adult_confirmed_at,now()) else null end,chosen_band,coalesce(p_analytics_consent,false),false,false)
 returning * into result;
 return result;
end $$;

create or replace function private.record_signup_terms()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare versions record;
begin
  select * into versions from private.nm_legal_versions();
  if new.raw_user_meta_data->'terms_accepted' is distinct from 'true'::jsonb
     or new.raw_user_meta_data->>'terms_version' is distinct from versions.terms_version
     or new.raw_user_meta_data->>'privacy_version' is distinct from versions.privacy_version then
    raise exception 'terms_acceptance_required' using errcode = '42501';
  end if;
  insert into private.account_age_policy(user_id, birth_year, age_band, declared_at, source)
  values (new.id, null, 'unknown', null, 'signup') on conflict (user_id) do nothing;
  insert into public.user_consents(user_id, privacy_version, terms_version, terms_accepted_at, adult_confirmed_at, age_band, analytics_consent, ads_consent, personalized_ads_consent)
  values (new.id, versions.privacy_version, versions.terms_version, now(), null, null, coalesce((new.raw_user_meta_data->>'analytics_consent')::boolean, false), false, false);
  return new;
end $$;

create or replace function private.choose_beta_account_tier(p_tier text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare actor uuid:=auth.uid(); previous text; allowed boolean; accepted_terms boolean; band text;
begin
 if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
 if p_tier is null or p_tier not in ('free','plus','pro') then raise exception 'invalid_tier' using errcode='22023'; end if;
 select s.enabled into allowed from private.account_offer_settings s where s.setting_key='beta_self_selection' for share;
 if not coalesce(allowed,false) then raise exception 'selection_disabled' using errcode='42501'; end if;
 band:=private.nm_age_band(actor);
 if band='unknown' then raise exception 'age_confirmation_required' using errcode='42501'; end if;
 if band='15_17' and p_tier<>'free' then raise exception 'age_restricted_tier' using errcode='42501'; end if;
 select coalesce(c.terms_version=v.terms_version and c.terms_accepted_at is not null,false) into accepted_terms
 from public.user_consents c cross join private.nm_legal_versions() v where c.user_id=actor order by c.event_id desc limit 1;
 if not coalesce(accepted_terms,false) then raise exception 'consent_required' using errcode='42501'; end if;
 select p.account_tier into strict previous from public.profiles p where p.id=actor for update;
 insert into private.account_entitlements(user_id,tier,status,source,starts_at,expires_at,updated_at)
 values(actor,p_tier,'active','beta_self_selection',now(),null,now())
 on conflict(user_id) do update set tier=excluded.tier,status='active',source='beta_self_selection',starts_at=case when private.account_entitlements.tier is distinct from excluded.tier then now() else private.account_entitlements.starts_at end,expires_at=null,updated_at=now();
 update public.profiles set account_tier=p_tier where id=actor;
 if previous is distinct from p_tier then insert into private.account_tier_selection_events(user_id,previous_tier,selected_tier) values(actor,previous,p_tier); end if;
 return private.account_offer_state();
end $$;

-- Aggregated KPI sources. No view exposes an account, analytics identity or content.
create or replace view private.analytics_pipeline_health as
with latest_consents as (
  select distinct on (user_id) user_id, analytics_consent, privacy_version
  from public.user_consents order by user_id, event_id desc
), coverage as (
  select count(*) as accounts_total,
    count(*) filter (where c.user_id is null) as accounts_without_choice,
    count(*) filter (where c.analytics_consent is true and c.privacy_version=v.privacy_version) as analytics_opted_in,
    count(*) filter (where c.analytics_consent is false or c.user_id is null) as analytics_not_opted_in
  from public.profiles p left join latest_consents c on c.user_id=p.id
  cross join private.nm_legal_versions() v
), events as (
  select count(*) as events_total, max(ingested_at) as last_event_ingested_at,
    count(*) filter (where ingested_at >= now()-interval '24 hours') as events_last_24h
  from private.analytics_events
)
select coverage.*, events.*, now() as checked_at from coverage cross join events;

create or replace view private.analytics_activity_windows as
select current_date as period_day,
  count(distinct analytics_user_id) filter (where occurred_at >= current_date) as active_today,
  count(distinct analytics_user_id) filter (where occurred_at >= current_date - interval '6 days') as active_7d,
  count(distinct analytics_user_id) filter (where occurred_at >= current_date - interval '29 days') as active_30d,
  count(distinct session_id) filter (where occurred_at >= current_date) as sessions_today,
  count(distinct session_id) filter (where occurred_at >= current_date - interval '6 days') as sessions_7d,
  count(distinct analytics_user_id) filter (where occurred_at >= current_date - interval '6 days' and event_name='app_opened') as returning_users_7d
from private.analytics_events;

create or replace view private.analytics_collection_usage as
select occurred_at::date as period_day, account_tier,
  count(*) filter (where event_name='product_added') as product_add_events,
  coalesce(sum(case when (metadata->>'item_count') ~ '^[0-9]+$' then (metadata->>'item_count')::integer else 1 end) filter (where event_name='product_added'),0) as products_added,
  count(*) filter (where event_name='sticker_added') as stickers_added,
  count(*) filter (where event_name='equipment_added') as equipment_added,
  count(distinct analytics_user_id) filter (where event_name in ('product_added','sticker_added','equipment_added','collection_opened')) as active_collection_users
from private.analytics_events group by 1,2;

create or replace view private.analytics_journal_usage as
select occurred_at::date as period_day, account_tier,
  count(*) filter (where event_name='journal_entry_created') as poses_created,
  count(*) filter (where event_name='journal_entry_saved') as journal_saves,
  count(*) filter (where event_name='project_created') as variants_created,
  count(distinct analytics_user_id) filter (where event_name in ('journal_opened','journal_entry_created','journal_entry_saved','project_created','project_converted_to_pose')) as active_journal_users
from private.analytics_events group by 1,2;

create or replace view private.analytics_generation_techniques as
select occurred_at::date as period_day, account_tier, coalesce(nullif(metadata->>'technique',''),'none') as technique,
  coalesce(nullif(metadata->>'render_mode',''),'unknown') as render_mode,
  count(*) filter (where event_name='generation_started') as started,
  count(*) filter (where event_name='generation_succeeded') as succeeded,
  count(*) filter (where event_name='generation_saved') as saved,
  count(*) filter (where event_name='generation_abandoned') as abandoned,
  avg(duration_ms) filter (where event_name='generation_succeeded') as avg_duration_ms
from private.analytics_events
where event_name in ('generation_started','generation_succeeded','generation_saved','generation_abandoned')
group by 1,2,3,4;

commit;
