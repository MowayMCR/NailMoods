-- Phase 14D. Installs an INACTIVE retention mechanism. No scheduled or real purge.
-- Storage bytes are removed only by the separate API worker, never by SQL.
create table private.support_retention_policy (
 id boolean primary key default true check(id), enabled boolean not null default false,
 approved_at timestamptz, support_months integer check(support_months>=3),
 report_months integer check(report_months>=12), orphan_days integer check(orphan_days>=7),
 check(not enabled or (approved_at is not null and support_months is not null and report_months is not null))
);
insert into private.support_retention_policy(id) values(true);
alter table private.support_retention_policy enable row level security;
revoke all on private.support_retention_policy from public,anon,authenticated;
alter table private.support_tickets add column closed_at timestamptz, add column retention_hold boolean not null default false;
alter table private.safety_reports add column retention_hold boolean not null default false;
update private.support_tickets set closed_at=greatest(created_at,updated_at) where status in ('resolved','dismissed');
create table private.support_retention_jobs (
 id uuid primary key default gen_random_uuid(), kind text not null check(kind in ('support','report','orphan')),
 item_id uuid, owner_id uuid, object_path text, object_id uuid, object_updated_at timestamptz, object_path_hash text,
 source_updated_at timestamptz, state text not null default 'claimed' check(state in ('claimed','done','cancelled')),
 attempts integer not null default 0, error_code text, created_at timestamptz not null default now(), finished_at timestamptz
);
create unique index support_retention_active_item on private.support_retention_jobs(kind,item_id) where state='claimed' and item_id is not null;
create unique index support_retention_active_path on private.support_retention_jobs(object_path) where state='claimed' and object_path is not null;
create unique index support_retention_path_tombstone on private.support_retention_jobs(object_path_hash) where state in ('claimed','done') and object_path_hash is not null;
alter table private.support_retention_jobs enable row level security;
revoke all on private.support_retention_jobs from public,anon,authenticated;

-- Disable the former entry point, including any forgotten caller or cron.
create or replace function private.nm_purge_support_retention(p_now timestamptz default now()) returns jsonb
language plpgsql security definer set search_path='' as $$
begin raise exception 'retention_disabled_use_dry_run_and_approved_storage_api_worker'; end $$;

create function private.nm_retention_normalize(p_text text) returns text language sql immutable set search_path='' as $$
 select replace(replace(lower(coalesce(p_text,'')), '%2f', '/'), E'\\/', '/')
$$;

-- Conservative cross-account reference search. All current public app tables are
-- searched, including JSON snapshots/drawings; future public tables fail safe too.
create function private.nm_retention_referenced(p_path text,p_exclude_ticket uuid default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare t record; found_ref boolean;
begin
 if p_path is null then return false; end if;
 if exists(select 1 from private.support_tickets where attachment=p_path and id is distinct from p_exclude_ticket) then return true; end if;
 if exists(select 1 from private.safety_reports r where strpos(private.nm_retention_normalize(to_jsonb(r)::text),private.nm_retention_normalize(p_path))>0) or exists(select 1 from private.support_decisions d where (d.kind<>'support' or d.item_id is distinct from p_exclude_ticket) and strpos(private.nm_retention_normalize(to_jsonb(d)::text),private.nm_retention_normalize(p_path))>0) then return true;end if;
 for t in select c.oid::regclass as relation from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','p') loop
  execute format('select exists(select 1 from %s r where strpos(private.nm_retention_normalize(to_jsonb(r)::text),$1)>0)',t.relation) into found_ref using private.nm_retention_normalize(p_path);
  if found_ref then return true; end if;
 end loop;
 return false;
end $$;

create function private.nm_retention_owned(p_path text,p_owner uuid,p_ticket uuid default null) returns boolean
language plpgsql security definer set search_path='' as $$
declare parts text[]; obj record;
begin
 if p_path is null then return true; end if;
 if p_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/support/[0-9a-f-]{36}\.(png|jpeg|webp)$' then return false; end if;
 parts:=string_to_array(p_path,'/');
 if parts[1]<>p_owner::text or (p_ticket is not null and split_part(parts[4],'.',1)<>p_ticket::text) then return false; end if;
 if not exists(select 1 from public.workspaces where id::text=parts[2] and owner_user_id=p_owner and kind='personal') then return false; end if;
 select * into obj from storage.objects where bucket_id='nailmoods-private' and name=p_path;
 -- Absence is allowed for an already interrupted deletion, not a foreign owner.
 return not found or coalesce(obj.owner_id,obj.owner::text)=p_owner::text;
end $$;

create function private.nm_retention_candidates(p_preview boolean default true) returns table(kind text,item_id uuid,owner_id uuid,object_path text,source_updated_at timestamptz,eligible boolean,reason text)
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
  eligible:=reason='candidate';return next;
 end loop;
end $$;

-- Same path lock used by claim, references and authenticated Storage writers.
create function private.nm_retention_path_available(p_path text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 if p_path not like '%/support/%' then return true; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_path,14029));
 return not exists(select 1 from private.support_retention_jobs where object_path_hash=encode(sha256(convert_to(p_path,'UTF8')),'hex') and state in ('claimed','done'));
end $$;
create function private.nm_retention_reference_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare path text;
begin
 for path in select distinct m[1] from regexp_matches(private.nm_retention_normalize(to_jsonb(new)::text),'([0-9a-f-]{36}/[0-9a-f-]{36}/support/[0-9a-f-]{36}\.(?:png|jpeg|webp))','g') m order by 1 loop
  if not private.nm_retention_path_available(path) then raise exception 'support_attachment_retention_in_progress' using errcode='55000';end if;
 end loop;
 return new;
end $$;
do $$ declare t record; begin
 for t in select c.oid::regclass as relation from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' loop
 execute format('create trigger nm_retention_reference_guard before insert or update on %s for each row execute function private.nm_retention_reference_guard()',t.relation);
 end loop;
end $$;
create trigger nm_retention_reference_guard before insert or update on private.safety_reports for each row execute function private.nm_retention_reference_guard();
create trigger nm_retention_reference_guard before insert or update on private.support_decisions for each row execute function private.nm_retention_reference_guard();
create policy nm_support_retention_write_guard on storage.objects as restrictive for all to authenticated
 using(private.nm_retention_path_available(name)) with check(private.nm_retention_path_available(name));

create function private.nm_retention_case_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare k text:=case when tg_table_name='support_tickets' then 'support' else 'report' end;
begin
 if tg_op<>'INSERT' and exists(select 1 from private.support_retention_jobs where kind=k and item_id=old.id and state='claimed') and coalesce(current_setting('nailmoods.retention_finalize',true),'')<>'yes' then raise exception 'case_retention_in_progress' using errcode='55000';end if;
 if tg_op='DELETE' then return old;end if;
 if k='support' then
  if new.status not in ('resolved','dismissed') then new.closed_at:=null;
  elsif tg_op='INSERT' or old.status not in ('resolved','dismissed') then new.closed_at:=now();end if;
  if nullif(new.attachment,'') is not null and not private.nm_retention_path_available(new.attachment) then raise exception 'attachment_retention_in_progress' using errcode='55000';end if;
 end if;
 return new;
end $$;
create trigger nm_retention_case_guard before insert or update or delete on private.support_tickets for each row execute function private.nm_retention_case_guard();
create trigger nm_retention_case_guard before insert or update or delete on private.safety_reports for each row execute function private.nm_retention_case_guard();

create function public.nm_support_retention(p_action text default 'dry_run',p_job uuid default null,p_kind text default null,p_item uuid default null,p_error text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.support_retention_policy; c record; j private.support_retention_jobs; o storage.objects; output jsonb;
begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'service_role_only' using errcode='42501';end if;
 select * into cfg from private.support_retention_policy where id;
 if p_action='dry_run' then
  return jsonb_build_object('read_only',true,'enabled',cfg.enabled,'approved_at',cfg.approved_at,'proposed_months_support',3,'proposed_months_reports',12,'proposed_days_orphans',7,'inventory',coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'eligible',eligible,'reason',reason,'count',n)) from (select kind,eligible,reason,count(*) n from private.nm_retention_candidates(true) group by 1,2,3) q),'[]'::jsonb));
 end if;
 if p_action='pending' then return coalesce((select jsonb_agg(jsonb_build_object('id',id,'kind',kind)) from (select id,kind from private.support_retention_jobs where state='claimed' order by created_at limit 20) q),'[]');end if;
 if not cfg.enabled or cfg.approved_at is null then raise exception 'retention_not_approved_or_enabled';end if;
 if p_action='candidates' then return coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'item_id',item_id)) from (select * from private.nm_retention_candidates(false) where eligible order by kind,item_id limit 20) q),'[]');end if;
 if p_action='claim' then
  if exists(select 1 from pg_class r join pg_namespace n on n.oid=r.relnamespace where n.nspname='public' and r.relkind='r' and not exists(select 1 from pg_trigger t where t.tgrelid=r.oid and t.tgname='nm_retention_reference_guard' and t.tgenabled<>'D')) then raise exception 'reference_guard_coverage_changed';end if;
  select * into c from private.nm_retention_candidates(false) where kind=p_kind and item_id=p_item and eligible;
  if not found then return jsonb_build_object('skipped',true);end if;
  if c.object_path is not null then perform pg_advisory_xact_lock(hashtextextended(c.object_path,14029));end if;
  if c.kind='support' then perform 1 from private.support_tickets where id=c.item_id for update;
  elsif c.kind='report' then perform 1 from private.safety_reports where id=c.item_id for update;end if;
  -- Recheck after acquiring both locks; no path-only or owner-only deletion.
  select * into c from private.nm_retention_candidates(false) where kind=p_kind and item_id=p_item and eligible;
  if not found then return jsonb_build_object('skipped',true);end if;
  select * into j from private.support_retention_jobs where state='claimed' and kind=c.kind and item_id=c.item_id;
  if found then return jsonb_build_object('id',j.id);end if;
  if c.object_path is not null then select * into o from storage.objects where bucket_id='nailmoods-private' and name=c.object_path;
  else o:=null;end if;
  insert into private.support_retention_jobs(kind,item_id,owner_id,object_path,object_id,object_updated_at,source_updated_at,object_path_hash) values(c.kind,c.item_id,c.owner_id,c.object_path,o.id,o.updated_at,c.source_updated_at,case when c.object_path is not null then encode(sha256(convert_to(c.object_path,'UTF8')),'hex') end) returning * into j;
  return jsonb_build_object('id',j.id);
 end if;
 select * into j from private.support_retention_jobs where id=p_job for update;
 if not found then raise exception 'unknown_job';end if;
 if j.state<>'claimed' then return jsonb_build_object('id',j.id,'state',j.state);end if;
 if j.object_path is not null then perform pg_advisory_xact_lock(hashtextextended(j.object_path,14029));end if;
 if p_action='error' then update private.support_retention_jobs set attempts=attempts+1,error_code=case when p_error in ('storage_remove_failed','network_unconfirmed','finalize_failed') then p_error else 'worker_failed' end where id=j.id;return '{"recorded":true}';end if;
 if p_action='cancel' then
  if j.object_id is not null and not exists(select 1 from storage.objects where id=j.object_id and updated_at=j.object_updated_at) then raise exception 'storage_changed_resume_instead';end if;
  update private.support_retention_jobs set state='cancelled',finished_at=now(),item_id=null,owner_id=null,object_path=null,object_id=null,object_updated_at=null,source_updated_at=null where id=j.id;return '{"cancelled":true}';
 end if;
 if j.object_path is not null and (not private.nm_retention_owned(j.object_path,j.owner_id,case when j.kind='support' then j.item_id end) or private.nm_retention_referenced(j.object_path,case when j.kind='support' then j.item_id end)) then raise exception 'reference_or_owner_changed';end if;
 if j.kind='support' and not exists(select 1 from private.support_tickets where id=j.item_id and author=j.owner_id and status in ('resolved','dismissed') and not retention_hold and updated_at=j.source_updated_at and nullif(attachment,'') is not distinct from j.object_path) then raise exception 'case_changed';end if;
 if j.kind='report' and not exists(select 1 from private.safety_reports where id=j.item_id and author=j.owner_id and status in ('resolved','dismissed') and not retention_hold and updated_at=j.source_updated_at) then raise exception 'case_changed';end if;
 if p_action='object' then
  if exists(select 1 from storage.objects where bucket_id='nailmoods-private' and name=j.object_path and (id is distinct from j.object_id or updated_at is distinct from j.object_updated_at)) then raise exception 'object_changed';end if;
  return jsonb_build_object('id',j.id,'bucket','nailmoods-private','path',j.object_path,'already_absent',not exists(select 1 from storage.objects where bucket_id='nailmoods-private' and name=j.object_path));
 elsif p_action='finish' then
  if exists(select 1 from storage.objects where bucket_id='nailmoods-private' and name=j.object_path) then raise exception 'storage_removal_unconfirmed';end if;
  perform set_config('nailmoods.retention_finalize','yes',true);
  if j.kind in ('support','report') then delete from private.support_decisions where kind=j.kind and item_id=j.item_id;end if;
  if j.kind='support' then delete from private.support_tickets where id=j.item_id;
  elsif j.kind='report' then delete from private.safety_reports where id=j.item_id;end if;
  perform set_config('nailmoods.retention_finalize','no',true);
  update private.support_retention_jobs set state='done',finished_at=now(),error_code=null,item_id=null,owner_id=null,object_path=null,object_id=null,object_updated_at=null,source_updated_at=null where id=j.id;
  return jsonb_build_object('id',j.id,'state','done');
 end if;
 raise exception 'unknown_retention_action';
end $$;
revoke all on function public.nm_support_retention(text,uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.nm_support_retention(text,uuid,text,uuid,text) to service_role;
revoke all on function private.nm_retention_candidates(boolean),private.nm_retention_referenced(text,uuid),private.nm_retention_owned(text,uuid,uuid),private.nm_retention_case_guard(),private.nm_retention_reference_guard() from public,anon,authenticated;
revoke all on function private.nm_retention_path_available(text) from public,anon;
grant execute on function private.nm_retention_path_available(text) to authenticated;
