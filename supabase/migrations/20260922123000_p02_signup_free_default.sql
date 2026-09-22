-- P0.2: every new account starts as Free. Age is confirmed only when a user
-- requests a Plus or Pro offer through the protected account-offer flow.
create or replace function private.record_signup_terms()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.raw_user_meta_data->'terms_accepted' is distinct from 'true'::jsonb
     or new.raw_user_meta_data->>'terms_version' is distinct from '0.3-beta'
     or new.raw_user_meta_data->>'privacy_version' is distinct from '0.4-beta' then
    raise exception 'terms_acceptance_required' using errcode='42501';
  end if;

  -- No user-editable age metadata is used to authorize the new Free account.
  -- The private policy remains unknown until an offer requiring it is chosen.
  insert into private.account_age_policy(user_id, birth_year, age_band, declared_at, source)
  values (new.id, null, 'unknown', null, 'signup')
  on conflict (user_id) do nothing;

  insert into public.user_consents(
    user_id, privacy_version, terms_version, terms_accepted_at,
    adult_confirmed_at, age_band, analytics_consent, ads_consent,
    personalized_ads_consent
  ) values (
    new.id, '0.4-beta', '0.3-beta', now(), null, null,
    coalesce((new.raw_user_meta_data->>'analytics_consent')::boolean, false),
    false, false
  );
  return new;
end $$;
