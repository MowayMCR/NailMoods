import test from 'node:test';import assert from 'node:assert/strict';import {generateKeyPairSync,sign} from 'node:crypto';import {verifyAdmobCallback} from '../supabase/functions/_shared/admobSsv.mjs';
test('Reward verification rejects altered signature, unit, timestamp and repeated fields',async()=>{
 const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),keys=[{keyId:9,pem:publicKey.export({type:'spki',format:'pem'}).toString()}];
 const now=Date.now(),nonce='10000000-0000-4000-8000-000000000001';
 const signed=`ad_unit=ca-app-pub-3166441503282113/4704282245&custom_data=${nonce}&reward_amount=1&reward_item=test-credit&timestamp=${now}&transaction_id=transaction-1`;
 const signature=sign('sha256',Buffer.from(signed),privateKey).toString('base64url');const query=signed+'&signature='+signature+'&key_id=9';
 const numeric=signed.replace('ca-app-pub-3166441503282113/4704282245','4704282245');
 const numericQuery=numeric+'&signature='+sign('sha256',Buffer.from(numeric),privateKey).toString('base64url')+'&key_id=9';
 assert.equal((await verifyAdmobCallback(numericQuery,keys,['ca-app-pub-3166441503282113/4704282245'],now)).adUnit,'4704282245');
 for(const bad of [signed.replace('reward_amount=1','reward_amount=0'),signed+'&reward_item=twice',signed.replace('transaction-1','x'.repeat(201))]){
  const badQuery=bad+'&signature='+sign('sha256',Buffer.from(bad),privateKey).toString('base64url')+'&key_id=9';
  await assert.rejects(verifyAdmobCallback(badQuery,keys,['ca-app-pub-3166441503282113/4704282245'],now),/invalid_(callback|reward)/);
 }
 assert.deepEqual(await verifyAdmobCallback(query,keys,['ca-app-pub-3166441503282113/4704282245'],now),{ticket:nonce,transactionId:'transaction-1',adUnit:'ca-app-pub-3166441503282113/4704282245'});
 await assert.rejects(verifyAdmobCallback(query.replace('transaction-1','transaction-2'),keys,['ca-app-pub-3166441503282113/4704282245'],now),/invalid_signature/);
 await assert.rejects(verifyAdmobCallback(query,keys,['another-unit'],now),/invalid_ad_unit/);
 await assert.rejects(verifyAdmobCallback(query,keys,['ca-app-pub-3166441503282113/4704282245'],now+3600001),/expired_callback/);
 await assert.rejects(verifyAdmobCallback(query+'&custom_data='+nonce,keys,['ca-app-pub-3166441503282113/4704282245'],now),/invalid_callback/);
 const unsigned=signed.replace('&custom_data='+nonce,'');
 const unsignedSignature=sign('sha256',Buffer.from(unsigned),privateKey).toString('base64url');
 await assert.rejects(verifyAdmobCallback(unsigned+'&signature='+unsignedSignature+'&key_id=9&custom_data='+nonce,keys,['ca-app-pub-3166441503282113/4704282245'],now),/invalid_callback/);
});
