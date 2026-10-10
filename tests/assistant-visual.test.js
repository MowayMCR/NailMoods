import test from 'node:test';import assert from 'node:assert/strict';
import {visualPrompt} from '../supabase/functions/nailmoods-ai/visual.mjs';
import {runProvider} from '../supabase/functions/nailmoods-ai/provider.mjs';
const composition={shape:'Amande',length:'Courte',nails:Array.from({length:5},(_,i)=>({color:'#813c60',accentColor:'#cba358',technique:'french',drawingTechnique:i===3?'leopard':'',finish:'Brillant'})),notes:'PRIVATE NOTES'};
test('realism recreates an attached manicure with physical materials; illustration has a separate style',()=>{
 const prompt=visualPrompt(composition,'realistic');assert.match(prompt,/PHOTOREALISTIC.*real adult human hand/);assert.match(prompt,/natural cuticles/);assert.match(prompt,/ONLY a design\/color diagram/);assert.match(prompt,/cat-eye/);assert.match(prompt,/leopard/);assert.equal(prompt.includes('PRIVATE NOTES'),false);
 assert.match(visualPrompt(composition,'illustration'),/hand-painted/);assert.doesNotMatch(visualPrompt(composition,'illustration'),/PHOTOREALISTIC/);assert.throws(()=>visualPrompt({},'realistic'),/composition_required/);
});
test('realistic provider uses a single bounded image edit, with the new photographic brief',async()=>{
 const bytes=new Uint8Array(24);bytes.set([137,80,78,71,13,10,26,10]);new DataView(bytes.buffer).setUint32(16,1024);new DataView(bytes.buffer).setUint32(20,512);const b64=Buffer.from(bytes).toString('base64');let paid=0;
 const r=await runProvider({body:{operation:'realistic',prompt:'Ma French',referenceImage:'data:image/png;base64,'+b64,composition},products:[],maxUsd:.5,config:{enabled:true,apiKey:'mock-only',imageModel:'mock-image',imageMax:.5,imageTextPrice:5,imageInputPrice:8,imageOutputPrice:30},fetcher:async(url,options)=>{if(url.endsWith('/moderations'))return {ok:true,json:async()=>({results:[{flagged:false}]})};paid++;assert.equal(options.body.get('n'),'1');assert.match(options.body.get('prompt'),/real adult human hand/);return {ok:true,json:async()=>({data:[{b64_json:b64}],usage:{input_tokens_details:{text_tokens:100,image_tokens:200},output_tokens:300}})};}});
 assert.equal(paid,1);assert.equal(r.result.kind,'realistic');assert.equal(r.result.qualityValidated,false);assert.equal(r.cost,.0111);
});
