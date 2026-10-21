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
