import {COLLECTION,LIBRARY,JOURNAL} from '../mapping.js';
// Record-level layout: changing one product never writes the other products or the workspace envelope.
export function splitWorkspace(state){
 const parts=new Map();
 const {views,bases,queue,profile,...meta}=state;
 parts.set('meta',{...meta,queueOrder:queue.map(op=>op.id),viewKeys:Object.keys(views)});
 parts.set('profile',profile);
 for(const [id,row] of Object.entries(bases))parts.set('base:'+id,row);
 for(const op of queue)parts.set('operation:'+op.id,op);
 for(const [key,value] of Object.entries(views)){
  const prefix='view:'+key;
  if(key===COLLECTION){
   const ids=value.map(item=>`${item.type||''}:${item.id}`);
   parts.set(prefix,{kind:'collection',ids});value.forEach((item,i)=>parts.set(prefix+':'+ids[i],item));
  }else if(key===JOURNAL){
   const {entries=[],...shell}=value;parts.set(prefix,{kind:'journal',shell,ids:entries.map(e=>e.id)});
   for(const entry of entries)parts.set(prefix+':'+entry.id,entry);
  }else if(key===LIBRARY){
   const hasProjects=Object.hasOwn(value,'projects'),{favorites=[],projects=[],recent=[],selected=null,...shell}=value;
   parts.set(prefix,{kind:'library',shell,favorites:favorites.map(i=>i.key),...(hasProjects?{projects:projects.map(i=>i.key)}:{}),recent:recent.map(i=>i.key),selected:selected?.key||null});
   for(const idea of [...projects,...recent,...favorites,selected].filter(Boolean))parts.set(prefix+':'+idea.key,idea);
  }else parts.set(prefix,{kind:'value',value});
 }
 return parts;
}
export function joinWorkspace(parts){
 const meta=parts.get('meta');if(!meta)return null;
 const {queueOrder,viewKeys,...state}=meta;
 state.profile=parts.get('profile');state.queue=queueOrder.map(id=>parts.get('operation:'+id));state.bases={};state.views={};
 for(const [key,value] of parts)if(key.startsWith('base:'))state.bases[key.slice(5)]=value;
 for(const key of viewKeys){const prefix='view:'+key,part=parts.get(prefix);if(!part)continue;
  if(part.kind==='collection')state.views[key]=part.ids.map(id=>parts.get(prefix+':'+id));
  else if(part.kind==='journal')state.views[key]={...part.shell,entries:part.ids.map(id=>parts.get(prefix+':'+id))};
  else if(part.kind==='library')state.views[key]={...part.shell,favorites:part.favorites.map(id=>parts.get(prefix+':'+id)),...(part.projects?{projects:part.projects.map(id=>parts.get(prefix+':'+id))}:{}),recent:part.recent.map(id=>parts.get(prefix+':'+id)),selected:part.selected?parts.get(prefix+':'+part.selected):null};
  else state.views[key]=part.value;
 }
 return state;
}
