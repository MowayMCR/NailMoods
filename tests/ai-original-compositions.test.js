import test from 'node:test';
import assert from 'node:assert/strict';
import {STRUCTURES,DISTRIBUTIONS,COMPOSITION_VARIANTS,compositionGuidance} from '../supabase/functions/nailmoods-ai/compositionLibrary.mjs';

const base={operation:'conversation',prompt:'Une pose abstraite très créative',requestId:'f1b3ce4a',designCount:10,level:1};
test('120 independent, original compositional variants, no pictures or external feeds',()=>{
 assert.equal(STRUCTURES.length,24);
 assert.equal(DISTRIBUTIONS.length,5);
 assert.equal(COMPOSITION_VARIANTS,120);
 assert.equal(new Set(STRUCTURES.map(x=>x.name)).size,24);
});
test('ten fingers keep four principal and two accent positions, never mirrored',()=>{
 for(const roles of DISTRIBUTIONS){
  const ids=[...roles.a,...roles.e,...roles.b,...roles.f];
  assert.equal(ids.length,6);
  assert.equal(new Set(ids).size,6);
  assert.ok(roles.a.every(n=>n>=0&&n<5));
  assert.ok(roles.b.every(n=>n>=5&&n<10));
 }
 const text=compositionGuidance(base);
 assert.match(text,/10 ongles/);
 assert.match(text,/facultatif/);
 assert.doesNotMatch(text,/inspiré de Pinterest/i);
});
test('no guidance for editing, trends, manual-only or clearly uniform requests',()=>{
 for(const patch of [
  {operation:'trends'},
  {operation:'illustration'},
  {targetFinger:2},
  {composition:{master:{id:'existing'}}},
  {prompt:'Une pose unie couleur prune'},
  {prompt:'Tous les ongles identiques'},
  {prompt:'Sans motif, vernis nude'}
 ])assert.equal(compositionGuidance({...base,...patch}), '');
});
test('different request IDs allow layout variation without forcing themes',()=>{
 const a=compositionGuidance({...base,requestId:'one'});
 const b=compositionGuidance({...base,requestId:'two'});
 assert.ok(a&&b);
 assert.ok(!a.includes('cottagecore'));
 assert.ok(!a.includes('vampire'));
 assert.ok(!a.includes('Minions'));
 assert.match(compositionGuidance({...base,operation:'vision'}),/photo fournie prime/);
});

test('server provider injects the optional grammar only into fresh plans',async()=>{
 const {requestBody}=await import('../supabase/functions/nailmoods-ai/provider.mjs');
 const settings={shape:'Amande',length:'Courte',collectionOnly:false,...base};
 const compose=requestBody(settings,[],[],{textModel:'test'});
 assert.match(compose.input[0].content,/GUIDE DE COMPOSITION ORIGINALE/);
 assert.match(compose.input[0].content,/Tu es NailMoods AI/);
 assert.equal(compose.input[1].content[0].type,'input_text');
 const editing=requestBody({...settings,targetFinger:2},[],[],{textModel:'test'});
 assert.doesNotMatch(editing.input[0].content,/GUIDE DE COMPOSITION ORIGINALE/);
 const uniform=requestBody({...settings,prompt:'Une pose unie'},[],[],{textModel:'test'});
 assert.doesNotMatch(uniform.input[0].content,/GUIDE DE COMPOSITION ORIGINALE/);
});

test('iconic theme requirements detect missing goggles or overalls while respecting exclusions',async()=>{
 const {minionsRequested,iconicThemeGuidance,missingIconicFeatures}=await import('../supabase/functions/nailmoods-ai/compositionLibrary.mjs');
 const brief='Une pose Minions jaune et bleu, avec lunettes rondes et salopettes';
 assert.equal(minionsRequested(brief),true);
 assert.equal(minionsRequested('Sans Minions, mais du jaune'),false);
 assert.match(iconicThemeGuidance(brief),/bretelles visibles/);
 assert.equal(iconicThemeGuidance('Vampire gothique'), '');
 const weak={action:'compose',nails:Array.from({length:10},(_,i)=>({designBrief:i===0?'un cercle noir':'pose jaune et bleue',art:{signature:'motif abstrait',motifs:[]}}))};
 assert.deepEqual(missingIconicFeatures(weak,brief),['missing_essential_motif']);
 const strong={...weak,nails:weak.nails.map((n,i)=>({...n,designBrief:[0,2].includes(i)?'Lunettes noires complètes avec sangle et pont':[5,7].includes(i)?'Salopette bleue avec bavette et bretelles':'ongle accompagnement jaune'}))};
 assert.deepEqual(missingIconicFeatures(strong,brief),[]);
 assert.deepEqual(missingIconicFeatures(weak,'Sans Minions'),[]);
});
test('theme instruction reaches plan, image rendering and QA without changing UI contract',async()=>{
 const {requestBody}=await import('../supabase/functions/nailmoods-ai/provider.mjs');
 const {visualPrompt}=await import('../supabase/functions/nailmoods-ai/visual.mjs');
 const {qualityRequest}=await import('../supabase/functions/nailmoods-ai/quality.mjs');
 const prompt='Des Minions jaunes et bleus avec lunettes et salopettes';
 const base={operation:'conversation',prompt,designCount:10,shape:'Ovale',length:'Moyenne',level:1,collectionOnly:false,requestId:'m1'};
 assert.match(requestBody(base,[],[],{textModel:'test'}).input[0].content,/PRIORITÉ THÉMATIQUE MINIONS/);
 assert.doesNotMatch(requestBody({...base,prompt:'Du jaune et du bleu sans minions'},[],[],{textModel:'test'}).input[0].content,/PRIORITÉ THÉMATIQUE MINIONS/);
 const nails=Array.from({length:10},(_,i)=>({finger:i,color:'#f6cf38',accentColor:'#6674a2',designBrief:'lunettes rondes et salopette',art:{role:'principal',signature:'lunettes, bretelles',techniques:['line'],finish:'glossy',colorProductIds:[],motifs:[]}}));
 const composition={shape:'Ovale',length:'Moyenne',nails,master:{revision:1,version:2,originalRequest:prompt,direction:{intention:prompt,universe:'minions',composition:'',paletteNotes:'jaune bleu',avoid:[],minimalist:false},palette:[],nails}};
 const visual=visualPrompt(composition,'illustration');
 assert.match(visual,/PRIORITÉ THÉMATIQUE MINIONS/);
 assert.match(visual,/originalRequest/);
 assert.match(visual,/signature/);
 const qa=qualityRequest({...composition,operation:'illustration'},null,'data:image/png;base64,xxx','test');
 assert.match(JSON.stringify(qa),/originalRequest/);
 assert.match(JSON.stringify(qa),/isolated rings/);
});
