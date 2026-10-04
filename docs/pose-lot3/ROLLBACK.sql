-- Additive rollback: keeps every project, planning item, reminder and preference.
begin;
drop trigger if exists pose_plan_lifecycle on public.pose_plan_items;
drop function if exists private.pose_plan_lifecycle();
drop trigger if exists pose_reminder_active_plan on public.pose_reminders;
drop function if exists private.pose_reminder_active_plan();
-- Analytics catalog rows are retained so recorded history remains interpretable.
commit;
