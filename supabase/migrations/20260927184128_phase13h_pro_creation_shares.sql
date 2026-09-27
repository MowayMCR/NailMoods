-- Phase 13H — a Pro may send a creation to an already connected client.
-- This is a narrow access grant, not a publication: it remains ineffective as
-- soon as the accepted connection is removed or either account blocks the other.
create table public.pro_creation_shares (
  id uuid primary key default gen_random_uuid(),
  creation_id uuid not null references public.pro_creations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id),
  unique (creation_id, sender_id, recipient_id)
);
create index pro_creation_shares_recipient_idx on public.pro_creation_shares(recipient_id, created_at desc);
alter table public.pro_creation_shares enable row level security;
revoke all on public.pro_creation_shares from anon, authenticated;

create or replace function private.pro_creation_share_visible(p_sender uuid, p_recipient uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() in (p_sender, p_recipient)
    and not private.nm_account_suspended(p_sender)
    and not private.nm_account_suspended(p_recipient)
    and not private.nm_blocked(case when auth.uid() = p_sender then p_recipient else p_sender end)
    and exists (select 1 from private.social_connections c where c.status = 'accepted'
      and ((c.requester = p_sender and c.recipient = p_recipient) or (c.recipient = p_sender and c.requester = p_recipient)));
$$;
revoke all on function private.pro_creation_share_visible(uuid,uuid) from public, anon;
grant execute on function private.pro_creation_share_visible(uuid,uuid) to authenticated;

-- No direct client writes: the RPC below validates both the Pro role and the
-- accepted connection. Reading still requires that connection to be live.
create policy pro_creation_shares_select_participants on public.pro_creation_shares
for select to authenticated using (
  private.pro_creation_share_visible(sender_id, recipient_id)
);
grant select on public.pro_creation_shares to authenticated;

create or replace function private.send_pro_creation_to_client(p_recipient_id uuid, p_creation_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := auth.uid(); sid uuid; creation_title text;
begin
  if me is null or not exists (select 1 from auth.users where id = me and email_confirmed_at is not null) then
    raise exception 'confirmed_account_required' using errcode = '42501';
  end if;
  perform private.require_feature('social');
  if private.effective_tier(me) <> 'pro' then raise exception 'pro_required' using errcode = '42501'; end if;
  if p_recipient_id is null or p_recipient_id = me then raise exception 'invalid_recipient'; end if;
  perform pg_advisory_xact_lock(hashtextextended(least(me,p_recipient_id)::text||':'||greatest(me,p_recipient_id)::text,0));
  if private.nm_blocked(p_recipient_id) or private.nm_account_suspended(p_recipient_id) or private.effective_tier(p_recipient_id) <> 'plus' then
    raise exception 'recipient_unavailable' using errcode = '42501';
  end if;
  if not exists (select 1 from private.social_connections c where c.status = 'accepted'
    and ((c.requester = me and c.recipient = p_recipient_id) or (c.recipient = me and c.requester = p_recipient_id))) then
    raise exception 'connection_required' using errcode = '42501';
  end if;
  select pc.title into creation_title from public.pro_creations pc where pc.id = p_creation_id and pc.owner_id = me for share;
  if creation_title is null then
    raise exception 'creation_unavailable' using errcode = '42501';
  end if;
  insert into public.pro_creation_shares(creation_id,sender_id,recipient_id)
  values(p_creation_id,me,p_recipient_id)
  on conflict(creation_id,sender_id,recipient_id) do update set created_at = excluded.created_at
  returning id into sid;
  -- Grant access and send the message in one transaction. A retry reuses sid
  -- as the message client_id, so it cannot create duplicate notifications.
  perform private.nm_social('send', jsonb_build_object(
    'user_id', p_recipient_id, 'client_id', sid,
    'body', 'Je t’ai partagé ma création « ' || creation_title || ' ». Tu peux la retrouver dans Créer, puis l’adapter à ta palette.'
  ));
  return sid;
end $$;
revoke all on function private.send_pro_creation_to_client(uuid,uuid) from public, anon;
grant execute on function private.send_pro_creation_to_client(uuid,uuid) to authenticated;
create or replace function public.send_pro_creation_to_client(p_recipient_id uuid, p_creation_id uuid)
returns uuid language sql security invoker set search_path = '' as $$ select private.send_pro_creation_to_client(p_recipient_id,p_creation_id) $$;
revoke all on function public.send_pro_creation_to_client(uuid,uuid) from public, anon;
grant execute on function public.send_pro_creation_to_client(uuid,uuid) to authenticated;

-- Extend the existing visibility helper so a direct PO share stays available
-- only while the relationship is accepted. Public and connection visibility
-- retain their Phase 13A behaviour.
create or replace function private.pro_creation_visible(p_creation_id uuid, p_owner_id uuid, p_visibility text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare viewer uuid := auth.uid();
begin
  if viewer is null or private.nm_account_suspended(viewer) or private.nm_account_suspended(p_owner_id) or private.nm_blocked(p_owner_id) then return false; end if;
  if viewer = p_owner_id then return true; end if;
  if private.effective_tier(viewer) not in ('plus','pro') then return false; end if;
  if p_visibility = 'public' then return true; end if;
  return exists (select 1 from private.social_connections c
    where c.status = 'accepted' and ((c.requester = viewer and c.recipient = p_owner_id) or (c.recipient = viewer and c.requester = p_owner_id))
    and (p_visibility = 'connections' or exists (select 1 from public.pro_creation_shares s where s.creation_id = p_creation_id and s.recipient_id = viewer)));
end $$;
drop policy if exists pro_creations_select_visible on public.pro_creations;
create policy pro_creations_select_visible on public.pro_creations for select to authenticated
using (private.pro_creation_visible(id, owner_id, visibility));
drop function if exists private.pro_creation_visible(uuid,text);
revoke all on function private.pro_creation_visible(uuid,uuid,text) from public, anon;
grant execute on function private.pro_creation_visible(uuid,uuid,text) to authenticated;
