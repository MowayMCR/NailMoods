export const scrapMoods=[['soft','Soft Glam','#f7e8e6','#ae7581'],['dark','Dark Feminine','#f0e7e4','#743a53'],['cottage','Cottagecore','#edf0e4','#698264'],['pop','Pop Pastel','#f1eafa','#8e76af']];
const names={soft:['Nœud satin','Perle','Branche de rose','Cœur doré','Cœur aquarelle','Étoile','French','Aura'],dark:['Rose cassis','Lune','Nœud cassis','Papillon','Branche fine','Cœur ancien','French','Aura'],cottage:['Marguerites','Fleur sauvage','Lavande','Papillon','Trèfle','Livres','French','Aura'],pop:['Fleur rose','Marguerite','Nœud lavande','Étoile','Damier','Cœur','French','Aura']};
export const scrapAssets=scrapMoods.flatMap(([mood,label])=>Array.from({length:12},(_,i)=>({id:mood+'-'+i,mood,moodLabel:label,index:i,type:i<8?'sticker':'tape',label:i<8?names[mood][i]:['Scotch uni','Scotch à motifs','Scotch botanique','Scotch décoratif'][i-8]})));
export const scrapTechniques=['French','Chrome','Cat Eye','Aura','Jelly','Paillettes','Tortoiseshell','Leopard','Freehand','Dot art','Line art','Marble','Strass','3D gel','Glazed nails','Blooming gel'];
scrapAssets.push(...scrapTechniques.map((icon,i)=>({id:'tech-'+i,mood:'tech',moodLabel:'Techniques',type:'sticker',label:icon,icon})));
export const scrapBackgrounds=scrapMoods.flatMap(([mood,label])=>['Uni','Petits pois','Motif discret','Coins fleuris'].map((name,i)=>({id:mood+'-'+i,mood,index:i,label:label+' · '+name})));
export const scrapFrames=['classic','torn','gold'];
const num=(n,min,max,fall)=>typeof n==='number'&&Number.isFinite(n)?Math.min(max,Math.max(min,n)):fall;
export function cleanScrapbook(value){
 if(!value||value.version!==1||!Array.isArray(value.nodes))return null;
 const seen=new Set(),nodes=[];
 for(const n of value.nodes.slice(0,32)){
  if(!n||typeof n.id!=='string'||!n.id||seen.has(n.id)||!['photo','sticker','tape','text'].includes(n.type))continue;
  if(['sticker','tape'].includes(n.type)&&!scrapAssets.some(a=>a.id===n.asset&&a.type===n.type))continue;
  if(n.type==='photo'&&(typeof n.ref!=='string'||!n.ref||n.ref.length>120))continue;
  seen.add(n.id);nodes.push({id:n.id.slice(0,80),type:n.type,x:num(n.x,8,92,50),y:num(n.y,8,92,50),w:num(n.w,10,65,n.type==='photo'?45:20),rotate:num(n.rotate,-45,45,0),...(n.type==='photo'?{ref:n.ref,frame:scrapFrames.includes(n.frame)?n.frame:'classic'}:{}),...(['sticker','tape'].includes(n.type)?{asset:n.asset}:{}),...(n.type==='text'?{text:typeof n.text==='string'?n.text.slice(0,160):'',color:['cassis','ink','sage'].includes(n.color)?n.color:'cassis'}:{})});
 }
 return {version:1,background:scrapBackgrounds.some(b=>b.id===value.background)?value.background:'soft-0',nodes};
}
export function defaultScrapbook(entry){return {version:1,background:'soft-0',nodes:[{id:'photo-main',type:'photo',ref:entry.id,x:50,y:44,w:54,rotate:-1,frame:'classic'},{id:'date-main',type:'text',text:(()=>{const v=entry.date||entry.performedOn||'';if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return v;const d=new Date(v+'T12:00:00Z');return Number.isNaN(d.getTime())?v:new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(d);})(),x:50,y:76,w:82,rotate:0,color:'ink'}]};}
export const assetById=id=>scrapAssets.find(a=>a.id===id);
export function spriteStyle(asset){return {backgroundImage:`url(${import.meta.env?.BASE_URL||'/'}atelier/scrapbook-v2/${asset.id}.svg)`,backgroundSize:'contain',backgroundPosition:'center'};}
