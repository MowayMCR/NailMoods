-- Phase 12 — médias révocables et nettoyage durable.
-- Les deux buckets sont privés. Les publications publiques sont servies par
-- l'Edge Function media-read, qui vérifie la visibilité courante avant chaque
-- téléchargement et renvoie les octets sans redirection Storage.

create or replace function private.nailmoods_workspace_member(p_workspace text, p_user uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id::text = p_workspace
      and wm.user_id = p_user
  );
$$;

revoke all on function private.nailmoods_workspace_member(text, uuid) from public, anon, authenticated;

create or replace function private.nailmoods_media_read_allowed(p_path text, p_bucket text, p_user uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.journal_entries j
    where j.workspace_id::text = (storage.foldername(p_path))[2]
      and (j.media_path = p_path or j.public_media_path = p_path)
      and (j.created_by = p_user or private.nailmoods_workspace_member(j.workspace_id::text, p_user))
  ) or exists (
    select 1 from public.inspirations i
    where i.workspace_id::text = (storage.foldername(p_path))[2]
      and (i.media_path = p_path or i.public_media_path = p_path)
      and (i.created_by = p_user or private.nailmoods_workspace_member(i.workspace_id::text, p_user))
  ) or exists (
    select 1 from public.profiles p
    where p.id = p_user and p.avatar_url = p_path
  ) or exists (
    select 1 from public.pro_profiles pp
    where pp.user_id = p_user and pp.avatar_url = p_path
  );
$$;

revoke all on function private.nailmoods_media_read_allowed(text, text, uuid) from public, anon, authenticated;

-- A public bucket must not expose a directory or a reusable direct URL. The
-- controlled media reader uses service_role and is the only public read path.
update storage.buckets
set public = false
where id = 'nailmoods-public';

drop policy if exists nailmoods_public_read on storage.objects;
drop policy if exists nailmoods_private_read on storage.objects;
drop policy if exists nailmoods_private_insert on storage.objects;
drop policy if exists nailmoods_private_update on storage.objects;
drop policy if exists nailmoods_private_delete on storage.objects;
drop policy if exists nailmoods_public_insert on storage.objects;
drop policy if exists nailmoods_public_update on storage.objects;
drop policy if exists nailmoods_public_delete on storage.objects;

create policy nailmoods_private_read
on storage.objects for select to authenticated
using (
  bucket_id = 'nailmoods-private'
  and private.nailmoods_media_read_allowed(name, bucket_id, (select auth.uid()))
);

create policy nailmoods_private_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'nailmoods-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.nailmoods_workspace_member((storage.foldername(name))[2], (select auth.uid()))
);

create policy nailmoods_private_update
on storage.objects for update to authenticated
using (
  bucket_id = 'nailmoods-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.nailmoods_workspace_member((storage.foldername(name))[2], (select auth.uid()))
)
with check (
  bucket_id = 'nailmoods-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.nailmoods_workspace_member((storage.foldername(name))[2], (select auth.uid()))
);

create policy nailmoods_private_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'nailmoods-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.nailmoods_workspace_member((storage.foldername(name))[2], (select auth.uid()))
);

create policy nailmoods_public_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'nailmoods-public'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.nailmoods_workspace_member((storage.foldername(name))[2], (select auth.uid()))
);

create policy nailmoods_public_update
on storage.objects for update to authenticated
using (
  bucket_id = 'nailmoods-public'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.nailmoods_workspace_member((storage.foldername(name))[2], (select auth.uid()))
)
with check (
  bucket_id = 'nailmoods-public'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.nailmoods_workspace_member((storage.foldername(name))[2], (select auth.uid()))
);

create policy nailmoods_public_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'nailmoods-public'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and private.nailmoods_workspace_member((storage.foldername(name))[2], (select auth.uid()))
);

create table if not exists public.media_cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  bucket text not null check (bucket in ('nailmoods-private','nailmoods-public')),
  object_path text not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending','processing','done','failed')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists media_cleanup_jobs_active_path
on public.media_cleanup_jobs(bucket, object_path)
where status in ('pending','processing','failed');

alter table public.media_cleanup_jobs enable row level security;
revoke all on public.media_cleanup_jobs from anon, authenticated;

create or replace function private.enqueue_media_cleanup()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.public_media_path is not null
     and new.public_media_path is null
     and old.public_media_path <> coalesce(new.public_media_path, '') then
    insert into public.media_cleanup_jobs(bucket, object_path, reason)
    values ('nailmoods-public', old.public_media_path, 'visibility_private')
    on conflict (bucket, object_path) where status in ('pending','processing','failed') do nothing;
  end if;
  return new;
end;
$$;

revoke all on function private.enqueue_media_cleanup() from public, anon, authenticated;

drop trigger if exists journal_media_cleanup on public.journal_entries;
create trigger journal_media_cleanup
after update of public_media_path on public.journal_entries
for each row execute function private.enqueue_media_cleanup();

drop trigger if exists inspiration_media_cleanup on public.inspirations;
create trigger inspiration_media_cleanup
after update of public_media_path on public.inspirations
for each row execute function private.enqueue_media_cleanup();

drop function if exists public.nailmoods_media_read_allowed(text, text, uuid);
drop function if exists public.nailmoods_workspace_member(text, uuid);
drop function if exists public.enqueue_media_cleanup();
