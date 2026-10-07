begin;
-- Retire replaced refresh sessions as well as blocking still-unexpired JWTs.
create or replace function private.nm_session_insert() returns trigger language plpgsql security definer set search_path='' as $$
declare current_id uuid;begin
 insert into private.nm_active_sessions values(new.user_id,new.id,coalesce(new.created_at,clock_timestamp()))
 on conflict(user_id) do update set session_id=excluded.session_id,started_at=excluded.started_at
 where (excluded.started_at,excluded.session_id)>(nm_active_sessions.started_at,nm_active_sessions.session_id);
 if (select enabled from private.nm_session_settings where singleton) then
 select session_id into current_id from private.nm_active_sessions where user_id=new.user_id;
 delete from auth.sessions where user_id=new.user_id and id<>current_id;
 end if;
 return new;
end $$;
revoke all on function private.nm_session_insert() from public,anon,authenticated;
create or replace function private.nm_workspace_operational(w uuid,u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.nm_session_assert(); select exists(select 1 from public.workspaces s join public.workspace_members m on m.workspace_id=s.id
 where s.id=w and m.user_id=u and not m.access_suspended and
 ((s.kind<>'institute' and coalesce(s.organization_type,'solo')='solo') or exists(select 1 from public.workspace_entitlements e where e.workspace_id=w and e.active and (e.expires_at is null or e.expires_at>now()))))
$$;
-- Include legacy institute workspaces whose organization_type predates Pro V2.
do $migration$ declare t record;begin
 for t in select tablename from pg_policies where schemaname='public' and policyname='nm_institute_operational' loop
 execute format('alter policy nm_institute_operational on public.%I using (not exists(select 1 from public.workspaces w where w.id=workspace_id and (w.kind=''institute'' or w.organization_type in (''institute'',''brand_team'',''creator_team''))) or private.nm_workspace_operational(workspace_id,auth.uid())) with check (not exists(select 1 from public.workspaces w where w.id=workspace_id and (w.kind=''institute'' or w.organization_type in (''institute'',''brand_team'',''creator_team''))) or private.nm_workspace_operational(workspace_id,auth.uid()))',t.tablename);
 end loop;
end $migration$;
commit;
