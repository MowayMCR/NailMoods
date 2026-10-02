import test from 'node:test';
import assert from 'node:assert/strict';
import {parseHTML} from 'linkedom';
import {publicURL,isPublicIPv4,safePage,extractProductPage,productCandidate,extractShopify} from '../supabase/functions/_shared/productPageCore.mjs';
const parse=html=>parseHTML(html).document;
test('SSRF blocks private IPs, metadata, alternative numeric forms, credentials and schemes before connecting',async()=>{
 for(const ip of ['127.0.0.1','10.0.0.1','172.31.2.3','192.168.0.1','169.254.169.254','0.0.0.0','100.64.0.2','::1','::ffff:127.0.0.1','198.18.0.1','203.0.113.8'])assert.equal(isPublicIPv4(ip),false,ip);
 for(const url of ['file:///x','ftp://example.com/x','https://localhost/x','http://2130706433/x','http://0177.0.0.1','http://0x7f000001','https://[::1]/','https://user:pw@example.com/x','http://metadata.google.internal','https://example.com:8080/x'])assert.throws(()=>publicURL(url));
 let calls=0;await assert.rejects(safePage('https://example.com/x',{resolve:async()=>['93.184.216.34','10.0.0.1'],transport:()=>{calls++;}}),/DNS_BLOCKED/);assert.equal(calls,0);
});
test('every redirect is revalidated, bounded and pinned to the checked DNS address',async()=>{
 const checked=[];const context={resolve:async host=>{checked.push(host);return ['93.184.216.34'];},transport:async(url,ip)=>{assert.equal(ip,'93.184.216.34');return new Response('',{status:302,headers:{location:'http://169.254.169.254/latest/meta-data'}});}};
 await assert.rejects(safePage('https://example.com/x',context),/URL_BLOCKED/);
 let count=0;await assert.rejects(safePage('https://example.com/x',{...context,transport:async()=>{count++;return new Response('',{status:302,headers:{location:'/loop'}});}}),/REDIRECT_LIMIT/);assert.equal(count,4);
});
test('unknown content types, excessive size, unavailable sites and cancelled requests cannot import data',async()=>{
 const resolve=async()=>['93.184.216.34'];
 await assert.rejects(safePage('https://example.com/x',{resolve,transport:async()=>new Response('image',{headers:{'content-type':'image/png'}})}),/CONTENT_TYPE_BLOCKED/);
 await assert.rejects(safePage('https://example.com/x',{resolve,maxBytes:3,transport:async()=>new Response('1234',{headers:{'content-type':'text/html'}})}),/PAGE_TOO_LARGE/);
 await assert.rejects(safePage('https://example.com/x',{resolve,transport:async()=>new Response('no',{status:403})}),/PAGE_UNAVAILABLE/);
 const controller=new AbortController();controller.abort();await assert.rejects(safePage('https://example.com/x',{signal:controller.signal,resolve,transport:()=>{throw Error('should not fetch');}}),/abort/i);
});
test('structured Product extracts explicit fields without inventing color, finish, EAN or image',()=>{
 const product={"@type":"Product",name:'Test gel',brand:{name:'Brand'},sku:'P001',gtin13:'3662263511142',color:'Milky',additionalProperty:[{name:'Gamme',value:'Range'},{name:'HEX',value:'#123456'}]};
 const result=extractProductPage(`<script type="application/ld+json">${JSON.stringify({'@graph':[product]})}</script>`,'https://example.com/p',parse);
 assert.equal(result.status,'found');assert.equal(result.candidate.fields.collection,'Range');assert.equal(result.candidate.fields.color,'#123456');assert.equal(result.candidate.fields.barcode,'3662263511142');assert.equal(result.candidate.fields.photo,undefined);assert.equal(result.candidate.fields.finish,undefined);
 assert.deepEqual(productCandidate({name:'Only name'},'https://example.com/p').fields,{name:'Only name'});
});
test('related products and OpenGraph are partial/manual, and variant selection never chooses an arbitrary shade',()=>{
 const result=extractProductPage('<meta property="og:title" content="Useful name"><script type="application/ld+json">[{"@type":"Product","name":"A"},{"@type":"Product","name":"B"}]</script>','https://example.com/p',parse);
 assert.equal(result.status,'manual');assert.equal(result.candidate.fields.name,'Useful name');assert.equal(result.candidate.fields.barcode,undefined);
 const result2=extractShopify({title:'Polish',vendor:'Brand',variants:[{id:1,title:'Red'},{id:2,title:'Blue'}]},'https://example.com/products/polish');assert.equal(result2.candidate.needsVariant,true);assert.equal(result2.candidate.fields.shadeName,undefined);
});


test('DNS and transport stalls respect the request abort, including cloud wire-server IP',async()=>{
 assert.equal(isPublicIPv4('168.63.129.16'),false);
 const controller=new AbortController();const promise=safePage('https://brand.example/product',{resolve:()=>new Promise(()=>{}),transport:()=>{throw Error('must not connect')},signal:controller.signal});controller.abort();await assert.rejects(promise);
});
