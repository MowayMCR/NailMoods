begin;
create or replace function private.nm_legal_versions()
returns table(privacy_version text,terms_version text)
language sql immutable set search_path='' as $$ select '0.7-beta'::text,'0.5-beta'::text $$;
-- Existing acceptance records are deliberately not rewritten.
commit;
