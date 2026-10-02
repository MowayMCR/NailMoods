begin;
alter table private.apple_settings add column reconcile_url text;
alter table private.apple_subscriptions add column last_checked_at timestamptz;
create table private.apple_reconcile_nonces(nonce_hash text primary key,expires_at timestamptz not null);
alter table private.apple_reconcile_nonces enable row level security;
revoke all on private.apple_reconcile_nonces from public,anon,authenticated,service_role;
create function private.apple_schedule_reconciliation() returns bigint language plpgsql security definer set search_path='' as $$
declare cfg private.apple_settings; nonce text; u uuid;
begin
 -- Project expiry even when the app is absent or a notification is delayed.
 for u in select distinct user_id from private.apple_subscriptions loop perform private.google_play_refresh_profile(u);end loop;
 select * into cfg from private.apple_settings where singleton;
 if not cfg.enabled or cfg.reconcile_url is null then return null;end if;
 if cfg.reconcile_url !~ '^https://[a-z]+\.supabase\.co/functions/v1/apple-verify$' then raise exception 'invalid_reconciliation_url';end if;
 delete from private.apple_reconcile_nonces where expires_at<=clock_timestamp();
 nonce:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into private.apple_reconcile_nonces values(encode(sha256(convert_to(nonce,'UTF8')),'hex'),clock_timestamp()+interval '2 minutes');
 return net.http_post(url:=cfg.reconcile_url,headers:=jsonb_build_object('Content-Type','application/json','x-nm-reconcile-key',nonce),body:='{"action":"refresh"}',timeout_milliseconds:=120000);
end $$;
create function public.apple_scheduler_context(p_nonce text) returns jsonb language plpgsql security definer set search_path='' as $$
declare consumed text; batch jsonb; enabled boolean;
begin
 delete from private.apple_reconcile_nonces where nonce_hash=encode(sha256(convert_to(p_nonce,'UTF8')),'hex') and expires_at>clock_timestamp() returning nonce_hash into consumed;
 if consumed is null then raise exception 'invalid_scheduler_key' using errcode='42501';end if;
 select s.enabled into enabled from private.apple_settings s where singleton;
 with selected as (select environment,original_transaction_id from private.apple_subscriptions where status<>'revoked' order by coalesce(last_checked_at,last_verified_at) limit 10 for update skip locked),
 marked as(update private.apple_subscriptions s set last_checked_at=clock_timestamp() from selected x where s.environment=x.environment and s.original_transaction_id=x.original_transaction_id returning s.*)
 select coalesce(jsonb_agg(jsonb_build_object('userId',s.user_id,'transactionId',s.transaction_id,'environment',s.environment,'accountToken',t.account_token)),'[]') into batch from marked s join private.apple_account_tokens t on t.user_id=s.user_id;
 return jsonb_build_object('enabled',enabled,'subscriptions',batch);
end $$;
revoke all on function private.apple_schedule_reconciliation() from public,anon,authenticated,service_role;
revoke all on function public.apple_scheduler_context(text) from public,anon,authenticated;
grant execute on function public.apple_scheduler_context(text) to service_role;
select cron.schedule('nailmoods-apple-reconcile','*/5 * * * *','select private.apple_schedule_reconciliation();');
commit;
