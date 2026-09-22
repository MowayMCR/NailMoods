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
  assert.deepEqual(await service.signUp(' a@example.test ', 'password', true, {}, '1990'), {session:null});
  assert.deepEqual(sent, {email:'a@example.test',password:'password',options:{emailRedirectTo:authReturnUrl(page),data:{birth_year:1990,terms_accepted:true,terms_version:'0.3-beta',privacy_version:'0.4-beta',analytics_consent:false,ads_consent:false,personalized_ads_consent:false}}});
});
test('recovery callback exchanges once per invocation and removes code from returned navigation', async () => {
  let calls = 0;
  const service = createAuthService({auth:{exchangeCodeForSession:async code=>{calls++;assert.equal(code,'temporary-code');return {data:{session:{user:{id:'a'}}},error:null};}}},page);
  assert.equal(await service.completeCallback(page),null);
  const result = await service.completeCallback('https://mowaymcr.github.io/NailMoods/?auth=recovery&code=temporary-code');
  assert.equal(result.recovery,true);
  assert.equal(result.cleanUrl,'https://mowaymcr.github.io/NailMoods/#profil');
  assert.equal(calls,1);
});
test('auth failures propagate, so UI cannot report failed logout or save as success', async () => {
  const error = new Error('network');
  const service = createAuthService({auth:{signOut:async()=>({error})}},page);
  await assert.rejects(service.signOut(),error);
});
