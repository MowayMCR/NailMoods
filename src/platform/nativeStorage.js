import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { createDurableQueue } from './durableQueue.js';
import { nativeNotice } from './state.js';

const root='nailmoods-v1';
export async function createNativeStorage() {
  await Filesystem.mkdir({path:root,directory:Directory.Data,recursive:true}).catch(()=>{});
  const filenames=new Map();
  const fileFor=async key=>{if(!filenames.has(key)){const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key));filenames.set(key,root+'/'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')+'.json');}return filenames.get(key);};
  const write=async(key,value)=>{
    const path=await fileFor(key);

    // Rename only once the complete replacement is written.
    await Filesystem.writeFile({path:path+'.tmp',directory:Directory.Data,encoding:Encoding.UTF8,data:JSON.stringify({key,value})});
    await Filesystem.rename({from:path+'.tmp',to:path,directory:Directory.Data});
  };
  const queue=createDurableQueue(write,()=>nativeNotice('La sauvegarde sur cet appareil a échoué. Ton brouillon reste ouvert ; réessaie avant de fermer.'));
  // Only the app's own WebView is hydrated. Browser storage is never accessed.
  const files=await Filesystem.readdir({path:root,directory:Directory.Data});
  for(const item of files.files.filter(f=>f.name.endsWith('.json'))){
    try{const {data}=await Filesystem.readFile({path:root+'/'+item.name,directory:Directory.Data,encoding:Encoding.UTF8});const row=JSON.parse(data);if(typeof row.key==='string'&&typeof row.value==='string'&&localStorage.getItem(row.key)===null)localStorage.setItem(row.key,row.value);}catch{nativeNotice('Une copie locale ne peut pas être relue. Elle est conservée pour réessayer.');}
  }
  const storage={
    getItem:key=>localStorage.getItem(key),
    setItem(key,value){localStorage.setItem(key,value);queue.put(key,String(value));},
    removeItem(key){localStorage.removeItem(key);queue.put(key,null);},
    flush:()=>queue.flush(),
    async purgeAccount(userId){for(let i=localStorage.length-1;i>=0;i--){const k=localStorage.key(i);if(k?.includes(userId))storage.removeItem(k);}await queue.flush();},
  };
  const authStorage={getItem:async key=>(await Preferences.get({key:'auth:'+key})).value,setItem:async(key,value)=>{await Preferences.set({key:'auth:'+key,value});},removeItem:async key=>{await Preferences.remove({key:'auth:'+key});}};
  return {storage,authStorage};
}
