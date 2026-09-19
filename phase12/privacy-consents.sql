-- REVIEWED PREPARATION ONLY: not applied. Deploy with matching public documents/UI.
-- Existing product/auth tables and RLS policies are preserved.
create table public.user_consents (
  event_id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  privacy_version text not null,
  terms_version text,
  terms_accepted_at timestamptz,
  analytics_consent boolean not null default false,
  ads_consent boolean not null default false,
  personalized_ads_consent boolean not null default false,
  consent_updated_at timestamptz not null default now(),
  check (not personalized_ads_consent or ads_consent),
  check ((terms_version is null) = (terms_accepted_at is null))
);
create index user_consents_owner_history on public.user_consents(user_id, event_id desc);
alter table public.user_consents enable row level security;
revoke all on public.user_consents from anon, authenticated;
grant select on public.user_consents to authenticated;
create policy consents_read_own on public.user_consents for select to authenticated using (user_id = (select auth.uid()));
-- Append-only event history. Clients cannot invent dates, change history, or choose an owner.
create function private.record_privacy_choices(p_privacy_version text, p_terms_version text, p_accept_terms boolean,
  p_analytics_consent boolean, p_ads_consent boolean, p_personalized_ads_consent boolean)
returns public.user_consents language plpgsql security definer set search_path = '' as $$
declare current_user_id uuid := auth.uid(); previous public.user_consents; result public.user_consents;
begin
  if current_user_id is null or not exists(select 1 from auth.users where id=current_user_id) then raise exception 'authentication_required' using errcode='42501'; end if;
  if p_privacy_version is distinct from '0.1-beta' or p_terms_version is distinct from '0.1-beta' then raise exception 'policy_version_changed'; end if;
  -- Serialize consent updates on all devices for this user.
  perform 1 from public.profiles where id=current_user_id for update;
  select * into previous from public.user_consents where user_id=current_user_id order by event_id desc limit 1;
  -- No actual optional provider exists. Future activation requires a new notice/version/migration.
  if coalesce(p_analytics_consent,false) or coalesce(p_ads_consent,false) or coalesce(p_personalized_ads_consent,false) then raise exception 'optional_technologies_not_enabled'; end if;
  insert into public.user_consents(user_id,privacy_version,terms_version,terms_accepted_at)
  values(current_user_id,p_privacy_version,
    case when p_accept_terms then p_terms_version else previous.terms_version end,
    case when p_accept_terms and previous.terms_version is distinct from p_terms_version then now() else previous.terms_accepted_at end)
  returning * into result;
  return result;
end $$;
revoke all on function private.record_privacy_choices(text,text,boolean,boolean,boolean,boolean) from public, anon;
grant execute on function private.record_privacy_choices(text,text,boolean,boolean,boolean,boolean) to authenticated;
create function public.record_privacy_choices(p_privacy_version text,p_terms_version text,p_accept_terms boolean,p_analytics_consent boolean,p_ads_consent boolean,p_personalized_ads_consent boolean)
returns public.user_consents language sql security invoker set search_path='' as $$
  select private.record_privacy_choices(p_privacy_version,p_terms_version,p_accept_terms,p_analytics_consent,p_ads_consent,p_personalized_ads_consent)
$$;
revoke all on function public.record_privacy_choices(text,text,boolean,boolean,boolean,boolean) from public, anon;
grant execute on function public.record_privacy_choices(text,text,boolean,boolean,boolean,boolean) to authenticated;
-- Preserve the existing profile/workspace trigger; a separate trigger records initial terms.
create function private.record_signup_terms() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.raw_user_meta_data->'terms_accepted' is distinct from 'true'::jsonb
    or new.raw_user_meta_data->>'terms_version' is distinct from '0.1-beta'
    or new.raw_user_meta_data->>'privacy_version' is distinct from '0.1-beta'
  then raise exception 'terms_acceptance_required'; end if;
  insert into public.user_consents(user_id,privacy_version,terms_version,terms_accepted_at)
  values(new.id,'0.1-beta','0.1-beta',now());
  -- Optional consents are never inferred from signing up; no provider is enabled.
  return new;
end $$;
revoke all on function private.record_signup_terms() from public,anon,authenticated;
create trigger on_auth_user_terms after insert on auth.users for each row execute function private.record_signup_terms();

-- Delete only the authenticated user's account, after typed confirmation and a live session check.
-- Not enabled in production until phase12/institute-messaging.sql is deployed and end-to-end deletion QA confirms anonymized message retention.
create function private.delete_my_nailmoods_account(p_confirmation text) returns void
language plpgsql security definer set search_path='' as $$
declare current_user_id uuid := auth.uid();
begin
  if p_confirmation is distinct from 'SUPPRIMER' then raise exception 'confirmation_required'; end if;
  if current_user_id is null or not exists(select 1 from auth.sessions where user_id=current_user_id and id::text=auth.jwt()->>'session_id') then raise exception 'authentication_required' using errcode='42501'; end if;
  perform 1 from auth.users where id=current_user_id for update;
  -- Lock owned spaces so concurrent membership inserts cannot race deletion.
  perform 1 from public.workspaces where owner_user_id=current_user_id for update;
  if exists(select 1 from public.workspace_members m join public.workspaces w on w.id=m.workspace_id where w.owner_user_id=current_user_id and m.user_id<>current_user_id)
    then raise exception 'shared_workspace_transfer_required'; end if;
  -- Storage files require the Storage API, never SQL-only deletion of object metadata.
  if exists(select 1 from storage.objects where owner_id=current_user_id::text) then raise exception 'storage_cleanup_required'; end if;
  delete from auth.sessions where user_id=current_user_id;
  delete from auth.users where id=current_user_id;
  -- After phase12/institute-messaging.sql, message authors and conversation creators are SET NULL on account deletion.\n  -- Remaining participants keep conversation history; UI must render null sender as « Compte supprimé ».\n  -- Private account-owned data/workspaces still follow their own deletion rules.
end $$;
revoke all on function private.delete_my_nailmoods_account(text) from public,anon;
grant execute on function private.delete_my_nailmoods_account(text) to authenticated;
create function public.delete_my_nailmoods_account(p_confirmation text) returns void language sql security invoker set search_path='' as $$ select private.delete_my_nailmoods_account(p_confirmation) $$;
revoke all on function public.delete_my_nailmoods_account(text) from public,anon;
grant execute on function public.delete_my_nailmoods_account(text) to authenticated;
