import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareLocalMigration } from '../phase12/localMigration.js';
import { shareableInspiration } from '../phase12/sharing.js';
import { generateInspirations } from '../src/freeInspiration.js';
import { snapshotIdea } from '../src/inspirations.js';
test('migration preparation needs explicit destination and never modifies local data or imports telemetry',()=>{
 const data=new Map([['nm-profile','{"name":"Test"}'],['nm-feedback-draft-v1','{"private":"feedback"}'],['auth-token','secret'],['nm-scan-events-v1','[]']]);
 const storage={getItem:k=>data.get(k)??null,setItem:()=>assert.fail('No local mutation allowed')};
 assert.throws(()=>prepareLocalMigration(storage));
 const context={userId:'verified-user',workspaceId:'personal-space',profileId:'profile',confirmed:true};
 const report=prepareLocalMigration(storage,context);assert.equal(report.ready,true);assert.deepEqual(report.records,[{kind:'profile',sourceKey:'nm-profile',payload:{name:'Test'}}]);
 assert.deepEqual(prepareLocalMigration(storage,context),report);assert.equal(data.size,4);
 data.set('nm-journal-v1','broken');assert.equal(prepareLocalMigration(storage,context).ready,false);
});
test('shared inspiration excludes private fields and internal product IDs while keeping colours and recipe',()=>{
 const idea=snapshotIdea(generateInspirations([{id:'private-product',name:'Cassis',type:'Vernis',color:'#813c60',notes:'PRIVATE',rawOCR:'PRIVATE',photo:'PRIVATE'}],{},{intent:'collection'},1).results[0]);
 idea.notes='PRIVATE';idea.recipientEmail='PRIVATE';idea.options.profile={address:'PRIVATE'};
 const result=shareableInspiration(idea);const encoded=JSON.stringify(result);
 assert.ok(!encoded.includes('PRIVATE'));assert.ok(!encoded.includes('private-product'));assert.ok(result.steps.length);assert.equal(result.nails.length,5);assert.equal(result.palette[0].color,'#813c60');
 assert.ok(result.nails.every(n=>result.palette.some(p=>p.id===n.productId)));assert.equal(idea.notes,'PRIVATE');
});
