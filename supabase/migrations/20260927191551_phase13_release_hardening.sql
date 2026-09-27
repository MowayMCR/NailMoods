-- Align the already-created Recette table with the release schema.
revoke all on public.pro_creations from anon, authenticated;
grant select,insert,update,delete on public.pro_creations to authenticated;
alter table public.pro_creations add constraint pro_creations_design_size_check check (octet_length(design::text) <= 250000);

create or replace function private.pro_creation_author_allowed(p_owner_id uuid, p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() = p_owner_id
    and private.effective_tier(p_owner_id) = 'pro'
    and not private.nm_account_suspended(p_owner_id)
    and exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = p_workspace_id
        and wm.user_id = p_owner_id
        and wm.role in ('owner', 'manager', 'creator')
    );
$$;

revoke all on function private.pro_creation_author_allowed(uuid,uuid) from public, anon;
grant execute on function private.pro_creation_author_allowed(uuid,uuid) to authenticated;

