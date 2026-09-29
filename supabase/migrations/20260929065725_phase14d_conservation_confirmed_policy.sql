-- Decisions explicitly confirmed by Marie on 2026-09-29.
-- Configuration only: this does not run deletion or enable a scheduler.
update private.support_retention_policy
set support_months=3, report_months=12, orphan_days=7,
    approved_at=coalesce(approved_at, now()), enabled=false
where id=true;

-- Active notice; prior consent rows and real user accounts are not rewritten.
create or replace function private.nm_legal_versions()
returns table(privacy_version text, terms_version text)
language sql immutable set search_path='' as $$
 select '0.6-beta'::text, '0.4-beta'::text
$$;
