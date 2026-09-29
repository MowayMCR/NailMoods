-- Recette only. Synthetic rows, no Storage object deletion; all changes roll back.
begin;
select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $$
declare u uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); w uuid; ticket uuid:=gen_random_uuid(); report uuid:=gen_random_uuid(); path text; result jsonb; job uuid; blocked boolean;
begin
 insert into auth.users(id,email,raw_user_meta_data) values
 (u,'retention-owner@example.invalid','{"terms_accepted":true,"adult_confirmed":true,"terms_version":"0.4-beta","privacy_version":"0.5-beta"}'),
 (other_user,'retention-peer@example.invalid','{"terms_accepted":true,"adult_confirmed":true,"terms_version":"0.4-beta","privacy_version":"0.5-beta"}');
 select id into strict w from public.workspaces where owner_user_id=u and kind='personal';
 path:=u::text||'/'||w::text||'/support/'||ticket::text||'.png';
 insert into private.support_tickets(id,author,category,description,screen,environment,app_version,platform,attachment,status)
 values(ticket,u,'other','synthetic fixture','test','recette','test','test',path,'resolved');
 update private.support_tickets set closed_at=now()-interval '4 months',updated_at=now()-interval '4 months' where id=ticket;
 if not exists(select 1 from private.nm_retention_candidates(true) where item_id=ticket and eligible) then raise exception 'FAIL closed candidate';end if;
 perform public.nm_support_retention('dry_run');
 if exists(select 1 from private.support_retention_jobs where item_id=ticket) then raise exception 'FAIL dry run mutated';end if;
 blocked:=false;begin perform public.nm_support_retention('claim',null,'support',ticket);exception when others then blocked:=sqlerrm='retention_not_approved_or_enabled';end;
 if not blocked then raise exception 'FAIL disabled claim';end if;
 blocked:=false;begin perform private.nm_purge_support_retention();exception when others then blocked:=sqlerrm='retention_disabled_use_dry_run_and_approved_storage_api_worker';end;
 if not blocked then raise exception 'FAIL legacy purge';end if;
 update private.support_tickets set retention_hold=true where id=ticket;
 if exists(select 1 from private.nm_retention_candidates(true) where item_id=ticket and eligible) then raise exception 'FAIL hold';end if;
 update private.support_tickets set retention_hold=false where id=ticket;
 update public.profiles set preferences=jsonb_build_object('fixture_reference',path) where id=other_user;
 if exists(select 1 from private.nm_retention_candidates(true) where item_id=ticket and eligible) then raise exception 'FAIL cross account reference';end if;
 update public.profiles set preferences='{}' where id=other_user;
 if private.nm_retention_owned(path,other_user,ticket) then raise exception 'FAIL foreign owner';end if;
 update private.support_retention_policy set approved_at=now(),support_months=3,report_months=12,orphan_days=7,enabled=true;
 result:=public.nm_support_retention('claim',null,'support',ticket);job:=(result->>'id')::uuid;
 if job is null then raise exception 'FAIL claim';end if;
 if (public.nm_support_retention('claim',null,'support',ticket)->>'id')::uuid<>job then raise exception 'FAIL claim idempotence';end if;
 blocked:=false;begin update public.profiles set preferences=jsonb_build_object('fixture_reference',path) where id=other_user;exception when object_not_in_prerequisite_state then blocked:=true;end;
 if not blocked then raise exception 'FAIL concurrent reference';end if;
 blocked:=false;begin update private.support_tickets set status='new' where id=ticket;exception when object_not_in_prerequisite_state then blocked:=true;end;
 if not blocked then raise exception 'FAIL reopen while claimed';end if;
 if private.nm_retention_path_available(path) then raise exception 'FAIL storage write guard';end if;
 perform public.nm_support_retention('error',job,null,null,'PRIVATE_CONTENT_MUST_NOT_BE_STORED');
 if not exists(select 1 from private.support_retention_jobs where id=job and error_code='worker_failed' and state='claimed') then raise exception 'FAIL redacted partial error';end if;
 if not (public.nm_support_retention('object',job)->>'already_absent')::boolean then raise exception 'FAIL absent retry';end if;
 perform public.nm_support_retention('finish',job);perform public.nm_support_retention('finish',job);
 if exists(select 1 from private.support_tickets where id=ticket) then raise exception 'FAIL finalized case';end if;
 if not exists(select 1 from private.support_retention_jobs where id=job and state='done' and item_id is null and owner_id is null and object_path is null) then raise exception 'FAIL minimized audit';end if;
 if private.nm_retention_path_available(path) then raise exception 'FAIL tombstone concurrent worker';end if;
 insert into private.safety_reports(id,author,target_user,target_kind,target_id,category,description,status,created_at,updated_at)
 values(report,u,other_user,'profile',other_user,'other','synthetic fixture','resolved',now()-interval '13 months',now()-interval '13 months');
 result:=public.nm_support_retention('claim',null,'report',report);job:=(result->>'id')::uuid;
 if job is null then raise exception 'FAIL report claim';end if;
 result:=public.nm_support_retention('object',job);if result->>'path' is not null then raise exception 'FAIL reported target media selected';end if;
 perform public.nm_support_retention('finish',job);
 if not exists(select 1 from public.profiles where id=other_user) then raise exception 'FAIL report target deleted';end if;
end $$;
select 'PASS: dry-run; disabled activation; legacy blocked; holds; ownership; cross-account JSON reference; claim replay; concurrent reference/reopen/write guards; partial retry; metadata redaction; idempotent finish; path tombstone; report target preserved. All fixtures rolled back.' as result;
rollback;
