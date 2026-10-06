// Editable drawing vocabulary for the isolated Create prototype.
export const shapes=['Ovale','Ronde','Amande','Carrée','Ballerine','Stiletto'];
export const techniques=[['gloss','Brillant'],['french','French'],['micro-french','Micro French'],['reverse-french','Reverse French'],['double-french','Double French'],['v-french','V-French'],['ombre','Dégradé'],['blooming','Blooming'],['aura','Aura'],['cat-eye','Cat Eye'],['velvet','Velvet'],['chrome','Chrome'],['glazed','Glazed'],['jelly','Jelly'],['glass','Glass'],['milky','Milky'],['marble','Marbre'],['tortoise','Écaille'],['leopard','Léopard'],['foil','Foil'],['flakes','Flakes'],['glitter','Paillettes'],['strass','Strass'],['gel-3d','Gel 3D'],['line','Line art'],['dots','Pois'],['flowers','Fleurs fines'],['hearts','Cœurs'],['bow','Ruban']];
export const presets=[
 {name:'Rose botanique',base:'#e9a4ad',accent:'#70334f',nails:['line','gloss','flowers','hearts','line'],colors:['base','base','accent','base','base']},
 {name:'French lilas',base:'#f2d3d5',accent:'#a68abd',nails:['french','line','bow','line','french'],colors:['base','base','base','base','base']},
 {name:'Matières précieuses',base:'#87526a',accent:'#e4b77c',nails:['cat-eye','chrome','jelly','gel-3d','foil'],colors:['base','base','base','base','base']}
];
export function rgb(hex){if(!/^#[\da-f]{6}$/i.test(hex))throw new Error('Teinte hexadécimale invalide');return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
export function tint(hex,target,amount){const a=rgb(hex),b=rgb(target),t=Math.max(0,Math.min(1,amount));return '#'+a.map((n,i)=>Math.round(n+(b[i]-n)*t).toString(16).padStart(2,'0')).join('');}
export function nailPath(shape='Amande'){
 switch(shape){
 case 'Ronde':return 'M 17 54 C 15 28 30 10 49 10 C 70 9 84 30 84 55 L 85 132 C 86 153 72 170 50 171 C 29 171 14 155 15 134 Z';
 case 'Ovale':return 'M 15 69 C 14 40 27 9 49 7 C 71 8 86 39 85 70 L 85 131 C 86 155 71 173 50 173 C 28 172 14 153 15 131 Z';
 case 'Carrée':return 'M 19 12 Q 48 8 81 12 Q 85 15 85 21 L 86 140 Q 84 172 50 173 Q 15 172 14 141 L 15 22 Q 15 15 19 12 Z';
 case 'Ballerine':return 'M 31 9 Q 50 6 69 9 C 74 23 82 63 85 104 L 86 140 Q 84 172 50 173 Q 15 172 14 141 L 15 104 C 18 62 25 23 31 9 Z';
 case 'Stiletto':return 'M 50 6 C 57 18 82 78 85 113 L 86 140 Q 84 172 50 173 Q 15 172 14 141 L 15 113 C 19 77 43 18 50 6 Z';
 default:return 'M 50 7 C 68 16 85 53 85 90 L 85 134 C 86 157 71 173 50 173 C 28 173 14 155 15 133 L 15 90 C 15 53 31 16 50 7 Z';
 }
}
export function frenchPath(technique){
 if(technique==='side-french')return 'M 0 0 H100 V19 Q61 45 0 72Z';
 if(technique==='deep-french')return 'M0 0 H100 V85 Q50 40 0 85Z';
 if(technique==='reverse-french')return 'M 4 146 Q 50 172 96 146 L 96 180 L 4 180 Z';
 if(technique==='micro-french')return 'M 0 0 H 100 V 38 Q 50 17 0 38 Z';
 if(technique==='v-french')return 'M 0 0 H 100 V 51 L 50 20 L 0 51 Z';
 return 'M 0 0 H 100 V 54 Q 50 29 0 54 Z';
}
export function randomPoints(count,seed=0){let n=(seed+1)*1337;const next=()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};return Array.from({length:count},()=>({x:17+next()*66,y:17+next()*145,r:.35+next()*1.7,a:next()*6.28}));}
export function fingerColours(settings,index){const reversed=settings.colors?.[index]==='accent';return {base:reversed?settings.accent:settings.base,accent:reversed?settings.base:settings.accent};}
