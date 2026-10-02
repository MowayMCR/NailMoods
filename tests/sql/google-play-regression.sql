-- Run only on Recette. Disposable rows and settings are rolled back at the end.
begin;
do $test$
declare
  u uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); v record; r jsonb; doc jsonb;
  stamp timestamptz:=clock_timestamp(); expiry timestamptz:=now()+interval '1 month';
  initial_source text; initial_expiry timestamptz; mismatch_rejected boolean:=false;
begin
  select * into v from private.nm_legal_versions();
  insert into auth.users(id,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
  select id,'billing-fixture-'||id::text||'@example.invalid',now(),'{}'::jsonb,
    jsonb_build_object('adult_confirmed',true,'terms_accepted',true,'terms_version',v.terms_version,'privacy_version',v.privacy_version),now(),now()
  from (values(u),(other_user)) ids(id);
  update private.google_play_settings set plus_base_plan='monthly',pro_base_plan='monthly';
  select source into initial_source from private.account_entitlements where user_id=u;
  doc:=jsonb_build_object('purchaseToken','fixture-'||u::text,'verifiedAt',stamp,'rawState','SUBSCRIPTION_STATE_ACTIVE','status','active',
    'items',jsonb_build_array(jsonb_build_object('productId','nailmoods_plus','basePlanId','monthly','expiresAt',expiry,'autoRenewing',true)));
  r:=public.upsert_google_play_subscription(u,doc);
  if r->>'tier'<>'plus' then raise exception 'FAIL plus granted'; end if;
  if (select source from private.account_entitlements where user_id=u) is distinct from initial_source then raise exception 'FAIL Google became admin'; end if;
  if (select account_tier from public.profiles where id=u)<>'plus' then raise exception 'FAIL projection'; end if;
  r:=public.upsert_google_play_subscription(u,doc||jsonb_build_object('status','canceled'));
  if r->>'tier'<>'plus' then raise exception 'FAIL canceled before expiry'; end if;
  r:=public.upsert_google_play_subscription(u,doc||jsonb_build_object('status','grace'));
  if r->>'tier'<>'plus' then raise exception 'FAIL grace'; end if;
  r:=public.upsert_google_play_subscription(u,doc||jsonb_build_object('status','on_hold'));
  if r->>'tier'<>'free' then raise exception 'FAIL hold'; end if;
  r:=public.upsert_google_play_subscription(u,doc||jsonb_build_object('status','pending'));
  if r->>'tier'<>'free' then raise exception 'FAIL pending grants access'; end if;
  r:=public.upsert_google_play_subscription(u,doc);
  begin perform public.upsert_google_play_subscription(other_user,doc);
  exception when insufficient_privilege then mismatch_rejected:=true; end;
  if not mismatch_rejected then raise exception 'FAIL token reassigned'; end if;
  -- Multiple verified products are ranked independently of refresh order.
  r:=public.upsert_google_play_subscription(u,doc||jsonb_build_object('purchaseToken','fixture-pro-'||u::text,
    'items',jsonb_build_array(jsonb_build_object('productId','nailmoods_pro','basePlanId','monthly','expiresAt',expiry,'autoRenewing',true))));
  r:=public.upsert_google_play_subscription(u,doc);
  if r->>'tier'<>'pro' then raise exception 'FAIL restoring Plus downgraded Pro'; end if;
  -- Valid manual/founder grants have exact priority and retain their expiry.
  insert into private.account_entitlements(user_id,tier,status,source,starts_at,expires_at)
  values(u,'plus','active','beta_invitation',now(),expiry)
  on conflict(user_id) do update set tier='plus',status='active',source='beta_invitation',starts_at=now(),expires_at=expiry;
  r:=public.upsert_google_play_subscription(u,doc||jsonb_build_object('status','expired'));
  if r->>'tier'<>'plus' or (r->>'manualPriority')::boolean is not true then raise exception 'FAIL founder priority'; end if;
  select expires_at into initial_expiry from private.account_entitlements where user_id=u;
  if initial_expiry is distinct from expiry then raise exception 'FAIL founder expiry erased'; end if;
  update public.profiles set account_tier='plus' where id=u;
  if (select expires_at from private.account_entitlements where user_id=u) is distinct from expiry then raise exception 'FAIL same-tier manual expiry erased'; end if;
  -- An ordinary manual Free row must not prevent a later paid purchase.
  update private.account_entitlements set tier='free',source='admin',expires_at=null where user_id=other_user;
  r:=public.google_play_server_context(other_user,true);
  if (r->>'manualPriority')::boolean then raise exception 'FAIL manual Free blocks purchase'; end if;
  -- Every client role is denied writes and token reads.
  if has_function_privilege('authenticated','public.upsert_google_play_subscription(uuid,jsonb)','execute')
    or has_function_privilege('anon','public.upsert_google_play_subscription(uuid,jsonb)','execute')
    or has_function_privilege('authenticated','public.google_play_tokens_for_user(uuid)','execute')
    or has_table_privilege('authenticated','private.google_play_subscriptions','select') then raise exception 'FAIL exposed purchase API'; end if;
  if not has_function_privilege('service_role','public.upsert_google_play_subscription(uuid,jsonb)','execute') then raise exception 'FAIL service cannot write'; end if;
  -- State exposes no purchase tokens and can be read only for auth.uid().
  perform set_config('request.jwt.claims',jsonb_build_object('sub',u,'role','authenticated')::text,true);
  r:=public.google_play_entitlement_state();
  if r::text like '%purchaseToken%' or r::text like '%purchase_token%' then raise exception 'FAIL token disclosure'; end if;
end $test$;
rollback;
select 'PASS: Google access, manual/founder priority, paid-through cancellation, pending/hold, restore order, token owner, projection and permissions' as result;
