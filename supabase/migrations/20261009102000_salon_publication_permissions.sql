begin;
create table private.salon_member_permissions (
 workspace_id uuid not null,
 user_id uuid not null,
 can_publish boolean not null default true,
 primary key(workspace_id,user_id),
 foreign key(workspace_id,user_id) references public.workspace_members(workspace_id,user_id) on delete cascade
);
alter table private.salon_member_permissions enable row level security;
revoke all on private.salon_member_permissions from public,anon,authenticated;
alter function private.salon_action(uuid,text,text,uuid,jsonb) rename to salon_action_core;
revoke all on function private.salon_action_core(uuid,text,text,uuid,jsonb) from public,anon,authenticated;
create function private.salon_action(wid uuid,action text,k text,cid uuid,data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();target uuid;
begin
 if action='member_permission' then
  if to_regprocedure('private.nm_session_assert()') is not null then execute 'select private.nm_session_assert()';end if;
  perform private.require_feature('personal');
  perform 1 from public.workspaces where id=wid and organization_type='institute' for update;
  if not private.salon_operational(wid,actor) or not exists(select 1 from public.workspace_members where workspace_id=wid and user_id=actor and role in ('owner','manager')) then raise exception 'owner_required' using errcode='42501';end if;
  target:=(data->>'userId')::uuid;
  if not exists(select 1 from public.workspace_members where workspace_id=wid and user_id=target and role<>'owner') then raise exception 'member_unavailable';end if;
  insert into private.salon_member_permissions values(wid,target,coalesce((data->>'canPublish')::boolean,false)) on conflict(workspace_id,user_id) do update set can_publish=excluded.can_publish;
  return jsonb_build_object('ok',true);
 end if;
 if action='submit' and exists(select 1 from private.salon_member_permissions where workspace_id=wid and user_id=actor and not can_publish) then raise exception 'publication_not_allowed' using errcode='42501';end if;
 return private.salon_action_core(wid,action,k,cid,data);
end $$;
alter function private.salon_state() rename to salon_state_core;
revoke all on function private.salon_state_core() from public,anon,authenticated;
create function private.salon_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;spaces jsonb;actor uuid:=private.require_adult_account();
begin
 result:=private.salon_state_core();
 select coalesce(jsonb_agg(s.value||jsonb_build_object(
 'canPublish',coalesce((select can_publish from private.salon_member_permissions where workspace_id=(s.value->>'id')::uuid and user_id=actor),true),
 'members',coalesce((select jsonb_agg(m.value||jsonb_build_object('canPublish',coalesce(p.can_publish,true))) from jsonb_array_elements(s.value->'members') m left join private.salon_member_permissions p on p.workspace_id=(s.value->>'id')::uuid and p.user_id=(m.value->>'id')::uuid),'[]'))),'[]') into spaces from jsonb_array_elements(result->'spaces') s;
 return jsonb_set(result,'{spaces}',spaces);
end $$;
revoke all on function private.salon_action(uuid,text,text,uuid,jsonb),private.salon_state() from public,anon,authenticated;
grant execute on function private.salon_action(uuid,text,text,uuid,jsonb),private.salon_state() to authenticated;
commit;
