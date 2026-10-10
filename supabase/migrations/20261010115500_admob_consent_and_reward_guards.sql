begin;
-- No switch is enabled by this migration. Existing test-only defaults are retained.
create or replace function private.nm_legal_versions() returns table(privacy_version text,terms_version text)
language sql immutable set search_path='' as $$select '0.9-beta'::text,'0.6-beta'::text$$;

create function private.ad_institute_active(actor uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.workspaces w join public.workspace_entitlements e on e.workspace_id=w.id
 where w.organization_type='institute' and e.active and (e.expires_at is null or e.expires_at>now())
 and (w.owner_user_id=actor or exists(select 1 from public.workspace_members m where m.workspace_id=w.id
 and m.user_id=actor and not coalesce((to_jsonb(m)->>'access_suspended')::boolean,false))))
$$;
create function private.ad_user_eligible(actor uuid) returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(private.effective_tier(actor)='free' and private.nm_age_band(actor)='18_plus'
 and not private.nm_account_suspended(actor) and not private.ad_institute_active(actor)
 and exists(select 1 from auth.users where id=actor and email_confirmed_at is not null)
 and exists(select 1 from public.user_consents c cross join private.nm_legal_versions() v
 where c.user_id=actor and c.terms_version=v.terms_version and c.terms_accepted_at is not null),false)
$$;
revoke all on function private.ad_institute_active(uuid),private.ad_user_eligible(uuid) from public,anon,authenticated;

create or replace function private.ad_state(platform_value text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();cfg private.ad_config;
begin
 if to_regprocedure('private.nm_session_assert()') is not null then execute 'select private.nm_session_assert()';end if;
 perform private.require_feature('personal');
 select * into cfg from private.ad_config where platform=platform_value;
 return jsonb_build_object('rights',jsonb_build_object('effectiveTier',private.effective_tier(actor),'instituteActive',private.ad_institute_active(actor)),
 'config',jsonb_build_object('enabled',coalesce(cfg.enabled,false) and private.ad_user_eligible(actor),'testOnly',coalesce(cfg.test_only,true),'dailyLimit',coalesce(cfg.daily_limit,0)));
end $$;

-- Tickets never grant an application benefit. Only a verified SSV callback can confirm one.
create function private.ad_reward_ticket(platform_value text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();cfg private.ad_config;r private.ad_reward_tickets;
begin
 perform private.ad_state(platform_value);
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 select * into cfg from private.ad_config where platform=platform_value;
 if not found or not cfg.enabled or cfg.test_only or not private.ad_user_eligible(actor) then raise exception 'ads_unavailable' using errcode='42501';end if;
 if (select count(*) from private.ad_reward_tickets where user_id=actor and confirmed_at>=date_trunc('day',now(),'UTC'))>=cfg.daily_limit then raise exception 'ad_daily_limit';end if;
 -- Reuse a pending ticket instead of allowing unbounded reservations.
 select * into r from private.ad_reward_tickets where user_id=actor and platform=platform_value and confirmed_at is null and expires_at>now() order by created_at desc limit 1;
 if not found then insert into private.ad_reward_tickets(user_id,platform) values(actor,platform_value) returning * into r;end if;
 return jsonb_build_object('ticket',r.id,'expiresAt',r.expires_at);
end $$;
create function public.nm_ad_reward_ticket(p_platform text) returns jsonb language sql security invoker set search_path='' as $$select private.ad_reward_ticket(p_platform)$$;
create function private.ad_reward_status(ticket uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();r private.ad_reward_tickets;
begin
 if to_regprocedure('private.nm_session_assert()') is not null then execute 'select private.nm_session_assert()';end if;
 perform private.require_feature('personal');
 select * into r from private.ad_reward_tickets where id=ticket and user_id=actor;
 if not found then return null;end if;
 return jsonb_build_object('confirmed',r.confirmed_at is not null,'used',r.used_at is not null,'expired',r.expires_at<=now());
end $$;
create function public.nm_ad_reward_status(p_ticket uuid) returns jsonb language sql security invoker set search_path='' as $$select private.ad_reward_status(p_ticket)$$;
revoke all on function private.ad_reward_ticket(text),public.nm_ad_reward_ticket(text),private.ad_reward_status(uuid),public.nm_ad_reward_status(uuid) from public,anon,authenticated;
grant execute on function private.ad_reward_ticket(text),public.nm_ad_reward_ticket(text),private.ad_reward_status(uuid),public.nm_ad_reward_status(uuid) to authenticated;

create or replace function private.ad_confirm_reward(ticket uuid,tx text) returns boolean language plpgsql security definer set search_path='' as $$
declare r private.ad_reward_tickets;cfg private.ad_config;
begin
 if tx is null or length(tx) not between 1 and 200 then return false;end if;
 select * into r from private.ad_reward_tickets where id=ticket for update;
 if not found then return false;end if;
 -- Acknowledge Google's retry without applying the reward twice, even after expiry.
 if r.confirmed_at is not null then return r.transaction_id=tx;end if;
 if r.expires_at<=now() then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended(r.user_id::text,0));
 select * into cfg from private.ad_config where platform=r.platform;
 if not found or not cfg.enabled or cfg.test_only or not private.ad_user_eligible(r.user_id) then return false;end if;
 if (select count(*) from private.ad_reward_tickets where user_id=r.user_id and confirmed_at>=date_trunc('day',now(),'UTC'))>=cfg.daily_limit then return false;end if;
 begin
  update private.ad_reward_tickets set transaction_id=tx,confirmed_at=now() where id=ticket;
 exception when unique_violation then return false;
 end;
 return true;
end $$;
-- Preserve server-only confirmation, private tables with RLS, and existing role grants.
commit;
