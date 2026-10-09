import {createServer} from 'vite';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const out='tablet-evidence';fs.mkdirSync(out,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:4199}});
fs.writeFileSync('tablet-book-fixture.html',`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module">
import React from 'react';
import {createRoot} from 'react-dom/client';
import PoseBook from '/src/poseBook/PoseBook.jsx';
import ScrapEditor from '/src/poseBook/ScrapEditor.jsx';
import AtelierArt from '/src/design/AtelierArt.jsx';
await import('/src/style.css');await import('/src/design-system.css');await import('/src/design/da06.css');await import('/src/design/atelier.css');
const h=React.createElement;
const entries=Array.from({length:5},(_,i)=>({id:'pose-'+i,kind:'journal',title:'Mon souvenir floral '+i,date:'2026-10-09',...(i===0?{scrapbook:{version:1,background:'soft-0',nodes:[{id:'photo',type:'photo',ref:'pose-0',frame:'classic',x:50,y:40,w:65,rotate:0},{id:'tape',type:'tape',asset:'cottage-8',x:30,y:70,w:25,rotate:-10},{id:'date',type:'text',text:'9 octobre 2026',color:'ink',x:50,y:82,w:70,rotate:0}]}}:{})}));
const props={entries,renderVisual:()=>h('div',{className:'journalVisual compact'},h('img',{src:'/atelier/pose-book-v1/cover.webp',alt:'Souvenir de test'})),onCompose:()=>{}};
function Fixture(){const [data,setData]=React.useState(entries),[editing,setEditing]=React.useState(false);return h('div',{className:'app'},h('main',{},h('section',{className:'collectionExperience'},h(PoseBook,{...props,entries:data,onCompose:()=>setEditing(true)}),...['fil','scan','projects','po','connections'].map(source=>h(AtelierArt,{key:source,source,'data-testid':source})))),h('nav',{},...['Accueil','Fil','Créer','Collection','Mes poses'].map(t=>h('button',{key:t},t))),editing&&h(ScrapEditor,{entry:data[0],entries:data,renderVisual:props.renderVisual,onSave:design=>{setData(v=>v.map((e,i)=>i?e:{...e,scrapbook:design}));return {ok:true};},onClose:()=>setEditing(false)}));}
createRoot(document.getElementById('root')).render(h(Fixture));
</script>`);
await server.listen();
const browser=await chromium.launch({args:['--no-sandbox']});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 for(const [width,height] of [[390,844],[768,1024],[1024,1366],[1366,1024]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:4199/tablet-book-fixture.html');
  const cover=page.getByRole('button',{name:'Ouvrir Mon livre de poses'});await cover.waitFor();await cover.click();
  await page.locator('.nmBookSpread').waitFor();
  assert.equal(await page.locator('.nmBookSearch').count(),0);
  assert.equal(await page.locator('.nmBookGesture').count(),0);
  const edit=page.getByRole('button',{name:/Composer (cette page|la page :)/}).first();
  assert.equal((await edit.innerText()).trim(),'');
  await page.getByRole('button',{name:'Rechercher dans le livre',exact:true}).click();
  await page.getByRole('searchbox',{name:'Rechercher dans le livre'}).fill('aucun-resultat');
  await page.getByRole('heading',{name:'Aucune pose avec ces tags'}).waitFor();
  await page.getByRole('button',{name:'Voir toutes les poses'}).click();
  await page.getByRole('button',{name:'Rechercher dans le livre',exact:true}).click();
  assert.equal(await page.locator('.nmBookSearch').count(),0);
  const canvasColor=await page.locator('.nmScrapCanvas').evaluate(el=>getComputedStyle(el).backgroundColor);
  assert.equal(canvasColor,'rgba(0, 0, 0, 0)');
  const tape=await page.locator('.nmScrapNode.type-tape').evaluate(el=>{const r=el.getBoundingClientRect();return {aspect:getComputedStyle(el).aspectRatio,bg:getComputedStyle(el.querySelector('.nmScrapSprite')).backgroundImage};});
  assert.equal(tape.aspect,'4 / 1');assert.match(tape.bg,/scrapbook-v2\/cottage-8.svg/);
  for(const [mood,prefix] of [['soft-glam','soft'],['dark-feminine','dark'],['cottagecore','cottage'],['pop-pastel','pop']]){
   await page.evaluate(m=>{document.documentElement.dataset.mood=m;},mood);
   await page.waitForFunction(p=>document.querySelector('img.nmAtelierArt')?.src.endsWith('/'+p+'-fil.webp'),prefix);
   await page.waitForFunction(()=>Array.from(document.querySelectorAll('img.nmAtelierArt')).every(i=>i.complete&&i.naturalWidth>0));
  }
  await page.evaluate(()=>{document.documentElement.dataset.mood='soft-glam';});await page.waitForTimeout(100);
  const geometry=await page.evaluate(()=>{
   const book=document.querySelector('.nmPoseBook').getBoundingClientRect(),spread=document.querySelector('.nmBookSpread').getBoundingClientRect(),canvas=document.querySelector('.nmScrapCanvas').getBoundingClientRect(),wide=document.querySelector('.nmBookSpread').classList.contains('wide');
   return {bookWidth:book.width,spreadWidth:spread.width,ratio:spread.width/spread.height,wide,canvasWidth:canvas.width,canvasHeight:canvas.height,canvasInside:canvas.top>=spread.top&&canvas.bottom<=spread.bottom+1,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.equal(geometry.overflow,false);assert.equal(geometry.wide,geometry.bookWidth>=680);
  assert.ok(Math.abs(geometry.ratio-(geometry.wide?1500/938:750/938))<.01);
  assert.ok(geometry.canvasWidth>100&&geometry.canvasHeight>100);assert.equal(geometry.canvasInside,true);
  assert.ok(Math.abs(geometry.canvasWidth/geometry.canvasHeight-.75)<.005);
  const navWidth=await page.locator('.app>nav').evaluate(e=>e.getBoundingClientRect().width);assert.ok(Math.abs(navWidth-Math.min(width,1080))<2);
  await edit.click();await page.getByLabel('Page à composer', {exact:true}).waitFor();
  const photo=page.locator('.nmScrapEditor .nmScrapNode.type-photo').first();await photo.scrollIntoViewIfNeeded();const box=await photo.boundingBox();
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+15,box.y+box.height/2+20,{steps:8});await page.mouse.up();
  const measure=selector=>page.locator(selector).evaluate(c=>{const r=c.getBoundingClientRect();return {ratio:r.width/r.height,nodes:Array.from(c.querySelectorAll('.nmScrapNode')).map(n=>{const b=n.getBoundingClientRect(),t=n.querySelector('.nmScrapText');return {x:(b.x+b.width/2-r.x)/r.width,y:(b.y+b.height/2-r.y)/r.height,w:b.width/r.width,h:b.height/r.height,font:t?parseFloat(getComputedStyle(t).fontSize)/r.width:0};})};});
  const before=await measure('.nmScrapEditor .nmScrapCanvas');await page.getByRole('button',{name:'Terminer',exact:true}).click();await page.locator('.nmScrapEditor').waitFor({state:'hidden'});
  const after=await measure('.nmBookPage.customized .nmScrapCanvas');assert.ok(Math.abs(before.ratio-after.ratio)<.005);
  for(let i=0;i<before.nodes.length;i++)for(const k of ['x','y','w','h','font'])assert.ok(Math.abs(before.nodes[i][k]-after.nodes[i][k])<.008,'Saved layout changed '+k+' at '+width);
  console.log('PASS saved drag layout',width);
  await page.screenshot({path:out+'/book-'+width+'.png',fullPage:true});
  await page.getByRole('button',{name:'Retour à la couverture'}).first().click();await cover.waitFor();
  await cover.click();await page.getByRole('button',{name:'Page suivante',exact:true}).click();
  assert.match(await page.locator('.nmBookPagination [role=status]').innerText(),/Page 2/);
  await page.getByRole('button',{name:'Page précédente',exact:true}).click();
  await page.getByRole('button',{name:'Retour à la couverture'}).last().click();await cover.waitFor();
  console.log('PASS tablet book',width,JSON.stringify(geometry));
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();await server.close();fs.rmSync('tablet-book-fixture.html',{force:true});}
