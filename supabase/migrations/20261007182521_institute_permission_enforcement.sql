begin;
create function private.nm_workspace_operational(w uuid,u uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.nm_session_assert(); select exists(select 1 from public.workspaces s join public.workspace_members m on m.workspace_id=s.id
 where s.id=w and m.user_id=u and not m.access_suspended and
 (coalesce(s.organization_type,'solo')='solo' or exists(select 1 from public.workspace_entitlements e where e.workspace_id=w and e.active and (e.expires_at is null or e.expires_at>now()))))
$$;
revoke all on function private.nm_workspace_operational(uuid,uuid) from public,anon;
grant execute on function private.nm_workspace_operational(uuid,uuid) to authenticated;
do $migration$ declare def text;body text;arg text;begin
 select pg_get_functiondef(oid),prosrc,proargnames[1] into def,body,arg from pg_proc where oid='private.is_workspace_member(uuid)'::regprocedure;
 execute replace(def,'AS $function$'||body||'$function$', 'AS $function$select private.nm_session_assert(); select private.nm_workspace_operational('||quote_ident(arg)||',auth.uid())$function$');
end $migration$;
-- Management lists remain available after expiration; protected content does not.
do $migration$ declare def text;t record;begin
 if to_regprocedure('private.institute_state(uuid)') is not null then
 def:=pg_get_functiondef('private.institute_state(uuid)'::regprocedure);
 def:=replace(def,'not private.is_workspace_member(space.id)','not exists(select 1 from public.workspace_members where workspace_id=space.id and user_id=actor)');execute def;
 end if;
 def:=pg_get_functiondef('private.pro_v2_can_edit(uuid)'::regprocedure);
 def:=replace(def,'m.user_id=auth.uid()','m.user_id=auth.uid() and private.nm_workspace_operational(wid,auth.uid())');execute def;
 def:=pg_get_functiondef('private.pro_v2_state()'::regprocedure);
 def:=replace(def,$q$case when m.role in ('owner','manager') then 'owner' else 'organization' end$q$,$q$case when not private.nm_workspace_operational(w.id,actor) then 'public' when m.role in ('owner','manager') then 'owner' else 'organization' end$q$);
 def:=replace(def,$q$(m.role in ('owner','manager') or i.visibility in ('organization','public'))$q$,$q$(i.visibility='public' or (private.nm_workspace_operational(w.id,actor) and (m.role in ('owner','manager') or i.visibility='organization')))$q$);execute def;
 for t in select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relrowsecurity and c.relname not in ('workspace_members','workspace_entitlements','workspace_invitations','user_notifications','pro_profiles') and exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attname='workspace_id' and not a.attisdropped) loop
 execute format('create policy nm_institute_operational on public.%I as restrictive for all to authenticated using (not exists(select 1 from public.workspaces w where w.id=workspace_id and w.organization_type in (''institute'',''brand_team'',''creator_team'')) or private.nm_workspace_operational(workspace_id,auth.uid())) with check (not exists(select 1 from public.workspaces w where w.id=workspace_id and w.organization_type in (''institute'',''brand_team'',''creator_team'')) or private.nm_workspace_operational(workspace_id,auth.uid()))',t.relname);
 end loop;
end $migration$;
commit;
