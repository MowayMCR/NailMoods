import test from 'node:test';import assert from 'node:assert/strict';
import {validatePlan,validateRequest,CONCEPT_COLORS,safeSources,publicProducts} from '../supabase/functions/nailmoods-ai/contract.mjs';
import {runProvider,providerConfig,requestBody} from '../supabase/functions/nailmoods-ai/provider.mjs';
import {localPlan,ideaFromPlan,productContext,tutorialFor,assistantEnabled} from '../src/assistant/model.js';
const items=[{id:'owned-1',type:'Vernis',name:'Cassis personnel',brand:'Ma marque',reference:'Référence réelle',color:'#813c60',quantity:1},{id:'owned-2',type:'Vernis',name:'Doré personnel',color:'#cba358',quantity:1}];
const products=[...productContext(items),...CONCEPT_COLORS];
const plan=()=>localPlan('Une French léopard avec des détails dorés',{items});
const config={enabled:true,apiKey:'mock-only',textModel:'mock-text-model',moderationModel:'mock-moderation',inputPrice:1,outputPrice:2,searchPrice:.01};
const request=(operation='conversation')=>({requestId:crypto.randomUUID(),threadId:crypto.randomUUID(),workspaceId:crypto.randomUUID(),operation,prompt:'French léopard',collectionOnly:false,shape:'Amande',length:'Courte',mood:'soft-glam',consent:true});
const mockResponse=(p,extra={})=>({ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(p)}]}],usage:{input_tokens:100,output_tokens:200},...extra})});
const moderation={ok:true,json:async()=>({results:[{flagged:false}]})};
test('AI structured plan rejects made-up products, extra tool keys, wrong fingers and protected collection mode',()=>{
 assert.equal(validatePlan(plan(),products).action,'compose');
 const forged=plan();forged.nails[0].productId='invented-commercial-product';assert.throws(()=>validatePlan(forged,products),/unknown_product/);
 assert.throws(()=>validatePlan({...plan(),sql:'DROP'},products),/invalid_plan/);
 const bad=plan();bad.nails[1].finger=0;assert.throws(()=>validatePlan(bad,products),/invalid_nail/);
 assert.throws(()=>validatePlan(plan(),products,{collectionOnly:true}),/unknown_product/);
 assert.throws(()=>validateRequest({...request(),userId:'someone-else'}),/invalid_request/);
 assert.equal(assistantEnabled({VITE_NAILMOODS_AI_ENABLED:'true',VITE_DEPLOYMENT_ENV:'production'}),true);
});
test('local renderer handles creative examples, exact single-finger edits and an included tutorial',()=>{
 for(const prompt of ['Des ongles Halloween inspirés des méchants Disney','Des fleurs','Une French léopard avec des détails dorés','Une pose simple pour débutante']){
 const p=localPlan(prompt,{items}),idea=ideaFromPlan(p,{products,items});assert.equal(idea.nails.length,5);assert.ok(tutorialFor(idea).length>5);
 }
 const first=ideaFromPlan(plan(),{products,items});const p=localPlan('Reprends ma dernière pose et change seulement l’annulaire',{items,current:first});const next=ideaFromPlan(p,{products,items,current:first});
 assert.equal(p.editFinger,3);for(const i of [0,1,2,4])assert.deepEqual(next.nails[i],first.nails[i]);
 assert.equal(next.shape,first.shape);assert.equal(next.length,first.length);
 const p2=localPlan('fleurs',{items,collectionOnly:true});const owned=ideaFromPlan(p2,{products:productContext(items),items,collectionOnly:true});assert.ok(owned.palette.every(p=>items.some(i=>i.id===p.id)));
 assert.match(localPlan('Utilise uniquement mes vernis',{collectionOnly:true}).message,/vide/);
 assert.equal(localPlan('Quelles sont les tendances de cet hiver ?').action,'chat');
 assert.equal(localPlan('Montre-moi une version réaliste').action,'chat');
 assert.equal(localPlan('Explique-moi les étapes').action,'tutorial');
 assert.equal(localPlan('Envoie cette inspiration à ma PO').action,'share');
});
test('provider is opt-in, bounded, stateless, moderated and never retries; usage is retained after invalid output',async()=>{
 let paid=0,mod=0;const fetcher=async(url,o)=>{if(url.endsWith('/moderations')){mod++;return moderation;}paid++;const b=JSON.parse(o.body);assert.equal(b.store,false);assert.equal(b.max_output_tokens,2500);assert.equal(b.text.format.strict,true);assert.equal(b.input.some(i=>JSON.stringify(i).includes('SECRET-PROFILE')),false);return mockResponse(plan());};
 await assert.rejects(runProvider({body:request(),products,config:{...config,enabled:false},maxUsd:1,fetcher}),/provider_disabled/);assert.equal(paid,0);
 await assert.rejects(runProvider({body:request(),products,config,maxUsd:.000001,fetcher}),/operation_budget_exceeded/);assert.equal(paid,0);
 const r=await runProvider({body:request(),products,config,maxUsd:1,fetcher});assert.equal(r.result.kind,'plan');assert.equal(r.cost,.0005);assert.equal(paid,1);assert.equal(mod,2);
 await assert.rejects(runProvider({body:request(),products,config,maxUsd:1,fetcher:async url=>url.endsWith('/moderations')?moderation:mockResponse({nonsense:true})}),e=>e.message==='invalid_response'&&e.cost===.0005);
 paid=0;await assert.rejects(runProvider({body:request(),products,config,maxUsd:1,fetcher:async url=>{if(url.endsWith('/moderations'))return moderation;paid++;throw Error('timeout');}}),/provider_interrupted/);assert.equal(paid,1);
 await assert.rejects(runProvider({body:request(),products,config,maxUsd:1,fetcher:async()=>({ok:true,json:async()=>({results:[{flagged:true}]})})}),/content_not_allowed/);
});
test('trends require provider citations; source date remains unknown when absent; no arbitrary URL fetch',async()=>{
 const response={output:[{type:'web_search_call'},{content:[{type:'output_text',text:'Tendance documentée',annotations:[{type:'url_citation',url:'https://example.com/article',title:'Article'},{type:'url_citation',url:'javascript:alert(1)',title:'bad'}]}]}],usage:{input_tokens:100,output_tokens:200}};
 const r=await runProvider({body:request('trends'),products,config,maxUsd:1,fetcher:async(url,o)=>{if(url.endsWith('/moderations'))return moderation;assert.equal(JSON.parse(o.body).max_tool_calls,1);return {ok:true,json:async()=>response};}});
 assert.equal(r.result.sources.length,1);assert.equal(r.result.sources[0].publishedAt,null);assert.ok(r.result.sources[0].accessedAt);assert.equal(r.cost,.0105);
 assert.deepEqual(safeSources({output:[]}),[]);
 await assert.rejects(runProvider({body:request('trends'),products,config,maxUsd:1,fetcher:async url=>url.endsWith('/moderations')?moderation:mockResponse({})}),/sources_unavailable/);
});
test('context minimization does not transmit notes/photos/ingredients or certify a personal color',()=>{
 const p=publicProducts([{id:'x',shade_name:'Nom',hex:'#112233',is_verified:false,metadata:{nailmoods:{id:'local',notes:'SECRET-PROFILE',photo:'private-image',ingredientRecord:{}}}}]);assert.equal(JSON.stringify(p).includes('SECRET'),false);assert.equal(p[0].verified,false);
 const body=requestBody(request(),p,[],config);assert.equal(body.store,false);
 assert.equal(providerConfig(()=>undefined).enabled,false);
});
