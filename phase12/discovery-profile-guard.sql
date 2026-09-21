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
      'tags',coalesce(j.snapshot->'publicTags','{}'),'colors',j.snapshot->'colors','title',j.snapshot->>'title'
    ) order by j.performed_on desc,j.created_at desc)
      from public.journal_entries j where j.created_by=p.id and j.visibility='public'),'[]'::jsonb),
    'inspirations',coalesce((select jsonb_agg(jsonb_build_object(
      'tags',coalesce(i.snapshot->'publicTags','{}'),'id',i.id,'title',i.title,'mood',i.mood,'mediaId',i.id,
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
      'tags',coalesce(j.snapshot->'publicTags','{}'),'colors',j.snapshot->'colors','title',j.snapshot->>'title'
    ) order by j.performed_on desc,j.created_at desc)
      from public.journal_entries j where j.workspace_id=w.id and j.visibility='public'),'[]'::jsonb),
    'inspirations',coalesce((select jsonb_agg(jsonb_build_object(
      'tags',coalesce(i.snapshot->'publicTags','{}'),'id',i.id,'title',i.title,'mood',i.mood,'mediaId',i.id,
      'snapshot',jsonb_build_object('title',i.title,'mood',i.mood,'palette',i.snapshot->'palette','nails',i.snapshot->'nails')
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
