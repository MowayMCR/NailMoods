import {createWorkspaceCache,cacheError} from './cache/index.js';
import { COLLECTION, LIBRARY, JOURNAL, PROFILE, EXTRAS, TABLES, clone, same, productTable, productRow, productFromRow, ideaRow, journalRow, libraryIdeas, viewsFromRemote } from './mapping.js';
export const accountCacheKey=(userId,workspaceId)=>`nm-cloud-v1:${userId}:${workspaceId}`;
export const migrationKey=(userId,workspaceId)=>`nailmoods_supabase_migration_done:${userId}:${workspaceId}`;
const token=(table,id)=>table+':'+id;
export function createAccountStore({storage,repo,userId,workspaceId,onStatus=()=>{},cache=createWorkspaceCache(),uuid=()=>crypto.randomUUID()}) {
  const key=accountCacheKey(userId,workspaceId);
  let state=null,closed=false,running=null,initializing=null,initialized=false,cacheFailure=null;
  function check(){if(closed)throw new Error('Compte fermé.');}
  const fork=value=>({...value,views:{...value.views},ids:{...value.ids},bases:{...value.bases},queue:[...value.queue],profile:{...value.profile}});
  function save(next){check();state=next;}
  function failure(error){const safe=error?.name==='QuotaExceededError'?cacheError(error):error;onStatus({kind:'error',pending:state?.queue.length||0,code:safe.code||'save',message:safe.message});}
  async function initialize(){
    if(initialized)return;
    if(initializing)return initializing;
    initializing=(async()=>{
      try{state=await cache.getCachedWorkspace(key);}catch(error){cacheFailure=error;}
      check();
      if(state && (state.userId!==userId || state.workspaceId!==workspaceId))throw new Error('Cache de compte invalide.');
      const legacy=storage.getItem(key);
      if(legacy && !state){
        let old;try{old=JSON.parse(legacy);}catch{throw new Error('L’ancienne copie locale est illisible. Elle est conservée sur cet appareil.');}
        if(old.userId!==userId||old.workspaceId!==workspaceId||old.version!==1)throw new Error('Ancien cache de compte invalide.');
        state={...old,version:2};
        try{await cache.setCachedWorkspace(key,state);cacheFailure=null;
          // Delete only after a successful atomic transfer, and only if another tab has not changed it.
          if(storage.getItem(key)===legacy)storage.removeItem?.(key);
        }catch(error){cacheFailure=error;}
      }
      initialized=true;
    })();
    try{await initializing;}finally{initializing=null;}
  }
  const idFor=(next,table,id)=>next.ids[token(table,id)] ||= uuid();
  function add(next,table,rowId,values,action='put',extra={}) {next.queue.push({id:uuid(),table,rowId,values,action,...extra});}
  function changes(next,k,before,value){
    if(k===COLLECTION){
      const old=new Map((before || []).map(i=>[token(productTable(i),i.id),i]));
      for(const item of value){const table=productTable(item),localKey=token(table,item.id);const prior=old.get(localKey);if(!same(prior,item))add(next,table,idFor(next,table,item.id),productRow(item));old.delete(localKey);}
      for(const item of old.values()){const table=productTable(item);add(next,table,idFor(next,table,item.id),null,'delete');}
    } else if(k===LIBRARY){
      const old=new Map(libraryIdeas(before).map(i=>[i.key,i]));
      for(const idea of libraryIdeas(value))if(!same(old.get(idea.key),idea))add(next,'inspirations',idFor(next,'inspirations',idea.key),ideaRow(idea));
      const previous=new Set((before?.favorites || []).map(i=>i.key)), current=new Set((value?.favorites || []).map(i=>i.key));
      for(const id of current)if(!previous.has(id))add(next,'favorites',idFor(next,'inspirations',id),null);
      for(const id of previous)if(!current.has(id))add(next,'favorites',idFor(next,'inspirations',id),null,'delete');
    } else if(k===JOURNAL){
      const old=new Map((before?.entries || []).map(i=>[i.id,i]));
      for(const entry of value.entries || []){if(!same(old.get(entry.id),entry))add(next,'journal_entries',idFor(next,'journal_entries',entry.id),{...journalRow(entry),inspiration_id:next.ids[token('inspirations',entry.idea?.key)] || null});old.delete(entry.id);}
      for(const entry of old.values())add(next,'journal_entries',idFor(next,'journal_entries',entry.id),null,'delete');
      if(!same(before?.hiddenSessions || [],value.hiddenSessions || []))add(next,'profiles',userId,null,'put',{preferenceKey:'hiddenSessions',before:before?.hiddenSessions,value:value.hiddenSessions || []});
    } else if(k===PROFILE){
      const {account_tier,userId:ignoredUser,workspaceId:ignoredSpace,id,...safe}=value;
      add(next,'profiles',userId,null,'put',{before:next.profile.preferences?.nailmoodsProfile ?? null,value:safe});
      next.profile.display_name=safe.name || '';
      next.profile.preferences={...next.profile.preferences,nailmoodsProfile:safe};
    } else if(EXTRAS.includes(k))add(next,'profiles',userId,null,'put',{preferenceKey:k,before,value});
  }
  async function flush(){
    if(running)return running;
    if(closed)return false;
    running=Promise.resolve().then(async()=>{
      try{
        await initialize();check();if(!state)return false;
        onStatus({kind:'saving',pending:state.queue.length});
        for(;;){
          check();const snapshot=state;
          await cache.setCachedWorkspace(key,snapshot);cacheFailure=null;check();
          // Changes typed during the asynchronous transaction must be persisted before sending.
          if(state!==snapshot)continue;
          if(!state.queue.length)break;
          const op=state.queue[0];
          const saved=await repo.write(op,state.bases[token(op.table,op.rowId)]);
          if(closed)return false;
          const next=fork(state);next.queue=next.queue.filter(item=>item.id!==op.id);
          if(TABLES.includes(op.table)){if(saved)next.bases[token(op.table,op.rowId)]=saved;else delete next.bases[token(op.table,op.rowId)];}
          save(next);
        }
        if(state.migrationRequested && !state.migrationDone){
          const next=fork(state);next.migrationDone=true;
          await cache.setCachedWorkspace(key,next);check();save(next);
          try{storage.setItem(migrationKey(userId,workspaceId),'true');}catch{/* Optional small compatibility flag; IndexedDB is authoritative. */}
        }
        onStatus({kind:'saved',pending:0});return true;
      }catch(error){if(!closed)failure(error);return false;}
      finally{running=null;}
    });return running;
  }
  const adapter={
    accountScoped:true,
    getItem(k){return state?.views[k]===undefined?null:JSON.stringify(state.views[k]);},
    setItem(k,json){check();const value=JSON.parse(json);if(same(state.views[k],value))return;const next=fork(state);changes(next,k,state.views[k],value);next.views[k]=value;save(next);void flush();},
  };
  return {
    storage:adapter,
    get pending(){return state?.queue.length || 0;},
    get migrationDone(){return Boolean(state?.migrationDone);},
    get profile(){return state?.profile;},
    get hasCache(){return Boolean(state);},
    close(){closed=true;},
    initialize,
    async ensureDurable(){
      if(running)await running;
      check();if(state)await cache.setCachedWorkspace(key,state);
    },
    async clearCache(){
      check();await initialize();if(state?.queue.length)throw new Error('Des modifications restent à synchroniser. Télécharge ta copie avant de nettoyer le cache.');
      await cache.clearAccountCache(key);cacheFailure=null;
      // Only a reconstructible account cache is removed. No guest data, queued drafts or backups.
      if(storage.getItem(key)){const old=JSON.parse(storage.getItem(key));if(!old.queue?.length)storage.removeItem?.(key);}
      onStatus({kind:'saved',pending:0});
    },
    flush,
    exportDraft(){return clone({userId,workspaceId,views:state.views,pending:state.queue});},
    async load({useRemote=false}={}){
      await initialize();if(running)await running;check();const data=await repo.load();check();
      const next={version:2,userId,workspaceId,views:viewsFromRemote(data.profile,data.rows,data.favorites),ids:{},bases:{},queue:[],profile:data.profile,migrationDone:state?.migrationDone || false,migrationRequested:state?.migrationRequested || false};
      for(const table of TABLES)for(const row of data.rows[table]){
        const localId=table==='inspirations'?row.snapshot?.key:table==='journal_entries'?row.snapshot?.id:productFromRow(row,table).id;
        if(localId!=null)next.ids[token(table,localId)]=row.id;
        next.bases[token(table,row.id)]=row;
      }
      if(useRemote && state?.queue.length){
        await cache.backupWorkspace(key,state);check();
        next.migrationRequested=false;
      } else if(state?.queue.length){
        // Do not replace pending drafts or their conflict baseline on reload.
        next.views=state.views;next.ids={...next.ids,...state.ids};next.queue=state.queue;
        for(const op of state.queue){const t=token(op.table,op.rowId);if(state.bases[t])next.bases[t]=state.bases[t];else delete next.bases[t];}
        next.profile=state.profile;
      } else if(state){for(const k of Object.keys(state.views))if(![COLLECTION,LIBRARY,JOURNAL,PROFILE,...EXTRAS].includes(k))next.views[k]=state.views[k];}
      save(next);
      try{await cache.setCachedWorkspace(key,next);cacheFailure=null;onStatus({kind:next.queue.length?'pending':'saved',pending:next.queue.length});}
      catch(error){cacheFailure=error;failure(error);}
      return data;
    },
    async migrate(guest){
      await initialize();check();if(state.queue.length && !await flush())throw new Error('Termine la synchronisation en attente avant l’import.');
      // Refresh remote before comparing; never apply a stale migration proposal.
      await this.load();
      const merged=mergeGuest(state.views,guest),next=fork(state);
      for(const [k,value] of Object.entries(merged)){if(!same(next.views[k],value)){changes(next,k,next.views[k],value);next.views[k]=value;}}
      next.migrationRequested=true;save(next);return flush();
    },
  };
}
export function readGuest(storage){
  const result={};for(const k of [PROFILE,COLLECTION,LIBRARY,JOURNAL,...EXTRAS]){const raw=storage.getItem(k);if(raw!==null)result[k]=JSON.parse(raw);}return result;
}
export function guestCount(guest){return (guest[COLLECTION]?.length || 0)+libraryIdeas(guest[LIBRARY]).length+(guest[JOURNAL]?.entries?.length || 0)+(Object.keys(guest[PROFILE] || {}).length?1:0);}
function productIdentity(p){const catalog=p.provenance?.catalogId;if(catalog)return 'catalog:'+catalog;const code=p.rawBarcode || p.barcode;if(code)return 'barcode:'+code;return p.brand && p.reference?'ref:'+p.brand.toLowerCase()+':'+p.reference+':'+(p.confirmedColor || p.shade || p.color || ''):null;}
export function mergeGuest(remote,guest){
  const next=clone(remote);
  const existing=next[COLLECTION] || [],ids=new Set(existing.map(i=>String(i.id))),identities=new Set(existing.map(productIdentity).filter(Boolean));
  next[COLLECTION]=[...existing];
  for(const item of guest[COLLECTION] || []){const identity=productIdentity(item);if(!ids.has(String(item.id)) && (!identity || !identities.has(identity))){next[COLLECTION].push(clone(item));ids.add(String(item.id));if(identity)identities.add(identity);}}
  const merge=(a=[],b=[],key)=>[...a,...b.filter(x=>!a.some(y=>y[key]===x[key]))].map(clone);
  const lib=next[LIBRARY] || {favorites:[],recent:[],selected:null},local=guest[LIBRARY] || {};
  next[LIBRARY]={...lib,favorites:merge(lib.favorites,local.favorites,'key'),recent:merge(lib.recent,local.recent,'key')};
  const journal=next[JOURNAL] || {entries:[],hiddenSessions:[]};next[JOURNAL]={...journal,entries:merge(journal.entries,guest[JOURNAL]?.entries,'id')};
  if(!remote[PROFILE]?.name && !Object.keys(remote[PROFILE] || {}).some(k=>k!=='name'))next[PROFILE]=clone(guest[PROFILE] || remote[PROFILE] || {});
  for(const k of EXTRAS)if(next[k]===undefined && guest[k]!==undefined)next[k]=clone(guest[k]);
  return next;
}
