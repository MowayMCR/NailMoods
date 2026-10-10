import test from 'node:test';import assert from 'node:assert/strict';
import {aiFixture,enqueue} from './helpers/ai-db.js';import {login,A,B,C,WA,WB} from './helpers/pose-db.js';
const claim=async(db,user=null)=>(await db.query('select nm_ai2_claim($1) r',[user])).rows[0].r;
const finish=async(db,j,error=null,cost=.01)=>(await db.query('select nm_ai2_finish($1,$2,$3,$4,$5,$6) r',[j.user_id,j.id,{kind:'plan'},{},cost,error])).rows[0].r;
test('queue: durable admission, single claim, per-account concurrency, replay and isolation',async()=>{const db=await aiFixture();try{
 await login(db,A,'service_role');const request=crypto.randomUUID(),thread=crypto.randomUUID();const a=await enqueue(db,A,WA,request,thread);
 assert.equal((await enqueue(db,A,WA,request,thread)).claimed,false);
 await enqueue(db,A,WA);await assert.rejects(enqueue(db,A,WA),/account_busy/);
 await enqueue(db,B,WB);const first=await claim(db,A);assert.equal(first.job.id,a.job.id);assert.equal(await claim(db,A),null);
 const second=await claim(db,B);assert.ok(second);assert.equal(await claim(db),null);
 assert.equal(await finish(db,first.job),true);assert.equal(await finish(db,first.job),false);assert.ok(await claim(db,A));
 await login(db,B);await assert.rejects(db.query('select nm_ai2_status($1)',[a.job.id]),/not_allowed/);await assert.rejects(db.query('select * from private.ai2_queue'),/permission/);await assert.rejects(db.query('select nm_ai2_claim(null)'),/permission/);
 await login(db,A);assert.equal((await db.query('select nm_ai2_status($1) r',[a.job.id])).rows[0].r.status,'succeeded');
 }finally{await db.close();}});
test('queue: expiry, kill switch, unknown cost and circuit breaker fail closed',async()=>{const db=await aiFixture();try{
 await login(db,A,'service_role');const a=await enqueue(db,A,WA);await claim(db,A);
 await db.exec("reset role;update private.ai2_queue set lease_until=now()-interval '1 second';select private.ai2_queue_sweep();");
 assert.equal((await db.query('select cost_known from private.ai2_jobs where id=$1',[a.job.id])).rows[0].cost_known,false);
 await login(db,A,'service_role');assert.equal(await finish(db,a.job),false);
 for(let i=0;i<2;i++){await enqueue(db,A,WA);const c=await claim(db,A);await finish(db,c.job,'provider_busy',null);}
 await assert.rejects(enqueue(db,A,WA),/provider_circuit_open/);
 await db.exec("reset role;update private.ai2_config set circuit_until=null,consecutive_failures=0");await login(db,A,'service_role');const b=await enqueue(db,A,WA);
 await login(db,A);await db.query('select nm_ai2_switch(false)');await db.exec('reset role;select private.ai2_queue_sweep()');
 const cancelled=(await db.query('select status,accounted_usd,cost_known from private.ai2_jobs where id=$1',[b.job.id])).rows[0];assert.equal(cancelled.status,'failed');assert.equal(Number(cancelled.accounted_usd),0);assert.equal(cancelled.cost_known,true);
 }finally{await db.close();}});
test('queue: per-tier/account budget, operation quota, full queue and nonce cannot be replayed',async()=>{const db=await aiFixture();try{
 await db.exec(`update private.ai2_accounts set limits='{"dailyUsd":0.05,"monthlyUsd":1,"dailyRequests":10}' where user_id='${A}';`);await login(db,A,'service_role');await assert.rejects(enqueue(db,A,WA),/account_budget_exceeded/);
 await db.exec(`reset role;update private.ai2_accounts set limits='{"dailyUsd":2,"monthlyUsd":10,"dailyRequests":10}' where user_id='${A}';update private.ai2_config set queue_limit=1;`);await login(db,A,'service_role');await enqueue(db,A,WA);await assert.rejects(enqueue(db,B,WB),/queue_full/);
 const nonce='a'.repeat(64);await db.exec(`reset role;insert into private.ai2_dispatch_nonces values(encode(sha256(convert_to('${nonce}','UTF8')),'hex'),now()+interval '2 minutes');`);await login(db,A,'service_role');assert.equal((await db.query('select nm_ai2_consume_dispatch($1) r',[nonce])).rows[0].r,true);assert.equal((await db.query('select nm_ai2_consume_dispatch($1) r',[nonce])).rows[0].r,false);
 await login(db,C);await assert.rejects(db.query('select nm_ai2_health()'),/not_allowed/);
 }finally{await db.close();}});
