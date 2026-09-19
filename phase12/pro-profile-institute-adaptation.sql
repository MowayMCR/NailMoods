-- Phase 12 recette: professional identity and institute role adaptation.
-- Apply to NailMoods-Recette only until the beta UX has been validated.
begin;

alter table public.profiles
  add column professional_status text;

alter table public.profiles
  add constraint profiles_professional_status_check
  check (professional_status is null or professional_status in (
    'institute_owner', 'independent', 'institute_associate'
  ));

comment on column public.profiles.professional_status is
  'Primary professional presentation. Workspace memberships remain the source of truth for permissions.';

update public.profiles p
set professional_status = case
  when exists (
    select 1 from public.workspaces w
    where w.owner_user_id=p.id and w.kind='institute'
  ) then 'institute_owner'
  when exists (
    select 1 from public.workspace_members m
    join public.workspaces w on w.id=m.workspace_id
    where m.user_id=p.id and w.kind='institute' and w.owner_user_id<>p.id
  ) then 'institute_associate'
  else 'independent'
end
where p.account_tier='pro' and p.professional_status is null;

revoke update(professional_status) on public.profiles from authenticated;

alter table public.workspace_members drop constraint workspace_members_role_check;
alter table public.workspace_members
  add constraint workspace_members_role_check
  check (role in ('owner','manager','creator','member'));

create or replace function private.set_professional_status(p_status text)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare actor uuid:=private.require_adult_account(); tier text;
begin
  if p_status not in ('institute_owner','independent','institute_associate') then
    raise exception 'invalid_professional_status' using errcode='22023';
  end if;
  select account_tier into strict tier from public.profiles where id=actor for update;
  if tier<>'pro' then raise exception 'pro_account_required' using errcode='42501'; end if;
  update public.profiles set professional_status=p_status,updated_at=now() where id=actor;
  return jsonb_build_object('professional_status',p_status);
end $$;
revoke all on function private.set_professional_status(text) from public,anon,authenticated;
grant execute on function private.set_professional_status(text) to authenticated;

create or replace function public.set_professional_status(p_status text)
returns jsonb language sql security invoker set search_path=''
as $$ select private.set_professional_status(p_status) $$;
revoke all on function public.set_professional_status(text) from public,anon;
grant execute on function public.set_professional_status(text) to authenticated;

create or replace function private.create_professional_workspace(p_kind text,p_name text)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  actor uuid:=private.require_adult_account();
  expected_status text;
  space public.workspaces;
  beta_enabled boolean:=false;
begin
  if p_kind not in ('pro','institute') then raise exception 'invalid_workspace_kind' using errcode='22023'; end if;
  if p_name is null or length(trim(p_name)) not between 2 and 80 then raise exception 'invalid_workspace_name' using errcode='22023'; end if;
  if not exists(select 1 from public.profiles where id=actor and account_tier='pro') then
    raise exception 'pro_account_required' using errcode='42501';
  end if;
  expected_status:=case when p_kind='institute' then 'institute_owner' else 'independent' end;
  update public.profiles set professional_status=expected_status,updated_at=now() where id=actor;

  select * into space from public.workspaces
  where owner_user_id=actor and kind=p_kind order by created_at limit 1;
  if found then
    return jsonb_build_object('id',space.id,'kind',space.kind,'name',space.name,'created',false);
  end if;

  insert into public.workspaces(owner_user_id,kind,name)
  values(actor,p_kind,trim(p_name)) returning * into space;
  insert into public.workspace_members(workspace_id,user_id,role)
  values(space.id,actor,'owner');
  insert into public.pro_profiles(user_id,workspace_id,display_name,is_public)
  values(actor,space.id,trim(p_name),false);

  if p_kind='institute' then
    if to_regclass('private.beta_tier_testers') is not null then
      execute 'select exists(select 1 from private.beta_tier_testers where user_id=$1 and expires_at>now())'
      using actor into beta_enabled;
    end if;
    insert into public.workspace_entitlements(workspace_id,active,seat_limit)
    values(space.id,beta_enabled,case when beta_enabled then 5 else 1 end);
  end if;
  return jsonb_build_object('id',space.id,'kind',space.kind,'name',space.name,'created',true);
end $$;
revoke all on function private.create_professional_workspace(text,text) from public,anon,authenticated;
grant execute on function private.create_professional_workspace(text,text) to authenticated;

create or replace function public.create_professional_workspace(p_kind text,p_name text)
returns jsonb language sql security invoker set search_path=''
as $$ select private.create_professional_workspace(p_kind,p_name) $$;
revoke all on function public.create_professional_workspace(text,text) from public,anon;
grant execute on function public.create_professional_workspace(text,text) to authenticated;

create or replace function private.update_professional_workspace(
  p_workspace_id uuid,
  p_name text,
  p_handle text,
  p_bio text,
  p_city text,
  p_is_public boolean
)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare
  actor uuid:=private.require_adult_account();
  normalized_handle text:=nullif(lower(trim(leading '@' from trim(coalesce(p_handle,'')))),'');
  space public.workspaces;
begin
  select * into space from public.workspaces where id=p_workspace_id for update;
  if not found or space.owner_user_id<>actor or space.kind not in ('pro','institute','creator') then
    raise exception 'owner_required' using errcode='42501';
  end if;
  if not exists(select 1 from public.profiles where id=actor and account_tier='pro') then
    raise exception 'pro_account_required' using errcode='42501';
  end if;
  if p_name is null or length(trim(p_name)) not between 2 and 80
     or length(trim(coalesce(p_bio,'')))>320 or length(trim(coalesce(p_city,'')))>80 then
    raise exception 'invalid_professional_profile' using errcode='22023';
  end if;
  if normalized_handle is not null and (
    normalized_handle !~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$'
    or normalized_handle in ('admin','support','nailmoods','official','system')
  ) then raise exception 'invalid_handle' using errcode='22023'; end if;
  if coalesce(p_is_public,false) and normalized_handle is null then
    raise exception 'public_handle_required' using errcode='22023';
  end if;
  if normalized_handle is not null then
    perform pg_advisory_xact_lock(hashtextextended('nailmoods-handle:'||normalized_handle,0));
    if exists(select 1 from public.profiles where username=normalized_handle)
       or exists(select 1 from public.workspaces where public_handle=normalized_handle and id<>space.id) then
      raise exception 'handle_unavailable' using errcode='23505';
    end if;
  end if;
  update public.workspaces set name=trim(p_name),public_handle=normalized_handle where id=space.id;
  update public.pro_profiles set
    display_name=trim(p_name),bio=nullif(trim(coalesce(p_bio,'')),''),
    city=nullif(trim(coalesce(p_city,'')),''),is_public=coalesce(p_is_public,false),updated_at=now()
  where workspace_id=space.id and user_id=actor;
  return jsonb_build_object(
    'id',space.id,'kind',space.kind,'name',trim(p_name),'handle',normalized_handle,
    'bio',nullif(trim(coalesce(p_bio,'')),''),'city',nullif(trim(coalesce(p_city,'')),''),
    'is_public',coalesce(p_is_public,false)
  );
end $$;
revoke all on function private.update_professional_workspace(uuid,text,text,text,text,boolean) from public,anon,authenticated;
grant execute on function private.update_professional_workspace(uuid,text,text,text,text,boolean) to authenticated;

create or replace function public.update_professional_workspace(
  p_workspace_id uuid,p_name text,p_handle text,p_bio text,p_city text,p_is_public boolean
)
returns jsonb language sql security invoker set search_path=''
as $$ select private.update_professional_workspace(p_workspace_id,p_name,p_handle,p_bio,p_city,p_is_public) $$;
revoke all on function public.update_professional_workspace(uuid,text,text,text,text,boolean) from public,anon;
grant execute on function public.update_professional_workspace(uuid,text,text,text,text,boolean) to authenticated;

create or replace function private.set_institute_member_role(p_workspace_id uuid,p_target_user_id uuid,p_role text)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare actor uuid:=private.require_adult_account(); space public.workspaces;
begin
  if p_role not in ('manager','creator','member') then raise exception 'invalid_member_role' using errcode='22023'; end if;
  select * into space from public.workspaces where id=p_workspace_id and kind='institute' for update;
  if not found or space.owner_user_id<>actor then raise exception 'owner_required' using errcode='42501'; end if;
  if p_target_user_id is null or p_target_user_id=actor then raise exception 'member_required' using errcode='22023'; end if;
  update public.workspace_members set role=p_role
  where workspace_id=space.id and user_id=p_target_user_id and role<>'owner';
  if not found then raise exception 'membership_not_found' using errcode='42501'; end if;
  return jsonb_build_object('workspace_id',space.id,'user_id',p_target_user_id,'role',p_role);
end $$;
revoke all on function private.set_institute_member_role(uuid,uuid,text) from public,anon,authenticated;
grant execute on function private.set_institute_member_role(uuid,uuid,text) to authenticated;

create or replace function public.set_institute_member_role(p_workspace_id uuid,p_target_user_id uuid,p_role text)
returns jsonb language sql security invoker set search_path=''
as $$ select private.set_institute_member_role(p_workspace_id,p_target_user_id,p_role) $$;
revoke all on function public.set_institute_member_role(uuid,uuid,text) from public,anon;
grant execute on function public.set_institute_member_role(uuid,uuid,text) to authenticated;

create or replace function private.close_institute(p_workspace_id uuid,p_confirmation text)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare actor uuid:=private.require_adult_account(); space public.workspaces;
begin
  select * into space from public.workspaces where id=p_workspace_id and kind='institute' for update;
  if not found or space.owner_user_id<>actor then raise exception 'owner_required' using errcode='42501'; end if;
  if trim(coalesce(p_confirmation,''))<>space.name then raise exception 'confirmation_mismatch' using errcode='22023'; end if;
  delete from public.workspaces where id=space.id;
  if not exists(select 1 from public.workspaces where owner_user_id=actor and kind='institute') then
    update public.profiles set professional_status='independent',updated_at=now()
    where id=actor and professional_status='institute_owner';
  end if;
  return jsonb_build_object('closed',true);
end $$;
revoke all on function private.close_institute(uuid,text) from public,anon,authenticated;
grant execute on function private.close_institute(uuid,text) to authenticated;

create or replace function public.close_institute(p_workspace_id uuid,p_confirmation text)
returns jsonb language sql security invoker set search_path=''
as $$ select private.close_institute(p_workspace_id,p_confirmation) $$;
revoke all on function public.close_institute(uuid,text) from public,anon;
grant execute on function public.close_institute(uuid,text) to authenticated;

-- Handle namespaces are shared by personal and professional identities.
create or replace function private.nailmoods_handle_available(p_handle text)
returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from auth.users where id=auth.uid())
 and lower(trim(p_handle)) ~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$'
 and lower(trim(p_handle)) not in ('admin','support','nailmoods','official','system')
 and not exists(select 1 from public.profiles where lower(username)=lower(trim(p_handle)) and id<>auth.uid())
 and not exists(select 1 from public.workspaces where lower(public_handle)=lower(trim(p_handle)))
$$;

create or replace function private.set_nailmoods_identity(p_handle text,p_visibility text,p_display_name text)
returns void language plpgsql security definer set search_path='' as $$
declare normalized_handle text:=lower(trim(leading '@' from trim(p_handle)));
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'confirmed_account_required' using errcode='42501'; end if;
 if normalized_handle is null or normalized_handle !~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$' or normalized_handle in ('admin','support','nailmoods','official','system') then raise exception 'invalid_handle'; end if;
 if p_display_name is null or length(trim(p_display_name)) not between 1 and 80 or p_visibility not in ('everyone','pros','nobody') then raise exception 'invalid_identity'; end if;
 perform pg_advisory_xact_lock(hashtextextended('nailmoods-handle:'||normalized_handle,0));
 if exists(select 1 from public.workspaces where public_handle=normalized_handle) then raise exception 'handle_unavailable' using errcode='23505'; end if;
 update public.profiles set username=normalized_handle,discovery_visibility=p_visibility,display_name=trim(p_display_name),preferences=jsonb_set(preferences,'{nailmoodsProfile}',coalesce(preferences->'nailmoodsProfile','{}'::jsonb)||jsonb_build_object('name',trim(p_display_name)),true) where id=auth.uid();
end $$;

create or replace function private.search_nailmoods(p_query text,p_kind text,p_city text)
returns table(entity_type text,entity_id uuid,handle text,display_name text,kind text,avatar_url text,city text,bio text,styles text[])
language sql stable security definer set search_path='' as $$
 with request as (
 select lower(trim(leading '@' from trim(p_query))) as q,
 exists(select 1 from public.profiles where id=auth.uid() and account_tier='pro') as is_pro
 where auth.uid() is not null and exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)
 and length(trim(p_query)) between 2 and 80
 ), visible as (
 select 'user'::text as entity_type,p.id as entity_id,p.username as handle,p.display_name,
 case when p.account_tier='pro' then coalesce(p.professional_status,'independent') else 'plus' end::text as kind,
 p.avatar_url,null::text as city,null::text as bio,array[]::text[] as styles
 from public.profiles p cross join request r where p.account_tier in ('plus','pro') and p.username is not null
 and (p.discovery_visibility='everyone' or (p.discovery_visibility='pros' and r.is_pro))
 union all
 select 'workspace',w.id,w.public_handle,pp.display_name,
 case w.kind when 'pro' then 'independent' else w.kind end,
 pp.avatar_url,pp.city,pp.bio,pp.styles
 from public.pro_profiles pp join public.workspaces w on w.id=pp.workspace_id join public.profiles owner on owner.id=w.owner_user_id
 where pp.is_public and w.public_handle is not null and w.kind in ('pro','institute','creator') and owner.account_tier='pro'
 )
 select v.* from visible v cross join request r
 where (position(r.q in lower(v.handle))>0 or position(r.q in lower(v.display_name))>0)
 and (p_kind is null or v.kind=p_kind) and (p_city is null or position(lower(p_city) in lower(coalesce(v.city,'')))>0)
 order by case when lower(v.handle)=r.q then 0 when starts_with(lower(v.handle),r.q) then 1 when lower(v.display_name)=r.q then 2 else 3 end,v.display_name,v.entity_id limit 30
$$;

revoke all on function private.nailmoods_handle_available(text),private.set_nailmoods_identity(text,text,text),private.search_nailmoods(text,text,text) from public,anon;
grant execute on function private.nailmoods_handle_available(text),private.set_nailmoods_identity(text,text,text),private.search_nailmoods(text,text,text) to authenticated;

-- One public reader supports a personal handle or a professional workspace
-- handle without returning user/workspace technical identifiers.
create or replace function public.get_public_profile(p_handle text)
returns jsonb
language plpgsql security definer set search_path=''
as $$
declare result jsonb; normalized_handle text:=lower(trim(leading '@' from trim(p_handle)));
begin
  select jsonb_build_object(
    'displayName',p.display_name,
    'handle',p.username,
    'accountType',case when p.account_tier='pro' then coalesce(p.professional_status,'independent') else p.account_tier end,
    'avatarHandle',p.username,
    'bio',pp.bio,
    'city',pp.city,
    'styles',coalesce(pp.styles,'{}'::text[]),
    'journal',coalesce((select jsonb_agg(jsonb_build_object(
      'id',j.id,'performedOn',j.performed_on,'mediaId',j.id,'mood',j.snapshot->'mood',
      'colors',j.snapshot->'colors','title',j.snapshot->>'title'
    ) order by j.performed_on desc,j.created_at desc)
      from public.journal_entries j where j.created_by=p.id and j.visibility='public'),'[]'::jsonb),
    'inspirations',coalesce((select jsonb_agg(jsonb_build_object(
      'id',i.id,'title',i.title,'mood',i.mood,'mediaId',i.id,
      'snapshot',jsonb_build_object('title',i.title,'mood',i.mood,'palette',i.snapshot->'palette','nails',i.snapshot->'nails')
    ) order by i.created_at desc)
      from public.inspirations i where i.created_by=p.id and i.is_public),'[]'::jsonb)
  ) into result
  from public.profiles p
  left join lateral (
    select owned.* from public.pro_profiles owned
    join public.workspaces w on w.id=owned.workspace_id
    where owned.user_id=p.id and owned.is_public
    order by case w.kind when 'pro' then 0 when 'institute' then 1 else 2 end,owned.created_at
    limit 1
  ) pp on true
  where p.username=normalized_handle and (
    p.discovery_visibility='everyone'
    or (p.discovery_visibility='pros' and exists(select 1 from public.profiles viewer where viewer.id=auth.uid() and viewer.account_tier='pro'))
  );
  if result is not null then return result; end if;

  select jsonb_build_object(
    'displayName',pp.display_name,
    'handle',w.public_handle,
    'accountType',case w.kind when 'pro' then 'independent' else w.kind end,
    'avatarHandle',w.public_handle,
    'bio',pp.bio,
    'city',pp.city,
    'styles',coalesce(pp.styles,'{}'::text[]),
    'journal',coalesce((select jsonb_agg(jsonb_build_object(
      'id',j.id,'performedOn',j.performed_on,'mediaId',j.id,'mood',j.snapshot->'mood',
      'colors',j.snapshot->'colors','title',j.snapshot->>'title'
    ) order by j.performed_on desc,j.created_at desc)
      from public.journal_entries j where j.workspace_id=w.id and j.visibility='public'),'[]'::jsonb),
    'inspirations',coalesce((select jsonb_agg(jsonb_build_object(
      'id',i.id,'title',i.title,'mood',i.mood,'mediaId',i.id,
      'snapshot',jsonb_build_object('title',i.title,'mood',i.mood,'palette',i.snapshot->'palette','nails',i.snapshot->'nails')
    ) order by i.created_at desc)
      from public.inspirations i where i.workspace_id=w.id and i.is_public),'[]'::jsonb)
  ) into result
  from public.workspaces w
  join public.pro_profiles pp on pp.workspace_id=w.id and pp.is_public
  join public.profiles owner on owner.id=w.owner_user_id and owner.account_tier='pro'
  where w.public_handle=normalized_handle and w.kind in ('pro','institute','creator');
  return result;
end $$;
revoke all on function public.get_public_profile(text) from public,authenticated,anon;
grant execute on function public.get_public_profile(text) to authenticated,anon;

commit;
