-- P0.1: expose only the authenticated account's owned Storage paths to
-- account-delete.  The actual metadata table stays in the private storage
-- schema; the public wrapper is authenticated-only and delegates identity
-- checking to the existing deletion gate.

create or replace function private.nm_account_deletion_objects(p_confirmation text)
returns table(bucket text, object_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := private.nm_account_deletion_check(p_confirmation);

  return query
  select o.bucket_id::text, o.name::text
  from storage.objects o
  where o.owner_id = v_user_id::text;
end;
$$;

revoke all on function private.nm_account_deletion_objects(text) from public;
revoke all on function private.nm_account_deletion_objects(text) from anon;
grant execute on function private.nm_account_deletion_objects(text) to authenticated;

create or replace function public.nm_account_deletion_objects(p_confirmation text)
returns table(bucket text, object_path text)
language sql
security invoker
set search_path = ''
as $$
  select * from private.nm_account_deletion_objects(p_confirmation);
$$;

revoke all on function public.nm_account_deletion_objects(text) from public;
revoke all on function public.nm_account_deletion_objects(text) from anon;
grant execute on function public.nm_account_deletion_objects(text) to authenticated;