// Offline PostgreSQL/WASM benchmark. No OpenAI traffic, no production writes.
import fs from 'node:fs';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import {aiFixture,enqueue} from '../tests/helpers/ai-db.js';import {login,A} from '../tests/helpers/pose-db.js';
const results=[];
for(const [accounts,burst] of [[100,10],[1000,100],[10000,1000]]){
 const db=await aiFixture();
 try{
 await db.exec(`insert into auth.users(id) select ('11000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid from generate_series(1,${accounts}) i;
 insert into public.workspaces(id,owner_user_id,kind) select ('21000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,('11000000-0000-4000-8000-'||lpad(i::text,12,'0'))::uuid,'personal' from generate_series(1,${accounts}) i;
 insert into private.ai2_accounts(user_id) select id from auth.users where id::text like '11000000%';
 insert into private.account_administrators(user_id) select user_id from private.ai2_accounts where user_id::text like '11000000%';
 update private.ai2_config set operations='{"conversation":{"enabled":true,"maxUsd":0.01,"credits":0}}',daily_usd=100,monthly_usd=1000;`);
 await login(db,A,'service_role');const started=performance.now(),latencies=[];
 const submitted=await Promise.all(Array.from({length:burst},async(_,i)=>{
 const suffix=String(i+1).padStart(12,'0'),t=performance.now();
 try{const r=await enqueue(db,'11000000-0000-4000-8000-'+suffix,'21000000-0000-4000-8000-'+suffix);return {accepted:r.claimed};}
 catch(e){if(e.message!=='queue_full')throw e;return {accepted:false};}
 finally{latencies.push(performance.now()-t);}
 }));
 const admissionMs=performance.now()-started,accepted=submitted.filter(x=>x.accepted).length;assert.equal(accepted,Math.min(burst,50));
 let completed=0,maxRunning=0;const processing=performance.now();
 while(completed<accepted){const claims=await Promise.all(Array.from({length:8},()=>db.query('select nm_ai2_claim(null) r')));const jobs=claims.map(r=>r.rows[0].r).filter(Boolean);maxRunning=Math.max(maxRunning,jobs.length);assert.ok(jobs.length>0&&jobs.length<=2);
 await Promise.all(jobs.map(c=>db.query('select nm_ai2_finish($1,$2,$3,$4,$5,null)',[c.job.user_id,c.job.id,{kind:'synthetic-load-test'},{},.001])));completed+=jobs.length;}
 await db.exec('reset role');const totals=(await db.query("select count(*)::int jobs,count(*) filter(where status='succeeded')::int succeeded,sum(accounted_usd)::float cost from private.ai2_jobs")).rows[0];assert.equal(totals.succeeded,accepted);assert.equal((await db.query('select count(*)::int n from private.ai2_queue')).rows[0].n,0);
 latencies.sort((a,b)=>a-b);results.push({accounts,burst,accepted,rejected:burst-accepted,maxRunning,admissionMs:Math.round(admissionMs),p50AdmissionMs:Math.round(latencies[Math.floor(latencies.length*.5)]),p95AdmissionMs:Math.round(latencies[Math.floor(latencies.length*.95)]),fakeDrainMs:Math.round(performance.now()-processing),completed,invariants:'pass'});
 }finally{await db.close();}
}
const report={testedAt:new Date().toISOString(),environment:'PGlite embedded PostgreSQL/WASM, single database session; Promise bursts are serialized by the driver. Synthetic provider, no API/network/storage/real concurrency capacity certification.',results};
fs.mkdirSync('docs/nailmoods-ai/evidence',{recursive:true});fs.writeFileSync('docs/nailmoods-ai/evidence/load-local.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
