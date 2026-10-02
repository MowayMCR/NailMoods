-- Explicit user instruction: analytics 24 months, replacing 13/25 months.
-- Existing consent records are preserved. This migration changes policy, not historical records.
begin;
create or replace function private.rollup_and_purge_analytics() returns void language plpgsql security definer set search_path='' as $$
begin
  insert into private.analytics_daily_archive(period_day,dau,sessions,events,generations,realistic_renders,estimated_ai_cost,calculated_at)
  select e.occurred_at::date,count(distinct e.analytics_user_id),count(distinct e.session_id),count(*),count(*) filter(where e.event_name='generation_succeeded'),count(*) filter(where e.event_name='realistic_render_succeeded'),coalesce(sum(case when e.event_name='realistic_render_succeeded' and e.metadata->>'estimated_cost' ~ '^[0-9]+([.][0-9]+)?$' then (e.metadata->>'estimated_cost')::numeric else 0 end),0),now()
  from private.analytics_events e where e.occurred_at::date=current_date-1 group by 1
  on conflict(period_day) do update set dau=excluded.dau,sessions=excluded.sessions,events=excluded.events,generations=excluded.generations,realistic_renders=excluded.realistic_renders,estimated_ai_cost=excluded.estimated_ai_cost,calculated_at=excluded.calculated_at;
  delete from private.analytics_events where occurred_at < now()-interval '24 months';
  delete from private.analytics_daily_archive where period_day < current_date-interval '24 months';
end $$;
revoke all on function private.rollup_and_purge_analytics() from public,anon,authenticated;

create or replace function private.nm_legal_versions() returns table(privacy_version text,terms_version text) language sql immutable set search_path='' as $$select '0.8-beta'::text,'0.6-beta'::text$$;
commit;
