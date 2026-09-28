export function imageResults(method, data) {
  if(method==='getPhoto') return data?.webPath || data?.path ? [data] : [];
  if(method==='pickImages') return Array.isArray(data?.photos) ? data.photos.slice(0,4) : [];
  return [];
}
export function canRecoverMedia(pending, {principal,route,label,index}) {
  return Boolean(pending?.files?.length && pending.principal===principal && pending.route===route && pending.label===label && pending.index===index);
}
