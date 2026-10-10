begin;
-- Permit the installed 0.8 beta to keep signing in/up while 0.9 rolls out.
-- Record the notice actually shown; legacy clients cannot opt into new processing.
create function private.privacy_notice_supported(version_value text) returns boolean
language sql stable set search_path='' as $$
 select coalesce(version_value=v.privacy_version or (v.privacy_version='0.9-beta' and version_value='0.8-beta'),false)
 from private.nm_legal_versions() v
$$;
revoke all on function private.privacy_notice_supported(text) from public,anon,authenticated;
do $$
declare definition text;updated text;
begin
 definition:=pg_get_functiondef('private.record_signup_terms()'::regprocedure);
 updated:=replace(definition,
  'new.raw_user_meta_data->>''privacy_version'' is distinct from versions.privacy_version',
  'not private.privacy_notice_supported(new.raw_user_meta_data->>''privacy_version'')');
 updated:=replace(updated,'values (new.id, versions.privacy_version, versions.terms_version',
  'values (new.id, new.raw_user_meta_data->>''privacy_version'', versions.terms_version');
 updated:=replace(updated,'coalesce((new.raw_user_meta_data->>''analytics_consent'')::boolean, false)',
  'case when new.raw_user_meta_data->>''privacy_version''=versions.privacy_version then coalesce((new.raw_user_meta_data->>''analytics_consent'')::boolean, false) else false end');
 if updated=definition or position('values (new.id, versions.privacy_version' in updated)>0
 or position('case when new.raw_user_meta_data' in updated)=0 then raise exception 'signup_policy_contract_changed';end if;
 execute updated;
 definition:=pg_get_functiondef('private.record_privacy_choices(text,text,boolean,text,boolean,boolean,boolean)'::regprocedure);
 updated:=replace(definition,'p_privacy_version is distinct from v.privacy_version','not private.privacy_notice_supported(p_privacy_version)');
 updated:=replace(updated,'coalesce(p_analytics_consent,false)',
  'case when p_privacy_version=(select privacy_version from private.nm_legal_versions()) then coalesce(p_analytics_consent,false) else false end');
 if updated=definition or position('not private.privacy_notice_supported' in updated)=0
 or position('case when p_privacy_version=' in updated)=0 then raise exception 'privacy_choices_contract_changed';end if;
 -- This preserves environment-specific session checks and every existing grant.
 execute updated;
end $$;
commit;
