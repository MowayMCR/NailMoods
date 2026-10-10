export async function assistantCall(client,body,signal){
 if(!client)throw Error('authentication_required');
 const r=await client.functions.invoke('nailmoods-ai',{body,signal});
 if(r.error){let code;try{code=(await r.error.context.json()).error;}catch{}throw Error(code||'service_unavailable');}
 return r.data;
}

// Only poll the saved job; never repeat a generation automatically.
export async function awaitAssistantJob(client,body,signal,onStatus=()=>{}){
 let result=await assistantCall(client,body,signal);
 const deadline=Date.now()+6*60*1000;
 while(['queued','running','reserved'].includes(result.status)&&Date.now()<deadline){
  onStatus(result.status);
  await new Promise((resolve,reject)=>{
   if(signal?.aborted)return reject(new DOMException('Aborted','AbortError'));
   const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};
   const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},3000);
   signal?.addEventListener('abort',abort,{once:true});
  });
  result=await assistantCall(client,{action:'status',jobId:result.jobId},signal);
 }
 return result;
}
