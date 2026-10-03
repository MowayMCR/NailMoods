import {safePage,publicURL,productCandidate,extractProductPage} from './productPageCore.mjs';
import {lookupText,identityMatch,lookupRange} from './lookupIdentity.mjs';
const config=Object.freeze({
 'Maybelline':{host:'www.maybelline.fr',pages:['/tous-les-produits/soins/vernis-a-ongles/superstay-seven-days']},
 'Monoprix':{host:'courses.monoprix.fr',index:'/categories/hygi%C3%A8ne-beaut%C3%A9/maquillage/vernis-et-dissolvants/2e4cf5a4-063f-436d-91af-a619abfb605b',path:/^\/products\/monop(?:rix)?[^/]*vernis[^/]*\/MPX_\d+$/},
 'Fashion Make Up':{host:'www.fashionmakeup.fr',index:'/cat-vernis-181.htm',path:/^\/art-vernis-[a-z\d-]+-\d+\.htm$/},
 'Yves Rocher':{host:'www.yves-rocher.fr',index:'/maquillage/ongles/vernis-a-ongles/c/24100',path:/^\/maquillage\/ongles\/vernis-a-ongles\/[^/]+\/p\/\d{5}$/},
 'H&M':{host:'www2.hm.com',index:'/content/hmonline/fr_fr/beaute/shop-by-product/ongles/tout-afficher.html',path:/^\/fr_fr\/productpage\.\d{10}\.html$/},
 'Essie':{host:'www.essie.com',index:'/nail-polish',path:/^\/nail-polish\/(?:enamel|gel-couture|expressie)\/[a-z\d/-]+$/},
});
export const extraOfficialBrands=Object.freeze(Object.keys(config));
const indexes=new Map();
const hex=v=>/^#?[a-f\d]{6}$/i.test(v||'')?'#'+v.replace(/^#/,'').toLowerCase():'';
const label=v=>String(v||'').replace(/\s+/g,' ').trim().slice(0,200);
function all(doc,selector){const scopes=[doc];for(let i=0;i<scopes.length&&i<50;i++)for(const t of scopes[i].querySelectorAll('template'))if(t.content)scopes.push(t.content);return scopes.flatMap(s=>[...s.querySelectorAll(selector)]);}
function approved(value,source,host){const url=publicURL(new URL(value,source).href);if(url.hostname!==host)throw Error('HOST_BLOCKED');return url.href;}
function group(candidates,input) {
 const matches=candidates.filter(c=>identityMatch(c,input));
 if(!matches.length)return [];
 if(matches.length===1||input.reference||input.canonicalBarcode)return matches.slice(0,3);
 // A family name alone does not silently select a shade. Keep all matching choices.
 const first=matches[0];return [{...first,fields:{brand:first.fields.brand,name:input.name,collection:first.fields.collection,type:first.fields.type},needsVariant:true,variantId:'',
  variants:matches.slice(0,100).map((c,i)=>({id:String(i),title:c.fields.name})),directVariants:matches.slice(0,100)}];
}
export function extractOfficialBrandProducts(html,source,input,parseDocument,{allVariants=false}={}) {
 const host=new URL(source).hostname,cfg=config[input.brand];if(!cfg||host!==cfg.host)return [];
 const doc=parseDocument(html),out=[];
 if(input.brand==='Maybelline') {
  const range=new URL(source).pathname.endsWith('/superstay-seven-days')?'Superstay 7 Days':'';
  for(const n of all(doc,'input[data-display-name][data-variant-ean]')) {
   const text=label(n.getAttribute('data-display-name')),m=text.match(/^(\d+)\s+(.+)$/);if(!m)continue;
   const c=productCandidate({name:range+' · '+text,brand:input.brand,collection:range,gtin:n.getAttribute('data-variant-ean')},source);
   Object.assign(c.fields,{reference:m[1],shadeCode:m[1],shadeName:m[2],type:'Vernis'});
   const color=hex(n.getAttribute('data-color'));if(color)c.fields.color=color;
   out.push(c);
  }
 } else if(input.brand==='Fashion Make Up') {
  const title=label(doc.querySelector('h1.titre_article_art')?.textContent),range=title.replace(/^VERNIS\s+/i,'');
  if(!title)return [];
  const ref=[...doc.querySelectorAll('.code_ref')].map(n=>label(n.textContent).match(/Réf\.\s*:\s*([A-Z\d]+)\s*-\s*(.+)/i)).find(Boolean);
  for(const n of doc.querySelectorAll('select.articleCaracteristique option')) {
   const m=label(n.textContent).match(/^(\d+)\s*-\s*(.+)$/);if(!m)continue;
   const c=productCandidate({name:title+' · '+m[2],brand:input.brand,collection:range},source);
   Object.assign(c.fields,{reference:m[1],shadeCode:m[1],shadeName:m[2],type:'Vernis'});
   if(n.hasAttribute('selected')&&ref&&lookupText(ref[2])===lookupText(m[2]))c.fields.sku=ref[1];
   const img=[...doc.querySelectorAll('img.caractvalImg')].find(i=>label(i.getAttribute('alt'))===label(n.textContent));
   if(img)try{c.fields.photo=approved(img.getAttribute('src'),source,host);}catch{}
   out.push(c);
  }
 } else if(input.brand==='Yves Rocher') {
  const title=label(doc.querySelector('h1')?.textContent);
  if(!/vernis.*ongles/i.test(title)||!new URL(source).pathname.startsWith('/maquillage/ongles/vernis-a-ongles/'))return [];
  for(const n of doc.querySelectorAll('yr-shade-selector[data-shades]'))try {
   const shades=JSON.parse(n.getAttribute('data-shades'));
   for(const s of shades.slice(0,100)) {
    if(!/^\d{5}$/.test(String(s.id)))continue;const url=approved(s.url,source,host);
    if(!url.endsWith('/p/'+s.id))continue;
    const m=label(s.label).match(/^(\d+)\.\s*(.+)$/);if(!m)continue;
    const range=title.replace(/^Vernis à Ongles\s*-\s*/i,'');
    const c=productCandidate({name:title+' · '+m[2],brand:input.brand,collection:range,image:s.img},url);
    Object.assign(c.fields,{reference:String(s.id),shadeCode:m[1],shadeName:m[2],type:'Vernis'});
    const color=hex(s.color);if(color)c.fields.color=color;out.push(c);
   }
  }catch{/* Unparseable shade data cannot establish identity. */}
 } else if(input.brand==='H&M') {
  const visit=n=>{
   if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(visit);return;}
   if(n['@type']==='ProductGroup'&&/vernis|nail polish/i.test(n.name||'')&&n.brand?.name==='H&M') {
    for(const p of (n.hasVariant||[]).slice(0,100)) {
     const url=p.offers?.url;if(!url)continue;
     try {const src=approved(url,source,host),code=new URL(src).pathname.match(/productpage\.(\d{10})\.html$/)?.[1];if(!code||!String(p.sku||'').startsWith(code))continue;
      const c=productCandidate({...p,brand:'H&M'},src);if(c){Object.assign(c.fields,{reference:code,type:'Vernis'});out.push(c);}
     }catch{}
    }
   }
   if(n['@graph'])visit(n['@graph']);
  };
  for(const n of doc.querySelectorAll('script[type="application/ld+json"]'))try{visit(JSON.parse(n.textContent));}catch{}
 } else {
  const r=extractProductPage(html,source,parseDocument);
  if(r.status==='found') {
   const c=r.candidate;
   if(input.brand==='Essie'&&!c.fields.brand)c.fields.brand='Essie';
   if(input.brand==='Essie'){c.fields.type='Vernis';c.fields.shadeName=c.fields.name;}
   if(input.brand==='Monoprix'&&/vernis/i.test(c.fields.name)){
    c.fields.type='Vernis';const shade=c.fields.name.match(/N°\s*(\d+)/i)?.[1];if(shade){c.fields.reference=shade;c.fields.shadeCode=shade;}
   }
   out.push(c);
  }
 }
 return allVariants?out:group(out,input);
}
export async function extraOfficialLookup(input,context,parseDocument) {
 const cfg=config[input.brand];if(!cfg)return [];
 const base='https://'+cfg.host,ctx={...context,allowedHosts:[cfg.host]};let urls=cfg.pages?.map(p=>base+p)||[];
 if(input.brand==='H&M'&&/^\d{10}$/.test(input.reference))urls=[base+'/fr_fr/productpage.'+input.reference+'.html'];
 if(input.brand==='Yves Rocher'&&/^\d{5}$/.test(input.reference))urls=[base+'/p/'+input.reference];
 if(!urls.length) {
  let index=indexes.get(input.brand);
  if(!index||index.expires<Date.now()) {
   const page=await safePage(base+cfg.index,ctx),doc=parseDocument(page.body),links=[];
   for(const n of doc.querySelectorAll('a[href]'))try{
    const url=approved(n.getAttribute('href'),page.source,cfg.host);
    if(cfg.path.test(new URL(url).pathname))links.push({url,text:label(n.textContent)+' '+decodeURIComponent(new URL(url).pathname)});
   }catch{}
   index={links:[...new Map(links.map(l=>[l.url,l])).values()].slice(0,200),expires:Date.now()+3600000};indexes.set(input.brand,index);
  }
  const scored=index.links.map(l=>({...l,score:(input.name&&lookupText(l.text).includes(lookupText(input.name))?10:0)+(input.collection&&lookupText(l.text).includes(lookupRange(input.collection))?6:0)+(input.reference&&lookupText(l.text).split(' ').includes(lookupText(input.reference))?10:0)})).sort((a,b)=>b.score-a.score);
  const exact=scored.filter(l=>l.score);urls=(exact.length?exact:scored).slice(0,input.brand==='H&M'?2:3).map(l=>l.url);
  if(input.brand==='Essie'&&input.name&&!exact.length) {
   const slug=lookupText(input.name).replaceAll(' ','-');
   // Discovery attempts only: every page must supply a matching product identity.
   urls=['pinks','reds','nudes','blues','greens','purples'].map(c=>base+'/nail-polish/enamel/'+c+'/'+slug);
  }
 }
 const results=await Promise.allSettled(urls.map(async url=>{const p=await safePage(url,ctx);return extractOfficialBrandProducts(p.body,p.source,input,parseDocument);}));
 const found=results.flatMap(r=>r.status==='fulfilled'?r.value:[]);
 if(!found.length&&results.some(r=>r.status==='rejected'&&r.reason?.status!==404))throw Error('PROVIDER_UNAVAILABLE');
 return found;
}
