-- Internal fixture preparation only; not exposed to ordinary users.
create function public.prepare_recette_fixture(p_label text,p_user uuid,p_credentials jsonb) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_label not in ('A','B','C','D') or not exists(select 1 from auth.users where id=p_user and email=p_credentials->>'email' and email like '%@nailmoods-recette.invalid') then raise exception 'invalid_fixture';end if;
 update public.profiles set account_tier=case p_label when 'A' then 'plus' when 'B' then 'pro' else 'free' end,display_name='Recette '||p_label where id=p_user;
 if p_label<>'D' then insert into private.beta_tier_testers(user_id,expires_at) values(p_user,now()+interval '14 days') on conflict(user_id) do update set expires_at=excluded.expires_at;end if;
 if not exists(select 1 from vault.secrets where name='RECETTE_ACCOUNT_'||p_label) then perform vault.create_secret(p_credentials::text,'RECETTE_ACCOUNT_'||p_label);end if;
end$$;
create function public.read_recette_fixture(p_label text) returns jsonb language sql security definer set search_path='' as $$
select decrypted_secret::jsonb from vault.decrypted_secrets where p_label in ('A','B','C','D') and name='RECETTE_ACCOUNT_'||p_label
$$;
revoke all on function public.prepare_recette_fixture(text,uuid,jsonb),public.read_recette_fixture(text) from public,anon,authenticated;
grant execute on function public.prepare_recette_fixture(text,uuid,jsonb),public.read_recette_fixture(text) to service_role;
create table public.recette_test_runs(id uuid primary key default gen_random_uuid(),created_at timestamptz default now(),results jsonb not null);
alter table public.recette_test_runs enable row level security;
revoke all on public.recette_test_runs from public,anon,authenticated;
