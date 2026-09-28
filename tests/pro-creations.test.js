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

test('five-nail drawings preserve shape, length, per-finger colors and strokes through the service payload',async()=>{
 const {editableProNailDesign,updateDesignNail,designStrokeCount,proNailGeometry}=await import('../src/workspaces/proNailEditorModel.js');
 let design=editableProNailDesign(null,{base:'#f4d8d0',shape:'Amande',length:'Courte'});
 design=addStroke(design,{color:'#813c60',size:4,points:[{x:20,y:40},{x:50,y:80}]},3);
 design=updateDesignNail(design,0,{base:'#ffffff'});
 design=addStroke(design,{color:'#252326',size:3,points:[{x:50,y:50}]},0);
 const payload=creationPayload({title:'Five nails',design});
 assert.equal(payload.design.shape,'Amande');assert.equal(payload.design.length,'Courte');assert.equal(payload.design.scope,'set');
 assert.equal(payload.design.nails[0].base,'#ffffff');assert.equal(payload.design.nails[3].strokes[0].color,'#813c60');assert.equal(designStrokeCount(payload.design),2);
 assert.deepEqual(normaliseProNailDesign(JSON.parse(JSON.stringify(payload.design))),payload.design);
 assert.notEqual(proNailGeometry('Amande','Courte').path,proNailGeometry('Carrée','Courte').path);
 assert.notEqual(proNailGeometry('Amande','Courte').transform,proNailGeometry('Amande','Longue').transform);
});

test('legacy drawings upgrade without losing any stroke or changing their original base',async()=>{
 const {editableProNailDesign,designStrokeCount}=await import('../src/workspaces/proNailEditorModel.js');
 const legacy={version:1,strokes:Array.from({length:24},(_,i)=>({color:'#813c60',size:4,points:[{x:20+i,y:40+i}],mode:'draw'}))};
 const upgraded=editableProNailDesign(legacy,{base:'#faceda',shape:'Stiletto',length:'XL'});
 assert.equal(upgraded.nails[3].base,'#faceda');assert.equal(upgraded.shape,'Ronde');assert.equal(upgraded.length,'Longue');
 assert.equal(designStrokeCount(upgraded),24);assert.deepEqual(upgraded.nails[3].strokes,legacy.strokes);assert.equal(legacy.version,1);
});

test('a detailed five-nail design stays below the production JSON size limit and keeps path endpoints',()=>{
 const stroke={color:'#813c60',size:14,mode:'draw',points:Array.from({length:240},(_,i)=>({x:99.999*i/239,y:159.999*i/239}))};
 const design=normaliseProNailDesign({version:2,shape:'Stiletto',length:'XL',scope:'set',nails:Array.from({length:5},()=>({base:'#ffffff',strokes:Array.from({length:80},()=>stroke)}))});
 assert.ok(Buffer.byteLength(JSON.stringify(design).replaceAll(',',', ').replaceAll(':',': '))<250000);
 for(const nail of design.nails){assert.equal(nail.strokes.length,80);for(const line of nail.strokes){assert.deepEqual(line.points[0],{x:0,y:0});assert.deepEqual(line.points.at(-1),{x:100,y:160});}}
});
