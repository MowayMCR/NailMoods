-- Every moderation action, including suspension restoration, is report activity.
-- Suspected support orphans remain read-only until pending-client references can be excluded.
create or replace function private.nm_retention_candidates(p_preview boolean default true) returns table(kind text,item_id uuid,owner_id uuid,object_path text,source_updated_at timestamptz,eligible boolean,reason text)
language plpgsql security definer set search_path='' as $$
declare cfg private.support_retention_policy; t record; months_support integer; months_report integer; days_orphan integer;
begin
 select * into cfg from private.support_retention_policy where id;
 months_support:=coalesce(cfg.support_months,case when p_preview then 3 end);
 months_report:=coalesce(cfg.report_months,case when p_preview then 12 end);
 days_orphan:=coalesce(cfg.orphan_days,case when p_preview then 7 end);
 for t in select s.* from private.support_tickets s where s.status in ('resolved','dismissed') and s.closed_at<now()-make_interval(months=>months_support) loop
  kind:='support';item_id:=t.id;owner_id:=t.author;object_path:=nullif(t.attachment,'');source_updated_at:=t.updated_at;
  reason:=case when t.retention_hold then 'legal_hold' when not private.nm_retention_owned(object_path,t.author,t.id) then 'ownership_mismatch' when private.nm_retention_referenced(object_path,t.id) then 'still_referenced' else 'candidate' end;
  eligible:=reason='candidate';return next;
 end loop;
 for t in select s.* from private.safety_reports s where s.status in ('resolved','dismissed') and greatest(s.created_at,s.updated_at,(select max(d.created_at) from private.support_decisions d where d.kind='report' and d.item_id=s.id))<now()-make_interval(months=>months_report) loop
  kind:='report';item_id:=t.id;owner_id:=t.author;object_path:=null;source_updated_at:=t.updated_at;eligible:=not t.retention_hold;reason:=case when eligible then 'candidate' else 'legal_hold' end;return next;
 end loop;
 -- Only support uploads. Journal, messages, profile and Pro media are out of scope.
 for t in select o.* from storage.objects o where o.bucket_id='nailmoods-private' and o.name like '%/support/%' and greatest(o.created_at,o.updated_at)<now()-make_interval(days=>days_orphan) and not exists(select 1 from private.support_tickets s where s.attachment=o.name) loop
  kind:='orphan';item_id:=t.id;object_path:=t.name;source_updated_at:=t.updated_at;
  begin owner_id:=coalesce(t.owner_id,t.owner::text)::uuid; exception when invalid_text_representation then owner_id:=null; end;
  reason:=case when owner_id is null or not private.nm_retention_owned(object_path,owner_id) then 'ownership_mismatch' when private.nm_retention_referenced(object_path) then 'still_referenced' else 'candidate' end;
  -- No server-only query can prove a live client no longer holds a failed upload.
  -- Keep these as review candidates only; never delete suspected orphans automatically.
  if reason='candidate' then reason:='orphan_requires_manual_review';end if;
  eligible:=false;return next;
 end loop;
end $$;

CREATE OR REPLACE FUNCTION private.nm_support_suspend_account_v3(p_report_id uuid, p_action text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare actor uuid:=auth.uid(); target uuid; previous_status text; priority_value text;
begin
 if actor is null or not private.nm_support_staff() then raise exception 'staff_only' using errcode='42501'; end if;
 if p_action not in ('suspend','restore') then raise exception 'invalid_account_action' using errcode='22023'; end if;
 select target_user,status,priority into target,previous_status,priority_value from private.safety_reports where id=p_report_id for update;
 if target is null then raise exception 'report_without_account_target' using errcode='22023'; end if;
 if p_action='suspend' then
  insert into private.account_suspensions(user_id,report_id,reason,created_by,status,created_at,lifted_by,lifted_at)
  values(target,p_report_id,'Signalement en cours de traitement',actor,'active',now(),null,null)
  on conflict(user_id) do update set report_id=excluded.report_id,reason=excluded.reason,created_by=excluded.created_by,status='active',created_at=now(),lifted_by=null,lifted_at=null;
  update public.profiles set discovery_visibility='nobody',updated_at=now() where id=target;
  update public.pro_profiles pp set is_public=false,updated_at=now() from public.workspaces w where pp.workspace_id=w.id and w.owner_user_id=target and pp.is_public;
  update private.safety_reports set status='under_review',assigned_to=coalesce(assigned_to,actor),updated_at=now() where id=p_report_id;
  insert into private.support_decisions(kind,item_id,actor,from_status,to_status,priority,note) values('report',p_report_id,actor,previous_status,'under_review',priority_value,'Compte suspendu temporairement.');
  return jsonb_build_object('id',p_report_id,'account_status','suspended');
 else
  -- A restore is also activity on this report and must respect a pending purge lock.
  update private.safety_reports set updated_at=now() where id=p_report_id;
  update private.account_suspensions set status='lifted',lifted_by=actor,lifted_at=now() where user_id=target and status='active';
  if not found then raise exception 'account_not_suspended' using errcode='P0002'; end if;
  insert into private.support_decisions(kind,item_id,actor,from_status,to_status,priority,note) values('report',p_report_id,actor,previous_status,previous_status,priority_value,'Suspension du compte levée.');
  return jsonb_build_object('id',p_report_id,'account_status','active');
 end if;
end $function$
;
