begin;
-- One approved catalogue. Stable IDs overlay the bundled catalogue, never rewrite
-- personal Collection snapshots. Submissions reuse the existing Pro correction queue.
create table private.catalog_products (
 catalog_id text primary key check(length(catalog_id) between 1 and 120),
 data jsonb not null check(jsonb_typeof(data)='object'),
 revision integer not null default 1, archived boolean not null default false,
 workspace_id uuid references public.workspaces(id) on delete set null,
 updated_at timestamptz not null default now()
);
create index catalog_products_workspace_idx on private.catalog_products(workspace_id);
create table private.catalog_imports (
 id uuid primary key default gen_random_uuid(),actor uuid references auth.users(id) on delete set null,
 name text not null,rows jsonb not null,status text not null default 'preview' check(status in ('preview','applied','rolled_back')),
 created_at timestamptz not null default now()
);
create index catalog_imports_actor_idx on private.catalog_imports(actor);
create table private.catalog_history (
 id bigint generated always as identity primary key,catalog_id text not null,
 revision integer not null,previous jsonb, current_value jsonb not null,
 actor uuid references auth.users(id) on delete set null, reason text not null,
 import_id uuid references private.catalog_imports(id) on delete set null,created_at timestamptz not null default now()
);
create index catalog_history_product_idx on private.catalog_history(catalog_id,revision);
create index catalog_history_actor_idx on private.catalog_history(actor);
create index catalog_history_import_idx on private.catalog_history(import_id);
alter table private.pro_correction_requests drop constraint pro_correction_requests_status_check;
alter table private.pro_correction_requests add constraint pro_correction_requests_status_check check(status in ('pending','submitted','under_review','changes_requested','approved','rejected','draft','archived'));
alter table private.pro_correction_requests add column review_note text not null default '';
alter table private.pro_correction_requests add column revision integer not null default 1;
alter table private.pro_showcase_items add column catalog_status text not null default 'draft' check(catalog_status in ('draft','submitted','under_review','changes_requested','approved','rejected','archived'));
alter table private.pro_showcase_items add column catalog_submission jsonb;
alter table private.catalog_products enable row level security;
alter table private.catalog_imports enable row level security;
alter table private.catalog_history enable row level security;
revoke all on private.catalog_products,private.catalog_imports,private.catalog_history from public,anon,authenticated;

create function private.catalog_validate(d jsonb) returns jsonb language plpgsql set search_path='' as $$
declare k text;v jsonb;allowed text[]:=array['catalogId','name','brand','collection','reference','productKind','type','family','finish','opacity','coverage','usage','url','ean13','sku','catalogColor','colorValidated','technical','sourceUrl','photos'];
begin
 if d is null or jsonb_typeof(d)<>'object' or length(d::text)>40000 then raise exception 'invalid_catalog_product';end if;
 if length(trim(coalesce(d->>'name','')))<2 or length(trim(coalesce(d->>'brand','')))<2 then raise exception 'name_brand_required';end if;
 for k,v in select * from jsonb_each(d) loop
  if not k=any(allowed) then raise exception 'invalid_catalog_field: %',k;end if;
  if k in ('photos','technical') then continue;end if;
  if k='colorValidated' then if jsonb_typeof(v)<>'boolean' then raise exception 'invalid_color_status';end if;
  elsif jsonb_typeof(v)<>'string' or length(v#>>'{}')>3000 then raise exception 'invalid_catalog_text';end if;
 end loop;
 if coalesce(d->>'catalogColor','')<>'' and d->>'catalogColor' !~* '^#[0-9a-f]{6}$' then raise exception 'invalid_product_hex';end if;
 if coalesce(d->>'ean13','')<>'' and d->>'ean13' !~ '^[0-9]{8,14}$' then raise exception 'invalid_ean';end if;
 foreach k in array array['url','sourceUrl'] loop
  if coalesce(d->>k,'')<>'' and d->>k !~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$' then raise exception 'invalid_source_url';end if;
 end loop;
 if d->'colorValidated'='true'::jsonb and (coalesce(d->>'sourceUrl','')='' or coalesce(d->>'catalogColor','')='') then raise exception 'documented_source_required';end if;
 if d ? 'technical' then
  if jsonb_typeof(d->'technical')<>'object' then raise exception 'invalid_technical';end if;
  for k,v in select * from jsonb_each(d->'technical') loop
   if k not in ('inci','curing','compatibility','removal','warnings') or jsonb_typeof(v)<>'object'
    or length(coalesce(v->>'value','')) not between 1 and 6000
    or coalesce(v->>'sourceUrl','') !~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$'
    or coalesce(v->>'status','') not in ('manufacturer','documented')
    or exists(select 1 from jsonb_object_keys(v) f where f not in ('value','sourceUrl','status')) then raise exception 'documented_source_required';end if;
  end loop;
 end if;
 if d ? 'photos' and (jsonb_typeof(d->'photos')<>'array' or jsonb_array_length(d->'photos')>1 or exists(select 1 from jsonb_array_elements(d->'photos') p where jsonb_typeof(p)<>'string')) then raise exception 'invalid_photos';end if;
 return d;
end $$;

-- New public products, with or without photos, must pass catalogue review.
create function private.catalog_item_guard() returns trigger language plpgsql set search_path='' as $$
begin
 if new.kind='product' and new.visibility='public' and (new.catalog_status<>'approved' or not exists(select 1 from private.catalog_products c where c.catalog_id=new.catalog_reference and not c.archived and c.workspace_id=new.workspace_id and c.data=new.catalog_submission)) then new.visibility:='private';end if;
 if tg_op='UPDATE' and new.kind='product' and (new.details is distinct from old.details or new.title is distinct from old.title) and new.catalog_submission is not distinct from old.catalog_submission then new.visibility:='private';end if;
 return new;
end $$;
create trigger a_catalog_item_guard before insert or update on private.pro_showcase_items for each row execute function private.catalog_item_guard();
update private.pro_showcase_items set visibility='private' where kind='product' and visibility='public';

create function private.catalog_write(cid text,d jsonb,archived_value boolean,wid uuid,why text,batch uuid default null) returns void language plpgsql set search_path='' as $$
declare prior private.catalog_products;nextrow private.catalog_products;
begin
 perform pg_advisory_xact_lock(hashtextextended('catalog:'||cid,0));
 select * into prior from private.catalog_products where catalog_id=cid for update;
 insert into private.catalog_products(catalog_id,data,archived,workspace_id) values(cid,d,archived_value,wid)
 on conflict(catalog_id) do update set data=excluded.data,archived=excluded.archived,workspace_id=excluded.workspace_id,revision=catalog_products.revision+1,updated_at=now() returning * into nextrow;
 insert into private.catalog_history(catalog_id,revision,previous,current_value,actor,reason,import_id) values(cid,nextrow.revision,case when prior.catalog_id is null then null else to_jsonb(prior) end,to_jsonb(nextrow),auth.uid(),left(why,1000),batch);
end $$;

create function private.catalog_manage(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=private.require_adult_account();staff boolean:=private.nm_support_staff();i private.pro_showcase_items;r private.pro_correction_requests;c private.catalog_products;b private.catalog_imports;h private.catalog_history;d jsonb;rows_value jsonb:='[]';row_value jsonb;cid text;rid uuid;wid uuid;state text;err text;photo text;
begin
 perform private.require_feature('personal');
 if p_data is null or jsonb_typeof(p_data)<>'object' or length(p_data::text)>4000000 then raise exception 'invalid_request';end if;
 if p_action='mine' then
  wid:=(p_data->>'workspaceId')::uuid;
  if not private.pro_v2_can_edit(wid) then raise exception 'showcase_editor_required' using errcode='42501';end if;
  return jsonb_build_object('requests',coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at desc) from private.pro_correction_requests q join private.pro_showcase_items x on x.id=q.item_id where x.workspace_id=wid and q.proposal ? 'catalog'),'[]'));
 end if;
 if p_action in ('draft','submit','claim') then
  select * into i from private.pro_showcase_items where id=(p_data->>'itemId')::uuid and kind='product' for update;
  if i.id is null or not private.pro_v2_can_edit(i.workspace_id) then raise exception 'showcase_editor_required' using errcode='42501';end if;
  d:=private.catalog_validate(p_data->'product');cid:=nullif(p_data->>'catalogId','');
  if p_action<>'draft' and p_data->'rightsConfirmed' is distinct from 'true'::jsonb then raise exception 'rights_confirmation_required';end if;
  if exists(select 1 from private.pro_correction_requests where item_id=i.id and status in ('submitted','under_review') and proposal ? 'catalog') then raise exception 'request_already_pending';end if;
  if cid is not null then
   select * into c from private.catalog_products where catalog_id=cid;
   if c.catalog_id is null then raise exception 'catalog_reference_not_found';end if;
   if p_action<>'claim' and c.workspace_id is distinct from i.workspace_id then raise exception 'claim_required';end if;
  end if;
  if p_action='claim' and (cid is null or length(trim(coalesce(p_data->>'evidence','')))<12) then raise exception 'claim_evidence_required';end if;
  for photo in select jsonb_array_elements_text(coalesce(d->'photos','[]')) loop
   if split_part(photo,'/',1)<>actor::text or split_part(photo,'/',2)<>i.workspace_id::text or not exists(select 1 from storage.objects o where o.bucket_id='nailmoods-pro' and o.name=photo) then raise exception 'invalid_media_owner';end if;
  end loop;
  state:=case when p_action='draft' then 'draft' else 'submitted' end;
  insert into private.pro_correction_requests(item_id,requested_by,proposal,status)
  values(i.id,actor,jsonb_build_object('catalog',d,'catalogId',cid,'expectedRevision',coalesce(c.revision,0),'kind',case when p_action='claim' then 'claim' else 'product' end,'evidence',left(p_data->>'evidence',3000),'rightsConfirmed',p_data->'rightsConfirmed'),state) returning id into rid;
  update private.pro_showcase_items set catalog_status=state where id=i.id and catalog_status<>'approved';
  return jsonb_build_object('id',rid,'status',state);
 end if;
 if not staff then raise exception 'staff_required' using errcode='42501';end if;
 if p_action='queue' then
  return jsonb_build_object('requests',coalesce((select jsonb_agg(to_jsonb(q)||jsonb_build_object('workspaceName',w.name) order by q.created_at desc) from private.pro_correction_requests q join private.pro_showcase_items x on x.id=q.item_id join public.workspaces w on w.id=x.workspace_id where q.proposal ? 'catalog' and q.status<>'draft'),'[]'),
   'products',coalesce((select jsonb_agg(to_jsonb(x) order by x.updated_at desc) from (select * from private.catalog_products order by updated_at desc limit 1000) x),'[]'),
   'imports',coalesce((select jsonb_agg(to_jsonb(x)-'rows' order by x.created_at desc) from (select * from private.catalog_imports order by created_at desc limit 30) x),'[]'));
 end if;
 if p_action='products' then
  return jsonb_build_object('total',(select count(*) from private.catalog_products where position(lower(coalesce(p_data->>'query','')) in lower(catalog_id||' '||(data->>'name')||' '||(data->>'brand')))>0),
   'rows',coalesce((select jsonb_agg(to_jsonb(v)) from (select * from private.catalog_products where position(lower(coalesce(p_data->>'query','')) in lower(catalog_id||' '||(data->>'name')||' '||(data->>'brand')))>0 order by catalog_id limit 60 offset greatest(0,least(100000,coalesce((p_data->>'offset')::int,0)))) v),'[]'));
 end if;
 if p_action='edit' then
  cid:=p_data->>'catalogId';select * into c from private.catalog_products where catalog_id=cid for update;
  if c.catalog_id is null or c.revision is distinct from (p_data->>'revision')::int then raise exception 'catalog_changed';end if;
  if length(trim(coalesce(p_data->>'note','')))<3 then raise exception 'review_note_required';end if;
  d:=private.catalog_validate(p_data->'product')||jsonb_build_object('catalogId',cid);
  if d->'photos' is distinct from c.data->'photos' and coalesce(jsonb_array_length(d->'photos'),0)>0 then raise exception 'photos_require_pro_submission';end if;
  if coalesce(d->>'ean13','')<>'' and exists(select 1 from private.catalog_products where catalog_id<>cid and data->>'ean13'=d->>'ean13') then raise exception 'duplicate_ean';end if;
  perform private.catalog_write(cid,c.data||d,c.archived,c.workspace_id,p_data->>'note');
  -- A brand's separate showcase remains a reviewed snapshot until resubmitted.
  return jsonb_build_object('catalogId',cid);
 end if;
 if p_action='history' then return coalesce((select jsonb_agg(to_jsonb(x) order by x.id desc) from private.catalog_history x where catalog_id=p_data->>'catalogId'),'[]');end if;
 if p_action='review' then
  select * into r from private.pro_correction_requests where id=(p_data->>'id')::uuid and proposal ? 'catalog' for update;
  if r.id is null or r.revision is distinct from (p_data->>'revision')::int or r.status not in ('submitted','under_review') then raise exception 'request_changed';end if;
  state:=p_data->>'status';if state is null or state not in ('under_review','changes_requested','rejected','approved') then raise exception 'invalid_review';end if;
  if length(trim(coalesce(p_data->>'note','')))<3 then raise exception 'review_note_required';end if;
  select * into i from private.pro_showcase_items where id=r.item_id for update;
  if state='approved' then
   if r.requested_by=actor then raise exception 'independent_reviewer_required';end if;
   d:=private.catalog_validate(r.proposal->'catalog');cid:=coalesce(nullif(r.proposal->>'catalogId',''),'NM-PRO-'||i.id::text);
   perform pg_advisory_xact_lock(hashtextextended('catalog:'||cid,0));
   select * into c from private.catalog_products where catalog_id=cid for update;
   if coalesce(c.revision,0)<>(r.proposal->>'expectedRevision')::int then raise exception 'catalog_changed';end if;
   if coalesce(c.data->>'ean13','')<>coalesce(d->>'ean13','') or c.catalog_id is null then
    if coalesce(d->>'ean13','')<>'' and exists(select 1 from private.catalog_products where not archived and data->>'ean13'=d->>'ean13' and catalog_id<>cid) then raise exception 'duplicate_ean';end if;
   end if;
   -- Claims establish a relation without silently overwriting the canonical product.
   if r.proposal->>'kind'='claim' then d:=c.data;end if;
   perform private.catalog_write(cid,d||jsonb_build_object('catalogId',cid),false,i.workspace_id,p_data->>'note');
   update private.pro_showcase_items set catalog_reference=cid,catalog_status='approved',catalog_submission=d||jsonb_build_object('catalogId',cid),title=d->>'name',details=jsonb_strip_nulls(jsonb_build_object('category',d->>'productKind','reference',d->>'reference','hex',d->>'catalogColor','finish',d->>'finish','ean',d->>'ean13','officialUrl',d->>'url','sourceUrl',d->>'sourceUrl','usage',d->>'usage','photos',d->'photos')),visibility='public',claim_status=case when r.proposal->>'kind'='claim' then 'verified' else claim_status end where id=i.id;
  else update private.pro_showcase_items set catalog_status=state where id=i.id and catalog_status<>'approved';end if;
  update private.pro_correction_requests set status=state,review_note=left(p_data->>'note',2000),reviewed_by=actor,revision=revision+1 where id=r.id;
  return jsonb_build_object('status',state,'catalogId',cid);
 end if;
 if p_action='archive' then
  cid:=p_data->>'catalogId';select * into c from private.catalog_products where catalog_id=cid for update;
  if c.catalog_id is null or c.revision is distinct from (p_data->>'revision')::int then raise exception 'catalog_changed';end if;
  if length(trim(coalesce(p_data->>'note','')))<3 then raise exception 'review_note_required';end if;
  perform private.catalog_write(cid,c.data,true,c.workspace_id,p_data->>'note');
  update private.pro_showcase_items set catalog_status='archived',visibility='private' where catalog_reference=cid;
  return jsonb_build_object('status','archived');
 end if;
 if p_action='import_preview' then
  if jsonb_typeof(p_data->'rows') is distinct from 'array' or jsonb_array_length(p_data->'rows') not between 1 and 250 then raise exception 'import_limit_250';end if;
  for row_value in select * from jsonb_array_elements(p_data->'rows') loop
   err:=null;cid:=trim(row_value->>'catalogId');
   begin
    d:=private.catalog_validate(row_value);
    if coalesce(cid,'')='' or length(cid)>120 then raise exception 'stable_catalog_id_required';end if;
    if exists(select 1 from private.catalog_products where catalog_id=cid) or exists(select 1 from jsonb_array_elements(rows_value) v where v->'product'->>'catalogId'=cid) then raise exception 'duplicate_id_use_correction';end if;
    if coalesce(d->>'ean13','')<>'' and (exists(select 1 from private.catalog_products where data->>'ean13'=d->>'ean13') or exists(select 1 from jsonb_array_elements(rows_value) v where v->'product'->>'ean13'=d->>'ean13')) then raise exception 'duplicate_ean';end if;
    if jsonb_array_length(coalesce(d->'photos','[]'))>0 then raise exception 'photos_require_pro_submission';end if;
   exception when others then err:=sqlerrm;end;
   rows_value:=rows_value||jsonb_build_array(jsonb_build_object('product',row_value,'error',err));
  end loop;
  insert into private.catalog_imports(actor,name,rows) values(actor,left(coalesce(p_data->>'name','Import'),200),rows_value) returning id into rid;
  return jsonb_build_object('id',rid,'rows',rows_value);
 end if;
 if p_action in ('import_apply','import_rollback') then
  select * into b from private.catalog_imports where id=(p_data->>'id')::uuid for update;
  if b.id is null then raise exception 'import_unavailable';end if;
  if p_action='import_apply' then
   if b.status<>'preview' or exists(select 1 from jsonb_array_elements(b.rows) v where v->>'error' is not null) then raise exception 'import_errors';end if;
   -- One serialized transaction: no half-import and no overwritten product.
   lock table private.catalog_products in share row exclusive mode;
   for row_value in select * from jsonb_array_elements(b.rows) loop
    d:=private.catalog_validate(row_value->'product');cid:=d->>'catalogId';
    if exists(select 1 from private.catalog_products where catalog_id=cid or (coalesce(d->>'ean13','')<>'' and data->>'ean13'=d->>'ean13')) then raise exception 'import_changed';end if;
    perform private.catalog_write(cid,d,false,null,'Import validé : '||b.name,b.id);
   end loop;
   update private.catalog_imports set status='applied' where id=b.id;
  else
   if b.status<>'applied' then raise exception 'import_not_applied';end if;
   lock table private.catalog_products in share row exclusive mode;
   for h in select * from private.catalog_history where import_id=b.id order by id loop
    select * into c from private.catalog_products where catalog_id=h.catalog_id for update;
    if c.revision<>h.revision then raise exception 'rollback_conflict';end if;
    perform private.catalog_write(c.catalog_id,c.data,true,c.workspace_id,'Annulation de l’import '||b.name);
   end loop;
   update private.catalog_imports set status='rolled_back' where id=b.id;
  end if;
  return jsonb_build_object('id',b.id,'status',case when p_action='import_apply' then 'applied' else 'rolled_back' end);
 end if;
 raise exception 'unknown_catalog_action';
end $$;
create function public.nm_catalog_manage(p_action text,p_data jsonb default '{}') returns jsonb language sql security invoker set search_path='' as $$select private.catalog_manage(p_action,p_data)$$;
-- Approved catalogue is safe for guest search. It contains no review, claimant,
-- workspace, account or private media data. Tombstones override bundled entries.
create function public.nm_catalog_read(p_after text default '',p_limit integer default 250) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('catalogId',catalog_id,'revision',revision,'archived',archived,'product',data-'photos') order by catalog_id),'[]') from (select * from private.catalog_products where catalog_id>coalesce(p_after,'') order by catalog_id limit least(250,greatest(1,p_limit))) p
$$;
revoke all on function private.catalog_validate(jsonb),private.catalog_item_guard(),private.catalog_write(text,jsonb,boolean,uuid,text,uuid),private.catalog_manage(text,jsonb),public.nm_catalog_manage(text,jsonb),public.nm_catalog_read(text,integer) from public,anon,authenticated;
grant execute on function private.catalog_manage(text,jsonb),public.nm_catalog_manage(text,jsonb) to authenticated;
grant execute on function public.nm_catalog_read(text,integer) to anon,authenticated;
-- Block the legacy moderation shortcut for catalogue requests.
do $wrap$ declare d text;begin
 d:=pg_get_functiondef('private.pro_v2_review(uuid,uuid,uuid,boolean,text)'::regprocedure);
 d:=replace(d,'if p_request_id is not null then',E'if p_request_id is not null then\n if exists(select 1 from private.pro_correction_requests where id=p_request_id and proposal ? ''catalog'') then raise exception ''use_catalog_review'';end if;');
 execute d;
end $wrap$;
commit;
