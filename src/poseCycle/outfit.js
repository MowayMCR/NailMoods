import {analysePhotoPixels,colorDistance} from '../photoInspiration.js';
import {productColor,validHex} from '../colorAnalysis.js';
import {auxiliary} from '../creationEngine.js';
import {snapshotIdea} from '../inspirations.js';
import {newProject,newPlanItem,validateProject} from './model.js';
export const OUTFIT_MODES=[['match','Assorti'],['contrast','Contraste'],['quiet','Discret'],['bold','Audacieux'],['surprise','Surprends-moi']];
const rgb=c=>[1,3,5].map(i=>parseInt(c.slice(i,i+2),16));
const hex=v=>'#'+v.map(x=>Math.round(Math.max(0,Math.min(255,x))).toString(16).padStart(2,'0')).join('');
const blend=(a,b,t)=>hex(rgb(a).map((x,i)=>x*(1-t)+rgb(b)[i]*t));
const opposite=c=>hex(rgb(c).map(x=>255-x));
export function analyzeOutfitPixels(pixels){
 const a=analysePhotoPixels(pixels);const lights=a.colors.map(c=>rgb(c).reduce((v,n,i)=>v+n*[.2126,.7152,.0722][i],0)/255);return {version:1,colors:a.colors,contrast:Math.round((Math.max(...lights)-Math.min(...lights))*100),ambience:a.metrics.luminosity<.35?'Profonde':a.metrics.saturation>.45?'Colorée':'Douce',confidence:'indicative'};
}
export function outfitProducts(items=[]){return items.filter(p=>['Vernis','Semi-permanent','Gel'].includes(p.type)&&!auxiliary(p)&&Number(p.quantity??1)>0&&validHex(p.confirmedColor||p.shade||p.color));}
export function outfitDirections({analysis,mode='match',collectionOnly=false,items=[],profile={},seed=0}){
 if(!analysis?.colors?.length||!analysis.colors.every(validHex))throw Error('Importe une photo analysable.');
 if(!OUTFIT_MODES.some(([v])=>v===mode))throw Error('Choisis une façon de l’assortir.');
 const colors=analysis.colors,primary=colors[0],secondary=colors[1]||blend(primary,'#ffffff',.45),contrast=opposite(primary);
 const sets={match:[secondary,contrast,blend(primary,'#ffffff',.25)],contrast:[contrast,opposite(secondary),blend(contrast,'#25212c',.3)],quiet:[blend(primary,'#f4eee7',.7),blend(secondary,'#f4eee7',.7),blend(primary,'#d4bab6',.55)],bold:[blend(primary,'#391e32',.3),contrast,secondary],surprise:[opposite(secondary),blend(primary,contrast,.35),colors[(seed+2)%colors.length]]};
 const targets=sets[mode],owned=outfitProducts(items);
 if(collectionOnly&&!owned.length)throw Error('Aucune couleur renseignée dans ta Collection. Ajoute un vernis avec une couleur, ou désactive « Avec ma Collection ».');
 return ['Rappel','Contraste','Interprétation'].map((direction,i)=>{
  const target=targets[i];const matched=owned.map(item=>({item,distance:colorDistance(target,productColor(item))})).sort((a,b)=>a.distance-b.distance)[0];
  const product=collectionOnly?structuredClone(matched.item):{id:'outfit-'+i+'-'+target.slice(1),name:'Couleur d’inspiration',color:target,confirmedColor:target,type:'Vernis',conceptual:true,finish:'Brillant'};
  const actual=productColor(product),drawing=['plain','french','dots'][i];
  const nails=Array.from({length:5},(_,index)=>({finger:['Pouce','Index','Majeur','Annulaire','Auriculaire'][index],productId:product.id,color:i===0?actual:'#ead2c8',accentProductId:i===0?null:product.id,accentColor:actual,drawing,finish:product.finish||'Brillant',style:'Libre'}));
  const idea=snapshotIdea({description:['Couleur unie','French colorée sur ongle naturel','Pois colorés sur ongle naturel'][i],title:[`Un rappel tout en couleur`,`Une French en contraste`,`Des points, à ta façon`][i],shape:profile.shape||'Amande',length:profile.length||'Courte',palette:[product],resources:[],nails,minutes:[20,35,30][i],rank:i===0?0:1,technique:['simple','french','dots'][i],reasons:[`${OUTFIT_MODES.find(([v])=>v===mode)[1]} · ${direction}`,i?'Motif sur ongle naturel, sans teinte de fond imposée':'Couleur unie sur les cinq ongles'],intent:'photos',options:{intent:'photos',mood:analysis.ambience,style:'Libre',level:i===0?0:1}});
  return {direction,idea,targetColor:target,match:collectionOnly?{label:matched.distance<.035?'Couleur correspondante':matched.distance<.26?'Teinte proche':'La plus proche dans ta Collection',distance:matched.distance}:null,tools:i===1?'Pinceau fin à prévoir':i===2?'Dotting tool ou outil à pois à prévoir':'Application au pinceau du vernis',note:collectionOnly?'Le HEX du produit est conservé. La proximité concerne la couleur, pas la compatibilité des systèmes.':'Palette indicative issue de la tenue ; aucune référence produit inventée.'};
 });
}
export function outfitProject({principal,id,proposal,analysis,mode,collectionOnly,crop,media,title}){
 const p=newProject({...principal,id,title:title||proposal.idea.title,idea:proposal.idea,source:'outfit'});
 p.details.outfitMedia=media;p.details.outfit={version:1,colors:analysis.colors,ambience:analysis.ambience,contrast:analysis.contrast,mode,collectionOnly,crop,direction:proposal.direction};return validateProject(p);
}
export function outfitEvent(project,{name,date,time='',location='',notes='',timezone=Intl.DateTimeFormat().resolvedOptions().timeZone}){
 if(!name.trim()||!date)throw Error('Donne un nom et une date à ton événement.');
 // Date-only is deliberate in lot 2; timezone-aware hour selection belongs to Planning.
 return newPlanItem(project,{title:name,kind:'event',date,timezone,location,notes});
}
