begin;
-- Server-owned pointer updated only on a genuine Auth session INSERT, never refresh.
create table private.nm_session_settings(singleton boolean primary key default true check(singleton),enabled boolean not null default false);
insert into private.nm_session_settings values(true,false);
create table private.nm_active_sessions(user_id uuid primary key references auth.users(id) on delete cascade,session_id uuid not null,started_at timestamptz not null);
alter table private.nm_session_settings enable row level security;
alter table private.nm_active_sessions enable row level security;
revoke all on private.nm_session_settings,private.nm_active_sessions from public,anon,authenticated;
create function private.nm_session_insert() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into private.nm_active_sessions values(new.user_id,new.id,coalesce(new.created_at,clock_timestamp()))
 on conflict(user_id) do update set session_id=excluded.session_id,started_at=excluded.started_at
 where (excluded.started_at,excluded.session_id)>(nm_active_sessions.started_at,nm_active_sessions.session_id);
 return new;
end $$;
revoke all on function private.nm_session_insert() from public,anon,authenticated;
create trigger nm_single_session after insert on auth.sessions for each row execute function private.nm_session_insert();
insert into private.nm_active_sessions select distinct on(user_id) user_id,id,created_at from auth.sessions order by user_id,created_at desc,id desc on conflict do nothing;
create function private.nm_session_active() returns boolean language sql stable security definer set search_path='' as $$
 select not coalesce((select enabled from private.nm_session_settings where singleton),true) or exists(
 select 1 from private.nm_active_sessions a join auth.sessions s on s.id=a.session_id and s.user_id=a.user_id
 where a.user_id=auth.uid() and a.session_id::text=auth.jwt()->>'session_id' and (s.not_after is null or s.not_after>now()))
$$;
create function private.nm_session_assert() returns void language plpgsql stable security definer set search_path='' as $$
begin
 if auth.jwt()->>'role'='authenticated' and not private.nm_session_active() then raise exception 'SESSION_REPLACED' using errcode='42501';end if;
end $$;
revoke all on function private.nm_session_active(),private.nm_session_assert() from public,anon;
grant execute on function private.nm_session_active(),private.nm_session_assert() to authenticated;
create function public.nm_session_check() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required' using errcode='42501';end if;
 perform private.nm_session_assert();
 return jsonb_build_object('active',true,'enforced',(select enabled from private.nm_session_settings));
end $$;
revoke all on function public.nm_session_check() from public,anon;
grant execute on function public.nm_session_check() to authenticated;
-- A revoked device cannot reclaim its pointer through this endpoint.
create function public.nm_session_revoke_others() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'authentication_required';end if;
 perform private.nm_session_assert();
 delete from auth.sessions where user_id=auth.uid() and id::text<>auth.jwt()->>'session_id';
end $$;
revoke all on function public.nm_session_revoke_others() from public,anon;
grant execute on function public.nm_session_revoke_others() to authenticated;
-- Restrictive policies do not replace any existing ownership/visibility policies.
do $migration$ declare t record;begin
 for t in select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and c.relrowsecurity and (n.nspname='public' or (n.nspname='storage' and c.relname='objects')) loop
 execute format('create policy nm_active_session on %I.%I as restrictive for all to authenticated using ((select private.nm_session_active())) with check ((select private.nm_session_active()))',t.nspname,t.relname);
 end loop;
end $migration$;
-- RLS is bypassed by SECURITY DEFINER RPCs: instrument all client-callable app
-- functions (including private helpers), retaining signatures, grants and OIDs.
-- Original definitions are retained for rollback. Future migrations must run this
-- coverage step again and the release gate must check for unguarded RPCs.
create table private.nm_session_function_backup(oid oid primary key,definition text not null);
revoke all on private.nm_session_function_backup from public,anon,authenticated;
alter table private.nm_session_function_backup enable row level security;
do $migration$ declare f record; def text; body text;begin
 for f in select p.oid,p.prosrc,l.lanname from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang
 where n.nspname in ('public','private') and p.prokind='f' and p.prorettype<>'trigger'::regtype
 and has_function_privilege('authenticated',p.oid,'EXECUTE') and l.lanname in ('sql','plpgsql')
 and p.proname not like 'nm_session%' and p.proname not like 'nm_active%' and not exists(select 1 from pg_depend d where d.objid=p.oid and d.deptype='e') loop
 def:=pg_get_functiondef(f.oid);body:=f.prosrc;
 if f.lanname='plpgsql' then body:=regexp_replace(body,'\mbegin\M','begin perform private.nm_session_assert();','i');
 else body:='select private.nm_session_assert(); '||body;end if;
 if body=f.prosrc then raise exception 'cannot_guard_function: %',f.oid::regprocedure;end if;
 insert into private.nm_session_function_backup values(f.oid,def);
 execute replace(def,'AS $function$'||f.prosrc||'$function$','AS $function$'||body||'$function$');
 end loop;
end $migration$;
commit;
