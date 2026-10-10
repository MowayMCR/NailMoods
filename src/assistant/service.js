export async function assistantCall(client,body,signal){
 if(!client)throw Error('authentication_required');
 const r=await client.functions.invoke('nailmoods-ai',{body,signal});
 if(r.error){let code;try{code=(await r.error.context.json()).error;}catch{}throw Error(code||'service_unavailable');}
 return r.data;
}
