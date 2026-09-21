begin;
-- Isolated existing test identities. All fixture mutations roll back.
update public.profiles set discovery_visibility='everyone' where username in ('social.fixture.a','social.fixture.b');
insert into public.journal_entries(id,workspace_id,created_by,performed_on,visibility,snapshot,notes)
select gen_random_uuid(),'472859d9-0c09-4dbf-a307-d6ff7289b537','108100ff-e8e5-4a91-bb5d-d3a3b8f208e1',current_date,'public',jsonb_build_object('title','DISCOVERY_ROLLBACK_'||n,'publicTags','{"moods":["Witchy","NOT_ALLOWED"],"colors":["Violet"],"techniques":["Stickers"]}'::jsonb),'PRIVATE_NOTE_NEVER_RETURNED' from generate_series(1,22) n;
set local role authenticated;
select set_config('request.jwt.claim.sub','42623ae8-1f1b-475f-bf0f-0e08114a4462',true);
DO $$ declare result jsonb; item jsonb; id uuid; begin
 result=public.nm_discover('discover','{"query":"DISCOVERY_ROLLBACK_","filters":{"moods":"Witchy","colors":"Violet","profile":"user"}}');
 if jsonb_array_length(result->'items')<>20 or not (result->>'hasMore')::boolean then raise exception 'pagination_first';end if;
 if result::text like '%PRIVATE_NOTE%' or result::text like '%NOT_ALLOWED%' then raise exception 'metadata_leak';end if;
 if jsonb_array_length(public.nm_discover('discover','{"query":"DISCOVERY_ROLLBACK_","offset":20}')->'items')<>2 then raise exception 'pagination_next';end if;
 if jsonb_array_length(public.nm_discover('discover','{"query":"DISCOVERY_ROLLBACK_","filters":{"colors":"Rose"}}')->'items')<>0 then raise exception 'combined_filter';end if;
 item=result->'items'->0;id=(item->>'id')::uuid;
 perform public.nm_discover('add',item);
 if jsonb_array_length(public.nm_discover('favorites','{"query":"DISCOVERY_ROLLBACK_"}')->'items')<>1 then raise exception 'favorite';end if;
 if public.nm_discover('detail',item)->>'id'<>id::text then raise exception 'detail';end if;
 if not public.nm_media_access('journal',id) then raise exception 'public_media';end if;
 if exists(select 1 from public.journal_entries where created_by='108100ff-e8e5-4a91-bb5d-d3a3b8f208e1') then raise exception 'direct_table_leak';end if;
 perform set_config('test.item',item::text,true);
end $$;
reset role;
update public.journal_entries set visibility='private' where id=(current_setting('test.item')::jsonb->>'id')::uuid;
set local role authenticated;
DO $$ begin
 if jsonb_array_length(public.nm_discover('favorites','{"query":"DISCOVERY_ROLLBACK_"}')->'items')<>0 then raise exception 'private_favorite_leak';end if;
 if public.nm_media_access('journal',(current_setting('test.item')::jsonb->>'id')::uuid) then raise exception 'private_media_leak';end if;
 begin perform public.nm_discover('detail',current_setting('test.item')::jsonb);raise exception 'private_detail_leak';exception when insufficient_privilege then null;end;
 if public.get_public_profile('social.fixture.a')::text like '%'||(current_setting('test.item')::jsonb->>'id')||'%' then raise exception 'private_profile_leak';end if;
end $$;
reset role;
update public.profiles set account_tier='free' where username='social.fixture.b';
set local role authenticated;
DO $$ begin
 begin perform public.nm_discover('discover');raise exception 'free_discovery_leak';exception when insufficient_privilege then null;end;
 begin perform public.get_public_profile('social.fixture.a');raise exception 'free_profile_leak';exception when insufficient_privilege then null;end;
 if public.nm_media_access('journal',(current_setting('test.item')::jsonb->>'id')::uuid) then raise exception 'free_media_leak';end if;
end $$;
reset role;
update public.profiles set account_tier='plus' where username='social.fixture.b';
set local role authenticated;
DO $$ begin
 if jsonb_array_length(public.nm_discover('discover','{"query":"DISCOVERY_ROLLBACK_"}')->'items')<>20 then raise exception 'plus_access';end if;
end $$;
reset role;
set local role anon;
DO $$ begin
 begin perform public.nm_discover('discover');raise exception 'anon_discovery_leak';exception when insufficient_privilege then null;end;
 begin perform public.get_public_profile('social.fixture.a');raise exception 'anon_profile_leak';exception when insufficient_privilege then null;end;
end $$;
reset role;
select 'PASS: Pro / Plus / Free / anonymous, combined filters, 20+2 pagination, favorites, detail, private transition, profile, media authorization, RLS, tags allowlist, private notes' result;
rollback;
