import test from 'node:test';
import assert from 'node:assert/strict';
import { collectionResults, emptyFilters, duplicateCandidates, provenanceOf } from '../src/collection.js';
import { createSuggestions } from '../src/creationEngine.js';
import { snapshotIdea, renameInspiration, readInspirations, INSPIRATIONS_KEY } from '../src/inspirations.js';

test('collections of 3, 20 and 150 keep exact references, combined filters and stable sorting', () => {
  for (const size of [3, 20, 150]) {
    const items = Array.from({length:size}, (_,i) => ({id:i, name:`Teinte ${i}`, brand:i%2?'Éther':'Cassis', type:'Vernis', family:'Rose', finish:'Brillant', fav:i%2===0, reference:`R${i}`}));
    const before = JSON.stringify(items);
    assert.equal(collectionResults(items).length, size);
    assert.equal(collectionResults(items,'ether','Tous',{...emptyFilters, brand:'Cassis'}).length, 0);
    assert.equal(collectionResults(items,'r0','Vernis',{...emptyFilters,favorites:true})[0].id,0);
    assert.equal(collectionResults(items,'','Tous',{...emptyFilters,sort:'name'})[2].name,'Teinte 2');
    assert.equal(JSON.stringify(items),before);
  }
});
test('duplicate suggestions never merge, never fuzzy-match names and provenance stays personal for URL imports', () => {
  const items = [{id:'a',brand:'Marque',type:'Gel',name:'Rose',reference:'001'}, {id:'b',brand:'Autre',type:'Gel',name:'Rose',reference:'001'}];
  assert.deepEqual(duplicateCandidates({brand:'Marque',type:'Gel',name:'Renommé',reference:'001'},items).map(x=>x.item.id),['a']);
  assert.equal(duplicateCandidates({brand:'Marque',type:'Gel',name:'Rose clair'},items).length,0);
  assert.equal(duplicateCandidates(items[0],items).length,0);
  assert.deepEqual(provenanceOf({source:'url'}),{kind:'personal',verified:false,importMethod:'url'});
  assert.equal(items.length,2);
});
test('renaming survives storage while preserving snapshot colors, composition identity and source', () => {
  const items = [{id:'1', name:'Cassis', type:'Vernis', color:'#813c60', usage:'Couleur seule', finish:'Brillant'}];
  const idea = snapshotIdea(createSuggestions(items).results[0]);
  const library = { favorites:[idea],recent:[idea],selected:idea };
  const next = renameInspiration(library,idea.key,'  Ma pose du vendredi  ');
  const stored = readInspirations({getItem:key=>key===INSPIRATIONS_KEY?JSON.stringify(next):null});
  assert.equal(stored.favorites[0].title,'Ma pose du vendredi');
  assert.equal(stored.selected.key,idea.key);
  assert.deepEqual(stored.recent[0].nails,idea.nails);
  assert.notEqual(idea.title,stored.selected.title);
  assert.equal(renameInspiration(library,idea.key,'  '),library);
});
