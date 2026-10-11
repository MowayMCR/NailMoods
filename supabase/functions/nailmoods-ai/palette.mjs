// Colour assessment uses actual swatches, never the number of product IDs.
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function colorFamily(hex){
 if(!/^#[a-f0-9]{6}$/i.test(hex||''))return null;
 const [r,g,b]=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
 if(max<.22)return 'black';if(min>.82&&d<.16)return 'white';if(d<.09)return 'neutral';
 let h=d===0?0:max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;h=(h*60+360)%360;
 return h<25||h>=345?'red':h<65?'yellow':h<165?'green':h<250?'blue':h<300?'purple':'pink';
}
export function expectedPalette(request){
 const text=norm(request).replace(/\b(sans|pas de|aucun|without|no)\s+(noir|blanc|violet|vert|black|white|purple|green)\b/g,'');
 const explicit=[['black',/\b(noir|black)\b/],['white',/\b(blanc|white)\b/],['purple',/\b(violet|purple)\b/],['green',/\b(vert|green)\b/],['red',/\b(rouge|bordeaux|red|burgundy)\b/],['yellow',/\b(jaune|yellow)\b/],['blue',/\b(bleu|blue)\b/],['pink',/\b(rose|pink)\b/]].filter(([,re])=>re.test(text)).map(([name])=>name);
 // Explicit limited/alternative palettes take precedence over a cultural default.
 if(explicit.length)return explicit;
 if(/beetlejuice|beetle.?juice|beatlejuice/.test(text)&&!/monochrom|minimal|noir et blanc|black and white|sans violet|sans vert/.test(text))return ['black','white','purple','green'];
 return [];
}
export function assessPalette(plan,products,request){
 const byId=new Map(products.map(p=>[String(p.id),p]));
 const ids=new Set(plan.nails.flatMap(n=>[n.productId,n.accentProductId,...(n.art?.colorProductIds||[]),...(n.art?.motifs||[]).flatMap(m=>m.colorProductIds||[])].filter(Boolean)));
 const colors=[...new Set([...ids].map(id=>byId.get(String(id))?.color?.toLowerCase()).filter(v=>/^#[a-f0-9]{6}$/.test(v||'')))],families=[...new Set(colors.map(colorFamily).filter(Boolean))].sort(),expected=expectedPalette(request),missing=expected.filter(f=>!families.includes(f));
 const hueFamilies=families.filter(f=>!['black','white','neutral'].includes(f));
 return {version:1,referenceCount:ids.size,distinctColors:colors.length,families,expectedFamilies:expected,missingFamilies:missing,harmony:missing.length?'requested_palette_incomplete':expected.length?'requested_palette':hueFamilies.length<=1?'monochromatic_with_neutrals':'varied_thematic_palette',humanValidated:false};
}
export function repairColorReferences(plan){
 const next=structuredClone(plan);let changed=false;
 for(const n of next.nails){if(!n.art?.colorProductIds)continue;const ids=[...new Set([n.productId,n.accentProductId,...n.art.colorProductIds,...n.art.motifs.flatMap(m=>m.colorProductIds||[])].filter(Boolean))];if(ids.length!==n.art.colorProductIds.length||ids.some(id=>!n.art.colorProductIds.includes(id))){n.art.colorProductIds=ids;changed=true;}}
 return {plan:changed?next:plan,changed};
}
export function assertPaletteRepairPreserved(before,after){
 // Only colour references, palette notes and colour-related tutorial steps may change.
 const protectedPlan=p=>{const q=structuredClone(p);q.direction={...q.direction,paletteNotes:''};q.message='';q.title='';for(const n of q.nails){n.productId='';n.accentProductId=null;n.art={...n.art,colorProductIds:[],steps:[]};n.art.motifs=n.art.motifs.map(m=>({...m,colorProductIds:[]}));}return q;};
 const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
 if(JSON.stringify(canonical(protectedPlan(before)))!==JSON.stringify(canonical(protectedPlan(after))))throw Error('repair_changed_composition');
}
