// Deterministic size export of the existing official symbol; no redesign.
import sharp from 'sharp';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
const output = process.argv[2];
if (!output) throw new Error('Usage: node scripts/export-play-icon.mjs /output/NailMoods-Play-512.png');
mkdirSync(dirname(resolve(output)),{recursive:true});
await sharp('public/nailmoods-symbol.png')
  .resize(384,384,{fit:'contain',background:'#fffaf7'})
  .extend({top:64,bottom:64,left:64,right:64,background:'#fffaf7'})
  .flatten({background:'#fffaf7'}).ensureAlpha().png().toFile(output);
