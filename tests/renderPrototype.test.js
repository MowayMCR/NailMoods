import {test} from 'node:test';
import assert from 'node:assert/strict';
import {surfaceColor,shapes,nailPath,rgb,techniques} from '../src/renderPrototype/material.js';
const sample=(technique,u,v,extra={})=>surfaceColor({base:'#703650',accent:'#e9c991',technique,u,v,...extra});
test('prototype French accents the free edge; reverse French accents the cuticle',()=>{
  assert.deepEqual(sample('french',.5,.06),rgb('#e9c991'));
  assert.deepEqual(sample('french',.5,.9),rgb('#703650'));
  assert.deepEqual(sample('reverse-french',.5,.06),rgb('#703650'));
  assert.deepEqual(sample('reverse-french',.5,.98),rgb('#e9c991'));
});
test('ordinary polish preserves the exact input pigment before lighting',()=>{
  assert.deepEqual(sample('gloss',.5,.5,{base:'#1257ac'}),[18,87,172]);
  assert.throws(()=>rgb('pink'));
});
test('magnetic beam moves with light angle and blooming diffuses across its boundary',()=>{
  assert.notDeepEqual(sample('cat-eye',.7,.7,{light:-1}),sample('cat-eye',.7,.7,{light:1}));
  const near=sample('blooming',.27,.28),far=sample('blooming',.49,.28);
  assert.ok(near[0]>far[0]);assert.ok(far[0]>rgb('#703650')[0]);
});
test('six silhouettes and every material produce finite colour samples',()=>{
  assert.equal(new Set(shapes.map(nailPath)).size,6);
  for(const [id] of techniques)for(const u of [.05,.5,.95])for(const v of [.05,.5,.95]){
    assert.ok(sample(id,u,v).every(n=>Number.isFinite(n)&&n>=0&&n<=255),id);
  }
});
