import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
import {verifyAdmobCallback} from '../_shared/admobSsv.mjs';
// Not deployed or enabled until AdMob commercial/CMP/store declarations are approved.
Deno.serve(async req=>{
 if(req.method!=='GET')return new Response('Method not allowed',{status:405});
 if(Deno.env.get('ADMOB_REWARDS_ENABLED')!=='true')return new Response('Disabled',{status:503});
 try{
  const configured: Array<[string | undefined,string]>=[
   [Deno.env.get('ADMOB_REWARDED_UNIT_ANDROID'),'android'],
   [Deno.env.get('ADMOB_REWARDED_UNIT_IOS'),'ios']
  ];
  const unitPlatforms=new Map<string,string>(),units: string[]=[];
  for(const [unit,platform] of configured){
   if(!unit)continue;
   if(!/^ca-app-pub-\d{16}\/\d+$/.test(unit))return new Response('Configuration unavailable',{status:503});
   const suffix=unit.split('/')[1];
   if(unitPlatforms.has(unit)||unitPlatforms.has(suffix))return new Response('Ambiguous units',{status:503});
   units.push(unit);unitPlatforms.set(unit,platform);unitPlatforms.set(suffix,platform);
  }
  if(!units.length)return new Response('Configuration unavailable',{status:503});
  let keys;
  try{
   const response=await fetch('https://www.gstatic.com/admob/reward/verifier-keys.json',{signal:AbortSignal.timeout(10000)});
   if(!response.ok)return new Response('Verification unavailable',{status:503});
   ({keys}=await response.json());
   if(!Array.isArray(keys))return new Response('Verification unavailable',{status:503});
  }catch{return new Response('Verification unavailable',{status:503});}
  const verified=await verifyAdmobCallback(new URL(req.url).search.slice(1),keys,units);
  const platform=typeof verified.adUnit==='string'?unitPlatforms.get(verified.adUnit):undefined;
  if(!platform)return new Response('Invalid platform',{status:400});
  const server=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
  const {data,error}=await server.rpc('nm_ad_confirm_platform_reward',{p_ticket:verified.ticket,p_transaction_id:verified.transactionId,p_platform:platform});
  if(error)return new Response('Verification unavailable',{status:503});
  if(!data)return new Response('Reward not eligible',{status:409});
  return new Response('OK');
 }catch{return new Response('Invalid callback',{status:400});}
});
