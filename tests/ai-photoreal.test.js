import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {pngBytes,compositionPrompt,estimateCost,renderPhotoreal,IMAGE_MODEL} from '../supabase/functions/ai-internal/photoreal.mjs';
import {validRequest} from '../supabase/functions/ai-internal/provider.mjs';
import {setup,login,insert,A,B,WA} from './helpers/pose-db.js';import {newProject} from '../src/poseCycle/model.js';
const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);new DataView(bytes.buffer).setUint32(16,1024);new DataView(bytes.buffer).setUint32(20,512);
const encoded=Buffer.from(bytes).toString('base64'),png='data:image/png;base64,'+encoded;
const project={title:'PRIVATE TITLE',details:{notes:'PRIVATE NOTES',composition:{shape:'Amande',length:'Courte',nails:Array.from({length:5},(_,i)=>({color:'#aa1122',technique:'French '+i}))}}};
test('photoreal adapter validates before paid call, sends only composition, one output and no retries',async()=>{
 let calls=0;const fetcher=async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/images/edits');assert.equal(options.body.get('model'),IMAGE_MODEL);assert.equal(options.body.get('n'),'1');assert.equal(options.body.get('quality'),'medium');assert.equal(options.body.get('image[]').type,'image/png');assert.equal(options.body.get('prompt').includes('PRIVATE'),false);return {ok:true,json:async()=>({data:[{b64_json:encoded}],usage:{input_tokens_details:{text_tokens:100,image_tokens:200},output_tokens:300}})};};
 await assert.rejects(renderPhotoreal({project,referenceImage:png,fetcher}),/provider_not_configured/);assert.equal(calls,0);
 await assert.rejects(renderPhotoreal({apiKey:'test-key',project,referenceImage:'bad',fetcher}),/invalid_reference/);assert.equal(calls,0);
 const result=await renderPhotoreal({apiKey:'test-key',project,referenceImage:png,fetcher});assert.equal(calls,1);assert.equal(result.metadata.renderCount,1);assert.equal(result.metadata.estimatedCostUsd,.0111);assert.deepEqual(result.image,bytes);
 calls=0;await assert.rejects(renderPhotoreal({apiKey:'test-key',project,referenceImage:png,fetcher:async()=>{calls++;return {ok:false,status:429};}}),/provider_busy/);assert.equal(calls,1);
 assert.equal(estimateCost({}),null);assert.equal(estimateCost({input_tokens_details:{text_tokens:-1,image_tokens:0},output_tokens:0}),null);
 assert.throws(()=>compositionPrompt({}),/composition_required/);assert.equal(compositionPrompt(project).includes('French 4'),true);
 assert.throws(()=>pngBytes('data:image/png;base64,'+Buffer.from('junk').toString('base64')),/invalid_reference/);
 const req={requestId:crypto.randomUUID(),projectId:crypto.randomUUID(),feature:'generateVariation',referenceImage:png};assert.equal(validRequest(req),true);assert.equal(validRequest({...req,feature:'analyzeHand'}),false);assert.equal(validRequest({action:'read',jobId:req.requestId}),true);assert.equal(validRequest({action:'read',jobId:req.requestId,userId:A}),false);
});
test('generated usage stays server-only, unknown cost is null, account deletion includes private service uploads only for owner',async()=>{
 const db=await setup();try{
 await db.exec(fs.readFileSync('supabase/migrations/20261004193101_ai_internal_jobs.sql','utf8'));
 await db.exec(`create schema storage;create table storage.objects(bucket_id text,name text,owner_id text);create function private.nm_account_deletion_check(text) returns uuid language sql as $$select auth.uid()$$;grant usage on schema private to service_role;`);
 await db.exec(fs.readFileSync('supabase/migrations/20261006153044_ai_photoreal_provider.sql','utf8'));
 await db.exec("insert into private.addon_internal_accounts values('"+A+"');update private.addon_feature_flags set enabled=true;insert into private.addon_entitlements(user_id,feature,source,source_ref,status) values('"+A+"','ai_plus','beta','test','active');");
 await login(db,A);const p=await insert(db,'pose_projects',newProject({userId:A,workspaceId:WA}));const j=(await db.query('select nm_ai_begin($1,$2,$3) j',[crypto.randomUUID(),p.id,'generateVariation'])).rows[0].j;
 await assert.rejects(db.query('select nm_ai_finish($1,$2,$3)',[j.id,A,{generated:true}]),/permission/);
 await login(db,A,'service_role');const result={generated:true,provider:'openai',model:IMAGE_MODEL,renderCount:1,estimatedCostUsd:null};await db.query('select nm_ai_finish($1,$2,$3)',[j.id,A,result]);
 await db.exec('reset role');const row=(await db.query('select * from private.ai_jobs where id=$1',[j.id])).rows[0];assert.equal(row.provider,'openai');assert.equal(row.render_count,1);assert.equal(row.estimated_cost_usd,null);
 await db.query('insert into storage.objects values($1,$2,null),($1,$3,null),($4,$2,null),($1,$5,null)',['nailmoods-private',`${A}/${WA}/ai/${j.id}.png`,`${B}/${WA}/ai/${j.id}.png`,'public',`${A}/${WA}/photos/${j.id}.png`]);
 await login(db,A);const paths=(await db.query("select * from private.nm_account_deletion_objects('test')")).rows;assert.deepEqual(paths,[{bucket:'nailmoods-private',object_path:`${A}/${WA}/ai/${j.id}.png`}]);
 }finally{await db.close();}
});
