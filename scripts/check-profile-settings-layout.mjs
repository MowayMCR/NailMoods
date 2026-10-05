import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createServer} from 'vite';
import {chromium} from 'playwright';
import {defaultProfile} from '../src/profileOptions.js';
const out='docs/common-engagement/evidence';
const server=await createServer({server:{host:'127.0.0.1',port:4196}});await server.listen();
const browser=await chromium.launch({executablePath:'/tmp/nm-browser/chrome-linux/headless_shell',args:['--no-sandbox','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:390,height:844}}),checks=[],errors=[];
page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(p=>{if(!localStorage.getItem('nm-profile'))localStorage.setItem('nm-profile',JSON.stringify(p));},{...defaultProfile,name:'Marie',visualMood:'dark-feminine',onboarding_completed:true,guide_completed:true});
try{
 await page.goto('http://127.0.0.1:4196/#profil/account');
 for(const mood of ['soft-glam','dark-feminine','cottagecore','pop-pastel']){
  await page.evaluate(m=>{const p=JSON.parse(localStorage.getItem('nm-profile'));p.visualMood=m;localStorage.setItem('nm-profile',JSON.stringify(p));},mood);await page.reload();await page.getByLabel('Prénom',{exact:true}).waitFor();
  for(const width of [320,360,390,430]){
   await page.setViewportSize({width,height:844});
   const geometry=await page.evaluate(()=>{const input=document.querySelector('.profileAccountCard input'),label=input.parentElement,title=document.querySelector('.profileSectionTitle'),bio=document.querySelector('.profileAccountCard textarea');const i=input.getBoundingClientRect(),l=label.getBoundingClientRect(),t=title.getBoundingClientRect(),b=bio.getBoundingClientRect();return{overflow:document.documentElement.scrollWidth>innerWidth+1,gutter:t.left,titleRight:t.right,width:innerWidth,above:i.top-l.top,fieldWidth:i.width,labelWidth:l.width,bioWidth:b.width,bioLabelWidth:bio.parentElement.getBoundingClientRect().width,bioHeight:b.height};});
   assert.equal(geometry.overflow,false);assert.ok(geometry.gutter>=16&&geometry.titleRight<=width-16);assert.ok(geometry.above>=24);assert.ok(Math.abs(geometry.fieldWidth-geometry.labelWidth)<=1);assert.ok(Math.abs(geometry.bioWidth-geometry.bioLabelWidth)<=1);assert.ok(geometry.bioHeight>=120);checks.push({mood,width,...geometry});
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:out+'/reglages-'+mood+'.png',fullPage:true});
 }
 await page.getByLabel('Prénom',{exact:true}).fill('Marie test');await page.getByLabel('Ma bio personnelle',{exact:true}).fill('Un univers créatif, à mon rythme.');await page.reload();await page.getByLabel('Prénom',{exact:true}).waitFor();assert.equal(await page.getByLabel('Prénom',{exact:true}).inputValue(),'Marie test');assert.equal(await page.getByLabel('Ma bio personnelle',{exact:true}).inputValue(),'Un univers créatif, à mon rythme.');assert.deepEqual(errors,[]);
 fs.writeFileSync(out+'/reglages-checks.json',JSON.stringify({checks,guestPersistence:true,errors,scope:'Application exécutée localement, mode découverte. Aucun compte de production modifié.'},null,2));console.log('16 combinaisons mood/largeur validées, persistance invitée vérifiée, aucune erreur JS.');
}finally{await browser.close();await server.close();}
