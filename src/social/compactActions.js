export function isOwnHandle(handle,ownHandle){
 const normalized=value=>typeof value==='string'?value.trim().replace(/^@/,'').toLowerCase():'';
 const target=normalized(handle),own=normalized(ownHandle);
 return Boolean(target&&own&&target===own);
}
