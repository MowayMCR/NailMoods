import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const server=await createServer({server:{host:'127.0.0.1',port:4192}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.NAILMOODS_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try {
 for(const [name,category] of [['Acid Free Primer','Primer'],['Clear BIAB','Gel de construction']]){
  await page.goto('http://127.0.0.1:4192/#scan');
  if(await page.getByRole('button',{name:'Reprendre la photo',exact:true}).count())await page.getByRole('button',{name:'Reprendre la photo',exact:true}).click();
  await page.getByRole('button',{name:'Choisir une couleur sans photo',exact:true}).click();
  await page.getByLabel('Nom (facultatif)',{exact:true}).fill(name);
  assert.equal(await page.getByLabel('Catégorie',{exact:true}).inputValue(),category);
  assert.equal(await page.getByRole('button',{name:'Confirmer cette couleur',exact:true}).isEnabled(),false);
  await page.getByRole('button',{name:'Ajouter ce produit à ma collection',exact:true}).click();
  await page.getByRole('button',{name:'Produit dans ma collection',exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Collection',exact:true}).click();
  const card=page.locator('.productCard').filter({hasText:name});assert.equal(await card.count(),1);await card.click();
  assert.equal(await page.getByLabel('Catégorie de produit',{exact:true}).inputValue(),category);
  await page.getByRole('button',{name:'Fermer',exact:true}).click();
  console.log('PASS',name,'scan without color → collection → reload');
 }
 assert.deepEqual(errors,[]);
 await page.screenshot({path:'docs/beta7-20261003/evidence/pro-collection.png'});
}finally{await browser.close();await server.close();}
