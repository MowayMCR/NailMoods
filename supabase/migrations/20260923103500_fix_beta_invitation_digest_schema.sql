-- pgcrypto is installed in the extensions schema on Supabase projects.
create or replace function private.issue_beta_invitation(p_tier text, p_label text default '')
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); raw_code text; invitation_id uuid;
begin
  if actor is null or not private.nm_support_staff() then raise exception 'staff_required' using errcode = '42501'; end if;
  if p_tier not in ('plus','pro') then raise exception 'invalid_tier' using errcode = '22023'; end if;
  if char_length(coalesce(p_label,'')) > 80 then raise exception 'invalid_label' using errcode = '22023'; end if;
  raw_code := 'NM-' || upper(substr(encode(extensions.gen_random_bytes(9),'hex'),1,6)) || '-' || upper(substr(encode(extensions.gen_random_bytes(9),'hex'),1,6));
  insert into private.beta_invitation_codes(code_hash,tier,label,created_by) values (extensions.digest(raw_code,'sha256'),p_tier,coalesce(trim(p_label),''),actor) returning id into invitation_id;
  return jsonb_build_object('id',invitation_id,'code',raw_code,'tier',p_tier,'expiresAt',(now()+interval '30 days'));
end $$;

create or replace function private.redeem_beta_invitation(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); invitation private.beta_invitation_codes; previous text; expires timestamptz := now() + interval '12 months';
begin
  if actor is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if private.nm_age_band(actor) <> '18_plus' then raise exception 'beta_invitation_requires_adult_account' using errcode = '42501'; end if;
  if p_code is null or upper(trim(p_code)) !~ '^NM-[A-F0-9]{6}-[A-F0-9]{6}$' then raise exception 'invalid_invitation_code' using errcode = '22023'; end if;
  select * into invitation from private.beta_invitation_codes where code_hash = extensions.digest(upper(trim(p_code)),'sha256') for update;
  if invitation.id is null or invitation.redeemed_at is not null or invitation.expires_at <= now() then raise exception 'invitation_unavailable' using errcode = '42501'; end if;
  if exists(select 1 from private.beta_founders where user_id=actor) then raise exception 'founder_already_awarded' using errcode = '42501'; end if;
  select account_tier into strict previous from public.profiles where id=actor for update;
  update private.beta_invitation_codes set redeemed_by=actor, redeemed_at=now() where id=invitation.id;
  insert into private.beta_founders(user_id,invitation_id,awarded_tier,expires_at) values(actor,invitation.id,invitation.tier,expires);
  insert into private.account_entitlements(user_id,tier,status,source,starts_at,expires_at,updated_at) values(actor,invitation.tier,'active','beta_invitation',now(),expires,now()) on conflict(user_id) do update set tier=excluded.tier,status='active',source='beta_invitation',starts_at=now(),expires_at=excluded.expires_at,updated_at=now();
  update public.profiles set account_tier=invitation.tier where id=actor;
  if previous is distinct from invitation.tier then insert into private.account_tier_selection_events(user_id,previous_tier,selected_tier,source) values(actor,previous,invitation.tier,'beta_invitation'); end if;
  return private.account_offer_state();
end $$;
