import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4178'],{stdio:'ignore'});
const browser=await chromium.launch({...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
try{
 await new Promise(r=>setTimeout(r,1200));
 for(const width of [390,1024]){
  const context=await browser.newContext({viewport:{width,height:width===390?844:1366},isMobile:true,hasTouch:true});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{if(localStorage.getItem('desk-fixture'))return;localStorage.setItem('desk-fixture','1');localStorage.setItem('nm-collection-view',JSON.stringify('desk'));localStorage.setItem('nm-profile',JSON.stringify({guide_completed:true,onboarding_completed:true}));localStorage.setItem('nm-collection-v2',JSON.stringify([{id:'lamp',name:'Lampe UV / LED',type:'Matériel',equipmentSlug:'lampe-uv-led',quantity:1},{id:'file',name:'Lime à ongles',type:'Matériel',equipmentSlug:'lime-ongles',quantity:1},{id:'brush',name:'Pinceau liner',type:'Matériel',equipmentSlug:'pinceau-liner',quantity:1},...Array.from({length:3},(_,i)=>({id:'polish'+i,name:'Teinte '+i,type:'Vernis',quantity:1}))]));});
  await page.goto('http://127.0.0.1:4178/#collection');await page.locator('.nmDesk').waitFor();const cdp=await context.newCDPSession(page);
  const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'||type==='touchCancel'?[]:[{x,y}]});
  const start=async(asset)=>{const o=page.locator(`[data-tool="${asset}"]`);await o.scrollIntoViewIfNeeded();const b=await o.boundingBox();const p={x:b.x+b.width/2,y:b.y+b.height/2};await touch('touchStart',p.x,p.y);return p;};
  // The user may start moving immediately, without waiting for a long press.
  let p=await start('lime-ongles');await touch('touchMove',p.x+35,p.y+25);await touch('touchEnd');await page.waitForTimeout(100);
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('nm-desk-v1')).positions.file);assert.ok(saved);assert.equal(await page.getByRole('dialog').count(),0);
  await page.reload();await page.locator('.nmDesk').waitFor();assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('nm-desk-v1')).positions.file),saved);
  // Cancellation must not leave the editor or pointer capture stuck.
  p=await start('lime-ongles');await touch('touchMove',p.x+20,p.y+15);await touch('touchCancel');await page.waitForTimeout(750);assert.equal(await page.locator('.nmDeskDragGhost').count(),0);
  await page.locator('[data-tool="lampe-uv-led"]').tap();await page.getByRole('heading',{name:'À quoi ça sert ?'}).waitFor();await page.getByRole('button',{name:'Fermer',exact:true}).click();await page.waitForTimeout(150);
  const drop=async(asset)=>{let p=await start(asset);await touch('touchMove',p.x+10,p.y+10);await page.locator('.nmDeskTrash').waitFor();const r=await page.locator('.nmDeskTrash').boundingBox();await touch('touchMove',r.x+r.width/2,r.y+r.height/2);await touch('touchEnd');await page.waitForTimeout(100);};
  const lampBefore=await page.locator('[data-tool="lampe-uv-led"]').boundingBox();
  await drop('lime-ongles');assert.equal(await page.locator('[data-tool="lime-ongles"]').count(),0);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nm-collection-v2')).filter(p=>p.id==='file').length),1);
  const lampAfter=await page.locator('[data-tool="lampe-uv-led"]').boundingBox();assert.equal(lampAfter.x,lampBefore.x);assert.equal(lampAfter.y,lampBefore.y);
  await page.getByRole('button',{name:'Annuler',exact:true}).click();assert.equal(await page.locator('[data-tool="lime-ongles"]').count(),1);
  // Decoration removal preserves both the collection and the earned reward.
  await drop('vase-rose');assert.equal(await page.locator('[data-tool="vase-rose"]').count(),0);assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('nm-desk-v1')).unlocked.includes('vase-rose')));
  await page.getByRole('button',{name:'Annuler',exact:true}).click();
  await page.getByRole('button',{name:'Déplacer les objets',exact:true}).click();await page.locator('[data-tool="lampe-uv-led"]').tap();await page.getByRole('button',{name:'Ranger l’objet sélectionné',exact:true}).click();assert.equal(await page.locator('[data-tool="lampe-uv-led"]').count(),0);
  await page.getByRole('button',{name:'Terminé',exact:true}).click();await page.getByRole('button',{name:'Annuler',exact:true}).click();
  await page.getByRole('button',{name:'Réglages du bureau',exact:true}).click();await page.getByLabel('Ranger mes pinceaux dans un pot').check();await page.getByRole('button',{name:'Fermer',exact:true}).click();await page.waitForTimeout(150);
  await drop('pot');assert.equal(await page.locator('[data-tool="pot"]').count(),0);assert.ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('nm-desk-v1')).hidden.includes('brush')));
  await page.reload();await page.locator('.nmDesk').waitFor();assert.equal(await page.locator('[data-tool="pot"]').count(),0);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('nm-collection-v2')).length),6);
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  console.log(`Desk touch drag, interruption, trash, undo and persistence passed at ${width}px`);await context.close();
 }
}finally{await browser.close();server.kill();}
