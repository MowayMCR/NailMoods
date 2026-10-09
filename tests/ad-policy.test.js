import test from 'node:test';import assert from 'node:assert/strict';import {adAllowed,TEST_REWARDED_UNITS} from '../src/ads/policy.js';
const free={platform:'ios',rights:{effectiveTier:'free'},config:{enabled:true,testOnly:true},placement:'rewarded_opt_in',consent:true};
test('Only opt-in test ads on native Free; kill switch, consent and protected placements fail closed',()=>{
 assert.equal(adAllowed(free),true);assert.notEqual(TEST_REWARDED_UNITS.ios,TEST_REWARDED_UNITS.android);
 for(const effectiveTier of ['plus','pro',null])assert.equal(adAllowed({...free,rights:{effectiveTier}}),false);
 for(const placement of ['book','gallery','salon','editor','save','account','feed'])assert.equal(adAllowed({...free,placement}),false);
 assert.equal(adAllowed({...free,consent:false}),false);assert.equal(adAllowed({...free,config:{enabled:false,testOnly:true}}),false);assert.equal(adAllowed({...free,config:{enabled:true,testOnly:false}}),false);assert.equal(adAllowed({...free,rights:{effectiveTier:'free',instituteActive:true}}),false);assert.equal(adAllowed({...free,platform:'web'}),false);
});
