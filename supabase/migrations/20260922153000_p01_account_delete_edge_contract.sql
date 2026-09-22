-- P0.1: public authenticated wrappers for the account-delete Edge Function.
-- The private functions keep the authorization and deletion authority; the
-- Edge Function only removes Storage objects through the Storage API.

create or replace function public.nm_account_deletion_check(p_confirmation text)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.nm_account_deletion_check(p_confirmation)
$$;

revoke all on function public.nm_account_deletion_check(text) from public, anon;
grant execute on function public.nm_account_deletion_check(text) to authenticated;

create or replace function private.nm_account_deletion_finalize(p_confirmation text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := private.nm_account_deletion_check(p_confirmation);
begin
  -- Storage has already been removed through the Storage API. Refuse to delete
  -- the Auth user if any owned object is still present.
  if exists (select 1 from storage.objects where owner_id = me::text) then
    raise exception 'storage_cleanup_required';
  end if;

  delete from auth.sessions where user_id = me;
  delete from auth.users where id = me;

  -- Conversations with no remaining participant are no longer useful.
  delete from public.conversations c
  where c.created_by is null
    and not exists (
      select 1 from public.conversation_members m where m.conversation_id = c.id
    );
end;
$$;

revoke all on function private.nm_account_deletion_finalize(text) from public, anon;
grant execute on function private.nm_account_deletion_finalize(text) to authenticated;

create or replace function public.nm_account_deletion_finalize(p_confirmation text)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.nm_account_deletion_finalize(p_confirmation)
$$;

revoke all on function public.nm_account_deletion_finalize(text) from public, anon;
grant execute on function public.nm_account_deletion_finalize(text) to authenticated;
