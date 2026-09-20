drop function if exists public.record_analytics_events(jsonb);
drop view if exists private.analytics_activation,private.analytics_retention_cohorts,private.analytics_cost_estimates,private.analytics_social_usage,private.analytics_generation_usage,private.analytics_peak_usage,private.analytics_tier_usage,private.analytics_feature_usage,private.analytics_monthly_kpis,private.analytics_weekly_kpis,private.analytics_daily_kpis;
drop function if exists private.record_analytics_events(jsonb);
do $$begin if exists(select 1 from cron.job where jobname='nailmoods-analytics-retention') then perform cron.unschedule('nailmoods-analytics-retention'); end if;end$$;
drop function if exists private.rollup_and_purge_analytics();
drop table if exists private.analytics_daily_archive,private.analytics_events,private.analytics_event_catalog,private.analytics_identities;
