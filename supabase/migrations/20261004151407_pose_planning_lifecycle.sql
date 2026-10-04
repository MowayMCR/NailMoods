begin;
-- Keep status derived from scheduled pose actions, without changing completed history.
create function private.pose_plan_lifecycle() returns trigger language plpgsql security invoker set search_path='' as $$
declare target uuid;
begin
 target:=case when tg_op='DELETE' then old.project_id else new.project_id end;
 if tg_op='UPDATE' and new.status<>'scheduled' then
  update public.pose_reminders set enabled=false where plan_item_id=new.id and enabled;
 end if;
 update public.pose_projects p set status=case when exists(select 1 from public.pose_plan_items x where x.project_id=p.id and x.kind='pose' and x.status='scheduled') then 'planned' else 'idea' end
 where p.id=target and p.user_id=auth.uid() and p.status in ('idea','planned')
 and p.status is distinct from case when exists(select 1 from public.pose_plan_items x where x.project_id=p.id and x.kind='pose' and x.status='scheduled') then 'planned' else 'idea' end;
 return null;
end $$;
revoke all on function private.pose_plan_lifecycle() from public,anon,authenticated;
create trigger pose_plan_lifecycle after insert or update or delete on public.pose_plan_items for each row execute function private.pose_plan_lifecycle();
create function private.pose_reminder_active_plan() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.enabled and not exists(select 1 from public.pose_plan_items where id=new.plan_item_id and user_id=new.user_id and workspace_id=new.workspace_id and status='scheduled') then raise exception 'POSE_REMINDER_PLAN_NOT_SCHEDULED' using errcode='23514';end if;
 return new;
end $$;
revoke all on function private.pose_reminder_active_plan() from public,anon,authenticated;
create trigger pose_reminder_active_plan before insert or update on public.pose_reminders for each row execute function private.pose_reminder_active_plan();
insert into private.analytics_event_catalog(event_name,category,allowed_metadata_keys) values
 ('planning_created','journal',array['kind']),('reminder_created','journal',array['category']),('calendar_exported','journal',array['format'])
 on conflict(event_name) do nothing;
commit;
