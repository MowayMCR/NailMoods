-- P0.3: the staff interface reads the decision history through this
-- authenticated-only public wrapper. The underlying table remains private.

revoke all on function private.nm_support_history(text,uuid) from public;
revoke all on function private.nm_support_history(text,uuid) from anon;
grant execute on function private.nm_support_history(text,uuid) to authenticated;

create or replace function public.nm_support_history(p_kind text,p_id uuid)
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select private.nm_support_history(p_kind,p_id);
$$;

revoke all on function public.nm_support_history(text,uuid) from public;
revoke all on function public.nm_support_history(text,uuid) from anon;
grant execute on function public.nm_support_history(text,uuid) to authenticated;