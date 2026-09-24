-- Keep Free onboarding functional while Plus and Pro remain invitation-only during the closed beta.
alter table private.account_entitlements
  drop constraint if exists account_entitlements_source_check;

alter table private.account_entitlements
  add constraint account_entitlements_source_check
  check (source in ('legacy','signup','beta_self_selection','beta_invitation','admin','subscription'));
