import {PRODUCT_DOCUMENTS,SYSTEM_DOCUMENTS} from './registry.js';
import {compareProduct} from '../poseCycle/diy.js';
import {productKind} from '../productKinds.js';
export const norm=v=>String(v||'').normalize('NFKC').trim().toLocaleLowerCase('fr').replace(/\s+/g,' ');
export function safeSource(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null;}catch{return null;}}
export function productDocument(product,registry=PRODUCT_DOCUMENTS){return registry.find(d=>safeSource(d.sourceUrl)&&/^\d{4}-\d{2}-\d{2}$/.test(d.checkedAt)&&Object.entries(d.identity).every(([k,v])=>norm(product?.[k])===norm(v)))||null;}
// A comma inside a chemical name (e.g. poly(1,4-butanediol)) isn't a separator.
export function inciEntries(text){if(typeof text!=='string')return [];let depth=0,buffer='',entries=[];for(const c of text.slice(0,12000)){if('(['.includes(c))depth++;if(')]'.includes(c))depth=Math.max(0,depth-1);if((c===','||c===';'||c==='\n')&&!depth){if(buffer.trim())entries.push(buffer.trim());buffer='';}else buffer+=c;}if(buffer.trim())entries.push(buffer.trim());return entries;}
const aliases={'hema':['hema','hydroxyethyl methacrylate','2-hydroxyethyl methacrylate'],'di-hema':['di-hema','di-hema trimethylhexyl dicarbamate']};
export function ingredientMatches(entry,watch){const wanted=norm(watch),value=norm(entry);return (aliases[wanted]||[wanted]).includes(value);}
export function ingredientReport(text,watch=[]){return inciEntries(text).map(name=>({name,watched:watch.filter(w=>ingredientMatches(name,w))}));}
export function inciFor(product){const d=productDocument(product),personal=product?.ingredientRecord;
 if(personal?.text?.trim()&&['label','manufacturer'].includes(personal.source)&&norm(personal.identity)===identityKey(product))return {text:personal.text,sourceUrl:safeSource(personal.sourceUrl),checkedAt:personal.recordedAt,label:'Transcription personnelle · à vérifier sur le flacon',personal:true};
 const central=product?.catalogTechnical?.inci;if(central?.value&&safeSource(central.sourceUrl)&&['manufacturer','documented'].includes(central.status))return {text:central.value,sourceUrl:central.sourceUrl,label:'Liste documentée dans le catalogue NailMoods · vérifier le flacon',personal:false};
 return d?{text:d.inci,sourceUrl:d.sourceUrl,checkedAt:d.checkedAt,label:'Liste publiée par le fabricant · '+d.market,personal:false}:null;}
export function identityKey(p){return ['brand','collection','name','type','sku','reference'].map(k=>norm(p?.[k])).join('|');}
export function recordIngredients(product,patch){return {...product.ingredientRecord,...patch,identity:identityKey(product),recordedAt:new Date().toISOString().slice(0,10)};}
export function documentedCompatibility(a,b,registry=SYSTEM_DOCUMENTS){const unknown={state:'unknown',label:'Information insuffisante',summary:'Aucune compatibilité documentée pour cette combinaison. Une teinte proche ne garantit pas la compatibilité des produits.'};if(!a||!b)return unknown;
 const eligible=p=>['Couleur','Base Coat','Top Coat brillant','Top Coat mat'].includes(productKind(p))&&['Vernis','Semi-permanent','Gel'].includes(p.type);
 if(!eligible(a)||!eligible(b))return unknown;
 for(const d of registry){if(!safeSource(d.sourceUrl)||!d.checkedAt)continue;const matches=p=>norm(p.brand)===norm(d.brand)&&norm(p.collection||p.range)===norm(d.range)&&p.type===d.type&&d.kinds.includes(productKind(p));
 if(matches(a)&&matches(b)&&d.sameSystem)return {state:'documented',label:'Compatibilité documentée',...d};
 const other=matches(a)?b:matches(b)?a:null;if(other&&other.brand&&(other.collection||other.range)&&d.exclusive&&(norm(other.brand)!==norm(d.brand)||norm(other.collection||other.range)!==norm(d.range)))return {state:'incompatible',label:'Systèmes différents · association exclue par le fabricant',...d};}
 return unknown;
}
export function productAlternatives(product,collection){return compareProduct(product,collection.filter(p=>String(p.id)!==String(product.id)));}
