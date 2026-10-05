-- Pro V2: additive extension of the existing professional workspaces.
-- Recette first. No subscription, tier, AI entitlement or Store product is changed.
begin;
alter table public.profiles add column professional_type text check(professional_type in ('nail_artist','product_creator','brand','educator_creator','other_professional'));
alter table public.workspaces add column organization_type text check(organization_type in ('solo','institute','brand_team','creator_team'));
update public.workspaces set organization_type=case when kind='institute' then 'institute' else 'solo' end where kind in ('pro','institute','creator');
alter table public.workspace_entitlements add column included_seats integer not null default 1 check(included_seats=1);
alter table public.workspace_entitlements add column subscription_source text not null default 'manual' check(subscription_source in ('manual','apple','google'));
alter table public.workspace_entitlements add column billing_owner uuid references auth.users(id) on delete set null;
update public.workspace_entitlements e set billing_owner=w.owner_user_id from public.workspaces w where w.id=e.workspace_id;
create index workspace_entitlements_billing_owner_idx on public.workspace_entitlements(billing_owner);

-- These tables are not Data API resources. Authenticated callers use narrow RPCs.
create table private.pro_showcase_details(
 workspace_id uuid primary key references public.workspaces(id) on delete cascade,
 professional_type text check(professional_type in ('nail_artist','product_creator','brand','educator_creator','other_professional')),
 fields jsonb not null default '{}', visibility jsonb not null default '{}',
 verified boolean not null default false, verified_by uuid references auth.users(id) on delete set null,
 updated_at timestamptz not null default now(),check(jsonb_typeof(fields)='object'),check(jsonb_typeof(visibility)='object')
);
insert into private.pro_showcase_details(workspace_id,fields,visibility)
 select w.id,jsonb_strip_nulls(jsonb_build_object('bio',p.bio,'city',p.city,'universes',to_jsonb(p.styles))),jsonb_build_object('bio',case when p.is_public then 'public' else 'private' end,'city',case when p.is_public then 'public' else 'private' end,'universes',case when p.is_public then 'public' else 'private' end)
 from public.workspaces w left join public.pro_profiles p on p.workspace_id=w.id where w.organization_type is not null;
create table private.pro_team_visibility(
 workspace_id uuid not null,user_id uuid not null,show_profile boolean not null default false,
 primary key(workspace_id,user_id),foreign key(workspace_id,user_id) references public.workspace_members(workspace_id,user_id) on delete cascade
);
create table private.pro_showcase_items(
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 kind text not null check(kind in ('product','collection','publication')),
 title text not null check(length(title) between 1 and 120),details jsonb not null default '{}',
 visibility text not null default 'private' check(visibility in ('public','private','organization')),
 claim_status text not null default 'community' check(claim_status in ('community','claimed','verified')),
 catalog_reference text,content_type text not null default 'organic' check(content_type in ('organic','sponsored')),
 created_by uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(jsonb_typeof(details)='object'),check(length(details::text)<=40000)
);
create index pro_items_workspace_idx on private.pro_showcase_items(workspace_id,kind,created_at desc);
create index pro_items_creator_idx on private.pro_showcase_items(created_by);
create table private.pro_portfolio_links(
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('journal','inspiration')),content_id uuid not null,
 product_id uuid references private.pro_showcase_items(id) on delete cascade,
 primary key(workspace_id,kind,content_id)
);
create index pro_links_user_idx on private.pro_portfolio_links(user_id);
create index pro_links_product_idx on private.pro_portfolio_links(product_id);
create table private.pro_correction_requests(
 id uuid primary key default gen_random_uuid(),item_id uuid not null references private.pro_showcase_items(id) on delete cascade,
 requested_by uuid not null references auth.users(id) on delete cascade,proposal jsonb not null,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),
 reviewed_by uuid references auth.users(id) on delete set null,created_at timestamptz not null default now()
);
create index pro_correction_item_idx on private.pro_correction_requests(item_id);
create index pro_correction_requester_idx on private.pro_correction_requests(requested_by);
create index pro_correction_reviewer_idx on private.pro_correction_requests(reviewed_by);
create index pro_details_verifier_idx on private.pro_showcase_details(verified_by);
alter table private.pro_showcase_details enable row level security;
alter table private.pro_team_visibility enable row level security;
alter table private.pro_showcase_items enable row level security;
alter table private.pro_portfolio_links enable row level security;
alter table private.pro_correction_requests enable row level security;
revoke all on private.pro_showcase_details,private.pro_team_visibility,private.pro_showcase_items,private.pro_portfolio_links,private.pro_correction_requests from public,anon,authenticated;

create function private.pro_v2_can_edit(wid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.workspaces w join public.workspace_members m on m.workspace_id=w.id
 where w.id=wid and m.user_id=auth.uid() and m.role in ('owner','manager') and w.organization_type is not null and private.effective_tier(w.owner_user_id)='pro')
$$;
create function private.pro_v2_fields(fields jsonb,visibility jsonb,audience text) returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_object_agg(e.key,e.value),'{}') from jsonb_each(fields) e
 where visibility->>e.key='public' or (audience='organization' and visibility->>e.key='organization') or audience='owner'
$$;
create function private.pro_v2_validate(data jsonb,allowed text[]) returns void language plpgsql set search_path='' as $$
declare k text;v jsonb;u text;
begin
 if data is null or jsonb_typeof(data)<>'object' or length(data::text)>40000 then raise exception 'invalid_showcase_data';end if;
 for k,v in select * from jsonb_each(data) loop
  if not k=any(allowed) then raise exception 'invalid_showcase_field: %',k;end if;
  if k in ('universes','specialties','keywords','photos','productIds') then
   if jsonb_typeof(v)<>'array' or exists(select 1 from jsonb_array_elements(v) a where jsonb_typeof(a)<>'string') then raise exception 'invalid_showcase_list';end if;
  elsif jsonb_typeof(v) not in ('string','null') then raise exception 'invalid_showcase_text';end if;
  if k in ('website','shop','instagram','sourceUrl','officialUrl') and v<>'null'::jsonb and v<>'""'::jsonb then
   u:=v#>>'{}';if u !~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$' or length(u)>2000 then raise exception 'invalid_public_url';end if;
  elsif k='hex' and v<>'null'::jsonb and v<>'""'::jsonb and (v#>>'{}') !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'invalid_product_hex';
  elsif jsonb_typeof(v)='string' and length(v#>>'{}')>3000 then raise exception 'showcase_text_too_long';
  elsif jsonb_typeof(v)='array' and jsonb_array_length(v)>60 then raise exception 'showcase_list_too_long';end if;
 end loop;
end $$;

create function private.pro_v2_state() returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();result jsonb;
begin
 perform private.require_feature('personal');
 select jsonb_build_object('professionalType',(select professional_type from public.profiles where id=actor),
 'spaces',coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'handle',w.public_handle,'organizationType',w.organization_type,
 'role',case when m.role='manager' then 'admin' when m.role='owner' then 'owner' else 'member' end,
 'professionalType',d.professional_type,'isPublic',p.is_public,'bio',p.bio,'city',p.city,'avatar',p.avatar_url,
 'fields',private.pro_v2_fields(coalesce(d.fields,'{}'),coalesce(d.visibility,'{}'),case when m.role in ('owner','manager') then 'owner' else 'organization' end),
 'visibility',case when m.role in ('owner','manager') then d.visibility else '{}'::jsonb end,'verified',coalesce(d.verified,false),
 'seats',jsonb_build_object('included',1,'active',(select count(*) from public.workspace_members a where a.workspace_id=w.id),'limit',coalesce(e.seat_limit,1),'extra',greatest(0,(select count(*)::int from public.workspace_members a where a.workspace_id=w.id)-1),'enabled',coalesce(e.active,false)),
 'showProfile',coalesce((select t.show_profile from private.pro_team_visibility t where t.workspace_id=w.id and t.user_id=actor),false),
 'members',coalesce((select jsonb_agg(jsonb_build_object('id',a.user_id,'name',ap.display_name,'handle',ap.username,'role',case when a.role='manager' then 'admin' when a.role='owner' then 'owner' else 'member' end)) from public.workspace_members a join public.profiles ap on ap.id=a.user_id where a.workspace_id=w.id),'[]'),
 'invitations',case when m.role='owner' then coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'handle',ip.username,'expiresAt',i.expires_at)) from public.workspace_invitations i join public.profiles ip on ip.id=i.invited_user_id where i.workspace_id=w.id and i.status='pending' and i.expires_at>now()),'[]') else '[]'::jsonb end,
 'items',coalesce((select jsonb_agg(to_jsonb(i)-'created_by'-'workspace_id') from private.pro_showcase_items i where i.workspace_id=w.id and (m.role in ('owner','manager') or i.visibility in ('organization','public'))),'[]')
 ) order by w.created_at) from public.workspace_members m join public.workspaces w on w.id=m.workspace_id
 left join public.pro_profiles p on p.workspace_id=w.id left join private.pro_showcase_details d on d.workspace_id=w.id
 left join public.workspace_entitlements e on e.workspace_id=w.id where m.user_id=actor and w.organization_type is not null),'[]'),
 'inbox',private.institute_inbox()) into result;
 return result;
end $$;

create function private.pro_v2_save(p_workspace_id uuid,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();wid uuid:=p_workspace_id;space public.workspaces;
 profession text:=p_data->>'professionalType';org text:=p_data->>'organizationType';nm text:=trim(p_data->>'name');h text:=lower(trim(leading '@' from trim(p_data->>'handle')));
 f jsonb:=coalesce(p_data->'fields','{}');vis jsonb:=coalesce(p_data->'visibility','{}');k text;v jsonb;
begin
 perform private.require_feature('personal');
 if profession is null or profession not in ('nail_artist','product_creator','brand','educator_creator','other_professional') or org is null or org not in ('solo','institute','brand_team','creator_team') then raise exception 'choose_profession_structure';end if;
 if nm is null or length(nm) not between 2 and 80 then raise exception 'invalid_workspace_name';end if;
 if h is null or h !~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$' or h in ('admin','support','nailmoods','official','system') then raise exception 'invalid_handle';end if;
 perform private.pro_v2_validate(f,array['bio','city','country','website','shop','instagram','cover','universes','specialties','keywords']);
 if jsonb_typeof(vis)<>'object' then raise exception 'invalid_visibility';end if;
 for k,v in select * from jsonb_each(vis) loop
  if not f ? k or (v#>>'{}') not in ('public','private','organization') then raise exception 'invalid_visibility';end if;
 end loop;
 if f ? 'cover' and coalesce(f->>'cover','')<>'' and split_part(f->>'cover','/',1)<>actor::text then raise exception 'invalid_media_owner';end if;
 if wid is null then
  perform private.require_feature('pro');
 else
  select * into space from public.workspaces where id=wid for update;
  if not private.pro_v2_can_edit(wid) then raise exception 'showcase_editor_required' using errcode='42501';end if;
  if org='solo' and exists(select 1 from public.workspace_members where workspace_id=wid and user_id<>space.owner_user_id) then raise exception 'team_must_be_empty';end if;
 end if;
 perform pg_advisory_xact_lock(hashtextextended('nailmoods-handle:'||h,0));
 if exists(select 1 from public.profiles where username=h) or exists(select 1 from public.workspaces where public_handle=h and id is distinct from wid) then raise exception 'handle_unavailable';end if;
 if wid is null then
  insert into public.workspaces(owner_user_id,kind,name,public_handle,organization_type) values(actor,case when org='solo' then 'pro' else 'institute' end,nm,h,org) returning id into wid;
  insert into public.workspace_members(workspace_id,user_id,role) values(wid,actor,'owner');
  insert into public.pro_profiles(user_id,workspace_id,display_name) values(actor,wid,nm);
  insert into public.workspace_entitlements(workspace_id,active,seat_limit,billing_owner) values(wid,true,1,actor);
 else
  update public.workspaces set name=nm,public_handle=h,organization_type=org where id=wid;
 end if;
 -- Only explicitly public legacy fields reach the historical projection.
 update public.pro_profiles set display_name=nm,is_public=coalesce((p_data->>'isPublic')::boolean,false),
 bio=case when vis->>'bio'='public' then left(f->>'bio',320) else null end,
 city=case when vis->>'city'='public' then left(f->>'city',80) else null end,updated_at=now() where workspace_id=wid;
 insert into private.pro_showcase_details(workspace_id,professional_type,fields,visibility) values(wid,profession,f,vis)
 on conflict(workspace_id) do update set professional_type=excluded.professional_type,fields=excluded.fields,visibility=excluded.visibility,updated_at=now();
 update public.profiles set professional_type=profession where id=actor;
 return wid;
end $$;

create function private.pro_v2_item(p_workspace_id uuid,p_id uuid,p_kind text,p_data jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();iid uuid:=p_id;prior private.pro_showcase_items;d jsonb:=coalesce(p_data->'details','{}');photo text;ref text;
begin
 perform private.require_feature('personal');
 if not private.pro_v2_can_edit(p_workspace_id) then raise exception 'showcase_editor_required' using errcode='42501';end if;
 perform 1 from public.workspaces where id=p_workspace_id for update;
 if p_kind not in ('product','collection','publication') or p_kind is null then raise exception 'invalid_item_kind';end if;
 if p_kind in ('product','collection') and not exists(select 1 from private.pro_showcase_details where workspace_id=p_workspace_id and professional_type in ('product_creator','brand')) then raise exception 'product_profession_required';end if;
 if p_id is not null then
  select * into prior from private.pro_showcase_items where id=p_id and workspace_id=p_workspace_id for update;
  if not found or prior.kind<>p_kind then raise exception 'item_unavailable' using errcode='42501';end if;
  if p_data->>'delete'='true' then delete from private.pro_showcase_items where id=p_id;return p_id;end if;
 end if;
 perform private.pro_v2_validate(d,array['category','reference','description','hex','finish','effects','motifs','dimensions','variants','ean','officialUrl','usage','sourceUrl','photos','productIds','contentKind','inspirationId','technical']);
 if d ? 'photos' then
  if jsonb_typeof(d->'photos')<>'array' or jsonb_array_length(d->'photos')>1 then raise exception 'invalid_photos';end if;
  for photo in select jsonb_array_elements_text(d->'photos') loop
   if split_part(photo,'/',1)<>actor::text or split_part(photo,'/',2)<>p_workspace_id::text then raise exception 'invalid_media_owner';end if;
  end loop;
 end if;
 if d ? 'technical' and (nullif(d->>'sourceUrl','') is null or jsonb_typeof(d->'technical')<>'string') then raise exception 'documented_source_required';end if;
 if d ? 'productIds' then
  for ref in select jsonb_array_elements_text(d->'productIds') loop
   if not exists(select 1 from private.pro_showcase_items where id::text=ref and workspace_id=p_workspace_id and kind='product') then raise exception 'invalid_collection_product';end if;
  end loop;
 end if;
 if prior.claim_status='verified' and (d is distinct from prior.details or p_data->>'title' is distinct from prior.title) then
  insert into private.pro_correction_requests(item_id,requested_by,proposal) values(prior.id,actor,p_data);return prior.id;
 end if;
 if iid is null then
  insert into private.pro_showcase_items(workspace_id,kind,title,details,visibility,created_by,claim_status) values(p_workspace_id,p_kind,trim(p_data->>'title'),d,coalesce(p_data->>'visibility','private'),actor,case when p_data->>'claimStatus'='claimed' then 'claimed' else 'community' end) returning id into iid;
 else
  update private.pro_showcase_items set title=trim(p_data->>'title'),details=d,visibility=coalesce(p_data->>'visibility','private'),
  claim_status=case when prior.claim_status='verified' then 'verified' when p_data->>'claimStatus'='claimed' then 'claimed' else 'community' end,updated_at=now() where id=iid;
 end if;
 return iid;
end $$;

-- Reuse the invitation state machine; only widen its structure eligibility.
-- Source is the installed, audited definition, retaining consent, rate limits and locks.
do $migration$
declare def text;
begin
 select pg_get_functiondef('private.institute_action(text,uuid,uuid,uuid,text)'::regprocedure) into def;
 def:=replace(def,'and kind=''institute'' for update','and (kind=''institute'' or organization_type in (''institute'',''brand_team'',''creator_team'')) for update');
 def:=replace(def,'account_tier=''pro''','private.effective_tier(id)=''pro''');
 execute def;
end $migration$;

create function private.pro_v2_team(p_workspace_id uuid,p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();space public.workspaces;target uuid;lim int;
begin
 perform private.require_feature('personal');
 select * into space from public.workspaces where id=p_workspace_id for update;
 if not found then raise exception 'workspace_unavailable';end if;
 if p_action='visibility' then
  if not exists(select 1 from public.workspace_members where workspace_id=space.id and user_id=actor) then raise exception 'membership_required' using errcode='42501';end if;
  insert into private.pro_team_visibility values(space.id,actor,coalesce((p_data->>'visible')::boolean,false)) on conflict(workspace_id,user_id) do update set show_profile=excluded.show_profile;
 elsif p_action='role' then
  if space.owner_user_id<>actor then raise exception 'owner_required' using errcode='42501';end if;
  target:=(p_data->>'userId')::uuid;
  if target=actor or p_data->>'role' not in ('admin','member') then raise exception 'invalid_member_role';end if;
  update public.workspace_members set role=case when p_data->>'role'='admin' then 'manager' else 'member' end where workspace_id=space.id and user_id=target and role<>'owner';
  if not found then raise exception 'membership_not_found';end if;
 elsif p_action='seats' then
  -- Staff/manual attribution only until Store monetization is designed.
  if not private.nm_support_staff() then raise exception 'staff_required' using errcode='42501';end if;
  lim:=(p_data->>'limit')::int;
  if lim<1 or lim>100 or lim<(select count(*) from public.workspace_members where workspace_id=space.id) then raise exception 'invalid_seat_limit';end if;
  update public.workspace_entitlements set seat_limit=lim where workspace_id=space.id;
 elsif p_action in ('invite','accept','decline','revoke','leave','remove','transfer') then
  if p_action in ('invite','accept') and (space.organization_type='solo' or private.nm_blocked(space.owner_user_id)) then raise exception 'team_unavailable';end if;
  if p_action='invite' and exists(select 1 from public.profiles where username=lower(trim(leading '@' from trim(p_data->>'handle'))) and private.nm_blocked(id)) then raise exception 'recipient_unavailable';end if;
  perform private.institute_action(p_action,space.id,(p_data->>'userId')::uuid,(p_data->>'invitationId')::uuid,p_data->>'handle');
  if p_action='transfer' then
   update public.pro_profiles set user_id=(p_data->>'userId')::uuid where workspace_id=space.id;
   update public.workspace_entitlements set billing_owner=(p_data->>'userId')::uuid where workspace_id=space.id and subscription_source='manual';
  end if;
  if p_action='invite' then return jsonb_build_object('invitation_id',(select id from public.workspace_invitations where workspace_id=space.id and invited_by=actor order by created_at desc limit 1));end if;
 else raise exception 'unknown_action';end if;
 return jsonb_build_object('ok',true);
end $$;

create function private.pro_v2_portfolio(p_workspace_id uuid,p_kind text,p_content_id uuid,p_product_id uuid,p_enabled boolean) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();
begin
 perform private.require_feature('social');
 if not exists(select 1 from public.workspace_members where workspace_id=p_workspace_id and user_id=actor) then raise exception 'membership_required';end if;
 if not coalesce(p_enabled,false) then delete from private.pro_portfolio_links where workspace_id=p_workspace_id and kind=p_kind and content_id=p_content_id and user_id=actor;return;end if;
 if not ((p_kind='journal' and exists(select 1 from public.journal_entries where id=p_content_id and created_by=actor and visibility='public')) or
 (p_kind='inspiration' and exists(select 1 from public.inspirations where id=p_content_id and created_by=actor and is_public))) then raise exception 'owned_public_content_required';end if;
 if p_product_id is not null and not exists(select 1 from private.pro_showcase_items where id=p_product_id and workspace_id=p_workspace_id and kind='product') then raise exception 'invalid_product';end if;
 insert into private.pro_portfolio_links values(p_workspace_id,actor,p_kind,p_content_id,p_product_id) on conflict(workspace_id,kind,content_id) do update set product_id=excluded.product_id;
end $$;

create function private.pro_v2_public(p_handle text) returns jsonb language plpgsql security definer set search_path='' as $$
declare base jsonb;w public.workspaces;d private.pro_showcase_details;f jsonb;team jsonb;portfolio jsonb;items jsonb;
begin
 perform private.require_feature('discovery');
 base:=private.nm_public_profile_v2(p_handle);if base is null then return null;end if;
 select * into w from public.workspaces where public_handle=base->>'handle';
 if not found then return base;end if;
 select * into d from private.pro_showcase_details where workspace_id=w.id;
 if not found or d.professional_type is null then return base;end if;
 f:=private.pro_v2_fields(d.fields,d.visibility,'public');
 select coalesce(jsonb_agg(jsonb_build_object('name',p.display_name,'handle',p.username,'role',case when m.role='owner' then 'owner' when m.role='manager' then 'admin' else 'member' end)),'[]') into team
 from public.workspace_members m join private.pro_team_visibility v on v.workspace_id=m.workspace_id and v.user_id=m.user_id
 join public.profiles p on p.id=m.user_id where m.workspace_id=w.id and v.show_profile and p.username is not null and not private.nm_blocked(p.id)
 and private.effective_tier(p.id) in ('plus','pro') and (p.discovery_visibility='everyone' or (p.discovery_visibility='pros' and private.effective_tier(auth.uid())='pro'));
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'kind',i.kind,'title',i.title,'details',i.details,'claimStatus',i.claim_status,'catalogReference',i.catalog_reference,'contentType','organic') order by i.created_at desc),'[]') into items from private.pro_showcase_items i where i.workspace_id=w.id and i.visibility='public' and i.content_type='organic';
 select coalesce(jsonb_agg(x.entry),'[]') into portfolio from (
  select jsonb_build_object('id',j.id,'kind','journal','title',coalesce(j.snapshot->>'title','Ma pose'),'preview',private.discovery_preview(j.snapshot->'idea'),'productId',l.product_id,'performedOn',j.performed_on) entry
  from private.pro_portfolio_links l join public.journal_entries j on j.id=l.content_id and j.created_by=l.user_id
  join public.workspace_members m on m.workspace_id=l.workspace_id and m.user_id=l.user_id
  where l.workspace_id=w.id and l.kind='journal' and j.visibility='public' and not private.nm_blocked(j.created_by)
  union all select jsonb_build_object('id',i.id,'kind','inspiration','title',i.title,'preview',private.discovery_preview(i.snapshot),'productId',l.product_id)
  from private.pro_portfolio_links l join public.inspirations i on i.id=l.content_id and i.created_by=l.user_id
  join public.workspace_members m on m.workspace_id=l.workspace_id and m.user_id=l.user_id
  where l.workspace_id=w.id and l.kind='inspiration' and i.is_public and not private.nm_blocked(i.created_by)
 ) x;
 -- Collective portfolios are opt-in, including legacy workspace publications.
 return (base-'journal'-'inspirations'-'bio'-'city'-'styles')||jsonb_build_object('journal','[]'::jsonb,'inspirations','[]'::jsonb,
 'professional',jsonb_build_object('type',d.professional_type,'organizationType',w.organization_type,'verified',d.verified,'fields',f,'team',team,'items',items,'portfolio',portfolio));
end $$;

create function private.pro_v2_search(p_query text,p_type text,p_city text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.require_feature('discovery');
 if length(coalesce(p_query,''))>80 or length(coalesce(p_city,''))>80 then raise exception 'invalid_query';end if;
 select coalesce(jsonb_agg(x.row),'[]') into result from (select jsonb_build_object('entity_type','workspace','entity_id',w.id,'handle',w.public_handle,'display_name',pp.display_name,'kind',case when w.organization_type='institute' then 'institute' else d.professional_type end,'city',case when d.visibility->>'city'='public' then d.fields->>'city' end,'avatar_url',pp.avatar_url) row
 from public.workspaces w join public.pro_profiles pp on pp.workspace_id=w.id join private.pro_showcase_details d on d.workspace_id=w.id
 where pp.is_public and w.public_handle is not null and d.professional_type is not null and private.effective_tier(w.owner_user_id)='pro' and not private.nm_blocked(w.owner_user_id)
 and (coalesce(p_type,'')='' or d.professional_type=p_type or w.organization_type=p_type)
 and (coalesce(p_city,'')='' or (d.visibility->>'city'='public' and position(lower(p_city) in lower(d.fields->>'city'))>0))
 and (coalesce(p_query,'')='' or position(lower(trim(leading '@' from p_query)) in lower(w.public_handle||' '||pp.display_name||' '||private.pro_v2_fields(d.fields,d.visibility,'public')::text))>0
 or exists(select 1 from private.pro_showcase_items i where i.workspace_id=w.id and i.visibility='public' and position(lower(p_query) in lower(i.title))>0))
 order by pp.display_name,w.id limit 40) x;return result;
end $$;

create function private.pro_v2_review(p_item_id uuid,p_workspace_id uuid,p_request_id uuid,p_approve boolean,p_catalog_reference text) returns void language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();r private.pro_correction_requests;
begin
 if not private.nm_support_staff() then raise exception 'staff_required' using errcode='42501';end if;
 if p_request_id is not null then
  select * into r from private.pro_correction_requests where id=p_request_id and status='pending' for update;
  if not found then raise exception 'request_unavailable';end if;
  if p_approve then update private.pro_showcase_items set title=r.proposal->>'title',details=r.proposal->'details',updated_at=now() where id=r.item_id;end if;
  update private.pro_correction_requests set status=case when p_approve then 'approved' else 'rejected' end,reviewed_by=actor where id=r.id;
 elsif p_item_id is not null then
  update private.pro_showcase_items set claim_status=case when p_approve then 'verified' else 'claimed' end,catalog_reference=nullif(p_catalog_reference,'') where id=p_item_id;
 elsif p_workspace_id is not null then
  update private.pro_showcase_details set verified=p_approve,verified_by=actor where workspace_id=p_workspace_id;
 end if;
end $$;

-- Narrow authenticated API; helpers stay private and non-callable by PUBLIC.
create function public.nm_pro_state() returns jsonb language sql security invoker set search_path='' as $$select private.pro_v2_state()$$;
create function public.nm_pro_save(p_workspace_id uuid,p_data jsonb) returns uuid language sql security invoker set search_path='' as $$select private.pro_v2_save(p_workspace_id,p_data)$$;
create function public.nm_pro_item(p_workspace_id uuid,p_id uuid,p_kind text,p_data jsonb) returns uuid language sql security invoker set search_path='' as $$select private.pro_v2_item(p_workspace_id,p_id,p_kind,p_data)$$;
create function public.nm_pro_team(p_workspace_id uuid,p_action text,p_data jsonb) returns jsonb language sql security invoker set search_path='' as $$select private.pro_v2_team(p_workspace_id,p_action,p_data)$$;
create function public.nm_pro_portfolio(p_workspace_id uuid,p_kind text,p_content_id uuid,p_product_id uuid,p_enabled boolean) returns void language sql security invoker set search_path='' as $$select private.pro_v2_portfolio(p_workspace_id,p_kind,p_content_id,p_product_id,p_enabled)$$;
create function public.nm_pro_public(p_handle text) returns jsonb language sql security invoker set search_path='' as $$select private.pro_v2_public(p_handle)$$;
create function public.nm_pro_search(p_query text,p_type text,p_city text) returns jsonb language sql security invoker set search_path='' as $$select private.pro_v2_search(p_query,p_type,p_city)$$;
create function public.nm_pro_review(p_item_id uuid,p_workspace_id uuid,p_request_id uuid,p_approve boolean,p_catalog_reference text) returns void language sql security invoker set search_path='' as $$select private.pro_v2_review(p_item_id,p_workspace_id,p_request_id,p_approve,p_catalog_reference)$$;
do $acl$
declare r record;
begin
 for r in select p.oid::regprocedure fn,n.nspname,p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='private' and p.proname like 'pro_v2_%') or (n.nspname='public' and p.proname like 'nm_pro_%') loop
  execute format('revoke all on function %s from public,anon,authenticated',r.fn);
  if r.proname not in ('pro_v2_can_edit','pro_v2_fields','pro_v2_validate') then execute format('grant execute on function %s to authenticated',r.fn);end if;
 end loop;
end $acl$;
insert into private.analytics_event_catalog(event_name,category,allowed_metadata_keys) values
 ('pro_showcase_viewed','social',array['professional_type']),('pro_product_viewed','social',array['category']),('pro_shop_opened','social',array['professional_type']),('pro_catalog_added','collection',array['source']) on conflict(event_name) do nothing;
create function private.pro_v2_asset_allowed(path text,writing boolean) returns boolean language plpgsql stable security definer set search_path='' as $$
declare wid uuid;
begin
 if auth.uid() is null or private.nm_account_suspended(auth.uid()) then return false;end if;
 if split_part(path,'/',2) !~ '^[0-9a-f-]{36}$' then return false;end if;
 wid:=split_part(path,'/',2)::uuid;
 if split_part(path,'/',1)=auth.uid()::text and private.pro_v2_can_edit(wid) then return true;end if;
 if writing or not private.discovery_allowed() then return false;end if;
 return exists(select 1 from public.workspaces w join public.pro_profiles p on p.workspace_id=w.id join private.pro_showcase_details d on d.workspace_id=w.id
 where w.id=wid and p.is_public and private.effective_tier(w.owner_user_id)='pro' and not private.nm_blocked(w.owner_user_id)
 and ((d.visibility->>'cover'='public' and d.fields->>'cover'=path) or exists(select 1 from private.pro_showcase_items i where i.workspace_id=w.id and i.visibility='public' and i.details->'photos' ? path)));
exception when invalid_text_representation then return false;
end $$;
revoke all on function private.pro_v2_asset_allowed(text,boolean) from public,anon;
grant execute on function private.pro_v2_asset_allowed(text,boolean) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('nailmoods-pro','nailmoods-pro',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy pro_v2_media_read on storage.objects for select to authenticated using(bucket_id='nailmoods-pro' and private.pro_v2_asset_allowed(name,false));
create policy pro_v2_media_insert on storage.objects for insert to authenticated with check(bucket_id='nailmoods-pro' and private.pro_v2_asset_allowed(name,true));
create policy pro_v2_media_delete on storage.objects for delete to authenticated using(bucket_id='nailmoods-pro' and private.pro_v2_asset_allowed(name,true));
-- Extend the existing pre-publication queue for professional images.
alter table private.publication_reviews drop constraint publication_reviews_kind_check;
alter table private.publication_reviews add constraint publication_reviews_kind_check check(kind in ('journal','inspiration','pro_item','pro_cover'));
create function private.pro_v2_image_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare k text;entity uuid;author_id uuid;photo text;title_value text;fp text;requested boolean;
begin
 if tg_table_name='pro_showcase_items' then k:='pro_item';entity:=new.id;author_id:=new.created_by;photo:=new.details#>>'{photos,0}';title_value:=new.title;requested:=new.visibility='public';
 else k:='pro_cover';entity:=new.workspace_id;select owner_user_id into author_id from public.workspaces where id=entity;photo:=new.fields->>'cover';title_value:='Couverture professionnelle';requested:=new.visibility->>'cover'='public';end if;
 if photo is null or photo='' or not coalesce(requested,false) then
  update private.publication_reviews set status='canceled',updated_at=now() where kind=k and entity_id=entity and status='pending';return new;
 end if;
 fp:=md5(photo||coalesce(title_value,''));
 if exists(select 1 from private.publication_reviews where kind=k and entity_id=entity and fingerprint=fp and status in ('approved','rejected')) then return new;end if;
 insert into private.publication_reviews(kind,entity_id,author,fingerprint,image_path,image_bucket,title,status)
 values(k,entity,author_id,fp,photo,'nailmoods-pro',left(title_value,160),'pending') on conflict(kind,entity_id) do update set fingerprint=excluded.fingerprint,image_path=excluded.image_path,image_bucket=excluded.image_bucket,title=excluded.title,status='pending',updated_at=now(),reviewer=null;
 return new;
end $$;
create trigger pro_item_image_review after insert or update on private.pro_showcase_items for each row execute function private.pro_v2_image_guard();
create trigger pro_cover_image_review after insert or update on private.pro_showcase_details for each row execute function private.pro_v2_image_guard();
create function private.pro_v2_image_approved(k text,entity uuid,path text) returns boolean language sql stable security definer set search_path='' as $$
 select path is null or path='' or exists(select 1 from private.publication_reviews where kind=k and entity_id=entity and image_path=path and status='approved')
$$;
create function private.pro_v2_moderation(p_action text,p_kind text,p_id uuid,p_fingerprint text) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();r private.publication_reviews;
begin
 if p_action='mine' then return coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'id',entity_id,'title',title,'status',status)) from private.publication_reviews where author=actor and kind in ('pro_item','pro_cover')),'[]');end if;
 if not private.nm_support_staff() then raise exception 'staff_required' using errcode='42501';end if;
 if p_action='list' then return jsonb_build_object(
 'images',coalesce((select jsonb_agg(jsonb_build_object('kind',kind,'id',entity_id,'path',image_path,'title',title,'fingerprint',fingerprint)) from private.publication_reviews where kind in ('pro_item','pro_cover') and status='pending'),'[]'),
 'corrections',coalesce((select jsonb_agg(to_jsonb(c)-'requested_by'-'reviewed_by') from private.pro_correction_requests c where status='pending'),'[]'),
 'claims',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'title',i.title,'details',i.details)) from private.pro_showcase_items i where claim_status='claimed'),'[]'),
 'profiles',coalesce((select jsonb_agg(jsonb_build_object('id',d.workspace_id,'name',w.name,'fields',d.fields)) from private.pro_showcase_details d join public.workspaces w on w.id=d.workspace_id where d.professional_type is not null and not d.verified),'[]'));
 end if;
 if p_action not in ('approve','reject') or p_kind not in ('pro_item','pro_cover') then raise exception 'invalid_review_action';end if;
 select * into r from private.publication_reviews where kind=p_kind and entity_id=p_id for update;
 if not found or r.status<>'pending' or r.fingerprint is distinct from p_fingerprint then raise exception 'content_changed';end if;
 update private.publication_reviews set status=case when p_action='approve' then 'approved' else 'rejected' end,reviewer=actor,updated_at=now() where kind=p_kind and entity_id=p_id;
 return '{"ok":true}';
end $$;
create function public.nm_pro_moderation(p_action text,p_kind text default null,p_id uuid default null,p_fingerprint text default null) returns jsonb language sql security invoker set search_path='' as $$select private.pro_v2_moderation(p_action,p_kind,p_id,p_fingerprint)$$;
revoke all on function private.pro_v2_image_guard(),private.pro_v2_image_approved(text,uuid,text),private.pro_v2_moderation(text,text,uuid,text),public.nm_pro_moderation(text,text,uuid,text) from public,anon,authenticated;
grant execute on function private.pro_v2_moderation(text,text,uuid,text),public.nm_pro_moderation(text,text,uuid,text) to authenticated;
-- Historical Journal moderation remains unchanged and does not dispatch these new kinds.
do $legacy$ declare def text;begin
 select pg_get_functiondef('public.nm_publication_review(text,text,uuid)'::regprocedure) into def;
 def:=replace(def,'where status=''pending'' order by created_at','where status=''pending'' and kind in (''journal'',''inspiration'') order by created_at');
 def:=replace(def,'where author=auth.uid()', 'where author=auth.uid() and kind in (''journal'',''inspiration'')');
 def:=replace(def,'select * into r from private.publication_reviews', 'if p_kind not in (''journal'',''inspiration'') then raise exception ''invalid_review_kind'';end if; select * into r from private.publication_reviews');
 execute def;
end $legacy$;
-- No public preview is permitted for a new or replaced professional image until reviewed.
do $projection$ declare def text;begin
 select pg_get_functiondef('private.pro_v2_public(text)'::regprocedure) into def;
 def:=replace(def,'f:=private.pro_v2_fields(d.fields,d.visibility,''public'');','f:=private.pro_v2_fields(d.fields,d.visibility,''public'');if not private.pro_v2_image_approved(''pro_cover'',w.id,f->>''cover'') then f:=f-''cover'';end if;');
 def:=replace(def,'i.visibility=''public'' and i.content_type', 'i.visibility=''public'' and private.pro_v2_image_approved(''pro_item'',i.id,i.details#>>''{photos,0}'') and i.content_type');execute def;
 select pg_get_functiondef('private.pro_v2_asset_allowed(text,boolean)'::regprocedure) into def;
 def:=replace(def,'if writing or not private.discovery_allowed()', 'if not writing and private.nm_support_staff() and exists(select 1 from private.publication_reviews where image_bucket=''nailmoods-pro'' and image_path=path and status=''pending'') then return true;end if;if writing or not private.discovery_allowed()');
 def:=replace(def,'d.fields->>''cover''=path','d.fields->>''cover''=path and private.pro_v2_image_approved(''pro_cover'',w.id,path)');
 def:=replace(def,'i.details->''photos'' ? path','i.details->''photos'' ? path and private.pro_v2_image_approved(''pro_item'',i.id,path)');execute def;
end $projection$;

create function private.pro_v2_delete_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='pro_showcase_items' then delete from private.publication_reviews where kind='pro_item' and entity_id=old.id;
 else delete from private.publication_reviews where kind='pro_cover' and entity_id=old.workspace_id;end if;return old;
end $$;
revoke all on function private.pro_v2_delete_review() from public,anon,authenticated;
create trigger pro_item_review_cleanup after delete on private.pro_showcase_items for each row execute function private.pro_v2_delete_review();
create trigger pro_cover_review_cleanup after delete on private.pro_showcase_details for each row execute function private.pro_v2_delete_review();
commit;
