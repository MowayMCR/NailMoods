-- Closed beta: individual one-use invitations, founder recognition and a 12-month entitlement.
-- Codes are never stored in clear text. Issuance is staff-only; redemption is bound to auth.uid().
begin;

alter table private.account_entitlements
  drop constraint if exists account_entitlements_source_check;
alter table private.account_entitlements
  add constraint account_entitlements_source_check
  check (source in ('legacy','beta_self_selection','beta_invitation','admin','subscription'));

create table if not exists private.beta_invitation_codes (
  id uuid primary key default gen_random_uuid(),
  code_hash bytea not null unique,
  tier text not null check (tier in ('plus','pro')),
  label text not null default '' check (char_length(label) <= 80),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  redeemed_by uuid unique references auth.users(id) on delete set null,
  redeemed_at timestamptz,
  check (expires_at > created_at),
  check ((redeemed_by is null) = (redeemed_at is null))
);

create table if not exists private.beta_founders (
  user_id uuid primary key references auth.users(id) on delete cascade,
  invitation_id uuid not null unique references private.beta_invitation_codes(id) on delete restrict,
  awarded_tier text not null check (awarded_tier in ('plus','pro')),
  awarded_at timestamptz not null default now(),
  expires_at timestamptz not null,
  badge text not null default 'Membre fondatrice' check (badge = 'Membre fondatrice'),
  check (expires_at > awarded_at)
);

alter table private.beta_invitation_codes enable row level security;
alter table private.beta_founders enable row level security;
revoke all on private.beta_invitation_codes, private.beta_founders from public, anon, authenticated;

create or replace function private.issue_beta_invitation(p_tier text, p_label text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  raw_code text;
  invitation_id uuid;
begin
  if actor is null or not private.nm_support_staff() then
    raise exception 'staff_required' using errcode = '42501';
  end if;
  if p_tier not in ('plus','pro') then
    raise exception 'invalid_tier' using errcode = '22023';
  end if;
  if char_length(coalesce(p_label,'')) > 80 then
    raise exception 'invalid_label' using errcode = '22023';
  end if;

  raw_code := 'NM-' || upper(substr(encode(gen_random_bytes(9),'hex'),1,6)) || '-' || upper(substr(encode(gen_random_bytes(9),'hex'),1,6));
  insert into private.beta_invitation_codes(code_hash,tier,label,created_by)
  values (extensions.digest(raw_code,'sha256'),p_tier,coalesce(trim(p_label),''),actor)
  returning id into invitation_id;

  return jsonb_build_object('id',invitation_id,'code',raw_code,'tier',p_tier,'expiresAt',(now()+interval '30 days'));
end
$$;

create or replace function private.redeem_beta_invitation(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  invitation private.beta_invitation_codes;
  previous text;
  expires timestamptz := now() + interval '12 months';
begin
  if actor is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;
  if private.nm_age_band(actor) <> '18_plus' then
    raise exception 'beta_invitation_requires_adult_account' using errcode = '42501';
  end if;
  if p_code is null or upper(trim(p_code)) !~ '^NM-[A-F0-9]{6}-[A-F0-9]{6}$' then
    raise exception 'invalid_invitation_code' using errcode = '22023';
  end if;

  select * into invitation
  from private.beta_invitation_codes
  where code_hash = extensions.digest(upper(trim(p_code)),'sha256')
  for update;
  if invitation.id is null or invitation.redeemed_at is not null or invitation.expires_at <= now() then
    raise exception 'invitation_unavailable' using errcode = '42501';
  end if;
  if exists(select 1 from private.beta_founders where user_id=actor) then
    raise exception 'founder_already_awarded' using errcode = '42501';
  end if;

  select account_tier into strict previous from public.profiles where id=actor for update;
  update private.beta_invitation_codes set redeemed_by=actor, redeemed_at=now() where id=invitation.id;
  insert into private.beta_founders(user_id,invitation_id,awarded_tier,expires_at)
  values(actor,invitation.id,invitation.tier,expires);
  insert into private.account_entitlements(user_id,tier,status,source,starts_at,expires_at,updated_at)
  values(actor,invitation.tier,'active','beta_invitation',now(),expires,now())
  on conflict(user_id) do update set tier=excluded.tier,status='active',source='beta_invitation',starts_at=now(),expires_at=excluded.expires_at,updated_at=now();
  update public.profiles set account_tier=invitation.tier where id=actor;
  if previous is distinct from invitation.tier then
    insert into private.account_tier_selection_events(user_id,previous_tier,selected_tier,source)
    values(actor,previous,invitation.tier,'beta_invitation');
  end if;
  return private.account_offer_state();
end
$$;

create or replace function private.account_offer_state()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  current_tier text;
  pro_status text;
  entitlement private.account_entitlements;
  founder private.beta_founders;
begin
  if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
  select private.effective_tier(actor), p.professional_status into strict current_tier, pro_status from public.profiles p where p.id=actor;
  select * into entitlement from private.account_entitlements e where e.user_id=actor;
  select * into founder from private.beta_founders f where f.user_id=actor;
  return jsonb_build_object(
    'tier',current_tier,
    'canChoose',false,
    'reason','selection_disabled',
    'beta',true,
    'source',entitlement.source,
    'selectedAt',entitlement.updated_at,
    'professionalStatus',pro_status,
    'needsProSetup',current_tier='pro' and pro_status is null,
    'choices',jsonb_build_array('free','plus','pro'),
    'founder',case when founder.user_id is null then null else jsonb_build_object('badge',founder.badge,'tier',founder.awarded_tier,'expiresAt',founder.expires_at) end
  );
end
$$;

create or replace function public.redeem_beta_invitation(p_code text)
returns jsonb
language sql
security invoker
set search_path = ''
as $$ select private.redeem_beta_invitation(p_code) $$;

revoke all on function private.issue_beta_invitation(text,text), private.redeem_beta_invitation(text), private.account_offer_state() from public, anon, authenticated;
revoke all on function public.redeem_beta_invitation(text) from public, anon;
grant execute on function private.issue_beta_invitation(text,text) to authenticated;
grant execute on function private.redeem_beta_invitation(text), private.account_offer_state(), public.redeem_beta_invitation(text) to authenticated;

update private.account_offer_settings set enabled=false,updated_at=now() where setting_key='beta_self_selection';
commit;
