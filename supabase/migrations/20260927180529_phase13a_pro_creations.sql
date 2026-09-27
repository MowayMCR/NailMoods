-- Phase 13A — bibliothèque créative Pro.
-- Créations structurées et persistantes ; aucun média ni contenu existant n'est déplacé.

create table public.pro_creations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 80),
  description text not null default '' check (char_length(description) <= 600),
  visibility text not null default 'private' check (visibility in ('private','connections','public')),
  design jsonb not null default '{"version":1,"strokes":[]}'::jsonb check (jsonb_typeof(design) = 'object' and octet_length(design::text) <= 250000),
  color_roles jsonb not null default '[]'::jsonb check (jsonb_typeof(color_roles) = 'array'),
  techniques text[] not null default '{}'::text[],
  effects text[] not null default '{}'::text[],
  motifs text[] not null default '{}'::text[],
  styles text[] not null default '{}'::text[],
  moods text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  level text not null default 'intermediaire' check (level in ('simple','intermediaire','avance')),
  recommended_fingers text[] not null default '{}'::text[] check (recommended_fingers <@ array['thumb','index','middle','ring','little','accent','multiple','free']::text[]),
  recommended_nail_count smallint not null default 1 check (recommended_nail_count between 1 and 5),
  thumbnail_path text,
  reference_media_path text,
  version integer not null default 1 check (version >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pro_creations_owner_updated_idx on public.pro_creations(owner_id, updated_at desc);
create index pro_creations_visibility_updated_idx on public.pro_creations(visibility, updated_at desc);

alter table public.pro_creations enable row level security;
revoke all on public.pro_creations from anon, authenticated;

-- This helper is deliberately the sole non-owner access path. A creation set
-- to "connections" is readable only while the accepted connection exists and
-- neither side is blocked. Public still remains behind authenticated access;
-- public profile/discovery exposure is added in a later dedicated phase.
create or replace function private.pro_creation_visible(p_owner_id uuid, p_visibility text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare viewer uuid := auth.uid();
begin
  if viewer is null then return false; end if;
  if viewer = p_owner_id then return true; end if;
  if private.nm_blocked(p_owner_id) then return false; end if;
  if p_visibility = 'public' then return true; end if;
  if p_visibility <> 'connections' then return false; end if;
  return exists (
    select 1
    from private.social_connections c
    where c.status = 'accepted'
      and ((c.requester = viewer and c.recipient = p_owner_id)
        or (c.recipient = viewer and c.requester = p_owner_id))
  );
end $$;

revoke all on function private.pro_creation_visible(uuid,text) from public, anon;
grant execute on function private.pro_creation_visible(uuid,text) to authenticated;

-- Policies run as the caller. Keep the Pro-tier and workspace check behind a
-- narrowly scoped helper rather than granting callers direct access to the
-- account-entitlement helper in the private schema.
create or replace function private.pro_creation_author_allowed(p_owner_id uuid, p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() = p_owner_id
    and private.effective_tier(p_owner_id) = 'pro'
    and not private.nm_account_suspended(p_owner_id)
    and exists (
      select 1
      from public.workspace_members wm
      where wm.workspace_id = p_workspace_id
        and wm.user_id = p_owner_id
        and wm.role in ('owner', 'manager', 'creator')
    );
$$;

revoke all on function private.pro_creation_author_allowed(uuid,uuid) from public, anon;
grant execute on function private.pro_creation_author_allowed(uuid,uuid) to authenticated;

create policy pro_creations_select_visible
on public.pro_creations for select to authenticated
using (private.pro_creation_visible(owner_id, visibility));

create policy pro_creations_insert_owner
on public.pro_creations for insert to authenticated
with check (
  private.pro_creation_author_allowed(owner_id, workspace_id)
);

create policy pro_creations_update_owner
on public.pro_creations for update to authenticated
using (owner_id = (select auth.uid()))
with check (
  private.pro_creation_author_allowed(owner_id, workspace_id)
);

create policy pro_creations_delete_owner
on public.pro_creations for delete to authenticated
using (owner_id = (select auth.uid()));

grant select, insert, update, delete on public.pro_creations to authenticated;

create or replace function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at=clock_timestamp();return new;end
$$;

create trigger pro_creations_touch_updated_at
before update on public.pro_creations
for each row execute function private.touch_updated_at();
