create or replace function public.nm_security_fixture(p_users uuid[],p_action text default 'prepare',p_workspace uuid default null,p_invite uuid default null) returns void language plpgsql security definer set search_path='' as $$
begin
 if cardinality(p_users)<1 or exists(select 1 from unnest(p_users) u where not exists(select 1 from auth.users a where a.id=u and a.email like 'security-%@nailmoods-recette.invalid')) then raise exception 'test_accounts_only';end if;
 if p_action='prepare' then
 update public.user_consents set adult_confirmed_at=now() where user_id=any(p_users);
 insert into private.account_entitlements(user_id,tier,status,source,starts_at) values(p_users[1],'pro','active','admin',now()) on conflict(user_id) do update set tier='pro',status='active',source='admin',expires_at=null;
 perform private.google_play_refresh_profile(p_users[1]);
 elsif p_action='enable' then update private.nm_session_settings set enabled=true where singleton;
 elsif p_action='disable' then update private.nm_session_settings set enabled=false where singleton;
 else
 if not exists(select 1 from public.workspaces where id=p_workspace and owner_user_id=p_users[1]) then raise exception 'test_workspace_only';end if;
 if p_action='quota' then update public.workspace_entitlements set seat_limit=2,granted_tier='pro',active=true,expires_at=null where workspace_id=p_workspace;
 elsif p_action='expire' then update public.workspace_entitlements set expires_at=now()-interval '1 second' where workspace_id=p_workspace;
 elsif p_action='expire_invite' then update private.institute_email_invites set expires_at=now()-interval '1 second' where id=p_invite and workspace_id=p_workspace;
 elsif p_action='cleanup' then delete from public.workspaces where id=p_workspace;
 else raise exception 'invalid_test_action';end if;
 end if;
end $$;
revoke all on function public.nm_security_fixture(uuid[],text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.nm_security_fixture(uuid[],text,uuid,uuid) to service_role;
