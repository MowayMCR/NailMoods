-- Only decorative fields are projected, and every photo reference is re-authorized.
create or replace function private.scrap_number(v jsonb,lo numeric,hi numeric,fallback numeric) returns numeric
language sql immutable set search_path='' as $$ select case when jsonb_typeof(v)='number' then greatest(lo,least(hi,(v#>>'{}')::numeric)) else fallback end $$;
revoke all on function private.scrap_number(jsonb,numeric,numeric,numeric) from public,anon,authenticated;
create or replace function private.public_scrapbook(v jsonb,owner uuid,allowed jsonb) returns jsonb
language plpgsql stable set search_path='' as $$
declare n jsonb;nodes jsonb:='[]';item jsonb;ref uuid;bg text;seen text[]:='{}';kind text;asset text;i int;
begin
 if v is null or v->'version' is distinct from '1'::jsonb or jsonb_typeof(v->'nodes') is distinct from 'array' or octet_length(v::text)>20000 then return null;end if;
 bg:=v->>'background';if bg is null or bg!~'^(soft|dark|cottage|pop)-[0-3]$' then bg:='soft-0';end if;
 for n in select value from jsonb_array_elements(v->'nodes') limit 32 loop
  kind:=n->>'type';asset:=n->>'asset';
  if kind is null or kind not in('photo','sticker','tape','text') or jsonb_typeof(n->'id') is distinct from 'string' or length(n->>'id') not between 1 and 80 or (n->>'id')=any(seen) then continue;end if;
  if kind in('sticker','tape') then
   if asset is null or not (asset~'^(soft|dark|cottage|pop)-([0-9]|1[01])$' or (kind='sticker' and asset~'^tech-([0-9]|1[0-5])$')) then continue;end if;
   i:=split_part(asset,'-',2)::int;
   if (kind='sticker' and asset!~'^tech-' and i>7) or (kind='tape' and i<8) then continue;end if;
  end if;
  item:=jsonb_build_object('id',n->>'id','type',kind,'x',private.scrap_number(n->'x',8,92,50),'y',private.scrap_number(n->'y',8,92,50),'w',private.scrap_number(n->'w',10,65,30),'rotate',private.scrap_number(n->'rotate',-45,45,0));
  if kind='photo' then
   ref:=null;
   select j.id into ref from public.journal_entries j
    where j.created_by=owner and j.visibility='public' and not private.nm_blocked(j.created_by)
     and (j.id::text=n->>'ref' or j.snapshot->>'id'=n->>'ref')
     and exists(select 1 from jsonb_array_elements(allowed) a where coalesce(a->>'kind','journal')='journal' and coalesce(a->>'mediaId',a->>'id')=j.id::text) limit 1;
   if ref is null then continue;end if;
   item:=item||jsonb_build_object('ref',ref,'frame',case when n->>'frame' in('classic','torn','gold') then n->>'frame' else 'classic' end);
  elsif kind='text' then item:=item||jsonb_build_object('text',case when jsonb_typeof(n->'text')='string' then left(n->>'text',160) else '' end,'color',case when n->>'color' in('cassis','ink','sage') then n->>'color' else 'cassis' end);
  else item:=item||jsonb_build_object('asset',asset);end if;
  nodes:=nodes||jsonb_build_array(item);seen:=array_append(seen,n->>'id');
 end loop;
 return jsonb_build_object('version',1,'background',bg,'nodes',nodes);
end $$;
revoke all on function private.public_scrapbook(jsonb,uuid,jsonb) from public,anon,authenticated;
create or replace function private.nm_pose_book(p_action text,p_data jsonb default '{}'::jsonb) returns jsonb
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
    'scrapbook',private.public_scrapbook(j.snapshot->'scrapbook',j.created_by,entries),'owner',j.created_by=me,'saved',exists(select 1 from private.social_favorites f where f.user_id=me and f.kind='journal' and f.entity_id=j.id),
    'hearts',(select count(*) from private.social_favorites f where f.kind='journal' and f.entity_id=j.id and f.user_id<>j.created_by),
    'featured',exists(select 1 from private.pose_book_featured b where b.journal_id=j.id and b.owner_id=j.created_by)) order by e.ord),'[]') into result
  from jsonb_array_elements(entries) with ordinality as e(item,ord)
  join public.journal_entries j on j.id::text=coalesce(e.item->>'mediaId',e.item->>'id')
  where coalesce(e.item->>'kind','journal')='journal' and j.visibility='public' and not private.nm_blocked(j.created_by);
  return result;
 end if;
 raise exception 'unknown_book_action';
end $$;
