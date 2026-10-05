begin;
-- Put the legacy privileged review implementation behind an invoker wrapper.
do $move$ declare def text;begin
 select pg_get_functiondef('public.nm_publication_review(text,text,uuid)'::regprocedure) into def;
 def:=replace(def,'FUNCTION public.nm_publication_review(', 'FUNCTION private.nm_publication_review(');execute def;
end $move$;
create or replace function public.nm_publication_review(p_action text,p_kind text default null,p_id uuid default null) returns jsonb language sql security invoker set search_path='' as $$select private.nm_publication_review(p_action,p_kind,p_id)$$;
revoke all on function private.nm_publication_review(text,text,uuid),public.nm_publication_review(text,text,uuid) from public,anon;
grant execute on function private.nm_publication_review(text,text,uuid),public.nm_publication_review(text,text,uuid) to authenticated;
-- Existing authorized editors can retain a co-editor's previously attached image.
do $edit$ declare def text;begin
 select pg_get_functiondef('private.pro_v2_save(uuid,jsonb)'::regprocedure) into def;
 def:=replace(def,$pattern$split_part(f->>'cover','/',1)<>actor::text$pattern$, $pattern$(split_part(f->>'cover','/',2) is distinct from wid::text or (split_part(f->>'cover','/',1)<>actor::text and not exists(select 1 from private.pro_showcase_details pd where pd.workspace_id=wid and pd.fields->>'cover'=f->>'cover')))$pattern$ );execute def;
 select pg_get_functiondef('private.pro_v2_item(uuid,uuid,text,jsonb)'::regprocedure) into def;
 def:=replace(def,$pattern$split_part(photo,'/',1)<>actor::text$pattern$, $pattern$(split_part(photo,'/',1)<>actor::text and not coalesce(prior.details->'photos' ? photo,false))$pattern$);execute def;
end $edit$;

create function private.pro_v2_editorial() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform private.require_feature('discovery');
 select coalesce(jsonb_agg(x.card),'[]') into result from (
 select jsonb_build_object('handle',w.public_handle,'displayName',p.display_name,'professionalType',d.professional_type,
 'entry',jsonb_build_object('id',i.id,'title',i.title,'details',i.details)) card
 from private.pro_showcase_items i join public.workspaces w on w.id=i.workspace_id
 join public.pro_profiles p on p.workspace_id=w.id join private.pro_showcase_details d on d.workspace_id=w.id
 where i.kind='publication' and i.visibility='public' and i.content_type='organic' and p.is_public and w.public_handle is not null and d.professional_type is not null
 and private.effective_tier(w.owner_user_id)='pro' and not private.nm_blocked(w.owner_user_id)
 and private.pro_v2_image_approved('pro_item',i.id,i.details#>>'{photos,0}')
 order by i.created_at desc,i.id limit 12) x;return result;
end $$;
create function public.nm_pro_editorial() returns jsonb language sql security invoker set search_path='' as $$select private.pro_v2_editorial()$$;
revoke all on function private.pro_v2_editorial(),public.nm_pro_editorial() from public,anon;
grant execute on function private.pro_v2_editorial(),public.nm_pro_editorial() to authenticated;
commit;
