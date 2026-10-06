import test from 'node:test';import assert from 'node:assert/strict';import {setupShelf,login,rpc,A,B,C} from './helpers/shelf-db.js';
test('shelf opt-in, all modes, public statistics, private source protection and ownership',async()=>{const {db,wa,wb,ids,poses}=await setupShelf();try{
 assert.equal((await rpc(db,'nm_shelf_settings')).visibility,'hidden');assert.equal((await rpc(db,'nm_shelf_public',['atelier.validation'])).products.length,0);assert.equal((await rpc(db,'nm_shelf_discover')).items.length,0);
 await assert.rejects(rpc(db,'nm_shelf_settings',['save',wb,'all']),/owned_workspace_required/);
 await rpc(db,'nm_shelf_settings',['save',wa,'all']);const all=await rpc(db,'nm_shelf_public',['atelier.validation']);assert.equal(all.products.length,3);assert.equal(all.poses.length,2);assert.equal(all.products.find(p=>p.id===ids[0]).shelfUsage.count,2);assert.equal(all.products.find(p=>p.id===ids[0]).shelfUsage.last,'2026-10-02');assert.equal(all.products.find(p=>p.id===ids[2]).shelfUsage.count,0);for(const secret of ['SECRET','PRIVATE PRODUCT NOTE','PRIVATE PHOTO','POSE PRIVÉE','localId','p0'])assert.ok(!JSON.stringify(all).includes(secret),secret);assert.equal(all.poses.find(p=>p.id===poses[1]).productIds.length,2);
 await rpc(db,'nm_shelf_settings',['save',wa,'favorites']);assert.deepEqual((await rpc(db,'nm_shelf_public',['atelier.validation'])).products.map(p=>p.id),[ids[0]]);
 await rpc(db,'nm_shelf_settings',['save',wa,'public_poses']);assert.equal((await rpc(db,'nm_shelf_public',['atelier.validation'])).products.length,2);
 await login(db,B);assert.equal((await rpc(db,'nm_shelf_public',['atelier.validation'])).products.length,2);await assert.rejects(db.query('select * from private.shelf_settings'),/permission denied/);assert.equal((await rpc(db,'nm_shelf_discover')).items.length,1);
 await db.exec('reset role');await db.query("update journal_entries set visibility='private' where id=$1",[poses[1]]);await login(db,B);const now=await rpc(db,'nm_shelf_public',['atelier.validation']);assert.equal(now.products.length,1);assert.equal(now.products[0].shelfUsage.count,1);
 await db.exec('reset role');await db.query('insert into private.blocked values($1)',[A]);await login(db,B);assert.equal(await rpc(db,'nm_shelf_public',['atelier.validation']),null);assert.equal((await rpc(db,'nm_shelf_discover')).items.length,0);await db.exec('reset role;delete from private.blocked');
 await login(db,C);await assert.rejects(rpc(db,'nm_shelf_public',['atelier.validation']),/FEATURE_REQUIRES_PLUS/);await login(db,A);await rpc(db,'nm_shelf_settings',['save',wa,'hidden']);await login(db,B);assert.equal((await rpc(db,'nm_shelf_public',['atelier.validation'])).products.length,0);
 await db.exec('reset role;set role anon');await assert.rejects(rpc(db,'nm_shelf_public',['atelier.validation']),/permission/);
}finally{await db.close();}});

test('public shelf preserves stored palette shades, prioritizes exact shades and never promotes an unknown default',async()=>{
 const {db,wa,ids}=await setupShelf();try{
 await db.exec('reset role');
 const cases=[
  [{color:'#76334b',colorSource:'palette'},'#76334b','palette'],
  [{color:'#76334b',colorSource:'palette',shade:'#682d42'},'#682d42','recorded'],
  [{color:'#76334b',colorSource:'palette',confirmedColor:'#5a273e'},'#5a273e','recorded'],
  [{color:'#76334b',colorSource:'palette',catalogColor:'#46172e',catalogColorValidated:true},'#46172e','recorded'],
  [{colorSource:'palette'},undefined,'palette']
 ];
 for(const [fields,color,source] of cases){
  await db.query("update user_products set metadata=jsonb_build_object('nailmoods',$1::jsonb),hex='#db7897' where id=$2",[JSON.stringify(fields),ids[0]]);
  const row=(await db.query('select private.shelf_product(p) as product from user_products p where id=$1',[ids[0]])).rows[0].product;
  assert.equal(row.color,color);assert.equal(row.colorSource,source);
 }
 }finally{await db.close();}
});
