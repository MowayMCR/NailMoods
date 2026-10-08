import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {setup,login,rpc,A,B,C,draft} from './helpers/pro-db.js';
import {filterBook,swipeDirection,bookPage} from '../src/poseBook/model.js';
test('book tags, accents, featuring and touch directions',()=>{
 const rows=[{id:1,title:'Dégradé',publicTags:{techniques:['French']}},{id:2,title:'Rose',featured:true}];
 assert.equal(filterBook(rows)[0].id,2);assert.equal(filterBook(rows,'degrade')[0].id,1);assert.equal(filterBook(rows,'','French').length,1);
 assert.equal(swipeDirection(-80,4,390),1);assert.equal(swipeDirection(80,4,390),-1);assert.equal(swipeDirection(30,90,390),0);assert.equal(bookPage(4,3,2),1);
});
test('book server protects own featured poses, private data, favorites and public opt-in',async()=>{
 const db=await setup();try{
  await db.exec(`create table private.social_favorites(user_id uuid,kind text,entity_id uuid,primary key(user_id,kind,entity_id));
   create function private.nm_discover(a text,d jsonb) returns jsonb language plpgsql security definer set search_path='' as $$begin
    perform private.require_feature('discovery');
    if a='add' then if not exists(select 1 from public.journal_entries where id=(d->>'id')::uuid and visibility='public' and not private.nm_blocked(created_by)) then raise exception 'content_unavailable';end if;
    insert into private.social_favorites values(auth.uid(),d->>'kind',(d->>'id')::uuid) on conflict do nothing;
    else delete from private.social_favorites where user_id=auth.uid() and kind=d->>'kind' and entity_id=(d->>'id')::uuid;end if;return '{}';end$$;`);
  await db.exec(readFileSync('supabase/migrations/20261008070521_pose_book.sql','utf8'));
  await login(db,A);const w=await rpc(db,'nm_pro_save',[null,draft('Studio','studio')]);
  await db.exec('reset role');const id='20000000-0000-4000-8000-000000000001',hidden='20000000-0000-4000-8000-000000000002';
  await db.query(`insert into public.journal_entries(id,workspace_id,created_by,visibility,snapshot) values($1,$3,$4,'public','{"id":"local-one","title":"French","private":"secret","publicTags":{"techniques":["French"]}}'),($2,$3,$4,'private','{"id":"local-hidden","private":"never expose"}')`,[id,hidden,w,A]);
  await login(db,A);await rpc(db,'nm_pose_book',['feature',{id,enabled:true}]);await assert.rejects(rpc(db,'nm_pose_book',['feature',{id:hidden,enabled:true}]),/public_owned/);
  await rpc(db,'nm_pro_portfolio',[w,'journal',id,null,true]);
  await login(db,B);await assert.rejects(rpc(db,'nm_pose_book',['feature',{id,enabled:true}]),/public_owned/);
  await rpc(db,'nm_pose_book',['favorite',{id,saved:true}]);await rpc(db,'nm_pose_book',['favorite',{id,saved:true}]);
  const rows=await rpc(db,'nm_pose_book',['read',{handle:'studio'}]);assert.equal(rows.length,1);assert.equal(rows[0].hearts,1);assert.equal(rows[0].saved,true);assert.equal(rows[0].featured,true);assert.equal(JSON.stringify(rows).includes('secret'),false);
  assert.equal((await rpc(db,'nm_pose_book',['mine',{}])).length,0);
  await assert.rejects(rpc(db,'nm_pose_book',['favorite',{id:hidden,saved:true}]),/content_unavailable/);
  await login(db,A);const mine=await rpc(db,'nm_pose_book',['mine',{}]);assert.equal(mine.find(e=>e.id===id).hearts,1);assert.equal(mine.find(e=>e.id===id).localId,'local-one');
  await login(db,C);await assert.rejects(rpc(db,'nm_pose_book',['read',{handle:'studio'}]),/FEATURE_REQUIRES_PLUS/);
  await db.exec('reset role');await db.query("update public.journal_entries set visibility='private' where id=$1",[id]);await login(db,B);assert.deepEqual(await rpc(db,'nm_pose_book',['read',{handle:'studio'}]),[]);
  await db.exec('reset role;set role anon');await assert.rejects(rpc(db,'nm_pose_book',['mine',{}]),/permission denied/);
 }finally{await db.close();}
});
