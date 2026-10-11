const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const text=v=>norm(v).replace(/\b(noir|black|blanc|white|bleu|blue|rouge|red|rose|pink|jaune|yellow|bordeaux|burgundy|prune|plum|violet|purple|vert|green|or|gold|marron|brown|nude|beige|cassis|terracotta|gauche|droite|left|right|pouce|index|majeur|annulaire|auriculaire|thumb|middle|ring|little)\b/g,'').replace(/\s+/g,' ').trim();
export const canonical=v=>JSON.stringify(sort(v));
function sort(v){return Array.isArray(v)?v.map(sort):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,sort(v[k])])):v;}
export function duplicateDesignFingers(plan){
 const seen=new Set(),duplicates=[];
 for(const n of plan.nails||[]){const a=n.art;
  // Compare specified design geometry and gestures, not a model's short label.
  const key=a?canonical({techniques:[...(a.techniques||[])].sort(),finish:a.finish||'',motifs:(a.motifs||[]).map(m=>({name:text(m.name),description:text(m.description),technique:m.technique,x:m.x,y:m.y,size:m.size}))}):text(n.designBrief);
  if(key&&seen.has(key))duplicates.push(n.finger);else seen.add(key);
 }
 return duplicates;
}
export function assertDesignRepairPreserved(before,after,targets){
 const original=structuredClone(before),next=structuredClone(after);
 original.message=next.message='';original.title=next.title='';
 for(let i=0;i<original.nails.length;i++){const a=original.nails[i],b=next.nails[i];if(!b||a.finger!==b.finger)throw Error('repair_changed_composition');
  if(!targets.includes(a.finger))continue;
  if(a.productId!==b.productId||a.accentProductId!==b.accentProductId||a.art.finish!==b.art.finish||a.art.techniques.some(t=>!b.art.techniques.includes(t))||a.art.colorProductIds.some(id=>!b.art.colorProductIds.includes(id)))throw Error('repair_changed_composition');
  for(const m of a.art.motifs){if(!b.art.motifs.some(n=>['name','description','rationale','technique'].every(k=>m[k]===n[k])&&(m.colorProductIds||[]).every(id=>(n.colorProductIds||[]).includes(id))))throw Error('repair_removed_motif');}
  next.nails[i]=structuredClone(a);
 }
 if(canonical(original)!==canonical(next))throw Error('repair_changed_composition');
}
export function sourceIdentity(url){const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password)throw Error('invalid_source');for(const k of [...u.searchParams.keys()])if(/^utm_/i.test(k))u.searchParams.delete(k);u.hash='';u.searchParams.sort();u.pathname=u.pathname.replace(/\/$/,'')||'/';return u.href;}
export function resolveSource(sources,url){try{return sources.find(s=>sourceIdentity(s.url)===sourceIdentity(url))||null;}catch{return null;}}
export function assertSourceRepairPreserved(before,after){const a=structuredClone(before),b=structuredClone(after);for(const c of a.cards)c.sourceUrl='';for(const c of b.cards)c.sourceUrl='';if(canonical(a)!==canonical(b))throw Error('repair_changed_composition');}
