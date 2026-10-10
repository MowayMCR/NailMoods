import {TECHNIQUES} from './contract.mjs';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const culturalRequest=request=>/vif d.or|snitch|harry potter|poudlard/.test(norm(request))&&!/(sans|aucun|pas de|ni|without|no).{0,30}(vif d.or|snitch|harry potter)/.test(norm(request));
export const fingerId=i=>(i<5?'left':'right')+'-'+['thumb','index','middle','ring','little'][i%5];
export function validateArt(plan,request){
 if(!['compose','edit'].includes(plan.action))return;
 // A named cultural object is never inferred from a loosely related aesthetic.
 if(plan.nails.some(n=>n.motif==='winged-orb'||/vif d.or|snitch/.test(norm(n.designBrief)))&&!culturalRequest(request))throw Error('unrelated_motif');
 if(!plan.direction)return; // Reading old snapshots does not invent an artistic validation.
 const requested=norm(request),present=new Set(plan.nails.flatMap(n=>n.art?.techniques||[]));
 if(plan.action==='compose')for(const [pattern,technique] of [[/\bfrench\b/,'french'],[/\baura\b/,'aura'],[/\b3d\b/,'gel-3d'],[/strass|rhinestone/,'rhinestones'],[/cat.?eye/,'cat-eye']])if(pattern.test(requested)&&!present.has(technique)&&!(technique==='french'&&[...present].some(t=>t.endsWith('french'))))throw Error('missing_technique');
 if(plan.action==='compose'&&plan.nails.every(n=>Array.isArray(n.art?.colorProductIds))&&!/arc.en.ciel|rainbow|dix couleurs|10 couleurs|multicolor/.test(requested)){
 const primary=new Set(plan.nails.map(n=>n.productId)),all=new Set(plan.nails.flatMap(n=>n.art.colorProductIds));if(primary.size>4||all.size>6)throw Error('incoherent_palette');}
 const signatures=[];
 for(const n of plan.nails){const a=n.art;
  if(!a||!['principal','accompagnement','accent'].includes(a.role)||typeof a.signature!=='string'||!a.signature.trim()||a.signature.length>180||!Array.isArray(a.techniques)||a.techniques.length>6||a.techniques.some(t=>!TECHNIQUES.includes(t)||!t)||!Array.isArray(a.motifs)||a.motifs.length>5||!Array.isArray(a.steps)||!a.steps.length||a.steps.length>6||a.steps.some(v=>typeof v!=='string'||v.length>200)||!Array.isArray(a.materials)||a.materials.some(v=>typeof v!=='string'||v.length>80))throw Error('invalid_art');
  for(const m of a.motifs){if(!m||['name','description','rationale'].some(k=>typeof m[k]!=='string'||!m[k].trim()||m[k].length>180)||![m.x,m.y,m.size].every(Number.isFinite)||m.x<0||m.x>100||m.y<0||m.y>100||m.size<5||m.size>100||!a.techniques.includes(m.technique))throw Error('invalid_motif');
   if(['skittle','mix-match','monochrome','duo'].includes(m.technique))throw Error('invalid_motif_technique');
   if(m.colorProductIds&&(!Array.isArray(m.colorProductIds)||!m.colorProductIds.length||m.colorProductIds.some(id=>!a.colorProductIds?.includes(id))))throw Error('invalid_motif_colors');
   if(/vif d.or|snitch|winged.orb/.test(norm(JSON.stringify(m)))&&!culturalRequest(request))throw Error('unrelated_motif');
  }
  if(plan.level===0&&a.techniques.some(t=>['gel-3d','one-stroke','encapsulated'].includes(t))&&!/3d|one.stroke|encapsul/.test(norm(request)))throw Error('difficulty_mismatch');
  signatures.push(norm(a.signature).replace(/gauche|droite|left|right|pouce|index|majeur|annulaire|auriculaire|thumb|middle|ring|little|\d/g,'').replace(/\b(noir|black|blanc|white|bleu|blue|rouge|red|rose|pink|jaune|yellow|bordeaux|burgundy|prune|plum|violet|purple|vert|green|or|gold|marron|brown|nude|beige|cassis|terracotta)\b/g,'').replace(/\s+/g,' ').trim());
 }
 if(plan.action==='compose'&&plan.nails.length===10&&new Set(signatures).size!==10)throw Error('repeated_designs');
}
export function createMaster(plan,products,body){
 if(!['compose','edit'].includes(plan.action))return null;
 validateArt(plan,body.prompt);
 const previous=body.composition?.master;
 if(plan.action==='edit'&&!previous)return null; // Preserve legacy editing without inventing a validated master.
 const palette=new Map([...(previous?.palette||[]),...products].map(p=>[String(p.id),p]));
 const nail=n=>{const p=palette.get(String(n.productId)),a=palette.get(String(n.accentProductId));return {...n,...(n.art?{motif:''}:{}),id:fingerId(n.finger),color:p?.color,accentColor:a?.color||p?.color,art:n.art?{...n.art,motifs:n.art.motifs.map(m=>({...m,...(m.colorProductIds?{colors:m.colorProductIds.map(id=>palette.get(id)?.color)}:{})}))}:null};};
 const nails=plan.action==='edit'?previous.nails.map(n=>n.finger===plan.editFinger?nail(plan.nails[0]):n):plan.nails.map(nail);
 if(plan.action==='compose'&&nails.every(n=>n.art?.role==='principal'))for(let start=0;start<nails.length;start+=5){const ranked=nails.slice(start,start+5).sort((a,b)=>(b.art.motifs.reduce((v,m)=>v+m.size,0)+b.art.techniques.length*10)-(a.art.motifs.reduce((v,m)=>v+m.size,0)+a.art.techniques.length*10));ranked.forEach((n,i)=>n.art={...n.art,role:i<2?'principal':i===2?'accent':'accompagnement'});}
 const used=new Set(nails.flatMap(n=>[String(n.productId),String(n.accentProductId),...(n.art?.colorProductIds||[])]));
 return {id:previous?.id||body.threadId||null,version:2,revision:(previous?.revision||0)+1,originalRequest:plan.action==='edit'?previous.originalRequest:body.prompt,intention:plan.direction?.intention||body.prompt,direction:plan.action==='edit'?previous.direction:plan.direction||null,shape:plan.action==='edit'?previous.shape:body.shape,length:plan.action==='edit'?previous.length:body.length,level:plan.action==='edit'?previous.level:body.level??plan.level,designCount:nails.length,collectionOnly:body.collectionOnly,nails,palette:[...palette.values()].filter(p=>used.has(String(p.id))).map(({id,name,color,verified,conceptual})=>({id,name,color,verified:verified===true,conceptual:conceptual===true})),validation:{structural:true,artistic:'pending_human'}};
}
