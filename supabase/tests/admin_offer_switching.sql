-- Isolated Recette fixture test: all grants, consent fixture changes and tier
-- changes roll back. Never run this fixture setup against Production.
begin;
insert into private.account_administrators(user_id) values('a4a83c09-2eb6-4cce-8a2d-b89c97778a45');
-- Upgrade only the test fixture's consent inside the rollback transaction.
update public.user_consents set terms_version='0.3-beta' where user_id='a4a83c09-2eb6-4cce-8a2d-b89c97778a45';
select set_config('request.jwt.claim.sub','a4a83c09-2eb6-4cce-8a2d-b89c97778a45',true);
set local role authenticated;
do $$declare state jsonb; level text; begin
 state:=public.account_offer_state();
 if not (state->>'administrator')::boolean or not (state->>'canChoose')::boolean then raise exception 'Admin selection unavailable: %',state; end if;
 foreach level in array array['free','plus','pro'] loop
  state:=public.choose_beta_account_tier(level);
  if state->>'tier'<>level or not (state->>'administrator')::boolean or not (state->>'canChoose')::boolean then raise exception 'Admin tier failed: %',state;end if;
  if not (public.nm_support('status','{}')->>'staff')::boolean then raise exception 'Staff access lost for %',level;end if;
 end loop;
 begin perform public.choose_beta_account_tier('invalid');raise exception 'Invalid tier accepted';exception when invalid_parameter_value then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub','108100ff-e8e5-4a91-bb5d-d3a3b8f208e1',true);
set local role authenticated;
do $$declare state jsonb;begin
 state:=public.account_offer_state();
 if (state->>'administrator')::boolean or (state->>'canChoose')::boolean then raise exception 'Non-admin was elevated';end if;
 begin perform public.choose_beta_account_tier('pro');raise exception 'Non-admin can upgrade';exception when insufficient_privilege then null;end;
 begin insert into private.account_administrators(user_id) values(auth.uid());raise exception 'Self-promotion allowed';exception when insufficient_privilege then null;end;
end$$;
reset role;
select set_config('request.jwt.claim.sub','a4a83c09-2eb6-4cce-8a2d-b89c97778a45',true);
delete from private.account_administrators where user_id=auth.uid();
set local role authenticated;
do $$begin
 if (public.account_offer_state()->>'canChoose')::boolean then raise exception 'Revoked admin can choose';end if;
 if not (public.nm_support('status','{}')->>'staff')::boolean then raise exception 'Independent staff role lost';end if;
end$$;
reset role;
select jsonb_build_object('admin_free_plus_pro',true,'staff_retained_at_all_tiers',true,'invalid_tier_denied',true,'ordinary_account_cannot_upgrade',true,'self_promotion_denied',true,'revocation_effective',true,'staff_independent_of_admin',true) as checks;
rollback;
