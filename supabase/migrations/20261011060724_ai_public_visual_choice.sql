-- Public visual selection and bounded ten-finger previews. Private image paths and AI job metadata stay owner-only.
create or replace function private.discovery_preview(s jsonb) returns jsonb language sql immutable set search_path='' as $$
 select case when jsonb_typeof(s->'nails')='array' then jsonb_build_object('shape',left(s->>'shape',32),'length',left(s->>'length',32),'description','Composition publiée','publicationVisual',case when s->>'publicationVisual'='realistic' then 'realistic' else 'drawing' end,'secondHand',case when jsonb_typeof(s#>'{secondHand,nails}')='array' then private.discovery_preview(jsonb_build_object('nails',s#>'{secondHand,nails}','shape',s->'shape','length',s->'length')) else null end,'nails',
 (select coalesce(jsonb_agg(jsonb_build_object(
 'color',case when n->>'color' ~ '^#[0-9a-fA-F]{6}$' then n->>'color' else '#b88699' end,
 'accentColor',case when n->>'accentColor' ~ '^#[0-9a-fA-F]{6}$' then n->>'accentColor' else '#ffffff' end,
 'finish',left(n->>'finish',32),'effect',left(n->>'effect',32),'drawing',left(n->>'drawing',24),
 'decoration',case when jsonb_typeof(n->'decoration')='object' and length(coalesce(n->'decoration'->>'motif',''))>0 then jsonb_build_object('motif',left(n->'decoration'->>'motif',24),'color',case when n->'decoration'->>'color' ~ '^#[0-9a-fA-F]{6}$' then n->'decoration'->>'color' else '#d4af37' end) else null end
 ) order by ord),'[]') from jsonb_array_elements(s->'nails') with ordinality e(n,ord) where ord<=5)) else null end;
$$;
revoke all on function private.discovery_preview(jsonb) from public,anon,authenticated;
