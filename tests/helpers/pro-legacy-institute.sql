CREATE OR REPLACE FUNCTION private.institute_action(p_action text, p_workspace_id uuid, p_target_user_id uuid DEFAULT NULL::uuid, p_invitation_id uuid DEFAULT NULL::uuid, p_handle text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
end $function$

