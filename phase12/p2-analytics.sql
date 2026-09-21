-- Existing analytics audited: isolated DBs, pseudonymous IDs, RLS,
-- latest consent required, metadata allowlist, 13-month retention.
insert into private.analytics_event_catalog(event_name,category,allowed_metadata_keys) values
 ('feature_locked','tier','{}'),('quota_exceeded','tier','{}'),
 ('nail_art_choice','import','{nail_art,image_count}'),
 ('nail_art_level_selected','import','{level,image_count}'),
 ('favorite_added','social','{}'),('favorite_removed','social','{}'),
 ('share_detail_opened','social','{}')
on conflict(event_name) do update set allowed_metadata_keys=excluded.allowed_metadata_keys;
update private.analytics_event_catalog set allowed_metadata_keys=ARRAY(select distinct unnest(allowed_metadata_keys||array['nail_art','level','image_count','mode'])) where event_name in ('generation_started','generation_succeeded','generation_failed','inspiration_project_created');
CREATE OR REPLACE FUNCTION private.record_analytics_events(p_events jsonb)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid(); v_analytics uuid; v_tier text; v_prof text; v_event jsonb; v_count integer:=0; v_allowed text[]; v_meta jsonb;
begin
  if v_user is null or jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>25 or pg_column_size(p_events)>65536 then raise exception 'invalid_analytics_batch'; end if;
  if not coalesce((select c.analytics_consent is true and c.privacy_version='0.2-beta' from public.user_consents c where c.user_id=v_user order by c.event_id desc limit 1),false) then return 0; end if;
  insert into private.analytics_identities(user_id) values(v_user) on conflict(user_id) do nothing;
  select analytics_user_id into v_analytics from private.analytics_identities where user_id=v_user;
  select private.effective_tier(v_user),professional_status into v_tier,v_prof from public.profiles where id=v_user;
  v_tier:=case when v_tier in('free','plus','pro') then v_tier else 'free' end;
  for v_event in select value from jsonb_array_elements(p_events) loop
    select allowed_metadata_keys into v_allowed from private.analytics_event_catalog where event_name=v_event->>'event_name';
    if v_allowed is null then continue; end if;
    select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) into v_meta from jsonb_each(coalesce(v_event->'metadata','{}'::jsonb)) where key=any(v_allowed) and jsonb_typeof(value) in('string','number','boolean','null');
    insert into private.analytics_events(occurred_at,analytics_user_id,session_id,event_name,screen,workspace_type,account_tier,professional_status,app_version,metadata,duration_ms,success,error_code)
    values(greatest(now()-interval '24 hours',least(now()+interval '5 minutes',coalesce((v_event->>'occurred_at')::timestamptz,now()))),v_analytics,(v_event->>'session_id')::uuid,v_event->>'event_name',left(v_event->>'screen',80),left(v_event->>'workspace_type',30),v_tier,left(v_prof,60),left(coalesce(v_event->>'app_version','unknown'),30),v_meta,least(86400000,greatest(0,(v_event->>'duration_ms')::integer)),(v_event->>'success')::boolean,left(regexp_replace(v_event->>'error_code','[^a-zA-Z0-9_.-]','','g'),80));
    v_count:=v_count+1;
  end loop; return v_count;
end $function$
;
