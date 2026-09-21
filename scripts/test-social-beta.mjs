import {createClient} from '@supabase/supabase-js';
import {readFileSync,writeFileSync} from 'node:fs';
const fixtures=JSON.parse(process.env.NM_SOCIAL_FIXTURES||'null');
if(!fixtures)throw Error('Isolated fixture credentials required');
const env=Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>/^[A-Z_]+=/.test(l)).map(l=>{const n=l.indexOf('=');return[l.slice(0,n),l.slice(n+1).replace(/^['"]|['"]$/g,'')];}));
const url=env.VITE_SUPABASE_URL;if(new URL(url).hostname!=='pueqkbwfwxgqzmkauxoz.supabase.co')throw Error('Recette only');
const key=env.VITE_SUPABASE_PUBLISHABLE_KEY;
const results={date:new Date().toISOString(),auth:[],checks:[],load:[],limitations:['3 pre-existing fixture accounts; concurrency models sessions, not 50 distinct people','No physical second-device test','No uploads or Edge Function load in this script']};
const clients={};
const ok=async p=>{const r=await p;if(r.error)throw Error(r.error.code||'request_failed');return r.data;};
const call=(c,a,d={})=>ok(c.rpc('nm_social',{p_action:a,p_data:d}));
try{
 for(const label of ['a','b','c']){const c=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(url,options)=>fetch(url,{...options,signal:AbortSignal.timeout(12000)})}});clients[label]=c;const t=performance.now();await ok(c.auth.signInWithPassword({email:fixtures[label].email,password:fixtures[label].password}));results.auth.push({label,duration_ms:Math.round(performance.now()-t),success:true});}
 const a=clients.a,b=clients.b,c=clients.c;
 const profiles={};for(const label of ['a','b'])profiles[label]=(await ok(clients[label].from('profiles').select('username,display_name,discovery_visibility').eq('id',fixtures[label].id).single()));
 const before=await call(a,'list');if(before.some(r=>r.user_id===fixtures.b.id))throw Error('fixture_pair_already_in_use');
 let rel;
 try{
 for(const label of ['a','b'])await ok(clients[label].rpc('set_nailmoods_identity',{p_handle:'social.fixture.'+label,p_visibility:'everyone',p_display_name:'Social fixture '+label}));
 rel=await call(a,'request',{handle:'social.fixture.b'});const duplicate=await call(a,'request',{handle:'social.fixture.b'});if(rel.id!==duplicate.id)throw Error('duplicate');
 await call(b,'accept',{id:rel.id});
 const client_id=crypto.randomUUID();await call(a,'send',{user_id:fixtures.b.id,body:'SOCIAL_BETA_AUTOMATED_TEST',client_id});await call(a,'send',{user_id:fixtures.b.id,body:'SOCIAL_BETA_AUTOMATED_TEST',client_id});
 const history=await call(b,'history',{user_id:fixtures.a.id});if(history.messages.filter(m=>m.body==='SOCIAL_BETA_AUTOMATED_TEST').length!==1)throw Error('message_retry_duplicate');
 let denied=false;try{await call(c,'history',{user_id:fixtures.a.id});}catch{denied=true;}if(!denied)throw Error('isolation_failed');
 results.checks.push('real Auth A/B/C','request and duplicate prevention','acceptance','message and retry deduplication','history B','C denied');
 for(const concurrency of [10,25,50]){
 const timings=[],errors=[];const start=performance.now();
 await Promise.all(Array.from({length:concurrency},async(_,i)=>{const t=performance.now();const user=['a','b','c'][i%3];const cl=clients[user];try{switch(i%4){case 0:await ok(cl.from('profiles').select('id').eq('id',fixtures[user].id));break;case 1:await ok(cl.from('user_products').select('id').limit(50));break;case 2:await ok(cl.rpc('nm_discover',{p_action:'discover',p_data:{}}));break;default:await call(cl,'list');}}catch(e){errors.push(e.message);}timings.push(performance.now()-t);}));timings.sort((a,b)=>a-b);results.load.push({concurrent_requests:concurrency,total_ms:Math.round(performance.now()-start),median_ms:Math.round(timings[Math.floor(timings.length/2)]),p95_ms:Math.round(timings[Math.ceil(timings.length*.95)-1]),errors:errors.length,error_codes:[...new Set(errors)]});
 }
 await call(a,'remove',{id:rel.id});rel=null;let deniedSend=false;try{await call(a,'send',{user_id:fixtures.b.id,body:'blocked',client_id:crypto.randomUUID()});}catch{deniedSend=true;}if(!deniedSend)throw Error('removal_failed');results.checks.push('send denied after removal');
 await ok(b.auth.signOut());await ok(b.auth.signInWithPassword({email:fixtures.b.email,password:fixtures.b.password}));await call(b,'list');results.checks.push('signout/signin and social reload');
 }finally{if(rel)await call(a,'remove',{id:rel.id}).catch(()=>{});for(const label of ['a','b']){const old=profiles[label];if(old.username)await ok(clients[label].rpc('set_nailmoods_identity',{p_handle:old.username,p_visibility:old.discovery_visibility,p_display_name:old.display_name}));}}
}catch(e){results.failure=e.message;process.exitCode=1;}finally{for(const c of Object.values(clients))await c.auth.signOut().catch(()=>{});writeFileSync('phase12/social-beta-live-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));}
