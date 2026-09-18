const allowed=new Set(['signup','login','logout','recovery','password','migration','sync']);
export function recordCloudEvent(storage,event,success){
  if(!allowed.has(event))return;
  try{
    const raw=JSON.parse(storage.getItem('nm-cloud-diagnostics-v1') || '[]');
    const entries=Array.isArray(raw)?raw.filter(r=>allowed.has(r.event)&&typeof r.success==='boolean'&&typeof r.at==='string').map(({event,success,at})=>({event,success,at})):[];
    storage.setItem('nm-cloud-diagnostics-v1',JSON.stringify([...entries,{event,success:Boolean(success),at:new Date().toISOString()}].slice(-30)));
  }catch{/* Diagnostic failure must never change the result of a save. */}
}
