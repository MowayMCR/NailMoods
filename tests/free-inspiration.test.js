import test from 'node:test';
import assert from 'node:assert/strict';
import { generateInspirations } from '../src/freeInspiration.js';
import { snapshotIdea, readInspirations, productStatus } from '../src/inspirations.js';

test('Free: zero profile, colors, tools and stickers still generates and saves real style compositions', () => {
 const items = [], report = generateInspirations(items, {}, {intent:'inspire'}, 1);
 assert.equal(report.results.length,4);
 assert.equal(items.length,0);
 for(const idea of report.results) {
  assert.equal(idea.nails.length,5);
  assert.ok(idea.palette.every(p=>p.conceptual));
  assert.equal(productStatus(idea.palette[0],items).state,'conceptual');
  const saved=snapshotIdea(idea);
  assert.deepEqual(readInspirations({getItem:()=>JSON.stringify({favorites:[saved]})}).favorites[0].nails,JSON.parse(JSON.stringify(idea.nails)));
 }
});
test('Free: personal semi-permanent shades require no recorded lamp to inspire, but lamp is necessary to realize', () => {
 const items=[{id:'own',name:'Mon cassis',type:'Semi-permanent',shade:'#812345',color:'#000000',usage:'Couleur seule'}];
 const before=JSON.stringify(items);
 const report=generateInspirations(items,{}, {intent:'collection'});
 assert.ok(report.results.length);
 for(const idea of report.results){
  assert.ok(idea.nails.every(n=>n.color==='#812345'));
  assert.ok(idea.palette.every(p=>p.id==='own'&&!p.conceptual));
  assert.ok(idea.requirements.some(r=>r.required&&/Lampe/.test(r.name)));
  assert.equal(idea.resources.length,0);
 }
 assert.equal(JSON.stringify(items),before);
});
test('Free: stale stickers and impossible color counts get an explicit alternative, never an access gate',()=>{
 const items=[{id:'p',name:'Rose',type:'Vernis',color:'#cc8899',usage:'Couleur seule'}];
 const report=generateInspirations(items,{}, {intent:'collection',polishCount:5,decorations:'with',decorationId:'missing'});
 assert.equal(report.adjusted,true);assert.ok(report.results.length);
 assert.ok(report.results.every(i=>i.palette.every(p=>p.id==='p')));
 assert.ok(generateInspirations([],{}, {intent:'collection'}).results.length);
});
