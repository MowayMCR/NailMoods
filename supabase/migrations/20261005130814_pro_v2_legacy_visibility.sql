begin;
create function private.pro_v2_legacy_portfolio(wid uuid,k text,cid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (not exists(select 1 from private.pro_showcase_details where workspace_id=wid and professional_type is not null)
 or exists(select 1 from private.pro_portfolio_links l join public.workspace_members m on m.workspace_id=l.workspace_id and m.user_id=l.user_id where l.workspace_id=wid and l.kind=k and l.content_id=cid))
$$;
revoke all on function private.pro_v2_legacy_portfolio(uuid,text,uuid) from public,anon,authenticated;
-- Older Apple/Android clients must honor the same new portfolio opt-in.
do $legacy$ declare def text;begin
 select pg_get_functiondef('private.get_public_profile(text)'::regprocedure) into def;
 def:=replace(def,'from public.journal_entries j where j.workspace_id=w.id and', 'from public.journal_entries j where j.workspace_id=w.id and private.pro_v2_legacy_portfolio(w.id,''journal'',j.id) and');
 def:=replace(def,'from public.inspirations i where i.workspace_id=w.id and', 'from public.inspirations i where i.workspace_id=w.id and private.pro_v2_legacy_portfolio(w.id,''inspiration'',i.id) and');
 execute def;
end $legacy$;
create function private.pro_v2_public_item_details(iid uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare i private.pro_showcase_items;ids jsonb;
begin
 if auth.uid() is null then return '{}';end if;
 select * into i from private.pro_showcase_items where id=iid;
 if i.kind<>'collection' then return i.details;end if;
 select coalesce(jsonb_agg(p.id::text),'[]') into ids from private.pro_showcase_items p where p.id::text in (select jsonb_array_elements_text(coalesce(i.details->'productIds','[]')))
 and p.workspace_id=i.workspace_id and p.kind='product' and p.visibility='public' and private.pro_v2_image_approved('pro_item',p.id,p.details#>>'{photos,0}');
 return jsonb_set(i.details,'{productIds}',ids);
end $$;
revoke all on function private.pro_v2_public_item_details(uuid) from public,anon,authenticated;
do $project$ declare def text;begin
 select pg_get_functiondef('private.pro_v2_public(text)'::regprocedure) into def;
 def:=replace(def,'''details'',i.details,''claimStatus''','''details'',private.pro_v2_public_item_details(i.id),''claimStatus''');execute def;
end $project$;
commit;
