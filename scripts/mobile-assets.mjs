import { mkdirSync,copyFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
mkdirSync('.mobile-assets',{recursive:true});
copyFileSync('public/nailmoods-symbol.png','.mobile-assets/logo.png');
const result=spawnSync('npx',['--no-install','capacitor-assets','generate','--android','--assetPath','.mobile-assets','--iconBackgroundColor','#fffaf7','--iconBackgroundColorDark','#fffaf7','--splashBackgroundColor','#fffaf7','--splashBackgroundColorDark','#fffaf7'],{stdio:'inherit'});
process.exit(result.status||0);
