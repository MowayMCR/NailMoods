begin;
create function private.billing_entitlement_state() returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid()) then raise exception 'authentication_required' using errcode='42501';end if;
 return private.billing_entitlement_for_user(auth.uid());
end $$;
revoke all on function private.billing_entitlement_state() from public,anon;
grant execute on function private.billing_entitlement_state() to authenticated;
create or replace function public.billing_entitlement_state() returns jsonb language sql security invoker set search_path='' as $$select private.billing_entitlement_state()$$;
revoke all on function public.billing_entitlement_state() from public,anon;
grant execute on function public.billing_entitlement_state() to authenticated;
commit;
