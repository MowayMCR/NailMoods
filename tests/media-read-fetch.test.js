import {test} from 'node:test';
import assert from 'node:assert/strict';
import {boundedReadFetch} from '../supabase/functions/media-read/read-fetch.mjs';
test('media read retries one transient network failure and returns image bytes',async()=>{
 let calls=0;const f=boundedReadFetch({backoffMs:0,fetchImpl:async()=>{if(++calls===1)throw new TypeError('connection lost');return new Response('image',{headers:{'Content-Type':'image/png'}});}});
 const r=await f('https://example.invalid');assert.equal(await r.text(),'image');assert.equal(calls,2);
});
test('media permission denials never retry',async()=>{
 for(const status of [401,403,404,429]){let calls=0;const f=boundedReadFetch({fetchImpl:async()=>{calls++;return new Response('',{status});}});assert.equal((await f('https://example.invalid')).status,status);assert.equal(calls,1);}
});
test('media upstream 503 retries only once',async()=>{
 let calls=0;const f=boundedReadFetch({backoffMs:0,fetchImpl:async()=>{calls++;return new Response('unavailable',{status:503});}});assert.equal((await f('https://example.invalid')).status,503);assert.equal(calls,2);
});
test('media deadline includes a stalled response body',async()=>{
 let calls=0;const f=boundedReadFetch({budgetMs:45,attemptMs:10,backoffMs:0,fetchImpl:async(_u,{signal})=>{calls++;return {status:200,arrayBuffer:()=>new Promise((_r,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))};}});
 await assert.rejects(f('https://example.invalid'),{name:'TimeoutError'});assert.equal(calls,2);
});
test('caller cancellation stops media retries',async()=>{
 const controller=new AbortController();controller.abort();let calls=0;
 const f=boundedReadFetch({fetchImpl:async(_u,{signal})=>{calls++;throw signal.reason;}});
 await assert.rejects(f('https://example.invalid',{signal:controller.signal}),{name:'AbortError'});assert.equal(calls,1);
});
