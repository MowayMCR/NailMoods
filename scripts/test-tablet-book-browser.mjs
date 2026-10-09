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
await import('/src/style.css');await import('/src/design-system.css');await import('/src/design/da06.css');await import('/src/design/atelier.css');
const h=React.createElement;
const entries=Array.from({length:5},(_,i)=>({id:'pose-'+i,kind:'journal',title:'Mon souvenir floral '+i,date:'2026-10-09',...(i===0?{scrapbook:{version:1,background:'soft-0',nodes:[{id:'photo',type:'photo',ref:'pose-0',frame:'classic',x:50,y:40,w:65,rotate:0}]}}:{})}));
const props={entries,renderVisual:()=>h('div',{className:'journalVisual compact'},h('img',{src:'/atelier/pose-book-v1/cover.webp',alt:'Souvenir de test'})),onCompose:()=>{}};
createRoot(document.getElementById('root')).render(h('div',{className:'app'},h('main',{},h('section',{className:'collectionExperience'},h(PoseBook,props)))));
</script>`);
await server.listen();
const browser=await chromium.launch({args:['--no-sandbox']});
try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
 for(const [width,height] of [[390,844],[768,1024],[1024,1366],[1366,1024]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:4199/tablet-book-fixture.html');
  const cover=page.getByRole('button',{name:'Ouvrir Mon livre de poses'});await cover.waitFor();await cover.click();
  await page.locator('.nmBookSpread').waitFor();await page.waitForTimeout(100);
  const geometry=await page.evaluate(()=>{
   const book=document.querySelector('.nmPoseBook').getBoundingClientRect(),spread=document.querySelector('.nmBookSpread').getBoundingClientRect(),canvas=document.querySelector('.nmScrapCanvas').getBoundingClientRect(),wide=document.querySelector('.nmBookSpread').classList.contains('wide');
   return {bookWidth:book.width,spreadWidth:spread.width,ratio:spread.width/spread.height,wide,canvasWidth:canvas.width,canvasHeight:canvas.height,canvasInside:canvas.top>=spread.top&&canvas.bottom<=spread.bottom+1,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.equal(geometry.overflow,false);assert.equal(geometry.wide,geometry.bookWidth>=680);
  assert.ok(Math.abs(geometry.ratio-(geometry.wide?1500/938:750/938))<.01);
  assert.ok(geometry.canvasWidth>100&&geometry.canvasHeight>100);assert.equal(geometry.canvasInside,true);
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
