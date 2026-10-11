import test from 'node:test';
import assert from 'node:assert/strict';
import {runProvider} from '../supabase/functions/nailmoods-ai/provider.mjs';
import {CONCEPT_COLORS,validatePlan} from '../supabase/functions/nailmoods-ai/contract.mjs';
import {validateArt} from '../supabase/functions/nailmoods-ai/master.mjs';
import {duplicateDesignFingers,resolveSource,assertDesignRepairPreserved} from '../supabase/functions/nailmoods-ai/recovery.mjs';
const config={enabled:true,apiKey:'mock-only',textModel:'mock',moderationModel:'mock',inputPrice:1,outputPrice:2,searchPrice:.01};
const body={operation:'conversation',prompt:'Inspiration darkvador',shape:'Ronde',length:'Moyenne',level:1,collectionOnly:false,designCount:10};
const plan=(count=10)=>({action:'compose',message:'Une pose',title:'Pose Dark Vador',shape:'Ronde',length:'Moyenne',level:1,collectionOnly:false,editFinger:null,direction:{intention:'Dark Vador',universe:'Star Wars',paletteNotes:'Noir blanc',composition:'Dix graphiques',avoid:[],minimalist:false},nails:Array.from({length:count},(_,finger)=>({finger,productId:'concept-black',accentProductId:'concept-white',technique:'line',drawingTechnique:'',motif:'',designBrief:'Casque au placement '+finger,art:{role:'principal',signature:'Même intitulé générique',techniques:['line'],finish:'matte',colorProductIds:['concept-black','concept-white'],motifs:[{name:'Casque',description:'Lignes du masque',rationale:'Univers demandé',x:15+finger*7,y:50,size:20,technique:'line',colorProductIds:['concept-white']}],materials:['Pinceau liner'],steps:['Dessine les lignes à cet emplacement']}}))});
const moderation={ok:true,json:async()=>({results:[{flagged:false}]})};
const response=(p,search=false)=>({ok:true,json:async()=>({status:'completed',usage:{input_tokens:100,output_tokens:200},output:[...(search?[{type:'web_search_call',action:{sources:[{url:'https://example.com/halloween/',title:'Halloween'}]}}]:[]),{content:[{type:'output_text',text:JSON.stringify(p)}]}]})});
test('same labels are accepted when specified motifs and placements differ; color-only copies still fail',()=>{
 const p=plan();assert.doesNotThrow(()=>validatePlan(p,CONCEPT_COLORS,{designCount:10}));assert.doesNotThrow(()=>validateArt(p,body.prompt,CONCEPT_COLORS));
 p.nails[1].art=structuredClone(p.nails[0].art);p.nails[1].productId='concept-purple';assert.deepEqual(duplicateDesignFingers(p),[1]);assert.throws(()=>validateArt(p,body.prompt,CONCEPT_COLORS),/repeated_designs/);
});
test('one repair changes only the repeated finger, preserves theme/motifs and keeps cumulative cost',async()=>{
 const bad=plan();bad.nails[1].art=structuredClone(bad.nails[0].art);const fixed=structuredClone(bad);fixed.nails[1].art.motifs[0].y=80;fixed.nails[1].art.steps=['Dessine le casque près du bord libre'];let calls=0;
 const r=await runProvider({body,products:[],config,maxUsd:1,fetcher:async(url,o)=>{if(url.endsWith('/moderations'))return moderation;calls++;if(calls===2){const req=JSON.parse(o.body);assert.match(JSON.stringify(req.input),/repair_repeated_designs_only/);}return response(calls===1?bad:fixed);}});
 assert.equal(calls,2);assert.equal(r.cost,.001);assert.equal(r.usage.repair.attempts,1);assert.equal(r.usage.repair.status,'succeeded');assert.deepEqual(r.result.plan.nails[0],bad.nails[0]);assert.deepEqual(r.result.plan.nails[9],bad.nails[9]);
 const mutation=structuredClone(fixed);mutation.nails[9].productId='concept-yellow';assert.throws(()=>assertDesignRepairPreserved(bad,mutation,[1]),/repair_changed_composition/);
});
test('a failed design repair never loops or accepts identical designs',async()=>{
 const bad=plan();bad.nails[1].art=structuredClone(bad.nails[0].art);let calls=0;
 await assert.rejects(runProvider({body,products:[],config,maxUsd:1,fetcher:async url=>{if(url.endsWith('/moderations'))return moderation;calls++;return response(bad);}}),e=>e.message==='plan_repair_failed'&&e.cost===.001&&e.usage.repair.attempts===1&&e.usage.validationFailure==='repeated_designs');assert.equal(calls,2);
});
test('source comparison tolerates only harmless URL variations and never another page or host',()=>{
 const sources=[{url:'https://example.com/halloween/?a=1&b=2'}];assert.ok(resolveSource(sources,'https://example.com/halloween?utm_source=x&b=2&a=1#top'));assert.equal(resolveSource(sources,'https://other.com/halloween?a=1&b=2'),null);assert.equal(resolveSource(sources,'https://example.com/other?a=1&b=2'),null);assert.equal(resolveSource(sources,'javascript:alert(1)'),null);
});
const cards=url=>({message:'Trois inspirations Halloween',cards:Array.from({length:3},()=>({summary:'Motifs Halloween',sourceUrl:url,plan:plan(5)}))});
test('trends repair only citation URLs, with no second web search and no changed plans',async()=>{
 let calls=0;const old=cards('https://example.com/unverified'),fixed=cards('https://example.com/halloween/');
 const r=await runProvider({body:{...body,operation:'trends',prompt:'Halloween',designCount:5},products:[],config,maxUsd:1,fetcher:async(url,o)=>{if(url.endsWith('/moderations'))return moderation;calls++;const req=JSON.parse(o.body);if(calls===2){assert.equal(req.tools,undefined);assert.equal(req.max_tool_calls,undefined);assert.deepEqual(req.text.format.schema.properties.cards.items.properties.sourceUrl.enum,['https://example.com/halloween/']);}return response(calls===1?old:fixed,calls===1);}});
 assert.equal(calls,2);assert.ok(Math.abs(r.cost-.011)<1e-12);assert.equal(r.usage.searchCalls,1);assert.equal(r.usage.repair.status,'succeeded');assert.deepEqual(r.result.cards[0].plan,old.cards[0].plan);
});
test('unverified citations and modified plans remain blocked after one repair',async()=>{
 for(const changedPlan of [false,true]){let calls=0;const old=cards('https://example.com/unknown');const next=cards(changedPlan?'https://example.com/halloween/':'https://other.com/unverified');if(changedPlan)next.cards[0].plan.nails[0].productId='concept-yellow';
  await assert.rejects(runProvider({body:{...body,operation:'trends',prompt:'Halloween',designCount:5},products:[],config,maxUsd:1,fetcher:async url=>{if(url.endsWith('/moderations'))return moderation;calls++;return response(calls===1?old:next,calls===1);}}),e=>e.message==='sources_repair_failed'&&e.usage.repair.attempts===1);assert.equal(calls,2);
 }
});
