// Local UI fixture only: no Supabase/OpenAI calls, no spend.
import fs from 'node:fs';import assert from 'node:assert/strict';import {createServer} from 'vite';import {chromium} from 'playwright';
const fixture='assistant-fixture.html',out='docs/nailmoods-ai/evidence/da';fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(fixture,'<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/tests/visual/assistant.jsx"></script></html>');
const server=await createServer({server:{host:'127.0.0.1',port:4197}});await server.listen();const browser=await chromium.launch({args:['--no-sandbox']});const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 for(const mood of ['soft-glam','dark-feminine','cottagecore','pop-pastel']){
  await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:4197/'+fixture+'?mood='+mood);await page.getByRole('button',{name:'Créer ma pose',exact:true}).waitFor();
  assert.equal(await page.locator('.nmAISheet select').count(),0);
  assert.equal(await page.locator('.nmAISheet').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);
  const size=await page.getByLabel('Utiliser uniquement mes vernis').evaluate(el=>({w:el.getBoundingClientRect().width,h:el.getBoundingClientRect().height}));assert.equal(size.w,20);assert.equal(size.h,20);
  assert.equal(await page.getByText('Solde :',{exact:false}).count(),0);assert.equal(await page.getByText('Version de test :',{exact:false}).count(),0);
  assert.equal(await page.getByRole('button',{name:'Créer ma pose',exact:true}).isDisabled(),true);
  await page.screenshot({path:out+'/'+mood+'-mobile.png',fullPage:true});
 }
 await page.getByRole('button',{name:'Les tendances',exact:true}).click();await page.getByRole('button',{name:'Trouver mon inspiration',exact:true}).waitFor();
 await page.getByRole('button',{name:'Avec une photo',exact:true}).click();await page.getByText('Ajouter ma photo',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'M’inspirer de ma photo',exact:true}).isDisabled(),true);
 await page.getByRole('button',{name:'Créer une pose',exact:true}).click();await page.getByRole('button',{name:'Une French léopard dorée',exact:false}).click();await page.getByLabel('J’autorise l’envoi de cette demande à l’IA.').check();await page.getByRole('button',{name:'Créer ma pose',exact:true}).click();await page.getByRole('button',{name:'Personnaliser ma pose',exact:true}).waitFor();
 const calls=await page.evaluate(()=>window.fixtureCalls.filter(c=>!c.action));assert.equal(calls.length,1);assert.equal(calls[0].operation,'conversation');assert.equal(calls[0].consent,true);
 await page.getByRole('button',{name:'En dessin',exact:false}).click();await page.getByRole('button',{name:'Créer le dessin',exact:true}).waitFor();assert.equal(await page.getByLabel('J’autorise l’envoi de cette demande à l’IA.').isChecked(),false);
 assert.equal(await page.evaluate(()=>window.fixtureCalls.filter(c=>!c.action).length),1);
 await page.screenshot({path:out+'/pose-actions-mobile.png',fullPage:true});
 await page.setViewportSize({width:1024,height:1366});await page.goto('http://127.0.0.1:4197/'+fixture+'?mood=cottagecore');await page.getByRole('button',{name:'Créer ma pose',exact:true}).waitFor();assert.equal(await page.locator('.nmAISheet').evaluate(el=>el.scrollWidth>el.clientWidth+1),false);assert.ok(await page.locator('.nmAISheet').evaluate(el=>el.getBoundingClientRect().width)>850);await page.screenshot({path:out+'/cottagecore-tablet.png',fullPage:true});
 await page.locator('.nmAIAdmin summary').click();await page.getByRole('button',{name:'Mettre l’IA en pause',exact:true}).click();await page.getByRole('button',{name:'Réactiver mon essai IA',exact:true}).waitFor();assert.ok(await page.getByRole('status').innerText().then(t=>t.includes('en pause')));
 assert.deepEqual(errors,[]);console.log('PASS: 4 DA, mobile/tablet, compact controls, consent, no automatic rendering, server pause.');
}finally{await browser.close();await server.close();fs.rmSync(fixture,{force:true});}
