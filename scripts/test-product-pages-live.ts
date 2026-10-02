import {DOMParser} from 'npm:linkedom@0.18.12';
import {analyzeProductURL} from '../supabase/functions/_shared/productPageCore.mjs';
import {pinnedRequest} from '../supabase/functions/_shared/productPageTransport.ts';
const products=JSON.parse(await Deno.readTextFile('public/catalog-v2.json')).products;
const results=[];
for(const brand of ['Manucurist','KIKO Milano','OPI','CANNI','Le Mini Macaron']) {
 const url=products.find((p:any)=>p.brand===brand)?.url;
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try {
  const result=await analyzeProductURL(url,{resolve:(host:string)=>Deno.resolveDns(host,'A'),transport:pinnedRequest,signal:controller.signal},(html:string)=>new DOMParser().parseFromString(html,'text/html'));
  results.push({brand,url,status:result.status,evidence:result.evidence,fields:result.candidate.fields,at:new Date().toISOString()});
 } catch(e){results.push({brand,url,status:'manual',reason:String(e),at:new Date().toISOString()});}
 finally{clearTimeout(timer);}
 console.log(brand,results.at(-1)?.status);
}
await Deno.writeTextFile('docs/beta-correctifs-20261002/evidence/real-product-urls.json',JSON.stringify({scope:'Actual external pages through pinned server transport; no account authentication or mobile-device claim',results},null,2));
