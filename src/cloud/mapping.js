import { isDecoration } from '../decorations.js';
import { productColor } from '../colorAnalysis.js';
export const COLLECTION = 'nm-collection-v2';
export const LIBRARY = 'nm-inspirations-v1';
export const JOURNAL = 'nm-journal-v1';
export const PROFILE = 'nm-profile';
export const EXTRAS = ['nm-tutorials-v1','nm-personalization-v1','nm-creation-v1','nm-recent-colors-v1'];
export const TABLES = ['user_products','user_stickers','user_equipment','inspirations','journal_entries'];
export const clone = value => JSON.parse(JSON.stringify(value));
export const same = (a,b) => stable(a) === stable(b);
function stable(value) { return JSON.stringify(value && typeof value === 'object' ? Array.isArray(value) ? value.map(v=>JSON.parse(stable(v) ?? 'null')) : Object.fromEntries(Object.keys(value).sort().map(k=>[k,JSON.parse(stable(value[k]) ?? 'null')])) : value); }
export function productTable(item) { return isDecoration(item) ? 'user_stickers' : item.type === 'Matériel' ? 'user_equipment' : 'user_products'; }
export function productRow(item) {
  const metadata = { nailmoods: clone(item) };
  if (isDecoration(item)) return {name:item.name, tags:item.decorationTags || [], image_url:item.photo || null, metadata};
  if (item.type === 'Matériel') return {name:item.name,equipment_category:item.equipmentCategory || null,tool_subtype:item.toolSubtype || null,liner_length_mm:item.linerLengthMm || null,tip_type:item.tipType || null,compatible_systems:item.compatibleSystems || [],metadata};
  return {catalog_id:item.provenance?.catalogId || null,brand:item.brand || null,product_range:item.collection || item.productRange || null,shade_name:item.name,reference:item.reference || null,barcode:item.rawBarcode || item.barcode || null,hex:productColor(item),is_verified:false,metadata};
  // source uses the existing DB default; original provenance stays in metadata.
  // A browser never grants catalogue verification to a personal record.
}
export function productFromRow(row,table) {
  const saved = row.metadata?.nailmoods || {};
  const result = {...saved,id:saved.id ?? row.id};
  if (table === 'user_stickers') return {...result,type:'Matériel',name:row.name,equipmentCategory:saved.equipmentCategory || 'Stickers / décalcomanies',decorationTags:row.tags || [],photo:row.image_url || saved.photo || ''};
  if (table === 'user_equipment') return {...result,type:'Matériel',name:row.name,equipmentCategory:row.equipment_category || 'Autre matériel',toolSubtype:row.tool_subtype,linerLengthMm:row.liner_length_mm,tipType:row.tip_type,compatibleSystems:row.compatible_systems || []};
  return {...result,type:saved.type || 'Vernis',name:row.shade_name || saved.name || 'Ma couleur',brand:row.brand || '',reference:row.reference || '',collection:row.product_range || '',barcode:row.barcode || '',color:row.hex || saved.color,shade:row.hex || saved.shade,confirmedColor:row.hex || saved.confirmedColor};
}
export function ideaRow(idea) { return {title:idea.title,mood:idea.options?.mood || null,is_public:false,snapshot:clone(idea)}; }
export function journalRow(entry) { return {performed_on:entry.date,notes:entry.notes || '',photo_url:entry.photo || null,snapshot:clone(entry)}; }
export function profilePatch(profile, preferences) {
  const {account_tier,userId,workspaceId,id,...safe} = profile;
  return {display_name:profile.name || '',preferences:{...preferences,nailmoodsProfile:safe}};
}
export function libraryIdeas(library={}) { return [...new Map([...(library.recent || []),...(library.favorites || []),library.selected].filter(Boolean).map(i=>[i.key,i])).values()]; }
export function viewsFromRemote(profile, rows, favorites) {
  const preferences=profile.preferences || {};
  const ideas=rows.inspirations.map(r=>({...r.snapshot,title:r.title})).filter(i=>i.key);
  const favoriteIds=new Set(favorites.map(f=>f.entity_id));
  const view={
    [PROFILE]:{...(preferences.nailmoodsProfile || {}),name:profile.display_name || ''},
    [COLLECTION]:TABLES.slice(0,3).flatMap(t=>rows[t].map(r=>productFromRow(r,t))),
    [LIBRARY]:{favorites:rows.inspirations.filter(r=>favoriteIds.has(r.id)).map(r=>({...r.snapshot,title:r.title})),recent:ideas.slice(-12).reverse(),selected:null},
    [JOURNAL]:{entries:rows.journal_entries.map(r=>({...r.snapshot,date:r.performed_on,notes:r.notes || '',photo:r.photo_url || r.snapshot?.photo || ''})),hiddenSessions:preferences.nailmoodsExtras?.hiddenSessions || []},
  };
  for(const key of EXTRAS) if (preferences.nailmoodsExtras?.[key] !== undefined) view[key]=preferences.nailmoodsExtras[key];
  return view;
}
