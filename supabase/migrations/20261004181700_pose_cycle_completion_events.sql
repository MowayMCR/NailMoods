-- Keep conceptual palette suggestions out of products actually used.
-- Register only consent-gated, non-identifying event metadata.
begin;
create or replace function private.realize_pose_project(p_project_id uuid,p_revision integer,p_realized_on date,p_removed_on date default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.pose_projects;j public.journal_entries;idea jsonb;products jsonb;now_ms bigint:=floor(extract(epoch from clock_timestamp())*1000);d jsonb;target_status text;
begin
 select * into p from public.pose_projects where id=p_project_id and user_id=auth.uid() for update;
 if p.id is null or not private.pose_owner(p.user_id,p.workspace_id) then raise exception 'PROJECT_UNAVAILABLE' using errcode='42501';end if;
 if p_realized_on is null or not isfinite(p_realized_on) or p_realized_on>(now() at time zone 'Pacific/Kiritimati')::date
 or (p_removed_on is not null and (not isfinite(p_removed_on) or p_removed_on<p_realized_on or p_removed_on>(now() at time zone 'Pacific/Kiritimati')::date)) then raise exception 'POSE_DATE_INVALID' using errcode='23514';end if;
 -- A repeated response/retry is harmless; different edits still need the latest revision.
 if p.revision is distinct from p_revision and not (p.journal_entry_id is not null and p.details->>'realizedOn'=p_realized_on::text and (p.details->>'removedOn') is not distinct from p_removed_on::text) then raise exception 'PROJECT_CHANGED' using errcode='40001';end if;
 if p.journal_entry_id is not null then
  select * into j from public.journal_entries where id=p.journal_entry_id and created_by=p.user_id and workspace_id=p.workspace_id for update;
 elsif nullif(p.details->>'tutorialSessionId','') is not null then
  select * into j from public.journal_entries where created_by=p.user_id and workspace_id=p.workspace_id and snapshot->>'sessionId'=p.details->>'tutorialSessionId' order by created_at limit 1 for update;
 end if;
 if j.id is null then
  idea:=p.details->'composition';
  select coalesce(jsonb_agg(product),'[]'::jsonb) into products from (
   select distinct on (v->>'id') jsonb_strip_nulls(jsonb_build_object('id',v->'id','name',v->>'name','brand',v->>'brand','type',v->>'type','color',coalesce(case when v->>'catalogColorValidated'='true' and v->>'catalogColor' ~* '^#[0-9a-f]{6}$' then v->>'catalogColor' end,case when v->>'confirmedColor' ~* '^#[0-9a-f]{6}$' then v->>'confirmedColor' end,case when v->>'shade' ~* '^#[0-9a-f]{6}$' then v->>'shade' end,v->>'color'),'finish',v->>'finish','effect',v->>'effect','reference',v->>'reference','equipmentCategory',v->>'equipmentCategory')) product
   from jsonb_array_elements(coalesce(nullif(idea->'palette','null'),'[]')||coalesce(nullif(idea->'resources','null'),'[]')) v where v->>'id' is not null and coalesce(v->>'conceptual','false')<>'true' limit 100
  ) selected;
  insert into public.journal_entries(id,workspace_id,created_by,inspiration_id,performed_on,notes,visibility,snapshot)
  values(gen_random_uuid(),p.workspace_id,p.user_id,p.source_inspiration_id,p_realized_on,'','private',jsonb_build_object(
   'id','project-'||p.id::text,'version',1,'sessionId',p.details->'tutorialSessionId','idea',idea,'title',p.title,'date',p_realized_on::text,
   'photo','','products',products,'feeling','','ease','','repeat',false,'wearDays','','notes','','visibility','private','createdAt',now_ms,'updatedAt',now_ms)) returning * into j;
 elsif j.performed_on is distinct from p_realized_on then
  -- Keep the user's notes, photo and visibility; only the actual date is synchronized.
  update public.journal_entries set performed_on=p_realized_on,snapshot=snapshot||jsonb_build_object('date',p_realized_on::text,'updatedAt',now_ms) where id=j.id returning * into j;
 end if;
 -- An AFTER Journal date trigger may already have updated the project revision.
 select * into p from public.pose_projects where id=p_project_id;
 d:=p.details||jsonb_build_object('realizedOn',p_realized_on::text,'removedOn',p_removed_on::text);
 target_status:=case when p_removed_on is not null then 'archived' when jsonb_array_length(p.details->'followUp')>0 then 'follow_up' else 'done' end;
 if p.details is distinct from d or p.journal_entry_id is distinct from j.id or p.status<>target_status then
  update public.pose_projects set details=d,journal_entry_id=j.id,status=target_status where id=p.id returning * into p;
 end if;
 return jsonb_build_object('project',to_jsonb(p),'journal',to_jsonb(j));
end $$;
insert into private.analytics_event_catalog(event_name,category,allowed_metadata_keys) values
('pose_realized','journal',array['source']),
('pose_followup_saved','journal',array['has_photo']),
('pose_removal_guide_opened','journal',array[]::text[])
on conflict(event_name) do nothing;
commit;
