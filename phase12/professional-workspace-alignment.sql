-- A professional identity belongs to a workspace. One user may own or join
-- more than one professional context, so user_id must not be globally unique.
-- workspace_id remains unique and is the stable identity for a public Pro
-- profile.
begin;

alter table public.pro_profiles
  drop constraint if exists pro_profiles_user_id_key;

comment on column public.pro_profiles.user_id is
  'User managing this workspace profile. A user may manage several professional workspaces.';

commit;
