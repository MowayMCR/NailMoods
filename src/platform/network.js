export function isTransientNetworkError(error,online=true){
 if([400,401,403].includes(error?.status))return false;
 return error?.name==='AuthRetryableFetchError' || error?.name==='AbortError' || error?.name==='TimeoutError' || error?.status===0 || error?.code==='network_timeout' || /Failed to fetch|NetworkError|network request failed|fetch failed/i.test(error?.message||'') || online===false;
}
export function withTimeout(fetcher,timeout=20000){return async(input,options={})=>{
 const controller=new AbortController(),abort=()=>controller.abort(options.signal?.reason);
 if(options.signal?.aborted)abort();else options.signal?.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(()=>controller.abort(new DOMException('Délai réseau dépassé','TimeoutError')),timeout);
 try{return await fetcher(input,{...options,signal:controller.signal});}finally{clearTimeout(timer);options.signal?.removeEventListener('abort',abort);}
};}
