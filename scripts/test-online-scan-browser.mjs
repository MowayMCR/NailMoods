import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const out=path.resolve('docs/scan-internet-20261003/evidence');fs.mkdirSync(out,{recursive:true});
const live=JSON.parse(fs.readFileSync(path.join(out,'live-recette.json'),'utf8'));
const result=live.results.find(x=>x.input?.reference==='153').result;
assert.equal(result.status,'found');
// Dependency injection is confined to this test Vite server. Production retains
// the real Auth gate and functions.invoke. API/Auth are verified separately live.
const server=await createServer({plugins:[{name:'online-test-transport',enforce:'pre',transform(code,id){if(id.endsWith('/src/productLookup.js'))return code.replace('let call=invoke;','let call=invoke || globalThis.__nmOnlineTestInvoke;');}}],server:{host:'127.0.0.1',port:4191}});await server.listen();
const browser=await chromium.launch({executablePath:process.env.NAILMOODS_BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
const page=await browser.newPage({viewport:{width:390,height:844}});page.setDefaultTimeout(15000);
const report={scope:'Actual shared app UI with controlled online transport replaying the live authenticated Recette KIKO response; one local record deliberately removed to exercise fallback. No native camera, device or real browser Auth claim.',cases:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));
await page.addInitScript(r=>{
 window.__nmOnlineTestCalls=[];window.__nmOnlineTestInvoke=async(name,options)=>{window.__nmOnlineTestCalls.push({name,body:options.body});await new Promise(resolve=>setTimeout(resolve,150));return {data:options.body.brand==='KIKO Milano'&&options.body.reference==='153'?r:{status:'not_found',candidates:[],message:'Aucune référence fiable trouvée en ligne.'}};};
},result);
await page.route('**/catalog-kiko-smart.json',async route=>{const response=await route.fetch();const data=await response.json();data.products=data.products.filter(p=>p.reference!=='153');data.count=data.products.length;await route.fulfill({json:data});});
const check=async(name,fn)=>{try{report.cases.push({name,result:'PASS',details:await fn()});console.log('PASS',name);}catch(e){report.cases.push({name,result:'FAIL',error:e.message});process.exitCode=1;await page.screenshot({path:path.join(out,'online-failure-'+report.cases.length+'.png')});console.log('FAIL',name,e.message);}};
try {
 await page.goto('http://127.0.0.1:4191/#scan');
 const photo=Buffer.from(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=900;c.height=650;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,900,650);x.fillStyle='black';x.font='bold 58px Arial';x.fillText('KIKO MILANO',80,130);x.font='48px Arial';x.fillText('SMART FAST DRY',80,250);x.fillText('NAIL LACQUER',80,365);x.fillText('7 ml',80,470);return c.toDataURL().split(',')[1];}),'base64');
 await page.getByLabel('Photo du vernis',{exact:true}).setInputFiles({name:'label.png',mimeType:'image/png',buffer:photo});await page.getByLabel('Numéro de teinte, référence ou EAN',{exact:true}).waitFor({timeout:100000});
 await check('Scan unknown locally → automatic Internet → sourced fiche, exact published HEX, confirmation → Collection → reload',async()=>{
  await page.getByLabel('Numéro de teinte, référence ou EAN',{exact:true}).fill('KIKO Smart 153');await page.getByRole('heading',{name:'Produit trouvé en ligne',exact:true}).waitFor();
  assert.match(await page.locator('.onlineProductLookup').innerText(),/Muget Green/);await page.locator('.onlineProductLookup').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'online-scan-source.png')});await page.getByRole('button',{name:'Préremplir avec ce produit',exact:true}).click();
  assert.equal(await page.getByLabel('Nom (facultatif)',{exact:true}).inputValue(),'Muget Green');assert.equal(await page.getByLabel('Référence',{exact:true}).inputValue(),'153');assert.equal(await page.locator('.scanDetected small').innerText(),'#9aa180');
  await page.locator('.scanDetected').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'online-scan-found.png')});
  await page.getByRole('button',{name:'Ajouter ce produit à ma collection',exact:true}).click();await page.getByRole('button',{name:'Produit dans ma collection',exact:true}).waitFor();
  await page.reload();await page.getByRole('button',{name:'Collection',exact:true}).click();const card=page.locator('.productCard').filter({hasText:'Muget Green'});assert.equal(await card.count(),1);await card.click();assert.equal(await page.getByLabel('Code couleur',{exact:true}).inputValue(),'#9aa180');await page.getByRole('button',{name:'Fermer',exact:true}).click();return {source:result.candidates[0].source,color:'#9aa180',collectionReloaded:true};
 });
 await check('Cache remains usable offline and online selection never replaces an explicit manual color',async()=>{
  await page.goto('http://127.0.0.1:4191/#scan');await page.getByRole('button',{name:'Compléter ou corriger la fiche',exact:true}).click().catch(()=>{});await page.getByLabel('Code couleur',{exact:true}).fill('#cc0099');
  await page.getByRole('heading',{name:'Produit trouvé en ligne',exact:true}).waitFor();const before=await page.evaluate(()=>window.__nmOnlineTestCalls.length);await page.evaluate(()=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false}));
  await page.getByRole('button',{name:'Relancer la recherche Internet',exact:true}).click();await page.getByText('Fiche enregistrée disponible hors connexion.',{exact:true}).waitFor();await page.getByRole('button',{name:'Préremplir avec ce produit',exact:true}).click();
  assert.equal(await page.locator('.scanDetected small').innerText(),'#cc0099');assert.equal(await page.evaluate(()=>window.__nmOnlineTestCalls.length),before);await page.evaluate(()=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>true}));return {offline:true,networkCallsAdded:0,manualColor:'#cc0099'};
 });
 await check('Collection importer receives the same online fiche and preserves the manually chosen color',async()=>{
  await page.getByRole('button',{name:'Collection',exact:true}).click();await page.locator('.addProduct').click();await page.getByRole('button',{name:/Rechercher dans NailMoods/i}).click();
  await page.getByLabel('Nom ou référence',{exact:true}).fill('KIKO Smart 153');await page.getByRole('button',{name:'Rechercher la référence',exact:true}).click();await page.getByRole('heading',{name:'Produit trouvé en ligne',exact:true}).waitFor();
  await page.getByLabel('Code couleur',{exact:true}).fill('#214477');await page.getByRole('button',{name:'Préremplir avec ce produit',exact:true}).click();await page.getByRole('button',{name:'Utiliser ces informations',exact:true}).click();
  assert.equal(await page.getByLabel('Nom',{exact:true}).inputValue(),'Muget Green');assert.equal(await page.getByLabel('Code couleur',{exact:true}).inputValue(),'#214477');await page.getByRole('button',{name:'Fermer',exact:true}).click();return {sameSource:true,manualColor:'#214477'};
 });
 assert.deepEqual(report.errors,[]);
} finally {fs.writeFileSync(path.join(out,'online-browser.json'),JSON.stringify(report,null,2)+'\n');await browser.close();await server.close();}
