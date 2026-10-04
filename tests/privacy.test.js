import test from 'node:test';
import assert from 'node:assert/strict';
import { createAuthService } from '../src/cloud/auth.js';
import { DENIED, TERMS_VERSION, PRIVACY_VERSION, signupConsent, normalizeChoices, permissions, advertisingContext, availableChoices, readGuestConsent } from '../src/privacy/policy.js';
import { clearAccountCache, privacyService } from '../src/privacy/service.js';
const enabled={analytics:true,ads:true,personalizedAds:true};
const yes={privacy_version:PRIVACY_VERSION,analytics_consent:true,ads_consent:true,personalized_ads_consent:true};
test('signup rejects absent or non-boolean terms before making any Auth call',()=>{
 let calls=0;const auth=createAuthService({auth:{signUp(){calls++;}}},'https://example.test');
 for(const acceptance of [undefined,false,'true',1])assert.throws(()=>auth.signUp('test@example.test','password',acceptance));
 assert.equal(calls,0);
 assert.deepEqual(signupConsent(true,yes),{adult_confirmed:true,terms_accepted:true,terms_version:TERMS_VERSION,privacy_version:PRIVACY_VERSION,analytics_consent:true,ads_consent:false,personalized_ads_consent:false});
