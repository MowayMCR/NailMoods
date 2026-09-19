-- PREPARATION ONLY — Phase 12B Institute + protected messaging.
-- Do not deploy until reviewed/tested with real confirmed accounts.
-- Assumes phase12a foundation + public identities.

-- ---- Institute capacity and invitations ----
alter table public.workspaces
  add column if not exists member_limit integer
  check (member_limit is null or member_limit between 1 and 100);

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  invitee_user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending','accepted','declined','revoked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

create unique index if not exists workspace_invitation_one_pending
  on public.workspace_invitations(workspace_id, invitee_user_id)
  where status='pending';

create index if not exists workspace_invitations_invitee_idx
  on public.workspace_invitations(invitee_user_id, created_at desc);

alter table public.workspace_invitations enable row level security;
revoke all on public.workspace_invitations from anon, authenticated;
grant select on public.workspace_invitations to authenticated;

create policy workspace_invitations_read
on public.workspace_invitations
for select to authenticated
using (
  invitee_user_id=(select auth.uid())
  or private.is_workspace_owner(workspace_id)
);

create or replace function private.invite_workspace_member(
  p_workspace_id uuid,
  p_invitee_user_id uuid
) returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  invitation_id uuid;
  limit_value integer;
  member_count integer;
  pending_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  if not private.is_workspace_owner(p_workspace_id) then
    raise exception 'owner_required' using errcode='42501';
  end if;

  if not exists(
    select 1 from public.workspaces
    where id=p_workspace_id and kind='institute'
  ) then
    raise exception 'institute_required';
  end if;

  if p_invitee_user_id=auth.uid() then
    raise exception 'cannot_invite_self';
  end if;

  if not exists(select 1 from auth.users where id=p_invitee_user_id and email_confirmed_at is not null) then
    raise exception 'confirmed_invitee_required';
  end if;

  if exists(
    select 1 from public.workspace_members
    where workspace_id=p_workspace_id and user_id=p_invitee_user_id
  ) then
    raise exception 'already_member';
  end if;

  select member_limit into limit_value
  from public.workspaces
  where id=p_workspace_id
  for update;

  select count(*) into member_count
  from public.workspace_members
  where workspace_id=p_workspace_id;

  select count(*) into pending_count
  from public.workspace_invitations
  where workspace_id=p_workspace_id and status='pending';

  if limit_value is not null and member_count + pending_count >= limit_value then
    raise exception 'member_limit_reached';
  end if;

  insert into public.workspace_invitations(workspace_id,invited_by,invitee_user_id)
  values(p_workspace_id,auth.uid(),p_invitee_user_id)
  returning id into invitation_id;

  return invitation_id;
end
$$;

create or replace function private.respond_workspace_invitation(
  p_invitation_id uuid,
  p_accept boolean
) returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  invitation public.workspace_invitations;
  limit_value integer;
  member_count integer;
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  select * into invitation
  from public.workspace_invitations
  where id=p_invitation_id
  for update;

  if invitation.id is null or invitation.invitee_user_id<>auth.uid() then
    raise exception 'invitation_not_found' using errcode='42501';
  end if;

  if invitation.status<>'pending' then
    raise exception 'invitation_already_resolved';
  end if;

  if not p_accept then
    update public.workspace_invitations
      set status='declined', responded_at=now()
    where id=p_invitation_id;
    return;
  end if;

  select member_limit into limit_value
  from public.workspaces
  where id=invitation.workspace_id
  for update;

  select count(*) into member_count
  from public.workspace_members
  where workspace_id=invitation.workspace_id;

  if limit_value is not null and member_count >= limit_value then
    raise exception 'member_limit_reached';
  end if;

  insert into public.workspace_members(workspace_id,user_id,role)
  values(invitation.workspace_id,auth.uid(),'member')
  on conflict do nothing;

  update public.workspace_invitations
    set status='accepted', responded_at=now()
  where id=p_invitation_id;
end
$$;

create or replace function private.transfer_workspace_ownership(
  p_workspace_id uuid,
  p_new_owner_user_id uuid
) returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if auth.uid() is null or not private.is_workspace_owner(p_workspace_id) then
    raise exception 'owner_required' using errcode='42501';
  end if;

  if p_new_owner_user_id=auth.uid() then
    raise exception 'already_owner';
  end if;

  if not exists(
    select 1 from public.workspace_members
    where workspace_id=p_workspace_id and user_id=p_new_owner_user_id
  ) then
    raise exception 'new_owner_must_be_member';
  end if;

  update public.workspace_members
    set role='member'
  where workspace_id=p_workspace_id and user_id=auth.uid();

  update public.workspace_members
    set role='owner'
  where workspace_id=p_workspace_id and user_id=p_new_owner_user_id;

  update public.workspaces
    set owner_user_id=p_new_owner_user_id
  where id=p_workspace_id;
end
$$;

create or replace function private.leave_workspace(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication_required' using errcode='42501';
  end if;

  if private.is_workspace_owner(p_workspace_id) then
    raise exception 'transfer_owner_first';
  end if;

  delete from public.workspace_members
  where workspace_id=p_workspace_id and user_id=auth.uid();
end
$$;

-- Tighten direct membership deletion: owner cannot delete own membership;
-- owners may remove others, members may leave themselves.
drop policy if exists workspace_members_delete on public.workspace_members;
create policy workspace_members_delete
on public.workspace_members
for delete to authenticated
using (
  (
    user_id=(select auth.uid())
    and not private.is_workspace_owner(workspace_id)
  )
  or (
    private.is_workspace_owner(workspace_id)
    and user_id<>(select auth.uid())
  )
);

-- ---- Message requests / context / anonymization-ready history ----
alter table public.conversations
  add column if not exists status text not null default 'active'
    check (status in ('pending','active','declined','closed')),
  add column if not exists requested_by uuid references auth.users(id) on delete set null,
  add column if not exists target_user_id uuid references auth.users(id) on delete set null,
  add column if not exists context_workspace_id uuid references public.workspaces(id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz;

alter table public.messages
  add column if not exists sender_workspace_id uuid references public.workspaces(id) on delete set null;

-- Preserve conversations/messages when an account is deleted.
alter table public.messages drop constraint if exists messages_sender_id_fkey;
alter table public.messages alter column sender_id drop not null;
alter table public.messages
  add constraint messages_sender_id_fkey
  foreign key(sender_id) references auth.users(id) on delete set null;

alter table public.conversations drop constraint if exists conversations_created_by_fkey;
alter table public.conversations alter column created_by drop not null;
alter table public.conversations
  add constraint conversations_created_by_fkey
  foreign key(created_by) references auth.users(id) on delete set null;

-- Blocking
create table if not exists public.user_blocks (
  blocker_user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(blocker_user_id,blocked_user_id),
  check(blocker_user_id<>blocked_user_id)
);
alter table public.user_blocks enable row level security;
revoke all on public.user_blocks from anon,authenticated;
grant select,insert,delete on public.user_blocks to authenticated;

create policy user_blocks_read_self on public.user_blocks
for select to authenticated using (blocker_user_id=(select auth.uid()));
create policy user_blocks_insert_self on public.user_blocks
for insert to authenticated with check (blocker_user_id=(select auth.uid()));
create policy user_blocks_delete_self on public.user_blocks
for delete to authenticated using (blocker_user_id=(select auth.uid()));

-- Reports
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references auth.users(id) on delete cascade,
  target_user_id uuid references auth.users(id) on delete set null,
  target_workspace_id uuid references public.workspaces(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  reason text not null check(reason in ('spam','inappropriate','fake_profile','other')),
  details text check(details is null or char_length(details)<=2000),
  status text not null default 'open' check(status in ('open','reviewed','closed')),
  created_at timestamptz not null default now(),
  check(target_user_id is not null or target_workspace_id is not null or conversation_id is not null)
);
alter table public.reports enable row level security;
revoke all on public.reports from anon,authenticated;
grant select,insert on public.reports to authenticated;
create policy reports_insert_self on public.reports
for insert to authenticated with check(reporter_user_id=(select auth.uid()));
create policy reports_read_self on public.reports
for select to authenticated using(reporter_user_id=(select auth.uid()));

-- Internal notifications for beta web.
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check(event_type in ('message_request','new_message','inspiration_shared','workspace_invite','workspace_invite_accepted')),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_created_idx
  on public.notifications(user_id,created_at desc);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon,authenticated;
grant select on public.notifications to authenticated;
grant update(read_at) on public.notifications to authenticated;
create policy notifications_read_self on public.notifications
for select to authenticated using(user_id=(select auth.uid()));
create policy notifications_update_self on public.notifications
for update to authenticated
using(user_id=(select auth.uid()))
with check(user_id=(select auth.uid()));

-- Helpers
create or replace function private.users_block_each_other(a uuid,b uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from public.user_blocks
    where (blocker_user_id=a and blocked_user_id=b)
       or (blocker_user_id=b and blocked_user_id=a)
  )
$$;

create or replace function private.can_send_in_conversation(p_conversation_id uuid,p_sender uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
  select exists(
    select 1
    from public.conversations c
    join public.conversation_members selfm
      on selfm.conversation_id=c.id and selfm.user_id=p_sender
    where c.id=p_conversation_id
      and c.status='active'
      and not exists(
        select 1
        from public.conversation_members otherm
        where otherm.conversation_id=c.id
          and otherm.user_id<>p_sender
          and private.users_block_each_other(p_sender,otherm.user_id)
      )
  )
$$;

drop policy if exists messages_insert_member on public.messages;
create policy messages_insert_member
on public.messages
for insert to authenticated
with check(
  sender_id=(select auth.uid())
  and private.can_send_in_conversation(conversation_id,(select auth.uid()))
  and (
    sender_workspace_id is null
    or private.is_workspace_member(sender_workspace_id)
  )
);

-- Only creator or current target can manage pending request via RPC later.
-- Direct UPDATE on conversations remains intentionally ungranted.

-- Private definer helpers are not callable by anon/public.
revoke all on function private.invite_workspace_member(uuid,uuid) from public,anon;
revoke all on function private.respond_workspace_invitation(uuid,boolean) from public,anon;
revoke all on function private.transfer_workspace_ownership(uuid,uuid) from public,anon;
revoke all on function private.leave_workspace(uuid) from public,anon;
revoke all on function private.users_block_each_other(uuid,uuid) from public,anon;
revoke all on function private.can_send_in_conversation(uuid,uuid) from public,anon;

grant execute on function private.invite_workspace_member(uuid,uuid) to authenticated;
grant execute on function private.respond_workspace_invitation(uuid,boolean) to authenticated;
grant execute on function private.transfer_workspace_ownership(uuid,uuid) to authenticated;
grant execute on function private.leave_workspace(uuid) to authenticated;

create or replace function public.invite_workspace_member(p_workspace_id uuid,p_invitee_user_id uuid)
returns uuid language sql security invoker set search_path=''
as $$ select private.invite_workspace_member(p_workspace_id,p_invitee_user_id) $$;

create or replace function public.respond_workspace_invitation(p_invitation_id uuid,p_accept boolean)
returns void language sql security invoker set search_path=''
as $$ select private.respond_workspace_invitation(p_invitation_id,p_accept) $$;

create or replace function public.transfer_workspace_ownership(p_workspace_id uuid,p_new_owner_user_id uuid)
returns void language sql security invoker set search_path=''
as $$ select private.transfer_workspace_ownership(p_workspace_id,p_new_owner_user_id) $$;

create or replace function public.leave_workspace(p_workspace_id uuid)
returns void language sql security invoker set search_path=''
as $$ select private.leave_workspace(p_workspace_id) $$;

revoke all on function public.invite_workspace_member(uuid,uuid) from public,anon;
revoke all on function public.respond_workspace_invitation(uuid,boolean) from public,anon;
revoke all on function public.transfer_workspace_ownership(uuid,uuid) from public,anon;
revoke all on function public.leave_workspace(uuid) from public,anon;

grant execute on function public.invite_workspace_member(uuid,uuid) to authenticated;
grant execute on function public.respond_workspace_invitation(uuid,boolean) to authenticated;
grant execute on function public.transfer_workspace_ownership(uuid,uuid) to authenticated;
grant execute on function public.leave_workspace(uuid) to authenticated;
