-- Additive book metadata; existing journal, publication rules and favorites remain authoritative.
create table private.pose_book_featured (
 journal_id uuid primary key references public.journal_entries(id) on delete cascade,
 owner_id uuid not null references auth.users(id) on delete cascade,
 updated_at timestamptz not null default now()
);
alter table private.pose_book_featured enable row level security;
revoke all on private.pose_book_featured from public,anon,authenticated;
create index pose_book_featured_owner on private.pose_book_featured(owner_id);
create index if not exists social_favorites_entity on private.social_favorites(kind,entity_id);
create function private.nm_pose_book(p_action text,p_data jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path='' as $$
declare me uuid:=auth.uid();result jsonb;profile jsonb;entries jsonb;eid uuid;localid text;updated boolean;owner uuid;
begin
 perform private.require_adult_account();
 if to_regprocedure('private.nm_session_assert()') is not null then execute 'select private.nm_session_assert()';end if;
 if octet_length(p_data::text)>2000 then raise exception 'invalid_book_request';end if;
 if p_action='mine' then
  select coalesce(jsonb_agg(jsonb_build_object('id',j.id,'localId',j.snapshot->>'id','hearts',
   (select count(*) from private.social_favorites f where f.kind='journal' and f.entity_id=j.id and f.user_id<>j.created_by),
   'featured',exists(select 1 from private.pose_book_featured b where b.journal_id=j.id and b.owner_id=me) and j.visibility='public')),'[]') into result
  from (select id,snapshot,created_by,visibility from public.journal_entries where created_by=me order by performed_on desc,id limit 5000) j;
  return result;
 elsif p_action='feature' then
  perform private.require_feature('discovery');
  eid:=(p_data->>'id')::uuid;
  select created_by into owner from public.journal_entries where id=eid and visibility='public' for update;
  if owner is null or owner<>me then raise exception 'public_owned_pose_required' using errcode='42501';end if;
  if jsonb_typeof(p_data->'enabled')<>'boolean' then raise exception 'invalid_feature_flag';end if;
  if (p_data->>'enabled')::boolean then
   insert into private.pose_book_featured(journal_id,owner_id) values(eid,me) on conflict(journal_id) do update set updated_at=now(),owner_id=me;
  else delete from private.pose_book_featured where journal_id=eid and owner_id=me;end if;
  return jsonb_build_object('featured',(p_data->>'enabled')::boolean);
 elsif p_action='favorite' then
  perform private.require_feature('discovery');
  if jsonb_typeof(p_data->'saved')<>'boolean' then raise exception 'invalid_favorite_flag';end if;
  eid:=(p_data->>'id')::uuid;updated:=(p_data->>'saved')::boolean;
  -- Reuse the established server check, including current privacy/block/tier rules.
  perform private.nm_discover(case when updated then 'add' else 'remove' end,jsonb_build_object('id',eid,'kind','journal'));
  return jsonb_build_object('saved',updated);
 elsif p_action='read' then
  perform private.require_feature('discovery');
  profile:=private.pro_v2_public(left(p_data->>'handle',80));
  if profile is null then raise exception 'profile_unavailable' using errcode='42501';end if;
  entries:=coalesce(profile#>'{professional,portfolio}',profile->'journal','[]');
  -- Only IDs already allowed by the public projection may be enriched. Never return notes or private snapshots.
  select coalesce(jsonb_agg(e.item||jsonb_build_object('id',j.id,'kind','journal','tags',coalesce(j.snapshot->'publicTags','{}'),
    'owner',j.created_by=me,'saved',exists(select 1 from private.social_favorites f where f.user_id=me and f.kind='journal' and f.entity_id=j.id),
    'hearts',(select count(*) from private.social_favorites f where f.kind='journal' and f.entity_id=j.id and f.user_id<>j.created_by),
    'featured',exists(select 1 from private.pose_book_featured b where b.journal_id=j.id and b.owner_id=j.created_by)) order by e.ord),'[]') into result
  from jsonb_array_elements(entries) with ordinality as e(item,ord)
  join public.journal_entries j on j.id::text=coalesce(e.item->>'mediaId',e.item->>'id')
  where coalesce(e.item->>'kind','journal')='journal' and j.visibility='public' and not private.nm_blocked(j.created_by);
  return result;
 end if;
 raise exception 'unknown_book_action';
end $$;
revoke all on function private.nm_pose_book(text,jsonb) from public,anon;
grant execute on function private.nm_pose_book(text,jsonb) to authenticated;
create function public.nm_pose_book(p_action text,p_data jsonb default '{}'::jsonb) returns jsonb
language sql security invoker set search_path='' as $$select private.nm_pose_book(p_action,p_data)$$;
revoke all on function public.nm_pose_book(text,jsonb) from public,anon;
grant execute on function public.nm_pose_book(text,jsonb) to authenticated;
