import { COLLECTION, LIBRARY, JOURNAL, PROFILE, EXTRAS, TABLES, clone, same, productTable, productRow, productFromRow, ideaRow, journalRow, libraryIdeas, viewsFromRemote } from './mapping.js';
export const accountCacheKey=(userId,workspaceId)=>`nm-cloud-v1:${userId}:${workspaceId}`;
export const migrationKey=(userId,workspaceId)=>`nailmoods_supabase_migration_done:${userId}:${workspaceId}`;
const token=(table,id)=>table+':'+id;
export function createAccountStore({storage,repo,userId,workspaceId,onStatus=()=>{},uuid=()=>crypto.randomUUID()}) {
  const key=accountCacheKey(userId,workspaceId);
  let raw=storage.getItem(key), state=raw?JSON.parse(raw):null,closed=false,running=null;
  if(state && (state.userId!==userId || state.workspaceId!==workspaceId || state.version!==1))throw new Error('Cache de compte invalide.');
  function check(){if(closed)throw new Error('Compte fermé.');if(storage.getItem(key)!==raw)throw new Error('Le compte a changé dans un autre onglet. Recharge cette page.');}
  function save(next){check();const nextRaw=JSON.stringify(next);storage.setItem(key,nextRaw);raw=nextRaw;state=next;}
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
        check();onStatus({kind:'saving',pending:state.queue.length});
        while(state.queue.length){
          check();const op=state.queue[0];
          const saved=await repo.write(op,state.bases[token(op.table,op.rowId)]);
          if(closed)return false;
          const next=clone(state);next.queue.shift();
          if(TABLES.includes(op.table)){if(saved)next.bases[token(op.table,op.rowId)]=saved;else delete next.bases[token(op.table,op.rowId)];}
          save(next);
        }
        if(state.migrationRequested && !state.migrationDone){const next=clone(state);next.migrationDone=true;save(next);storage.setItem(migrationKey(userId,workspaceId),'true');}
        onStatus({kind:'saved',pending:0});return true;
      }catch(error){if(!closed)onStatus({kind:'error',pending:state?.queue.length || 0,code:error.code || 'save',message:error.message});return false;}
      finally{running=null;}
    });return running;
  }
  const adapter={
    getItem(k){return state?.views[k]===undefined?null:JSON.stringify(state.views[k]);},
    setItem(k,json){check();const value=JSON.parse(json);if(same(state.views[k],value))return;const next=clone(state);changes(next,k,state.views[k],value);next.views[k]=value;save(next);void flush();},
  };
  return {
    storage:adapter,
    get pending(){return state?.queue.length || 0;},
    get migrationDone(){return Boolean(state?.migrationDone);},
    get profile(){return state?.profile;},
    get hasCache(){return Boolean(state);},
    close(){closed=true;},
    flush,
    exportDraft(){return clone({userId,workspaceId,views:state.views,pending:state.queue});},
    async load({useRemote=false}={}){
      check();const data=await repo.load();check();
      const next={version:1,userId,workspaceId,views:viewsFromRemote(data.profile,data.rows,data.favorites),ids:{},bases:{},queue:[],profile:data.profile,migrationDone:state?.migrationDone || false,migrationRequested:state?.migrationRequested || false};
      for(const table of TABLES)for(const row of data.rows[table]){
        const localId=table==='inspirations'?row.snapshot?.key:table==='journal_entries'?row.snapshot?.id:productFromRow(row,table).id;
        if(localId!=null)next.ids[token(table,localId)]=row.id;
        next.bases[token(table,row.id)]=row;
      }
      if(useRemote && state?.queue.length){
        storage.setItem(key+':backup:'+Date.now(),JSON.stringify(state));
        next.migrationRequested=false;
      } else if(state?.queue.length){
        // Do not replace pending drafts or their conflict baseline on reload.
        next.views=state.views;next.ids={...next.ids,...state.ids};next.queue=state.queue;
        for(const op of state.queue){const t=token(op.table,op.rowId);if(state.bases[t])next.bases[t]=state.bases[t];else delete next.bases[t];}
        next.profile=state.profile;
      } else if(state){for(const k of Object.keys(state.views))if(![COLLECTION,LIBRARY,JOURNAL,PROFILE,...EXTRAS].includes(k))next.views[k]=state.views[k];}
      save(next);onStatus({kind:next.queue.length?'pending':'saved',pending:next.queue.length});return data;
    },
    async migrate(guest){
      check();if(state.queue.length && !await flush())throw new Error('Termine la synchronisation en attente avant l’import.');
      // Refresh remote before comparing; never apply a stale migration proposal.
      await this.load();
      const merged=mergeGuest(state.views,guest),next=clone(state);
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
