-- Closed beta: 18+ only. No existing account, age declaration or consent is rewritten.
CREATE OR REPLACE FUNCTION private.record_signup_terms()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare versions record;
begin
 select * into versions from private.nm_legal_versions();
 if new.raw_user_meta_data->'terms_accepted' is distinct from 'true'::jsonb or new.raw_user_meta_data->>'terms_version' is distinct from versions.terms_version or new.raw_user_meta_data->>'privacy_version' is distinct from versions.privacy_version then raise exception 'terms_acceptance_required' using errcode = '42501'; end if;
 if new.raw_user_meta_data->'adult_confirmed' is distinct from 'true'::jsonb then raise exception 'La bêta NailMoods est réservée aux personnes de 18 ans ou plus.' using errcode='42501'; end if;
 insert into private.account_age_policy(user_id, birth_year, age_band, declared_at, source) values (new.id, null, '18_plus', now(), 'signup') on conflict (user_id) do nothing;
 insert into public.user_consents(user_id, privacy_version, terms_version, terms_accepted_at, adult_confirmed_at, age_band, analytics_consent, ads_consent, personalized_ads_consent) values (new.id, versions.privacy_version, versions.terms_version, now(), now(), '18_plus', coalesce((new.raw_user_meta_data->>'analytics_consent')::boolean, false), false, false);
 return new;
end $function$
;
CREATE OR REPLACE FUNCTION private.nm_legal_versions()
 RETURNS TABLE(privacy_version text, terms_version text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ select '0.5-beta'::text, '0.4-beta'::text $function$
;
CREATE OR REPLACE FUNCTION private.record_privacy_choices(p_privacy_version text, p_terms_version text, p_accept_terms boolean, p_age_band text, p_analytics_consent boolean, p_ads_consent boolean, p_personalized_ads_consent boolean)
 RETURNS user_consents
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare actor uuid:=auth.uid(); previous public.user_consents; result public.user_consents; existing_band text; chosen_band text; needs_terms boolean;
begin
 if actor is null or not exists(select 1 from auth.users where id=actor) then raise exception 'authentication_required' using errcode='42501'; end if;
 if exists(select 1 from private.nm_legal_versions() v where p_privacy_version is distinct from v.privacy_version or p_terms_version is distinct from v.terms_version) then raise exception 'policy_version_changed'; end if;
 if coalesce(p_ads_consent,false) or coalesce(p_personalized_ads_consent,false) then raise exception 'optional_technologies_not_enabled'; end if;
 perform 1 from public.profiles where id=actor for update; select * into previous from public.user_consents where user_id=actor order by event_id desc limit 1;
 existing_band:=private.nm_age_band(actor); chosen_band:=coalesce(p_age_band,case when existing_band='unknown' then null else existing_band end);
 if chosen_band is distinct from '18_plus' then raise exception 'adult_confirmation_required' using errcode='42501'; end if;
 if existing_band<>'unknown' and chosen_band<>existing_band then raise exception 'age_band_immutable' using errcode='42501'; end if;
 needs_terms:=previous.terms_version is distinct from p_terms_version or previous.terms_accepted_at is null;
 if needs_terms and coalesce(p_accept_terms,false) is not true then raise exception 'terms_acceptance_required' using errcode='42501'; end if;
 if existing_band='unknown' then insert into private.account_age_policy(user_id,age_band,declared_at,source) values(actor,chosen_band,now(),'user_confirmation') on conflict(user_id) do update set age_band=excluded.age_band,declared_at=excluded.declared_at,source=excluded.source,updated_at=now() where private.account_age_policy.age_band='unknown'; end if;
 if chosen_band='15_17' then update private.account_entitlements set tier='free',updated_at=now() where user_id=actor; update public.profiles set account_tier='free',username=null,discovery_visibility='nobody' where id=actor; end if;
 insert into public.user_consents(user_id,privacy_version,terms_version,terms_accepted_at,adult_confirmed_at,age_band,analytics_consent,ads_consent,personalized_ads_consent) values(actor,p_privacy_version,case when needs_terms then p_terms_version else previous.terms_version end,case when needs_terms then now() else previous.terms_accepted_at end,case when chosen_band='18_plus' then coalesce(previous.adult_confirmed_at,now()) else null end,chosen_band,coalesce(p_analytics_consent,false),false,false) returning * into result;
 return result;
end $function$
;

-- Keep the legacy overload subject to the same authoritative age rules.
create or replace function private.record_privacy_choices(p_privacy_version text,p_terms_version text,p_accept_terms boolean,p_confirm_adult boolean,p_analytics_consent boolean,p_ads_consent boolean,p_personalized_ads_consent boolean)
returns public.user_consents language sql security definer set search_path='' as $$
 select private.record_privacy_choices(p_privacy_version,p_terms_version,p_accept_terms,case when p_confirm_adult then '18_plus'::text else null::text end,p_analytics_consent,p_ads_consent,p_personalized_ads_consent)
$$;
