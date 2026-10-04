// One-time reviewed UI migration. Do not run against rendering/finish/color assets.
import fs from 'node:fs';import path from 'node:path';import postcss from 'postcss';
const excluded=new Set(['finish.css','polishPalette.css','illustrated-icons.css']);
const skip=/nail(?!moods)|bottle|swatch|finish|mockup|finger|preview|paletteDot|colorSample|colour|texture|foil|shimmer|chrome|glitter/i;
const report=[];
function walk(dir){for(const n of fs.readdirSync(dir)){const f=path.join(dir,n);if(fs.statSync(f).isDirectory())walk(f);else if(n.endsWith('.css')&&!excluded.has(n)&&!f.includes('/design/')){let count=0;const root=postcss.parse(fs.readFileSync(f,'utf8'));root.walkDecls(d=>{if(d.parent.type!=='rule'||skip.test(d.parent.selector)||d.prop.startsWith('--')||!/(color|background|border|shadow|fill|stroke|outline)/.test(d.prop))return;
const original=d.value;
d.value=d.value.replace(/#[\da-f]{3,8}\b|\bwhite\b|\bblack\b/gi,raw=>{let h=raw.toLowerCase()==='white'?'ffffff':raw.toLowerCase()==='black'?'000000':raw.slice(1);if(h.length===3||h.length===4)h=[...h].map(c=>c+c).join('');if(![6,8].includes(h.length))return raw;const [r,g,b]=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)),light=(r*.2126+g*.7152+b*.0722)/255,alpha=h.length===8?parseInt(h.slice(6),16)/255:1;let token;
if(/shadow/.test(d.prop))token='overlay';else if(/border|outline/.test(d.prop))token='borderDefault';else if(d.prop==='color'||d.prop==='fill'||d.prop==='stroke'){token=light>.88?'textOnAccent':light>.36?'textSecondary':'textPrimary';if(r>g*1.8&&r>b*1.3)token='error';}
else {token=alpha<.8&&light<.3?'overlay':light>.94?'surfacePrimary':light>.78?'surfaceSecondary':light>.55?'accentSoft':'accentPrimary';}
count++;return alpha<1?`color-mix(in srgb,var(--${token}) ${Math.round(alpha*100)}%,transparent)`:`var(--${token})`;});});if(count){fs.writeFileSync(f,root.toString());report.push({file:f,replacements:count});}}}}
walk('src');fs.writeFileSync('docs/da06-20261004/css-migration.json',JSON.stringify(report,null,2));
