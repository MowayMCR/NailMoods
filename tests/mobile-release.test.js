import test from 'node:test';
import assert from 'node:assert/strict';
import {mobileFeatures} from '../scripts/mobile-features.mjs';
import {mobileVersion} from '../scripts/mobile-version.mjs';
import {resolveConfig} from 'vite';
for(const environment of ['production','recette']){
 test('pose cycle ships on '+environment+' with an explicit rollback switch',()=>{
  assert.equal(mobileFeatures(environment,{}).poseCycle,true);
  assert.equal(mobileFeatures(environment,{VITE_POSE_CYCLE_ENABLED:'false'}).poseCycle,false);
  assert.throws(()=>mobileFeatures(environment,{VITE_POSE_CYCLE_ENABLED:'yes'}));
 });
 test('actual mobile Vite config honors pose flag in '+environment,async()=>{
  const previous={...process.env};
  try {
   process.env.NAILMOODS_MOBILE_ENV=environment;
   for(const flag of ['true','false']){
    process.env.VITE_POSE_CYCLE_ENABLED=flag;
    const config=await resolveConfig({configFile:'vite.mobile.config.js',logLevel:'silent'},'build');
    assert.equal(config.define['import.meta.env.VITE_POSE_CYCLE_ENABLED'],JSON.stringify(flag));
    assert.equal(config.define['import.meta.env.VITE_DEPLOYMENT_ENV'],JSON.stringify(environment));
    assert.equal(config.define['import.meta.env.VITE_NATIVE_BUILD'],'true');
   }
  }finally{process.env=previous;}
 });
}
test('both stores carry the same approved common version',()=>{
 assert.deepEqual(mobileVersion('ios'),mobileVersion('android'));
 assert.ok(mobileVersion().versionCode>8);
});

test('imports disambiguate component/model names on case-insensitive macOS',async()=>{
 const {readdirSync,readFileSync}=await import('node:fs');
 const {resolve,dirname,extname}=await import('node:path');
 const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(resolve(dir,e.name)):[resolve(dir,e.name)]);
 const files=walk('src').filter(p=>/\.[jt]sx?$/.test(p)),stems=new Map();
 for(const file of files){const key=file.slice(0,-extname(file).length).toLowerCase();stems.set(key,(stems.get(key)||0)+1);}
 for(const file of files){
  for(const [,specifier]of readFileSync(file,'utf8').matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g)){
   if(!extname(specifier))assert.ok((stems.get(resolve(dirname(file),specifier).toLowerCase())||0)<2,`Ambiguous macOS import in ${file}: ${specifier}`);
  }
 }
});
