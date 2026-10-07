-- Read-only release gate. Run against recette before activating production.
do $$begin
 if exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname in ('public','private') and p.prosecdef and p.prokind='f' and p.prorettype<>'trigger'::regtype and l.lanname in ('sql','plpgsql') and has_function_privilege('authenticated',p.oid,'EXECUTE') and p.proname not like 'nm_session%' and p.prosrc not like '%nm_session_assert%' and not exists(select 1 from pg_depend d where d.objid=p.oid and d.deptype='e')) then raise exception 'unguarded_client_rpc';end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relrowsecurity and not exists(select 1 from pg_policy p where p.polrelid=c.oid and p.polname='nm_active_session')) then raise exception 'unguarded_rls_table';end if;
 if not exists(select 1 from pg_policy where polrelid='storage.objects'::regclass and polname='nm_no_private_signed_capabilities') then raise exception 'unguarded_storage_capabilities';end if;
end $$;
