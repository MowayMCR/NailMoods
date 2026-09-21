create or replace function private.discovery_preview(s jsonb) returns jsonb language sql immutable set search_path='' as $$
 select case when jsonb_typeof(s->'nails')='array' then jsonb_build_object('shape',left(s->>'shape',32),'length',left(s->>'length',32),'description','Composition publiée','nails',
 (select coalesce(jsonb_agg(jsonb_build_object(
 'color',case when n->>'color' ~ '^#[0-9a-fA-F]{6}$' then n->>'color' else '#b88699' end,
 'accentColor',case when n->>'accentColor' ~ '^#[0-9a-fA-F]{6}$' then n->>'accentColor' else '#ffffff' end,
 'finish',left(n->>'finish',32),'effect',left(n->>'effect',32),'drawing',left(n->>'drawing',24),
 'decoration',case when n->'decoration' is not null then jsonb_build_object('motif',left(n->'decoration'->>'motif',24),'color',case when n->'decoration'->>'color' ~ '^#[0-9a-fA-F]{6}$' then n->'decoration'->>'color' else '#d4af37' end) else null end
 ) order by ord),'[]') from jsonb_array_elements(s->'nails') with ordinality e(n,ord) where ord<=5)) else null end;
$$;
revoke all on function private.discovery_preview(jsonb) from public,anon,authenticated;
create or replace function private.nm_discover(p_action text,p_data jsonb default '{}') returns jsonb language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid(); result jsonb; rows jsonb; off integer:=least(greatest(coalesce((p_data->>'offset')::int,0),0),10000); item_id uuid;
begin
 if not private.discovery_allowed() then raise exception 'plus_or_pro_required' using errcode='42501';end if;
 if p_action not in ('discover','favorites','add','remove','detail') then raise exception 'unknown_action';end if;
 if p_action in ('add','remove','detail') then item_id=(p_data->>'id')::uuid;end if;
 if p_action='remove' then delete from private.social_favorites where user_id=me and kind=p_data->>'kind' and entity_id=item_id;return '{"ok":true}';end if;
 with contents as (
 select 'inspiration'::text kind,i.id,i.created_by owner,i.workspace_id,i.title,i.snapshot,i.created_at from public.inspirations i where i.is_public
 union all select 'journal',j.id,j.created_by,j.workspace_id,j.snapshot->>'title',j.snapshot,j.created_at from public.journal_entries j where j.visibility='public'
 ), visible as (
 select c.*,case when pp.is_public and p.account_tier='pro' then coalesce(w.public_handle,p.username) else p.username end handle,
 p.display_name,case when p.account_tier='pro' then 'pro' else 'user' end profile_type,coalesce(c.snapshot->'publicTags','{}') tags
 from contents c join public.profiles p on p.id=c.owner join public.workspaces w on w.id=c.workspace_id left join public.pro_profiles pp on pp.workspace_id=w.id
 where private.discovery_visible(c.owner,c.workspace_id)
 ), page as (
 select v.kind,v.id,v.title,v.handle,v.display_name as "displayName",v.profile_type as "profileType",v.tags,private.discovery_preview(coalesce(v.snapshot->'idea',v.snapshot)) preview,v.created_at,
 exists(select 1 from private.social_favorites f where f.user_id=me and f.kind=v.kind and f.entity_id=v.id) saved
 from visible v where
 (p_action not in ('add','detail') or (v.id=item_id and v.kind=p_data->>'kind'))
 and (p_action<>'favorites' or exists(select 1 from private.social_favorites f where f.user_id=me and f.kind=v.kind and f.entity_id=v.id))
 and (coalesce(p_data->>'handle','')='' or v.handle=p_data->>'handle')
 and (coalesce(p_data->>'query','')='' or concat_ws(' ',v.title,v.handle,v.tags::text) ilike '%'||left(trim(leading '@' from p_data->>'query'),80)||'%')
 and (coalesce(p_data->'filters'->>'profile','')='' or v.profile_type=p_data->'filters'->>'profile')
 and not exists(select 1 from jsonb_each_text(coalesce(p_data->'filters','{}')) f where f.key<>'profile' and f.value<>'' and not coalesce((v.tags->f.key)?f.value,false))
 order by v.created_at desc,v.id,v.kind limit 21 offset case when p_action in ('add','detail') then 0 else off end
 ) select coalesce(jsonb_agg(to_jsonb(page)),'[]') into rows from page;
 if p_action in ('add','detail') then
 if jsonb_array_length(rows)=0 then raise exception 'content_unavailable' using errcode='42501';end if;
 if p_action='detail' then return rows->0;end if;
 insert into private.social_favorites(user_id,kind,entity_id) values(me,p_data->>'kind',item_id) on conflict do nothing;return '{"ok":true}';end if;
 select coalesce(jsonb_agg(value order by ord),'[]') into result from jsonb_array_elements(rows) with ordinality t(value,ord) where ord<=20;
 return jsonb_build_object('items',result,'hasMore',jsonb_array_length(rows)>20);
end $$;
CREATE OR REPLACE FUNCTION private.get_public_profile(p_handle text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare result jsonb; normalized_handle text:=lower(trim(leading '@' from trim(p_handle)));
begin
 if not private.discovery_allowed() then raise exception 'plus_or_pro_required' using errcode='42501';end if;
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
      'tags',coalesce(j.snapshot->'publicTags','{}'),'preview',private.discovery_preview(j.snapshot->'idea'),'colors',j.snapshot->'colors','title',j.snapshot->>'title'
    ) order by j.performed_on desc,j.created_at desc)
      from public.journal_entries j where j.created_by=p.id and j.visibility='public'),'[]'::jsonb),
    'inspirations',coalesce((select jsonb_agg(jsonb_build_object(
      'tags',coalesce(i.snapshot->'publicTags','{}'),'id',i.id,'title',i.title,'mood',i.mood,'mediaId',i.id,
      'snapshot',private.discovery_preview(i.snapshot)
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
      'tags',coalesce(j.snapshot->'publicTags','{}'),'preview',private.discovery_preview(j.snapshot->'idea'),'colors',j.snapshot->'colors','title',j.snapshot->>'title'
    ) order by j.performed_on desc,j.created_at desc)
      from public.journal_entries j where j.workspace_id=w.id and j.visibility='public'),'[]'::jsonb),
    'inspirations',coalesce((select jsonb_agg(jsonb_build_object(
      'tags',coalesce(i.snapshot->'publicTags','{}'),'id',i.id,'title',i.title,'mood',i.mood,'mediaId',i.id,
      'snapshot',private.discovery_preview(i.snapshot)
    ) order by i.created_at desc)
      from public.inspirations i where i.workspace_id=w.id and i.is_public),'[]'::jsonb)
  ) into result
  from public.workspaces w
  join public.pro_profiles pp on pp.workspace_id=w.id and pp.is_public
  join public.profiles owner on owner.id=w.owner_user_id and owner.account_tier='pro'
  where w.public_handle=normalized_handle and w.kind in ('pro','institute','creator');
  return result;
end $function$;

revoke all on function private.get_public_profile(text) from public,anon;
grant execute on function private.get_public_profile(text) to authenticated;
create or replace function public.get_public_profile(p_handle text) returns jsonb language sql security invoker set search_path='' as $$select private.get_public_profile(p_handle)$$;
revoke all on function public.get_public_profile(text) from public,anon;
grant execute on function public.get_public_profile(text) to authenticated;
