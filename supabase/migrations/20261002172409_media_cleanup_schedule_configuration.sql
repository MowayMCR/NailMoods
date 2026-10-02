begin;
-- Admin-only setup, including projects where no cleanup cron had been installed.
create function private.configure_media_cleanup_schedule(p_project_url text) returns bigint
language plpgsql security definer set search_path='' as $$
declare existing bigint;
begin
 if p_project_url !~ '^https://[a-z]+\.supabase\.co$' then raise exception 'invalid_project_url';end if;
 select jobid into existing from cron.job where command like '%/functions/v1/media-cleanup%' limit 1;
 if existing is not null then return existing;end if;
 return cron.schedule('nailmoods-media-cleanup','*/5 * * * *',format('select private.media_cleanup_schedule(%L);',p_project_url||'/functions/v1/media-cleanup'));
end $$;
revoke all on function private.configure_media_cleanup_schedule(text) from public,anon,authenticated,service_role;
commit;
