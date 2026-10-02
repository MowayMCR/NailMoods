import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
test('equipment seed/RLS, standard/custom duplicates and per-user import quotas execute in Postgres',async()=>{
 const db=new PGlite();
 try {
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.uid',true),'')::uuid$$;create table public.user_equipment(id uuid primary key,workspace_id uuid,name text,equipment_category text,metadata jsonb);`);
  await db.exec(readFileSync(new URL('../supabase/migrations/20261002184655_beta_equipment_library_product_import.sql',import.meta.url),'utf8'));
  assert.equal((await db.query('select count(*)::int n from public.equipment_library')).rows[0].n,34);
  await db.exec('set role anon');assert.equal((await db.query('select count(*)::int n from public.equipment_library')).rows[0].n,34);
  await assert.rejects(db.exec("insert into public.equipment_library(id,slug,name,category) values ('bad','bad','bad','bad')"),/permission/i);
  await assert.rejects(db.query('select public.nm_product_import_quota()'),/permission/i);await db.exec('reset role');
  const u='10000000-0000-4000-8000-000000000001',w='10000000-0000-4000-8000-000000000002';
  await db.exec(`insert into auth.users values('${u}');set request.uid='${u}';set role authenticated`);
  for(let i=0;i<30;i++)assert.equal((await db.query('select public.nm_product_import_quota() ok')).rows[0].ok,true);
  assert.equal((await db.query('select public.nm_product_import_quota() ok')).rows[0].ok,false);
  await assert.rejects(db.query('select * from private.product_import_quota'),/permission/i);await db.exec('reset role');
  await db.exec(`insert into user_equipment values('${u}','${w}','Éponge nail art','Éponge','{}')`);
  await assert.rejects(db.exec(`insert into user_equipment values('${w}','${w}','eponge nail art','Autre matériel','{}')`),/already exists/);
 }finally{await db.close();}
});
