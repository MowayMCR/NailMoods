import {compareProduct,diyChecklist} from '../poseCycle/diy.js';
import {snapshotIdea,validIdea} from '../inspirations.js';
import {productColor} from '../colorAnalysis.js';
import {enrichIdeaRendering} from '../techniqueRendering.js';

// Preserve the composition and all original snapshots; use the existing DIY matcher.
export function adaptToCollection(idea,items) {
  if(!validIdea(idea))throw Error('Cette inspiration ne contient pas de recette exploitable.');
  const products=[...new Map([...idea.palette,...idea.resources].map(p=>[String(p.id),p])).values()];
  const comparisons=products.filter(p=>!p.unpainted).map(target=>({target,...compareProduct(target,items)}));
  const unresolved=comparisons.filter(row=>!['owned','near'].includes(row.state));
  if(unresolved.length)return {idea:null,comparisons,unresolved,checklist:null};
  const selected=new Map(comparisons.map(row=>[String(row.target.id),{...row.matches[0],color:productColor(row.matches[0]),conceptual:false}]));
  const resolve=id=>selected.get(String(id))||products.find(p=>p.unpainted&&String(p.id)===String(id));
  const changes=comparisons.filter(row=>row.state==='near').map(row=>({from:row.target.name,to:row.matches[0].name,reason:row.reason,unknown:row.unknown}));
  const unique=rows=>[...new Map(rows.map(p=>[String(p.id),p])).values()];
  const adapted=enrichIdeaRendering({...idea,key:undefined,id:undefined,isPublic:false,visibility:'private',isProject:false,publicMediaPath:null,remoteId:undefined,title:(idea.title+' · ma collection').slice(0,120),intent:'collection',
    palette:unique(idea.palette.map(p=>resolve(p.id))),resources:unique(idea.resources.map(p=>resolve(p.id))),
    nails:idea.nails.map(n=>({...n,productId:resolve(n.productId).id,color:resolve(n.productId).color,finish:resolve(n.productId).finish,effect:resolve(n.productId).effect,...(n.accentProductId!=null?{accentProductId:resolve(n.accentProductId).id,accentColor:resolve(n.accentProductId).color}:{})})),
    options:{...idea.options,intent:'collection',requiredColorIds:unique(idea.palette.map(p=>resolve(p.id))).map(p=>String(p.id)),inspirationPalette:[]},
    description:changes.length?'Une interprétation avec des teintes proches de ta collection.':'La composition retrouvée dans ta collection actuelle.',
    reasons:['Palette adaptée à ma collection',...idea.reasons].slice(0,3),adaptation:{sourceKey:idea.key,changes},createdAt:new Date().toISOString(),savedAt:new Date().toISOString()});
  delete adapted.collectionEvidence;
  const saved=snapshotIdea(adapted);if(!validIdea(saved))throw Error('Cette adaptation ne peut pas être enregistrée.');
  return {idea:saved,comparisons,unresolved,checklist:diyChecklist(saved,items)};
}
