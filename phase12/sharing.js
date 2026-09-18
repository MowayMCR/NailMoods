import { productColor, validHex } from '../src/colorAnalysis.js';
import { validIdea } from '../src/inspirations.js';
import { buildTutorial } from '../src/tutorial.js';

// The future server must apply the same allowlist before any public publication
// or direct share. An inspiration snapshot is NOT a copy of the user's records.
const text=(value,max=120)=>typeof value==='string'?value.slice(0,max):'';
const strings=(values,max=20)=>Array.isArray(values)?values.filter(v=>typeof v==='string').slice(0,max).map(v=>text(v,120)):[];
export function shareableInspiration(idea) {
  if(!validIdea(idea))throw new Error('Inspiration invalide.');
  const productIds=new Map(idea.palette.map((p,i)=>[String(p.id),'color-'+i]));
  const resources=idea.resources.map((p,i)=>({id:'resource-'+i,name:text(p.name),type:text(p.type),equipmentCategory:text(p.equipmentCategory),materialStyle:text(p.materialStyle),decorationTags:strings(p.decorationTags)}));
  return {
    version:1,title:text(idea.title),pattern:text(idea.pattern),shape:text(idea.shape),length:text(idea.length),
    mood:text(idea.options?.mood),style:text(idea.options?.style),
    palette:idea.palette.map(p=>({id:productIds.get(String(p.id)),name:text(p.name),brand:text(p.brand),reference:text(p.reference),type:text(p.type),color:productColor(p),finish:text(p.finish),effect:text(p.effect),unpainted:p.unpainted===true})),
    nails:idea.nails.map(n=>({productId:productIds.get(String(n.productId)),color:validHex(n.color)?n.color.toLowerCase():productColor(idea.palette.find(p=>String(p.id)===String(n.productId))),...(n.accentProductId!=null?{accentProductId:productIds.get(String(n.accentProductId)),accentColor:validHex(n.accentColor)?n.accentColor.toLowerCase():productColor(idea.palette.find(p=>String(p.id)===String(n.accentProductId)))}:{}),drawing:text(n.drawing),decoration:text(n.decoration),finish:text(n.finish)})),
    resources,
    steps:buildTutorial(idea).filter(s=>!s.hand||s.hand==='left').map(s=>({title:text(s.title,200),body:text(s.body,2000),hint:text(s.hint,500)})),
  };
}
