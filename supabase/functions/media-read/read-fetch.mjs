// Only for this read-only media endpoint (including its read-only RPC POSTs).
// Never retry permission denials. Bound the whole request, including body reads.
export function boundedReadFetch({fetchImpl=fetch,now=Date.now,budgetMs=8000,attemptMs=3500,backoffMs=100}={}) {
 const deadline=now()+budgetMs;
 return async (input,init={})=>{
  for(let attempt=0;attempt<2;attempt++){
   const remaining=deadline-now();
   if(remaining<=0)throw new DOMException('Media deadline exceeded','TimeoutError');
   const controller=new AbortController();
   const abort=()=>controller.abort(init.signal?.reason);
   if(init.signal?.aborted)abort();else init.signal?.addEventListener('abort',abort,{once:true});
   const timer=setTimeout(()=>controller.abort(new DOMException('Read timed out','TimeoutError')),Math.min(attemptMs,remaining));
   try{
    const response=await fetchImpl(input,{...init,signal:controller.signal});
    const bytes=await response.arrayBuffer();
    if(attempt===0&&[502,503,504].includes(response.status)&&deadline-now()>backoffMs) {
     clearTimeout(timer);await new Promise(r=>setTimeout(r,backoffMs));continue;
    }
    return new Response([204,205,304].includes(response.status)?null:bytes,{status:response.status,statusText:response.statusText,headers:response.headers});
   }catch(error){
    if(init.signal?.aborted||attempt===1||deadline-now()<=backoffMs||!['TypeError','TimeoutError','AbortError'].includes(error?.name))throw error;
    clearTimeout(timer);await new Promise(r=>setTimeout(r,backoffMs));
   }finally{clearTimeout(timer);init.signal?.removeEventListener('abort',abort);}
  }
  throw new DOMException('Media read failed','NetworkError');
 };
}
