import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {saveRealisticCopy,publicationMedia} from '../src/assistant/publicationMedia.js';
const idea={key:'pose',isPublic:true,publicMediaPath:'old-public',ai:{media:{realistic:{jobId:'job-new'}}}};
test('saving realism reads only an owned completed job, archives privately, and refreshes a changed render',async t=>{
 const fetchOriginal=globalThis.fetch,readerOriginal=globalThis.FileReader,calls=[];
 t.after(()=>{globalThis.fetch=fetchOriginal;globalThis.FileReader=readerOriginal;});
 globalThis.fetch=async()=>({ok:true,blob:async()=>new Blob(['test'],{type:'image/png'})});
 globalThis.FileReader=class{readAsDataURL(){this.result='data:image/png;base64,dGVzdA==';queueMicrotask(()=>this.onload());}};
 const client={functions:{invoke:async(_,{body})=>{calls.push(body);return{data:{status:'succeeded',result:{kind:'realistic',imageUrl:'https://owned.test/render'}}};}}};
 const saved=await saveRealisticCopy(client,idea);assert.equal(saved.isPublic,false);assert.equal(saved.publicMediaPath,null);assert.equal(saved.publicationVisual,'drawing');assert.equal(saved.savedRenderingJobId,'job-new');
 assert.deepEqual(calls,[{action:'status',jobId:'job-new'}]);await saveRealisticCopy(client,saved);assert.equal(calls.length,1);
 await saveRealisticCopy(client,{...saved,ai:{media:{realistic:{jobId:'job-newer'}}}});assert.equal(calls.length,2);assert.equal(calls[1].jobId,'job-newer');
 assert.deepEqual(await publicationMedia(null,saved,'drawing'),{publicationVisual:'drawing',publicMediaPath:null});
 const chosen=await publicationMedia(null,saved,'realistic');assert.equal(chosen.photo,saved.photo);assert.equal(chosen.publicMediaPath,null);assert.equal(chosen.isPublic,undefined);assert.equal(calls.length,2);
 await assert.rejects(publicationMedia(null,saved,'unsupported'),/render_unavailable/);
});
test('wrong image kind or inaccessible job cannot become a public photo',async()=>{
 const client={functions:{invoke:async()=>({data:{status:'succeeded',result:{kind:'illustration',imageUrl:'https://owned.test/wrong'}}})}};
 await assert.rejects(saveRealisticCopy(client,idea),/render_unavailable/);
 await assert.rejects(publicationMedia(null,{key:'no-render'},'realistic'),/render_unavailable/);
});
test('public preview carries only the selected visual and ten bounded nail designs, without private metadata',async()=>{
 const db=new PGlite();try{await db.exec('create schema private; create role anon; create role authenticated;');await db.exec(fs.readFileSync('supabase/migrations/20261011060724_ai_public_visual_choice.sql','utf8'));
 const snapshot={nails:Array.from({length:7},()=>({color:'#123456',productId:'private-product'})),secondHand:{nails:Array.from({length:9},()=>({color:'#654321'})),secondHand:{nails:[{}]}},publicationVisual:'realistic',photo:'private-path',ai:{jobId:'secret'}};
 const r=await db.query('select private.discovery_preview($1::jsonb) as preview',[JSON.stringify(snapshot)]);const p=r.rows[0].preview;
 assert.equal(p.publicationVisual,'realistic');assert.equal(p.nails.length,5);assert.equal(p.secondHand.nails.length,5);assert.equal(p.secondHand.secondHand,null);assert.equal(p.photo,undefined);assert.equal(p.ai,undefined);assert.equal(p.nails[0].productId,undefined);
 const rights=await db.query("select has_function_privilege('anon','private.discovery_preview(jsonb)','execute') as anon,has_function_privilege('authenticated','private.discovery_preview(jsonb)','execute') as signed");assert.equal(rights.rows[0].anon,false);assert.equal(rights.rows[0].signed,false);
 }finally{await db.close();}
});
