import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const environment = process.argv[2];
if (!['production', 'recette'].includes(environment)) throw new Error('Usage: node scripts/build-mobile.mjs production|recette');
const env = {...process.env, NAILMOODS_MOBILE_ENV: environment};
for (const args of [['scripts/prepare-recognition.mjs'], ['node_modules/vite/bin/vite.js', 'build', '--config', 'vite.mobile.config.js']]) {
  const result = spawnSync(process.execPath, args, {env, stdio:'inherit'});
  if (result.status !== 0) process.exit(result.status || 1);
}
writeFileSync('dist-mobile/mobile-build.json', JSON.stringify({environment, version:'0.3.0-beta.1', versionCode:1, appId:environment==='production'?'com.nailmoods.app':'com.nailmoods.app.recette'}, null, 2));
