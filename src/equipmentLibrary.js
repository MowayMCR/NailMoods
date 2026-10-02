import {equipmentSeed} from './equipmentSeed.js';
import {isDecoration} from './decorations.js';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export const equipmentCategories=[...new Set(equipmentSeed.map(r=>r.category))];
export function ownedEquipment(items,row){const aliases=[row.name,...row.aliases].map(norm);return items.filter(p=>p.type==='Matériel'&&!isDecoration(p)&&(p.equipmentSlug===row.slug||!p.equipmentSlug&&aliases.includes(norm(p.name))));}
export function setEquipmentOwned(items,row,owned,id){
  const existing=ownedEquipment(items,row);
  if(owned){if(existing.length)return items;return [...items,{id:id(),type:'Matériel',name:row.name,brand:'',url:'',equipmentSlug:row.slug,equipmentCategory:row.legacyCategory||equipmentSeed.find(r=>r.slug===row.slug)?.legacyCategory||'Autre matériel',libraryCategory:row.category,quantity:1,notes:'',source:'equipment_library'}];}
  const ids=new Set(existing.map(p=>p.id));return ids.size?items.filter(p=>!ids.has(p.id)):items;
}
export function duplicateCustomEquipment(items,item){return items.find(p=>p.id!==item.id&&p.type==='Matériel'&&!isDecoration(p)&&norm(p.name)===norm(item.name));}
export async function loadEquipmentLibrary(client,storage){
  let cached;try{cached=JSON.parse(storage.getItem('nm-equipment-library-cache-v1'));}catch{}
  const valid=rows=>Array.isArray(rows)&&rows.length&&rows.every(r=>r&&typeof r.slug==='string'&&typeof r.name==='string'&&typeof r.category==='string'&&Array.isArray(r.aliases));
  const fallback=valid(cached)?cached:equipmentSeed;
  if(!client)return {rows:fallback,offline:true};
  const {data,error}=await client.from('equipment_library').select('id,slug,name,category,aliases,sort_order,active').eq('active',true).order('sort_order');
  if(error||!valid(data))return {rows:fallback,offline:true};
  const rows=data.map(row=>({...row,legacyCategory:equipmentSeed.find(s=>s.slug===row.slug)?.legacyCategory||'Autre matériel'}));
  try{storage.setItem('nm-equipment-library-cache-v1',JSON.stringify(rows));}catch{/* Bundled fallback remains available. */}
  return {rows,offline:false};
}
export function searchEquipment(rows,query,category=''){const words=norm(query).split(' ').filter(Boolean);return rows.filter(r=>r.active!==false&&(!category||r.category===category)&&words.every(w=>norm([r.name,r.category,...r.aliases].join(' ')).includes(w)));}
