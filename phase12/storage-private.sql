-- Phase 12 / Lot 1 — stockage privé des médias utilisateur.
-- À appliquer après revue : cette migration est additive et ne modifie aucune table métier.
-- Convention de chemin : <user_id>/<workspace_id>/<kind>/<object_id>.<ext>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nailmoods-private',
  'nailmoods-private',
  false,
  5242880,
  array['image/jpeg','image/png','image/webp']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists nailmoods_private_read on storage.objects;
create policy nailmoods_private_read
on storage.objects for select to authenticated
using (
  bucket_id = 'nailmoods-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists nailmoods_private_insert on storage.objects;
create policy nailmoods_private_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'nailmoods-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists nailmoods_private_update on storage.objects;
create policy nailmoods_private_update
on storage.objects for update to authenticated
using (
  bucket_id = 'nailmoods-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'nailmoods-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists nailmoods_private_delete on storage.objects;
create policy nailmoods_private_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'nailmoods-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
