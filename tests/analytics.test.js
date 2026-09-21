import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeMetadata } from '../src/analytics/analytics.js';
test('analytics metadata keeps only scalar technical values', () => {
  assert.deepEqual(sanitizeMetadata({ source: 'manual', image: { private: true }, prompt: ['secret'], Bad: 'x', count: 2 }), { source: 'manual', count: 2 });
});

test('analytics sends nothing without consent and removes handlers on withdrawal',async()=>{
 const {createAnalytics}=await import('../src/analytics/analytics.js');
 const original={window:globalThis.window,document:globalThis.document,sessionStorage:globalThis.sessionStorage};
 const values=new Map(),calls=[];globalThis.sessionStorage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};
 globalThis.window=new EventTarget();globalThis.document=new EventTarget();document.visibilityState='visible';
 try{
  const disabled=createAnalytics({enabled:false,client:{rpc:async(...args)=>{calls.push(args);return {};}}});disabled.track('message_sent');await disabled.flush();disabled.stop();assert.equal(calls.length,0);
  const enabled=createAnalytics({enabled:true,client:{rpc:async(...args)=>{calls.push(args);return {};}}});enabled.track('message_sent');await enabled.flush();assert.equal(calls.length,1);enabled.stop();
  document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new Event('pagehide'));enabled.track('message_sent');await enabled.flush();assert.equal(calls.length,1);
 }finally{Object.assign(globalThis,original);}
});
