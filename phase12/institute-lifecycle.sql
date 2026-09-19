-- PREPARATION, NOT APPLIED. Requires privacy-consents.sql and public-identities.sql.
-- All membership/owner changes pass through one transaction and lock the workspace.
create table public.workspace_entitlements (
 workspace_id uuid primary key references public.workspaces(id) on delete cascade,
 active boolean not null default false,
 seat_limit integer not null default 1 check(seat_limit between 1 and 100),
 expires_at timestamptz
);
alter table public.workspace_entitlements enable row level security;
revoke all on public.workspace_entitlements from anon,authenticated;
grant select on public.workspace_entitlements to authenticated;
create policy entitlement_member_read on public.workspace_entitlements for select to authenticated using(private.is_workspace_member(workspace_id));
-- Grants and expiry are administrative; choosing a plan in the UI never grants these rights.
create table public.workspace_invitations (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 invited_by uuid references auth.users(id) on delete set null,
 invited_user_id uuid not null references auth.users(id) on delete cascade,
 status text not null default 'pending' check(status in ('pending','accepted','declined','revoked','expired')),
 created_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '7 days',
 responded_at timestamptz
);
create unique index one_pending_workspace_invitation on public.workspace_invitations(workspace_id,invited_user_id) where status='pending';
create index workspace_invitation_recipient on public.workspace_invitations(invited_user_id,status);
alter table public.workspace_invitations enable row level security;
revoke all on public.workspace_invitations from anon,authenticated;
grant select on public.workspace_invitations to authenticated;
create policy invitation_participant_read on public.workspace_invitations for select to authenticated using(invited_user_id=(select auth.uid()) or private.is_workspace_owner(workspace_id));
create table public.user_notifications (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('institute_invitation','workspace_membership','message_request','message','inspiration')),
 workspace_id uuid references public.workspaces(id) on delete cascade,
 invitation_id uuid references public.workspace_invitations(id) on delete cascade,
 created_at timestamptz not null default now(),read_at timestamptz
);
create index notifications_user_unread on public.user_notifications(user_id,created_at desc);
alter table public.user_notifications enable row level security;
revoke all on public.user_notifications from anon,authenticated;
grant select,update(read_at) on public.user_notifications to authenticated;
create policy notification_owner_read on public.user_notifications for select to authenticated using(user_id=(select auth.uid()));
create policy notification_owner_mark_read on public.user_notifications for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
-- Existing trigger can still create a personal workspace and owner membership.
-- Clients cannot bypass invitations or transfer ownership via a direct table update.
revoke insert,update,delete on public.workspace_members from authenticated;
revoke insert,update,delete on public.workspaces from authenticated;

create function private.require_adult_account() returns uuid language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();
begin
 if actor is null or not exists(select 1 from auth.users where id=actor and email_confirmed_at is not null)
 or not exists(select 1 from public.user_consents where user_id=actor and adult_confirmed_at is not null)
 then raise exception 'adult_confirmed_account_required' using errcode='42501'; end if;
 return actor;
end $$;
revoke all on function private.require_adult_account() from public,anon,authenticated;

create function private.institute_action(p_action text,p_workspace_id uuid,p_target_user_id uuid default null,p_invitation_id uuid default null,p_handle text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account(); space public.workspaces; entitlement public.workspace_entitlements;
 invitation public.workspace_invitations; member_count integer; result_id uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 select * into space from public.workspaces where id=p_workspace_id and kind='institute' for update;
 if not found then raise exception 'workspace_unavailable' using errcode='42501'; end if;
 -- Always lock space before invitation; accepting and removing members share this order.
 if p_action in ('accept','decline') then
   select * into invitation from public.workspace_invitations where id=p_invitation_id and workspace_id=space.id and invited_user_id=actor for update;
   if not found then raise exception 'invitation_unavailable' using errcode='42501'; end if;
   if invitation.status<>'pending' or invitation.expires_at<=now() then raise exception 'invitation_not_pending'; end if;
 elsif p_action='leave' then
   if not exists(select 1 from public.workspace_members where workspace_id=space.id and user_id=actor) then raise exception 'membership_required' using errcode='42501'; end if;
   if space.owner_user_id=actor then raise exception 'transfer_before_leaving'; end if;
 elsif space.owner_user_id<>actor then raise exception 'owner_required' using errcode='42501';
 end if;
 -- Safety/exit operations remain possible after expiry. New members require active rights.
 if p_action in ('invite','accept') then
   select * into entitlement from public.workspace_entitlements where workspace_id=space.id;
   if not found or not entitlement.active or (entitlement.expires_at is not null and entitlement.expires_at<=now()) then raise exception 'entitlement_inactive'; end if;
   if not exists(select 1 from public.profiles where id=space.owner_user_id and account_tier='pro') then raise exception 'pro_owner_required'; end if;
 end if;
 case p_action
 when 'invite' then
   select id into p_target_user_id from public.profiles where username=lower(trim(leading '@' from trim(p_handle)));
   if p_target_user_id is null or p_target_user_id=actor or exists(select 1 from public.workspace_members where workspace_id=space.id and user_id=p_target_user_id) then raise exception 'invalid_recipient'; end if;
   if not exists(select 1 from auth.users u join public.profiles p on p.id=u.id where u.id=p_target_user_id and u.email_confirmed_at is not null and p.discovery_visibility<>'nobody')
   or not exists(select 1 from public.user_consents where user_id=p_target_user_id and adult_confirmed_at is not null) then raise exception 'recipient_unavailable'; end if;
   if (select count(*) from public.workspace_invitations where invited_by=actor and created_at>now()-interval '1 hour')>=10 then raise exception 'invitation_rate_limit'; end if;
   select count(*) into member_count from public.workspace_members where workspace_id=space.id;
   if member_count>=entitlement.seat_limit then raise exception 'workspace_full'; end if;
   update public.workspace_invitations set status='expired',responded_at=now() where workspace_id=space.id and status='pending' and expires_at<=now();
   insert into public.workspace_invitations(workspace_id,invited_by,invited_user_id) values(space.id,actor,p_target_user_id) returning id into result_id;
   insert into public.user_notifications(user_id,kind,workspace_id,invitation_id) values(p_target_user_id,'institute_invitation',space.id,result_id);
 when 'accept' then
   select count(*) into member_count from public.workspace_members where workspace_id=space.id;
   if member_count>=entitlement.seat_limit then raise exception 'workspace_full'; end if;
   insert into public.workspace_members(workspace_id,user_id,role) values(space.id,actor,'member');
   update public.workspace_invitations set status='accepted',responded_at=now() where id=invitation.id;
   insert into public.user_notifications(user_id,kind,workspace_id) values(space.owner_user_id,'workspace_membership',space.id);
 when 'decline' then
   update public.workspace_invitations set status='declined',responded_at=now() where id=invitation.id;
 when 'revoke' then
   update public.workspace_invitations set status='revoked',responded_at=now() where id=p_invitation_id and workspace_id=space.id and status='pending';
   if not found then raise exception 'invitation_not_pending'; end if;
 when 'leave' then
   delete from public.workspace_members where workspace_id=space.id and user_id=actor;
   delete from public.user_notifications where workspace_id=space.id and user_id=actor;
 when 'remove' then
   if p_target_user_id is null or p_target_user_id=space.owner_user_id then raise exception 'cannot_remove_owner'; end if;
   delete from public.workspace_members where workspace_id=space.id and user_id=p_target_user_id;
   if not found then raise exception 'membership_not_found'; end if;
   delete from public.user_notifications where workspace_id=space.id and user_id=p_target_user_id;
 when 'transfer' then
   if p_target_user_id is null or p_target_user_id=actor or not exists(select 1 from public.workspace_members where workspace_id=space.id and user_id=p_target_user_id) then raise exception 'existing_member_required'; end if;
   if not exists(select 1 from public.profiles where id=p_target_user_id and account_tier='pro') then raise exception 'new_owner_pro_required'; end if;
   update public.workspace_members set role='member' where workspace_id=space.id and user_id=actor;
   update public.workspace_members set role='owner' where workspace_id=space.id and user_id=p_target_user_id;
   update public.workspaces set owner_user_id=p_target_user_id where id=space.id;
 else raise exception 'unknown_action';
 end case;
 return jsonb_build_object('action',p_action,'invitation_id',result_id);
end $$;
revoke all on function private.institute_action(text,uuid,uuid,uuid,text) from public,anon;
grant execute on function private.institute_action(text,uuid,uuid,uuid,text) to authenticated;
create function public.institute_action(p_action text,p_workspace_id uuid,p_target_user_id uuid default null,p_invitation_id uuid default null,p_handle text default null)
returns jsonb language sql security invoker set search_path='' as $$ select private.institute_action(p_action,p_workspace_id,p_target_user_id,p_invitation_id,p_handle) $$;
revoke all on function public.institute_action(text,uuid,uuid,uuid,text) from public,anon;
grant execute on function public.institute_action(text,uuid,uuid,uuid,text) to authenticated;

create function private.institute_state(p_workspace_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account(); space public.workspaces; result jsonb;
begin
 select * into space from public.workspaces where id=p_workspace_id and kind='institute';
 if not found or not private.is_workspace_member(space.id) then raise exception 'membership_required' using errcode='42501'; end if;
 select jsonb_build_object('workspace',jsonb_build_object('id',space.id,'name',space.name,'owner_user_id',space.owner_user_id),
 'entitlement',(select to_jsonb(e) from public.workspace_entitlements e where e.workspace_id=space.id),
 'members',coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'display_name',p.display_name,'username',p.username) order by p.display_name) from public.workspace_members m join public.profiles p on p.id=m.user_id where m.workspace_id=space.id),'[]'::jsonb),
 'invitations',case when space.owner_user_id=actor then coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'display_name',p.display_name,'status',i.status,'expires_at',i.expires_at)) from public.workspace_invitations i join public.profiles p on p.id=i.invited_user_id where i.workspace_id=space.id and i.status='pending' and i.expires_at>now()),'[]'::jsonb) else '[]'::jsonb end) into result;
 return result;
end $$;
create function private.institute_inbox() returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account(); result jsonb;
begin
 select coalesce(jsonb_agg(jsonb_build_object('id',i.id,'workspace_id',w.id,'workspace_name',w.name,'expires_at',i.expires_at)),'[]'::jsonb) into result
 from public.workspace_invitations i join public.workspaces w on w.id=i.workspace_id where i.invited_user_id=actor and i.status='pending' and i.expires_at>now();
 return result;
end $$;
revoke all on function private.institute_state(uuid),private.institute_inbox() from public,anon;
grant execute on function private.institute_state(uuid),private.institute_inbox() to authenticated;
create function public.institute_state(p_workspace_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select private.institute_state(p_workspace_id) $$;
create function public.institute_inbox() returns jsonb language sql security invoker set search_path='' as $$ select private.institute_inbox() $$;
revoke all on function public.institute_state(uuid),public.institute_inbox() from public,anon;
grant execute on function public.institute_state(uuid),public.institute_inbox() to authenticated;
