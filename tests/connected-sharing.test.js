import test from 'node:test';
import assert from 'node:assert/strict';
import {poShareService,filterRecipients} from '../src/social/poShareService.js';
test('PO selection loads accepted connections without public search and supports several workspaces',async()=>{
 const rows=[{user_id:'po',status:'accepted',account_tier:'pro',handle:'social.fixture.b',workspaces:[{entity_id:'w1',pro_handle:'studio.recette.b'},{entity_id:'w2'}]},{user_id:'plus',status:'accepted',account_tier:'plus'},{user_id:'pending',status:'pending',account_tier:'pro',workspaces:[{entity_id:'hidden'}]},{user_id:'free',status:'accepted',account_tier:'free'}];
 const service=poShareService({rpc:async(name,args)=>{assert.equal(name,'nm_social');assert.equal(args.p_action,'recipients');return {data:rows};}});
 assert.deepEqual((await service.recipients()).map(r=>r.entity_id),['w1','w2']);
 assert.deepEqual((await service.recipients({professionalsOnly:false})).map(r=>r.user_id),['po','plus']);
});
test('recipient filter supports name, accents, personal and professional handles and empty query',()=>{
 const rows=[{display_name:'Émilie',handle:'social.fixture.b',pro_handle:'studio.recette.b',workspace_name:'Atelier'}];
 for(const q of ['','emilie',' @SOCIAL.FIXTURE.B ','@studio.recette.b','atelier'])assert.equal(filterRecipients(rows,q).length,1);
 assert.equal(filterRecipients(rows,'absent').length,0);
});
test('publication sharing sends a reference and stable idempotency key, no copied snapshot',async()=>{
 let call;const service=poShareService({rpc:async(...args)=>{call=args;return {data:'share-id'};}});
 assert.equal(await service.sharePublication('peer',{kind:'journal',id:'pose',notes:'SECRET'},'retry-id'),'share-id');
 assert.deepEqual(call,['send_nailmoods_publication',{p_recipient_user_id:'peer',p_kind:'journal',p_id:'pose',p_client_id:'retry-id'}]);
});
