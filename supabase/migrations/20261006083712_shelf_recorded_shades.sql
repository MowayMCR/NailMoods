begin;
-- Display-only projection: restore stored swatches without changing any product.
-- Exact catalogue/confirmed shades win. A family swatch stays explicitly indicative.
-- Ownership, privacy, moderation and RPC grants remain unchanged.
create or replace function private.shelf_product(p public.user_products) returns jsonb language sql immutable set search_path='' as $$
 select jsonb_strip_nulls(jsonb_build_object('id',p.id,'localId',p.metadata#>>'{nailmoods,id}','catalogId',p.catalog_id,'brand',p.brand,'name',p.shade_name,'reference',p.reference,'collection',p.product_range,'barcode',p.barcode,
 'type',coalesce(p.metadata#>>'{nailmoods,type}','Vernis'),
 'color',coalesce(
  case when p.metadata#>>'{nailmoods,catalogColorValidated}'='true' and p.metadata#>>'{nailmoods,catalogColor}' ~ '^#[0-9a-fA-F]{6}$' then p.metadata#>>'{nailmoods,catalogColor}' end,
  case when p.metadata#>>'{nailmoods,confirmedColor}' ~ '^#[0-9a-fA-F]{6}$' then p.metadata#>>'{nailmoods,confirmedColor}' end,
  case when p.metadata#>>'{nailmoods,shade}' ~ '^#[0-9a-fA-F]{6}$' then p.metadata#>>'{nailmoods,shade}' end,
  case when p.metadata#>>'{nailmoods,color}' ~ '^#[0-9a-fA-F]{6}$' then p.metadata#>>'{nailmoods,color}' end,
  case when not(p.metadata ? 'nailmoods') and p.hex ~ '^#[0-9a-fA-F]{6}$' then p.hex end),
 'colorSource',case when
  not(coalesce(p.metadata#>>'{nailmoods,catalogColorValidated}','false')='true' and coalesce(p.metadata#>>'{nailmoods,catalogColor}','') ~ '^#[0-9a-fA-F]{6}$')
  and coalesce(p.metadata#>>'{nailmoods,confirmedColor}','') !~ '^#[0-9a-fA-F]{6}$'
  and coalesce(p.metadata#>>'{nailmoods,shade}','') !~ '^#[0-9a-fA-F]{6}$'
  and p.metadata#>>'{nailmoods,colorSource}'='palette' then 'palette' else 'recorded' end,
 'family',p.metadata#>>'{nailmoods,family}','finish',p.metadata#>>'{nailmoods,finish}','finishDetail',p.metadata#>>'{nailmoods,finishDetail}','effect',p.metadata#>>'{nailmoods,effect}','createdAt',p.created_at))
$$;
commit;
