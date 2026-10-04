import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {setup,login,insert,A,B,WA} from './helpers/pose-db.js';import {newProject} from '../src/poseCycle/model.js';import {outfitDirections} from '../src/poseCycle/outfit.js';
test('realization transaction: Free, idempotence, conflict, other account, Journal date and rollback',async()=>{const db=await setup();try{
 await db.exec(`alter table journal_entries add column inspiration_id uuid,add column notes text,add column visibility text default 'private',add column created_at timestamptz default now();create schema storage;create table storage.objects(bucket_id text,name text,owner_id text);`);
 await db.exec(fs.readFileSync('supabase/migrations/20261004160931_pose_followup_journal_access.sql','utf8'));
 await db.exec(`create table private.analytics_event_catalog(event_name text primary key,category text,allowed_metadata_keys text[]);`);
 await db.exec(fs.readFileSync(fs.readdirSync('supabase/migrations').map(n=>'supabase/migrations/'+n).find(n=>n.endsWith('_pose_realization_journal.sql')),'utf8'));
 await db.exec(fs.readFileSync(fs.readdirSync('supabase/migrations').map(n=>'supabase/migrations/'+n).find(n=>n.endsWith('_pose_cycle_completion_events.sql')),'utf8'));
 const idea=outfitDirections({analysis:{colors:['#713650','#d1a0ab'],ambience:'Douce'}})[1].idea;idea.intent='inspire';idea.options.intent='inspire';idea.palette[0]={...idea.palette[0],conceptual:false,color:'#ffffff',confirmedColor:'#713650'};
 await login(db,A);let p=await insert(db,'pose_projects',newProject({userId:A,workspaceId:WA,idea}));
 const realize=(revision=1,date='2026-09-20',removed=null)=>db.query('select public.realize_pose_project($1,$2,$3,$4) r',[p.id,revision,date,removed]);
 await login(db,B);await assert.rejects(realize(),/PROJECT_UNAVAILABLE/);await login(db,A);
 const result=(await realize()).rows[0].r;assert.equal(result.project.status,'done');assert.equal(result.journal.visibility,'private');assert.equal(result.journal.notes,'');assert.equal(result.journal.snapshot.photo,'');assert.equal(result.journal.snapshot.idea.key,p.details.composition.key);assert.equal(result.journal.snapshot.products.length,1);assert.equal(result.journal.snapshot.products[0].color,'#713650');assert.equal(result.project.journal_entry_id,result.journal.id);
 assert.equal((await realize()).rows[0].r.journal.id,result.journal.id);await assert.rejects(realize(1,'2026-09-21'),/PROJECT_CHANGED/);
 await db.exec('reset role');await db.query("update journal_entries set notes='Existing note',visibility='public' where id=$1",[result.journal.id]);await login(db,A);
 const changed=(await realize(result.project.revision,'2026-09-21')).rows[0].r;assert.equal(changed.journal.notes,'Existing note');assert.equal(changed.journal.visibility,'public');assert.equal(changed.project.details.realizedOn,'2026-09-21');assert.equal(changed.journal.snapshot.date,'2026-09-21');
 await assert.rejects(realize(changed.project.revision,'2026-09-21','2026-09-20'),/POSE_DATE_INVALID/);
 await db.exec('reset role');await db.query("update journal_entries set performed_on='2026-09-22' where id=$1",[result.journal.id]);assert.equal((await db.query('select details from pose_projects where id=$1',[p.id])).rows[0].details.realizedOn,'2026-09-22');assert.equal((await db.query('select count(*)::int n from journal_entries')).rows[0].n,1);
 await login(db,A);let second=await insert(db,'pose_projects',newProject({userId:A,workspaceId:WA,idea}));await db.query("update pose_projects set details=details||$2::jsonb where id=$1",[second.id,{followUp:[{id:crypto.randomUUID(),date:'2026-09-25',note:'privé',state:'',feeling:'',media:null}],realizedOn:'2026-09-20'}]);
 // Existing observations reject a later starting date: inserted Journal row rolls back too.
 await assert.rejects(db.query("select public.realize_pose_project($1,2,'2026-09-26')",[second.id]),/POSE_FOLLOWUP_DATE_INVALID/);await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from journal_entries')).rows[0].n,1);
 await login(db,null,'anon');await assert.rejects(realize(),/permission denied/);
 }finally{await db.close();}});
