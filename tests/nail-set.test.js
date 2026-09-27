import test from 'node:test';
import assert from 'node:assert/strict';
import {initialNailSet,manualColors,setIdea,updateNail,suggestedTechnique} from '../src/nailSetModel.js';
import {readInspirations,saveProject,snapshotIdea,validIdea,nailDetails} from '../src/inspirations.js';

const items=[{id:'rose',type:'Vernis',name:'Rose',color:'#e5a4b5'},{id:'plum',type:'Vernis',name:'Prune',color:'#5d365e'}];

test('manual French has separate base and tip, changing the base preserves the chosen tip',()=>{
  const nails=initialNailSet(items);
  const french=updateNail(nails[3],{technique:'french'});
  assert.notEqual(french.color,french.accentColor);
  const selected=updateNail(french,{accentColor:'#ffffff',accentProductId:null});
  const changed=updateNail(selected,{color:'#54779d',productId:'blue'});
  assert.equal(changed.accentColor,'#ffffff');
  assert.equal(changed.drawing,'french');
  nails[3]=changed;
  const idea=setIdea(nails,{shape:'Amande',length:'Courte'},{duration:45,intent:'collection'});
  assert.equal(idea.nails.length,5);
  assert.equal(idea.nails[3].drawing,'french');
  assert.equal(idea.options.manualSet,true);
  assert.equal(idea.minutes,45);
  assert.ok(idea.palette.some(color=>color.id===idea.nails[3].accentProductId&&color.color==='#ffffff'));
  assert.ok(validIdea(snapshotIdea(idea)));
});

test('base and motif colors on all five nails survive saving and reloading a manual project',()=>{
  const techniques=['french','marble','leopard','blooming','tortoiseshell'];
  const nails=initialNailSet().map((nail,index)=>updateNail(nail,{color:`#${(0x125678+index*1500).toString(16)}`,productId:null,accentColor:`#${(0xefdcba-index*2000).toString(16)}`,accentProductId:null,technique:techniques[index]}));
  const idea=setIdea(nails);
  const library=saveProject({favorites:[],recent:[],projects:[],selected:null},idea);
  assert.equal(library.projects[0].palette.length,10);
  assert.ok(validIdea(library.projects[0]));
  const reloaded=readInspirations({getItem:()=>JSON.stringify(library)}).projects[0];
  assert.deepEqual(reloaded.nails,library.projects[0].nails);
  assert.equal(nailDetails(reloaded,1).find(item=>item.label==='Veines du marbré').item.color,nails[1].accentColor);
  assert.equal(nailDetails(reloaded,2).find(item=>item.label==='Taches du léopard').item.color,nails[2].accentColor);
});

test('inspiration-only composition remains valid after reopening, and unused decor is excluded',()=>{
  const idea=setIdea(initialNailSet());
  assert.ok(idea.nails.every(nail=>nail.accentProductId===null));
  assert.equal(idea.palette.length,5);
  assert.ok(idea.palette.every(color=>color.conceptual));
  assert.ok(validIdea(snapshotIdea(idea)));
});

test('manual palette deduplicates colors, keeps collection names and offers white and black',()=>{
  const choices=manualColors([...items,{id:'duplicate',type:'Vernis',name:'Another rose',color:'#E5A4B5'}]);
  assert.equal(choices.filter(color=>color.color.toLowerCase()==='#e5a4b5').length,1);
  assert.equal(choices.find(color=>color.productId==='rose').name,'Rose');
  assert.ok(choices.some(color=>color.color==='#ffffff'));
  assert.ok(choices.some(color=>color.color==='#252326'));
});

test('suggested techniques are canonical and legacy identical colors gain contrast on selection',()=>{
  assert.equal(suggestedTechnique({techniques:['Marbré']}),'marble');
  const nail=updateNail({color:'#54779d',accentColor:'#54779d'},{technique:'marble'});
  assert.notEqual(nail.accentColor,nail.color);
  assert.equal(nail.drawing,null);
});
