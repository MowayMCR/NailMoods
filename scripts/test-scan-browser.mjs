import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import bwip from 'bwip-js';
const out=path.resolve(process.env.NAILMOODS_EVIDENCE_DIR||'docs/scan-correctif-20261003/evidence');fs.mkdirSync(out,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:4190}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.NAILMOODS_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
const report={scope:'Shared web UI, Chromium with mobile viewport. Actual local WASM barcode and Tesseract workers; synthetic labels/codes with officially verified identity data. No physical bottle, native camera or authenticated reconnection.',cases:[],errors:[]};
const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(15000);page.on('pageerror',e=>report.errors.push(e.message));
const check=async(name,run)=>{try{report.cases.push({name,result:'PASS',details:await run()});console.log('PASS',name);}catch(e){report.cases.push({name,result:'FAIL',error:e.message});console.log('FAIL',name,e.message);await page.screenshot({path:path.join(out,'scan-failure-'+report.cases.length+'.png')});process.exitCode=1;}};
const photo=async()=>Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=1000;c.height=720;const x=c.getContext('2d');x.fillStyle='#b5a088';x.fillRect(0,0,1000,720);x.fillStyle='white';x.fillRect(90,70,820,530);x.fillStyle='black';x.font='bold 55px Arial';x.fillText('KIKO MILANO',135,150);x.font='45px Arial';x.fillText('SMART FAST DRY',135,245);x.fillText('NAIL LACQUER',135,330);x.fillText('7 ml',135,425);return c.toDataURL().split(',')[1];}),'base64');
const code=()=>bwip.toBuffer({bcid:'ean13',text:'8025272911573',scale:3,height:22,includetext:true,padding:20,backgroundcolor:'FFFFFF'});
const scan=async buffer=>{await page.goto('http://127.0.0.1:4190/#scan');if(await page.getByRole('button',{name:'Scanner une autre couleur',exact:true}).count())await page.getByRole('button',{name:'Scanner une autre couleur',exact:true}).click();if(await page.getByRole('button',{name:'Reprendre la photo',exact:true}).count())await page.getByRole('button',{name:'Reprendre la photo',exact:true}).click();await page.getByLabel('Photo du vernis',{exact:true}).setInputFiles({name:'scan.png',mimeType:'image/png',buffer});};
try{
 await page.goto('http://127.0.0.1:4190');
 await check('Front label without shade: brand/range prefill, no automatic beige background or false missing-product claim',async()=>{
  await scan(await photo());await page.locator('.recognitionStatus h3').getByText('Référence à préciser',{exact:true}).waitFor({timeout:100000});
  assert.match(await page.locator('.recognitionStatus').innerText(),/Smart Fast Dry/);assert.match(await page.locator('.recognitionStatus').innerText(),/numéro de teinte/);
  assert.equal(await page.getByRole('button',{name:'Utiliser cette couleur',exact:true}).isEnabled(),false);assert.equal(await page.locator('.scanDetected small').innerText(),'');
  await page.locator('.recognitionStatus').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'scan-reference-needed.png')});return {backgroundSelected:false,frontOnly:true,uniqueShadeRequired:true};
 });
 await check('Visible shade entry 30 → correct Smart Cobalt → official color and fiche → Collection → reload',async()=>{
  await page.getByLabel('Numéro de teinte, référence ou EAN',{exact:true}).fill('30');await page.getByRole('heading',{name:'Produit à confirmer',exact:true}).waitFor();
  assert.equal(await page.locator('.scanDetected strong').innerText(),'Cobalt');assert.equal(await page.locator('.scanDetected small').innerText(),'#002c76');
  await page.getByRole('button',{name:'Compléter ou corriger la fiche',exact:true}).click();assert.equal(await page.getByLabel('Nom (facultatif)',{exact:true}).inputValue(),'Cobalt');assert.equal(await page.getByLabel('Gamme',{exact:true}).inputValue(),'Smart Fast Dry Nail Lacquer');assert.equal(await page.getByLabel('Référence',{exact:true}).inputValue(),'30');
  await page.locator('.scanDetected').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'scan-smart-found.png')});
  await page.getByRole('button',{name:'Ajouter ce produit à ma collection',exact:true}).click();await page.getByRole('button',{name:'Produit dans ma collection',exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Collection',exact:true}).click();const card=page.locator('.productCard').filter({hasText:'Cobalt'});assert.equal(await card.count(),1);await card.click();assert.equal(await page.getByLabel('Code couleur',{exact:true}).inputValue(),'#002c76');await page.getByRole('button',{name:'Fermer',exact:true}).click();return {product:'Smart 30 Cobalt',color:'#002c76',saved:true,reloaded:true};
 });
 await check('Actual WASM code decode → automatic fiche prefill before confirmation → no duplicate Collection',async()=>{
  await scan(await code());await page.locator('.recognitionStatus h3').getByText('Produit trouvé',{exact:true}).waitFor({timeout:60000});assert.equal(await page.locator('.scanDetected strong').innerText(),'Cobalt');assert.equal(await page.locator('.scanDetected small').innerText(),'#002c76');
  await page.getByRole('button',{name:'Ajouter ce produit à ma collection',exact:true}).click();await page.getByRole('button',{name:'Produit dans ma collection',exact:true}).waitFor();await page.getByRole('button',{name:'C’est bien celui-ci',exact:true}).click();await page.getByRole('button',{name:'Non, continuer',exact:true}).click();await page.getByRole('button',{name:'Créer mes idées',exact:true}).click();assert.ok(await page.locator('.scanIdea').count());
  await page.getByRole('button',{name:'Collection',exact:true}).click();assert.equal(await page.locator('.productCard').filter({hasText:'Cobalt'}).count(),1);return {ean:'8025272911573',color:'#002c76',generation:true,duplicates:0};
 });
 await check('Manual color remains first after a second label/code photograph',async()=>{
  await scan(await code());await page.locator('.scanDetected strong').getByText('Cobalt',{exact:true}).waitFor({timeout:60000});await page.getByRole('button',{name:'Compléter ou corriger la fiche',exact:true}).click();await page.getByLabel('Code couleur',{exact:true}).fill('#cc0099');assert.equal(await page.locator('.scanDetected small').innerText(),'#cc0099');
  await page.getByLabel('Photographier le dessous ou le dos',{exact:true}).setInputFiles({name:'label-code.png',mimeType:'image/png',buffer:await code()});await page.locator('.recognitionStatus h3').getByText('Produit trouvé',{exact:true}).waitFor({timeout:60000});assert.equal(await page.locator('.scanDetected small').innerText(),'#cc0099');
  await page.getByRole('button',{name:'C’est bien celui-ci',exact:true}).click();await page.getByRole('button',{name:'Non, continuer',exact:true}).click();await page.getByRole('button',{name:'Créer mes idées',exact:true}).click();const colors=await page.locator('.scanSelected i').evaluateAll(elements=>elements.map(e=>e.style.backgroundColor));assert.ok(colors.includes('rgb(204, 0, 153)'));return {manualColor:'#cc0099',secondReadRetained:true};
 });
 await check('Collection import uses same official KIKO identity and color selection',async()=>{
  await page.getByRole('button',{name:'Collection',exact:true}).click();await page.locator('.addProduct').click();await page.getByText('Autres façons d’ajouter',{exact:true}).click();await page.getByRole('button',{name:/Scanner le code-barres/i}).click();await page.getByLabel('Importer un code-barres',{exact:true}).setInputFiles({name:'kiko.png',mimeType:'image/png',buffer:await code()});await page.locator('.catalogMatches button').filter({hasText:'KIKO Milano — Cobalt'}).click();await page.getByRole('button',{name:'Utiliser ces informations',exact:true}).click();assert.equal(await page.getByLabel('Nom',{exact:true}).inputValue(),'Cobalt');assert.equal(await page.getByLabel('Code couleur',{exact:true}).inputValue(),'#002c76');await page.getByLabel('Code couleur',{exact:true}).fill('#214477');assert.match(await page.locator('.preciseColor .fieldHead').innerText(),/Personnalisée/);await page.getByRole('button',{name:'Fermer',exact:true}).click();return {sharedSelection:true,manualOverride:true};
 });
 assert.deepEqual(report.errors,[]);
}finally{fs.writeFileSync(path.join(out,'scan-browser.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
