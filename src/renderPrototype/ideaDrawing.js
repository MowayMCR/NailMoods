import {tint,shapes} from './material.js';
const aliases={'monochrome':'gloss','accent':'gloss','duo':'gloss','skittle':'gloss','mix-match':'gloss','tortoiseshell':'tortoise','velvet-magnetic':'velvet','glass-nails':'glass','rhinestones':'strass','babyboomer':'ombre','encapsulated':'glass'};
export const drawnTechniques=new Set(['gloss','line','french','micro-french','reverse-french','double-french','v-french','side-french','deep-french','ombre','aura','blooming','cat-eye','velvet','chrome','glazed','jelly','glass','milky','marble','tortoise','leopard','foil','flakes','glitter','strass','gel-3d','line-simple','dots','flowers','hearts','bow','half-moon','ruffian','outline','color-block','negative-space','one-stroke','charms','stamping','aurora-holographic','cow','zebra','crocodile','snake']);
export const tipDrawings=new Set(['french','micro-french','reverse-french','double-french','v-french','side-french','deep-french']);
const normal=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function drawingTechnique(value){return aliases[value]||value||'gloss';}
export function drawingShape(value){const v=normal(value);return shapes.find(s=>v.includes(normal(s)))||(/coffin|ballerin/.test(v)?'Ballerine':/almond/.test(v)?'Amande':/square/.test(v)?'Carrée':'Ovale');}
export function drawingLength(value){return normal(value)==='xl'?'XL':/tres courte|very short/.test(normal(value))?'Très courte':/court|short/.test(normal(value))?'Courte':/long/.test(normal(value))?'Longue':'Moyenne';}
export function drawnNailSettings(nail,idea={}){
 const base=/^#[0-9a-f]{6}$/i.test(nail.color||'')?nail.color:'#b88699';
 const accent=/^#[0-9a-f]{6}$/i.test(nail.accentColor||'')?nail.accentColor:tint(base,'#fff6eb',.55);
 const finish=normal(nail.finish+' '+nail.effect);
 let technique=nail.technique;
 if(!technique){technique=/cat.?eye|magnetique/.test(finish)?'cat-eye':/paillet/.test(finish)?'glitter':/chrome/.test(finish)?'chrome':/holograph|irise|nacre/.test(finish)?'glazed':'gloss';}
 const mapped=drawingTechnique(technique),tip=tipDrawings.has(nail.drawing)?nail.drawing:tipDrawings.has(mapped)?mapped:undefined;
 return {base,accent,shape:drawingShape(idea.shape),length:drawingLength(idea.length),technique:tipDrawings.has(mapped)?'gloss':drawnTechniques.has(mapped)?mapped:'gloss',legacyTechnique:drawnTechniques.has(mapped)?undefined:technique,frenchVariant:tip,tipTechnique:nail.drawingTechnique?drawingTechnique(nail.drawingTechnique):undefined,withGlassMotif:false,matte:normal(nail.finish)==='mat'};
}
