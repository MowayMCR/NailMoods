create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;
do $$begin
 if not exists(select 1 from vault.secrets where name='MEDIA_CLEANUP_SECRET') then
 perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'MEDIA_CLEANUP_SECRET');end if;
 if not exists(select 1 from vault.secrets where name='RECETTE_RUNNER_SECRET') then
 perform vault.create_secret(encode(extensions.gen_random_bytes(32),'hex'),'RECETTE_RUNNER_SECRET');end if;
end$$;
create function public.check_worker_secret(p_name text,p_value text) returns boolean language sql security definer set search_path='' as $$
select p_name in ('MEDIA_CLEANUP_SECRET','RECETTE_RUNNER_SECRET') and exists(select 1 from vault.decrypted_secrets where name=p_name and decrypted_secret=p_value and length(p_value)>=64)
$$;
revoke all on function public.check_worker_secret(text,text) from public,anon,authenticated;
grant execute on function public.check_worker_secret(text,text) to service_role;
-- Secret is resolved at run time, never interpolated into the cron command.
select cron.schedule('nailmoods-recette-cleanup','*/5 * * * *',$job$
 select net.http_post(url:='https://pueqkbwfwxgqzmkauxoz.supabase.co/functions/v1/media-cleanup',headers:=jsonb_build_object('Content-Type','application/json','x-cleanup-secret',(select decrypted_secret from vault.decrypted_secrets where name='MEDIA_CLEANUP_SECRET')),body:='{}'::jsonb);
$job$);
