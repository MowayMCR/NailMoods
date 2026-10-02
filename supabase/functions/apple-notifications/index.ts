import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {appleServer,currentAppleRecords} from '../_shared/appleServer.ts';
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
  if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
  try{
    const raw=await req.text();if(raw.length>96000)return reply({error:'request_too_large'},413);
    const {signedPayload}=JSON.parse(raw);
    let server,notification;
    // Both paths perform complete chain/signature/app/environment verification.
    for(const environment of (Deno.env.get('APPLE_ENVIRONMENTS')||'Sandbox').split(',')){
      try{const candidate=appleServer(environment);notification=await candidate.verifier.verifyAndDecodeNotification(signedPayload);server=candidate;break;}catch{}
    }
    if(!notification||!server)return reply({error:'invalid_signed_payload'},400);
    if(notification.notificationType==='TEST')return reply({ok:true,test:true});
    if(!notification.data?.signedTransactionInfo)return reply({ok:true,ignored:true});
    const tx=await server.verifier.verifyAndDecodeTransaction(notification.data.signedTransactionInfo);
    if(!tx.appAccountToken)return reply({ok:true,unlinked:true});
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const rpc=async(name:string,args:Record<string,unknown>)=>{const {data,error}=await admin.rpc(name,args);if(error)throw Error(error.message);return data;};
    const userId=await rpc('apple_user_for_token',{p_token:tx.appAccountToken});
    // Deleted accounts have no token mapping and are never recreated by a renewal.
    if(!userId)return reply({ok:true,unlinked:true});
    for(const record of await currentAppleRecords(server,tx.transactionId!,tx.appAccountToken))await rpc('upsert_apple_subscription',{p_user_id:userId,p_record:record});
    return reply({ok:true});
  }catch{return reply({error:'retry_required'},503);}
});
