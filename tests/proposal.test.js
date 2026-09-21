import test from 'node:test';
import assert from 'node:assert/strict';
import {proposalIdea} from '../src/social/proposal.js';
import {validIdea,saveProject} from '../src/inspirations.js';
test('authorized proposal becomes an idempotent private project without attachments or notes',()=>{
 const snapshot={title:'Ma proposition',notes:'PRIVATE',images:[{src:'OTHER/PRIVATE'}],mood:'Witchy',preview:{shape:'Amande',length:'Moyen',nails:Array.from({length:5},(_,i)=>({color:i%2?'#aa4488':'#eeeeee',finish:'Brillant'}))},products:[]};
 const a=proposalIdea(snapshot,'share-id'),b=proposalIdea(snapshot,'share-id');
 assert.ok(validIdea(a));assert.equal(a.isPublic,false);assert.equal(a.key,b.key);assert.equal(JSON.stringify(a).includes('PRIVATE'),false);
 const lib=saveProject(saveProject({favorites:[],recent:[],projects:[]},a),b);assert.equal(lib.projects.length,1);
});
