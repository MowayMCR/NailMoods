import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const out='docs/da06-lot-a/evidence';fs.mkdirSync(out,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:4196}});await server.listen();
const browser=await chromium.launch({executablePath:'/tmp/nm-browser/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:390,height:900},deviceScaleFactor:2,reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const shades=[['Rose de contrôle','#bd7084','Rose'],['Sauge de contrôle','#829076','Vert'],['Nude de contrôle','#dfb5a0','Nude']];
const fixture={profile:{name:'Marie',styles:['Witchy','Cottagecore'],shape:'Amande',length:'Moyenne',level:'Intermédiaire',duration:'30–45 min',technique:'Vernis classique',visualMood:'soft-glam',onboarding_completed:true,guide_completed:true},items:shades.map(([name,color,family],i)=>({id:'local-review-'+i,name,brand:'Collection de démonstration',color,shade:color,colorSource:'manual',family,type:'Vernis',finish:'Brillant',fav:false}))};
await page.goto('http://127.0.0.1:4196');await page.locator('.smartHome').waitFor();await page.evaluate(f=>{localStorage.clear();localStorage.setItem('nm-profile',JSON.stringify(f.profile));localStorage.setItem('nm-collection-v2',JSON.stringify(f.items));},fixture);await page.reload();await page.locator('.smartHome').waitFor();await page.evaluate(()=>document.fonts.ready);
if(process.argv.includes('--baseline')){await page.screenshot({path:out+'/avant.png',fullPage:true});await browser.close();await server.close();process.exit();}
const results=[];let nailMarkup;let geometry;const backgrounds=[];
for(const mood of ['soft-glam','dark-feminine','cottagecore','pop-pastel']){
 await page.evaluate(m=>{const p=JSON.parse(localStorage.getItem('nm-profile'));p.visualMood=m;localStorage.setItem('nm-profile',JSON.stringify(p));},mood);await page.reload();await page.locator(`.app[data-mood="${mood}"] .smartHome`).waitFor();await page.evaluate(()=>document.fonts.ready);
 await page.screenshot({path:`${out}/premier-ecran-${mood}.png`});
 const fullHeight=await page.evaluate(()=>document.documentElement.scrollHeight);await page.setViewportSize({width:390,height:fullHeight});await page.screenshot({path:`${out}/accueil-${mood}.png`,fullPage:true});
 if(mood==='soft-glam'){await page.locator('.nmHomeBento').screenshot({path:out+'/zoom-bento.png'});await page.locator('.homeInspiration').screenshot({path:out+'/zoom-ongles.png'});}
 const colors=await page.locator('[data-product-hex]').evaluateAll(es=>es.map(e=>[e.dataset.productHex,getComputedStyle(e).backgroundColor]));assert.deepEqual(colors,shades.flatMap(([,hex])=>[[hex,'rgb('+[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)).join(', ')+')'],[hex,'rgb('+[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)).join(', ')+')']]));
 const box=await page.locator('.nmHomeBento').evaluate(e=>[e.offsetWidth,e.offsetHeight]);if(geometry)assert.deepEqual(box,geometry);geometry=box;backgrounds.push(await page.locator('.app').evaluate(e=>getComputedStyle(e).backgroundColor));
 const nails=await page.locator('.homeInspiration .nailPreview').evaluate(e=>[...e.querySelectorAll('svg>path')].map(n=>n.getAttribute('fill')));if(nailMarkup)assert.deepEqual(nails,nailMarkup);nailMarkup=nails;
 for(const width of [320,360,390,430]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${mood} overflow at ${width}`);const overflow=await page.locator('.nmHomeBento button').evaluateAll(es=>es.filter(e=>e.scrollWidth>e.clientWidth+1||e.scrollHeight>e.clientHeight+1).map(e=>e.className));if(overflow.length)console.log('overflow',mood,width,await page.locator('.nmUniverseCard').evaluate(e=>({w:e.clientWidth,sw:e.scrollWidth,h:e.clientHeight,sh:e.scrollHeight,children:[...e.children].map(c=>({class:c.className,x:c.getBoundingClientRect().x,w:c.getBoundingClientRect().width}))})));assert.deepEqual(overflow,[]);results.push({mood,width,status:'PASS'});if(mood==='soft-glam'){const height=await page.evaluate(()=>document.documentElement.scrollHeight);await page.setViewportSize({width,height});await page.screenshot({path:`${out}/accueil-${width}.png`,fullPage:true});}}
 await page.setViewportSize({width:390,height:900});
}
await page.setViewportSize({width:390,height:900});
for(const [selector,hash] of [['.nmUniverseCard','#profil/preferences'],['.nmPaletteCard','#creer'],['.nmTutorialCard','#tutoriel'],['.nmCollectionBento','#collection'],['.homeCompactIdea','#inspiration/'],['.nmHomeMood button','#profil/ambiance']]){
 await page.goto('http://127.0.0.1:4196/#accueil');await page.locator('.smartHome').waitFor();await page.locator(selector).click();await page.waitForFunction(prefix=>location.hash.startsWith(prefix),hash);results.push({action:selector,destination:hash,status:'PASS'});
}
await page.goto('http://127.0.0.1:4196/#accueil');await page.locator('.smartHome').waitFor();
await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('nm-profile'));p.styles=[];p.visualMood='soft-glam';localStorage.setItem('nm-profile',JSON.stringify(p));localStorage.setItem('nm-collection-v2','[]');});await page.reload();await page.locator('.nmUniverseEmpty').waitFor();assert.equal(await page.locator('.nmCollectionBento [data-product-hex]').count(),0);assert.equal(await page.locator('.nmUniverseArt [data-pictogram]').count(),0);assert.ok(await page.locator('.nmCollectionBento').innerText().then(s=>s.includes('Ajouter un produit')));results.push({case:'Empty universes and collection contain no invented data',status:'PASS'});
await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('nm-profile'));p.styles=['Goth romantique','Dark feminine','Cottagecore'];localStorage.setItem('nm-profile',JSON.stringify(p));});await page.reload();await page.setViewportSize({width:320,height:1300});await page.locator('.nmHomeBento').waitFor();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.locator('.nmHomeBento').screenshot({path:out+'/cas-univers-longs-collection-vide.png'});results.push({case:'Long universe labels, three selected universes, empty collection, 320px',status:'PASS'});
assert.equal(new Set(backgrounds).size,4);assert.deepEqual(errors,[]);fs.writeFileSync(out+'/tests.json',JSON.stringify({fixture:'Local demonstration collection; not Marie’s live account. Same data and product HEX in every mood.',results,errors},null,2));
await browser.close();await server.close();console.log('Captured all themes; responsive checks passed.');
