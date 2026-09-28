import assert from 'node:assert/strict';
import test from 'node:test';
import { adaptedCreationColors, applyProCreationConstraint, proCreationTargets } from '../src/workspaces/proCreationGeneration.js';

const idea = { id: 'idea', title: 'Une pose', description: 'Description', reasons: [], techniques: [], options: {}, nails: Array.from({ length: 5 }, (_, index) => ({ color: '#d6a0b0', techniques: [], technique: null, drawing: null, index })) };
const creation = { id: 'creation-1', title: 'French féline', techniques: ['French', 'Léopard'], motifs: ['Félin'], recommended_fingers: ['index', 'ring'] };

test('Pro creation constraint keeps the generator composition and adds semantic constraints', () => {
    const [result] = applyProCreationConstraint([idea], { creation, mode: 'palette' });
    assert.equal(result.nails.length, 5);
    assert.equal(result.nails[1].drawing, 'french');
    assert.equal(result.nails[3].drawingTechnique, 'leopard');
    assert.equal(result.nails[0].technique, null);
    assert.deepEqual({ id: result.proCreation.id, title: result.proCreation.title, mode: result.proCreation.mode, placement: result.proCreation.placement }, { id: 'creation-1', title: 'French féline', mode: 'palette', placement: [1, 3] });
    assert.equal('design' in result, false);
});

test('Pro creation inspiration uses one restrained accent', () => {
  assert.deepEqual(proCreationTargets(creation, 'inspire'), [3]);
  assert.deepEqual(proCreationTargets({ recommended_fingers: ['accent'] }, 'placement'), [3]);
});

test('palette adaptation only maps existing generated palette colours', () => {
  const colors = adaptedCreationColors({ color_roles: [{ role: 'accent', color: '#111111' }] }, { palette: [{ color: '#d6a0b0' }, { color: '#68445e' }] }, 'palette');
  assert.deepEqual(colors, { base: '#d6a0b0', principale: '#d6a0b0', secondaire: '#68445e', accent: '#68445e' });
});

test('a saved freehand drawing is visible in the generated pose, recolored to actual palette products',async()=>{
 const {snapshotIdea,validIdea}=await import('../src/inspirations.js');
 const base={...idea,shape:'Ronde',length:'Courte',rank:2,minutes:45,resources:[],palette:[{id:'pink',name:'Rose',color:'#d6a0b0'},{id:'plum',name:'Prune',color:'#68445e'}],nails:idea.nails.map(n=>({...n,productId:'pink'}))};
 const source={...creation,design:{version:1,strokes:[{points:[{x:25,y:40},{x:60,y:80}],color:'#ffffff',size:4,mode:'draw'},{points:[{x:40,y:50}],color:'#f4d8d0',size:10,mode:'erase'}]},color_roles:[{role:'base',color:'#f4d8d0'}],recommended_fingers:['accent','index']};
 const before=JSON.stringify(source);
 const [result]=applyProCreationConstraint([base],{creation:source,mode:'palette'});
 assert.deepEqual(result.proCreation.placement,[1,3]);assert.equal(result.nails[3].proDesign.strokes[0].color,'#68445e');assert.equal(result.nails[3].proDesign.strokes[1].color,'#d6a0b0');
 assert.deepEqual(result.nails[3].proDesign.strokes[0].points,source.design.strokes[0].points);
 assert.equal(result.nails[0].proDesign,undefined);assert.equal(result.nails[3].accentProductId,'plum');
 assert.ok(validIdea(snapshotIdea(result)));assert.equal(JSON.stringify(source),before);
 const [original]=applyProCreationConstraint([base],{creation:source,mode:'reuse'});
 assert.equal(original.nails[3].color,'#f4d8d0');assert.equal(original.nails[3].proDesign.strokes[0].color,'#ffffff');assert.ok(original.palette.find(p=>p.color==='#ffffff').conceptual);assert.ok(validIdea(snapshotIdea(original)));
});

test('five-nail compositions keep each finger, geometry and drawing when reused',async()=>{
 const {editableProNailDesign,addStroke}=await import('../src/workspaces/proNailEditorModel.js');
 let design=editableProNailDesign(null,{shape:'Carrée',length:'XL'});
 for(let i=0;i<5;i++)design=addStroke(design,{color:'#813c60',size:4,points:[{x:20+i*10,y:50}]},i);
 const source={...creation,design};
 const base={...idea,palette:[{id:'pink',name:'Rose',color:'#d6a0b0'},{id:'plum',name:'Prune',color:'#68445e'}],options:{proCreation:{creation:source}},nails:idea.nails.map((n,index)=>({...n,productId:index%2?'plum':'pink',color:index%2?'#68445e':'#d6a0b0'}))};
 const [result]=applyProCreationConstraint([base],{creation:source,mode:'palette'});
 assert.equal(new Set(result.nails.map(nail=>nail.color)).size,1);
 assert.equal(result.shape,'Carrée');assert.equal(result.length,'XL');assert.equal(result.options.proCreation,undefined);
 for(let i=0;i<5;i++)assert.equal(result.nails[i].proDesign.strokes[0].points[0].x,20+i*10);
 assert.deepEqual(result.proCreation.placement,[0,1,2,3,4]);
});
