-- Recette only: fix account creation with the current frontend privacy version.
create or replace function private.record_signup_terms() returns trigger
language plpgsql security definer set search_path='' as $$
declare privacy text:=new.raw_user_meta_data->>'privacy_version';
begin
 if new.raw_user_meta_data->'adult_confirmed' is distinct from 'true'::jsonb then raise exception 'adult_confirmation_required';end if;
 if new.raw_user_meta_data->'terms_accepted' is distinct from 'true'::jsonb
 or new.raw_user_meta_data->>'terms_version' is distinct from '0.1-beta'
 or privacy is null or privacy not in ('0.1-beta','0.2-beta')
 then raise exception 'terms_acceptance_required';end if;
 insert into public.user_consents(user_id,privacy_version,terms_version,terms_accepted_at,adult_confirmed_at)
 values(new.id,privacy,'0.1-beta',now(),now());
 -- Optional analytics/advertising choices remain false until explicitly recorded.
 return new;
end $$;
revoke all on function private.record_signup_terms() from public,anon,authenticated;
