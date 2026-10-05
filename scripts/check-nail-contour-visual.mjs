import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {chromium} from 'playwright';
const stage=process.argv[2]||'after';
const out=process.env.NAILMOODS_VISUAL_OUTPUT||'docs/nail-contour/evidence';
fs.mkdirSync(out,{recursive:true});
const server=await createServer({server:{host:'127.0.0.1',port:4197,strictPort:true}});
await server.listen();
const browser=await chromium.launch({executablePath:process.env.NAILMOODS_BROWSER_EXECUTABLE||'/tmp/nm-browser/chrome-linux/headless_shell',args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:720,height:900},deviceScaleFactor:1.5,reducedMotion:'reduce'});
 await page.route('**/*',r=>new URL(r.request().url()).hostname==='127.0.0.1'?r.continue():r.abort());
 await page.goto('http://127.0.0.1:4197');
 await page.locator('.smartHome').waitFor();
 await page.evaluate(async()=>{
  const {default:React}=await import('/node_modules/.vite/deps/react.js');
  const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');
  const {default:NailPreview}=await import('/src/NailPreview.jsx');
  const host=document.createElement('main');host.id='nail-review';document.body.append(host);
  const style=document.createElement('style');style.textContent=`#root{display:none!important}body{margin:0!important;padding:0!important}#nail-review{padding:24px;background:var(--backgroundPrimary);color:var(--textPrimary);font-family:system-ui,sans-serif}#nail-review h1{font:30px Georgia,serif;margin:0 0 16px}#nail-review h2{font:18px Georgia,serif;margin:0 0 8px}.review-set{border-radius:24px;padding:18px;background:var(--surfacePrimary);margin-bottom:20px}.review-set .nailPreview{min-height:210px}.review-set .nailPreview>svg{max-width:none;width:18%}.review-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}.review-cell{background:var(--surfacePrimary);padding:8px;border-radius:16px;min-width:0}.review-cell small{font-size:11px}.review-cell h2{font-size:14px}.review-cell .nailPreview{height:135px;min-height:0;padding:4px;margin:6px 0;align-items:center}.review-cell .nailPreview>svg{display:none;transform:none;margin:0}.review-cell .nailPreview>svg:first-child{display:block;width:76px;height:124px;max-width:none;max-height:none;transform:none;margin:0}@media(max-width:450px){#nail-review{padding:16px}.review-set{padding:12px}.review-set .nailPreview{min-height:150px}.review-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}`;
  document.head.append(style);
  const make=(shape,technique,colors)=>({id:shape+technique+colors.join(''),shape,length:'Moyenne',description:shape+' '+technique,technique,nails:colors.map(color=>({color,accentColor:technique==='tortoiseshell'?'#613920':'#fff5ed',technique,drawing:technique==='french'?'french':undefined,finish:technique==='glitter'?'Pailleté':'Brillant'}))});
  const shapes=['Ovale','Ronde','Amande','Carrée','Ballerine','Stiletto'];
  const techniques=[['Crème','monochrome'],['French','french'],['Aura','aura'],['Cat Eye','cat-eye'],['Chrome','chrome'],['Jelly','jelly'],['Tortoiseshell','tortoiseshell'],['Glitter','glitter']];
  const e=React.createElement;
  const set=(title,colors)=>e('section',{className:'review-set',key:title},e('h2',null,title),e(NailPreview,{idea:make('Ronde','monochrome',colors)}));
  ReactDOM.createRoot(host,{identifierPrefix:'contour-'}).render(e(React.Fragment,null,e('h1',null,'Un seul contour, un relief doux'),set('Rouge et blanc',['#c33748','#f1efeb','#c33748','#f1efeb','#c33748']),set('Brun et blanc',['#805144','#805144','#c33748','#f1efeb','#f1efeb']),e('div',{className:'review-grid'},techniques.flatMap(([label,technique])=>shapes.map(shape=>e('section',{className:'review-cell',key:shape+technique},e('h2',null,shape),e('small',null,label),e(NailPreview,{idea:make(shape,technique,Array(5).fill(technique==='tortoiseshell'?'#ca8841':'#bd7084'))})))))));
 });
 await page.locator('.review-cell').last().waitFor();
 await page.locator('.review-set').first().screenshot({path:out+'/'+stage+'-zoom.png'});
 await page.locator('#nail-review').screenshot({path:out+'/'+stage+'-48.png'});
 const signatures=[];
 for(const mood of ['soft-glam','dark-feminine','cottagecore','pop-pastel']){
  await page.evaluate(async mood=>{const {applyMood,moodFor}=await import('/src/design/themes.js');applyMood(moodFor(mood));},mood);
  signatures.push(await page.locator('.review-set').first().locator('svg').evaluateAll(nodes=>nodes.map(n=>n.outerHTML).join('')));
  for(const width of [320,360,390,430]){
   await page.setViewportSize({width,height:900});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow '+mood+' '+width);
   const svgs=await page.locator('.review-set').first().locator('svg').all();
   for(let i=1;i<svgs.length;i++){
    const a=await svgs[i-1].boundingBox(),b=await svgs[i].boundingBox();
    assert.ok(b.x>a.x+a.width-2,'overlapping nails');
   }
  }
 }
 assert.equal(new Set(signatures).size,1,'product rendering must not change with mood');
 console.log(JSON.stringify({stage,shapes:6,techniques:8,moods:4,widths:[320,360,390,430],productRenderingStable:true,overflow:false}));
} finally {await browser.close();await server.close();}
