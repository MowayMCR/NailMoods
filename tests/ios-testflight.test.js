import test from 'node:test';
import assert from 'node:assert/strict';
import {mobileVersion} from '../scripts/mobile-version.mjs';
import {isGooglePlayAndroid,purchaseTier} from '../src/platform/googleBillingUnavailable.js';

test('Apple CI build number changes without altering the Android release',()=>{
  const env={NAILMOODS_IOS_BUILD_NUMBER:'10001'};
  assert.deepEqual(mobileVersion('ios',env),{version:'0.8.0',versionCode:10001});
  assert.deepEqual(mobileVersion('android',env),{version:'0.8.0',versionCode:9});
  for(const bad of ['0','01','-1','1.2','$(echo bad)','1000000000']) assert.throws(()=>mobileVersion('ios',{NAILMOODS_IOS_BUILD_NUMBER:bad}));
});
test('iOS Google billing stub denies purchases before touching a client',async()=>{
  assert.equal(isGooglePlayAndroid(),false);
  const client={functions:{invoke(){assert.fail('Google endpoint called on iOS');}}};
  await assert.rejects(purchaseTier(client,'plus'),/billing_not_available/);
});
