import test from 'node:test';
import assert from 'node:assert/strict';
import {initialNailSet,setIdea} from '../src/nailSetModel.js';

test('manual nail set starts harmonious and produces five explicit nails',()=>{
  const nails=initialNailSet([{id:'rose',type:'Vernis',name:'Rose',color:'#e5a4b5'},{id:'plum',type:'Vernis',name:'Prune',color:'#5d365e'}]);
  assert.equal(nails.length,5);
  const configured=nails.map((nail,index)=>({...nail,technique:index===3?'french':''}));
  const idea=setIdea(configured,{shape:'Amande',length:'Courte'},{duration:45,intent:'collection'});
  assert.equal(idea.nails.length,5);
  assert.equal(idea.nails[3].drawing,'french');
  assert.equal(idea.options.manualSet,true);
  assert.equal(idea.minutes,45);
  assert.ok(idea.palette.length<=2);
});
