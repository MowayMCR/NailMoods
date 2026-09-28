import test from 'node:test';
import assert from 'node:assert/strict';
import {generateInspirations} from '../src/freeInspiration.js';
import {defaultProfile} from '../src/profileOptions.js';
import {profileDefaults} from '../src/creationEngine.js';
import {readCreationState,CREATION_KEY} from '../src/creationState.js';

const colors=[{id:'owned',name:'Cassis',type:'Vernis',color:'#813c60',usage:'Couleur seule',finish:'Brillant',quantity:1}];
for(const items of [[],colors]) for(const techniques of [['French'],['French','Aura']]) {
  test(`incompatible beginner selection is recoverable (${items.length} products, ${techniques.join('+')})`,()=>{
    const options={...profileDefaults(defaultProfile),level:0,intent:items.length?'collection':'inspire',techniques};
    const before=JSON.stringify(options);
    const report=generateInspirations(items,defaultProfile,options,1,4);
    assert.deepEqual(report.results,[]);
    assert.match(report.unavailable,/autre niveau|autre technique/);
    assert.equal(JSON.stringify(options),before);
    const storage={getItem:key=>key===CREATION_KEY?JSON.stringify({options,generated:true,seed:1}):null};
    const restored=readCreationState(storage,defaultProfile);
    assert.deepEqual(restored.options.techniques,techniques);
    assert.doesNotThrow(()=>generateInspirations(items,defaultProfile,restored.options,restored.seed));
    const recovered=generateInspirations(items,defaultProfile,{...restored.options,techniques:[]},1);
    assert.ok(recovered.results.length>0);
  });
}
test('free default and compatible French still generate after an impossible selection',()=>{
  assert.ok(generateInspirations([],defaultProfile,{...profileDefaults(defaultProfile),techniques:[]}).results.length);
  assert.ok(generateInspirations([],defaultProfile,{...profileDefaults(defaultProfile),level:2,techniques:['French'],duration:90}).results.length);
});
