import test from 'node:test';
import assert from 'node:assert/strict';
import {compareProductIdentity} from '../src/productMatch.js';
import {safeDiagnostics,recordDiagnostic,readDiagnostics} from '../src/support/diagnostics.js';
import {ticketPayload} from '../src/support/service.js';
test('same shade number in different ranges is never an exact match',()=>{
 const a={brand:'KIKO',collection:'Smart',reference:'42',color:'#abcdef'};
 assert.equal(compareProductIdentity(a,{...a,collection:'Power Pro'}).exact,false);
 assert.equal(compareProductIdentity(a,{...a,brand:'KIKO Milano'}).exact,true);
 assert.equal(compareProductIdentity(a,{brand:'KIKO',reference:'42'}).exact,false);
 assert.equal(compareProductIdentity({name:'Rose',color:'#abcdef'},{name:'Rose',color:'#abcdef'}).exact,false);
});
test('valid GTIN normalizes across formats and contradictory identifiers stay unconfirmed',()=>{
 assert.equal(compareProductIdentity({barcode:'4006381333931'},{barcode:'04006381333931'}).exact,true);
 assert.equal(compareProductIdentity({barcode:'12345'},{barcode:'12345'}).exact,false);
 assert.equal(compareProductIdentity({catalogId:'x',reference:'1'},{catalogId:'x',reference:'2'}).exact,false);
 assert.equal(compareProductIdentity({brand:'A',collection:'B',reference:'3'},{brand:'A',collection:'B',reference:'3',barcode:'4006381333931'}).exact,true);
});
test('diagnostics discard sensitive fields and reject arbitrary error text',()=>{
 const event={category:'storage',outcome:'error',code:'operation_failed',at:'2026-09-21T21:00:00.000Z',token:'SECRET',message:'PRIVATE',url:'https://private'};
 const result=safeDiagnostics([event,{...event,code:'private message'}]);
 assert.equal(result.length,1);assert.deepEqual(Object.keys(result[0]),['category','code','outcome','at']);assert.ok(!JSON.stringify(result).includes('SECRET'));
 const map=new Map(),s={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
 for(let n=0;n<50;n++)recordDiagnostic(s,'auth','ok');assert.equal(readDiagnostics(s).length,30);
});
test('support payload is opt-in, bounded and does not include browser URLs or user agent',()=>{
 const p=ticketPayload({id:'id',category:'bug',description:' Test ',screen:'/private-id',notes:'SECRET'},'recette','Mozilla Android secret');
 assert.deepEqual(p.diagnostics,[]);assert.equal(p.attachment,null);assert.equal(p.platform,'Android');assert.equal(p.screen,'other');assert.equal(p.description,'Test');assert.ok(!JSON.stringify(p).includes('SECRET'));assert.ok(!JSON.stringify(p).includes('Mozilla'));
});
