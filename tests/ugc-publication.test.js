import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('Publication SQL keeps uploaded photos private until staff review; changed photos require a new review',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create schema private;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql as $$select nullif(current_setting('fixture.principal',true),'')::uuid$$;
 create function private.nm_support_staff() returns boolean language sql as $$select current_setting('fixture.staff',true)='true'$$;
 create table public.journal_entries(id uuid primary key,created_by uuid references auth.users,visibility text,snapshot jsonb default '{}',media_path text,public_media_path text);
 create table public.inspirations(id uuid primary key,created_by uuid references auth.users,is_public boolean,snapshot jsonb default '{}',title text,media_path text,public_media_path text);
 create table public.messages(id uuid primary key,body text);
 insert into auth.users values('10000000-0000-0000-0000-000000000001');
 set fixture.principal='10000000-0000-0000-0000-000000000001';set fixture.staff='false';`);
 await db.exec(readFileSync(new URL('../supabase/migrations/20261002155525_apple_ugc_prepublication_review.sql',import.meta.url),'utf8'));
 const id='20000000-0000-0000-0000-000000000001';
 await db.query(`insert into journal_entries values($1,auth.uid(),'public','{"title":"Pose","privateNote":"secret"}','owner/photo1',null)`,[id]);
 assert.equal((await db.query('select visibility from journal_entries')).rows[0].visibility,'private');
 const mine=(await db.query("select nm_publication_review('mine') as r")).rows[0].r;
 assert.equal(mine[0].status,'pending');assert.equal(JSON.stringify(mine).includes('secret'),false);
 await assert.rejects(db.query("select nm_publication_review('approve','journal',$1)",[id]),/staff_required/);
 await db.exec("set fixture.staff='true'");
 assert.deepEqual((await db.query("select nm_publication_review('preview','journal',$1) as r",[id])).rows[0].r,{path:'owner/photo1',bucket:'nailmoods-private'});
 await db.query("select nm_publication_review('approve','journal',$1)",[id]);
 assert.equal((await db.query('select visibility from journal_entries')).rows[0].visibility,'public');
 await db.query("update journal_entries set media_path='owner/photo2' where id=$1",[id]);
 assert.equal((await db.query('select visibility from journal_entries')).rows[0].visibility,'private');
 await db.query("select nm_publication_review('reject','journal',$1)",[id]);
 assert.equal((await db.query('select visibility from journal_entries')).rows[0].visibility,'private');
 await assert.rejects(db.exec("insert into messages values(gen_random_uuid(),'kill yourself')"),/content_not_allowed/);
 await db.query('delete from journal_entries where id=$1',[id]);
 assert.equal((await db.query('select count(*)::int as n from private.publication_reviews')).rows[0].n,0);
 }finally{await db.close();}
});
