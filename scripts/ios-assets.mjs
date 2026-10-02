import {mkdirSync,copyFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
mkdirSync('.mobile-assets',{recursive:true});copyFileSync('public/nailmoods-symbol.png','.mobile-assets/logo.png');
const r=spawnSync('npx',['--no-install','capacitor-assets','generate','--ios','--assetPath','.mobile-assets','--iconBackgroundColor','#fffaf7','--iconBackgroundColorDark','#fffaf7','--splashBackgroundColor','#fffaf7','--splashBackgroundColorDark','#fffaf7'],{stdio:'inherit'});process.exit(r.status||0);
