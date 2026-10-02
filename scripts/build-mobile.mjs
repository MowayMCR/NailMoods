import { spawnSync } from 'node:child_process';
import { writeFileSync, rmSync, readdirSync, readFileSync } from 'node:fs';
const environment = process.argv[2];
if (!['production', 'recette'].includes(environment)) throw new Error('Usage: node scripts/build-mobile.mjs production|recette');
const env = {...process.env, NAILMOODS_MOBILE_ENV: environment};
for (const args of [['scripts/prepare-recognition.mjs'], ['node_modules/vite/bin/vite.js', 'build', '--config', 'vite.mobile.config.js']]) {
  const result = spawnSync(process.execPath, args, {env, stdio:'inherit'});
  if (result.status !== 0) process.exit(result.status || 1);
}
writeFileSync('dist-mobile/mobile-build.json', JSON.stringify({environment, version:'0.3.0-beta.6', versionCode:6, appId:env.NAILMOODS_PLATFORM==='ios'&&env.NAILMOODS_IOS_BUNDLE_ID?env.NAILMOODS_IOS_BUNDLE_ID:environment==='production'?'com.nailmoods.app':'com.nailmoods.app.recette'}, null, 2));

// Historical texts remain on the public website; only active texts ship offline.
rmSync('dist-mobile/legal/archives', {recursive:true, force:true});
for (const name of ['confidentialite-0.7-beta.html','conditions-0.5-beta.html','confidentialite-0.6-beta.html','conditions-0.4-beta.html','confidentialite-0.5-beta.html','conditions-0.1-beta.html','confidentialite-0.1-beta.html','conditions-0.3-beta.html','confidentialite-0.4-beta.html','informations-0.3-beta.html']) {
  rmSync('dist-mobile/legal/'+name, {force:true});
}
for (const name of readdirSync('dist-mobile/legal')) {
  if (!name.endsWith('.html')) continue;
  const path = 'dist-mobile/legal/'+name;
  const html = readFileSync(path, 'utf8');
  let shipped = html.replaceAll('href="archives/', 'href="https://mowaymcr.github.io/NailMoods/legal/archives/');
  for (const archived of ['conditions-0.4-beta.html','confidentialite-0.6-beta.html']) {
    shipped = shipped.replaceAll('href="' + archived + '"', 'href="https://mowaymcr.github.io/NailMoods/legal/' + archived + '"');
  }
  writeFileSync(path, shipped);
}
