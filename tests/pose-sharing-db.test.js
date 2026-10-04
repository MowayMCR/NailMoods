import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {setup,login,insert,A,B,WA,WB} from './helpers/pose-db.js';import {newProject} from '../src/poseCycle/model.js';import {outfitDirections} from '../src/poseCycle/outfit.js';
test('sharing migration: owner-only allowlisted frozen preview, references, revision, revoke and cascade',async()=>{const db=await setup();try{
 // Existing social sender/detail are deliberately stand-ins here. Actual social
 // entitlements, recipient and media authorization are tested against recette.
 await db.exec(`update private.account_entitlements set tier='plus' where user_id='${A}';
 create table public.profiles(id uuid primary key,username text,display_name text);
 insert into public.profiles values('${A}','a','A'),('${B}','b','B');
 create table public.inspiration_shares(id uuid primary key default gen_random_uuid(),sender_id uuid,recipient_id uuid,recipient_workspace_id uuid,client_id uuid,snapshot jsonb,created_at timestamptz default now());
 create function private.nm_share_detail(i uuid) returns jsonb language sql security definer set search_path='' as $$select snapshot from public.inspiration_shares where id=i and auth.uid() in(sender_id,recipient_id)$$;
 create function private.send_nailmoods_share_to_po(w uuid,k text,s jsonb) returns uuid language plpgsql security definer set search_path='' as $$declare i uuid;begin insert into public.inspiration_shares(sender_id,recipient_id,recipient_workspace_id,client_id,snapshot) values(auth.uid(),'${B}',w,(s->>'client_id')::uuid,s) returning id into i;return i;end$$;`);
 for(const [file,pattern] of [['phase12/p2-rich-sharing.sql',/create function private\.share_product[\s\S]*?\$\$;/],['phase12/discovery-preview.sql',/create or replace function private\.discovery_preview[\s\S]*?\$\$;/]])await db.exec(readFileSync(file,'utf8').match(pattern)[0]);
 await db.exec(readFileSync('supabase/migrations/20261004173436_pose_project_sharing.sql','utf8'));
 const principal={userId:A,workspaceId:WA},idea=outfitDirections({analysis:{colors:['#713650','#d1a0ab'],ambience:'Douce'}})[1].idea;
 idea.palette[0]={...idea.palette[0],shade:'#713650',color:'#ffffff',confirmedColor:'#713650',finish:'Mat',privateSupplier:'secret'};
 const project=newProject({...principal,idea});project.details.notes='note privée';
 await login(db,A);const p=await insert(db,'pose_projects',project);const preview=(await db.query('select public.pose_share_preview($1) s',[p.id])).rows[0].s;
 assert.equal(preview.notes,'');assert.equal(preview.products[0].color,'#713650');assert.equal(preview.products[0].finish,'Mat');assert.equal(JSON.stringify(preview).includes('secret'),false);assert.equal(preview.include_images,false);
 assert.equal((await db.query('select public.pose_share_preview($1,true) s',[p.id])).rows[0].s.notes,'note privée');
 await login(db,B);await assert.rejects(db.query('select public.pose_share_preview($1)',[p.id]),/PROJECT_UNAVAILABLE/);await assert.rejects(db.query('select public.pose_project_shares($1)',[p.id]),/PROJECT_UNAVAILABLE/);
 await login(db,A);const clientId=crypto.randomUUID();const args=[p.id,p.revision,WB,clientId];await assert.rejects(db.query('select public.send_pose_project_to_po($1,0,$2,$3)',[p.id,WB,clientId]),/PROJECT_CHANGED/);
 const id=(await db.query('select public.send_pose_project_to_po($1,$2,$3,$4) id',args)).rows[0].id;assert.equal((await db.query('select public.send_pose_project_to_po($1,$2,$3,$4) id',args)).rows[0].id,id);
 await assert.rejects(db.query('select public.send_pose_project_to_po($1,$2,$3,$4,true)',args),/SHARE_ATTEMPT_CHANGED/);
 assert.equal((await db.query('select public.pose_project_shares($1) s',[p.id])).rows[0].s.length,1);
 await login(db,B);await assert.rejects(db.query('select public.revoke_pose_share($1)',[id]),/SHARE_UNAVAILABLE/);
 await db.exec('reset role');await db.query("update private.account_entitlements set tier='free' where user_id=$1",[A]);await login(db,A);assert.equal((await db.query('select public.pose_project_shares($1) s',[p.id])).rows[0].s.length,1);await db.query('select public.revoke_pose_share($1)',[id]);assert.deepEqual((await db.query('select public.pose_project_shares($1) s',[p.id])).rows[0].s,[]);
 await db.exec('reset role');await db.query("update private.account_entitlements set tier='plus' where user_id=$1",[A]);await login(db,A);await db.query('select public.send_pose_project_to_po($1,$2,$3,$4)',[p.id,p.revision,WB,crypto.randomUUID()]);await db.query('delete from pose_projects where id=$1',[p.id]);await db.exec('reset role');assert.equal((await db.query('select count(*)::int n from inspiration_shares')).rows[0].n,0);
 await login(db,null,'anon');await assert.rejects(db.query('select public.pose_share_preview($1)',[p.id]),/permission denied/);
 }finally{await db.close();}});
