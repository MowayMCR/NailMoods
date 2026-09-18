// Local catalogue is read-only. Personal collection edits never write back to it.
import { validHex } from './colorAnalysis.js';
export const catalogText = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const tokens = value => catalogText(value).split(' ').filter(Boolean);
const contains = (haystack, needle) => Boolean(needle && (' '+haystack+' ').includes(' '+needle+' '));
const editDistance = (a,b) => {
  let previous = Array.from({length:b.length+1}, (_,i)=>i);
  for(let i=1;i<=a.length;i++) { const current=[i]; for(let j=1;j<=b.length;j++) current[j]=Math.min(current[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1)); previous=current; }
  return previous[b.length];
};
export function matchCatalog(products, query, { brand = '', collection = '', ocr = false } = {}) {
  const q=catalogText(query), b=catalogText(brand), c=catalogText(collection);
  if(q.length<2) return [];
  const knownBrands=[...new Set(products.map(p=>catalogText(p.brand)))];
  const explicitBrand=b || knownBrands.filter(name=>contains(q,name)).sort((a,b)=>b.length-a.length)[0];
  const numberTokens=tokens(q).filter(t=>/^\d+$/.test(t));
  const ranked=products.flatMap(product=>{
    const pb=catalogText(product.brand), pc=catalogText(product.collection), name=catalogText(product.name), ref=catalogText(product.reference);
    if(explicitBrand && pb!==explicitBrand) return [];
    if(c && pc!==c) return [];
    const skuExact=contains(q,catalogText(product.sku));
    const referenceExact=contains(q,ref) || skuExact;
    // A wrong number must never fuzzy-match an adjacent shade reference.
    if(numberTokens.length && ref && !referenceExact && !numberTokens.some(t=>tokens(name).includes(t))) return [];
    const nameExact=contains(q,name);
    let score=0,reason='';
    if(referenceExact){score=explicitBrand?98:90;reason=(skuExact?'SKU exact':'Référence exacte')+(explicitBrand?' et marque':'');}
    else if(nameExact){score=explicitBrand?94:84;reason='Nom de teinte exact'+(explicitBrand?' et marque':'');}
    else {
      const useful=tokens(q).filter(t=>t.length>2 && !tokens(pb+' '+pc).includes(t));
      const nameWords=tokens(name);
      const matches=useful.filter(word=>nameWords.some(part=>part===word || word.length>=5 && part.length>=5 && editDistance(word,part)<=1)).length;
      if(useful.length && matches===useful.length){score=explicitBrand?76:62;reason='Nom proche · à vérifier';}
    }
    if(!score) return [];
    if(ocr){score=Math.min(score,88);reason+=' · texte lu sur photo';}
    const cap=ocr?88:100;
    const evidence={brand:explicitBrand?Math.min(100,cap):null,collection:(c===pc&&c || contains(q,pc))?Math.min(100,cap):null,reference:referenceExact?Math.min(100,cap):null,name:nameExact?Math.min(100,cap):reason.startsWith('Nom proche')?Math.min(70,cap):null,color:null};
    return [{product,score,reason,evidence}];
  }).sort((a,b)=>b.score-a.score || a.product.name.localeCompare(b.product.name,'fr',{numeric:true}));
  const ambiguous=ranked.length>1 && ranked[0].score===ranked[1].score;
  return ranked.slice(0,3).map(row=>({...row,score:ambiguous?Math.min(row.score,82):row.score,confidence:!ambiguous&&row.score>=90?'élevée':'moyenne'}));
}
export function catalogCandidate(match) {
  const p=match.product;
  const fields=Object.fromEntries(['brand','collection','name','reference','type','url','family','finish','usage','sku'].filter(k=>p[k]).map(k=>[k,p[k]]));
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
