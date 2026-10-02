begin;
create table private.media_cleanup_nonces(nonce_hash text primary key, expires_at timestamptz not null);
alter table private.media_cleanup_nonces enable row level security;
revoke all on private.media_cleanup_nonces from public,anon,authenticated,service_role;

create function private.media_cleanup_schedule(p_url text) returns bigint
language plpgsql security definer set search_path='' as $$
declare nonce text;
begin
 if p_url !~ '^https://[a-z]+\.supabase\.co/functions/v1/media-cleanup$' then raise exception 'invalid_cleanup_url';end if;
 delete from private.media_cleanup_nonces where expires_at<=clock_timestamp();
 nonce:=replace(gen_random_uuid()::text,'-','')||replace(gen_random_uuid()::text,'-','');
 insert into private.media_cleanup_nonces values(encode(sha256(convert_to(nonce,'UTF8')),'hex'),clock_timestamp()+interval '2 minutes');
 return net.http_post(url:=p_url,headers:=jsonb_build_object('Content-Type','application/json','x-nm-cleanup-key',nonce),body:='{}',timeout_milliseconds:=120000);
end $$;

create function public.consume_media_cleanup_nonce(p_nonce text) returns boolean
language plpgsql security definer set search_path='' as $$
declare consumed text;
begin
 if p_nonce is null or p_nonce !~ '^[a-f0-9]{64}$' then return false;end if;
 delete from private.media_cleanup_nonces
 where nonce_hash=encode(sha256(convert_to(p_nonce,'UTF8')),'hex') and expires_at>clock_timestamp()
 returning nonce_hash into consumed;
 return consumed is not null;
end $$;
revoke all on function private.media_cleanup_schedule(text) from public,anon,authenticated,service_role;
revoke all on function public.consume_media_cleanup_nonce(text) from public,anon,authenticated;
grant execute on function public.consume_media_cleanup_nonce(text) to service_role;

-- Preserve existing project URL, name, schedule and active flag. No generated IDs.
do $$ declare job record; url text;
begin
 for job in select jobid,command from cron.job where command like '%/functions/v1/media-cleanup%' loop
  url:=substring(job.command from 'https://[a-z]+\.supabase\.co/functions/v1/media-cleanup');
  if url is null then raise exception 'unrecognized_cleanup_schedule';end if;
  perform cron.alter_job(job.jobid,command:=format('select private.media_cleanup_schedule(%L);',url));
 end loop;
end $$;
commit;
