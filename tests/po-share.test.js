import assert from 'node:assert/strict';
import test from 'node:test';
import { comparePoShare, shareSnapshot } from '../src/social/poShareService.js';

test('PO share contains only the useful palette and requirements, never private journal content', () => {
  const snapshot = shareSnapshot({
    id: 'journal-1',
    title: 'French douce',
    notes: 'Texte privé à ne jamais transmettre',
    photo: 'data:image/jpeg;base64,private',
    idea: {
      palette: [{ color: '#AABBCC' }, { color: '#aabbcc' }],
      technique: 'Micro-French',
      requirements: [{ name: 'Pinceau fin' }],
      nails: [{ technique: 'Strass' }],
    },
  }, 'journal');

  assert.equal(snapshot.title,'French douce');
  assert.deepEqual(snapshot.colors,['#AABBCC','#aabbcc']);
  assert.equal(snapshot.include_notes,false);assert.deepEqual(snapshot.images,[]);
  assert.equal(JSON.stringify(snapshot).includes('Texte privé'), false);
  assert.equal(JSON.stringify(snapshot).includes('base64'), false);
});

test('received PO request is compared against polish colors and declared equipment', () => {
  const result = comparePoShare({
    colors: ['#B98499'],
    requirements: ['Pinceau fin'],
  }, [
    { id: 'polish-1', type: 'Vernis', name: 'Rose proche', color: '#BA8498', quantity: 1 },
    { id: 'tool-1', type: 'Matériel', name: 'Pinceau fin liner', quantity: 1 },
  ]);

  assert.equal(result.owned.length, 0);
  assert.equal(result.alternatives.length,1);
  assert.deepEqual(result.techniqueChecks, [{ name: 'Pinceau fin', available: false }]);
});

test('rich sharing has independent explicit choices for notes and images',()=>{
 const source={title:'Projet',notes:'SECRET',photoSources:[{src:'data:image/png;base64,YWJj'}],palette:[],nails:[]};
 assert.equal(shareSnapshot(source).notes,'');assert.deepEqual(shareSnapshot(source).images,[]);
 assert.equal(shareSnapshot(source,'inspiration',{includeNotes:true}).notes,'SECRET');
 assert.deepEqual(shareSnapshot(source,'inspiration',{includeNotes:true}).images,[]);
 const photos=shareSnapshot(source,'inspiration',{includeImages:true});assert.equal(photos.notes,'');assert.equal(photos.images.length,1);
});
test('PO comparison never equates color similarity with product identity',()=>{
 const rows=[{type:'Vernis',name:'Exact',brand:'Brand',collection:'Classic',reference:'42',color:'#aa4488',quantity:1},{type:'Vernis',name:'Close',color:'#aa4488',quantity:1}];
 const s={products:[{brand:'Brand',collection:'Classic',reference:'42',name:'Exact',color:'#aa4488'},{name:'Generic',color:'#aa4488'},{brand:'Other',reference:'99',name:'Missing',color:'#00ff00'},{name:'Unknown'}]};
 const c=comparePoShare(s,rows);assert.equal(c.available.length,1);assert.equal(c.alternatives.length,1);assert.equal(c.missing.length,1);assert.equal(c.verify.length,1);
 const absent=comparePoShare({products:[s.products[0]]},rows.map(p=>({...p,quantity:0})));assert.equal(absent.available.length,0);
});

test('sharing does not serialize arbitrary private keys inside the preview',()=>{
 const s=shareSnapshot({nails:[{color:'#aabbcc',notes:'SECRET',photo:'SECRET',decoration:{motif:'star',color:'#aaaaaa',note:'SECRET'}}],palette:[],notes:'SECRET'});
 assert.equal(JSON.stringify(s).includes('SECRET'),false);
});
