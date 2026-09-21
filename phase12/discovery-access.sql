-- Free may read its own records, never another person's publication through team tables.
grant execute on function private.discovery_allowed() to authenticated;
create policy discovery_plan_read on public.journal_entries as restrictive for select to authenticated using (created_by=(select auth.uid()) or (select private.discovery_allowed()));
create policy discovery_plan_read on public.inspirations as restrictive for select to authenticated using (created_by=(select auth.uid()) or (select private.discovery_allowed()));
create or replace function private.nm_media_access(p_kind text,p_id uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
declare owner_id uuid; workspace uuid; is_public boolean;
begin
 if auth.uid() is null then return false;end if;
 if p_kind='journal' then select created_by,workspace_id,visibility='public' into owner_id,workspace,is_public from public.journal_entries where id=p_id;
 elsif p_kind='inspiration' then select created_by,workspace_id,i.is_public into owner_id,workspace,is_public from public.inspirations i where id=p_id;
 else return false;end if;
 if owner_id is null then return false;end if;
 if exists(select 1 from public.workspace_members where workspace_id=workspace and user_id=auth.uid()) and (owner_id=auth.uid() or private.discovery_allowed()) then return true;end if;
 return is_public and private.discovery_visible(owner_id,workspace);
end $$;
