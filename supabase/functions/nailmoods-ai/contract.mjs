// Shared, dependency-free contract. Product identities are resolved against owned rows.
export const SHAPES=['Amande','Carrée','Ovale','Ronde','Coffin / Ballerine','Stiletto'];
export const LENGTHS=['Très courte','Courte','Moyenne','Longue','XL'];
export const TECHNIQUES=['','french','micro-french','reverse-french','double-french','side-french','deep-french','v-french','leopard','tortoiseshell','crocodile','snake','cow','zebra','blooming','chrome','glazed','foil','flakes','cat-eye','velvet-magnetic','aura','gel-3d','encapsulated','rhinestones','charms','jelly','glass-nails','milky','marble','line','one-stroke','dots','babyboomer','ombre','color-block','negative-space','half-moon','ruffian','outline','skittle','mix-match','monochrome','accent','duo'];
export const MOTIFS=['','flower','star','moon','leaf','heart','winged-orb'];
export const MOODS=['soft-glam','dark-feminine','cottagecore','pop-pastel'];
export const ACTIONS=['compose','edit','tutorial','share','chat'];
export const CONCEPT_COLORS=[['cassis','#813c60'],['nude','#e9c6b5'],['gold','#cba358'],['green','#668878'],['rose','#d39ca7'],['blue','#6674a2'],['plum','#583b65'],['white','#f4eee7'],['brown','#75462f'],['terracotta','#b5644a'],['burgundy','#7a1828'],['black','#191619']].map(([id,color])=>({id:'concept-'+id,name:'Couleur d’inspiration · '+id,color,verified:false,conceptual:true}));
const obj=properties=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const str={type:'string'},nullableEnum=values=>({type:['string','null'],enum:[...values,null]});
export const PLAN_SCHEMA=obj({action:{type:'string',enum:ACTIONS},message:str,title:str,shape:nullableEnum(SHAPES),length:nullableEnum(LENGTHS),level:{type:'integer',enum:[0,1,2]},collectionOnly:{type:'boolean'},editFinger:{type:['integer','null'],enum:[0,1,2,3,4,null]},nails:{type:'array',items:obj({finger:{type:'integer',enum:[0,1,2,3,4]},productId:str,accentProductId:{type:['string','null']},technique:{type:'string',enum:TECHNIQUES},drawingTechnique:{type:'string',enum:TECHNIQUES},motif:{type:'string',enum:MOTIFS},designBrief:{type:'string',maxLength:280}})}});
export const TRENDS_SCHEMA=obj({message:str,cards:{type:'array',minItems:3,maxItems:3,items:obj({summary:str,sourceUrl:str,plan:{...PLAN_SCHEMA,properties:{...PLAN_SCHEMA.properties,action:{type:'string',enum:['compose']},nails:{...PLAN_SCHEMA.properties.nails,minItems:5,maxItems:5}}}})}});
export function validatePlan(value,products,{collectionOnly=false}={}){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join()!=PLAN_SCHEMA.required.slice().sort().join())throw Error('invalid_plan');
 if(!ACTIONS.includes(value.action)||typeof value.message!=='string'||value.message.length>5000||typeof value.title!=='string'||value.title.length>100||![null,...SHAPES].includes(value.shape)||![null,...LENGTHS].includes(value.length)||![0,1,2].includes(value.level)||typeof value.collectionOnly!=='boolean'||![null,0,1,2,3,4].includes(value.editFinger)||!Array.isArray(value.nails))throw Error('invalid_plan');
 const allowed=new Set(products.filter(p=>!(collectionOnly||value.collectionOnly)||!p.conceptual).map(p=>String(p.id)));
 if(value.nails.length!==(['compose','edit'].includes(value.action)?value.action==='edit'?1:5:0))throw Error('invalid_plan');
 const seen=new Set();for(const n of value.nails){
 if(!n||!['accentProductId,drawingTechnique,finger,motif,productId,technique','accentProductId,designBrief,drawingTechnique,finger,motif,productId,technique'].includes(Object.keys(n).sort().join())||![0,1,2,3,4].includes(n.finger)||seen.has(n.finger)||!allowed.has(n.productId)||(n.accentProductId!==null&&!allowed.has(n.accentProductId))||!TECHNIQUES.includes(n.technique)||!TECHNIQUES.includes(n.drawingTechnique)||!MOTIFS.includes(n.motif)||(n.designBrief!==undefined&&(typeof n.designBrief!=='string'||n.designBrief.length>280)))throw Error('unknown_product_or_invalid_nail');seen.add(n.finger);
 }
 if(value.action==='edit'&&(value.editFinger===null||value.nails[0].finger!==value.editFinger))throw Error('invalid_edit');
 return {...value,collectionOnly:collectionOnly||value.collectionOnly};
}
export const uuid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
export function validateRequest(b){
 if(!b||typeof b!=='object'||Array.isArray(b))throw Error('invalid_request');
 const keys=['requestId','threadId','workspaceId','operation','prompt','collectionOnly','shape','length','mood','referenceImage','composition','consent'];
 if(Object.keys(b).some(k=>!keys.includes(k))||![b.requestId,b.threadId,b.workspaceId].every(uuid)||!['conversation','trends','realistic','illustration','vision'].includes(b.operation)||typeof b.prompt!=='string'||!b.prompt.trim()||b.prompt.length>3000||b.consent!==true||typeof b.collectionOnly!=='boolean'||!SHAPES.includes(b.shape)||!LENGTHS.includes(b.length)||(b.mood!==undefined&&!MOODS.includes(b.mood)))throw Error('invalid_request');
 if(b.referenceImage!==undefined&&(typeof b.referenceImage!=='string'||b.referenceImage.length>1400000))throw Error('invalid_reference');
 if(b.composition!==undefined&&JSON.stringify(b.composition).length>12000)throw Error('invalid_composition');
 return b;
}
export function publicProducts(rows){return rows.slice(0,100).map(r=>({id:String(r.metadata?.nailmoods?.id??r.id),name:String(r.shade_name||'Ma couleur').slice(0,100),brand:String(r.brand||'').slice(0,80),reference:String(r.reference||'').slice(0,80),color:/^#[a-f0-9]{6}$/i.test(r.hex||'')?r.hex:null,verified:r.is_verified===true,conceptual:false}));}
export function safeSources(response,now=new Date().toISOString()){
 const map=new Map();const add=a=>{try{const u=new URL(a.url);if(u.protocol!=='https:'||u.username||u.password)return;map.set(u.href,{url:u.href,title:String(a.title||u.hostname).slice(0,200),accessedAt:now,publishedAt:null});}catch{}};
 for(const item of response.output||[]){for(const part of item.content||[])for(const a of part.annotations||[]){if(a.type==='url_citation')add(a);}if(item.type==='web_search_call')for(const a of item.action?.sources||[])add(a);}
 return [...map.values()].slice(0,30);
}
