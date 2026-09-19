-- Cover foreign keys introduced or exposed by the professional workspace
-- lifecycle. These indexes also support member/profile and cleanup lookups.
begin;

create index if not exists pro_profiles_user_id_idx
  on public.pro_profiles(user_id);

create index if not exists workspace_invitations_invited_by_idx
  on public.workspace_invitations(invited_by)
  where invited_by is not null;

create index if not exists user_notifications_workspace_id_idx
  on public.user_notifications(workspace_id)
  where workspace_id is not null;

create index if not exists user_notifications_invitation_id_idx
  on public.user_notifications(invitation_id)
  where invitation_id is not null;

commit;
