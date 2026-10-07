import test from 'node:test';import assert from 'node:assert/strict';import {watchActiveSession,SESSION_REPLACED_MESSAGE} from '../src/cloud/sessionSecurity.js';
const flush=()=>new Promise(resolve=>setTimeout(resolve,0));
test('network failure preserves the client; foreground revocation signals once',async()=>{
 const target=new EventTarget();target.document=new EventTarget();target.document.visibilityState='visible';let error={message:'network unavailable'},replaced=0,offline=0;
 const stop=watchActiveSession({rpc:async()=>({data:error?null:{active:true},error})},{target,intervalMs:60000,onReplaced:async()=>{replaced++;},onOffline:()=>{offline++;}});
 try{await flush();assert.equal(replaced,0);assert.equal(offline,1);error=null;target.dispatchEvent(new Event('focus'));await flush();assert.equal(replaced,0);
 error={message:'SESSION_REPLACED'};target.dispatchEvent(new Event('online'));await flush();target.dispatchEvent(new Event('focus'));await flush();assert.equal(replaced,1);assert.match(SESSION_REPLACED_MESSAGE,/Veuillez vous reconnecter/);
 }finally{stop();}
});
