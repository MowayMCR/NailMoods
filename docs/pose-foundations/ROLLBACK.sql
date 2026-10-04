-- Stop the feature integration first. This rollback only accepts an empty new schema.
-- Never drop real project/grant data: export it and keep the additive tables instead.
begin;
do $$begin
 if exists(select 1 from public.pose_projects) or exists(select 1 from private.addon_entitlements) or exists(select 1 from private.addon_internal_accounts) then
  raise exception 'ROLLBACK_REFUSED_NONEMPTY_FOUNDATIONS_EXPORT_REQUIRED';
 end if;
end$$;
drop function public.nm_ai_plus_access();
drop function private.ai_plus_access();
drop table public.pose_reminders;
drop table public.pose_plan_items;
drop table public.pose_projects;
drop function private.pose_guard();
drop function private.pose_owner(uuid,uuid);
drop table private.addon_internal_accounts;
drop table private.addon_feature_flags;
drop table private.addon_entitlements;
commit;
