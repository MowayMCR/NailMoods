import fs from 'node:fs';import {createServer} from 'vite';import {chromium} from 'playwright';
const server=await createServer({server:{host:'127.0.0.1',port:4197}});await server.listen();
const browser=await chromium.launch({executablePath:'/tmp/nm-browser/chrome-headless-shell-linux64/chrome-headless-shell',args:['--no-sandbox']});
try{
const page=await browser.newPage({viewport:{width:1260,height:1900},deviceScaleFactor:2,reducedMotion:'reduce'});
await page.goto('http://127.0.0.1:4197');await page.locator('.smartHome').waitFor();
await page.evaluate(async()=>{
const {default:React}=await import('/node_modules/.vite/deps/react.js');const {default:ReactDOM}=await import('/node_modules/.vite/deps/react-dom_client.js');const {default:NailPreview}=await import('/src/NailPreview.jsx');
const {applyMood,moodFor}=await import('/src/design/themes.js');applyMood(moodFor('soft-glam'));
const host=document.createElement('div');host.id='nail-review';document.body.append(host);
const style=document.createElement('style');style.textContent=`body{margin:0!important;padding:0!important}#root{display:none!important}#nail-review{padding:32px;background:#fbf5ef;color:#35242d;font-family:system-ui,sans-serif}#nail-review h1{font:36px Georgia,serif;margin:0 0 10px}#nail-review p{font-size:13px;line-height:1.6;margin:0 0 24px}.review-grid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px}.review-cell{padding:10px;background:#fffaf7;border:1px solid #d9bdc8;border-radius:16px}.review-cell h2{margin:0;font:16px Georgia,serif}.review-cell small{font:11px system-ui;color:#6f5662}.review-cell .nailPreview{height:142px;min-height:0;padding:4px;margin:8px 0 0;align-items:center}.review-cell .nailPreview>svg{display:none;transform:none;margin:0}.review-cell .nailPreview>svg:first-child{display:block;width:80px;height:130px;max-width:none;max-height:none;transform:none;margin:0}.review-foot{margin-top:20px;font-size:12px;color:#6f5662}`;document.head.append(style);
const shapes=['Ovale','Ronde','Amande','Carrée','Ballerine','Stiletto'];const techniques=[['Crème','monochrome'],['French','french'],['Aura','aura'],['Cat Eye','cat-eye'],['Chrome','chrome'],['Jelly','jelly'],['Tortoiseshell','tortoiseshell'],['Glitter','glitter']];
const cells=techniques.flatMap(([label,technique])=>shapes.map(shape=>{
const color=technique==='tortoiseshell'?'#ca8841':'#bd7084';const accentColor=technique==='tortoiseshell'?'#613920':technique==='aura'?'#f5cbab':'#fff5ed';
const idea={id:shape+technique,key:shape+technique,title:label,description:shape+' / '+label,shape,length:'Moyenne',technique,nails:Array.from({length:5},()=>({color,accentColor,technique,drawing:technique==='french'?'french':undefined,finish:'Brillant'}))};
return React.createElement('section',{className:'review-cell',key:idea.id},React.createElement('h2',null,shape),React.createElement('small',null,label),React.createElement(NailPreview,{idea}));}));
ReactDOM.createRoot(host,{identifierPrefix:'review-'}).render(React.createElement(React.Fragment,null,React.createElement('h1',null,'Les silhouettes NailMoods'),React.createElement('p',null,'Contrôle du renderer existant · 6 formes × 8 techniques · détail du premier ongle, longueur moyenne.\nCouleurs de contrôle identiques. Rendu illustré exécuté dans Chromium ; aucune image générée.'),React.createElement('div',{className:'review-grid'},cells),React.createElement('div',{className:'review-foot'},'Base f7a67ca — silhouettes et techniques conservées. Planche soumise à validation visuelle ; ce n’est pas une photo de pose.')));
});
await page.locator('.review-cell').last().waitFor();await page.locator('#nail-review').screenshot({path:'docs/da06-lot-a/evidence/planche-ongles-48.png'});
console.log('48 renderer cells captured.');
}finally{await browser.close();await server.close();}
