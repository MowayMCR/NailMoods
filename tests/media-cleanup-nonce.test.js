import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';

test('Cleanup scheduler removes permanent credentials and consumes a short-lived nonce once',async()=>{
 const db=new PGlite();try{
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create schema private;create schema net;create schema cron;
   create table net.sent(id bigserial,url text,headers jsonb);
   create function net.http_post(url text,body jsonb,headers jsonb,timeout_milliseconds integer) returns bigint language plpgsql as $$declare n bigint;begin insert into net.sent(url,headers) values(url,headers) returning id into n;return n;end$$;
   create table cron.job(jobid bigint,command text);
   create function cron.alter_job(job_id bigint,command text) returns void language sql as $$update cron.job set command=$2 where jobid=$1$$;
   insert into cron.job values(1,'select net.http_post(url:=''https://fixture.supabase.co/functions/v1/media-cleanup'',headers:=''legacy secret'');');`);
  await db.exec(readFileSync(new URL('../supabase/migrations/20261002171245_media_cleanup_single_use_nonce.sql',import.meta.url),'utf8'));
  const command=(await db.query('select command from cron.job')).rows[0].command;
  assert.equal(command,"select private.media_cleanup_schedule('https://fixture.supabase.co/functions/v1/media-cleanup');");
  await db.exec(command);
  const sent=(await db.query('select headers from net.sent')).rows[0].headers;
  const nonce=sent['x-nm-cleanup-key'];assert.match(nonce,/^[a-f0-9]{64}$/);
  const stored=(await db.query('select nonce_hash from private.media_cleanup_nonces')).rows[0].nonce_hash;
  assert.notEqual(stored,nonce);
  assert.equal((await db.query('select consume_media_cleanup_nonce($1) as valid',[nonce])).rows[0].valid,true);
  assert.equal((await db.query('select consume_media_cleanup_nonce($1) as valid',[nonce])).rows[0].valid,false);
  await db.exec(command);
  const expired=(await db.query('select headers from net.sent order by id desc limit 1')).rows[0].headers['x-nm-cleanup-key'];
  await db.exec("update private.media_cleanup_nonces set expires_at=clock_timestamp()-interval '1 second'");
  assert.equal((await db.query('select consume_media_cleanup_nonce($1) as valid',[expired])).rows[0].valid,false);
  assert.equal((await db.query("select has_function_privilege('anon','public.consume_media_cleanup_nonce(text)','execute') as allowed")).rows[0].allowed,false);
  assert.equal((await db.query("select has_function_privilege('service_role','public.consume_media_cleanup_nonce(text)','execute') as allowed")).rows[0].allowed,true);
  await assert.rejects(db.query("select private.media_cleanup_schedule('https://other.example/media-cleanup')"),/invalid_cleanup_url/);
 }finally{await db.close();}
});
