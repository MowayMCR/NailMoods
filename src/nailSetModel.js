import {productColor} from './colorAnalysis.js';
import {selectedTechniques} from './creationEngine.js';

export const fallback=['#f4d8d0','#813c60','#c99073','#d7ae58','#718d82','#ffffff','#252326'];
export const manualTechniques=['','french','aura','blooming','chrome','glazed','marble','leopard','tortoiseshell','gel-3d','dots','line'];
export const techniqueLabels={french:'French',aura:'Aura',blooming:'Blooming',chrome:'Chrome',glazed:'Glazed',marble:'Marbré',leopard:'Léopard',tortoiseshell:'Tortoise','gel-3d':'Gel 3D',dots:'Pois',line:'Line art'};
const frenchTechniques=new Set(['french','micro-french','reverse-french','double-french','side-french','deep-french','v-french']);
export const hasDecorColor=technique=>Boolean(technique&&!['chrome','glazed','jelly','milky','glass-nails'].includes(technique));
export const decorColorLabel=technique=>frenchTechniques.has(technique)?'Couleur du bout French':technique==='marble'?'Couleur des veines':technique==='leopard'?'Couleur des taches':'Couleur du décor';
export const colorItem=(item,index)=>({id:item?.id||`color-${index}`,name:item?.name||'Couleur d’inspiration',color:productColor(item),productId:item?.id||null});
const inspirationColor=color=>({id:`inspiration-${color.slice(1)}`,name:'Couleur d’inspiration',color,productId:null});

export function manualColors(items=[]){
  const collection=items.filter(item=>item.type!=='Matériel'&&productColor(item)).slice(0,18).map(colorItem);
  const choices=new Map();
  for(const item of [...collection,...fallback.map(inspirationColor)])if(!choices.has(item.color.toLowerCase()))choices.set(item.color.toLowerCase(),item);
  return [...choices.values()];
}

export function contrastingColor(color,colors=manualColors()){
  const channels=value=>[1,3,5].map(index=>parseInt(value.slice(index,index+2),16));
  const base=channels(color);
  const distance=value=>channels(value).reduce((sum,channel,index)=>sum+(channel-base[index])**2,0);
  return colors.filter(item=>item.color.toLowerCase()!==color.toLowerCase()).sort((a,b)=>distance(b.color)-distance(a.color))[0]||inspirationColor('#ffffff');
}

export function updateNail(nail,change,colors=manualColors()){
  const next={...nail,...change};
  if(change.technique!==undefined){
    next.drawing=frenchTechniques.has(change.technique)?change.technique:null;
    next.techniques=change.technique?[change.technique]:[];
    if(hasDecorColor(change.technique)&&(!next.accentColor||next.accentColor.toLowerCase()===next.color.toLowerCase())){
      const accent=contrastingColor(next.color,colors);
      next.accentColor=accent.color;next.accentProductId=accent.productId;next.accentName=accent.name;
    }
  }
  return next;
}

export function initialNailSet(items=[]){
  const colors=manualColors(items),collection=colors.filter(choice=>choice.productId),palette=(collection.length?collection:colors).slice(0,5);
  return Array.from({length:5},(_,index)=>{
    const item=palette[index%palette.length],accent=contrastingColor(item.color,colors);
    return {id:index,color:item.color,productId:item.productId,colorName:item.name,technique:'',drawing:null,accentColor:accent.color,accentProductId:accent.productId,accentName:accent.name,finish:'Brillant',techniques:[]};
  });
}

export function suggestedTechnique(options={}){return selectedTechniques(options)[0]||'french';}

export function setIdea(nails,profile={},options={}){
  const palette=new Map();
  function addColor(color,productId,name){
    const id=productId||`inspiration-${color.slice(1).toLowerCase()}`;
    palette.set(String(id),{id,name:name||(productId?'Couleur de ma collection':'Couleur d’inspiration'),color,...(!productId?{conceptual:true}:{})});
    return id;
  }
  const savedNails=nails.map(nail=>({...nail,
    productId:addColor(nail.color,nail.productId,nail.colorName),
    accentProductId:hasDecorColor(nail.technique)?addColor(nail.accentColor,nail.accentProductId,nail.accentName):null,
    drawing:frenchTechniques.has(nail.technique)?nail.technique:null,
    techniques:nail.technique?[nail.technique]:[],
  }));
  return {id:`set-${crypto.randomUUID()}`,title:'Ma composition doigt par doigt',description:'Composition manuelle, à adapter selon tes produits et ton matériel.',shape:profile.shape||'Amande',length:profile.length||'Courte',rank:2,minutes:Number(options.duration)||45,polishCount:palette.size,palette:[...palette.values()],nails:savedNails,resources:[],requirements:[],reasons:['Composition créée doigt par doigt','Couleurs de base et de décor indépendantes'],options:{...options,intent:options.intent||'collection',manualSet:true},intent:'manual'};
}
