begin;
create table private.ad_config(platform text primary key check(platform in ('ios','android')),enabled boolean not null default false,test_only boolean not null default true,daily_limit integer not null default 1 check(daily_limit between 0 and 3));
insert into private.ad_config(platform) values('ios'),('android');
create table private.ad_reward_tickets(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,platform text not null references private.ad_config,created_at timestamptz not null default now(),expires_at timestamptz not null default now()+interval '30 minutes',transaction_id text unique,confirmed_at timestamptz,used_at timestamptz);
create index ad_reward_user_date on private.ad_reward_tickets(user_id,created_at);
alter table private.ad_config enable row level security;
alter table private.ad_reward_tickets enable row level security;
revoke all on private.ad_config,private.ad_reward_tickets from public,anon,authenticated;
grant select,insert,update,delete on private.ad_config,private.ad_reward_tickets to service_role;
create function private.ad_state(platform_value text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();tier text;cfg private.ad_config;
begin
 if to_regprocedure('private.nm_session_assert()') is not null then execute 'select private.nm_session_assert()';end if;
 perform private.require_feature('personal');tier:=private.effective_tier(actor);
 select * into cfg from private.ad_config where platform=platform_value;
 return jsonb_build_object('rights',jsonb_build_object('effectiveTier',tier),'config',jsonb_build_object('enabled',coalesce(cfg.enabled,false) and tier='free','testOnly',coalesce(cfg.test_only,true),'dailyLimit',coalesce(cfg.daily_limit,0)));
end $$;
create function public.nm_ad_state(p_platform text) returns jsonb language sql security invoker set search_path='' as $$select private.ad_state(p_platform)$$;
revoke all on function private.ad_state(text),public.nm_ad_state(text) from public,anon,authenticated;
grant execute on function private.ad_state(text),public.nm_ad_state(text) to authenticated;
-- This ledger API is server-only. A native reward event never confirms a ticket.
create function private.ad_confirm_reward(ticket uuid,tx text) returns boolean language plpgsql security definer set search_path='' as $$
declare r private.ad_reward_tickets;cfg private.ad_config;
begin
 select * into r from private.ad_reward_tickets where id=ticket for update;
 if not found or r.expires_at<=now() or r.confirmed_at is not null or length(tx) not between 1 and 200 then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended(r.user_id::text,0));
 select * into cfg from private.ad_config where platform=r.platform;
 if not cfg.enabled or cfg.test_only or private.effective_tier(r.user_id)<>'free' then return false;end if;
 if (select count(*) from private.ad_reward_tickets where user_id=r.user_id and confirmed_at>=date_trunc('day',now()))>=cfg.daily_limit then return false;end if;
 update private.ad_reward_tickets set transaction_id=tx,confirmed_at=now() where id=ticket;return true;
end $$;
create function public.nm_ad_confirm_reward(p_ticket uuid,p_transaction_id text) returns boolean language sql security invoker set search_path='' as $$select private.ad_confirm_reward(p_ticket,p_transaction_id)$$;
revoke all on function private.ad_confirm_reward(uuid,text),public.nm_ad_confirm_reward(uuid,text) from public,anon,authenticated;
grant execute on function private.ad_confirm_reward(uuid,text),public.nm_ad_confirm_reward(uuid,text) to service_role;
commit;
