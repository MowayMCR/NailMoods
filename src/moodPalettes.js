import {productColor,validHex} from './colorAnalysis.js';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
// Directions reuse the visible taxonomy. These policies add no new mood tags.
const directions={
 soft:['Douce','Doux','Romantique','Girly','Coquette','Balletcore','Soft girl','Dreamy','Ethereal','Kawaii'],
 chic:['Chic','Classique','Élégant','Sophistiqué','Discret','Minimal','Old money','Clean girl','Quiet luxury','Simple','Épuré'],
 earth:['Naturel','Cottagecore','Vintage','Au calme'],
 bold:['Audacieuse','Audacieux','Alternative','Contemporain','Graphique','Y2K','90s'],
 dark:['Mystérieuse','Sombre','Witchy','Dark feminine','Grunge','Punk','Rock','Emo','Goth','Goth romantique','Moody','Celestial'],
 fresh:['Lumineux','Joyeuse','Fairycore','Mermaidcore'],
 festive:['Festif','Glamour'],cyber:['Cyber','Pastel goth'],
};
export const moodDirections=new Map(Object.entries(directions).flatMap(([key,values])=>values.map(value=>[norm(value),key])));
const templates={
 soft:[['#e9c6b5','#eed9df','#d8cde8','#f3eee9'],['#efc9bd','#e8bfcf','#edddd5','#f4ede9'],['#d7c2df','#e5cfdc','#e8d9d0','#f0e5eb'],['#dfc9bc','#e5d4cf','#f1e8df','#ead9e1']],
 chic:[['#ddc5b8','#873448','#f1e9da','#b5a398'],['#b6a59b','#28252b','#e9e1d6','#c4a45e'],['#dfc4b4','#765044','#eee6db','#a88b79'],['#ead7c8','#813446','#c6b3a4','#d4c9bc']],
 earth:[['#b96c51','#82917b','#dac7a8','#815f4b'],['#b47d85','#b9b392','#e5d5bd','#937566'],['#a86c4d','#d8b59a','#e5d5bf','#856e59'],['#739084','#b6c6ad','#d9cbb5','#a18d78']],
 bold:[['#752b53','#de3c91','#e8c7b8','#b878a3'],['#144c79','#ed9841','#ead5b9','#507c9a'],['#572767','#bc62d2','#e7cdbc','#8f50a4'],['#b44056','#e36d4e','#edd5bf','#7c303e']],
 dark:[['#391e45','#68304c','#1f2029','#aea9b7'],['#192b49','#405775','#272633','#aeb1b5'],['#652137','#252029','#967182','#e0c8c3'],['#35254e','#674987','#20232d','#8c839b']],
 fresh:[['#cee2dc','#d9e4ef','#f4e9d2','#e8bbcb'],['#eec7a9','#f3e3b2','#d8ddb6','#f5eae0'],['#c9dcd9','#d3cfed','#e8d5ed','#f1e8e5'],['#b6d7e1','#e5d3eb','#f0e7d9','#c6dfd3']],
 festive:[['#873448','#d2ae68','#ead7c8','#b5828d'],['#315b60','#b5c4bd','#c7a861','#ede0c7'],['#b44b77','#e2b3cc','#e8d8ca','#c7a861'],['#3e385e','#9a85b5','#e1d2c5','#aeb1b5']],
 cyber:[['#654488','#b4a0d3','#e8d9eb','#b8cbce'],['#25496b','#67aab5','#dfcfe5','#bdc6d1'],['#943d80','#da8ec5','#e8d3e4','#3c3049'],['#424757','#b4bacb','#d7b9d9','#e5dbdd']],
};
const hsl=hex=>{const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;return {h:d?((max===r?(g-b)/d:max===g?(b-r)/d+2:(r-g)/d+4)*60+360)%360:0,s:d?d/(1-Math.abs(2*l-1)):0,l};};
const hueDistance=(a,b)=>Math.min(Math.abs(a-b),360-Math.abs(a-b));
export function moodPolicy(mood){const direction=moodDirections.get(norm(mood))||'chic';return {direction,schemes:templates[direction],maxAccent:['bold','cyber'].includes(direction)?2:1,contrast:['soft','fresh'].includes(direction)?'faible':['dark','bold','cyber'].includes(direction)?'marqué':'maîtrisé'};}
export function moodPalette(mood,seed=1,style='Libre'){
 const {direction,schemes}=moodPolicy(mood),index=((Number(seed)||1)-1)%schemes.length;
 // Vary a whole relation together, rather than drawing unrelated colours.
 const cycle=Math.floor(((Number(seed)||1)-1)/schemes.length)%3,shift=[0,4,-4][cycle];
 const values=[...schemes[index]];values.push('#'+[1,3,5].map(at=>Math.round((parseInt(values[0].slice(at,at+2),16)+parseInt(values[1].slice(at,at+2),16))/2).toString(16).padStart(2,'0')).join(''));
 return values.map((hex,i)=>{const color='#'+[1,3,5].map(at=>Math.max(0,Math.min(255,parseInt(hex.slice(at,at+2),16)+shift)).toString(16).padStart(2,'0')).join('');return {id:`mood-${direction}-${index}-${cycle}-${i}`,name:['Dominante','Teinte associée','Neutre','Accent','Camaïeu'][i]+' · couleur d’inspiration',color,shade:color,type:'Vernis',finish:'Brillant',usage:'Couleur seule',conceptual:true,paletteGroup:`${direction}-${index}-${cycle}`,paletteRole:i===3?'accent':i===2?'neutral':'dominant',visualStyle:style};});
}
export function moodPreference(item,mood){const color=productColor(item);if(!validHex(color))return 0;const value=hsl(color),{schemes,direction}=moodPolicy(mood);
 let distance=Infinity;for(const hex of schemes.flat()){const target=hsl(hex);distance=Math.min(distance,hueDistance(value.h,target.h)/180*.25+Math.abs(value.s-target.s)*.3+Math.abs(value.l-target.l)*.6);}
 const soft=['soft','fresh'].includes(direction),penalty=soft?Math.max(0,.55-value.l)*50+Math.max(0,value.s-.65)*30:0;
 return 32*(1-distance)-penalty;
}
export function harmoniousPalette(palette,mood){
 if(palette.length<2)return true;
 if(palette.every(p=>p.paletteGroup&&p.paletteGroup===palette[0].paletteGroup))return true;
 const {direction,maxAccent}=moodPolicy(mood),values=palette.map(p=>hsl(productColor(p)));
 if(['soft','fresh'].includes(direction)&&values.some(v=>v.l<.48||v.s>.72))return false;
 const chromatic=values.filter(v=>v.s>.2&&v.l>.12&&v.l<.88);
 if(chromatic.length<2)return true;
 const hues=chromatic.map(v=>v.h),anchor=hues[0];
 const analog=hues.every(h=>hueDistance(anchor,h)<=65);
 const complementary=hues.every(h=>hueDistance(anchor,h)<=45||hueDistance(anchor,h)>=145);
 if(values.filter(v=>v.s>.65&&v.l<.8).length>maxAccent)return false;
 return analog||complementary;
}
