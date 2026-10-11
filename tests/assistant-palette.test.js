import test from 'node:test';
import assert from 'node:assert/strict';
import {CONCEPT_COLORS,validatePlan} from '../supabase/functions/nailmoods-ai/contract.mjs';
import {validateArt,createMaster} from '../supabase/functions/nailmoods-ai/master.mjs';
import {assessPalette,repairColorReferences} from '../supabase/functions/nailmoods-ai/palette.mjs';
import {runProvider,requestBody} from '../supabase/functions/nailmoods-ai/provider.mjs';
import {ideaFromPlan,tutorialFor,AI_MESSAGES} from '../src/assistant/model.js';
const config={enabled:true,apiKey:'mock-only',textModel:'mock',moderationModel:'mock',inputPrice:1,outputPrice:2};
const body={operation:'conversation',prompt:'Inspirations Beetlejuice pour Halloween',collectionOnly:false,shape:'Ronde',length:'Moyenne',level:1,designCount:10};
const colors=['black','white','purple','lime','yellow','blue','gold','rose','brown','burgundy'];
function plan(theme='Beetlejuice',palette=colors){return {action:'compose',message:'Une pose cohérente',title:'Pose '+theme,shape:'Ronde',length:'Moyenne',level:1,collectionOnly:false,editFinger:null,direction:{intention:theme+' Halloween',universe:theme,paletteNotes:'Palette narrative',composition:'Dix motifs distincts',avoid:[],minimalist:false},nails:Array.from({length:10},(_,finger)=>{const id='concept-'+palette[finger%palette.length],motif=theme==='Minions'?'Lunettes de Minion':theme==='Vampire'?'Chauve-souris':'Rayures et spirale';return {finger,productId:id,accentProductId:'concept-black',technique:'line',drawingTechnique:'line',motif:'',designBrief:motif+' disposition '+String.fromCharCode(65+finger),art:{role:finger%3?'accompagnement':'principal',signature:'Composition graphique '+String.fromCharCode(65+finger),techniques:['line'],finish:'glossy',colorProductIds:[id,'concept-black'],motifs:[{name:motif,description:motif+' variante graphique',rationale:'Univers demandé',colorProductIds:['concept-black'],x:40+finger,y:55,size:30,technique:'line'}],steps:['Pose la base choisie','Dessine le motif existant avec le liner'],materials:['Pinceau liner']}};})};}
const response=p=>({ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(p)}]}],usage:{input_tokens:100,output_tokens:200}})});
const moderation={ok:true,json:async()=>({results:[{flagged:false}]})};
function fixedPalette(p){const q=structuredClone(p);q.nails[3].productId='concept-lime';q.nails[3].art.colorProductIds=['concept-lime','concept-black'];return q;}
test('Beetlejuice, Vampire, Minions and multicolour requests accept more than four bases and six references',()=>{
 for(const [theme,prompt] of [['Beetlejuice',body.prompt],['Vampire','Vampire gothique Halloween'],['Minions','Minions'],['Multicolore','Composition multicolore élaborée']]){const p=validatePlan(plan(theme),CONCEPT_COLORS,{designCount:10});assert.doesNotThrow(()=>validateArt(p,prompt,CONCEPT_COLORS));const summary=assessPalette(p,CONCEPT_COLORS,prompt);assert.equal(summary.distinctColors,10);assert.equal(summary.referenceCount,10);assert.equal(summary.humanValidated,false);}
});
test('actual duplicate swatches are counted once, and explicit alternative palettes override the cultural default',()=>{
 const p=plan('Beetlejuice',['black','white']);const products=[...CONCEPT_COLORS,...Array.from({length:10},(_,i)=>({id:'private-'+i,name:'PRIVATE_SECRET',color:'#191619'}))];p.nails.forEach((n,i)=>{n.productId='private-'+i;n.art.colorProductIds=[n.productId,'concept-white','concept-black'];});
 const result=assessPalette(p,products,'Beetlejuice noir et blanc minimaliste');assert.equal(result.distinctColors,2);assert.equal(result.referenceCount,12);assert.deepEqual(result.missingFamilies,[]);assert.ok(!JSON.stringify(result).includes('PRIVATE_SECRET'));assert.doesNotThrow(()=>validateArt(p,'Beetlejuice noir et blanc minimaliste',products));
});
test('local reference repair preserves every motif, position and technique without remote requests',()=>{
 const p=plan();p.nails[0].art.colorProductIds=['concept-white'];const {plan:q,changed}=repairColorReferences(p);assert.equal(changed,true);assert.ok(q.nails[0].art.colorProductIds.includes('concept-black'));assert.deepEqual(q.nails.map(n=>n.art.motifs),p.nails.map(n=>n.art.motifs));assert.deepEqual(p.nails[0].art.colorProductIds,['concept-white']);
});
test('missing emblematic colors remain warnings without an extra paid call',async()=>{
 const original=plan('Beetlejuice',colors.filter(c=>c!=='lime'));let calls=0;
 const r=await runProvider({body,products:[],config,maxUsd:1,fetcher:async url=>{if(url.endsWith('/moderations'))return moderation;calls++;return response(original);}});
 assert.equal(calls,1);assert.equal(r.cost,.0005);assert.ok(r.usage.warnings.includes('requested_palette_missing'));assert.equal(r.usage.repair.attempts,0);assert.equal(r.result.master.nails.length,10);
 const idea=ideaFromPlan(r.result.plan,{products:r.result.products,master:r.result.master});assert.equal(tutorialFor(idea).filter(s=>s.motifs).length,10);
});
test('missing essential motifs and unrelated artistic objects are diagnostic warnings',async()=>{
 for(const [mutate,reason] of [[p=>p.nails.forEach((n,i)=>{n.designBrief='Uni '+i;n.art.motifs=[];}),'missing_essential_motif'],[p=>p.nails[0].motif='winged-orb','unrelated_motif']]){const bad=plan();mutate(bad);let calls=0;const r=await runProvider({body,products:[],config,maxUsd:1,fetcher:async url=>{if(url.endsWith('/moderations'))return moderation;calls++;return response(bad);}});assert.ok(r.usage.warnings.includes(reason));assert.equal(calls,1);}
});
