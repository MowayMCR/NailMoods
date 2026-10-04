import fs from 'node:fs';import {visualMoods,themeStyle} from '../src/design/themes.js';
const rules=mood=>Object.entries(themeStyle(mood)).map(([key,value])=>key+':'+value).join(';');
const css='/* Generated from src/design/themes.js. UI palettes only. */\n:root{'+rules(visualMoods[0])+'}\n'+visualMoods.map(m=>':root[data-mood="'+m.id+'"]{'+rules(m)+'}').join('\n');
const splash=fs.readFileSync(new URL('../src/design/brand-splash.css',import.meta.url),'utf8');
const identity=fs.readFileSync(new URL('../src/finish.css',import.meta.url),'utf8').match(/--nm-petal:.*?;/)?.[0]||'';
fs.writeFileSync(new URL('../public/boot.css',import.meta.url),css+'\n:root{'+identity+'}\nbody{margin:0;background:var(--backgroundPrimary);color:var(--textPrimary)}\n'+splash+'\n#nm-boot button{background:var(--accentPrimary);color:var(--textOnAccent);border:0;border-radius:14px;padding:14px 20px;min-height:44px;font:inherit}');
