begin;
-- Search only the already authorised public projection. No private product metadata.
create function private.ai_search_norm(value text) returns text language sql immutable set search_path='' as $$
 select trim(regexp_replace(translate(lower(coalesce(value,'')),'àâäéèêëîïôöùûüç','aaaeeeeiioouuuc'),'[^a-z0-9]+',' ','g'))
$$;
create function private.ai_search_match(haystack text,data jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare term text;terms jsonb;hay text:=private.ai_search_norm(haystack);
begin
 if length(coalesce(data->>'query',''))>80 then return false;end if;
 if jsonb_typeof(data->'searchTerms')='array' then terms:=data->'searchTerms';
 else select coalesce(jsonb_agg(value),'[]') into terms from regexp_split_to_table(private.ai_search_norm(data->>'query'),' +') value where value<>'';end if;
 if jsonb_array_length(terms)>12 then return false;end if;
 for term in select jsonb_array_elements_text(terms) loop
  if length(term)>80 then return false;end if;
  term:=private.ai_search_norm(term);
  if term<>'' and position(' '||term||' ' in ' '||hay||' ')=0 then return false;end if;
 end loop;
 return true;
end $$;
revoke all on function private.ai_search_norm(text),private.ai_search_match(text,jsonb) from public,anon,authenticated;
CREATE OR REPLACE FUNCTION private.nm_discover(p_action text, p_data jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare me uuid:=auth.uid(); result jsonb; rows jsonb; off integer:=least(greatest(coalesce((p_data->>'offset')::int,0),0),10000); item_id uuid;
begin
 if not private.discovery_allowed() then raise exception 'plus_or_pro_required' using errcode='42501';end if;
 if p_action not in ('discover','favorites','add','remove','detail') then raise exception 'unknown_action';end if;
 if p_action in ('add','remove','detail') then item_id=(p_data->>'id')::uuid;end if;
 if p_action='remove' then delete from private.social_favorites where user_id=me and kind=p_data->>'kind' and entity_id=item_id;return '{"ok":true}';end if;
 with contents as materialized (
 select 'inspiration'::text kind,i.id,i.created_by owner,i.workspace_id,i.title,i.snapshot,i.created_at from public.inspirations i where i.is_public
 union all select 'journal',j.id,j.created_by,j.workspace_id,j.snapshot->>'title',j.snapshot,j.created_at from public.journal_entries j where j.visibility='public'
 ), permissions as materialized (
 select scope.owner,scope.workspace_id,private.discovery_visible(scope.owner,scope.workspace_id) allowed
 from (select distinct owner,workspace_id from contents) scope
 ), visible as (
 select c.*,case when pp.is_public and p.account_tier='pro' then coalesce(w.public_handle,p.username) else p.username end handle,
 p.display_name,case when p.account_tier='pro' then 'pro' else 'user' end profile_type,coalesce(c.snapshot->'publicTags','{}') tags
 from contents c join public.profiles p on p.id=c.owner join public.workspaces w on w.id=c.workspace_id left join public.pro_profiles pp on pp.workspace_id=w.id
 join permissions perm on perm.owner=c.owner and perm.workspace_id=c.workspace_id
 where perm.allowed
 ), page as (
 select v.kind,v.id,v.title,v.handle,v.display_name as "displayName",v.profile_type as "profileType",v.tags,private.discovery_preview(coalesce(v.snapshot->'idea',v.snapshot)) preview,v.created_at,
 exists(select 1 from private.social_favorites f where f.user_id=me and f.kind=v.kind and f.entity_id=v.id) saved
 from visible v where
 (p_action not in ('add','detail') or (v.id=item_id and v.kind=p_data->>'kind'))
 and (p_action<>'favorites' or exists(select 1 from private.social_favorites f where f.user_id=me and f.kind=v.kind and f.entity_id=v.id))
 and (coalesce(p_data->>'handle','')='' or v.handle=p_data->>'handle')
 and private.ai_search_match(concat_ws(' ',v.title,v.handle,v.tags::text),p_data)
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
end $function$;
commit;
