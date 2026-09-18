-- Read-only inspection. Run in Supabase SQL Editor; export the single JSON result.
-- Reads schema metadata only, never product rows, passwords or Auth tokens.
WITH target_tables(name) AS (VALUES
 ('profiles'),('workspaces'),('workspace_members'),('user_products'),
 ('user_stickers'),('user_equipment'),('inspirations'),('journal_entries'),
 ('inspiration_shares'),('pro_profiles'),('pro_follows'),('favorites'),
 ('conversations'),('conversation_members'),('messages')
)
SELECT jsonb_build_object(
 'columns', (SELECT jsonb_agg(to_jsonb(c) ORDER BY c.table_name,c.ordinal_position)
   FROM information_schema.columns c JOIN target_tables t ON t.name=c.table_name
   WHERE c.table_schema='public'),
 'constraints', (SELECT jsonb_agg(jsonb_build_object('table',r.relname,'name',c.conname,
   'definition',pg_get_constraintdef(c.oid)))
   FROM pg_constraint c JOIN pg_class r ON r.oid=c.conrelid
   JOIN pg_namespace n ON n.oid=r.relnamespace JOIN target_tables t ON t.name=r.relname
   WHERE n.nspname='public'),
 'rls', (SELECT jsonb_agg(jsonb_build_object('table',r.relname,'enabled',r.relrowsecurity,'forced',r.relforcerowsecurity))
   FROM pg_class r JOIN pg_namespace n ON n.oid=r.relnamespace
   JOIN target_tables t ON t.name=r.relname WHERE n.nspname='public'),
 'policies', (SELECT jsonb_agg(to_jsonb(p)) FROM pg_policies p
   JOIN target_tables t ON t.name=p.tablename WHERE p.schemaname='public'),
 'grants', (SELECT jsonb_agg(to_jsonb(g)) FROM information_schema.role_table_grants g
   JOIN target_tables t ON t.name=g.table_name WHERE g.table_schema='public'),
 'triggers', (SELECT jsonb_agg(jsonb_build_object('schema',n.nspname,'table',r.relname,
   'definition',pg_get_triggerdef(tr.oid),'function_schema',fn.nspname,'function',f.proname))
   FROM pg_trigger tr JOIN pg_class r ON r.oid=tr.tgrelid
   JOIN pg_namespace n ON n.oid=r.relnamespace JOIN pg_proc f ON f.oid=tr.tgfoid
   JOIN pg_namespace fn ON fn.oid=f.pronamespace
   WHERE NOT tr.tgisinternal AND ((n.nspname='auth' AND r.relname='users')
     OR (n.nspname='public' AND r.relname IN (SELECT name FROM target_tables))))
) AS nailmoods_schema_audit;
