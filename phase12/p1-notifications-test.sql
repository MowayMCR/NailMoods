-- Transaction-only fixtures: no persistent message or relation changes.
begin;
delete from private.social_connections where least(requester,recipient)=least('108100ff-e8e5-4a91-bb5d-d3a3b8f208e1'::uuid,'42623ae8-1f1b-475f-bf0f-0e08114a4462'::uuid) and greatest(requester,recipient)=greatest('108100ff-e8e5-4a91-bb5d-d3a3b8f208e1'::uuid,'42623ae8-1f1b-475f-bf0f-0e08114a4462'::uuid);
set local role authenticated;
select set_config('request.jwt.claim.sub','108100ff-e8e5-4a91-bb5d-d3a3b8f208e1',true);
select public.nm_social('request','{"handle":"social.fixture.b"}');
select set_config('request.jwt.claim.sub','42623ae8-1f1b-475f-bf0f-0e08114a4462',true);
DO $$ declare relation jsonb;begin
 if not exists(select 1 from public.user_notifications where kind='connection_request' and actor_id='108100ff-e8e5-4a91-bb5d-d3a3b8f208e1' and user_id=auth.uid()) then raise exception 'request_notification_missing';end if;
 select value into relation from jsonb_array_elements(public.nm_social('list')) where value->>'handle'='social.fixture.a';
 perform public.nm_social('accept',jsonb_build_object('id',relation->>'id'));
end $$;
select public.nm_social('send',jsonb_build_object('user_id','108100ff-e8e5-4a91-bb5d-d3a3b8f208e1','body','P1 transaction rollback only','client_id',gen_random_uuid()));
select set_config('request.jwt.claim.sub','108100ff-e8e5-4a91-bb5d-d3a3b8f208e1',true);
DO $$ begin
 if not exists(select 1 from public.user_notifications where kind='connection_accepted' and actor_id='42623ae8-1f1b-475f-bf0f-0e08114a4462') then raise exception 'accepted_notification_missing';end if;
 if not exists(select 1 from public.user_notifications where kind='message' and actor_id='42623ae8-1f1b-475f-bf0f-0e08114a4462' and read_at is null) then raise exception 'message_notification_missing';end if;
 if exists(select 1 from public.user_notifications where user_id<>auth.uid()) then raise exception 'notification_leak';end if;
 perform public.nm_social('read',jsonb_build_object('user_id','42623ae8-1f1b-475f-bf0f-0e08114a4462','through',now()));
 if exists(select 1 from public.user_notifications where actor_id='42623ae8-1f1b-475f-bf0f-0e08114a4462' and kind='message' and read_at is null and created_at<=now()) then raise exception 'message_notification_not_read';end if;
 begin update public.user_notifications set actor_id=auth.uid() where user_id=auth.uid();raise exception 'actor_tampering_allowed';exception when insufficient_privilege then null;end;
end $$;
reset role;
update public.pro_profiles set is_public=true where workspace_id='50d68b83-bfad-4849-a373-33f595e93dc0';
set local role authenticated;
select public.send_nailmoods_share_to_po('50d68b83-bfad-4849-a373-33f595e93dc0','p1-transaction-only','{"title":"P1 rollback test","colors":["#aa4477"],"techniques":["Uni / duo"],"requirements":[],"source_type":"inspiration","level":"simple"}'::jsonb);
select set_config('request.jwt.claim.sub','42623ae8-1f1b-475f-bf0f-0e08114a4462',true);
DO $$ begin if not exists(select 1 from public.user_notifications where user_id=auth.uid() and actor_id='108100ff-e8e5-4a91-bb5d-d3a3b8f208e1' and kind='inspiration') then raise exception 'share_notification_missing';end if;end $$;
select 'PASS request / acceptance / message / read / isolation / actor protected / share notification' as result;
rollback;
