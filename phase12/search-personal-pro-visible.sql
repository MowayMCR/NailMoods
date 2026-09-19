-- Phase 12 recette correction: a Pro user's personal NailMoods ID follows the
-- same discovery_visibility choice as a Plus personal profile. The Pro
-- workspace remains a separate public identity and still requires is_public.
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

revoke all on function private.search_nailmoods(text,text,text) from public,anon;
grant execute on function private.search_nailmoods(text,text,text) to authenticated;
