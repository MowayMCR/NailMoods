import { dataUrlToBlob, mediaPath, validateImage } from '../cloud/mediaStorage.js';

const message = 'La photo n’a pas pu être enregistrée. Réessaie quand la connexion revient.';
async function dataUrl(blob) {
  validateImage(blob);
  const bytes=new Uint8Array(await blob.arrayBuffer());
  let binary='';
  for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
  return `data:${blob.type};base64,${btoa(binary)}`;
}
export function profileAvatarMode(profile, path) {
  // A new (or legacy) photo becomes the avatar, even after closing the editor.
  // Explicit subsequent choices remain durable.
  if(path && (profile.avatarMode==='photo' || profile.avatarChoicePath!==path))return 'photo';
  return profile.avatarMode==='avatar'?'avatar':'initials';
}

export function createProfilePhoto({client,media,store,userId,workspaceId,uuid=()=>crypto.randomUUID()}) {
  const cached=store.profilePhoto;
  const initialPath=store.profile?.avatar_url || null;
  let state={path:initialPath,url:cached?.path===initialPath?cached.preview || '':'',draft:cached?.draft || null,busy:false,error:'',notice:''};
  let revision=0,disposed=false;
  const listeners=new Set();
  const emit=patch=>{if(disposed)return;state={...state,...patch};for(const fn of listeners)fn();};
  const owned=path=>!path || path.startsWith(`${userId}/`) && path.split('/')[2]==='avatar';
  const persist=()=>store.cacheProfilePhoto({path:state.path,preview:state.url,draft:state.draft});
  async function read() {
    const {data,error}=await client.from('profiles').select('id,avatar_url').eq('id',userId).single();
    if(error || !data || data.id!==userId || !owned(data.avatar_url))throw new Error('La photo du compte n’a pas pu être chargée. Réessaie.');
    return data.avatar_url || null;
  }
  async function refresh() {
    if(disposed || state.busy)return;
    const request=++revision;
    try {
      const path=await read();
      if(disposed || request!==revision)return;
      // A confirmed removal clears the preview; a network error never does.
      if(path!==state.path)emit({path,url:'',error:''});
      if(path && !state.url) {
        const url=await dataUrl(await media.download(path));
        if(disposed || request!==revision)return;
        emit({url});
      }
      emit({error:''});
      await persist();
    }catch{if(!disposed && request===revision)emit({error:'Photo momentanément indisponible. Ta photo enregistrée est conservée. Réessaie.'});}
  }
  async function resume() {
    if(disposed || state.busy || !state.draft)return false;
    ++revision;
    emit({busy:true,error:'',notice:''});
    try {
      const draft=state.draft;
      // Checkpoint before any remote mutation. The draft survives a killed WebView.
      await persist();
      const file=draft.preview?dataUrlToBlob(draft.preview):null;
      if(file)validateImage(file);
      const next=file?mediaPath({userId,workspaceId,kind:'avatar',objectId:draft.id,contentType:file.type}):null;
      const current=await read();
      if(disposed)return false;
      if(current!==next) {
        if(current!==draft.previous)throw new Error('Ta photo a changé sur un autre appareil. Recharge la photo avant de réessayer.');
        if(file)await media.upload({userId,workspaceId,kind:'avatar',objectId:draft.id,file});
        if(disposed)return false;
        let query=client.from('profiles').update({avatar_url:next}).eq('id',userId);
        query=current?query.eq('avatar_url',current):query.is('avatar_url',null);
        const {data,error}=await query.select('id,avatar_url').single();
        if(error || !data || data.id!==userId || data.avatar_url!==next)throw new Error(message);
      }
      if(disposed)return false;
      emit({path:next,url:draft.preview || '',draft:null,notice:next?'Photo enregistrée.':'Photo supprimée du profil.'});
      try{await persist();}catch{emit({notice:'Photo enregistrée dans ton compte. La copie hors ligne n’a pas pu être mise à jour.'});}
      // Do not delete the previous object here: another profile/reference may still
      // use it. Account deletion already removes owned media; safe purge is separate.
      return true;
    }catch(error){emit({error:error.message || message});return false;}
    finally{emit({busy:false});}
  }
  return {
    getSnapshot:()=>state,
    activate(){disposed=false;},
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    refresh,resume,
    async change(preview) {
      if(disposed || state.busy)return false;
      if(preview)validateImage(dataUrlToBlob(preview));
      emit({draft:{id:uuid(),preview:preview || '',previous:state.path}});
      return resume();
    },
    async discardDraft(){if(state.busy)return;emit({draft:null,error:''});await persist();},
    dispose(){disposed=true;++revision;listeners.clear();},
  };
}
