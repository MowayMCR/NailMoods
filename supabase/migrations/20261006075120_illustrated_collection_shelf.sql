begin;
-- One consent setting; products and realised poses stay in their existing tables.
create table private.shelf_settings (
 user_id uuid primary key references public.profiles(id) on delete cascade,
 workspace_id uuid references public.workspaces(id) on delete cascade,
 visibility text not null default 'hidden' check(visibility in ('hidden','all','public_poses','favorites')),
 updated_at timestamptz not null default now()
);
alter table private.shelf_settings enable row level security;
revoke all on private.shelf_settings from public,anon,authenticated;
create index shelf_settings_workspace_idx on private.shelf_settings(workspace_id);
create index if not exists shelf_public_poses_idx on public.journal_entries(created_by,workspace_id,performed_on desc) where visibility='public';

create function private.shelf_settings_action(p_action text,p_workspace_id uuid,p_visibility text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account(); result jsonb;
begin
 perform private.require_feature('pro');
 if p_action='save' then
  if p_visibility not in ('hidden','all','public_poses','favorites') or p_visibility is null then raise exception 'invalid_visibility';end if;
  if p_workspace_id is not null and not exists(select 1 from public.workspaces w join public.workspace_members m on m.workspace_id=w.id and m.user_id=actor and m.role='owner' where w.id=p_workspace_id and w.owner_user_id=actor) then raise exception 'owned_workspace_required' using errcode='42501';end if;
  if p_visibility<>'hidden' and p_workspace_id is null then raise exception 'workspace_required';end if;
  insert into private.shelf_settings(user_id,workspace_id,visibility) values(actor,p_workspace_id,p_visibility) on conflict(user_id) do update set workspace_id=excluded.workspace_id,visibility=excluded.visibility,updated_at=now();
 elsif p_action<>'get' then raise exception 'invalid_action';end if;
 return jsonb_build_object('visibility',coalesce((select visibility from private.shelf_settings where user_id=actor),'hidden'),'workspaceId',(select workspace_id from private.shelf_settings where user_id=actor),
 'workspaces',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'count',(select count(*) from public.user_products p where p.workspace_id=w.id and p.created_by=actor)) order by w.created_at) from public.workspaces w join public.workspace_members m on m.workspace_id=w.id and m.user_id=actor and m.role='owner' where w.owner_user_id=actor),'[]'));
end $$;

-- Explicit allowlist. Personal notes, source URLs, photos and private identifiers are excluded.
create function private.shelf_product(p public.user_products) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_strip_nulls(jsonb_build_object('id',p.id,'localId',p.metadata#>>'{nailmoods,id}','catalogId',p.catalog_id,'brand',p.brand,'name',p.shade_name,'reference',p.reference,'collection',p.product_range,'barcode',p.barcode,
 'type',coalesce(p.metadata#>>'{nailmoods,type}','Vernis'),
 'color',case when p.metadata#>>'{nailmoods,colorSource}'='palette' and coalesce(p.metadata#>>'{nailmoods,catalogColorValidated}','false')<>'true' and coalesce(p.metadata#>>'{nailmoods,confirmedColor}','') !~ '^#[0-9a-fA-F]{6}$' and coalesce(p.metadata#>>'{nailmoods,shade}','') !~ '^#[0-9a-fA-F]{6}$' then null
 when p.metadata#>>'{nailmoods,catalogColorValidated}'='true' and p.metadata#>>'{nailmoods,catalogColor}' ~ '^#[0-9a-fA-F]{6}$' then p.metadata#>>'{nailmoods,catalogColor}'
 when p.hex ~ '^#[0-9a-fA-F]{6}$' then p.hex else null end,
 'family',p.metadata#>>'{nailmoods,family}','finish',p.metadata#>>'{nailmoods,finish}','finishDetail',p.metadata#>>'{nailmoods,finishDetail}','effect',p.metadata#>>'{nailmoods,effect}','createdAt',p.created_at))
$$;
create function private.shelf_product_matches(p jsonb,j jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce((j->>'conceptual')::text,'false')<>'true' and (
 (nullif(j->>'id','') is not null and (j->>'id'=p->>'localId' or j->>'id'=p->>'id'))
 or (nullif(p->>'catalogId','') is not null and p->>'catalogId'=coalesce(j->>'catalogId',j#>>'{provenance,catalogId}'))
 or (nullif(p->>'brand','') is not null and nullif(p->>'reference','') is not null and lower(trim(p->>'brand'))=lower(trim(j->>'brand')) and lower(trim(p->>'reference'))=lower(trim(j->>'reference')) and lower(coalesce(p->>'collection',''))=lower(coalesce(j->>'collection',''))))
$$;

create function private.shelf_public(p_handle text) returns jsonb language plpgsql security definer set search_path='' as $$
declare base jsonb; actor uuid; setting private.shelf_settings; products jsonb; poses jsonb; rows jsonb; wid uuid;
begin
 perform private.require_feature('discovery');
 base:=private.pro_v2_public(p_handle);
 if base is null then return null;end if;
 select id into actor from public.profiles where username=base->>'handle';
 if actor is null then select owner_user_id,id into actor,wid from public.workspaces where public_handle=base->>'handle';end if;
 if actor is null or private.effective_tier(actor)<>'pro' or private.nm_blocked(actor) then return null;end if;
 select * into setting from private.shelf_settings where user_id=actor;
 if not found or setting.visibility='hidden' or not exists(select 1 from public.workspaces where id=setting.workspace_id and owner_user_id=actor) then return jsonb_build_object('visibility','hidden','products','[]'::jsonb,'poses','[]'::jsonb);end if;
 -- Exactly the public profile/portfolio's journal entries; never count inspirations as use.
 rows:=coalesce(base#>'{professional,portfolio}',base->'journal','[]');
 select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'title',coalesce(j.snapshot->>'title','Ma pose'),'date',j.performed_on,'preview',private.discovery_preview(j.snapshot->'idea'),'products',coalesce(j.snapshot->'products','[]')) order by j.performed_on desc),'[]') into poses
 from public.journal_entries j where j.created_by=actor and j.workspace_id=setting.workspace_id and j.visibility='public'
 and exists(select 1 from jsonb_array_elements(rows) r where r->>'id'=j.id::text and coalesce(r->>'kind','journal')='journal')
 and not exists(select 1 from private.publication_reviews r where r.kind='journal' and r.entity_id=j.id and r.status in ('pending','rejected'));
 with candidates as (
  select private.shelf_product(p) product,p.metadata#>>'{nailmoods,fav}' fav from public.user_products p
  where p.workspace_id=setting.workspace_id and p.created_by=actor
 ), linked as (
  select c.product,c.fav,coalesce((select jsonb_agg(pose-'products') from jsonb_array_elements(poses) pose where exists(select 1 from jsonb_array_elements(case when jsonb_typeof(pose->'products')='array' then pose->'products' else '[]' end) jp where private.shelf_product_matches(c.product,jp))),'[]') links from candidates c
 ) select coalesce(jsonb_agg((product-'localId')||jsonb_build_object('shelfUsage',jsonb_build_object('count',jsonb_array_length(links),'last',links#>>'{0,date}','poses',links)) order by product->>'createdAt' desc),'[]') into products from linked
 where setting.visibility='all' or setting.visibility='favorites' and fav='true' or setting.visibility='public_poses' and jsonb_array_length(links)>0;
 -- Pose -> products is derived from the same allowlisted products. No second inventory.
 select coalesce(jsonb_agg((pose-'products')||jsonb_build_object('productIds',coalesce((select jsonb_agg(p->>'id') from jsonb_array_elements(products) p where exists(select 1 from jsonb_array_elements(p#>'{shelfUsage,poses}') link where link->>'id'=pose->>'id')),'[]'))),'[]') into poses from jsonb_array_elements(poses) pose;
 return jsonb_build_object('visibility',setting.visibility,'products',products,'poses',poses);
end $$;

create function private.shelf_discover(p_query text,p_offset integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;candidate record;shelf jsonb;base jsonb;items jsonb:='[]';n integer:=0;
begin
 perform private.require_feature('discovery');
 if length(coalesce(p_query,''))>80 or p_offset<0 or p_offset>100000 then raise exception 'invalid_query';end if;
 for candidate in
  select h.handle,h.owner from (
   select p.username handle,p.id owner from public.profiles p join private.shelf_settings s on s.user_id=p.id and s.visibility<>'hidden' where p.username is not null
   union all select w.public_handle,w.owner_user_id from public.workspaces w join private.shelf_settings s on s.user_id=w.owner_user_id and s.visibility<>'hidden' where w.public_handle is not null
  )h where coalesce(p_query,'')='' or position(lower(trim(leading '@' from p_query)) in lower(h.handle))>0
  order by h.handle
 loop
  base:=private.pro_v2_public(candidate.handle);if base is null then continue;end if;
  shelf:=private.shelf_public(candidate.handle);if shelf is null or shelf->>'visibility'='hidden' then continue;end if;
  if n>=coalesce(p_offset,0) and n<coalesce(p_offset,0)+12 then
   items:=items||jsonb_build_array(jsonb_build_object('handle',base->>'handle','displayName',base->>'displayName','styles',coalesce(base#>'{professional,fields,specialties}',base->'styles','[]'),'avatarHandle',coalesce(base->>'avatarHandle',base->>'handle'),'count',jsonb_array_length(shelf->'products'),'products',coalesce((select jsonb_agg(p) from (select p-'shelfUsage' as p from jsonb_array_elements(shelf->'products') p limit 5)t),'[]')));
  end if;
  n:=n+1;if n>coalesce(p_offset,0)+12 then exit;end if;
 end loop;
 return jsonb_build_object('items',items,'hasMore',n>coalesce(p_offset,0)+12);
end $$;
create function public.nm_shelf_settings(p_action text default 'get',p_workspace_id uuid default null,p_visibility text default null) returns jsonb language sql security invoker set search_path='' as $$select private.shelf_settings_action(p_action,p_workspace_id,p_visibility)$$;
create function public.nm_shelf_public(p_handle text) returns jsonb language sql security invoker set search_path='' as $$select private.shelf_public(p_handle)$$;
create function public.nm_shelf_discover(p_query text default '',p_offset integer default 0) returns jsonb language sql security invoker set search_path='' as $$select private.shelf_discover(p_query,p_offset)$$;
revoke all on function private.shelf_settings_action(text,uuid,text),private.shelf_product(public.user_products),private.shelf_product_matches(jsonb,jsonb),private.shelf_public(text),private.shelf_discover(text,integer),public.nm_shelf_settings(text,uuid,text),public.nm_shelf_public(text),public.nm_shelf_discover(text,integer) from public,anon,authenticated;
grant execute on function private.shelf_settings_action(text,uuid,text),private.shelf_public(text),private.shelf_discover(text,integer),public.nm_shelf_settings(text,uuid,text),public.nm_shelf_public(text),public.nm_shelf_discover(text,integer) to authenticated;
commit;
