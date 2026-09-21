CREATE OR REPLACE FUNCTION private.record_privacy_choices(p_privacy_version text, p_terms_version text, p_accept_terms boolean, p_confirm_adult boolean, p_analytics_consent boolean, p_ads_consent boolean, p_personalized_ads_consent boolean)
 RETURNS user_consents
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  current_user_id uuid := auth.uid();
  previous public.user_consents;
  result public.user_consents;
  needs_terms boolean;
  needs_adult boolean;
begin
  if current_user_id is null
     or not exists(select 1 from auth.users where id=current_user_id) then
    raise exception 'authentication_required' using errcode='42501';
  end if;
  if p_privacy_version is distinct from '0.2-beta'
     or p_terms_version is distinct from '0.1-beta' then
    raise exception 'policy_version_changed';
  end if;

  -- Serialize consent updates on all devices for this user.
  perform 1 from public.profiles where id=current_user_id for update;
  select * into previous
  from public.user_consents
  where user_id=current_user_id
  order by event_id desc
  limit 1;

  needs_terms := previous.terms_version is distinct from p_terms_version
    or previous.terms_accepted_at is null;
  needs_adult := previous.adult_confirmed_at is null;

  if needs_terms and coalesce(p_accept_terms,false) is not true then
    raise exception 'terms_acceptance_required' using errcode='42501';
  end if;
  if needs_adult and coalesce(p_confirm_adult,false) is not true then
    raise exception 'adult_confirmation_required' using errcode='42501';
  end if;

  -- No optional provider exists. Future activation requires a new
  -- notice/version/migration.
  if coalesce(p_ads_consent,false)
     or coalesce(p_personalized_ads_consent,false) then
    raise exception 'optional_technologies_not_enabled';
  end if;

  insert into public.user_consents(
    user_id, privacy_version, terms_version, terms_accepted_at,
    adult_confirmed_at, analytics_consent, ads_consent,
    personalized_ads_consent
  ) values (
    current_user_id,
    p_privacy_version,
    case when needs_terms then p_terms_version else previous.terms_version end,
    case when needs_terms then now() else previous.terms_accepted_at end,
    case when needs_adult then now() else previous.adult_confirmed_at end,
    coalesce(p_analytics_consent,false),
    false,
    false
  ) returning * into result;
  return result;
end
$function$

