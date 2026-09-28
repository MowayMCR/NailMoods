import test from 'node:test';
import assert from 'node:assert/strict';
import {mobileAuthReturnUrl,validateMobileAuthUrl} from '../src/platform/authLinks.js';
import {createAuthService} from '../src/cloud/auth.js';
import {backAction} from '../src/platform/back.js';
import {imageResults,canRecoverMedia} from '../src/platform/mediaRecovery.js';
import {createDurableQueue} from '../src/platform/durableQueue.js';
import {isTransientNetworkError,withTimeout} from '../src/platform/network.js';

for(const environment of ['production','recette']) test('native PKCE callback is isolated: '+environment,async()=>{
 const other=environment==='recette'?'production':'recette';let exchanges=[];
 const client={auth:{exchangeCodeForSession:async code=>{exchanges.push(code);return {data:{session:{user:{id:'same-account'}}},error:null};}}};
 const service=createAuthService(client,'https://localhost/',{returnUrl:r=>mobileAuthReturnUrl(environment,r),validateCallback:u=>validateMobileAuthUrl(u,environment)});
 const good=mobileAuthReturnUrl(environment,true)+'&code=temporary';
 assert.equal((await service.completeCallback(good)).recovery,true);
 for(const url of [mobileAuthReturnUrl(other,true)+'&code=other',good.replace('://auth/', '://evil/'),good.replace('/callback','/other'),good+'&x=1#access_token=secret','javascript:alert(1)'])assert.equal(await service.completeCallback(url),null);
 assert.deepEqual(exchanges,['temporary']);
});
test('Android back closes intermediate levels before minimizing',()=>{
 const state={keyboard:true,dialog:true,canGoBack:true,hash:'#creer'};
 assert.equal(backAction(state),'keyboard');assert.equal(backAction({...state,keyboard:false}),'dialog');assert.equal(backAction({...state,keyboard:false,dialog:false}),'history');assert.equal(backAction({hash:'#creer'}),'home');assert.equal(backAction({hash:'#accueil'}),'minimize');
});
test('restored camera results cannot enter another account or form',()=>{
 const p={principal:'A',route:'#journal/new',label:'Photo',index:1,files:[{path:'private.jpg'}]};
 assert.equal(canRecoverMedia(p,p),true);
 for(const context of [{...p,principal:'B'},{...p,route:'#collection'},{...p,label:'Avatar'},{...p,index:2}])assert.equal(canRecoverMedia(p,context),false);
 assert.deepEqual(imageResults('getPhoto',{path:'file:///image.jpg'}),[{path:'file:///image.jpg'}]);assert.equal(imageResults('pickImages',{photos:Array(6).fill({})}).length,4);assert.deepEqual(imageResults('unsupported',{}),[]);
});
test('failed durable writes retain the newest draft for retry',async()=>{
 let fail=true,writes=[];const queue=createDurableQueue(async(k,v)=>{if(fail)throw new Error('disk');writes.push([k,v]);});
 queue.put('draft','first');await queue.flush();queue.put('draft','latest');await queue.flush();assert.equal(queue.pending,1);fail=false;assert.equal(await queue.flush(),true);assert.deepEqual(writes,[['draft','latest']]);assert.equal(queue.pending,0);
});
test('network failure never treats a denied session as offline access',()=>{
 assert.equal(isTransientNetworkError({status:401},false),false);assert.equal(isTransientNetworkError({status:403},false),false);assert.equal(isTransientNetworkError({name:'AuthRetryableFetchError'},true),true);
});
test('native network timeout aborts an upload and respects caller cancellation',async()=>{
 const fetcher=(_,options)=>new Promise((resolve,reject)=>{if(options.signal.aborted)return reject(options.signal.reason);options.signal.addEventListener('abort',()=>reject(options.signal.reason));});
 await assert.rejects(withTimeout(fetcher,10)('/test'),{name:'TimeoutError'});
 const controller=new AbortController();controller.abort();await assert.rejects(withTimeout(fetcher,1000)('/test',{signal:controller.signal}),{name:'AbortError'});
});
