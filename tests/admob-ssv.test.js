import test from 'node:test';import assert from 'node:assert/strict';import {generateKeyPairSync,sign} from 'node:crypto';import {verifyAdmobCallback} from '../supabase/functions/_shared/admobSsv.mjs';
test('Reward verification rejects altered signature, unit, timestamp and repeated fields',async()=>{
 const {publicKey,privateKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'}),keys=[{keyId:9,pem:publicKey.export({type:'spki',format:'pem'}).toString()}];
 const now=Date.now(),nonce='10000000-0000-4000-8000-000000000001';
 const signed=`ad_unit=test-only-unit&custom_data=${nonce}&timestamp=${now}&transaction_id=transaction-1`;
 const signature=sign('sha256',Buffer.from(signed),privateKey).toString('base64url');const query=signed+'&signature='+signature+'&key_id=9';
 assert.deepEqual(await verifyAdmobCallback(query,keys,['test-only-unit'],now),{ticket:nonce,transactionId:'transaction-1',adUnit:'test-only-unit'});
 await assert.rejects(verifyAdmobCallback(query.replace('transaction-1','transaction-2'),keys,['test-only-unit'],now),/invalid_signature/);
 await assert.rejects(verifyAdmobCallback(query,keys,['another-unit'],now),/invalid_ad_unit/);
 await assert.rejects(verifyAdmobCallback(query,keys,['test-only-unit'],now+3600001),/expired_callback/);
 await assert.rejects(verifyAdmobCallback(query+'&custom_data='+nonce,keys,['test-only-unit'],now),/invalid_callback/);
 const unsigned=signed.replace('&custom_data='+nonce,'');
 const unsignedSignature=sign('sha256',Buffer.from(unsigned),privateKey).toString('base64url');
 await assert.rejects(verifyAdmobCallback(unsigned+'&signature='+unsignedSignature+'&key_id=9&custom_data='+nonce,keys,['test-only-unit'],now),/invalid_callback/);
});
