begin;
insert into auth.users(id,email,email_confirmed_at,raw_user_meta_data) values
 ('00000000-0000-4000-8000-000000000001','apple-fixture.invalid',now(),'{"terms_version":"0.5-beta","privacy_version":"0.7-beta"}'),
 ('00000000-0000-4000-8000-000000000002','apple-other.invalid',now(),'{"terms_version":"0.5-beta","privacy_version":"0.7-beta"}');
insert into private.apple_account_tokens(user_id,sandbox_enabled) values('00000000-0000-4000-8000-000000000001',true),('00000000-0000-4000-8000-000000000002',false);
update private.apple_settings set enabled=true;
do $$declare u uuid:='00000000-0000-4000-8000-000000000001'; v uuid:='00000000-0000-4000-8000-000000000002'; r jsonb; result jsonb;
begin
 if private.effective_tier(u)<>'free' then raise exception 'A: free';end if;
 r:=jsonb_build_object('environment','Sandbox','originalTransactionId','100','transactionId','101','productId','nailmoods_plus','tier','plus','status','active','startsAt',now()-interval '1 hour','expiresAt',now()+interval '1 day','autoRenewing',true,'signedAt',now(),'verifiedAt',now());
 result:=private.upsert_apple_subscription(u,r);
 if private.effective_tier(u)<>'plus' then raise exception 'B: plus';end if;
 result:=private.upsert_apple_subscription(u,r||'{"tier":"pro","productId":"nailmoods_pro","transactionId":"102"}');
 if private.effective_tier(u)<>'pro' then raise exception 'C/J: upgrade';end if;
 result:=private.upsert_apple_subscription(u,r||'{"status":"canceled"}');
 if private.effective_tier(u)<>'plus' then raise exception 'E/K: cancellation or downgrade';end if;
 result:=private.upsert_apple_subscription(u,r||'{"status":"grace"}');
 if private.effective_tier(u)<>'plus' then raise exception 'F: grace';end if;
 result:=private.upsert_apple_subscription(u,r||'{"status":"expired"}');
 if private.effective_tier(u)<>'free' then raise exception 'D: expired';end if;
 update private.account_entitlements set tier='pro',source='admin' where user_id=u;
 result:=private.upsert_apple_subscription(u,r||'{"status":"revoked"}');
 if private.effective_tier(u)<>'pro' then raise exception 'M/N/H: manual priority';end if;
 update private.account_entitlements set tier='plus' where user_id=u;
 if private.effective_tier(u)<>'plus' then raise exception 'L: manual plus';end if;
 result:=private.upsert_apple_subscription(u,r||'{"status":"billing_retry"}');
 if private.effective_tier(u)<>'plus' then raise exception 'manual on billing retry';end if;
 update private.account_entitlements set tier='free',source='signup' where user_id=u;
 result:=private.upsert_apple_subscription(u,r);
 if private.effective_tier(u)<>'plus' then raise exception 'I/R: restore';end if;
 if private.effective_tier(u)<>(private.google_play_entitlement_state(u)->>'tier') then raise exception 'P: Apple on Android';end if;
 update private.apple_account_tokens set sandbox_enabled=false where user_id=u;
 if private.effective_tier(u)<>'free' then raise exception 'Sandbox leaked into production';end if;
 update private.apple_account_tokens set sandbox_enabled=true where user_id=u;
 update private.apple_subscriptions set status='revoked' where user_id=u;
 insert into private.google_play_subscriptions(purchase_token_hash,purchase_token,user_id,status,items,last_verified_at,raw_state)
 values('apple-fixture','fake-test-token',u,'active',jsonb_build_array(jsonb_build_object('productId','nailmoods_pro','expiresAt',now()+interval '1 day')),now(),'SUBSCRIPTION_STATE_ACTIVE');
 if private.effective_tier(u)<>'pro' then raise exception 'O: Google on iPhone';end if;
 if (private.apple_server_context(u,'Sandbox')->>'canPurchase')::boolean then raise exception 'Duplicate cross-platform purchase';end if;
 delete from private.google_play_subscriptions where user_id=u;
 begin perform private.upsert_apple_subscription(v,r);raise exception 'missing sandbox guard';exception when others then if sqlerrm not like '%sandbox_account_required%' then raise;end if;end;
 -- Ownership is checked regardless of platform and no caller-controlled user id is exposed.
 update private.apple_account_tokens set sandbox_enabled=true where user_id=v;
 begin perform private.upsert_apple_subscription(v,r);raise exception 'ownership_missing';exception when others then if sqlerrm not like '%purchase_owned_by_another_account%' then raise;end if;end;
 if has_function_privilege('authenticated','public.upsert_apple_subscription(uuid,jsonb)','execute') then raise exception 'client can write purchases';end if;
 if has_table_privilege('authenticated','private.apple_account_tokens','update') then raise exception 'client can enable sandbox';end if;
 perform private.upsert_apple_subscription(v,r||'{"originalTransactionId":"200","transactionId":"201"}');
 delete from public.user_consents where user_id=v;
 delete from private.account_entitlements where user_id=v;
 delete from public.profiles where id=v;
 delete from auth.users where id=v;
 if exists(select 1 from private.apple_subscriptions where user_id=v) or exists(select 1 from private.apple_account_tokens where user_id=v) then raise exception 'Q/S: deleted account token survives';end if;
end $$;
rollback;
select 'PASS: Apple/Google/manual rights, expiry, cancellation, grace, refund, restore, upgrade/downgrade, Sandbox isolation, ownership, service-only writes, deletion' result;
