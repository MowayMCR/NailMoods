import {test} from 'node:test';
import assert from 'node:assert/strict';
import {rgb,tint,fingerColours,randomPoints,shapes,nailPath,presets,techniques} from '../src/renderPrototype/material.js';
test('pigments retain the exact user HEX; drawn tones stay in range',()=>{
 assert.deepEqual(rgb('#1257ac'),[18,87,172]);assert.throws(()=>rgb('pink'));
 assert.equal(tint('#1257ac','#fff6eb',0),'#1257ac');
 for(const amount of [-1,0,.5,1,2])assert.ok(/^#[0-9a-f]{6}$/.test(tint('#1257ac','#fff6eb',amount)));
});
test('alternating drawn nails swap base and accent without changing the palette',()=>{
 const s={base:'#1257ac',accent:'#efabcd',colors:['base','accent']};
 assert.deepEqual(fingerColours(s,0),{base:'#1257ac',accent:'#efabcd'});
 assert.deepEqual(fingerColours(s,1),{base:'#efabcd',accent:'#1257ac'});
 assert.deepEqual(fingerColours({...s,base:'#123456'},1),{base:'#efabcd',accent:'#123456'});
});
test('motifs remain stable when the palette changes and differ between fingers',()=>{
 assert.deepEqual(randomPoints(10,2),randomPoints(10,2));
 assert.notDeepEqual(randomPoints(10,2),randomPoints(10,3));
 assert.ok(randomPoints(170).every(p=>p.x>=17&&p.x<=83&&p.y>=17&&p.y<=162));
});
test('six distinct silhouettes and valid preset technique assignments',()=>{
 assert.equal(new Set(shapes.map(nailPath)).size,6);
 for(const preset of presets){assert.equal(preset.nails.length,5);assert.equal(preset.colors.length,5);assert.ok(preset.nails.every(id=>techniques.some(([key])=>id===key)));}
});
