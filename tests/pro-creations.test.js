import test from 'node:test';
import assert from 'node:assert/strict';
import {creationPayload} from '../src/workspaces/proCreationsService.js';
import {addStroke,normaliseProNailDesign,strokePath} from '../src/workspaces/proNailEditorModel.js';

test('pro creation payload keeps creative taxonomy and only valid color roles',()=>{
  const payload=creationPayload({
    title:'  French florale  ', visibility:'connections', base:'#F4D8D0', primary:'#813C60', secondary:'not-a-color', accent:'#D7AE58',
    techniques:'French, Aura, French', effects:'Brillant', motifs:'Floral', styles:'Graphique', moods:'Audacieuse', tags:'Automne, bordeaux',
    recommendedFingers:['accent','ring','invalid'], recommendedNailCount:8, level:'avance'
  });
  assert.equal(payload.title,'French florale');
  assert.deepEqual(payload.color_roles,[{role:'base',color:'#f4d8d0'},{role:'principale',color:'#813c60'},{role:'accent',color:'#d7ae58'}]);
  assert.deepEqual(payload.techniques,['French','Aura']);
  assert.deepEqual(payload.styles,['Graphique']);
  assert.deepEqual(payload.moods,['Audacieuse']);
  assert.deepEqual(payload.recommended_fingers,['accent','ring']);
  assert.equal(payload.recommended_nail_count,5);
  assert.equal(payload.visibility,'connections');
  assert.equal(payload.level,'avance');
});

test('pro creation payload rejects unknown visibility and placement values',()=>{
  const payload=creationPayload({visibility:'all',recommendedFingers:['free','other'],recommendedNailCount:0});
  assert.equal(payload.visibility,'private');
  assert.deepEqual(payload.recommended_fingers,['free']);
  assert.equal(payload.recommended_nail_count,1);
});

test('mini editor design is bounded, persistent and undo-friendly',()=>{
  const first=addStroke({version:1,strokes:[]},{color:'#813c60',size:4,points:[{x:20,y:40},{x:50,y:80}]});
  const second=addStroke(first,{color:'#d7ae58',size:3,points:[{x:-5,y:180}]});
  assert.equal(first.strokes.length,1);
  assert.equal(second.strokes.length,2);
  assert.equal(strokePath(first.strokes[0]),'M 20 40 L 50 80');
  assert.deepEqual(second.strokes[1].points,[{x:0,y:160}]);
  assert.deepEqual(normaliseProNailDesign({strokes:[{color:'no',size:99,points:[{x:1,y:2}]}]}),{version:1,strokes:[{color:'#813c60',size:14,mode:'draw',points:[{x:1,y:2}]}]});
});
