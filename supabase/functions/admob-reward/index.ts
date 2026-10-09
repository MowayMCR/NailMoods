import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {verifyAdmobCallback} from '../_shared/admobSsv.mjs';
// Not deployed or enabled until AdMob commercial/CMP/store declarations are approved.
Deno.serve(async req=>{
 if(req.method!=='GET')return new Response('Method not allowed',{status:405});
 if(Deno.env.get('ADMOB_REWARDS_ENABLED')!=='true')return new Response('Disabled',{status:503});
 try{
  const units=[Deno.env.get('ADMOB_REWARDED_UNIT_ANDROID'),Deno.env.get('ADMOB_REWARDED_UNIT_IOS')].filter(Boolean);
  const response=await fetch('https://www.gstatic.com/admob/reward/verifier-keys.json');if(!response.ok)throw Error('keys_unavailable');
  const {keys}=await response.json();const verified=await verifyAdmobCallback(new URL(req.url).search.slice(1),keys,units);
  const server=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  const {data,error}=await server.rpc('nm_ad_confirm_reward',{p_ticket:verified.ticket,p_transaction_id:verified.transactionId});
  if(error||!data)return new Response('Reward not eligible',{status:409});
  return new Response('OK');
 }catch{return new Response('Invalid callback',{status:400});}
});
