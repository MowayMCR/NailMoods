// Local catalogue is read-only. Personal collection edits never write back to it.
import { validHex } from './colorAnalysis.js';
import { canonicalBrand, canonicalBarcode, productBarcodes, parseProductText, shortCode } from './productIdentity.js';
export const catalogText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = value => catalogText(value).split(' ').filter(Boolean);
const contains = (haystack, needle) => Boolean(needle && (' '+haystack+' ').includes(' '+needle+' '));
const editDistance = (a,b) => {
  let previous = Array.from({length:b.length+1}, (_,i)=>i);
  for(let i=1;i<=a.length;i++) { const current=[i]; for(let j=1;j<=b.length;j++) current[j]=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1)); previous=current; }
  return previous[b.length];
};
export function matchCatalog(products, query, { brand = '', collection = '', ocr = false, rawBarcode = '', barcodes = [], shadeCodes = [] } = {}) {
  const q=catalogText(query);
  if(/^#[a-f0-9]{6}$/i.test(String(query).trim()))return [];
  const parsed=parseProductText(query,products,{brand,collection,ocr});
  const b=canonicalBrand(parsed.brand), c=catalogText(parsed.collection);
  const codes=[...new Set([...shadeCodes,...parsed.shadeCodes].map(shortCode))];
  const barcodeKeys=[rawBarcode,...barcodes.map(v=>typeof v==='string'?v:v.rawBarcode),...parsed.barcodes.map(v=>v.rawBarcode),q.replace(/ /g,'')].map(canonicalBarcode).filter(Boolean);
  const ranked=products.flatMap(product=>{
    const pb=canonicalBrand(product.brand),pc=catalogText(product.collection),name=catalogText(product.name),ref=catalogText(product.reference);
    const barcodeExact=productBarcodes(product).some(code=>barcodeKeys.includes(code));
    const brandConflict=Boolean(b && b!==pb), collectionConflict=Boolean(c && c!==pc);
    if(!barcodeExact && (brandConflict || collectionConflict))return [];
    const skus=[product.sku,...(Array.isArray(product.skuAliases)?product.skuAliases:[])].map(catalogText).filter(Boolean);
    const scannedReferences=barcodes.filter(v=>v && typeof v==='object' && ['CODE_128','CODE_39'].includes(v.barcodeFormat)).map(v=>catalogText(v.rawBarcode));
    const skuExact=skus.some(sku=>contains(q,sku) || parsed.references.some(r=>catalogText(r)===sku) || scannedReferences.includes(sku));
    const refNumeric=/^\d{1,4}$/.test(ref);
    const referenceExact=Boolean(ref && (refNumeric ? codes.includes(shortCode(ref)) : contains(q,ref) || scannedReferences.includes(ref))) || skuExact;
    const shades=[product.shadeCode,...(Array.isArray(product.shadeCodeAliases)?product.shadeCodeAliases:[]),...(refNumeric?[ref]:[])].filter(Boolean).map(shortCode);
    const shadeExact=shades.some(code=>codes.includes(code));
    const nameExact=contains(q,name);
    if(codes.length && shades.length && !shadeExact && !referenceExact && !barcodeExact)return [];
    let score=0,priority=0,reason='';
    if(barcodeExact){score=99;priority=7;reason='EAN / GTIN exact';}
    else if(referenceExact){score=b?98:refNumeric&&!skuExact?72:90;priority=6;reason=(skuExact?'SKU exact':'Référence exacte')+(b?' et marque':'');}
    else if(shadeExact){score=b&&c?94:b?90:72;priority=5;reason='Numéro de teinte'+(b?' et marque':'')+(c?' et gamme':'');}
    else if(nameExact){score=b?94:84;priority=3;reason='Nom de teinte exact'+(b?' et marque':'');}
    else {
      const nameWords=tokens(name).filter(w=>w.length>2);
      const useful=tokens(q).filter(t=>t.length>2 && !tokens(pb+' '+pc).includes(t));
      const matches=nameWords.filter(word=>useful.some(part=>part===word || word.length>=5 && part.length>=5 && editDistance(word,part)<=1)).length;
      const supported=ocr ? b && matches>=Math.min(2,nameWords.length) && matches>0 : useful.length && useful.every(word=>nameWords.some(part=>part===word || word.length>=5 && part.length>=5 && editDistance(word,part)<=1));
      if(supported){score=b?76:62;priority=1;reason='Nom proche · à vérifier';}
    }
    if(!score)return [];
    const scannedBarcode=barcodeExact && [rawBarcode,...barcodes.filter(v=>v.barcodeSource!=='ocr').map(v=>typeof v==='string'?v:v.rawBarcode)].map(canonicalBarcode).some(code=>code && productBarcodes(product).includes(code));
    if(ocr && !scannedBarcode){score=Math.min(score,88);reason+=' · texte lu sur photo';}
    if(brandConflict || collectionConflict){score=Math.min(score,65);reason+=' · conflit avec la marque ou la gamme lue';}
    const cap=ocr?88:100;
    return [{product,score,priority,reason,evidence:{brand:b&&!brandConflict?cap:null,collection:c&&!collectionConflict?cap:null,reference:referenceExact?cap:null,name:nameExact?cap:priority===1?70:null,color:null,barcode:barcodeExact?scannedBarcode?100:cap:null,shadeCode:shadeExact?cap:null}}];
  }).sort((a,b)=>b.priority-a.priority || b.score-a.score || String(a.product.name).localeCompare(String(b.product.name),'fr',{numeric:true}));
  return ranked.slice(0,3).map(row=>{
    const ambiguous=ranked.some(other=>other!==row && other.priority===row.priority && other.score===row.score);
    const score=ambiguous?Math.min(row.score,82):row.score;
    return {...row,score,confidence:score>=90?'élevée':'moyenne',reason:row.reason+(ambiguous?' · plusieurs références possibles':'')};
  });
}
export function catalogCandidate(match) {
  const p=match.product;
  const fields=Object.fromEntries(['brand','collection','name','reference','type','url','family','finish','usage','sku','ean13','gtin','shadeCode'].filter(k=>p[k]).map(k=>[k,p[k]]));
  const finishes = { creme: 'Crème', jelly: 'Jelly', paillete: 'Pailleté', metallique: 'Métallique', brillant: 'Brillant', 'cat eye': 'Cat-eye', mat: 'Mat' };
  fields.finish = finishes[catalogText(p.finish)] || 'Autre';
  if (p.finish && !finishes[catalogText(p.finish)]) fields.finishDetail = p.finish;
  if(p.colorValidated === true && validHex(p.catalogColor)) fields.catalogColor=p.catalogColor;
  return {fields,images:[],variants:[],method:'catalog',source:p.url || '',catalogId:p.catalogId,catalogVersion:'V1-2026-09-17',evidence:match.evidence,identity: Object.fromEntries(['brand','collection','reference','sku','name'].filter(k=>p[k]).map(k=>[k,p[k]])),score:match.score,confidence:match.confidence,reason:match.reason};
}
export function catalogueProvenance(candidate) {
  return {kind:'nailmoods',verified:false,catalogId:candidate.catalogId,catalogVersion:candidate.catalogVersion,recognitionScore:candidate.score,recognitionEvidence:candidate.evidence,catalogIdentity:candidate.identity,confirmedAt:new Date().toISOString(),importMethod:'catalog'};
}
let cached;
export async function loadCatalog(signal) {
  if(cached) return cached;
  const response=await fetch(import.meta.env.BASE_URL + 'catalog-v1.json',{signal});
  if(!response.ok) throw new Error('Le catalogue est indisponible. Tu peux ajouter ton produit manuellement.');
  const data=await response.json();
  if(!Array.isArray(data.products)) throw new Error('Catalogue illisible. La saisie manuelle reste disponible.');
  cached=data.products;return cached;
}

// Future swatch import can refer to these stable groups without editing the catalogue.
export function catalogCollections(products) {
  const groups=new Map();
  for(const p of products) {
    if(!p.brand || !p.collection || !p.catalogId) continue;
    const id=JSON.stringify([p.brand,p.collection]);
    if(!groups.has(id)) groups.set(id,{id,brand:p.brand,name:p.collection,origin:'nailmoods',productIds:[]});
    groups.get(id).productIds.push(p.catalogId);
  }
  return [...groups.values()];
}
