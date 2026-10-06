import {preciseShade,validHex} from '../colorAnalysis.js';
import {identityText,canonicalBrand,productBarcodes} from '../productIdentity.js';

export const shelfSorts=[['color','Ton de couleur'],['recent','Plus récents'],['used','Plus utilisés'],['brand','Marque A–Z'],['name','Nom A–Z'],['finish','Finition']];
export const toneGroups=['Nudes & beiges','Roses','Corails & oranges','Rouges & cassis','Violets & mauves','Bleus','Verts','Jaunes & ors','Neutres & foncés','Teinte à préciser'];
export function shelfColor(p={}){if(p.colorSource==='palette'&&!p.catalogColorValidated&&!validHex(p.shade)&&!validHex(p.confirmedColor))return null;return preciseShade(p)||(validHex(p.color)?p.color.toLowerCase():null);}
export function shelfFinish(p={}){const v=identityText([p.finishDetail,p.finish,p.effect].filter(Boolean).join(' '));return /cat eye|cat.*eye|magnet/.test(v)?'cat-eye':/glitter|paillet/.test(v)?'glitter':/chrome|metall|miroir/.test(v)?'chrome':/jelly|transluc/.test(v)?'jelly':/shimmer|pearl|nacr|irise/.test(v)?'shimmer':'cream';}
export function toneOf(p){
 const color=shelfColor(p);if(!color)return toneGroups[9];
 const [r,g,b]=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255),hi=Math.max(r,g,b),lo=Math.min(r,g,b),delta=hi-lo,l=(hi+lo)/2,s=delta===0?0:delta/(1-Math.abs(2*l-1));
 if(s<.12||delta<.035||l<.10)return toneGroups[8];
 const h=((hi===r?(g-b)/delta:hi===g?(b-r)/delta+2:(r-g)/delta+4)*60+360)%360;
 if(h>=12&&h<50&&s<.65)return toneGroups[0];
 if(h>=315&&h<355)return toneGroups[l<.4||(h>=340&&s>.55&&l<.65)?3:1];
 if(h>=355||h<12)return toneGroups[l>.7?1:3];
 if(h<45)return toneGroups[2];if(h<70)return toneGroups[7];if(h<170)return toneGroups[6];if(h<255)return toneGroups[5];return toneGroups[4];
}
const catalog=p=>p.catalogId||p.provenance?.catalogId||'';
// Cross-account ownership requires a catalogue ID, barcode or complete brand/range/reference.
// A personal ID or a similar colour is never evidence of a shared product.
export function sameReference(a,b,{local=false}={}){if(!a||!b||a.conceptual||b.conceptual)return false;if(local&&a.id!=null&&b.id!=null&&String(a.id)===String(b.id))return true;if(catalog(a)&&catalog(b))return String(catalog(a))===String(catalog(b));const codes=productBarcodes(a);if(codes.length&&productBarcodes(b).some(v=>codes.includes(v)))return true;return Boolean(a.brand&&b.brand&&a.reference&&b.reference&&canonicalBrand(a.brand)===canonicalBrand(b.brand)&&identityText(a.reference)===identityText(b.reference)&&identityText(a.collection)===identityText(b.collection));}
export function usageFor(product,entries=[]){const poses=entries.filter(e=>(e.products||[]).some(p=>sameReference(product,p,{local:true})));const unique=[...new Map(poses.map(p=>[p.remoteId||p.id,p])).values()].sort((a,b)=>(b.date||b.performedOn||'').localeCompare(a.date||a.performedOn||''));return {count:unique.length,last:unique[0]?.date||unique[0]?.performedOn||null,poses:unique};}
export function withUsage(items,entries){return items.map(p=>({...p,shelfUsage:usageFor(p,entries)}));}
const name=p=>String(p.name||'');
const stamp=p=>{const v=p.createdAt??p.addedAt??p.created_at;return typeof v==='number'?v:Date.parse(v)||0;};
function lightness(p){const h=shelfColor(p);return h?[1,3,5].reduce((s,i)=>s+parseInt(h.slice(i,i+2),16)*({1:.2126,3:.7152,5:.0722})[i],0):0;}
export function sortShelf(items,sort='color'){const order=new Map(items.map((p,i)=>[p,i]));return [...items].sort((a,b)=>{let n=0;if(sort==='color')n=toneGroups.indexOf(toneOf(a))-toneGroups.indexOf(toneOf(b))||lightness(b)-lightness(a);else if(sort==='used')n=(b.shelfUsage?.count||0)-(a.shelfUsage?.count||0);else if(sort==='recent')return stamp(b)-stamp(a)||order.get(b)-order.get(a);else if(sort==='brand')n=(a.brand||'').localeCompare(b.brand||'','fr');else if(sort==='finish')n=(a.finish||'').localeCompare(b.finish||'','fr');return n||name(a).localeCompare(name(b),'fr',{numeric:true});});}
