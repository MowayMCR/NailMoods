import {requireActiveSession} from '../_shared/sessionGuard.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { appleServer, currentAppleRecords } from '../_shared/appleServer.ts';
const cors = {'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply = (data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return reply({error:'method_not_allowed'},405);
  try {
    const raw=await req.text(); if(raw.length>24000)return reply({error:'request_too_large'},413);
    let body;try{body=JSON.parse(raw);}catch{return reply({error:'invalid_json'},400);}
    if(!body||typeof body!=='object'||Array.isArray(body))return reply({error:'invalid_request'},400);
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const scheduler=req.headers.get('x-nm-reconcile-key');
    if(scheduler){
      const {data:batch,error}=await admin.rpc('apple_scheduler_context',{p_nonce:scheduler});
      if(error)return reply({error:'invalid_scheduler_key'},401);
      let verified=0,failed=0;
      if(batch.enabled)for(const item of batch.subscriptions)try{
        const server=appleServer(item.environment);
        for(const record of await currentAppleRecords(server,item.transactionId,item.accountToken)){
          const {error}=await admin.rpc('upsert_apple_subscription',{p_user_id:item.userId,p_record:record});
          if(error)throw error;
        }verified++;
      }catch{failed++;}
      return reply({verified,failed});
    }
    const bearer=req.headers.get('Authorization')||'';
    const {data:{user},error}=await admin.auth.getUser(bearer.startsWith('Bearer ')?bearer.slice(7):'');
    if(error||!user?.email_confirmed_at)return reply({error:'authentication_required'},401);
    const rpc=async(name:string,args:Record<string,unknown>)=>{const {data,error}=await admin.rpc(name,args);if(error)throw Error(error.message);return data;};
    await requireActiveSession(bearer);
    const context=await rpc('apple_server_context',{p_user_id:user.id,p_environment:body.environment});
    if(body.action==='prepare'){
      let configured=false; try{appleServer(body.environment);configured=true;}catch{}
      return reply({...context,enabled:context.enabled&&configured});
    }
    if(!context.enabled)throw Error('billing_not_configured');
    const server=appleServer(body.environment);
    const verify=async(id:string)=>{
      let entitlement;
      for(const record of await currentAppleRecords(server,id,context.accountToken)) entitlement=await rpc('upsert_apple_subscription',{p_user_id:user.id,p_record:record});
      return {ok:true,entitlement};
    };
    if(body.action==='refresh'){
      const subscriptions=await rpc('apple_subscriptions_for_user',{p_user_id:user.id,p_environment:body.environment});
      let failed=0;for(const sub of subscriptions)try{await verify(sub.transactionId);}catch{failed++;}
      return reply({ok:true,failed,entitlement:await rpc('billing_entitlement_for_user',{p_user_id:user.id})});
    }
    // A client JWS is verified before using its id; it is never itself an access grant.
    const tx=await server.verifier.verifyAndDecodeTransaction(body.signedTransaction);
    return reply(await verify(tx.transactionId!));
  }catch(e){
    const message=e instanceof Error?e.message:'';
    const code=['SESSION_REPLACED','authentication_required','purchase_account_mismatch','purchase_owned_by_another_account','billing_not_configured','sandbox_account_required','invalid_environment','rate_limit','billing_ineligible'].find(v=>message.includes(v))||'verification_unavailable';
    return reply({error:code},['authentication_required','SESSION_REPLACED'].includes(code)?401:code==='verification_unavailable'||code==='billing_not_configured'?503:400);
  }
});
