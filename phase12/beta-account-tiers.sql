-- Recette uniquement. Appliquer avec le frontend correspondant sur un backend
-- de recette : les restrictions Free changent les droits d'écriture existants.
begin;
create table private.beta_tier_testers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 expires_at timestamptz not null,
 granted_at timestamptz not null default now()
);
alter table private.beta_tier_testers enable row level security;
revoke all on private.beta_tier_testers from public, anon, authenticated;
create table private.beta_tier_events (
 id bigint generated always as identity primary key,
 user_id uuid not null,
 previous_tier text not null,
 next_tier text not null,
 changed_at timestamptz not null default now()
);
alter table private.beta_tier_events enable row level security;
revoke all on private.beta_tier_events from public, anon, authenticated;

create function private.beta_tier_state() returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); tier text;
begin
 if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
 select account_tier into strict tier from public.profiles where id=actor;
 return jsonb_build_object('tier',tier,'canChange',exists(
 select 1 from private.beta_tier_testers where user_id=actor and expires_at>now()));
end $$;
create function private.apply_beta_tier(p_tier text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); previous text;
begin
 if actor is null then raise exception 'authentication_required' using errcode='42501'; end if;
 perform 1 from private.beta_tier_testers where user_id=actor and expires_at>now() for update;
 if not found then raise exception 'beta_access_required' using errcode='42501'; end if;
 if p_tier is null or p_tier not in ('free','plus','pro') then raise exception 'invalid_tier' using errcode='22023'; end if;
 select account_tier into strict previous from public.profiles where id=actor for update;
 update public.profiles set account_tier=p_tier where id=actor;
 if previous<>p_tier then
 insert into private.beta_tier_events(user_id,previous_tier,next_tier) values(actor,previous,p_tier);
 end if;
 return private.beta_tier_state();
end $$;
revoke all on function private.beta_tier_state(), private.apply_beta_tier(text) from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.beta_tier_state(),private.apply_beta_tier(text) to authenticated;
create function public.beta_tier_state() returns jsonb language sql security invoker set search_path='' as $$ select private.beta_tier_state() $$;
create function public.apply_beta_tier(p_tier text) returns jsonb language sql security invoker set search_path='' as $$ select private.apply_beta_tier(p_tier) $$;
revoke all on function public.beta_tier_state(),public.apply_beta_tier(text) from public,anon;
grant execute on function public.beta_tier_state(),public.apply_beta_tier(text) to authenticated;

-- Source courante DB, jamais user_metadata, JWT tier ou localStorage.
create function private.tier_allows(p_pro boolean default false) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles where id=auth.uid()
 and (account_tier='pro' or (not p_pro and account_tier='plus')))
$$;
revoke all on function private.tier_allows(boolean) from public,anon;
grant execute on function private.tier_allows(boolean) to authenticated;

-- RESTRICTIVE = AND avec les policies d'isolation existantes, jamais un OR.
-- Free garde la lecture de ses données existantes et l'export. Aucune suppression.
do $$ declare t text; op text; begin
 foreach t in array array['user_products','user_stickers','user_equipment','inspirations','journal_entries','favorites','pro_profiles'] loop
  foreach op in array array['INSERT','UPDATE','DELETE'] loop
   execute format('create policy %I on public.%I as restrictive for %s to authenticated %s',
    'beta_tier_'||lower(op),t,op,
    case when op='INSERT' then 'with check ((select private.tier_allows('||(t='pro_profiles')::text||')))'
         when op='DELETE' then 'using ((select private.tier_allows('||(t='pro_profiles')::text||')))'
         else 'using ((select private.tier_allows('||(t='pro_profiles')::text||'))) with check ((select private.tier_allows('||(t='pro_profiles')::text||')))' end);
  end loop;
 end loop;
end $$;
-- account_tier n'est déjà pas modifiable par authenticated : préserver les
-- grants par colonnes existants, ne jamais réaccorder UPDATE sur profiles.
do $$ begin
 if has_column_privilege('authenticated','public.profiles','account_tier','UPDATE') then
  raise exception 'unsafe_existing_account_tier_grant';
 end if;
end $$;
-- Also applies to writes performed through SECURITY DEFINER RPCs. A downgrade
-- changes only profiles; it never traverses or deletes the retained data.
create function private.enforce_beta_workspace_tier() returns trigger
language plpgsql security definer set search_path='' as $$
declare target_space uuid; pro_required boolean:=false;
begin
 if auth.role()='authenticated' then
  if tg_table_name='workspaces' then
   pro_required := case when tg_op='DELETE' then old.kind<>'personal'
    when tg_op='INSERT' then new.kind<>'personal'
    else old.kind<>'personal' or new.kind<>'personal' end;
   if not pro_required then
    if tg_op='DELETE' then return old; else return new; end if;
   end if;
  else
   if tg_op='DELETE' then target_space:=old.workspace_id; else target_space:=new.workspace_id; end if;
   select kind<>'personal' into pro_required from public.workspaces where id=target_space;
   if pro_required is null then raise exception 'workspace_required' using errcode='42501'; end if;
   if tg_op='UPDATE' then
    pro_required:=pro_required or exists(select 1 from public.workspaces where id=old.workspace_id and kind<>'personal');
   end if;
   pro_required:=pro_required or tg_table_name='pro_profiles';
  end if;
  if not private.tier_allows(pro_required) then raise exception 'account_tier_required' using errcode='42501'; end if;
 end if;
 if tg_op='DELETE' then return old; else return new; end if;
end $$;
revoke all on function private.enforce_beta_workspace_tier() from public,anon,authenticated;
do $$ declare t text; begin
 foreach t in array array['workspaces','user_products','user_stickers','user_equipment','inspirations','journal_entries','pro_profiles'] loop
  execute format('create trigger enforce_beta_tier before insert or update on public.%I for each row execute function private.enforce_beta_workspace_tier()',t);
 end loop;
end $$;
commit;
