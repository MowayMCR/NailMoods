-- NailMoods product analytics v1. Private raw data; consent-gated writes only.
create schema if not exists private;
create extension if not exists pg_cron;

create table if not exists private.analytics_identities (
  user_id uuid primary key references auth.users(id) on delete cascade,
  analytics_user_id uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now()
);
create table if not exists private.analytics_event_catalog (
  event_name text primary key,
  category text not null,
  allowed_metadata_keys text[] not null default '{}'
);
create table if not exists private.analytics_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null,
  ingested_at timestamptz not null default now(),
  analytics_user_id uuid not null references private.analytics_identities(analytics_user_id) on delete cascade,
  session_id uuid not null,
  event_name text not null references private.analytics_event_catalog(event_name),
  screen text, workspace_type text, account_tier text not null check(account_tier in ('free','plus','pro')),
  professional_status text, app_version text not null, environment text not null default 'recette' check(environment='recette'),
  metadata jsonb not null default '{}', duration_ms integer check(duration_ms between 0 and 86400000), success boolean, error_code text,
  check(jsonb_typeof(metadata)='object'), check(pg_column_size(metadata)<=4096)
);
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
create index if not exists analytics_events_occurred_idx on private.analytics_events(occurred_at desc);
create index if not exists analytics_events_name_time_idx on private.analytics_events(event_name,occurred_at desc);
create index if not exists analytics_events_user_time_idx on private.analytics_events(analytics_user_id,occurred_at desc);
create index if not exists analytics_events_session_idx on private.analytics_events(session_id);
create index if not exists analytics_events_tier_time_idx on private.analytics_events(account_tier,occurred_at desc);

insert into private.analytics_event_catalog(event_name,category,allowed_metadata_keys) values
('app_opened','app','{}'),('session_started','app','{resumed}'),('session_resumed','app','{}'),('session_ended','app','{}'),('login_success','auth','{}'),('logout','auth','{}'),('signup_completed','auth','{}'),('screen_viewed','navigation','{}'),
('profile_completed','profile','{}'),('profile_visibility_changed','profile','{visibility}'),('account_tier_changed','profile','{from_tier,to_tier,source}'),('professional_status_changed','profile','{}'),
('collection_opened','collection','{}'),('product_add_started','collection','{source,category}'),('product_added','collection','{source,category,brand_id,recognition_success,confidence_bucket}'),('product_add_failed','collection','{source,category,recognition_success,confidence_bucket}'),('product_deleted','collection','{category}'),('sticker_added','collection','{source,category}'),('equipment_added','collection','{source,category}'),('scan_started','collection','{source}'),('scan_succeeded','collection','{source,recognition_success,confidence_bucket}'),('scan_failed','collection','{source,recognition_success,confidence_bucket}'),
('create_opened','creation','{}'),('create_mode_selected','creation','{mode}'),('generation_started','creation','{difficulty,number_of_colors,technique,render_mode,used_collection,imported_images_count}'),('generation_succeeded','creation','{difficulty,number_of_colors,technique,render_mode,used_collection,imported_images_count,generation_duration_ms}'),('generation_failed','creation','{difficulty,number_of_colors,technique,render_mode,used_collection,imported_images_count}'),('generation_regenerated','creation','{difficulty,number_of_colors,technique,render_mode,used_collection,imported_images_count}'),('generation_saved','creation','{difficulty,number_of_colors,technique,render_mode,used_collection}'),('generation_abandoned','creation','{render_mode}'),
('inspiration_import_started','import','{image_count,difficulty,mode}'),('inspiration_image_added','import','{image_count}'),('inspiration_image_removed','import','{image_count}'),('inspiration_import_completed','import','{image_count,difficulty,mode}'),('inspiration_analysis_started','import','{image_count,difficulty,mode}'),('inspiration_analysis_succeeded','import','{image_count,difficulty,mode,detected_techniques_count,missing_products_count}'),('inspiration_analysis_failed','import','{image_count,difficulty,mode}'),('inspiration_project_created','import','{image_count,difficulty,mode,detected_techniques_count,missing_products_count}'),
('realistic_render_requested','render','{technique,quality,model_name,estimated_cost,input_images_count}'),('realistic_render_started','render','{technique,quality,model_name,estimated_cost,input_images_count}'),('realistic_render_succeeded','render','{technique,quality,model_name,estimated_cost,input_images_count}'),('realistic_render_failed','render','{technique,quality,model_name,estimated_cost,input_images_count}'),('realistic_render_regenerated','render','{technique,quality,model_name,estimated_cost,input_images_count}'),
('journal_opened','journal','{}'),('journal_entry_created','journal','{type,visibility,source}'),('journal_entry_saved','journal','{type,visibility,source}'),('project_created','journal','{type,visibility,source}'),('project_opened','journal','{type,visibility,source}'),('project_completed','journal','{type,visibility,source}'),('project_converted_to_pose','journal','{type,visibility,source}'),('content_visibility_changed','journal','{type,visibility,source}'),
('profile_search_started','social','{sender_tier,receiver_type,relation_type}'),('profile_search_result_opened','social','{sender_tier,receiver_type,relation_type}'),('connection_request_sent','social','{sender_tier,receiver_type,relation_type}'),('connection_request_accepted','social','{sender_tier,receiver_type,relation_type}'),('connection_request_declined','social','{sender_tier,receiver_type,relation_type}'),('connection_removed','social','{sender_tier,receiver_type,relation_type}'),('share_to_pro_started','social','{sender_tier,receiver_type,shared_content_type,relation_type}'),('share_to_pro_sent','social','{sender_tier,receiver_type,shared_content_type,relation_type}'),('conversation_opened','social','{sender_tier,receiver_type,relation_type}'),('message_sent','social','{sender_tier,receiver_type,shared_content_type,relation_type}'),
('tier_viewed','tier','{from_tier,to_tier,source}'),('tier_changed','tier','{from_tier,to_tier,source}'),('tier_upgrade','tier','{from_tier,to_tier,source}'),('tier_downgrade','tier','{from_tier,to_tier,source}'),
('api_request_failed','performance','{endpoint_group}'),('upload_failed','performance','{endpoint_group}'),('auth_failed','performance','{endpoint_group}'),('page_load_slow','performance','{endpoint_group}')
on conflict(event_name) do update set category=excluded.category,allowed_metadata_keys=excluded.allowed_metadata_keys;

alter table private.analytics_identities enable row level security;
alter table private.analytics_event_catalog enable row level security;
alter table private.analytics_events enable row level security;
alter table private.analytics_daily_archive enable row level security;
revoke all on private.analytics_identities, private.analytics_event_catalog, private.analytics_events, private.analytics_daily_archive from public,anon,authenticated;
grant usage on schema private to service_role;
grant select on private.analytics_identities, private.analytics_event_catalog, private.analytics_events, private.analytics_daily_archive to service_role;

create or replace function private.record_analytics_events(p_events jsonb) returns integer language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_analytics uuid; v_tier text; v_prof text; v_event jsonb; v_count integer:=0; v_allowed text[]; v_meta jsonb;
begin
  if v_user is null or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>25 or pg_column_size(p_events)>65536 then raise exception 'invalid_analytics_batch'; end if;
  if not coalesce((select c.analytics_consent is true and c.privacy_version='0.2-beta' from public.user_consents c where c.user_id=v_user order by c.event_id desc limit 1),false) then return 0; end if;
  insert into private.analytics_identities(user_id) values(v_user) on conflict(user_id) do nothing;
  select analytics_user_id into v_analytics from private.analytics_identities where user_id=v_user;
  select coalesce(account_tier,'free'),professional_status into v_tier,v_prof from public.profiles where id=v_user;
  v_tier:=case when v_tier in('free','plus','pro') then v_tier else 'free' end;
  for v_event in select value from jsonb_array_elements(p_events) loop
    select allowed_metadata_keys into v_allowed from private.analytics_event_catalog where event_name=v_event->>'event_name';
    if v_allowed is null then continue; end if;
    select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into v_meta from jsonb_each(coalesce(v_event->'metadata','{}'::jsonb)) where key=any(v_allowed) and jsonb_typeof(value) in('string','number','boolean','null');
    insert into private.analytics_events(occurred_at,analytics_user_id,session_id,event_name,screen,workspace_type,account_tier,professional_status,app_version,metadata,duration_ms,success,error_code)
    values(greatest(now()-interval '24 hours',least(now()+interval '5 minutes',coalesce((v_event->>'occurred_at')::timestamptz,now()))),v_analytics,(v_event->>'session_id')::uuid,v_event->>'event_name',left(v_event->>'screen',80),left(v_event->>'workspace_type',30),v_tier,left(v_prof,60),left(coalesce(v_event->>'app_version','unknown'),30),v_meta,least(86400000,greatest(0,(v_event->>'duration_ms')::integer)),(v_event->>'success')::boolean,left(regexp_replace(v_event->>'error_code','[^a-zA-Z0-9_.-]','','g'),80));
    v_count:=v_count+1;
  end loop; return v_count;
end $$;
revoke all on function private.record_analytics_events(jsonb) from public,anon,authenticated;

create or replace function public.record_analytics_events(p_events jsonb) returns integer language sql security invoker set search_path='' as $$select private.record_analytics_events(p_events)$$;
revoke all on function public.record_analytics_events(jsonb) from public,anon;
grant execute on function public.record_analytics_events(jsonb) to authenticated;
grant execute on function private.record_analytics_events(jsonb) to authenticated;

create or replace view private.analytics_daily_kpis as select occurred_at::date as period_day,count(distinct analytics_user_id) dau,count(distinct session_id) sessions,count(*) events,avg(duration_ms) filter(where event_name='session_ended') avg_session_ms,percentile_cont(.5) within group(order by duration_ms) filter(where event_name='session_ended') median_session_ms from private.analytics_events group by 1;
create or replace view private.analytics_weekly_kpis as select date_trunc('week',occurred_at)::date period_week,count(distinct analytics_user_id) wau,count(distinct session_id) sessions,count(*) events from private.analytics_events group by 1;
create or replace view private.analytics_monthly_kpis as select date_trunc('month',occurred_at)::date period_month,count(distinct analytics_user_id) mau,count(distinct session_id) sessions,count(*) events from private.analytics_events group by 1;
create or replace view private.analytics_feature_usage as select occurred_at::date period_day,event_name,account_tier,count(*) uses,count(distinct analytics_user_id) users from private.analytics_events group by 1,2,3;
create or replace view private.analytics_tier_usage as select occurred_at::date period_day,account_tier,count(distinct analytics_user_id) users,count(distinct session_id) sessions,count(*) events from private.analytics_events group by 1,2;
create or replace view private.analytics_peak_usage as select date_trunc('minute',occurred_at) period_minute,count(*) events,count(distinct session_id) active_sessions,count(*) filter(where event_name like 'generation_%') generations,count(*) filter(where event_name like '%upload%') uploads from private.analytics_events group by 1;
create or replace view private.analytics_generation_usage as select occurred_at::date period_day,account_tier,count(*) filter(where event_name='generation_succeeded') generations,count(*) filter(where event_name='generation_regenerated') regenerations,count(*) filter(where event_name='generation_saved') saves,count(*) filter(where event_name='generation_abandoned') abandons,avg(duration_ms) filter(where event_name='generation_succeeded') avg_duration_ms from private.analytics_events group by 1,2;
create or replace view private.analytics_social_usage as select occurred_at::date period_day,event_name,count(*) events,count(distinct analytics_user_id) users from private.analytics_events where event_name in(select event_name from private.analytics_event_catalog where category='social') group by 1,2;
create or replace view private.analytics_cost_estimates as select occurred_at::date period_day,account_tier,count(*) filter(where event_name='realistic_render_succeeded') realistic_render_count,coalesce(sum(case when metadata->>'estimated_cost' ~ '^[0-9]+([.][0-9]+)?$' then (metadata->>'estimated_cost')::numeric else 0 end) filter(where event_name='realistic_render_succeeded'),0) estimated_ai_cost,count(*) filter(where event_name like '%upload%') upload_count from private.analytics_events group by 1,2;
create or replace view private.analytics_retention_cohorts as with a as(select analytics_user_id,occurred_at::date d,min(occurred_at::date) over(partition by analytics_user_id) cohort from private.analytics_events) select date_trunc('week',cohort)::date cohort_week,count(distinct analytics_user_id) cohort_users,count(distinct analytics_user_id) filter(where d=cohort+1) retained_d1,count(distinct analytics_user_id) filter(where d=cohort+7) retained_d7,count(distinct analytics_user_id) filter(where d=cohort+30) retained_d30 from a group by 1;
create or replace view private.analytics_activation as select analytics_user_id,min(occurred_at) filter(where event_name='app_opened') first_seen_at,min(occurred_at) filter(where event_name='profile_completed') profile_completed_at,min(occurred_at) filter(where event_name='product_added') first_product_at,min(occurred_at) filter(where event_name='generation_succeeded') first_generation_at,min(occurred_at) filter(where event_name='generation_saved') first_save_at from private.analytics_events group by 1;
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
revoke all on private.analytics_identities, private.analytics_event_catalog, private.analytics_events, private.analytics_daily_archive from public,anon,authenticated;
grant select on private.analytics_identities, private.analytics_event_catalog, private.analytics_events, private.analytics_daily_archive to service_role;

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
