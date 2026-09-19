import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeHandle,handleError,suggestHandle,rankProfiles} from '../src/identity/handles.js';
test('handles normalize without mutating UUIDs or silently swallowing invalid characters',()=>{
 assert.equal(normalizeHandle(' @Marie.Nails '),'marie.nails');
 for(const value of ['a','a'.repeat(31),'marie nails','marie/nails','<script>','admin','SUPPORT','.marie','marie.'])assert.ok(handleError(value),value);
 for(const value of ['marie.nails','Marie_Nails','marie27'])assert.equal(handleError(value),'');
 assert.equal(suggestHandle('Éloïse Nails'),'eloise.nails');assert.equal(suggestHandle(''),'mon.nailmoods');
});
test('search ranking preserves opaque technical identities and prioritizes exact handles',()=>{
 const rows=[{id:'1',handle:'nails',display_name:'Marie'},{id:'2',handle:'marie.nails',display_name:'Studio'},{id:'3',handle:'marie',display_name:'Autre'},{id:'4',handle:'studio',display_name:'Atelier Marie'}];
 assert.deepEqual(rankProfiles(rows,'@marie').map(r=>r.id),['3','2','1','4']);assert.equal(rows[0].id,'1');
});
