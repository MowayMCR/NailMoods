begin;
-- Return the invitation receipt without ever returning its stored hash.
do $migration$ declare def text;begin
 def:=pg_get_functiondef('public.nm_institute_access(text,uuid,jsonb)'::regprocedure);
 def:=replace(def, $q$now()+interval '7 days');
 result:=jsonb_build_object('token',token,$q$, $q$now()+interval '7 days') returning * into inv;
 result:=jsonb_build_object('id',inv.id,'token',token,$q$);
 execute def;
end $migration$;
-- A parent workspace disappearing during cascade is not a membership mutation
-- to insert against a nonexistent parent. Personal memberships are not logged.
create or replace function private.institute_membership_audit() returns trigger language plpgsql security definer set search_path='' as $$
declare w uuid:=coalesce(new.workspace_id,old.workspace_id);begin
 if exists(select 1 from public.workspaces where id=w and (kind='institute' or organization_type in ('institute','brand_team','creator_team'))) then
 insert into private.institute_audit(workspace_id,actor_id,action,target_id) values(w,auth.uid(),lower(tg_op),coalesce(new.user_id,old.user_id));
 end if;
 return coalesce(new,old);
end $$;
revoke all on function private.institute_membership_audit() from public,anon,authenticated;
commit;
