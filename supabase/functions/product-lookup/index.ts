import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {DOMParser} from 'npm:linkedom@0.18.12';
import {boundedText} from '../_shared/productPageCore.mjs';
import {lookupProduct,normalizeLookupInput,lookupKey} from '../_shared/productLookupCore.mjs';
import {pinnedRequest} from '../_shared/productPageTransport.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info','Access-Control-Allow-Methods':'POST, OPTIONS'};
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
const cache=new Map<string,{expires:number,result:unknown}>();
Deno.serve(async req=>{
 if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
 if(req.method!=='POST')return reply({error:'METHOD_NOT_ALLOWED'},405);
 const token=req.headers.get('authorization')?.replace(/^Bearer\s+/i,'');if(!token)return reply({error:'AUTH_REQUIRED'},401);
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 const {data,error}=await client.auth.getUser(token);if(error||!data.user)return reply({error:'AUTH_REQUIRED'},401);
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);
 try {
  const raw=JSON.parse(await boundedText(req,2048,controller.signal)),input=normalizeLookupInput(raw);
  if(!input.sufficient)return reply({status:'insufficient',candidates:[],message:'Ajoute un code-barres, un numéro de teinte ou un nom exact.'});
  const gate=await client.rpc('nm_product_import_quota');if(gate.error)return reply({error:'LOOKUP_UNAVAILABLE'},503);if(!gate.data)return reply({error:'RATE_LIMIT'},429);
  const key=lookupKey(input),hit=cache.get(key);
  if(!raw.refresh&&hit&&hit.expires>Date.now())return reply({...hit.result as object,cached:true});
  const result=await lookupProduct(raw,{signal:controller.signal,resolve:(host:string)=>Deno.resolveDns(host,'A'),transport:pinnedRequest},(html:string)=>new DOMParser().parseFromString(html,'text/html'));
  if(['found','ambiguous','not_found'].includes(result.status)) {
   if(cache.size>=200)cache.delete(cache.keys().next().value!);
   cache.set(key,{result,expires:Date.now()+(result.candidates.length?3600000:600000)});
  }
  return reply({...result,cached:false});
 } catch {return reply({status:'unavailable',candidates:[],message:'La recherche Internet n’a pas pu être terminée. La saisie manuelle reste disponible.'});}
 finally {clearTimeout(timer);}
});
