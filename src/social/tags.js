import taxonomy from './taxonomy.json' with {type:'json'};
export const TAXONOMY=taxonomy;
export const TAG_LABELS={moods:'Moods',colors:'Couleurs',aesthetics:'Esthétique',themes:'Thème',levels:'Niveau',techniques:'Technique',occasions:'Occasion',shapes:'Forme',lengths:'Longueur',finishes:'Finition'};
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function cleanTags(value={}) {return Object.fromEntries(Object.entries(TAXONOMY).map(([key,allowed])=>[key,[...new Set((Array.isArray(value?.[key])?value[key]:[]).filter(v=>allowed.includes(v)))].slice(0,8)]));}
export function colorTag(hex){
 if(!/^#[0-9a-f]{6}$/i.test(hex||''))return null;
 const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min,l=(max+min)/2;
 if(l<.12)return 'Noir';if(l>.93)return 'Blanc';if(d<.09)return 'Gris';
 if(r>g&&g>b&&d<.25&&l>.55)return 'Beige';
 let h=d===0?0:max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;h=(h*60+360)%360;
 if(h<20||h>=345)return l<.32?'Bordeaux':l>.62?'Rose':'Rouge';
 if(h<48)return l<.45?'Marron':'Orange';if(h<70)return 'Jaune';if(h<165)return 'Vert';if(h<255)return 'Bleu';if(h<300)return 'Violet';return 'Rose';
}
export function suggestTags(source={},photoColors=[]){
 const idea=source.idea||source,options=idea.options||{},out=cleanTags();
 // Private journal notes are neither analysed nor included in public metadata.
 const text=norm([source.title,idea.title,options.style,options.mood,options.occasion,idea.technique,idea.shape,idea.length,...(idea.palette||[]).flatMap(p=>[p.finish,p.effect])].join(' '));
 for(const [key,values] of Object.entries(TAXONOMY)) out[key]=values.filter(v=>new RegExp('(^|[^a-z0-9])'+norm(v).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'($|[^a-z0-9])').test(text));
 out.colors=[...new Set([...out.colors,...[...(idea.palette||source.products||[]).map(p=>p.color||p.hex||p.shade),...photoColors].map(colorTag).filter(Boolean)])];
 if(Number.isInteger(idea.rank))out.levels=[TAXONOMY.levels[idea.rank]].filter(Boolean);
 if(options.occasion==='Événement')out.occasions=['Fête'];
 const techniques={solid:'Uni',alternate:'Duo alterné',french:'French',aura:'Aura',gradient:'Dégradé',marble:'Marbré',catEye:'Cat eye',sticker:'Stickers'};
 for(const nail of idea.nails||[])if(techniques[nail.pattern])out.techniques.push(techniques[nail.pattern]);
 return cleanTags(out);
}
