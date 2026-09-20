create extension if not exists pg_cron;
create table if not exists private.analytics_daily_archive (
  period_day date primary key,
  dau integer not null,
  sessions integer not null,
  events integer not null,
  generations integer not null,
  realistic_renders integer not null,
  estimated_ai_cost numeric not null default 0,
  calculated_at timestamptz not null default now()
);
alter table private.analytics_daily_archive enable row level security;
revoke all on private.analytics_daily_archive from public,anon,authenticated;
grant select on private.analytics_daily_archive to service_role;
create or replace function private.rollup_and_purge_analytics() returns void language plpgsql security definer set search_path='' as $$
begin
  insert into private.analytics_daily_archive(period_day,dau,sessions,events,generations,realistic_renders,estimated_ai_cost,calculated_at)
  select e.occurred_at::date,count(distinct e.analytics_user_id),count(distinct e.session_id),count(*),count(*) filter(where e.event_name='generation_succeeded'),count(*) filter(where e.event_name='realistic_render_succeeded'),coalesce(sum(case when e.event_name='realistic_render_succeeded' and e.metadata->>'estimated_cost' ~ '^[0-9]+([.][0-9]+)?$' then (e.metadata->>'estimated_cost')::numeric else 0 end),0),now()
  from private.analytics_events e where e.occurred_at::date=current_date-1 group by 1
  on conflict(period_day) do update set dau=excluded.dau,sessions=excluded.sessions,events=excluded.events,generations=excluded.generations,realistic_renders=excluded.realistic_renders,estimated_ai_cost=excluded.estimated_ai_cost,calculated_at=excluded.calculated_at;
  delete from private.analytics_events where occurred_at < now()-interval '13 months';
  delete from private.analytics_daily_archive where period_day < current_date-interval '25 months';
end $$;
revoke all on function private.rollup_and_purge_analytics() from public,anon,authenticated;
do $$begin if not exists(select 1 from cron.job where jobname='nailmoods-analytics-retention') then perform cron.schedule('nailmoods-analytics-retention','17 3 * * *','select private.rollup_and_purge_analytics()'); end if;end$$;
