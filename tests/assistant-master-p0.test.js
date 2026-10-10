import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {validatePlan,CONCEPT_COLORS} from '../supabase/functions/nailmoods-ai/contract.mjs';
import {validateArt,createMaster,fingerId} from '../supabase/functions/nailmoods-ai/master.mjs';
import {qualityDecision} from '../supabase/functions/nailmoods-ai/quality.mjs';
import {ideaFromPlan,minimalComposition,tutorialFor,withResultMedia} from '../src/assistant/model.js';
import {suggestTags,searchTerms} from '../src/social/tags.js';
const body={prompt:'Pose gothique vampire Halloween',shape:'Ronde',length:'Moyenne',level:1,collectionOnly:false};
const plan=()=>({action:'compose',message:'Pose',title:'Pause gothique vampire Halloween',shape:'Ronde',length:'Moyenne',level:1,collectionOnly:false,editFinger:null,direction:{intention:body.prompt,universe:'Vampire',paletteNotes:'Noir et bordeaux',composition:'Accent sur chaque main',avoid:['objet magique'],minimalist:false},nails:Array.from({length:10},(_,finger)=>({finger,productId:'concept-burgundy',accentProductId:'concept-black',technique:'line',drawingTechnique:'line',motif:'',designBrief:'Motif vampire '+finger,art:{role:finger%3?'accompagnement':'principal',signature:'Dentelle géométrique variante '+String.fromCharCode(65+finger),techniques:['line'],motifs:[{name:'Chauve-souris',description:'Silhouette vampire',rationale:'Univers demandé',x:40+finger,y:60,size:30,technique:'line'}],steps:['Dessine la silhouette à cet emplacement'],materials:['Pinceau liner']}}))});
test('master is shared by image specification, persisted pose, tutorial and safe tags',()=>{
 const p=validatePlan(plan(),CONCEPT_COLORS,{designCount:10}),master=createMaster(p,CONCEPT_COLORS,body),idea=ideaFromPlan(p,{products:CONCEPT_COLORS,master});
 assert.equal(idea.title,'Pose gothique vampire Halloween');assert.equal(master.version,2);assert.equal(new Set(master.nails.map(n=>n.id)).size,10);assert.deepEqual(minimalComposition(idea).master,master);
 const steps=tutorialFor(idea).filter(s=>s.motifs);assert.equal(steps.length,10);assert.ok(steps.every(s=>s.motifs[0].name==='Chauve-souris'));assert.ok(steps.some(s=>s.hand==='right'&&s.targets[0]===3));
 const tags=suggestTags(idea);assert.ok(tags.moods.includes('Goth'));assert.ok(tags.themes.includes('Vampire'));assert.ok(tags.themes.includes('Halloween'));assert.ok(tags.themes.includes('Chauve-souris'));assert.ok(!Object.values(tags).flat().includes('Harry Potter'));assert.ok(!JSON.stringify(tags).includes('Pinceau'));
});
test('off-theme cultural objects, color-only duplicates and incompatible difficulty fail before images',()=>{
 const p=plan();p.nails[4].motif='winged-orb';assert.throws(()=>validateArt(p,body.prompt),/unrelated_motif/);
 assert.doesNotThrow(()=>validateArt(p,'Harry Potter vif d’or'));assert.throws(()=>validateArt(p,'Vampire, aucun Vif d’or'),/unrelated_motif/);
 const duplicate=plan();duplicate.nails[1].art.signature=duplicate.nails[0].art.signature;assert.throws(()=>validateArt(duplicate,body.prompt),/repeated_designs/);
 const easy=plan();easy.level=0;easy.nails[0].art.techniques=['gel-3d'];easy.nails[0].art.motifs[0].technique='gel-3d';assert.throws(()=>validateArt(easy,body.prompt),/difficulty_mismatch/);
});
test('a right ring edit preserves nine stable fingers, direction, shape and original request',()=>{
 const first=createMaster(plan(),CONCEPT_COLORS,body),p=plan();p.action='edit';p.editFinger=8;p.nails=[{...p.nails[8],designBrief:'Dentelle adaptée'}];
 const next=createMaster(p,CONCEPT_COLORS,{...body,prompt:'Change seulement l’annulaire droit',shape:'Carrée',composition:{master:first}});
 assert.equal(next.revision,2);assert.equal(next.shape,first.shape);assert.deepEqual(next.direction,first.direction);assert.equal(next.originalRequest,first.originalRequest);
 for(const n of first.nails)if(n.finger!==8)assert.deepEqual(next.nails[n.finger],n);assert.equal(next.nails[8].id,fingerId(8));assert.equal(next.nails[8].designBrief,'Dentelle adaptée');
});
test('a beautiful image with a missing motif is nonconforming; automatic assessment never grants human approval',()=>{
 const report={scores:Object.fromEntries(['fidelity','universe','artistry','complexity','shapeLength','motifs','consistency','materials','tutorial','tags'].map(k=>[k,5])),criticalFailures:[],fingers:Array.from({length:10},(_,i)=>({id:fingerId(i),observed:'Motif',missing:[],moved:[],uncertain:false})),summary:'Test'};
 assert.equal(qualityDecision(report,10).status,'pending_human');assert.equal(qualityDecision(report,10).humanValidated,false);
 report.fingers[8].missing=['Strass'];assert.equal(qualityDecision(report,10).status,'nonconforming');report.criticalFailures=['anatomy'];assert.equal(qualityDecision(report,10).status,'nonconforming');
});
test('multitechnique retains all four effects in the master, tutorial and tags',()=>{
 const p=plan();p.nails[0].art.techniques=['french','aura','gel-3d','rhinestones'];p.nails[0].art.motifs[0].technique='french';const master=createMaster(p,CONCEPT_COLORS,{...body,prompt:'French Aura relief 3D strass'}),idea=ideaFromPlan(p,{products:CONCEPT_COLORS,master});
 assert.deepEqual(idea.nails[0].techniques,['line','french','aura','gel-3d','rhinestones']);assert.deepEqual(tutorialFor(idea).find(s=>s.motifs&&s.targets[0]===0).techniques,p.nails[0].art.techniques);
 const tags=suggestTags(idea);assert.ok(tags.techniques.includes('French'));assert.ok(tags.techniques.includes('Aura'));assert.ok(tags.techniques.includes('3D'));assert.ok(tags.techniques.includes('Strass'));
});
test('social search uses AND criteria and FR/EN aliases without related aesthetic expansion',async()=>{
 assert.deepEqual(searchTerms('Halloween vampire'),['halloween','vampire']);assert.ok(searchTerms('Nail Art Cat Eye hiver').includes('cat eye'));assert.ok(searchTerms('gothic rhinestones').includes('goth'));assert.ok(searchTerms('gothic rhinestones').includes('strass'));
 const db=new PGlite();try{await db.exec('create schema private; create role anon;create role authenticated;');const migration=fs.readFileSync('supabase/migrations/20261010182830_ai_artistic_search_p0.sql','utf8');await db.exec(migration.slice(migration.indexOf('-- Search'),migration.indexOf('CREATE OR REPLACE FUNCTION private.nm_discover')));
 const r=await db.query("select private.ai_search_match('Pose vampire Halloween noir', '{\"query\":\"Halloween vampire\",\"searchTerms\":[\"halloween\",\"vampire\"]}') yes,private.ai_search_match('Pose fleurs Halloween', '{\"query\":\"Halloween vampire\",\"searchTerms\":[\"halloween\",\"vampire\"]}') no;");assert.equal(r.rows[0].yes,true);assert.equal(r.rows[0].no,false);
 // The replacement retains live visibility and block predicates; no private collection join.
 assert.match(migration,/where i.is_public/);assert.match(migration,/j.visibility='public'/);assert.match(migration,/private.discovery_visible/);assert.doesNotMatch(migration,/user_products/);
 }finally{await db.close();}
});

test('the full public discovery query removes private and blocked creations immediately',async()=>{
 const db=new PGlite();try{await db.exec(`create schema auth;create schema private;create role anon;create role authenticated;
 create function auth.uid() returns uuid language sql as $$select '11111111-1111-4111-8111-111111111111'::uuid$$;
 create table public.profiles(id uuid,username text,display_name text,account_tier text);
 create table public.workspaces(id uuid,public_handle text);
 create table public.pro_profiles(workspace_id uuid,is_public boolean);
 create table public.inspirations(id uuid,created_by uuid,workspace_id uuid,title text,snapshot jsonb,created_at timestamptz,is_public boolean);
 create table public.journal_entries(id uuid,created_by uuid,workspace_id uuid,snapshot jsonb,created_at timestamptz,visibility text);
 create table private.social_favorites(user_id uuid,kind text,entity_id uuid,unique(user_id,kind,entity_id));
 create table private.test_blocks(owner uuid);
 create function private.discovery_allowed() returns boolean language sql as $$select true$$;
 create function private.discovery_visible(owner uuid,workspace uuid) returns boolean language sql as $$select not exists(select 1 from private.test_blocks b where b.owner=$1)$$;
 create function private.discovery_preview(snapshot jsonb) returns jsonb language sql as $$select jsonb_build_object('shape',$1->>'shape')$$;
 insert into public.profiles values('22222222-2222-4222-8222-222222222222','test','Test','plus');
 insert into public.workspaces values('33333333-3333-4333-8333-333333333333','test');
 insert into public.inspirations values('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','33333333-3333-4333-8333-333333333333','Pose vampire Halloween','{"shape":"Ronde","publicTags":{"themes":["Vampire","Halloween"]},"privateProduct":"SECRET"}',now(),true);
 `);await db.exec(fs.readFileSync('supabase/migrations/20261010182830_ai_artistic_search_p0.sql','utf8'));
 const search=async()=> (await db.query(`select private.nm_discover('discover','{"query":"Halloween vampire","searchTerms":["halloween","vampire"]}') result`)).rows[0].result;
 assert.equal((await search()).items.length,1);assert.ok(!JSON.stringify(await search()).includes('SECRET'));
 await db.exec('update public.inspirations set is_public=false');assert.equal((await search()).items.length,0);
 await db.exec("update public.inspirations set is_public=true;insert into private.test_blocks values('22222222-2222-4222-8222-222222222222')");assert.equal((await search()).items.length,0);
 }finally{await db.close();}
});

test('saved media references stay private and omit expiring image URLs',()=>{const p=plan(),master=createMaster(p,CONCEPT_COLORS,body),idea=ideaFromPlan(p,{products:CONCEPT_COLORS,master});const saved=withResultMedia(idea,{kind:'realistic',imagePath:'owner/workspace/ai/test.png',imageUrl:'https://private.example/signed-secret',quality:{status:'nonconforming'},masterRevision:1});assert.equal(saved.ai.media.realistic.path,'owner/workspace/ai/test.png');assert.ok(!JSON.stringify(saved).includes('signed-secret'));assert.equal(saved.ai.validation.artistic,'nonconforming');assert.ok(!saved.isPublic);});

test('punctuation and exclusions do not add absent motifs to the public tags',()=>{const p=plan(),master=createMaster(p,CONCEPT_COLORS,{...body,prompt:'Vampire Halloween, sans fleurs ni Harry Potter.'}),idea=ideaFromPlan(p,{products:CONCEPT_COLORS,master});const tags=suggestTags(idea);assert.ok(tags.themes.includes('Halloween'));assert.ok(!tags.themes.includes('Fleurs'));assert.ok(!tags.themes.includes('Harry Potter'));assert.ok(searchTerms('Halloween, vampire').includes('halloween'));});
