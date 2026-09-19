-- Empty recette project only. No production data or identifiers.
create schema if not exists private;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;
create table public.profiles(id uuid primary key references auth.users on delete cascade, account_tier text not null default 'free' check(account_tier in ('free','plus','pro')),display_name text not null default '',avatar_url text,preferences jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.workspaces(id uuid primary key default gen_random_uuid(),owner_user_id uuid not null references auth.users on delete cascade,kind text not null check(kind in ('personal','pro','institute','creator')),name text not null,created_at timestamptz not null default now());
create table public.workspace_members(workspace_id uuid references public.workspaces on delete cascade,user_id uuid references auth.users on delete cascade,role text not null check(role in ('owner','member')),created_at timestamptz not null default now(),primary key(workspace_id,user_id));
create index membership_user on public.workspace_members(user_id);
create function private.is_workspace_member(w uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.workspace_members where workspace_id=w and user_id=auth.uid())$$;
create function private.is_workspace_owner(w uuid) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.workspaces where id=w and owner_user_id=auth.uid())$$;
revoke all on function private.is_workspace_member(uuid),private.is_workspace_owner(uuid) from public,anon;
grant execute on function private.is_workspace_member(uuid),private.is_workspace_owner(uuid) to authenticated;
create function private.provision_account() returns trigger language plpgsql security definer set search_path='' as $$declare w uuid;begin
insert into public.profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name',''));
insert into public.workspaces(owner_user_id,kind,name) values(new.id,'personal','Personnel') returning id into w;
insert into public.workspace_members values(w,new.id,'owner',now());return new;end$$;
revoke all on function private.provision_account() from public,anon,authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.provision_account();
create table public.user_products(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,created_by uuid not null references auth.users on delete cascade,catalog_id text,brand text,product_range text,shade_name text,reference text,barcode text,hex text,source text not null default 'personal',is_verified boolean not null default false,metadata jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.user_stickers(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,created_by uuid not null references auth.users on delete cascade,name text,tags text[] not null default '{}',image_url text,metadata jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.user_equipment(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,created_by uuid not null references auth.users on delete cascade,name text,equipment_category text,tool_subtype text,liner_length_mm numeric,tip_type text,compatible_systems text[] not null default '{}',metadata jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.inspirations(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,created_by uuid not null references auth.users on delete cascade,title text,mood text,is_public boolean not null default false,snapshot jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.journal_entries(id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces on delete cascade,created_by uuid not null references auth.users on delete cascade,inspiration_id uuid references public.inspirations on delete set null,performed_on date,notes text,photo_url text,snapshot jsonb not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.pro_profiles(id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users on delete cascade,workspace_id uuid not null unique references public.workspaces on delete cascade,display_name text,bio text,avatar_url text,city text,social_url text,is_public boolean not null default false,is_verified boolean not null default false,styles text[] not null default '{}',created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create table public.favorites(user_id uuid references auth.users on delete cascade,entity_type text check(entity_type in ('inspiration','pro_profile')),entity_id uuid not null,created_at timestamptz not null default now(),primary key(user_id,entity_type,entity_id));
create table public.pro_follows(user_id uuid references auth.users on delete cascade,pro_profile_id uuid references public.pro_profiles on delete cascade,created_at timestamptz not null default now(),primary key(user_id,pro_profile_id));
create table public.conversations(id uuid primary key default gen_random_uuid(),created_by uuid not null references auth.users on delete cascade,related_inspiration_id uuid references public.inspirations on delete set null,created_at timestamptz not null default now());
create table public.conversation_members(conversation_id uuid references public.conversations on delete cascade,user_id uuid references auth.users on delete cascade,last_read_at timestamptz,created_at timestamptz not null default now(),primary key(conversation_id,user_id));
create table public.messages(id uuid primary key default gen_random_uuid(),conversation_id uuid not null references public.conversations on delete cascade,sender_id uuid not null references auth.users on delete cascade,body text,inspiration_id uuid references public.inspirations on delete set null,created_at timestamptz not null default now());
create table public.inspiration_shares(id uuid primary key default gen_random_uuid(),inspiration_id uuid references public.inspirations on delete cascade,sender_id uuid references auth.users on delete cascade,recipient_id uuid references auth.users on delete cascade,created_at timestamptz not null default now());
create function private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$begin new.updated_at=clock_timestamp();return new;end$$;
revoke all on function private.touch_updated_at() from public,anon,authenticated;
do $$declare t text;begin
foreach t in array array['profiles','workspaces','workspace_members','user_products','user_stickers','user_equipment','inspirations','journal_entries','pro_profiles','favorites','pro_follows','conversations','conversation_members','messages','inspiration_shares'] loop
execute format('alter table public.%I enable row level security',t);
execute format('revoke all on public.%I from anon,authenticated',t);
end loop;
foreach t in array array['profiles','user_products','user_stickers','user_equipment','inspirations','journal_entries','pro_profiles'] loop
execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',t);
end loop;
foreach t in array array['user_products','user_stickers','user_equipment','inspirations','journal_entries'] loop
execute format('grant select,insert,update,delete on public.%I to authenticated',t);
execute format('create index on public.%I(workspace_id)',t);
execute format('create policy workspace_read on public.%I for select to authenticated using(private.is_workspace_member(workspace_id))',t);
execute format('create policy workspace_insert on public.%I for insert to authenticated with check(created_by=auth.uid() and private.is_workspace_member(workspace_id))',t);
execute format('create policy workspace_update on public.%I for update to authenticated using(created_by=auth.uid() and private.is_workspace_member(workspace_id)) with check(created_by=auth.uid() and private.is_workspace_member(workspace_id))',t);
execute format('create policy workspace_delete on public.%I for delete to authenticated using(created_by=auth.uid() and private.is_workspace_member(workspace_id))',t);
end loop;end$$;
grant select on public.profiles,public.workspaces,public.workspace_members to authenticated;
grant update(display_name,avatar_url,preferences) on public.profiles to authenticated;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid());
create policy profile_update on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy workspace_read on public.workspaces for select to authenticated using(private.is_workspace_member(id));
create policy membership_read on public.workspace_members for select to authenticated using(private.is_workspace_member(workspace_id));
grant select,insert,delete on public.favorites to authenticated;
create policy favorites_own on public.favorites for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
grant select,delete on public.pro_profiles to authenticated;
grant insert(id,user_id,workspace_id,display_name,bio,avatar_url,city,social_url,is_public,styles),update(display_name,bio,avatar_url,city,social_url,is_public,styles) on public.pro_profiles to authenticated;
create policy pro_own on public.pro_profiles for all to authenticated using(user_id=auth.uid() and private.is_workspace_owner(workspace_id)) with check(user_id=auth.uid() and private.is_workspace_owner(workspace_id) and exists(select 1 from public.profiles where id=auth.uid() and account_tier='pro'));
-- Social tables deliberately deny all client access until their protected lot.
