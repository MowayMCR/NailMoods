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
 p.nails[1].art=structuredClone(p.nails[0].art);p.nails[1].productId='concept-purple';assert.deepEqual(duplicateDesignFingers(p),[1]);assert.ok(validateArt(p,body.prompt,CONCEPT_COLORS).warnings.includes('repeated_designs'));
});
test('similar designs are accepted privately without a paid artistic repair',async()=>{
 const bad=plan();bad.nails[1].art=structuredClone(bad.nails[0].art);let calls=0;
 const r=await runProvider({body,products:[],config,maxUsd:1,fetcher:async url=>{if(url.endsWith('/moderations'))return moderation;calls++;return response(bad);}});
 assert.equal(calls,1);assert.equal(r.cost,.0005);assert.ok(r.usage.warnings.includes('repeated_designs'));assert.equal(r.result.master.nails.length,10);assert.deepEqual(r.result.plan.nails,bad.nails);
});
test('source comparison tolerates only harmless URL variations and never another page or host',()=>{
 const sources=[{url:'https://example.com/halloween/?a=1&b=2'}];assert.ok(resolveSource(sources,'https://example.com/halloween?utm_source=x&b=2&a=1#top'));assert.equal(resolveSource(sources,'https://other.com/halloween?a=1&b=2'),null);assert.equal(resolveSource(sources,'https://example.com/other?a=1&b=2'),null);assert.equal(resolveSource(sources,'javascript:alert(1)'),null);
});
const cards=url=>({message:'Trois inspirations Halloween',cards:Array.from({length:3},()=>({summary:'Motifs Halloween',sourceUrl:url,plan:plan(5)}))});
test('trends repair only citation URLs, with no second web search and no changed plans',async()=>{
 let calls=0;const old=cards('https://example.com/unverified'),fixed={matches:[0,1,2].map(index=>({index,sourceUrl:'https://example.com/halloween/'}))};
 const r=await runProvider({body:{...body,operation:'trends',prompt:'Halloween',designCount:5},products:[],config,maxUsd:1,fetcher:async(url,o)=>{if(url.endsWith('/moderations'))return moderation;calls++;const req=JSON.parse(o.body);if(calls===2){assert.equal(req.tools,undefined);assert.equal(req.max_tool_calls,undefined);assert.deepEqual(req.text.format.schema.properties.matches.items.properties.sourceUrl.enum,[null,'https://example.com/halloween/']);}return response(calls===1?old:fixed,calls===1);}});
 assert.equal(calls,2);assert.ok(Math.abs(r.cost-.011)<1e-12);assert.equal(r.usage.searchCalls,1);assert.equal(r.usage.repair.status,'succeeded');assert.deepEqual(r.result.cards[0].plan,old.cards[0].plan);
});
test('citation repair rejects unconsulted URLs after one bounded call and cannot alter a plan',async()=>{
 let calls=0;const old=cards('https://example.com/unknown');
 await assert.rejects(runProvider({body:{...body,operation:'trends',prompt:'Halloween'},products:[],config,maxUsd:1,fetcher:async url=>{if(url.endsWith('/moderations'))return moderation;calls++;return response(calls===1?old:{matches:[{index:0,sourceUrl:'https://other.com/unverified'}]},calls===1);}}),e=>e.message==='sources_repair_failed'&&e.usage.repair.attempts===1);assert.equal(calls,2);
});
test('a bad citation cannot discard the other two sourced cards or trigger a paid retry',async()=>{
 const value=cards('https://example.com/halloween/');value.cards[1].sourceUrl='https://unknown.com/fake';let calls=0;
 const r=await runProvider({body:{...body,operation:'trends',prompt:'Halloween',designCount:5},products:[],config,maxUsd:1,fetcher:async url=>{if(url.endsWith('/moderations'))return moderation;calls++;return response(value,true);}});
 assert.equal(calls,1);assert.equal(r.result.cards.length,2);assert.equal(r.usage.omittedCards[0].code,'source_match');assert.ok(r.result.cards.every(c=>c.source.url==='https://example.com/halloween/'));
});

test('one surviving sourced card is displayed; arbitrary data references remain fatal',async()=>{
 const value=cards('https://example.com/halloween/');value.cards[1].sourceUrl='https://unknown.com/fake';value.cards[2].plan.nails[0].productId='PRIVATE-UNAUTHORIZED';let calls=0;
 const r=await runProvider({body:{...body,operation:'trends',prompt:'Halloween'},products:[],config,maxUsd:1,fetcher:async url=>{if(url.endsWith('/moderations'))return moderation;calls++;return response(value,true);}});assert.equal(calls,1);assert.equal(r.result.cards.length,1);assert.equal(r.usage.omittedCards.length,2);assert.ok(!JSON.stringify(r.usage).includes('PRIVATE-UNAUTHORIZED'));
});
test('structural repair is one extra call and restores the requested fingers, master and tutorial',async()=>{
 const bad=plan();bad.nails.pop();let calls=0;
 const r=await runProvider({body,products:[],config,maxUsd:1,fetcher:async url=>{if(url.endsWith('/moderations'))return moderation;calls++;return response(calls===1?bad:plan());}});assert.equal(calls,2);assert.equal(r.usage.repair.attempts,1);assert.equal(r.result.master.nails.length,10);
});
