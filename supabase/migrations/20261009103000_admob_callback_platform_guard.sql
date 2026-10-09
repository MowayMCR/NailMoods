begin;
-- A signed iOS reward cannot redeem an Android ticket, or the inverse.
create function private.ad_confirm_platform_reward(ticket uuid,tx text,platform_value text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if platform_value not in ('ios','android') or not exists(select 1 from private.ad_reward_tickets where id=ticket and platform=platform_value) then return false;end if;
 return private.ad_confirm_reward(ticket,tx);
end $$;
create function public.nm_ad_confirm_platform_reward(p_ticket uuid,p_transaction_id text,p_platform text) returns boolean language sql security invoker set search_path='' as $$select private.ad_confirm_platform_reward(p_ticket,p_transaction_id,p_platform)$$;
revoke all on function private.ad_confirm_reward(uuid,text),public.nm_ad_confirm_reward(uuid,text) from service_role;
revoke all on function private.ad_confirm_platform_reward(uuid,text,text),public.nm_ad_confirm_platform_reward(uuid,text,text) from public,anon,authenticated;
grant execute on function private.ad_confirm_platform_reward(uuid,text,text),public.nm_ad_confirm_platform_reward(uuid,text,text) to service_role;
commit;
