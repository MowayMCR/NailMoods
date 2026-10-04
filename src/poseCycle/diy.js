import {preciseShade,validHex} from '../colorAnalysis.js';
import {colorDistance} from '../photoInspiration.js';
import {productKind} from '../productKinds.js';
import {canonicalTechnique,techniqueRule} from '../techniqueRules.js';
import {validIdea} from '../inspirations.js';
import {buildTutorial} from '../tutorial.js';

const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const unique=values=>[...new Set(values.filter(Boolean))];
export const DIY_STATES={owned:['✓','Je possède'],near:['≈','Teinte proche'],missing:['−','Il me manque'],check:['?','À vérifier']};
export const diyColor=p=>p?.colorSource==='palette'&&!p.catalogColorValidated&&!p.conceptual?'':preciseShade(p)||(p?.conceptual&&validHex(p.color)?p.color.toLowerCase():'');
const catalogId=p=>p.catalogId||p.provenance?.catalogId;
const finish=p=>norm([p.finishDetail||p.finish,(!['aucun','none',''].includes(norm(p.effect)))?p.effect:''].filter(Boolean).join(' '));
const opacity=p=>norm(p.opacity||p.coverage);
const family=p=>[norm(p.type),norm(productKind(p))].join(':');
const stocked=p=>Number(p.quantity??1)>0;
function exactReference(a,b){
 if(a.conceptual||b.conceptual)return false;
 if(a.id!=null&&b.id!=null&&String(a.id)===String(b.id))return true;
 if(catalogId(a)&&catalogId(b)&&catalogId(a)===catalogId(b))return true;
 return Boolean(a.brand&&a.reference&&b.brand&&b.reference&&norm(a.brand)===norm(b.brand)&&norm(a.reference)===norm(b.reference)&&norm(a.collection)===norm(b.collection));
}
function changed(a,b){return family(a)!==family(b)||(diyColor(a)&&diyColor(b)&&diyColor(a)!==diyColor(b))||(finish(a)&&finish(b)&&finish(a)!==finish(b))||(opacity(a)&&opacity(b)&&opacity(a)!==opacity(b));}
export function compareProduct(target,collection=[]){
 const owned=collection.filter(stocked).filter(p=>!p.conceptual),exact=owned.find(p=>exactReference(target,p));
 if(exact)return {state:changed(target,exact)?'check':'owned',matches:[exact],reason:changed(target,exact)?'Cette référence a changé dans ta Collection. Vérifie sa fiche.':'Référence présente dans ta Collection.',unknown:[]};
 const color=diyColor(target);
 const matches=target.type!=='Matériel'&&productKind(target)==='Couleur'&&color?owned.filter(p=>p.type!=='Matériel'&&p.type&&target.type&&family(p)===family(target)&&diyColor(p)&&finish(target)&&finish(p)===finish(target)&&!(opacity(target)&&opacity(p)&&opacity(target)!==opacity(p)))
  .map(p=>({p,distance:colorDistance(color,diyColor(p))})).filter(x=>x.distance<=.075).sort((a,b)=>a.distance-b.distance||String(a.p.id).localeCompare(String(b.p.id))).slice(0,3).map(x=>x.p):[];
 if(matches.length)return {state:'near',matches,reason:'Couleur proche et finition renseignée identique. La famille de produit est la même.',unknown:(!opacity(target)||matches.some(p=>!opacity(p)))?['Opacité non renseignée : résultat à vérifier.']:[]};
 return {state:'missing',matches:[],reason:color?'Aucune référence ni teinte proche suffisamment renseignée dans ta Collection.':'Aucune référence retrouvée. La teinte précise manque pour rechercher une alternative.',unknown:[]};
}
const tools={
 liner:{label:'Pinceau liner',category:'Pinceau',detail:/liner|fin|detail/},
 detail:{label:'Pinceau détail',category:'Pinceau',detail:/detail|fin|liner/},
 dots:{label:'Dotting tool',category:'Dotting tool'},
 magnet:{label:'Aimant Cat Eye',category:'Aimant cat-eye'},
 lamp:{label:'Lampe UV / LED',category:'Lampe UV / LED'},
 sponge:{label:'Éponge nail art',category:'Éponge'},
 stamp:{label:'Tampon stamping',category:'Stamping',detail:/tampon/},
 plates:{label:'Plaques stamping',category:'Stamping',detail:/plaque/},
 scraper:{label:'Raclette stamping',category:'Stamping',detail:/raclette/},
};
function toolKey(name){const s=norm(name);return /dotting|outil.*pois/.test(s)?'dots':/pinceau.*liner/.test(s)?'liner':/pinceau.*(detail|fin)/.test(s)?'detail':/aimant/.test(s)?'magnet':/lampe/.test(s)?'lamp':/eponge/.test(s)?'sponge':/tampon/.test(s)?'stamp':/plaque.*stamping/.test(s)?'plates':/raclette/.test(s)?'scraper':null;}
function compareTool(key,collection){const tool=tools[key],matches=collection.filter(p=>stocked(p)&&p.type==='Matériel'&&norm(p.equipmentCategory)===norm(tool.category)&&(!tool.detail||tool.detail.test(norm([p.toolSubtype,p.name,p.reference].join(' ')))));
 return {id:'tool:'+key,label:tool.label,kind:'tool',state:matches.length?'owned':'missing',matches,unknown:[],reason:matches.length?'Type de matériel présent. Vérifie qu’il convient au protocole de tes produits.':'Matériel non identifié dans ta Collection.'};}
export function diyChecklist(idea,collection=[]){
 if(!validIdea(idea))throw Error('Cette inspiration ne contient pas de recette exploitable.');
 const products=[...new Map([...idea.palette,...idea.resources].filter(p=>!p.unpainted).map(p=>[String(p.id),p])).values()];
 const techniques=unique([...(idea.techniques||[]),...(idea.options?.techniques||[]),...idea.nails.map(n=>n.drawing).filter(t=>t!=='plain')]).map(canonicalTechnique);
 const needed=new Set(),notes=[];
 const usesLamp=products.some(p=>['Gel','Semi-permanent'].includes(p.type));
 for(const t of techniques)for(const name of techniqueRule(t)?.requirements||[]){const key=toolKey(name);if(key&&key!=='lamp')needed.add(key);}
 // Dots use a dotting tool, not the generic drawing brush from the style taxonomy.
 if(techniques.includes('dots')){needed.add('dots');if(!techniques.some(t=>t!=='dots'&&techniqueRule(t)?.group==='drawing'))needed.delete('detail');}
 if(usesLamp)needed.add('lamp');
 if(products.some(p=>/cat.?eye|magnetique|avec aimant/.test(norm([p.finish,p.effect,p.usage].join(' ')))))needed.add('magnet');
 for(const requirement of idea.requirements||[]){const name=typeof requirement==='string'?requirement:requirement.name;if(!name)continue;const key=toolKey(name);if(key&&(key!=='lamp'||usesLamp))needed.add(key);else notes.push(name);}
 const rows=products.map(p=>({id:'product:'+p.id,label:p.name,kind:p.type==='Matériel'?'resource':'product',target:p,...compareProduct(p,collection)}));
 for(const key of needed){const matchingResource=products.find(p=>p.type==='Matériel'&&toolKey(p.equipmentCategory+' '+p.name)===key);if(!matchingResource)rows.push(compareTool(key,collection));}
 const partial=unique(techniques.filter(t=>!['monochrome','accent','duo','skittle','french','line','dots'].includes(t)));
 return {rows,techniques:unique(techniques),notes:unique(notes),partial,steps:buildTutorial(idea),counts:Object.fromEntries(Object.keys(DIY_STATES).map(state=>[state,rows.filter(r=>r.state===state).length]))};
}
