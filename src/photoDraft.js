export function photoDraftSnapshot({photos=[],overrides={},nailArt=null,level=null,sourceMode='collection',technique='',seed=1,result=null,saved=[]}={}) {
  return {
    photos: photos.map(({id,src,projectSrc,fileKey,analysis,name}) => ({id,src:projectSrc||src,fileKey,analysis,name})),
    overrides,nailArt,level,sourceMode,technique,seed,saved:[...saved],
    // The source images are already kept above. Avoid duplicating their data URLs
    // in every generated idea while retaining the composition itself.
    result: result ? {...result,ideas:(result.ideas||[]).map(({photoSources,...idea})=>idea)} : null,
  };
}

export function restorePhotoDraftResult(result, photos=[]) {
  if(!result || !Array.isArray(result.ideas)) return null;
  const photoSources=photos.map(photo=>({name:photo.name,src:photo.projectSrc||photo.src})).filter(photo=>photo.src);
  return {...result,ideas:result.ideas.map(idea=>({...idea,photoSources}))};
}
