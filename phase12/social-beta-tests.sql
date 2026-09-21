begin;
create temp table social_test_users as select id,row_number() over(order by created_at,id) n from auth.users where email like '%@nailmoods-recette.invalid';
select set_config('test.a',(select id::text from social_test_users where n=1),true),set_config('test.b',(select id::text from social_test_users where n=2),true),set_config('test.c',(select id::text from social_test_users where n=3),true);
update public.profiles set username='socialtest'||(select n from social_test_users where social_test_users.id=profiles.id),discovery_visibility='everyone',account_tier='plus' where id in(select id from social_test_users where n<=3);
delete from private.social_connections where requester in(select id from social_test_users) and recipient in(select id from social_test_users);
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
select public.nm_social('request','{"handle":"socialtest2"}');
select public.nm_social('request','{"handle":"socialtest2"}');
select set_config('request.jwt.claim.sub',current_setting('test.b'),true);
select public.nm_social('request','{"handle":"socialtest1"}');
select public.nm_social('accept',jsonb_build_object('id',public.nm_social('list')->0->>'id'));
select public.nm_social('send',jsonb_build_object('user_id',current_setting('test.a'),'body','Test de recette temporaire','client_id',gen_random_uuid()));
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
select public.nm_social('history',jsonb_build_object('user_id',current_setting('test.b')));
select set_config('request.jwt.claim.sub',current_setting('test.c'),true);
do $$begin
 begin perform public.nm_social('history',jsonb_build_object('user_id',current_setting('test.b')));raise exception 'ISOLATION FAILED';exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub',current_setting('test.a'),true);
select public.nm_social('remove',jsonb_build_object('id',public.nm_social('list')->0->>'id'));
do $$begin
 begin perform public.nm_social('send',jsonb_build_object('user_id',current_setting('test.b'),'body','Blocked','client_id',gen_random_uuid()));raise exception 'REMOVAL FAILED';exception when insufficient_privilege then null;end;
end$$;
select 'PASS: connections, crossed request, messaging, C isolation, removal' as result;
rollback;
