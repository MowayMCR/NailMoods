import {splitWorkspace,joinWorkspace} from './records.js';
export const LOCAL_SPACE_MESSAGE='L’espace local de cet appareil est presque plein. Tes données en ligne restent intactes.';
export function cacheError(error){
 if(error?.name==='QuotaExceededError'||error?.code==='quota')return Object.assign(new Error(LOCAL_SPACE_MESSAGE),{code:'quota'});
 if(error?.code==='cache_conflict')return error;
 return Object.assign(new Error('Le cache local n’est pas accessible. Tes données en ligne restent intactes. Réessaie ou télécharge les modifications en attente.'),{code:'cache_unavailable'});
}
const conflict=()=>Object.assign(new Error('Le compte a changé dans un autre onglet. Recharge cette page avant de modifier tes données.'),{code:'cache_conflict'});
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
function completed(tx){const done=new Promise((resolve,reject)=>{tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error||new Error('Transaction annulée'));tx.onerror=()=>{};});done.catch(()=>{});return done;}
function binary(uri){const split=uri.indexOf(','),header=uri.slice(0,split),raw=atob(uri.slice(split+1));const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));return {bytes,type:header.slice(5).split(';')[0]};}
function dataURL(blob){return blob.arrayBuffer().then(buffer=>{let text='';const bytes=new Uint8Array(buffer);for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return `data:${blob.type};base64,${btoa(text)}`;});}
export function createWorkspaceCache({indexedDB=globalThis.indexedDB,name='nailmoods-account-cache-v2'}={}){
 let opening;
 const previous=new Map(),revisions=new Map(),knownImages=new Map();
 async function db(){
  if(!indexedDB)throw cacheError(new Error('IndexedDB unavailable'));
  if(!opening)opening=new Promise((resolve,reject)=>{
   const req=indexedDB.open(name,1);
   req.onupgradeneeded=()=>{const d=req.result;for(const storeName of ['records','media']){const store=d.createObjectStore(storeName,{keyPath:['scope','key']});store.createIndex('scope','scope');}d.createObjectStore('revisions',{keyPath:'scope'});};
   req.onsuccess=()=>{req.result.onversionchange=()=>{req.result.close();opening=null;};resolve(req.result);};
   req.onerror=()=>{opening=null;reject(req.error);};req.onblocked=()=>{opening=null;reject(new Error('Autre onglet ouvert'));};
  });return opening;
 }
 async function encode(value,media,memo){
  if(typeof value==='string'&&/^data:image\/[a-z0-9.+-]+;base64,/i.test(value)){
   if(!memo.has(value))memo.set(value,(async()=>{const {bytes,type}=binary(value);const digest=await crypto.subtle.digest('SHA-256',bytes);const key=type+':'+Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');media.set(key,new Blob([bytes],{type}));return {__nailmoodsCachedImage:key};})());
   return memo.get(value);
  }
  if(Array.isArray(value))return Promise.all(value.map(v=>encode(v,media,memo)));
  if(value&&typeof value==='object'){const out={};for(const [k,v] of Object.entries(value))out[k]=await encode(v,media,memo);return out;}
  return value;
 }
 async function decode(value,media,memo){
  if(value&&typeof value==='object'&&Object.keys(value).length===1&&value.__nailmoodsCachedImage){const key=value.__nailmoodsCachedImage;if(!memo.has(key)){const blob=media.get(key);if(!blob)throw new Error('Image cache manquante');memo.set(key,dataURL(blob));}return memo.get(key);}
  if(Array.isArray(value))return Promise.all(value.map(v=>decode(v,media,memo)));
  if(value&&typeof value==='object'){const out={};for(const [k,v] of Object.entries(value))out[k]=await decode(v,media,memo);return out;}
  return value;
 }
 return {
  async getCachedWorkspace(scope){try{
   const database=await db(),tx=database.transaction(['records','media','revisions'],'readonly'),done=completed(tx);
   const [rows,images,revision]=await Promise.all([request(tx.objectStore('records').index('scope').getAll(scope)),request(tx.objectStore('media').index('scope').getAll(scope)),request(tx.objectStore('revisions').get(scope))]);await done;
   const media=new Map(images.map(row=>[row.key,row.blob])),memo=new Map(),parts=new Map();
   for(const row of rows)parts.set(row.key,await decode(row.value,media,memo));
   previous.set(scope,parts);knownImages.set(scope,new Set(images.map(row=>row.key)));revisions.set(scope,revision?.revision||0);return joinWorkspace(parts);
  }catch(error){throw cacheError(error);}},
  async setCachedWorkspace(scope,state){try{
   const parts=splitWorkspace(state),prior=previous.get(scope)||new Map(),changes=[],media=new Map(),memo=new Map();
   for(const [key,value] of parts){const old=prior.get(key);if(old===value||(old!==undefined&&JSON.stringify(old)===JSON.stringify(value)))continue;changes.push({scope,key,value:await encode(value,media,memo)});}
   for(const key of knownImages.get(scope)||[])media.delete(key);
   const removed=[...prior.keys()].filter(key=>!parts.has(key));
   const database=await db(),tx=database.transaction(['records','media','revisions'],'readwrite');
   let stale=false,writeError;
   const done=completed(tx),check=tx.objectStore('revisions').get(scope);
   check.onsuccess=()=>{
    if((check.result?.revision||0)!==(revisions.get(scope)||0)){stale=true;tx.abort();return;}
    try{
    for(const row of changes)tx.objectStore('records').put(row);
    for(const key of removed)tx.objectStore('records').delete([scope,key]);
    for(const [key,blob] of media)tx.objectStore('media').put({scope,key,blob});
    tx.objectStore('revisions').put({scope,revision:(revisions.get(scope)||0)+1});
    }catch(error){writeError=error;tx.abort();}
   };
   try{await done;}catch(error){if(stale)throw conflict();throw writeError||error;}
   previous.set(scope,parts);knownImages.set(scope,new Set([...(knownImages.get(scope)||[]),...media.keys()]));revisions.set(scope,(revisions.get(scope)||0)+1);
   return {recordsWritten:changes.length,imagesWritten:media.size};
  }catch(error){throw cacheError(error);}},
  async backupWorkspace(scope,state){const backup=scope+':backup:'+Date.now()+':'+crypto.randomUUID();await this.setCachedWorkspace(backup,state);return backup;},
  async clearAccountCache(scope){try{
   const database=await db(),tx=database.transaction(['records','media','revisions'],'readwrite'),done=completed(tx);let denied=false,stale=false;
   const revision=tx.objectStore('revisions').get(scope);
   revision.onsuccess=()=>{
    if((revision.result?.revision||0)!==(revisions.get(scope)||0)){stale=true;tx.abort();return;}
    const meta=tx.objectStore('records').get([scope,'meta']);
    meta.onsuccess=()=>{
     if(meta.result?.value.queueOrder?.length){denied=true;tx.abort();return;}
     for(const name of ['records','media']){const cur=tx.objectStore(name).index('scope').openCursor(scope);cur.onsuccess=()=>{const c=cur.result;if(c){c.delete();c.continue();}};}
     tx.objectStore('revisions').put({scope,revision:(revisions.get(scope)||0)+1});
    };
   };
   try{await done;}catch(error){if(denied)throw Object.assign(new Error('Des modifications restent à synchroniser. Télécharge ta copie avant de nettoyer le cache.'),{code:'pending'});if(stale)throw conflict();throw error;}
   previous.set(scope,new Map());knownImages.set(scope,new Set());revisions.set(scope,(revisions.get(scope)||0)+1);
  }catch(error){if(error.code==='pending')throw error;throw cacheError(error);}},
 };
}
