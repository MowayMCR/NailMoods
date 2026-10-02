-- Additive shared reference; no changes to user accounts or subscription rights.
create table if not exists public.equipment_library (
 id text primary key, slug text not null unique, name text not null,
 category text not null, aliases jsonb not null default '[]'::jsonb,
 sort_order integer not null default 0, active boolean not null default true
);
alter table public.equipment_library enable row level security;
revoke all on public.equipment_library from anon,authenticated;
grant select on public.equipment_library to anon,authenticated;
create policy equipment_library_read on public.equipment_library for select to anon,authenticated using (active);
insert into public.equipment_library (id,slug,name,category,aliases,sort_order) values
('nm-tool-lime-ongles','lime-ongles','Lime à ongles','Préparation / manucure','["lime", "nail file"]'::jsonb,0),
('nm-tool-buffer','buffer','Buffer / bloc polissoir','Préparation / manucure','["buffer", "polissoir"]'::jsonb,10),
('nm-tool-repousse-cuticules','repousse-cuticules','Repousse-cuticules','Préparation / manucure','["cuticle pusher"]'::jsonb,20),
('nm-tool-pince-cuticules','pince-cuticules','Pince à cuticules','Préparation / manucure','[]'::jsonb,30),
('nm-tool-ciseaux-cuticules','ciseaux-cuticules','Ciseaux à cuticules','Préparation / manucure','[]'::jsonb,40),
('nm-tool-brosse-poussiere','brosse-poussiere','Brosse à poussière','Préparation / manucure','[]'::jsonb,50),
('nm-tool-brosse-ongles','brosse-ongles','Brosse à ongles','Préparation / manucure','[]'::jsonb,60),
('nm-tool-lampe-uv','lampe-uv','Lampe UV','Pose','[]'::jsonb,70),
('nm-tool-lampe-led','lampe-led','Lampe LED','Pose','[]'::jsonb,80),
('nm-tool-lampe-uv-led','lampe-uv-led','Lampe UV/LED','Pose','["Lampe UV / LED", "Ma lampe LED"]'::jsonb,90),
('nm-tool-capsules','capsules','Capsules / tips','Pose','["nail tips"]'::jsonb,100),
('nm-tool-coupe-capsules','coupe-capsules','Coupe-capsules','Pose','[]'::jsonb,110),
('nm-tool-chablons','chablons','Chablons','Pose','[]'::jsonb,120),
('nm-tool-dual-forms','dual-forms','Dual forms / popits','Pose','["popit"]'::jsonb,130),
('nm-tool-pinces-maintien','pinces-maintien','Pinces de maintien','Pose','[]'::jsonb,140),
('nm-tool-pinceau-liner','pinceau-liner','Pinceau liner','Nail art','["liner"]'::jsonb,150),
('nm-tool-pinceau-detail','pinceau-detail','Pinceau détail','Nail art','[]'::jsonb,160),
('nm-tool-pinceau-plat','pinceau-plat','Pinceau plat','Nail art','[]'::jsonb,170),
('nm-tool-pinceau-degrade','pinceau-degrade','Pinceau dégradé','Nail art','[]'::jsonb,180),
('nm-tool-dotting-tool','dotting-tool','Dotting tool','Nail art','["outil à pois"]'::jsonb,190),
('nm-tool-eponge','eponge','Éponge nail art','Nail art','["Éponge à dégradé"]'::jsonb,200),
('nm-tool-palette','palette','Palette de mélange','Nail art','["Palette"]'::jsonb,210),
('nm-tool-pince-precision','pince-precision','Pince de précision','Nail art','[]'::jsonb,220),
('nm-tool-attrape-strass','attrape-strass','Crayon attrape-strass','Nail art','[]'::jsonb,230),
('nm-tool-aimant-cat-eye','aimant-cat-eye','Aimant Cat Eye','Nail art','["Aimant cat-eye", "aimant magnétique"]'::jsonb,240),
('nm-tool-tampon-stamping','tampon-stamping','Tampon stamping','Stamping','[]'::jsonb,250),
('nm-tool-plaques-stamping','plaques-stamping','Plaques stamping','Stamping','[]'::jsonb,260),
('nm-tool-raclette-stamping','raclette-stamping','Raclette stamping','Stamping','[]'::jsonb,270),
('nm-tool-ponceuse','ponceuse','Ponceuse','Dépose / préparation électrique','[]'::jsonb,280),
('nm-tool-embouts-ponceuse','embouts-ponceuse','Embouts de ponceuse','Dépose / préparation électrique','[]'::jsonb,290),
('nm-tool-clips-depose','clips-depose','Clips de dépose','Dépose / préparation électrique','[]'::jsonb,300),
('nm-tool-aspirateur','aspirateur','Aspirateur à poussière','Équipement de poste','[]'::jsonb,310),
('nm-tool-repose-main','repose-main','Repose-main','Équipement de poste','[]'::jsonb,320),
('nm-tool-tapis','tapis','Tapis de manucure','Équipement de poste','[]'::jsonb,330)
on conflict (slug) do update set name=excluded.name,category=excluded.category,aliases=excluded.aliases,sort_order=excluded.sort_order;
-- Metadata follows the existing collection mapping and preserves legacy tools.
create unique index if not exists user_equipment_library_unique on public.user_equipment
 (workspace_id,(metadata->'nailmoods'->>'equipmentSlug'))
 where metadata->'nailmoods'->>'equipmentSlug' is not null;
create schema if not exists private;
create table if not exists private.product_import_quota (
 user_id uuid primary key references auth.users(id) on delete cascade,
 window_start timestamptz not null, requests integer not null
);
alter table private.product_import_quota enable row level security;
revoke all on private.product_import_quota from public,anon,authenticated;
-- Authentication and ownership are checked before the private counter update.
create or replace function public.nm_product_import_quota() returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); n integer;
begin
 if uid is null or not exists(select 1 from auth.users where id=uid) then return false; end if;
 insert into private.product_import_quota as q(user_id,window_start,requests)
 values(uid,clock_timestamp(),1)
 on conflict(user_id) do update set
 requests=case when q.window_start < clock_timestamp()-interval '1 minute' then 1 else least(q.requests+1,31) end,
 window_start=case when q.window_start < clock_timestamp()-interval '1 minute' then clock_timestamp() else q.window_start end
 returning requests into n;
 return n<=30;
end $$;
revoke all on function public.nm_product_import_quota() from public,anon;
grant execute on function public.nm_product_import_quota() to authenticated;

-- Serialize equipment identity checks per workspace, including custom tools.
-- Legacy duplicates are retained; an unrelated edit does not rewrite them.
create or replace function private.nm_equipment_no_duplicate() returns trigger
language plpgsql security invoker set search_path='' as $$
declare key text;
begin
 if TG_OP='UPDATE' and new.name is not distinct from old.name and new.equipment_category is not distinct from old.equipment_category then return new; end if;
 key := regexp_replace(translate(lower(btrim(new.name)),'àâäéèêëîïôöùûüç','aaaeeeeiioouuuc'),'[^a-z0-9]+',' ','g');
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.workspace_id::text,0));
 if exists(select 1 from public.user_equipment e where e.workspace_id=new.workspace_id and e.id<>new.id
 and regexp_replace(translate(lower(btrim(e.name)),'àâäéèêëîïôöùûüç','aaaeeeeiioouuuc'),'[^a-z0-9]+',' ','g')=key) then
 raise exception 'Equipment already exists' using errcode='23505'; end if;
 return new;
end $$;
revoke all on function private.nm_equipment_no_duplicate() from public,anon,authenticated;
create trigger nm_equipment_no_duplicate before insert or update of name,equipment_category on public.user_equipment
 for each row execute function private.nm_equipment_no_duplicate();
