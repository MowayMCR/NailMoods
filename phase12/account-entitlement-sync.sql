-- Garde account_entitlements synchronisé pour les nouveaux comptes et les
-- changements administratifs, sans donner de droit d'écriture au navigateur.
begin;

alter table private.account_entitlements
drop constraint if exists account_entitlements_source_check;
alter table private.account_entitlements
add constraint account_entitlements_source_check
check (source in ('signup','legacy','beta_self_selection','admin','subscription'));

create or replace function private.sync_profile_account_entitlement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into private.account_entitlements(
    user_id, tier, status, source, starts_at, expires_at, updated_at
  ) values (
    new.id,
    new.account_tier,
    'active',
    case when tg_op = 'INSERT' then 'signup' else 'admin' end,
    now(),
    null,
    now()
  )
  on conflict (user_id) do update
  set tier = excluded.tier,
      status = 'active',
      source = case
        -- La RPC bêta écrit d'abord l'entitlement : préserver sa provenance.
        when private.account_entitlements.tier = excluded.tier
          then private.account_entitlements.source
        else 'admin'
      end,
      starts_at = case
        when private.account_entitlements.tier is distinct from excluded.tier
          then now()
        else private.account_entitlements.starts_at
      end,
      expires_at = null,
      updated_at = now();
  return new;
end
$$;

revoke all on function private.sync_profile_account_entitlement()
from public, anon, authenticated;

drop trigger if exists sync_profile_account_entitlement on public.profiles;
create trigger sync_profile_account_entitlement
after insert or update of account_tier on public.profiles
for each row execute function private.sync_profile_account_entitlement();

commit;
