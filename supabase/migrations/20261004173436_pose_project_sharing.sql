-- Lot 5: the existing private PO share is an authorized, frozen export of a
-- pose_project. No public link/token and no second model of a pose.
alter table public.inspiration_shares add column pose_project_id uuid references public.pose_projects(id) on delete cascade;
create index inspiration_shares_pose_project_idx on public.inspiration_shares(pose_project_id) where pose_project_id is not null;

create function private.pose_share_product(p jsonb) returns jsonb
language sql immutable set search_path='' as $$
 select private.share_product(p || jsonb_build_object('color',case
 when p->>'colorSource'='palette' and coalesce(p->>'catalogColorValidated','false')<>'true' and coalesce(p->>'conceptual','false')<>'true' then null
 when p->>'catalogColorValidated'='true' and p->>'catalogColor' ~* '^#[0-9a-f]{6}$' then p->>'catalogColor'
 when p->>'confirmedColor' ~* '^#[0-9a-f]{6}$' then p->>'confirmedColor'
 when p->>'shade' ~* '^#[0-9a-f]{6}$' then p->>'shade'
 when (not p ? 'shade' and p->>'colorSource' in ('manual','photo')) or p->>'conceptual'='true' then p->>'color' else null end,
 'catalogId',coalesce(p->>'catalogId',p->'provenance'->>'catalogId'))) || jsonb_build_object(
 'finish',left(p->>'finish',60),'effect',left(p->>'effect',60),'opacity',left(coalesce(p->>'opacity',p->>'coverage'),40),
 'equipmentCategory',left(p->>'equipmentCategory',80),'productKind',left(p->>'productKind',60));
$$;
revoke all on function private.pose_share_product(jsonb) from public,anon,authenticated;

create function private.pose_share_preview(p_project_id uuid,p_include_notes boolean default false,p_include_images boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.pose_projects; idea jsonb; products jsonb; equipment jsonb; techniques jsonb; requirements jsonb; images jsonb:='[]';
begin
 perform private.require_feature('social');
 select x.* into p from public.pose_projects x join public.workspaces w on w.id=x.workspace_id
 where x.id=p_project_id and x.user_id=auth.uid() and w.owner_user_id=auth.uid() and w.kind='personal';
 if p.id is null then raise exception 'PROJECT_UNAVAILABLE' using errcode='42501';end if;
 idea:=p.details->'composition';
 if jsonb_typeof(idea) is distinct from 'object' or jsonb_typeof(idea->'palette') is distinct from 'array' then raise exception 'COMPOSITION_REQUIRED';end if;
 select coalesce(jsonb_agg(private.pose_share_product(e.value) order by e.ord),'[]') into products
 from jsonb_array_elements(idea->'palette') with ordinality e(value,ord) where e.ord<=5 and coalesce(e.value->>'unpainted','false')<>'true';
 select coalesce(jsonb_agg(private.pose_share_product(e.value) order by e.ord),'[]') into equipment
 from jsonb_array_elements(coalesce(idea->'resources','[]')) with ordinality e(value,ord) where e.ord<=12;
 select coalesce(jsonb_agg(label order by label),'[]') into techniques from (
 select distinct left(trim(v),80) label from (
 select jsonb_array_elements_text(coalesce(idea->'techniques','[]')) v
 union all select jsonb_array_elements_text(coalesce(idea->'options'->'techniques','[]'))
 union all select idea->>'technique'
 union all select n->>'drawing' from jsonb_array_elements(coalesce(idea->'nails','[]')) n
 ) raw where v is not null and v not in ('','plain','simple') limit 8) labels;
 select coalesce(jsonb_agg(label order by label),'[]') into requirements from (
 select distinct left(trim(v),120) label from (
 select case when jsonb_typeof(r)='string' then r#>>'{}' else r->>'name' end v from jsonb_array_elements(coalesce(idea->'requirements','[]')) r
 union all select 'Pinceau liner' where exists(select 1 from jsonb_array_elements(coalesce(idea->'nails','[]')) n where n->>'drawing'='french')
 union all select 'Dotting tool' where exists(select 1 from jsonb_array_elements(coalesce(idea->'nails','[]')) n where n->>'drawing'='dots')
 union all select 'Pinceau détail' where exists(select 1 from jsonb_array_elements(coalesce(idea->'nails','[]')) n where n->>'drawing'='line')
 ) raw where v is not null and trim(v)<>'' limit 12) labels;
 if coalesce(p_include_images,false) and p.details->'outfitMedia'->>'path' is not null then
 images:=jsonb_build_array(jsonb_build_object('src',p.details->'outfitMedia'->>'path'));
 end if;
 return jsonb_build_object('title',p.title,'source_type','pose','project_revision',p.revision,
 'preview',private.discovery_preview(idea),'products',products,'equipment',equipment,'techniques',techniques,'requirements',requirements,
 'colors',coalesce((select jsonb_agg(v->>'color') from jsonb_array_elements(products) v where v->>'color' ~* '^#[0-9a-f]{6}$'),'[]'),
 'mood',left(idea->'options'->>'mood',80),'level',case idea->>'rank' when '0' then 'Simple' when '1' then 'Intermédiaire' when '2' then 'Pro' else 'À préciser' end,
 'missing','[]'::jsonb,'include_notes',coalesce(p_include_notes,false),'notes',case when coalesce(p_include_notes,false) then left(p.details->>'notes',2000) else '' end,
 'include_images',coalesce(p_include_images,false),'images',images);
end $$;
revoke all on function private.pose_share_preview(uuid,boolean,boolean) from public,anon;
grant execute on function private.pose_share_preview(uuid,boolean,boolean) to authenticated;
create function public.pose_share_preview(p_project_id uuid,p_include_notes boolean default false,p_include_images boolean default false)
returns jsonb language sql security invoker set search_path='' as $$select private.pose_share_preview(p_project_id,p_include_notes,p_include_images)$$;
revoke all on function public.pose_share_preview(uuid,boolean,boolean) from public,anon;
grant execute on function public.pose_share_preview(uuid,boolean,boolean) to authenticated;

create function private.send_pose_project_to_po(p_project_id uuid,p_revision integer,p_recipient_workspace_id uuid,p_client_id uuid,p_include_notes boolean default false,p_include_images boolean default false)
returns uuid language plpgsql security definer set search_path='' as $$
declare p public.pose_projects; payload jsonb; sid uuid; existing public.inspiration_shares;
begin
 perform private.require_feature('social');
 if auth.uid() is null or p_client_id is null then raise exception 'CONFIRMED_ACCOUNT_REQUIRED' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_client_id::text,0));
 select * into existing from public.inspiration_shares where sender_id=auth.uid() and client_id=p_client_id;
 if existing.id is not null then
 if existing.pose_project_id is distinct from p_project_id or existing.recipient_workspace_id is distinct from p_recipient_workspace_id
 or existing.snapshot->>'project_revision' is distinct from p_revision::text
 or existing.snapshot->'include_notes' is distinct from to_jsonb(coalesce(p_include_notes,false))
 or existing.snapshot->'include_images' is distinct from to_jsonb(coalesce(p_include_images,false)) then raise exception 'SHARE_ATTEMPT_CHANGED';end if;
 perform private.nm_share_detail(existing.id);return existing.id;
 end if;
 select * into p from public.pose_projects where id=p_project_id and user_id=auth.uid() for share;
 if p.id is null then raise exception 'PROJECT_UNAVAILABLE' using errcode='42501';end if;
 if p_revision is distinct from p.revision then raise exception 'PROJECT_CHANGED';end if;
 payload:=private.pose_share_preview(p_project_id,p_include_notes,p_include_images);
 -- Existing RPC enforces recipient Pro + accepted connection, block/suspension,
 -- both participants' social entitlements, rate limit and private image ownership.
 sid:=private.send_nailmoods_share_to_po(p_recipient_workspace_id,p.id::text,payload||jsonb_build_object('client_id',p_client_id));
 update public.inspiration_shares set pose_project_id=p.id,snapshot=payload where id=sid and sender_id=auth.uid();
 return sid;
end $$;
revoke all on function private.send_pose_project_to_po(uuid,integer,uuid,uuid,boolean,boolean) from public,anon;
grant execute on function private.send_pose_project_to_po(uuid,integer,uuid,uuid,boolean,boolean) to authenticated;
create function public.send_pose_project_to_po(p_project_id uuid,p_revision integer,p_recipient_workspace_id uuid,p_client_id uuid,p_include_notes boolean default false,p_include_images boolean default false)
returns uuid language sql security invoker set search_path='' as $$select private.send_pose_project_to_po(p_project_id,p_revision,p_recipient_workspace_id,p_client_id,p_include_notes,p_include_images)$$;
revoke all on function public.send_pose_project_to_po(uuid,integer,uuid,uuid,boolean,boolean) from public,anon;
grant execute on function public.send_pose_project_to_po(uuid,integer,uuid,uuid,boolean,boolean) to authenticated;

create function private.pose_project_shares(p_project_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.pose_projects where id=p_project_id and user_id=auth.uid()) then raise exception 'PROJECT_UNAVAILABLE' using errcode='42501';end if;
 return coalesce((select jsonb_agg(row_to_json(r) order by r.created_at desc) from (
 select s.id,s.created_at,p.username as handle,p.display_name,s.snapshot->>'project_revision' as revision
 from public.inspiration_shares s join public.profiles p on p.id=s.recipient_id
 where s.pose_project_id=p_project_id and s.sender_id=auth.uid()
 ) r),'[]');
end $$;
revoke all on function private.pose_project_shares(uuid) from public,anon;
grant execute on function private.pose_project_shares(uuid) to authenticated;
create function public.pose_project_shares(p_project_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.pose_project_shares(p_project_id)$$;
revoke all on function public.pose_project_shares(uuid) from public,anon;
grant execute on function public.pose_project_shares(uuid) to authenticated;

create function private.revoke_pose_share(p_share_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 delete from public.inspiration_shares where id=p_share_id and sender_id=auth.uid() and pose_project_id is not null;
 if not found then raise exception 'SHARE_UNAVAILABLE' using errcode='42501';end if;
end $$;
revoke all on function private.revoke_pose_share(uuid) from public,anon;
grant execute on function private.revoke_pose_share(uuid) to authenticated;
create function public.revoke_pose_share(p_share_id uuid) returns void language sql security invoker set search_path='' as $$select private.revoke_pose_share(p_share_id)$$;
revoke all on function public.revoke_pose_share(uuid) from public,anon;
grant execute on function public.revoke_pose_share(uuid) to authenticated;
