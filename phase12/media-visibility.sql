-- Phase 12 / Lot 2 — visibilité des poses et médias publiables.
-- Les originaux restent dans nailmoods-private. Le bucket public ne contient que
-- des copies explicitement publiées par leur propriétaire.

alter table public.journal_entries
  add column if not exists visibility text not null default 'private'
    check (visibility in ('private','public')),
  add column if not exists media_path text,
  add column if not exists public_media_path text;

alter table public.inspirations
  add column if not exists media_path text,
  add column if not exists public_media_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nailmoods-public',
  'nailmoods-public',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public = true,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists nailmoods_public_read on storage.objects;
create policy nailmoods_public_read
on storage.objects for select to anon, authenticated
using (bucket_id = 'nailmoods-public');

drop policy if exists nailmoods_public_insert on storage.objects;
create policy nailmoods_public_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'nailmoods-public'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists nailmoods_public_update on storage.objects;
create policy nailmoods_public_update
on storage.objects for update to authenticated
using (
  bucket_id = 'nailmoods-public'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'nailmoods-public'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists nailmoods_public_delete on storage.objects;
create policy nailmoods_public_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'nailmoods-public'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- Public profile payload: no email, UUID, workspace id or private snapshots.
create or replace function public.get_public_profile(p_handle text)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'displayName', p.display_name,
    'handle', p.username,
    'accountType', case when pp.id is not null then 'pro' else p.account_tier end,
    'avatarHandle', p.username,
    'bio', pp.bio,
    'city', pp.city,
    'styles', coalesce(pp.styles, '{}'::text[]),
    'journal', coalesce((select jsonb_agg(jsonb_build_object(
      'id', j.id,
      'performedOn', j.performed_on,
      'mediaId', j.id,
      'mood', j.snapshot->'mood',
      'colors', j.snapshot->'colors',
      'title', j.snapshot->>'title'
    ) order by j.performed_on desc, j.created_at desc)
    from public.journal_entries j
    where j.created_by = p.id and j.visibility='public'), '[]'::jsonb),
    'inspirations', coalesce((select jsonb_agg(jsonb_build_object(
      'id', i.id,
      'title', i.title,
      'mood', i.mood,
      'mediaId', i.id,
      'snapshot', jsonb_build_object(
        'title', i.title,
        'mood', i.mood,
        'palette', i.snapshot->'palette',
        'nails', i.snapshot->'nails'
      )
    ) order by i.created_at desc)
    from public.inspirations i
    where i.created_by = p.id and i.is_public), '[]'::jsonb)
  ) into result
  from public.profiles p
  left join public.pro_profiles pp on pp.user_id=p.id and pp.is_public
  where p.username=lower(trim(leading '@' from trim(p_handle)))
    and p.discovery_visibility='everyone';
  return result;
end;
$$;

revoke all on function public.get_public_profile(text) from public, authenticated, anon;
grant execute on function public.get_public_profile(text) to authenticated, anon;
