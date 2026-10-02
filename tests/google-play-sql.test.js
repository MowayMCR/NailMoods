// Real Postgres semantics in an isolated in-memory engine. Auth/signup hooks
// below are a minimal fixture, not a claim of end-to-end Supabase/Google testing.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Billing SQL executes and preserves provenance, cancellation, founder rights, ownership and permissions',async()=>{
  const db=new PGlite();
  try{
    await db.exec(`
      create role anon; create role authenticated; create role service_role;
      create schema auth; create schema private; create schema cron; create schema net;
      create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,
        raw_app_meta_data jsonb,raw_user_meta_data jsonb,created_at timestamptz,updated_at timestamptz);
      create function auth.uid() returns uuid language sql stable as $$
        select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid $$;
      create table public.profiles(id uuid primary key references auth.users,account_tier text not null default 'free');
      create table private.account_entitlements(user_id uuid primary key references auth.users,
        tier text not null,status text not null,source text not null,starts_at timestamptz not null,
        expires_at timestamptz,updated_at timestamptz default now());
      create table public.user_consents(user_id uuid,terms_version text,terms_accepted_at timestamptz,
        privacy_version text,age_band text);
      create function private.nm_legal_versions() returns table(privacy_version text,terms_version text)
        language sql immutable as $$select '0.6-beta'::text,'0.4-beta'::text$$;
      create function private.nm_age_band(u uuid) returns text language sql stable as $$
        select age_band from public.user_consents where user_id=u limit 1$$;
      create function private.nm_account_suspended(u uuid) returns boolean language sql stable as $$select false$$;
      create function private.sync_profile_account_entitlement() returns trigger language plpgsql as $$
        begin return new; end$$;
      create trigger entitlement_sync after insert or update of account_tier on public.profiles
        for each row execute function private.sync_profile_account_entitlement();
      create function private.signup_fixture() returns trigger language plpgsql as $$begin
        insert into public.profiles(id) values(new.id);
        insert into public.user_consents values(new.id,new.raw_user_meta_data->>'terms_version',now(),
          new.raw_user_meta_data->>'privacy_version','18_plus'); return new; end$$;
      create trigger signup_fixture after insert on auth.users for each row execute function private.signup_fixture();
      create function cron.schedule(text,text,text) returns bigint language sql as $$select 1::bigint$$;
      create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer)
        returns bigint language sql as $$select 1::bigint$$;
    `);
    await db.exec(read('supabase/migrations/20260930210000_google_play_billing_entitlements.sql'));
    // Hosted async networking and cron are represented by the stubs above.
    await db.exec(read('supabase/migrations/20261001214434_google_play_reconciliation.sql').replace('create extension if not exists pg_net;',''));
    await db.exec(read('supabase/migrations/20261001214443_billing_legal_versions.sql'));
    const result=await db.exec(read('tests/sql/google-play-regression.sql'));
    assert.match(result.at(-1).rows[0].result,/^PASS:/);
    assert.equal((await db.query('select count(*)::integer as n from auth.users')).rows[0].n,0);
    assert.equal((await db.query('select enabled from private.google_play_settings')).rows[0].enabled,false);
  }finally{await db.close();}
});
