import {TERMS_VERSION,PRIVACY_VERSION} from '../src/privacy/policy.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { publicCloudConfig, authReturnUrl } from '../src/cloud/config.js';
import { createAuthService } from '../src/cloud/auth.js';
const page = 'https://mowaymcr.github.io/NailMoods/?old=1#journal/pose-1';
test('cloud config remains optional for guest builds and rejects secret keys', () => {
  assert.equal(publicCloudConfig({}), null);
  assert.throws(() => publicCloudConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co' }));
  assert.throws(() => publicCloudConfig({ VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_test' }));
  assert.throws(() => publicCloudConfig({ VITE_SUPABASE_URL: 'https://user:pass@example.com', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }));
});
test('auth return stays on Pages base path without carrying private routes or parameters', () => {
  assert.equal(authReturnUrl(page), 'https://mowaymcr.github.io/NailMoods/?auth=callback');
  assert.equal(authReturnUrl(page, true), 'https://mowaymcr.github.io/NailMoods/?auth=recovery');
});
test('signup delegates to auth without injecting privileges or duplicating backend records', async () => {
  let sent;
  const service = createAuthService({ auth: { signUp: async args => { sent=args; return {data:{session:null},error:null}; } } }, page);
  assert.deepEqual(await service.signUp(' a@example.test ', 'password', true, {}), {session:null});
  assert.deepEqual(sent, {email:'a@example.test',password:'password',options:{emailRedirectTo:authReturnUrl(page),data:{adult_confirmed:true,terms_accepted:true,terms_version:TERMS_VERSION,privacy_version:PRIVACY_VERSION,analytics_consent:false,ads_consent:false,personalized_ads_consent:false}}});
