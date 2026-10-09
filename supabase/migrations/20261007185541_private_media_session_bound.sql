begin;
-- Signed capabilities outlive Auth sessions. Use authenticated downloads instead.
-- These official Storage operation helpers must be present before activation.
create policy nm_no_private_signed_capabilities on storage.objects as restrictive for all to authenticated
 using(bucket_id not in ('nailmoods-private','nailmoods-pro','nailmoods-public') or not storage.allow_any_operation(array['object.sign','object.sign_many','object.sign_upload_url']))
 with check(bucket_id not in ('nailmoods-private','nailmoods-pro','nailmoods-public') or not storage.allow_any_operation(array['object.sign','object.sign_many','object.sign_upload_url']));
create or replace function private.nailmoods_workspace_member(p_workspace text,p_user uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.nm_session_assert(); select exists(select 1 from public.workspaces w where w.id::text=p_workspace and private.nm_workspace_operational(w.id,p_user))
$$;
do $migration$ declare def text;begin
 def:=pg_get_functiondef('private.pro_v2_state()'::regprocedure);
 def:=replace(def,'select count(*) from public.workspace_members a where a.workspace_id=w.id','select count(*) from public.workspace_members a where a.workspace_id=w.id and not a.access_suspended');
 def:=replace(def,'select count(*)::int from public.workspace_members a where a.workspace_id=w.id','select count(*)::int from public.workspace_members a where a.workspace_id=w.id and not a.access_suspended');
 def:=replace(def,$q$'id',a.user_id,'name',ap.display_name$q$,$q$'id',a.user_id,'accessSuspended',a.access_suspended,'name',ap.display_name$q$);execute def;
end $migration$;
commit;
