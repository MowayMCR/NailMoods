import {readdirSync,readFileSync,existsSync} from 'node:fs';import {join,dirname,extname,basename} from 'node:path';
import test from 'node:test';import assert from 'node:assert/strict';import {generateKeyPairSync} from 'node:crypto';
import {validateTrack,playRelease,uploadPlay} from '../scripts/ci/upload-play.mjs';import {commonFeatures} from '../scripts/common-features.mjs';import {mobileVersion} from '../scripts/mobile-version.mjs';
const sha='a'.repeat(40);
test('beta uploader rejects public tracks and forged source or build before network',async()=>{
 assert.throws(()=>validateTrack('production'),/Public release/);assert.throws(()=>playRelease({versionCode:1,sha:'prefix'+sha}),/Invalid provenance/);
 await assert.rejects(uploadPlay({track:'internal',sha,expectedBuild:0,fetchImpl:()=>{throw Error('Must not call network');}}),/Invalid provenance/);
 // On case-insensitive macOS, extensionless JSX imports can resolve a lower-case data module.
 const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
 const files=walk('src');const components=new Set(files.filter(f=>f.endsWith('.jsx')&&files.some(g=>g.toLowerCase()===f.slice(0,-1).toLowerCase())).map(f=>basename(f,'.jsx')));
 for(const file of files.filter(f=>/\.(js|jsx)$/.test(f)))for(const m of readFileSync(file,'utf8').matchAll(/(?:from\s*|import\s*\()(['"])(\.[^'"]+)\1/g)){
  const target=join(dirname(file),m[2]);if(!extname(target)&&components.has(basename(target))&&existsSync(target+'.jsx'))assert.fail('Ambiguous macOS component import: '+file+' -> '+m[2]);
 }
 assert.equal(commonFeatures('production',{}).VITE_SESSION_SECURITY_ENABLED,'false');assert.equal(commonFeatures('production',{}).VITE_POSE_CYCLE_ENABLED,commonFeatures('recette',{}).VITE_POSE_CYCLE_ENABLED);
 assert.equal(mobileVersion('android',{NAILMOODS_ANDROID_BUILD_NUMBER:'20001'}).versionCode,20001);assert.throws(()=>mobileVersion('ios',{NAILMOODS_IOS_BUILD_NUMBER:'0'}));
});
test('publisher validates the signed bundle build and rolls back an edit on mismatch',async()=>{
 const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048});const calls=[];let count=0;
 const fetchImpl=async(url,init)=>{calls.push({url,method:init.method});const data=count++===0?{access_token:'fake-token'}:count===2?{id:'edit'}:{versionCode:999};return Response.json(data);};
 await assert.rejects(uploadPlay({aab:Buffer.from('fixture'),credentials:{client_email:'test@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})},track:'internal',sha,expectedBuild:20001,fetchImpl}),/Bundle build differs/);
 assert.equal(calls.at(-1).method,'DELETE');assert.equal(calls.some(c=>c.url.includes('/tracks/')),false);
});
