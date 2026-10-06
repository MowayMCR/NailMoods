import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'vite';
import {chromium} from 'playwright';
process.env.NAILMOODS_MOBILE_ENV='production';
process.env.NAILMOODS_PLATFORM='ios';
const out='artifacts/ios/ipad-browser';fs.mkdirSync(out,{recursive:true});
const server=await createServer({configFile:'vite.mobile.config.js',server:{host:'127.0.0.1',port:4198}});
await server.listen();
const browser=await chromium.launch({...(process.env.NAILMOODS_BROWSER_EXECUTABLE?{executablePath:process.env.NAILMOODS_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:820,height:1180},reducedMotion:'reduce'});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const results=[];
const applyNativeLayout=async()=>{
  await page.addStyleTag({path:'src/platform/native.css'});
  await page.evaluate(()=>document.documentElement.classList.add('nm-native','nm-ios'));
};
try{
  await page.goto('http://127.0.0.1:4198');await page.locator('.smartHome').waitFor();
  await page.evaluate(()=>{
    localStorage.setItem('nm-profile',JSON.stringify({name:'Marie',styles:['Soft Glam'],visualMood:'soft-glam',shape:'Ovale',length:'Moyenne',level:'Intermédiaire',theme:'nailmoods',onboarding_completed:true,guide_completed:true}));
    localStorage.setItem('nm-collection-v2',JSON.stringify(Array.from({length:8},(_,i)=>({id:'ipad-'+i,name:'Teinte de contrôle '+i,brand:'Fixture locale',type:'Vernis',finish:'Brillant',family:'Rose',color:'#bd7084',fav:false}))));
  });
  await page.reload();await page.locator('.smartHome').waitFor();await applyNativeLayout();
  for(const viewport of [{width:390,height:844},{width:768,height:1024},{width:820,height:1180},{width:1024,height:1366},{width:1180,height:820},{width:1366,height:1024}]){
    await page.setViewportSize(viewport);
    for(const screen of ['home','feed','create','collection','journal']){
      await page.locator(`nav [data-tour="${screen}"]`).click();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Page overflow '+screen);
      const geometry=await page.locator('.app').evaluate(el=>({width:el.clientWidth,viewport:innerWidth}));
      if(viewport.width>=700)assert.ok(geometry.width>=700,'iPad must not use the phone column');
      if(screen==='collection'&&viewport.width>=700){
        await page.getByRole('button',{name:'Vue photos',exact:true}).click();
        const columns=await page.locator('.collectionGrid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length);
        assert.equal(columns,viewport.width>=1000?4:3);
        await page.getByRole('button',{name:'Vue étagère',exact:true}).click();
        assert.equal(await page.locator('.nmShelfBottles').first().evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),5);
      }
      await page.screenshot({path:`${out}/${viewport.width}x${viewport.height}-${screen}.png`});
      results.push({viewport,screen,geometry,status:'PASS'});
    }
    await page.locator('header [aria-label="Profil"]').click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:`${out}/${viewport.width}x${viewport.height}-profile.png`});
  }
  assert.deepEqual(errors,[],'Unexpected browser runtime error');
  console.log('PASS responsive Apple layout: iPhone and five iPad portrait/landscape viewports, six screens.');
}finally{
  fs.writeFileSync(out+'/results.json',JSON.stringify({scope:'Chromium browser, local guest fixtures and Apple CSS. Not a native simulator or physical iPad test.',results,errors},null,2));
  await browser.close();await server.close();
}
