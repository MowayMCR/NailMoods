import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {mobileVersion} from './mobile-version.mjs';
const [dir,environment]=process.argv.slice(2);
assert.ok(dir&&['production','recette'].includes(environment));
const meta=JSON.parse(readFileSync(dir+'/mobile-build.json','utf8'));
assert.equal(meta.environment,environment);
assert.equal(meta.version,mobileVersion(meta.platform).version);
assert.equal(meta.versionCode,mobileVersion(meta.platform).versionCode);
assert.equal(meta.features.poseCycle,true,'Release must include the approved pose cycle');
const js=readdirSync(dir+'/assets').filter(n=>n.endsWith('.js')).map(n=>readFileSync(dir+'/assets/'+n,'utf8')).join('\n');
for(const marker of ['Ma tenue','Planifier un moment','pose_projects'])assert.ok(js.includes(marker),'Missing embedded feature: '+marker);
if(meta.platform==='ios'){
  for(const marker of ['google-play-verify','ai-internal','nm_ai_history'])assert.ok(!js.includes(marker),'Forbidden Apple feature: '+marker);
  assert.ok(js.includes('NailMoodsStoreKit')&&js.includes('apple-verify'),'Apple billing missing');
}else assert.ok(js.includes('ai-internal')&&js.includes('google-play-verify'),'Android provider/internal tooling missing');
assert.ok(!js.includes('M19 80Q32 88 45 80'),'Old nail contour included');
console.log('PASS embedded mobile release: environment, version, pose cycle, features and corrected nail contour');
