-- Rollback for the beta KPI refactor: removes only the added KPI views and the
-- legal-version helper. Restore the previous function bodies from the audited
-- production snapshot before dropping the helper if a rollback is required.
begin;
drop view if exists private.analytics_generation_techniques;
drop view if exists private.analytics_journal_usage;
drop view if exists private.analytics_collection_usage;
drop view if exists private.analytics_activity_windows;
drop view if exists private.analytics_pipeline_health;
-- Do not drop private.nm_legal_versions until record_* functions have been restored.
commit;
