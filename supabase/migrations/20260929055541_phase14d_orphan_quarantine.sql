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
 for t in select s.* from private.safety_reports s where s.status in ('resolved','dismissed') and greatest(s.created_at,s.updated_at)<now()-make_interval(months=>months_report) loop
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
