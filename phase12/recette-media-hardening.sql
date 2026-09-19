-- Recette corrections found while installing the previously prepared lot.
grant execute on function private.nailmoods_workspace_member(text,uuid),private.nailmoods_media_read_allowed(text,text,uuid) to authenticated;
-- Owner can verify a newly uploaded image BEFORE attaching it to a row.
drop policy nailmoods_private_read on storage.objects;
create policy nailmoods_private_read on storage.objects for select to authenticated using(
 bucket_id='nailmoods-private' and (storage.foldername(name))[1]=auth.uid()::text
 and private.nailmoods_workspace_member((storage.foldername(name))[2],auth.uid()));
-- All references must point to this record's creator/workspace, never another
-- account's path. Applies even to writes through a SECURITY DEFINER function.
create function private.check_media_reference() returns trigger language plpgsql security definer set search_path='' as $$
declare p text; expected_user uuid; expected_workspace uuid;
begin
 if tg_table_name='profiles' then
  p:=new.avatar_url;
  if p is null then return new;end if;
  if split_part(p,'/',1)<>new.id::text or not private.nailmoods_workspace_member(split_part(p,'/',2),new.id)
  then raise exception 'invalid_media_owner' using errcode='42501';end if;
 else
  if tg_table_name='pro_profiles' then
   expected_user:=new.user_id;expected_workspace:=new.workspace_id;
   if new.avatar_url is not null and (split_part(new.avatar_url,'/',1)<>expected_user::text or split_part(new.avatar_url,'/',2)<>expected_workspace::text) then raise exception 'invalid_media_owner' using errcode='42501';end if;
  else
   expected_user:=new.created_by;expected_workspace:=new.workspace_id;
   foreach p in array array[new.media_path,new.public_media_path] loop
    if p is not null and (split_part(p,'/',1)<>expected_user::text or split_part(p,'/',2)<>expected_workspace::text) then raise exception 'invalid_media_owner' using errcode='42501';end if;
   end loop;
  end if;
 end if;
 return new;
end$$;
revoke all on function private.check_media_reference() from public,anon,authenticated;
create trigger check_avatar before insert or update of avatar_url on public.profiles for each row execute function private.check_media_reference();
create trigger check_pro_avatar before insert or update of avatar_url on public.pro_profiles for each row execute function private.check_media_reference();
create trigger check_journal_media before insert or update on public.journal_entries for each row execute function private.check_media_reference();
create trigger check_inspiration_media before insert or update on public.inspirations for each row execute function private.check_media_reference();
-- Cleanup workers claim atomically; expired leases can be retried after a crash.
create function public.claim_media_cleanup() returns setof public.media_cleanup_jobs language sql security definer set search_path='' as $$
 update public.media_cleanup_jobs set status='processing',attempts=attempts+1,updated_at=now()
 where id in(select id from public.media_cleanup_jobs where attempts<5 and
 ((status='pending' and next_attempt_at<=now()) or (status='processing' and updated_at<now()-interval '10 minutes'))
 order by created_at for update skip locked limit 25) returning *
$$;
revoke all on function public.claim_media_cleanup() from public,anon,authenticated;
grant execute on function public.claim_media_cleanup() to service_role;
create function public.media_cleanup_in_use(p_bucket text,p_path text) returns boolean language sql stable security definer set search_path='' as $$
select exists(select 1 from public.journal_entries where (p_bucket='nailmoods-private' and media_path=p_path) or (p_bucket='nailmoods-public' and public_media_path=p_path))
or exists(select 1 from public.inspirations where (p_bucket='nailmoods-private' and media_path=p_path) or (p_bucket='nailmoods-public' and public_media_path=p_path))
or exists(select 1 from public.profiles where avatar_url=p_path)
or exists(select 1 from public.pro_profiles where avatar_url=p_path)
$$;
revoke all on function public.media_cleanup_in_use(text,text) from public,anon,authenticated;
grant execute on function public.media_cleanup_in_use(text,text) to service_role;
