-- Phase 12: authoritative plan checks and current visibility on every read.
create table if not exists private.discovery_terms(category text not null, label text not null, primary key(category,label));
alter table private.discovery_terms enable row level security;
revoke all on private.discovery_terms from public,anon,authenticated;
insert into private.discovery_terms(category,label) values
('moods','Classique'),
('moods','Simple'),
('moods','Contemporain'),
('moods','Romantique'),
('moods','Minimal'),
('moods','Girly'),
('moods','Clean girl'),
('moods','Old money'),
('moods','Witchy'),
('moods','Dark feminine'),
('moods','Goth'),
('moods','Cottagecore'),
('moods','Fairycore'),
('moods','Celestial'),
('moods','Coquette'),
('moods','Vintage'),
('moods','Grunge'),
('moods','Punk'),
('moods','Rock'),
('moods','Emo'),
('moods','Y2K'),
('moods','90s'),
('colors','Rose'),
('colors','Rouge'),
('colors','Bordeaux'),
('colors','Violet'),
('colors','Bleu'),
('colors','Vert'),
('colors','Jaune'),
('colors','Orange'),
('colors','Marron'),
('colors','Beige'),
('colors','Blanc'),
('colors','Noir'),
('colors','Gris'),
('colors','Doré'),
('colors','Argenté'),
('aesthetics','Épuré'),
('aesthetics','Doux'),
('aesthetics','Sombre'),
('aesthetics','Élégant'),
('aesthetics','Coloré'),
('aesthetics','Naturel'),
('aesthetics','Alternatif'),
('themes','Floral'),
('themes','Nature'),
('themes','Étoiles'),
('themes','Lune'),
('themes','Cœurs'),
('themes','Géométrique'),
('themes','Animalier'),
('themes','Halloween'),
('themes','Noël'),
('themes','Été'),
('themes','Automne'),
('themes','Hiver'),
('themes','Printemps'),
('levels','Débutant'),
('levels','Intermédiaire'),
('levels','Avancé'),
('techniques','Uni'),
('techniques','Duo alterné'),
('techniques','French'),
('techniques','Babyboomer'),
('techniques','Aura'),
('techniques','Dégradé'),
('techniques','Marbré'),
('techniques','Cat eye'),
('techniques','Stickers'),
('techniques','Stamping'),
('techniques','Dessin à main levée'),
('techniques','3D'),
('occasions','Tous les jours'),
('occasions','Travail'),
('occasions','Soirée'),
('occasions','Mariage'),
('occasions','Fête'),
('occasions','Vacances'),
('occasions','Rendez-vous'),
('shapes','Rond'),
('shapes','Ovale'),
('shapes','Amande'),
('shapes','Carré'),
('shapes','Carré arrondi'),
('shapes','Coffin'),
('shapes','Stiletto'),
('lengths','Court'),
('lengths','Moyen'),
('lengths','Long'),
('lengths','Très long'),
('finishes','Brillant'),
('finishes','Mat'),
('finishes','Pailleté'),
('finishes','Métallisé'),
('finishes','Chromé'),
('finishes','Irisé'),
('finishes','Transparent'),
('finishes','Jelly') on conflict do nothing;
create or replace function private.clean_discovery_tags(tags jsonb) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_object_agg(category,labels),'{}') from (
 select category,jsonb_agg(label order by label) labels from private.discovery_terms t
 where coalesce(tags->t.category,'[]') ? t.label group by category) s;
$$;
revoke all on function private.clean_discovery_tags(jsonb) from public,anon,authenticated;
create or replace function private.normalize_public_tags() returns trigger language plpgsql security definer set search_path='' as $$
begin
 new.snapshot=jsonb_set(coalesce(new.snapshot,'{}'),'{publicTags}',private.clean_discovery_tags(new.snapshot->'publicTags'));
 return new;
end $$;
revoke all on function private.normalize_public_tags() from public,anon,authenticated;
drop trigger if exists normalize_public_tags on public.inspirations;
create trigger normalize_public_tags before insert or update of snapshot on public.inspirations for each row execute function private.normalize_public_tags();
drop trigger if exists normalize_public_tags on public.journal_entries;
create trigger normalize_public_tags before insert or update of snapshot on public.journal_entries for each row execute function private.normalize_public_tags();
create index if not exists inspirations_public_created on public.inspirations(created_at desc,id) where is_public;
create index if not exists journal_public_created on public.journal_entries(created_at desc,id) where visibility='public';
create index if not exists inspirations_public_tags on public.inspirations using gin ((snapshot->'publicTags')) where is_public;
create index if not exists journal_public_tags on public.journal_entries using gin ((snapshot->'publicTags')) where visibility='public';
create or replace function private.discovery_allowed() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid() and account_tier in ('plus','pro'));
$$;
revoke all on function private.discovery_allowed() from public,anon,authenticated;
create or replace function private.discovery_visible(p_owner uuid,p_workspace uuid) returns boolean language sql stable security definer set search_path='' as $$
 select private.discovery_allowed() and exists(select 1 from public.profiles p where p.id=p_owner and (
 (p.username is not null and (p.discovery_visibility='everyone' or (p.discovery_visibility='pros' and exists(select 1 from public.profiles v where v.id=auth.uid() and v.account_tier='pro'))))
 or (p.account_tier='pro' and exists(select 1 from public.workspaces w join public.pro_profiles pp on pp.workspace_id=w.id where w.id=p_workspace and w.owner_user_id=p.id and pp.is_public and w.public_handle is not null))));
$$;
revoke all on function private.discovery_visible(uuid,uuid) from public,anon,authenticated;
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
 select v.kind,v.id,v.title,v.handle,v.display_name as "displayName",v.profile_type as "profileType",v.tags,v.created_at,
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
revoke all on function private.nm_discover(text,jsonb) from public,anon;
grant execute on function private.nm_discover(text,jsonb) to authenticated;
revoke all on function public.nm_discover(text,jsonb) from public,anon;
grant execute on function public.nm_discover(text,jsonb) to authenticated;
-- Media endpoint uses the same fresh authorization as discovery. Paths never leave it.
create or replace function private.nm_media_access(p_kind text,p_id uuid) returns boolean language plpgsql stable security definer set search_path='' as $$
declare owner_id uuid; workspace uuid; is_public boolean;
begin
 if auth.uid() is null then return false;end if;
 if p_kind='journal' then select created_by,workspace_id,visibility='public' into owner_id,workspace,is_public from public.journal_entries where id=p_id;
 elsif p_kind='inspiration' then select created_by,workspace_id,i.is_public into owner_id,workspace,is_public from public.inspirations i where id=p_id;
 else return false;end if;
 if owner_id is null then return false;end if;
 if exists(select 1 from public.workspace_members where workspace_id=workspace and user_id=auth.uid()) then return true;end if;
 return is_public and private.discovery_visible(owner_id,workspace);
end $$;
revoke all on function private.nm_media_access(text,uuid) from public,anon;
grant execute on function private.nm_media_access(text,uuid) to authenticated;
create or replace function public.nm_media_access(p_kind text,p_id uuid) returns boolean language sql set search_path='' as $$select private.nm_media_access(p_kind,p_id)$$;
revoke all on function public.nm_media_access(text,uuid) from public,anon;
grant execute on function public.nm_media_access(text,uuid) to authenticated;

CREATE OR REPLACE FUNCTION public.get_public_profile(p_handle text)
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

revoke all on function public.get_public_profile(text) from public,anon;
grant execute on function public.get_public_profile(text) to authenticated;
