import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {createAIService,validRequest} from './provider.mjs';
import {renderPhotoreal,pngBytes,compositionPrompt} from './photoreal.mjs';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 const authorization=req.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return json({error:'authentication_required'},401);
 const url=Deno.env.get('SUPABASE_URL')!,client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false},global:{headers:{Authorization:authorization}}});
 const {data:auth,error:authError}=await client.auth.getUser(authorization.slice(7));if(authError||!auth.user)return json({error:'authentication_required'},401);
 const reader=req.body?.getReader();let bytes=0;const chunks:Uint8Array[]=[];if(!reader)return json({error:'invalid_request'},400);
 while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>1_450_000){await reader.cancel();return json({error:'request_too_large'},413);}chunks.push(value);}
 let body;try{body=JSON.parse(await new Blob(chunks).text());}catch{return json({error:'invalid_request'},400);}if(!validRequest(body))return json({error:'invalid_request'},400);
 const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 async function imageUrl(job:any){
  const path=job.result?.imagePath;if(!path)return null;
  if(!path.startsWith(auth.user!.id+'/')||!path.endsWith('/ai/'+job.id+'.png'))throw Error('render_unavailable');
  const {data,error}=await admin.storage.from('nailmoods-private').createSignedUrl(path,600);if(error)throw error;return data.signedUrl;
 }
 if(body.action){
  // History applies the existing independent internal entitlement guard.
  const {data:history,error}=await client.rpc('nm_ai_history');if(error)return json({error:'not_allowed'},403);
  const job=(history||[]).find((j:any)=>j.id===body.jobId);if(!job)return json({error:'render_unavailable'},404);
  try{
   if(body.action==='read')return json({imageUrl:await imageUrl(job)});
   if(job.result?.imagePath){await imageUrl(job);const {error:removeError}=await admin.storage.from('nailmoods-private').remove([job.result.imagePath]);if(removeError)throw removeError;}
   const {error:deleteError}=await client.rpc('nm_ai_delete',{p_id:job.id});if(deleteError)throw deleteError;return json({deleted:true});
  }catch{return json({error:'render_unavailable'},503);}
 }
 const render=Boolean(body.referenceImage);
 if(render&&(Deno.env.get('AI_IMAGE_RENDER_ENABLED')!=='true'||!Deno.env.get('OPENAI_API_KEY')))return json({error:'provider_not_configured'},503);
 const {data:project,error:projectError}=await client.from('pose_projects').select('id,workspace_id,details').eq('id',body.projectId).eq('user_id',auth.user.id).single();
 if(projectError)return json({error:'not_allowed'},403);
 if(render){try{pngBytes(body.referenceImage);compositionPrompt(project);}catch{return json({error:'composition_required'},400);}}
 const {data:job,error}=await client.rpc('nm_ai_begin',{p_request:body.requestId,p_project:body.projectId,p_feature:body.feature});
 if(error)return json({error:error.message==='AI_QUOTA_EXCEEDED'?'quota_exceeded':'not_allowed'},error.message==='AI_QUOTA_EXCEEDED'?429:403);
 if(!job.claimed){let signed=null;try{signed=await imageUrl(job);}catch{}return json({job,imageUrl:signed},job.status==='reserved'?202:200);}
 let path:string|null=null;let result:any=null;
 try{
  if(render){
   const generated=await renderPhotoreal({apiKey:Deno.env.get('OPENAI_API_KEY'),project,referenceImage:body.referenceImage});
   result=generated.metadata;path=auth.user.id+'/'+project.workspace_id+'/ai/'+job.id+'.png';
   const {error:uploadError}=await admin.storage.from('nailmoods-private').upload(path,generated.image,{contentType:'image/png',upsert:false});if(uploadError)throw Error('storage_failed');
   result={...result,feature:body.feature,projectId:project.id,imagePath:path};
  }else result=await createAIService()[body.feature]({project});
  const {data:completed,error:finishError}=await admin.rpc('nm_ai_finish',{p_id:job.id,p_user:auth.user.id,p_result:result});if(finishError||!completed)throw Error('job_not_completed');
  const finished={...job,claimed:undefined,status:'succeeded',result};
  // The render is committed before signing; a read retry can recover a signing failure.
  let signed=null;try{signed=await imageUrl(finished);}catch{}
  return json({job:finished,imageUrl:signed});
 }catch(e){
  if(path)await admin.storage.from('nailmoods-private').remove([path]);
  const code=e instanceof Error&&['provider_busy','provider_failed','composition_required','storage_failed'].includes(e.message)?e.message:'experiment_failed';
  // Preserve known provider usage if storage or finalisation fails after a paid response.
  const failure=result?.generated?{...result,imagePath:null}:null;
  await admin.rpc('nm_ai_finish',{p_id:job.id,p_user:auth.user.id,p_result:failure,p_error:code});
  return json({error:code,jobId:job.id},503);
 }
});
