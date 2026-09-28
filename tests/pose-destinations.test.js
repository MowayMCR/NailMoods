import test from 'node:test';
import assert from 'node:assert/strict';
import {poseDestinations} from '../src/poseDestinations.js';
test('personal destinations preserve source objects and never duplicate selected projects',()=>{
 const favorite={key:'idea-a',isPublic:false},project={key:'idea-b',isProject:true,photoSources:[{name:'Privée'}]},running={id:'session-a',status:'paused'},done={id:'session-b',status:'completed'};
 const library={favorites:[favorite,project],projects:[project],selected:project};const before=JSON.stringify(library);
 const result=poseDestinations(library,[running,done]);assert.deepEqual(result.toTry,[favorite]);assert.deepEqual(result.projects,[project]);assert.deepEqual(result.sessions,[running]);assert.equal(result.projects[0],project);assert.equal(JSON.stringify(library),before);
});
