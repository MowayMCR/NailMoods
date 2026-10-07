import {requireActiveSession,sessionGuardResponse} from '../_shared/sessionGuard.ts';
import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {DOMParser} from 'npm:linkedom@0.18.12';
import {analyzeProductURL,publicURL,boundedText} from '../_shared/productPageCore.mjs';
import {pinnedRequest} from '../_shared/productPageTransport.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async req=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  if(req.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
  const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!token)return reply({error:'AUTH_REQUIRED'},401);
  const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${token}`}}});
  const {data,error}=await client.auth.getUser(token);if(error||!data.user)return reply({error:'AUTH_REQUIRED'},401);
 try{await requireActiveSession(req.headers.get('Authorization'));}catch(e){return sessionGuardResponse(e,cors)||reply({error:'session_check_unavailable'},503);}
  const gate=await client.rpc('nm_product_import_quota');
  if(gate.error)return reply({error:'IMPORT_UNAVAILABLE'},503);
  if(!gate.data)return reply({error:'RATE_LIMIT'},429);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
  let source='';
  try {
    if(Number(req.headers.get('content-length'))>4096)throw Error('REQUEST_TOO_LARGE');
    const input=await boundedText(req,4096,controller.signal);
    source=publicURL(JSON.parse(input).url).href;
    const context={signal:controller.signal,resolve:async(host:string)=>await Deno.resolveDns(host,'A'),transport:pinnedRequest};
    const result=await analyzeProductURL(source,context,(html:string)=>new DOMParser().parseFromString(html,'text/html'));
    return reply(result);
  } catch(error) {
    const denied=sessionGuardResponse(error,cors);if(denied)return denied;
    return reply({status:'manual',candidate:{fields:{},images:[],variants:[],source,method:'url',needsVariant:false},message:'Impossible de lire automatiquement cette fiche'});
  } finally {clearTimeout(timer);}
});
