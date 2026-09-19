-- PREPARATION: not applied. Keep internal UUID relationships unchanged.
alter table public.profiles add column username text;
alter table public.profiles add column discovery_visibility text not null default 'pros' check(discovery_visibility in ('everyone','pros','nobody'));
alter table public.workspaces add column public_handle text;
-- Case-insensitive uniqueness; separate user/workspace namespaces, explicitly typed in search.
create unique index profiles_username_unique on public.profiles(lower(username)) where username is not null;
create unique index workspaces_handle_unique on public.workspaces(lower(public_handle)) where public_handle is not null;
alter table public.profiles add constraint username_format check(username is null or (username=lower(username) and username ~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$' and username not in ('admin','support','nailmoods','official','system')));
alter table public.workspaces add constraint public_handle_format check(public_handle is null or (kind<>'personal' and public_handle=lower(public_handle) and public_handle ~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$' and public_handle not in ('admin','support','nailmoods','official','system')));
-- Existing column grants on profiles prevent direct username/visibility modifications.
create function private.nailmoods_handle_available(p_handle text) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from auth.users where id=auth.uid())
 and lower(trim(p_handle)) ~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$'
 and lower(trim(p_handle)) not in ('admin','support','nailmoods','official','system')
 and not exists(select 1 from public.profiles where lower(username)=lower(trim(p_handle)) and id<>auth.uid())
$$;
create function private.set_nailmoods_identity(p_handle text,p_visibility text,p_display_name text) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'confirmed_account_required' using errcode='42501'; end if;
 if p_handle is null or lower(trim(p_handle)) !~ '^[a-z0-9][a-z0-9._]{1,28}[a-z0-9]$' or lower(trim(p_handle)) in ('admin','support','nailmoods','official','system') then raise exception 'invalid_handle'; end if;
 if p_display_name is null or length(trim(p_display_name)) not between 1 and 80 or p_visibility not in ('everyone','pros','nobody') then raise exception 'invalid_identity'; end if;
 -- Unique index handles concurrent claims; no client availability result authorizes a claim.
 update public.profiles set username=lower(trim(p_handle)),discovery_visibility=p_visibility,display_name=trim(p_display_name),preferences=jsonb_set(preferences,'{nailmoodsProfile}',coalesce(preferences->'nailmoodsProfile','{}'::jsonb)||jsonb_build_object('name',trim(p_display_name)),true) where id=auth.uid();
end $$;
create function private.search_nailmoods(p_query text,p_kind text,p_city text) returns table(entity_type text,entity_id uuid,handle text,display_name text,kind text,avatar_url text,city text,bio text,styles text[])
language sql stable security definer set search_path='' as $$
 with request as (
 select lower(trim(leading '@' from trim(p_query))) as q,
 exists(select 1 from public.profiles where id=auth.uid() and account_tier='pro') as is_pro
 where auth.uid() is not null and exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null)
 and length(trim(p_query)) between 2 and 80
 ), visible as (
 select 'user'::text as entity_type,p.id as entity_id,p.username as handle,p.display_name,
 case when p.account_tier='pro' then 'personal_pro' else 'plus' end::text as kind,
 null::text as avatar_url,null::text as city,null::text as bio,array[]::text[] as styles
 from public.profiles p cross join request r where p.account_tier in ('plus','pro') and p.username is not null
 and (p.discovery_visibility='everyone' or (p.discovery_visibility='pros' and r.is_pro))
 union all
 select 'workspace',w.id,w.public_handle,pp.display_name,w.kind,pp.avatar_url,pp.city,pp.bio,pp.styles
 from public.pro_profiles pp join public.workspaces w on w.id=pp.workspace_id join public.profiles owner on owner.id=w.owner_user_id
 where pp.is_public and w.public_handle is not null and w.kind in ('pro','institute','creator') and owner.account_tier='pro'
 )
 select v.* from visible v cross join request r
 where (position(r.q in lower(v.handle))>0 or position(r.q in lower(v.display_name))>0)
 and (p_kind is null or v.kind=p_kind) and (p_city is null or position(lower(p_city) in lower(v.city))>0)
 order by case when lower(v.handle)=r.q then 0 when starts_with(lower(v.handle),r.q) then 1 when lower(v.display_name)=r.q then 2 else 3 end,v.display_name,v.entity_id limit 30
$$;
-- Definer helpers stay private; public wrappers are invokers with explicit grants.
revoke all on function private.nailmoods_handle_available(text) from public,anon;
revoke all on function private.set_nailmoods_identity(text,text,text) from public,anon;
revoke all on function private.search_nailmoods(text,text,text) from public,anon;
grant execute on function private.nailmoods_handle_available(text),private.set_nailmoods_identity(text,text,text),private.search_nailmoods(text,text,text) to authenticated;
create function public.nailmoods_handle_available(p_handle text) returns boolean language sql security invoker set search_path='' as $$ select private.nailmoods_handle_available(p_handle) $$;
create function public.set_nailmoods_identity(p_handle text,p_visibility text,p_display_name text) returns void language sql security invoker set search_path='' as $$ select private.set_nailmoods_identity(p_handle,p_visibility,p_display_name) $$;
create function public.search_nailmoods(p_query text,p_kind text default null,p_city text default null) returns table(entity_type text,entity_id uuid,handle text,display_name text,kind text,avatar_url text,city text,bio text,styles text[]) language sql security invoker set search_path='' as $$ select * from private.search_nailmoods(p_query,p_kind,p_city) $$;
revoke all on function public.nailmoods_handle_available(text),public.set_nailmoods_identity(text,text,text),public.search_nailmoods(text,text,text) from public,anon;
grant execute on function public.nailmoods_handle_available(text),public.set_nailmoods_identity(text,text,text),public.search_nailmoods(text,text,text) to authenticated;
