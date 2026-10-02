import {TAXONOMY} from './social/tagTaxonomy.js';
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const techniqueAliases = {
 'velvet magnetique':'velvet-magnetic','cat eye':'cat-eye',encapsule:'encapsulated',
  french: 'french', 'micro french': 'micro-french', 'reverse french': 'reverse-french', 'double french': 'double-french', 'side french': 'side-french', 'deep french': 'deep-french', 'v french': 'v-french',
  leopard: 'leopard', 'leopard print': 'leopard',
  tortoiseshell: 'tortoiseshell', tortoise: 'tortoiseshell', crocodile: 'crocodile', 'snake print': 'snake', 'cow print': 'cow', zebra: 'zebra',
  'blooming gel': 'blooming', blooming: 'blooming', watercolor: 'blooming', airbrush: 'aura',
  'chrome powder': 'chrome', chrome: 'chrome', 'glazed nails': 'glazed', foil: 'foil', flakes: 'flakes',
  'cat eye magnetic': 'cat-eye', 'cat-eye magnetic': 'cat-eye', 'velvet nails': 'velvet-magnetic',
  'aura nails': 'aura', aura: 'aura', '3d gel': 'gel-3d', 'gel 3d': 'gel-3d', encapsulated: 'encapsulated',
  strass: 'rhinestones', charms: 'charms', 'jelly nails': 'jelly', 'syrup nails': 'jelly', 'glass nails': 'glass-nails', 'milky nails': 'milky', 'soap nails': 'milky',
  marble: 'marble', marbre: 'marble', zebre: 'zebra', pois: 'dots', 'line art': 'line', freehand: 'line', 'one stroke': 'one-stroke', 'dot art': 'dots', 'accent nail': 'accent', 'duo alterne': 'duo',
  babyboomer: 'babyboomer', ombre: 'ombre', degrade: 'ombre', 'color block': 'color-block', 'negative space': 'negative-space', 'half moon': 'half-moon', ruffian: 'ruffian', 'outline nails': 'outline', 'skittle nails': 'skittle', 'mix & match': 'mix-match', monochrome: 'monochrome', 'ton sur ton': 'monochrome', 'gradient nails': 'ombre', stamping: 'stamping',
};

export const canonicalTechnique=value=>techniqueAliases[norm(value)]||norm(value);
// Shared reference data: every existing technique resolves to one executable visual family.
const definitions={
 'monochrome':[0,0,'layout'],accent:[0,3,'layout'],duo:[0,5,'layout'],skittle:[0,8,'layout'],'mix-match':[2,12,'layout'],
 milky:[0,0,'material'],jelly:[0,3,'material'],foil:[0,5,'finish'],flakes:[0,5,'finish'],rhinestones:[0,5,'decoration'],dots:[0,5,'drawing'],
 french:[1,15,'french'],'micro-french':[1,12,'french'],'side-french':[1,15,'french'],'deep-french':[1,18,'french'],'v-french':[1,18,'french'],
 'reverse-french':[2,20,'french'],'double-french':[2,22,'french'],
 babyboomer:[1,15,'gradient'],ombre:[1,12,'gradient'],aura:[1,12,'gradient'],blooming:[1,12,'wet'],
 chrome:[1,10,'finish'],glazed:[1,8,'finish'],'cat-eye':[1,10,'magnetic'],'velvet-magnetic':[1,15,'magnetic'],
 'gel-3d':[2,25,'sculpture'],encapsulated:[2,25,'sculpture'],'one-stroke':[2,25,'drawing'],
 charms:[1,10,'decoration'],'glass-nails':[1,12,'material'],marble:[1,15,'wet'],line:[1,12,'drawing'],
 'color-block':[1,12,'drawing'],'negative-space':[1,15,'drawing'],'half-moon':[1,12,'drawing'],ruffian:[1,15,'drawing'],outline:[1,15,'drawing'],
 stamping:[1,10,'stamp'],leopard:[1,15,'drawing'],cow:[1,12,'drawing'],zebra:[1,15,'drawing'],
 tortoiseshell:[2,22,'wet'],crocodile:[2,22,'wet'],snake:[2,22,'wet'],
};
const equipment={french:['Pinceau liner'],drawing:['Pinceau détail'],gradient:['Éponge nail art'],magnetic:['Aimant Cat Eye','Lampe UV/LED'],sculpture:['Lampe UV/LED'],wet:['Lampe UV/LED'],stamp:['Tampon stamping','Plaques stamping','Raclette stamping']};
export function techniqueRule(value){const id=canonicalTechnique(value),row=definitions[id];if(!row)return null;return {id,difficulty_min:row[0],minutes:row[1],group:row[2],difficulty_weight:1,requirements:equipment[row[2]]||[],requiresGel:['gel-3d','encapsulated','blooming'].includes(id)};}
export const techniqueReference=TAXONOMY.techniques.map(label=>({label,...techniqueRule(label)}));
export function compatibleTechniques(values){const rules=values.map(techniqueRule);if(rules.some(r=>!r))return false;
 const groups=rules.map(r=>r.group),ids=rules.map(r=>r.id);
 if(new Set(ids).size!==ids.length)return false;
 // One geometry, one wet recipe, one magnetic finish. Distinct nails remain possible through a deliberate manual mix.
 for(const group of ['french','layout','wet','magnetic','sculpture','gradient','material'])if(groups.filter(g=>g===group).length>1)return false;
 if(ids.includes('monochrome')&&ids.length>1)return false;
 if(groups.includes('wet')&&groups.includes('magnetic'))return false;
 if(ids.includes('encapsulated')&&groups.includes('wet'))return false;
 return true;
}
const owned=(items,name)=>items.some(item=>item.type==='Matériel'&&Number(item.quantity??1)>0&&(
 /lampe/.test(norm(name))?/lampe/.test(norm(item.name+' '+item.equipmentCategory)):
 /pinceau/.test(norm(name))?/liner|detail|fin/.test(norm(item.name+' '+item.toolSubtype)):
 norm(item.name)===norm(name)||norm(item.name).includes(norm(name).split(' ')[0])));
export function eligibleTechniques(options={},items=[]){const level=Number(options.level)||0,minutes=Number(options.duration)||45,constraints=options.constraints||[];
 return techniqueReference.filter(r=>r.id&&r.difficulty_min<=level&&15+r.minutes<=minutes&&
 !(constraints.includes('noDrawing')&&['drawing','french'].includes(r.group))&&
 !(options.intent==='collection'&&r.requiresGel&&!items.some(p=>['Semi-permanent','Gel'].includes(p.type)&&Number(p.quantity??1)>0))&&
 !(constraints.includes('noLamp')&&['wet','magnetic','sculpture'].includes(r.group))&&
 (!options.useOwnedEquipment||r.requirements.every(name=>owned(items,name))));
}
const hash=(value,seed)=>{let h=(seed+1)>>>0;for(const c of value)h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0)/4294967296;};
export function surpriseTechniques(options={},items=[],history=[],seed=1){
 const eligible=eligibleTechniques(options,items),level=Number(options.level)||0,max=level===0?1:level===1?2:3;
 // Least seen first, then a seeded shuffle. Aliases share the same history weight.
 const recent=history.slice(-12),counts=new Map();for(const run of recent)for(const value of run) {const id=canonicalTechnique(value);counts.set(id,(counts.get(id)||0)+1);}
 const sorted=[...eligible].sort((a,b)=>(counts.get(a.id)||0)-(counts.get(b.id)||0)||hash(a.label,seed)-hash(b.label,seed));
 const wanted=1+Math.floor(hash('count',seed)*max),chosen=[];
 for(const row of sorted){if(chosen.length>=wanted)break;if(!compatibleTechniques([...chosen,row.label]))continue;
 if(15+[...chosen,row.label].reduce((sum,label)=>sum+techniqueRule(label).minutes,0)>Number(options.duration||45))continue;
 chosen.push(row.label);}
 return chosen;
}
export function updateTechniqueChoice(previous,patch,items=[],history=[],seed=1){const next={...previous,...patch};
 if(next.techniquesSource==='auto'&&['level','duration','constraints','useOwnedEquipment'].some(key=>Object.hasOwn(patch,key)))next.techniques=surpriseTechniques(next,items,history,seed);
 return next;
}
export function techniqueWarnings(options={}){const rules=(options.techniques||[]).map(techniqueRule).filter(Boolean),warnings=[];
 if(rules.some(r=>r.difficulty_min>Number(options.level||0)))warnings.push('Une technique choisie demande un niveau supérieur. Tes choix sont conservés : ajuste le niveau ou la sélection.');
 if(15+rules.reduce((sum,r)=>sum+r.minutes,0)>Number(options.duration||45))warnings.push('Ces techniques demandent plus de temps que la durée choisie.');
 return warnings;
}
