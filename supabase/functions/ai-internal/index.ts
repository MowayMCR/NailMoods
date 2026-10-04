import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {createAIService,validRequest} from './provider.mjs';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, x-client-info, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 const authorization=req.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))return json({error:'authentication_required'},401);
 const url=Deno.env.get('SUPABASE_URL')!,client=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false},global:{headers:{Authorization:authorization}}});
 const {data:auth,error:authError}=await client.auth.getUser(authorization.slice(7));if(authError||!auth.user)return json({error:'authentication_required'},401);
 // Bound before parsing, including requests without Content-Length.
 const reader=req.body?.getReader();let bytes=0,chunks:Uint8Array[]=[];if(!reader)return json({error:'invalid_request'},400);
 while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2048){await reader.cancel();return json({error:'request_too_large'},413);}chunks.push(value);}
 let body;try{body=JSON.parse(await new Blob(chunks).text());}catch{return json({error:'invalid_request'},400);}if(!validRequest(body))return json({error:'invalid_request'},400);
 const {data:job,error}=await client.rpc('nm_ai_begin',{p_request:body.requestId,p_project:body.projectId,p_feature:body.feature});
 if(error)return json({error:error.message==='AI_QUOTA_EXCEEDED'?'quota_exceeded':'not_allowed'},error.message==='AI_QUOTA_EXCEEDED'?429:403);
 if(!job.claimed)return json({job},job.status==='reserved'?202:200);
 const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 try{
  const {data:project,error:projectError}=await client.from('pose_projects').select('id').eq('id',body.projectId).eq('user_id',auth.user.id).single();if(projectError)throw Error('project_unavailable');
  const result=await createAIService()[body.feature]({project});
  const {data:completed,error:finishError}=await admin.rpc('nm_ai_finish',{p_id:job.id,p_user:auth.user.id,p_result:result});if(finishError||!completed)throw Error('job_not_completed');
  return json({job:{...job,claimed:undefined,status:'succeeded',result}});
 }catch{
  await admin.rpc('nm_ai_finish',{p_id:job.id,p_user:auth.user.id,p_result:null,p_error:'experiment_failed'});
  return json({error:'experiment_failed',jobId:job.id},503);
 }
});
