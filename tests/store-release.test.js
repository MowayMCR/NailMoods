import test from 'node:test';import assert from 'node:assert/strict';import {generateKeyPairSync} from 'node:crypto';
import {validateTrack,playRelease,uploadPlay} from '../scripts/ci/upload-play.mjs';import {commonFeatures} from '../scripts/common-features.mjs';import {mobileVersion} from '../scripts/mobile-version.mjs';
const sha='a'.repeat(40);
test('beta uploader rejects public tracks and forged source or build before network',async()=>{
 assert.throws(()=>validateTrack('production'),/Public release/);assert.throws(()=>playRelease({versionCode:1,sha:'prefix'+sha}),/Invalid provenance/);
 await assert.rejects(uploadPlay({track:'internal',sha,expectedBuild:0,fetchImpl:()=>{throw Error('Must not call network');}}),/Invalid provenance/);
 assert.equal(commonFeatures('production',{}).VITE_SESSION_SECURITY_ENABLED,'false');assert.equal(commonFeatures('production',{}).VITE_POSE_CYCLE_ENABLED,commonFeatures('recette',{}).VITE_POSE_CYCLE_ENABLED);
 assert.equal(mobileVersion('android',{NAILMOODS_ANDROID_BUILD_NUMBER:'20001'}).versionCode,20001);assert.throws(()=>mobileVersion('ios',{NAILMOODS_IOS_BUILD_NUMBER:'0'}));
});
test('publisher validates the signed bundle build and rolls back an edit on mismatch',async()=>{
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});const calls=[];let count=0;
 const fetchImpl=async(url,init)=>{calls.push({url,method:init.method});const data=count++===0?{access_token:'fake-token'}:count===2?{id:'edit'}:{versionCode:999};return Response.json(data);};
 await assert.rejects(uploadPlay({aab:Buffer.from('fixture'),credentials:{client_email:'test@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})},track:'internal',sha,expectedBuild:20001,fetchImpl}),/Bundle build differs/);
 assert.equal(calls.at(-1).method,'DELETE');assert.equal(calls.some(c=>c.url.includes('/tracks/')),false);
});
