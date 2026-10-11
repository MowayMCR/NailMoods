import test from 'node:test';
import assert from 'node:assert/strict';
import {requestBody} from '../supabase/functions/nailmoods-ai/provider.mjs';
import {validateRequest,CONCEPT_COLORS} from '../supabase/functions/nailmoods-ai/contract.mjs';
import {createMaster} from '../supabase/functions/nailmoods-ai/master.mjs';
import {ideaFromPlan,poseRequestSettings} from '../src/assistant/model.js';
import {saveInspiration} from '../src/inspirations.js';
import {preferredVisual,saveVisualCopy} from '../src/assistant/publicationMedia.js';
const body={requestId:'11111111-1111-4111-8111-111111111111',threadId:'22222222-2222-4222-8222-222222222222',workspaceId:'33333333-3333-4333-8333-333333333333',operation:'conversation',consent:true,prompt:'Garde cette pose de fleurs, change index droit',shape:'Ronde',length:'Moyenne',level:1,collectionOnly:false,designCount:10};
const plan=()=>({action:'compose',message:'Fleurs',title:'Fleurs',shape:'Ronde',length:'Moyenne',level:1,collectionOnly:false,editFinger:null,nails:Array.from({length:10},(_,finger)=>({finger,productId:'concept-rose',accentProductId:null,technique:'line',drawingTechnique:'line',motif:'',designBrief:'Fleur '+finger}))});
test('selected right index constrains provider schema to one edit and preserves original intention',()=>{
 const master=createMaster(plan(),CONCEPT_COLORS,body),b={...body,targetFinger:6,composition:{master}};validateRequest(b);
 const req=requestBody(b,CONCEPT_COLORS,[],{textModel:'mock'}),schema=req.text.format.schema;
 assert.deepEqual(schema.properties.action.enum,['edit']);assert.deepEqual(schema.properties.editFinger.enum,[6]);assert.equal(schema.properties.nails.maxItems,1);assert.deepEqual(schema.properties.nails.items.properties.finger.enum,[6]);
 const data=JSON.parse(req.input[1].content[0].text);assert.equal(data.originalIntention,body.prompt);assert.equal(data.targetFinger,6);assert.deepEqual(data.composition.master,master);
 for(const bad of [-1,10,'6'])assert.throws(()=>validateRequest({...b,targetFinger:bad}));assert.throws(()=>validateRequest({...b,composition:undefined}));
});
test('one nail edit keeps nine master designs and clears obsolete saved images',()=>{
 const p=plan(),master=createMaster(p,CONCEPT_COLORS,body),before=structuredClone(master);const current={...ideaFromPlan(p,{products:CONCEPT_COLORS,master}),photo:'data:image/png;base64,old',savedVisual:'illustration',savedRenderingJobId:'old',isPublic:true};
 const changed={...p,action:'edit',editFinger:6,nails:[{...p.nails[6],designBrief:'Petite rose en spirale'}]};
 const nextMaster=createMaster(changed,CONCEPT_COLORS,{...body,composition:{master}}),next=ideaFromPlan(changed,{products:CONCEPT_COLORS,master:nextMaster,current});
 assert.equal(nextMaster.revision,2);assert.equal(nextMaster.originalRequest,before.originalRequest);for(let i=0;i<10;i++)if(i!==6)assert.deepEqual(nextMaster.nails[i],before.nails[i]);assert.deepEqual(master,before);assert.equal(next.photo,undefined);assert.equal(next.savedVisual,undefined);assert.equal(next.isPublic,false);assert.equal(next.secondHand.nails[1].designBrief,'Petite rose en spirale');
});
test('save prefers available AI output and honors selected drawing over realism',async t=>{
 const fetchOriginal=globalThis.fetch,readerOriginal=globalThis.FileReader;t.after(()=>{globalThis.fetch=fetchOriginal;globalThis.FileReader=readerOriginal;});globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['test'],{type:'image/png'})});globalThis.FileReader=class{readAsDataURL(){this.result='data:image/png;base64,dGVzdA==';queueMicrotask(()=>this.onload());}};
 const idea={ai:{media:{illustration:{jobId:'drawing'},realistic:{jobId:'photo'}}}},calls=[];assert.equal(preferredVisual(idea),'realistic');assert.equal(preferredVisual(idea,'illustration'),'illustration');
 const client={functions:{invoke:async(_,{body})=>{calls.push(body);return{data:{status:'succeeded',result:{kind:body.jobId==='drawing'?'illustration':'realistic',imageUrl:'https://owned.test/image'}}};}}};
 const saved=await saveVisualCopy(client,idea,'illustration');assert.equal(saved.savedVisual,'illustration');assert.equal(saved.savedRenderingJobId,'drawing');assert.equal(saved.isPublic,false);assert.ok(saved.photo.startsWith('data:image/'));await saveVisualCopy(client,saved,'illustration');assert.equal(calls.length,1);
 const wrong={functions:{invoke:async()=>({data:{status:'succeeded',result:{kind:'realistic',imageUrl:'https://wrong'}}})}};await assert.rejects(saveVisualCopy(wrong,idea,'illustration'),/render_unavailable/);
});

test('history pose settings override stale five-finger form for right-hand edits and rendering',()=>{
 const master=createMaster(plan(),CONCEPT_COLORS,body),idea=ideaFromPlan(plan(),{products:CONCEPT_COLORS,master}),stale={shape:'Amande',length:'Courte',level:0,designCount:5,collectionOnly:true};
 for(const operation of ['conversation','illustration']){const settings=poseRequestSettings(idea,stale,operation,6);assert.deepEqual(settings,{shape:'Ronde',length:'Moyenne',level:1,designCount:10,collectionOnly:false});validateRequest({...body,...settings,operation,targetFinger:6,composition:{master}});}
 assert.equal(poseRequestSettings(idea,stale,'realistic').designCount,10);assert.deepEqual(poseRequestSettings(idea,stale,'conversation'),stale);
});

test('saving a newer AI visual upgrades the existing private idea without duplicating or changing a public copy',()=>{
 const master=createMaster(plan(),CONCEPT_COLORS,body),idea=ideaFromPlan(plan(),{products:CONCEPT_COLORS,master});
 const drawing={...idea,photo:'data:image/png;base64,drawing',savedVisual:'illustration',savedRenderingJobId:'first',isPublic:false};
 let library=saveInspiration({favorites:[],recent:[]},drawing);library.favorites[0].title='Mes fleurs';
 const realism={...drawing,photo:'data:image/png;base64,realism',savedVisual:'realistic',savedRenderingJobId:'second'};library=saveInspiration(library,realism);
 assert.equal(library.favorites.length,1);assert.equal(library.favorites[0].savedVisual,'realistic');assert.equal(library.favorites[0].photo,realism.photo);assert.equal(library.favorites[0].title,'Mes fleurs');assert.equal(library.favorites[0].key,idea.key);
 library.favorites[0].isPublic=true;const published=structuredClone(library.favorites[0]);library=saveInspiration(library,drawing);assert.deepEqual(library.favorites[0],published);
});
