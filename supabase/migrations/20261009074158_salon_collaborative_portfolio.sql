-- Additive Salon extension: workspaces, invitations, rights and media remain authoritative.
begin;
create table private.salon_settings (
 workspace_id uuid primary key references public.workspaces(id) on delete cascade,
 moderation boolean not null default true
);
alter table private.salon_settings enable row level security;
revoke all on private.salon_settings from public,anon,authenticated;
alter table private.pro_portfolio_links add column status text not null default 'published' check(status in ('pending','published','rejected','hidden'));
alter table private.pro_portfolio_links add column caption text not null default '' check(length(caption)<=1000);
alter table private.pro_portfolio_links add column position integer not null default 0;
alter table private.pro_portfolio_links add column updated_at timestamptz not null default now();
create index pro_portfolio_status on private.pro_portfolio_links(workspace_id,status,position);

create function private.salon_operational(wid uuid,actor uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.workspaces w join public.workspace_members m on m.workspace_id=w.id
 join public.workspace_entitlements e on e.workspace_id=w.id
 where w.id=wid and w.organization_type='institute' and m.user_id=actor
 and not coalesce((to_jsonb(m)->>'access_suspended')::boolean,false)
 and e.active and (e.expires_at is null or e.expires_at>now())
 and not private.nm_account_suspended(actor))
$$;
create function private.salon_public_source(k text,cid uuid,owner_id uuid) returns boolean language sql stable security definer set search_path='' as $$
 select not private.nm_blocked(owner_id) and not private.nm_account_suspended(owner_id) and
 ((k='journal' and exists(select 1 from public.journal_entries j where j.id=cid and j.created_by=owner_id and j.visibility='public'))
 or (k='inspiration' and exists(select 1 from public.inspirations i where i.id=cid and i.created_by=owner_id and i.is_public)))
$$;
create function private.salon_action(wid uuid,action text,k text,cid uuid,data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();l private.pro_portfolio_links;is_admin boolean;next_status text;
begin
 if to_regprocedure('private.nm_session_assert()') is not null then execute 'select private.nm_session_assert()';end if;
 perform private.require_feature('personal');
 perform 1 from public.workspaces where id=wid and organization_type='institute' for update;
 if not found then raise exception 'salon_unavailable';end if;
 is_admin:=exists(select 1 from public.workspace_members where workspace_id=wid and user_id=actor and role in ('owner','manager'));
 -- Authors may withdraw after leaving or expiry. Never delete the source creation.
 if action='withdraw' then
  delete from private.pro_portfolio_links where workspace_id=wid and kind=k and content_id=cid and user_id=actor;
  return jsonb_build_object('status','withdrawn');
 end if;
 if not private.salon_operational(wid,actor) then raise exception 'entitlement_inactive' using errcode='42501';end if;
 if action='settings' then
  if not is_admin then raise exception 'owner_required' using errcode='42501';end if;
  insert into private.salon_settings values(wid,coalesce((data->>'moderation')::boolean,true)) on conflict(workspace_id) do update set moderation=excluded.moderation;
  return jsonb_build_object('ok',true);
 end if;
 if action='submit' then
  if not ((k='journal' and exists(select 1 from public.journal_entries where id=cid and created_by=actor)) or (k='inspiration' and exists(select 1 from public.inspirations where id=cid and created_by=actor))) then raise exception 'owned_content_required';end if;
  next_status:=case when not private.salon_public_source(k,cid,actor) or coalesce((select moderation from private.salon_settings where workspace_id=wid),true) then 'pending' else 'published' end;
  insert into private.pro_portfolio_links(workspace_id,user_id,kind,content_id,caption,status)
  values(wid,actor,k,cid,coalesce(data->>'caption',''),next_status)
  on conflict(workspace_id,kind,content_id) do update set caption=excluded.caption,status=excluded.status,updated_at=now()
  where private.pro_portfolio_links.user_id=actor;
  if not found then raise exception 'content_owner_required';end if;
 else
  if not is_admin then raise exception 'owner_required' using errcode='42501';end if;
  select * into l from private.pro_portfolio_links where workspace_id=wid and kind=k and content_id=cid for update;
  if not found then raise exception 'contribution_unavailable';end if;
  if action='approve' then
   if not private.salon_operational(wid,l.user_id) or not private.salon_public_source(k,cid,l.user_id) then raise exception 'content_unavailable';end if;
   next_status:='published';
  elsif action='reject' then next_status:='rejected';
  elsif action='hide' then next_status:='hidden';
  elsif action='order' then
   update private.pro_portfolio_links set position=(data->>'position')::integer,updated_at=now() where workspace_id=wid and kind=k and content_id=cid;
   return jsonb_build_object('ok',true);
  else raise exception 'unknown_action';end if;
  update private.pro_portfolio_links set status=next_status,updated_at=now() where workspace_id=wid and kind=k and content_id=cid;
 end if;
 return jsonb_build_object('status',next_status);
end $$;

create function private.salon_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();base jsonb;spaces jsonb;
begin
 base:=private.pro_v2_state();
 select coalesce(jsonb_agg(s.value||jsonb_build_object(
 'operational',private.salon_operational((s.value->>'id')::uuid,actor),
 'moderation',coalesce((select moderation from private.salon_settings where workspace_id=(s.value->>'id')::uuid),true),
 'contributions',coalesce((select jsonb_agg(jsonb_build_object('id',l.content_id,'kind',l.kind,'authorId',l.user_id,'caption',l.caption,'status',l.status,'position',l.position,
 'title',case when l.kind='journal' then j.snapshot->>'title' else i.title end,
 'authorName',p.display_name,'authorHandle',case when p.discovery_visibility='everyone' then p.username end,
 'available',private.salon_public_source(l.kind,l.content_id,l.user_id)) order by l.position,l.updated_at desc)
 from private.pro_portfolio_links l join public.profiles p on p.id=l.user_id
 left join public.journal_entries j on l.kind='journal' and j.id=l.content_id
 left join public.inspirations i on l.kind='inspiration' and i.id=l.content_id
 where l.workspace_id=(s.value->>'id')::uuid and
 (l.user_id=actor or (private.salon_operational(l.workspace_id,actor) and private.salon_public_source(l.kind,l.content_id,l.user_id)))),'[]'))),'[]') into spaces
 from jsonb_array_elements(base->'spaces') s where s.value->>'organizationType'='institute';
 return jsonb_build_object('spaces',spaces,'inbox',base->'inbox','sources',
 coalesce((select jsonb_agg(x.entry) from (
 select jsonb_build_object('id',j.id,'kind','journal','title',coalesce(j.snapshot->>'title','Ma pose'),'localId',j.snapshot->>'id') entry from public.journal_entries j where j.created_by=actor and j.visibility='public'
 union all select jsonb_build_object('id',i.id,'kind','inspiration','title',i.title,'localId',i.snapshot->>'key') from public.inspirations i where i.created_by=actor and i.is_public
 ) x),'[]'));
end $$;

-- Old clients cannot bypass Salon moderation through the historical portfolio RPC.
create or replace function private.pro_v2_portfolio(p_workspace_id uuid,p_kind text,p_content_id uuid,p_product_id uuid,p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();
begin
 if to_regprocedure('private.nm_session_assert()') is not null then execute 'select private.nm_session_assert()';end if;
 if exists(select 1 from public.workspaces where id=p_workspace_id and organization_type='institute') then
  perform private.salon_action(p_workspace_id,case when coalesce(p_enabled,false) then 'submit' else 'withdraw' end,p_kind,p_content_id,'{}');return;
 end if;
 perform private.require_feature('social');
 if not exists(select 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=actor) then raise exception 'membership_required';end if;
 if not coalesce(p_enabled,false) then delete from private.pro_portfolio_links where workspace_id=p_workspace_id and kind=p_kind and content_id=p_content_id and user_id=actor;return;end if;
 if not private.salon_public_source(p_kind,p_content_id,actor) then raise exception 'owned_public_content_required';end if;
 if p_product_id is not null and not exists(select 1 from private.pro_showcase_items where id=p_product_id and workspace_id=p_workspace_id and kind='product') then raise exception 'invalid_product';end if;
 insert into private.pro_portfolio_links(workspace_id,user_id,kind,content_id,product_id) values(p_workspace_id,actor,p_kind,p_content_id,p_product_id)
 on conflict(workspace_id,kind,content_id) do update set product_id=excluded.product_id;
end $$;

create function private.salon_link_visible(wid uuid,k text,cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.pro_portfolio_links l join public.workspaces w on w.id=l.workspace_id
 join public.workspace_members m on m.workspace_id=l.workspace_id and m.user_id=l.user_id
 where l.workspace_id=wid and l.kind=k and l.content_id=cid and l.status='published'
 and private.salon_public_source(k,cid,l.user_id)
 and (w.organization_type<>'institute' or private.salon_operational(wid,l.user_id)))
$$;
create or replace function private.pro_v2_legacy_portfolio(wid uuid,k text,cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (not exists(select 1 from private.pro_showcase_details where workspace_id=wid and professional_type is not null) or private.salon_link_visible(wid,k,cid))
$$;
-- Preserve the audited public projection, including media and review guards.
do $projection$ declare def text;begin
 select pg_get_functiondef('private.pro_v2_public(text)'::regprocedure) into def;
 def:=replace(def,'where l.workspace_id=w.id and l.kind=''journal''','where private.salon_link_visible(w.id,l.kind,l.content_id) and l.workspace_id=w.id and l.kind=''journal''');
 def:=replace(def,'where l.workspace_id=w.id and l.kind=''inspiration''','where private.salon_link_visible(w.id,l.kind,l.content_id) and l.workspace_id=w.id and l.kind=''inspiration''');
 execute def;
end $projection$;
create function private.salon_public_credit(p_handle text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;rows jsonb;wid uuid;
begin
 result:=private.pro_v2_public(p_handle);if result is null then return null;end if;
 select id into wid from public.workspaces where public_handle=result->>'handle';
 select coalesce(jsonb_agg(e.value||jsonb_build_object('caption',l.caption,'position',l.position,'authorName',p.display_name,
 'authorHandle',case when p.discovery_visibility='everyone' or (p.discovery_visibility='pros' and private.effective_tier(auth.uid())='pro') then p.username end) order by l.position,l.updated_at desc),'[]') into rows
 from jsonb_array_elements(result#>'{professional,portfolio}') e
 join private.pro_portfolio_links l on l.workspace_id=wid and l.content_id::text=e.value->>'id' and l.kind=e.value->>'kind'
 join public.profiles p on p.id=l.user_id;
 if result ? 'professional' then result:=jsonb_set(result,'{professional,portfolio}',rows);end if;
 return result;
end $$;
create function public.nm_salon_state() returns jsonb language sql security invoker set search_path='' as $$select private.salon_state()$$;
create function public.nm_salon_action(p_workspace_id uuid,p_action text,p_kind text default null,p_content_id uuid default null,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.salon_action(p_workspace_id,p_action,p_kind,p_content_id,p_data)$$;
create or replace function public.nm_pro_public(p_handle text) returns jsonb language sql security invoker set search_path='' as $$select private.salon_public_credit(p_handle)$$;
revoke all on function private.salon_operational(uuid,uuid),private.salon_public_source(text,uuid,uuid),private.salon_link_visible(uuid,text,uuid) from public,anon,authenticated;
revoke all on function private.salon_action(uuid,text,text,uuid,jsonb),private.salon_state(),private.salon_public_credit(text),public.nm_salon_action(uuid,text,text,uuid,jsonb),public.nm_salon_state() from public,anon,authenticated;
grant execute on function private.salon_action(uuid,text,text,uuid,jsonb),private.salon_state(),private.salon_public_credit(text),public.nm_salon_action(uuid,text,text,uuid,jsonb),public.nm_salon_state() to authenticated;
commit;
