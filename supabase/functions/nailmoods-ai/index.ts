import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {validateRequest,publicProducts,uuid} from './contract.mjs';
import {runProvider,providerConfig,AIError} from './provider.mjs';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,x-client-info,content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const fail=(code:string,status=400)=>json({error:code},status);
const rpc=async(client:any,name:string,args:Record<string,unknown>={})=>{const r=await client.rpc(name,args);if(r.error)throw Error(r.error.message);return r.data;};
async function readBody(req:Request){const reader=req.body?.getReader();if(!reader)throw Error('invalid_request');let size=0;const parts:Uint8Array[]=[];while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1500000){await reader.cancel();throw Error('request_too_large');}parts.push(value);}return JSON.parse(await new Blob(parts.map(p=>new Uint8Array(p).buffer)).text());}
async function probe(){
 const key=Deno.env.get('OPENAI_API_KEY');if(!key)return {keyPresent:false,authenticated:false};
 try{const r=await fetch('https://api.openai.com/v1/models',{headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(15000)});const data=r.ok?await r.json():null;const ids=(data?.data||[]).map((m:any)=>m.id);return {keyPresent:true,authenticated:r.ok,status:r.status,textModelAvailable:ids.includes('gpt-4.1-mini'),imageModelAvailable:ids.includes('gpt-image-2.5-sunburst')};}
 catch{return {keyPresent:true,authenticated:false,status:0};}
}
declare const EdgeRuntime: {waitUntil(promise:Promise<unknown>):void};
async function processClaim(admin:any,claim:any){
 if(!claim)return;
 const {job,payload,provider}=claim,actor=job.user_id;
 const config=providerConfig((k:string)=>k==='OPENAI_API_KEY'?Deno.env.get(k):provider[k]);
 let result:any=null,usage:any=null,cost:number|null=null,path:string|null=null;
 try{
  if(payload.referencePath){if(!payload.referencePath.startsWith(actor+'/'+payload.body.workspaceId+'/ai/'))throw Error('invalid_reference');const stored=await admin.storage.from('nailmoods-private').download(payload.referencePath);if(stored.error)throw Error('reference_unavailable');const bytes=new Uint8Array(await stored.data.arrayBuffer());if(bytes.length>10000000)throw Error('invalid_reference');let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));payload.body.referenceImage='data:image/png;base64,'+btoa(binary);}
  const generated=await runProvider({...payload,config,maxUsd:Number(job.reserve_usd)});
  result=generated.result;usage=generated.usage;cost=generated.cost;
  if(generated.image){path=actor+'/'+payload.body.workspaceId+'/ai/'+job.id+'.png';const r=await admin.storage.from('nailmoods-private').upload(path,generated.image,{contentType:'image/png',upsert:false});if(r.error)throw Error('storage_failed');result={...result,imagePath:path};}
  const completed=await rpc(admin,'nm_ai2_finish',{p_user:actor,p_job:job.id,p_result:result,p_usage:usage,p_cost:cost,p_error:null});
  if(!completed&&path)await admin.storage.from('nailmoods-private').remove([path]);
 }catch(e){
  if(e instanceof AIError){usage=e.usage;cost=e.cost;}
  const code=e instanceof AIError?e.message:'service_interrupted';
  try{await rpc(admin,'nm_ai2_finish',{p_user:actor,p_job:job.id,p_result:path?{imagePath:path}:null,p_usage:usage,p_cost:cost,p_error:code});}catch{console.error(JSON.stringify({event:'ai_finalization_pending',jobId:job.id}));}
 }
 console.log(JSON.stringify({event:'ai_job_finished',jobId:job.id,operation:job.operation,durationMs:Date.now()-Date.parse(job.started_at),costKnown:cost!==null}));
}
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});if(req.method!=='POST')return fail('method_not_allowed',405);
 const url=Deno.env.get('SUPABASE_URL')!;
 const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 // Scheduled worker: short-lived single-use nonce, checked server-side before any work.
 const nonce=req.headers.get('x-nm-ai-dispatch');
 if(nonce){
  if(!/^[a-f0-9]{64}$/.test(nonce))return fail('authentication_required',401);
  try{if(!await rpc(admin,'nm_ai2_consume_dispatch',{p_nonce:nonce}))return fail('authentication_required',401);
   const task=await readBody(req);if(task.action==='probe'){const result=await probe();await rpc(admin,'nm_ai2_record_probe',{p_value:result});return json(result);}
   const claim=await rpc(admin,'nm_ai2_claim');if(claim)EdgeRuntime.waitUntil(processClaim(admin,claim));return json({accepted:true},202);
  }catch{return fail('service_unavailable',503);}
 }
 const authorization=req.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return fail('authentication_required',401);
 const user=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:authorization}}});
 const {data:auth,error}=await user.auth.getUser(authorization.slice(7));if(error||!auth.user)return fail('authentication_required',401);
 let body:any;try{body=await readBody(req);}catch{return fail('invalid_request');}
 async function signed(path:string){if(!path.startsWith(auth.user!.id+'/')||!/^[-a-f0-9]+\/[-a-f0-9]+\/ai\/[-a-f0-9]+\.png$/.test(path))throw Error('invalid_media');const r=await admin.storage.from('nailmoods-private').createSignedUrl(path,300);if(r.error)throw Error('media_unavailable');return r.data.signedUrl;}
 if(body?.action){
  if(!['history','delete','access','metrics','diagnostics','switch','status','health'].includes(body.action)||Object.keys(body).some(k=>!['action','threadId','enabled','jobId'].includes(k))||(body.threadId!==undefined&&!uuid(body.threadId)))return fail('invalid_request');
  try{
   if(body.action==='health')return json(await rpc(user,'nm_ai2_health'));
   if(body.action==='status'){if(!uuid(body.jobId))return fail('invalid_request');const state=await rpc(user,'nm_ai2_status',{p_job:body.jobId});if(state.result?.imagePath)state.result.imageUrl=await signed(state.result.imagePath);return json(state);}
   if(body.action==='switch'){if(typeof body.enabled!=='boolean')return fail('invalid_request');return json(await rpc(user,'nm_ai2_switch',{p_enabled:body.enabled}));}
   if(body.action==='diagnostics'){const a=await rpc(user,'nm_ai2_access');if(!a.admin)return fail('not_allowed',403);const result=await probe();await rpc(admin,'nm_ai2_record_probe',{p_value:result});return json(result);}
   if(body.action==='access')return json(await rpc(user,'nm_ai2_access'));
   if(body.action==='metrics')return json(await rpc(user,'nm_ai2_metrics'));
   if(body.action==='delete'){
    if(!uuid(body.threadId))return fail('invalid_request');
    await rpc(user,'nm_ai2_delete',{p_thread:body.threadId});
    const paths=await rpc(user,'nm_ai2_media_cleanup',{p_thread:body.threadId});
    if(paths.length){const r=await admin.storage.from('nailmoods-private').remove(paths);if(r.error)return fail('media_deletion_pending',503);await rpc(admin,'nm_ai2_media_cleaned',{p_user:auth.user.id,p_thread:body.threadId});}
    return json({deleted:true});
   }
   const data=await rpc(user,'nm_ai2_history',{p_thread:body.threadId||null});
   for(const m of data.messages||[]){if(m.content?.imagePath){try{m.content.imageUrl=await signed(m.content.imagePath);}catch{m.content.imageUnavailable=true;}}}
   return json(data);
  }catch{return fail('not_allowed',403);}
 }
 try{validateRequest(body);}catch{return fail('invalid_request');}
 let settings:any;try{settings=await rpc(admin,'nm_ai2_provider',{p_user:auth.user.id});}catch{return fail('not_allowed',403);}
 const config=providerConfig((k:string)=>k==='OPENAI_API_KEY'?Deno.env.get(k):settings[k]);if(!config.enabled||!config.apiKey)return fail('provider_disabled',503);
 let access:any,history:any,products:any[];
 try{
  access=await rpc(user,'nm_ai2_access');if(!access.allowed)return fail('ai_disabled',403);
  history=await rpc(user,'nm_ai2_history',{p_thread:body.threadId});
  const owned=await user.from('user_products').select('id,shade_name,brand,reference,hex,is_verified,metadata').eq('workspace_id',body.workspaceId).eq('created_by',auth.user.id).order('id').limit(100);
  if(owned.error)throw Error();products=publicProducts(owned.data||[]);
 }catch{return fail('not_allowed',403);}
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body)));
 const fingerprint=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
 let referencePath:string|null=null;if(body.referenceJobId){try{const source=await rpc(user,'nm_ai2_status',{p_job:body.referenceJobId});if(source.status!=='succeeded'||source.result?.kind!=='illustration'||!source.result?.imagePath?.startsWith(auth.user.id+'/'+body.workspaceId+'/ai/'))return fail('invalid_reference');if(source.result.masterId&&source.result.masterId!==body.composition?.master?.id||source.result.masterRevision&&source.result.masterRevision!==body.composition?.master?.revision)return fail('invalid_reference');referencePath=source.result.imagePath;}catch{return fail('invalid_reference');}}
 let job:any;
 try{
  const r=await rpc(admin,'nm_ai2_enqueue',{p_user:auth.user.id,p_request:body.requestId,p_thread:body.threadId,p_workspace:body.workspaceId,p_operation:body.operation,p_fingerprint:fingerprint,p_prompt:body.prompt,p_payload:{body,products,history:history.messages||[],referencePath}});
  job=r.job;
  const claim=await rpc(admin,'nm_ai2_claim',{p_user:auth.user.id});if(claim)EdgeRuntime.waitUntil(processClaim(admin,claim));
  const state=await rpc(user,'nm_ai2_status',{p_job:job.id});if(state.result?.imagePath)state.result.imageUrl=await signed(state.result.imagePath);return json(state,state.status==='queued'||state.status==='running'?202:200);
 }catch(e){const code=e instanceof Error?e.message:'';return fail(['insufficient_credits','daily_quota_exceeded','budget_exceeded','request_conflict','conversation_busy','capability_disabled','workspace_unavailable','conversation_unavailable','provider_circuit_open','queue_full','account_busy','account_budget_exceeded','operation_quota_exceeded','quota_configuration_required'].includes(code)?code:'ai_disabled',409);}
});
