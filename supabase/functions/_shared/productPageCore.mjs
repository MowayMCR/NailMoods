// Product-page data only. No markup or instructions from the page are executed.
export const MAX_PAGE_BYTES = 2_500_000;
export const MAX_REDIRECTS = 3;
export async function boundedText(input,maxBytes,signal) {
  if(Number(input.headers.get('content-length'))>maxBytes)throw Error('PAGE_TOO_LARGE');
  signal?.throwIfAborted();
  const reader=input.body?.getReader();if(!reader)return '';
  const chunks=[];let size=0;
  const abort=()=>{void reader.cancel();};signal?.addEventListener('abort',abort,{once:true});
  try{while(true){const {value,done}=await reader.read();signal?.throwIfAborted();if(done)break;size+=value.byteLength;if(size>maxBytes){await reader.cancel();throw Error('PAGE_TOO_LARGE');}chunks.push(value);}}
  finally{signal?.removeEventListener('abort',abort);reader.releaseLock();}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return new TextDecoder().decode(bytes);
}
const clean = value => typeof value === 'string' || typeof value === 'number' ? String(value).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,300) : '';
export function publicURL(value) {
  const url = new URL(String(value).trim());
  const host = url.hostname.toLowerCase().replace(/\.$/,'');
  if (!['http:','https:'].includes(url.protocol) || url.username || url.password || url.port || !host.includes('.') || /(^|\.)(localhost|local|internal|test|invalid)$/.test(host) || host.includes(':') || /^\d+(\.\d+)*$/.test(host) || /(^|\.)(metadata|metadata\.google\.internal)$/.test(host)) throw Error('URL_BLOCKED');
  url.hostname=host;url.hash='';
  for(const key of [...url.searchParams.keys()])if(/^(utm_|fbclid$|gclid$)/i.test(key))url.searchParams.delete(key);
  if(url.href.length>2048)throw Error('URL_BLOCKED');
  return url;
}
// Restrict egress to global IPv4. IPv6-only hosts fall back to the manual form.
// Every DNS answer is checked; the transport connects to this exact IP.
export function isPublicIPv4(ip) {
  if(!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip))return false;
  const [a,b,c,d]=ip.split('.').map(Number);
  if([a,b,c,d].some(n=>n>255))return false;
  return !(ip==='168.63.129.16'||a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===2)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51&&c===100)||a===203&&b===0&&c===113);
}
/** @param {string} value @param {any} options */
async function abortable(operation,signal){
 if(!signal)return operation;signal.throwIfAborted();
 return await new Promise((resolve,reject)=>{const abort=()=>reject(signal.reason||new DOMException('Aborted','AbortError'));signal.addEventListener('abort',abort,{once:true});Promise.resolve(operation).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));});
}
export async function safePage(value,{resolve,transport,signal,maxBytes=MAX_PAGE_BYTES,allowedHosts}={}) {
  let url=publicURL(value);
  for(let redirects=0;redirects<=MAX_REDIRECTS;redirects++) {
    if(allowedHosts && !allowedHosts.includes(url.hostname))throw Error('HOST_BLOCKED');
    signal?.throwIfAborted();
    const answers=await abortable(resolve(url.hostname),signal);
    signal?.throwIfAborted();
    if(!answers.length||answers.some(ip=>!isPublicIPv4(ip)))throw Error('DNS_BLOCKED');
    const response=await abortable(transport(url,answers[0],{signal,maxBytes}),signal);
    if([301,302,303,307,308].includes(response.status)) {
      await response.body?.cancel();
      if(redirects===MAX_REDIRECTS)throw Error('REDIRECT_LIMIT');
      const location=response.headers.get('location');if(!location)throw Error('PAGE_UNAVAILABLE');
      url=publicURL(new URL(location,url).href);continue;
    }
    if(!response.ok)throw Object.assign(Error('PAGE_UNAVAILABLE'),{status:response.status});
    const type=(response.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
    if(!['text/html','application/xhtml+xml','application/json','text/json','text/javascript','application/javascript'].includes(type))throw Error('CONTENT_TYPE_BLOCKED');
    if(Number(response.headers.get('content-length'))>maxBytes)throw Error('PAGE_TOO_LARGE');
    return {body:await boundedText(response,maxBytes,signal),source:url.href,type};
  }
  throw Error('REDIRECT_LIMIT');
}
const gtin=value=>{
  const code=String(value??'').replace(/[\s-]/g,'');if(!/^(\d{8}|\d{12,14})$/.test(code))return '';
  let sum=0;for(let i=code.length-2,w=3;i>=0;i--,w=w===3?1:3)sum+=Number(code[i])*w;
  return (10-sum%10)%10===Number(code.at(-1))?code:'';
};
function image(value,source){const raw=typeof value==='string'?value:value?.url||value?.src;if(!raw)return '';try{return publicURL(new URL(raw,source).href).href;}catch{return '';}}
function traits(name,category='') {
  const s=(name+' '+category).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),out={};
  if(/\btop\s*coat\b|finition/.test(s))out.productKind=/\bmat(te)?\b/.test(s)?'Top Coat mat':/gloss|brillant|shine/.test(s)?'Top Coat brillant':'Top Coat';
  else if(/\bbase\s*coat\b/.test(s))out.productKind='Base coat';
  else if(/\bcleaner\b/.test(s))out.productKind='Cleaner';
  else if(/\bprimer\b/.test(s))out.productKind='Primer';
  if(/semi.?permanent|gel polish/.test(s))out.type='Semi-permanent';else if(/nail lacquer|nail polish|vernis classique/.test(s))out.type='Vernis';else if(/builder gel|gel de construction/.test(s))out.type='Gel';
  if(/\bmat(te)?\b/.test(s))out.finish='Mat';else if(/gloss|brillant|shine/.test(s))out.finish='Brillant';else if(/cat.?eye|magnetic|magnetique/.test(s))out.finish='Cat-eye';else if(/\bchrome\b/.test(s))out.finish='Chrome';else if(/\bjelly\b/.test(s))out.finish='Jelly';
  return out;
}
export function productCandidate(product,source) {
  const name=clean(product.name);if(!name)return null;
  const fields={name,...traits(name,clean(product.category))};
  const brand=clean(typeof product.brand==='string'?product.brand:product.brand?.name);if(brand)fields.brand=brand;
  for(const [target,value] of [['reference',product.sku||product.mpn],['sku',product.sku],['collection',product.productGroupID ? '' : product.collection||product.range],['shadeName',product.color],['finish',product.finish],['effect',product.effect]])if(clean(value))fields[target]=clean(value);
  for(const code of [product.gtin13,product.gtin12,product.gtin14,product.gtin8,product.gtin])if(gtin(code)){fields.barcode=gtin(code);break;}
  for(const p of (Array.isArray(product.additionalProperty)?product.additionalProperty:[])) {
    const key=clean(p.name).toLowerCase(),val=clean(p.value);if(!val)continue;
    const target=({'gamme':'collection','range':'collection','collection':'collection','teinte':'shadeName','shade':'shadeName','finition':'finish','finish':'finish','effet':'effect','effect':'effect','type de produit':'type'})[key];
    if(target)fields[target]=val;
    if(['hex','color hex','couleur hex'].includes(key)&&/^#[a-f\d]{6}$/i.test(val))fields.color=val.toLowerCase();
  }
  const images=[...new Set([product.image].flat().map(v=>image(v,source)).filter(Boolean))].slice(0,8);
  if(images[0])fields.photo=images[0];
  return {fields,images,variants:[],source,method:'url',needsVariant:false};
}
export function extractProductPage(html,source,parseDocument) {
  const doc=parseDocument(html),products=[];
  const kiko=extractKikoProduct(doc,source);
  if(kiko)return {status:'found',candidate:kiko,evidence:'official_selected_product'};
  function visit(n){if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(visit);return;}if([n['@type']].flat().some(t=>t==='Product'||t==='https://schema.org/Product'))products.push(n);if(n['@graph'])visit(n['@graph']);if(n.mainEntity)visit(n.mainEntity);}
  for(const s of doc.querySelectorAll('script[type="application/ld+json"]'))try{visit(JSON.parse(s.textContent));}catch{}
  // Related products are never silently chosen. Duplicate scripts for the same
  // entity are collapsed only when the identity fields agree.
  const distinct=[...new Map(products.map(p=>[JSON.stringify([p['@id']||p.url||'',p.name,p.sku,p.gtin13||p.gtin]),p])).values()];
  if(distinct.length===1){const candidate=productCandidate(distinct[0],source);if(candidate)return {status:'found',candidate,evidence:'schema.org/Product'};}
  const meta=key=>doc.querySelector(`meta[property="${key}"]`)?.getAttribute('content')||doc.querySelector(`meta[name="${key}"]`)?.getAttribute('content')||'';
  const fields={};const title=clean(meta('og:title')),brand=clean(meta('product:brand')),photo=image(meta('og:image'),source);
  if(title)fields.name=title;if(brand)fields.brand=brand;if(photo)fields.photo=photo;
  // OG alone does not establish a reliable product identity.
  const candidate={fields,images:photo?[photo]:[],variants:[],source,method:'url',needsVariant:false};
  return {status:'manual',candidate,evidence:distinct.length>1?'ambiguous_products':'metadata_only',message:'Impossible de lire automatiquement cette fiche'};
}
export function extractKikoProduct(doc,source) {
  const url=publicURL(source);
  if(url.hostname!=='www.kikocosmetics.com'||!url.pathname.startsWith('/fr-fr/p/'))return null;
  try {
    const data=JSON.parse(doc.querySelector('#__NEXT_DATA__')?.textContent||'{}').props?.pageProps;
    const p=data?.selected,root=data?.root;
    if(!p?.slug||!new RegExp('^/fr-fr/p/'+p.slug.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(?:-\\d+)?/?$').test(url.pathname))return null;
    const range=clean(root?.display_value||root?.name||p.display_value);
    if(!/nail.*lacquer|vernis/i.test(range))return null;
    const label=clean(p.color).match(/^(\d{1,4})\s+(.+)$/);
    const reference=clean(p.shade_number||label?.[1]),shade=clean(p.shade_name||label?.[2]);
    if(!reference||!shade)return null;
    const candidate=productCandidate({name:shade,brand:'KIKO Milano',collection:range,sku:p.backend_id,gtin:(p.barcodes||[]).find(gtin),image:p.images?.primary?.url||doc.querySelector('meta[property="og:image"]')?.getAttribute('content')},source);
    if(!candidate)return null;
    Object.assign(candidate.fields,{reference,shadeName:shade,shadeCode:reference,type:'Vernis'});
    if(/^[a-f\d]{6}$/i.test(p.hex_color||''))candidate.fields.color='#'+p.hex_color.toLowerCase();
    if(p.finish_effect==='GLOSSY')candidate.fields.finish='Brillant';
    candidate.barcodeAliases=(p.barcodes||[]).filter(gtin).slice(0,10);
    return candidate;
  } catch {return null;}
}
export function extractShopify(raw,source) {
  if(!raw||!clean(raw.title))throw Error('NO_PRODUCT');
  const variants=(raw.variants||[]).slice(0,250).map(v=>({id:String(v.id),title:clean(v.title),sku:clean(v.sku),barcode:gtin(v.barcode),image:image(v.featured_image,source)}));
  const wanted=new URL(source).searchParams.get('variant'),variant=wanted?variants.find(v=>v.id===wanted):variants.length===1?variants[0]:null;
  const candidate=productCandidate({name:raw.title,brand:raw.vendor,category:raw.type||raw.product_type,image:raw.featured_image||raw.images?.[0],sku:variant?.sku,gtin:variant?.barcode},source);
  if(variant&&variant.title!=='Default Title')candidate.fields.name+=' · '+variant.title;
  if(variant?.image)candidate.fields.photo=variant.image;
  candidate.images=[...new Set([candidate.fields.photo,...(raw.images||[]).map(v=>image(v,source))].filter(Boolean))].slice(0,8);
  return {status:'found',candidate:{...candidate,variants,variantId:variant?.id||'',needsVariant:variants.length>1||Boolean(wanted&&!variant),raw},evidence:'shopify_product'};
}
/** @param {string} source @param {any} context @param {any} parseDocument */
export async function analyzeProductURL(source,context,parseDocument) {
  const page=await safePage(source,context);
  if(page.type.includes('json')||page.type.includes('javascript'))return extractShopify(JSON.parse(page.body),source);
  const result=extractProductPage(page.body,page.source,parseDocument);
  if(result.evidence!=='ambiguous_products') {
    const url=new URL(page.source),m=url.pathname.match(/^(.*?)(?:\/collections\/[^/]+)?\/products\/([^/]+?)\/?$/);
    if(m){const original=url.href;url.pathname=`${m[1]}/products/${m[2].replace(/\.(js|json)$/,'')}.js`;url.search='';try{
      const json=await safePage(url.href,context),shop=extractShopify(JSON.parse(json.body),original);
      if(result.status==='found'&&!shop.candidate.needsVariant){
        const a=result.candidate.fields,b=shop.candidate.fields;
        if((a.sku&&a.sku===b.sku)||clean(a.name).toLowerCase()===clean(b.name).toLowerCase())return {...shop,candidate:{...shop.candidate,fields:{...b,...a}},evidence:'schema.org/Product + shopify_product'};
        return result;
      }
      // Shopify makes multiple concrete variants explicit: the user chooses.
      return shop;
    }catch{/* Keep reliable partial metadata. */}}
  }
  return result;
}
