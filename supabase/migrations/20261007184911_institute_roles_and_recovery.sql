begin;
-- Extend the existing team APIs rather than introduce another role system.
do $migration$ declare def text;begin
 def:=pg_get_functiondef('private.institute_action(text,uuid,uuid,uuid,text)'::regprocedure);
 -- Suspension belongs to membership, never to the commercial entitlement row.
 def:=replace(def,'from public.workspace_entitlements where workspace_id=space.id and not access_suspended','from public.workspace_entitlements where workspace_id=space.id');
 def:=replace(def,$q$insert into public.workspace_members(workspace_id,user_id,role) values(space.id,actor,'member');$q$,'perform private.institute_add_member(space.id,actor);');
 -- Ownership is a responsibility, not a personal purchase. Transfer remains
 -- possible after offer expiration, with confirmed adult accounts only.
 def:=replace(def,$q$if not exists(select 1 from public.profiles where id=p_target_user_id and private.effective_tier(id)='pro') then raise exception 'new_owner_pro_required'; end if;$q$,$q$if not exists(select 1 from auth.users u join public.user_consents c on c.user_id=u.id where u.id=p_target_user_id and u.email_confirmed_at is not null and c.adult_confirmed_at is not null) or private.nm_account_suspended(p_target_user_id) then raise exception 'confirmed_account_required';end if;$q$);
 def:=replace(def,'update public.workspaces set owner_user_id=p_target_user_id where id=space.id;','update public.workspaces set owner_user_id=p_target_user_id where id=space.id; update public.workspace_entitlements set seat_limit=seat_limit where workspace_id=space.id;');
 execute def;
 def:=pg_get_functiondef('private.pro_v2_team(uuid,text,jsonb)'::regprocedure);
 def:=replace(def,'lim<1 or lim>100 or lim<(select count(*) from public.workspace_members where workspace_id=space.id)','lim<1 or lim>100');
 execute def;
end $migration$;
commit;
