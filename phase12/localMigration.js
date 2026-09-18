// Read-only preparation for an explicit migration AFTER authentication.
// No upload, deletion, account creation, or entitlement inference here.
export const localCollections = [
  ['profile','nm-profile'],['collection','nm-collection-v2'],
  ['inspirations','nm-inspirations-v1'],['journal','nm-journal-v1'],
  ['tutorials','nm-tutorials-v1'],['personalization','nm-personalization-v1'],
  ['creation','nm-creation-v1'],['recentColors','nm-recent-colors-v1'],
];
export function prepareLocalMigration(storage, {userId,workspaceId,profileId,confirmed=false}={}) {
  if(!confirmed || ![userId,workspaceId,profileId].every(id=>typeof id==='string'&&id.trim()))throw new Error('Une destination authentifiée et une confirmation sont nécessaires.');
  const records=[],errors=[];
  for(const [kind,key] of localCollections){
    try{const raw=storage.getItem(key);if(raw!==null){const payload=JSON.parse(raw);if(payload!==null)records.push({kind,sourceKey:key,payload});}}
    catch{errors.push({key,reason:'Données locales illisibles : conserver l’original avant migration.'});}
  }
  return {version:1,userId,workspaceId,profileId,records,errors,ready:errors.length===0};
}
