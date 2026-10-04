-- Run before pose_outfit_source on an environment without the recipe reference guard.
-- Idempotent: never replace an existing, richer guard from later pose migrations.
begin;
do $migration$ begin
 if to_regprocedure('public.media_cleanup_in_use(text,text)') is null then
 execute $definition$
 create function public.media_cleanup_in_use(p_bucket text,p_path text) returns boolean language sql stable security definer set search_path='' as $body$
 select exists(select 1 from public.journal_entries where (p_bucket='nailmoods-private' and media_path=p_path) or (p_bucket='nailmoods-public' and public_media_path=p_path))
 or exists(select 1 from public.inspirations where (p_bucket='nailmoods-private' and media_path=p_path) or (p_bucket='nailmoods-public' and public_media_path=p_path))
 or exists(select 1 from public.profiles where avatar_url=p_path)
 or exists(select 1 from public.pro_profiles where avatar_url=p_path)
 $body$
 $definition$;
 end if;
end $migration$;
revoke all on function public.media_cleanup_in_use(text,text) from public,anon,authenticated;
grant execute on function public.media_cleanup_in_use(text,text) to service_role;
commit;
