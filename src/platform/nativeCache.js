import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
// Native-only adapter for the existing account store contract. No web DB migration.
export async function createNativeCache(){
 const root='nailmoods-accounts-v1';let tail=Promise.resolve();
 await Filesystem.mkdir({path:root,directory:Directory.Data,recursive:true}).catch(()=>{});
 const serial=task=>{const result=tail.then(task);tail=result.catch(()=>{});return result;};
 const pathFor=async scope=>{const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(scope));return root+'/'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('')+'.json';};
 async function read(scope){const path=await pathFor(scope);const listing=await Filesystem.readdir({path:root,directory:Directory.Data});if(!listing.files.some(f=>root+'/'+f.name===path))return null;const {data}=await Filesystem.readFile({path,directory:Directory.Data,encoding:Encoding.UTF8});const stored=JSON.parse(data);if(stored.scope!==scope)throw new Error('Copie locale invalide.');return stored.state;}
 return {
  getCachedWorkspace:scope=>serial(()=>read(scope)),
  setCachedWorkspace(scope,state){const content=JSON.stringify({scope,state});return serial(async()=>{const path=await pathFor(scope);await Filesystem.writeFile({path:path+'.tmp',directory:Directory.Data,encoding:Encoding.UTF8,data:content});await Filesystem.rename({from:path+'.tmp',to:path,directory:Directory.Data});});},
  async backupWorkspace(scope,state){const key=scope+':backup:'+Date.now()+':'+crypto.randomUUID();await this.setCachedWorkspace(key,state);return key;},
  clearAccountCache:scope=>serial(async()=>{const state=await read(scope);if(state?.queue?.length)throw new Error('Des modifications restent à synchroniser.');if(state)await Filesystem.deleteFile({path:await pathFor(scope),directory:Directory.Data});}),
  purgeAccount:userId=>serial(async()=>{const listing=await Filesystem.readdir({path:root,directory:Directory.Data});for(const file of listing.files.filter(f=>f.name.endsWith('.json'))){const path=root+'/'+file.name;const {data}=await Filesystem.readFile({path,directory:Directory.Data,encoding:Encoding.UTF8});if(JSON.parse(data).state?.userId===userId)await Filesystem.deleteFile({path,directory:Directory.Data});}}),
 };
}
