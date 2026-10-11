import test from 'node:test';
import assert from 'node:assert/strict';
import {runProvider} from '../supabase/functions/nailmoods-ai/provider.mjs';
import {visualPrompt} from '../supabase/functions/nailmoods-ai/visual.mjs';
const config={enabled:true,apiKey:'mock-secret',imageModel:'mock-image',imageMax:.45,imageTextPrice:5,imageInputPrice:8,imageOutputPrice:30,textModel:'mock-text',inputPrice:.4,outputPrice:1.6};
const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);new DataView(bytes.buffer).setUint32(16,1024);new DataView(bytes.buffer).setUint32(20,1024);const b64=Buffer.from(bytes).toString('base64');
const composition=()=>{const nails=Array.from({length:5},(_,finger)=>({finger,color:'#ffffff',accentColor:'#78415e',designBrief:'Fleur originale',art:{role:'principal',techniques:['line'],finish:'glossy',colorProductIds:['white'],motifs:[{name:'Fleur',description:'Cinq pétales',rationale:'Fleurs demandées',x:50,y:50,size:30,technique:'line',colorProductIds:['white']}]}}));return {shape:'Ronde',length:'Moyenne',nails,master:{revision:1,version:2,nails,palette:[{id:'white',color:'#ffffff'}],originalRequest:'PRIVATE REQUEST',direction:{universe:'Batman et Robin',composition:'Palette graphique',avoid:[],minimalist:false}}};};
const result=()=>({ok:true,status:200,headers:{get:()=> 'req_success'},json:async()=>({data:[{b64_json:b64}],usage:{input_tokens_details:{text_tokens:100,image_tokens:0},output_tokens:300}})});
const clear=()=>({ok:true,status:200,json:async()=>({results:[{flagged:false}]})});
test('new illustrations use one direct generation, no PNG input, auto moderation and private audit hashes',async()=>{
 const c=composition(),before=structuredClone(c);let images=0;
 const r=await runProvider({body:{operation:'illustration',prompt:'Fleurs',composition:c},config,maxUsd:.5,products:[],fetcher:async(url,opt)=>{if(url.endsWith('/moderations'))return clear();if(url.endsWith('/responses'))throw Error('QA unavailable');images++;assert.equal(url,'https://api.openai.com/v1/images/generations');const p=JSON.parse(opt.body);assert.equal(p.n,1);assert.equal(p.moderation,'auto');assert.equal(p.image,undefined);return result();}});
 assert.equal(images,1);assert.deepEqual(c,before);assert.equal(r.usage.requestAudit.referenceSent,false);assert.equal(r.usage.providerRequestId,'req_success');assert.match(r.usage.requestAudit.promptSha256,/^[a-f0-9]{64}$/);assert.ok(!JSON.stringify(r.usage).includes('mock-secret'));assert.ok(!JSON.stringify(r.usage).includes('PRIVATE REQUEST'));
});
test('transformations and revised drawings retain image edits and a visual reference',async()=>{
 for(const operation of ['realistic','illustration']){const c=composition();c.master.revision=2;let images=0;
 const r=await runProvider({body:{operation,prompt:'Même plan',composition:c,referenceImage:'data:image/png;base64,'+b64},config,maxUsd:.5,products:[],fetcher:async(url,opt)=>{if(url.endsWith('/moderations'))return clear();if(url.endsWith('/responses'))throw Error('QA unavailable');images++;assert.equal(url,'https://api.openai.com/v1/images/edits');assert.equal(opt.body.get('moderation'),'auto');assert.equal(opt.body.get('image[]').size,bytes.length);return result();}});assert.equal(images,1);assert.equal(r.usage.requestAudit.referenceSent,true);}
});
test('a provider moderation refusal is not retried, rerouted, renamed or silently replaced',async()=>{
 let images=0;await assert.rejects(runProvider({body:{operation:'illustration',prompt:'Original',composition:composition()},config,maxUsd:.5,products:[],fetcher:async url=>{if(url.endsWith('/moderations'))return clear();images++;return {ok:false,status:400,headers:{get:()=> 'req_refusal'},json:async()=>({error:{code:'moderation_blocked',type:'image_generation_user_error',message:'PRIVATE BODY',moderation_details:{moderation_stage:'output',categories:['violence','SECRET_LABEL']}}})};}}),e=>{assert.equal(e.message,'content_not_allowed');assert.equal(e.usage.stage,'image_generation');assert.equal(e.usage.endpoint,'/v1/images/generations');assert.equal(e.usage.providerRequestId,'req_refusal');assert.equal(e.usage.moderationStage,'output');assert.deepEqual(e.usage.moderationCategories,['violence']);assert.equal(e.cost,null);assert.ok(!JSON.stringify(e.usage).includes('PRIVATE BODY'));return true;});assert.equal(images,1);
});
test('preflight moderation refusal is distinguished and prevents every image call',async()=>{
 let images=0;await assert.rejects(runProvider({body:{operation:'illustration',prompt:'Original',composition:composition()},config,maxUsd:.5,products:[],fetcher:async url=>{if(url.endsWith('/moderations'))return {ok:true,status:200,json:async()=>({results:[{flagged:true}]})};images++;throw Error('must not call');}}),e=>e.message==='content_not_allowed'&&e.usage.stage==='image_input_moderation'&&e.cost===0);assert.equal(images,0);
});
test('drawing instructions have no hardcoded foreign motif, photograph instructions or contradictory logo ban',()=>{
 const c=composition(),p=visualPrompt(c,'illustration');assert.match(p,/Batman et Robin/);assert.doesNotMatch(p,/character-inspired goggles|For a photograph|No text, labels, logos/);assert.ok(!p.includes('PRIVATE REQUEST'));assert.deepEqual(c.master.nails,c.nails);
});
