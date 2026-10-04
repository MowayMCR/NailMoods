-- Additive projection. Existing visibility, entitlement, block and moderation guards
-- remain authoritative in private.get_public_profile. No private profile is returned.
create or replace function public.nm_public_profile_v2(p_handle text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb; pref jsonb; published jsonb:='{}'::jsonb; field text; universes jsonb;
begin
 result:=private.get_public_profile(p_handle);
 if result is null then return null;end if;
 select p.preferences->'nailmoodsProfile' into pref from public.profiles p
 where p.username=lower(trim(leading '@' from trim(p_handle))) and p.username=result->>'handle'
 and not private.nm_blocked(p.id) and private.effective_tier(p.id) in ('plus','pro')
 and (p.discovery_visibility='everyone' or (p.discovery_visibility='pros' and exists(
   select 1 from public.profiles viewer where viewer.id=auth.uid() and private.effective_tier(viewer.id)='pro'
 )));
 if pref is null then return result;end if;
 if pref#>>'{publicProfile,bio}'='true' and jsonb_typeof(pref->'bio')='string' then
  published:=published||jsonb_build_object('personalBio',left(pref->>'bio',300));
 end if;
 if pref#>>'{publicProfile,universes}'='true' and jsonb_typeof(pref->'styles')='array' then
  select coalesce(jsonb_agg(value),'[]'::jsonb) into universes from (select value from jsonb_array_elements(pref->'styles') where jsonb_typeof(value)='string' and length(value#>>'{}')<=80 limit 100) limited;
  published:=published||jsonb_build_object('universes',universes);
 end if;
 if pref#>>'{publicProfile,preferences}'='true' then
  for field in select unnest(array['shape','length','level','duration','technique']) loop
   if jsonb_typeof(pref->field)='string' then published:=jsonb_set(published,array['preferences'],coalesce(published->'preferences','{}'::jsonb)||jsonb_build_object(field,left(pref->>field,80)));end if;
  end loop;
 end if;
 return result||published;
end $$;
revoke all on function public.nm_public_profile_v2(text) from public,anon;
grant execute on function public.nm_public_profile_v2(text) to authenticated;
comment on function public.nm_public_profile_v2(text) is 'DA06: explicit per-section opt-in, after original get_public_profile authorization.';
