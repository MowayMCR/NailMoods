import {messageId} from './messageState.js';
import { matchPhotoProducts } from '../photoInspiration.js';
import { track } from '../analytics/analytics.js';
import { dataUrlToBlob } from '../cloud/mediaStorage.js';
const checked=async p=>{const {data,error}=await p;if(error)throw error;return data;};
const clean=v=>String(v||'').trim().slice(0,120);
const normalized=v=>clean(v).toLocaleLowerCase('fr');
export function productIdentity(p={}){
 if(p.catalogId||p.provenance?.catalogId)return 'catalog:'+String(p.catalogId||p.provenance.catalogId);
 if(p.barcode||p.rawBarcode)return 'barcode:'+String(p.barcode||p.rawBarcode);
 if(p.brand&&p.reference)return 'reference:'+normalized(p.brand)+':'+normalized(p.reference);
 return null;
}
const compact=p=>({name:clean(p.name),brand:clean(p.brand),reference:clean(p.reference),barcode:clean(p.barcode||p.rawBarcode),catalogId:clean(p.provenance?.catalogId||p.catalogId),color:p.color||p.shade||p.confirmedColor,type:clean(p.type)});
export function shareSnapshot(source,type='inspiration',{includeNotes=false,includeImages=false}={}){
 const idea=type==='journal'?source.idea:source;
 return {title:clean(source.title||idea?.title||'Inspiration NailMoods'),source_type:type,
 colors:[...new Set((idea?.palette||[]).map(p=>p.color||p.shade||p.confirmedColor).filter(c=>/^#[0-9a-f]{6}$/i.test(c)))].slice(0,5),
 techniques:[...new Set([idea?.rendering?.label,idea?.technique,...(idea?.nails||[]).map(n=>n.effect||n.technique)].map(clean).filter(Boolean))].slice(0,8),
 requirements:[...new Set((idea?.requirements||[]).map(p=>clean(p.name||p)).filter(Boolean))].slice(0,12),
 level:clean(idea?.nailArtLevel||idea?.difficulty||['Simple','Intermédiaire','Pro'][idea?.rank]),mood:clean(idea?.options?.mood),
 products:(idea?.palette||[]).slice(0,5).map(compact),equipment:(idea?.resources||[]).slice(0,12).map(compact),
 missing:(idea?.photoGuidance?.missing||[]).slice(0,12).map(p=>clean(p.name||p)),
 preview:idea?{shape:clean(idea.shape),length:clean(idea.length),nails:(idea.nails||[]).slice(0,5).map(n=>({color:n.color,accentColor:n.accentColor,finish:clean(n.finish),effect:clean(n.effect),drawing:clean(n.drawing),decoration:n.decoration?{motif:clean(n.decoration.motif),color:n.decoration.color}:null}))}:null,
 include_notes:includeNotes,notes:includeNotes?String(source.notes||idea?.notes||'').slice(0,2000):'',
 include_images:includeImages,images:includeImages?shareImages(source,type):[]};
}
export function shareImages(source,type){const idea=type==='journal'?source.idea:source;return [...(type==='journal'&&source.photo?[{src:source.photo}]:[]),...(idea?.photoSources||[])].filter(p=>p.src).slice(0,4).map(p=>({src:p.src}));}
export async function prepareShareImages(snapshot,{media,userId,workspaceId}){
 if(!snapshot.include_images)return {...snapshot,images:[]};
 const images=[];
 for(const p of snapshot.images){
  const file=p.src.startsWith('data:image/')?dataUrlToBlob(p.src):await media.download(p.src);
  const saved=await media.upload({userId,workspaceId,kind:'share',objectId:messageId(),file});images.push({src:saved.path});
 }
 return {...snapshot,images};
}
export function comparePoShare(snapshot,items=[]){
 const stocked=items.filter(p=>Number(p.quantity??1)>0),available=[],alternatives=[],missing=[],verify=[];
 const products=snapshot.products?.length?snapshot.products:(snapshot.colors||[]).map(color=>({color,name:'Teinte '+color}));
 for(const p of products){
  const id=productIdentity(p),exact=id&&stocked.find(i=>productIdentity(i)===id);
  if(exact){available.push({requested:p,item:exact});continue;}
  const color=p.color;
  const m=/^#[a-f0-9]{6}$/i.test(color||'')?matchPhotoProducts([color],stocked):null;
  const close=m&&[...m.owned,...m.alternatives].find(entry=>entry.distance<=.34);
  if(close)alternatives.push({...close,requested:p});
  else if(id)missing.push({requested:p,name:p.name||'Produit identifié'});
  else verify.push({requested:p,name:p.name||'Référence inconnue'});
 }
 const techniqueChecks=(snapshot.requirements||[]).map(name=>({name,available:stocked.some(i=>i.type==='Matériel'&&normalized(i.name)===normalized(name))}));
 for(const r of techniqueChecks)if(!r.available)verify.push({name:r.name});
 return {available,owned:available,alternatives,missing,verify,techniqueChecks};
}
export function poShareService(client){return {
 search:async query=>{const connections=await checked(client.rpc('nm_social',{p_action:'list',p_data:{}}));const rows=await checked(client.rpc('search_nailmoods',{p_query:query,p_kind:null,p_city:null}));return(rows||[]).filter(row=>row.entity_type==='workspace'&&connections.some(c=>c.status==='accepted'&&c.pro_handle===row.handle)).map(row=>({...row,user_id:connections.find(c=>c.pro_handle===row.handle).user_id}));},
 send:async(workspaceId,sourceId,snapshot)=>{const id=await checked(client.rpc('send_nailmoods_share_to_po',{p_recipient_workspace_id:workspaceId,p_source_local_id:String(sourceId||'').slice(0,120),p_snapshot:snapshot}));track('share_to_pro_sent',{});return id;},
 received:()=>checked(client.rpc('received_nailmoods_po_shares')),
 proposal:(userId,sourceId,snapshot)=>checked(client.rpc('send_nailmoods_proposal',{p_recipient_user_id:userId,p_source_local_id:String(sourceId||'').slice(0,120),p_snapshot:snapshot})),
 peer:id=>checked(client.rpc('nm_share_peer',{p_id:id})),
 detail:id=>checked(client.rpc('nm_share_detail',{p_id:id})),
};}
