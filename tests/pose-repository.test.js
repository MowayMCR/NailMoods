import test from 'node:test';import assert from 'node:assert/strict';
import {setup,A,B,WA,WB} from './helpers/pose-db.js';import {executeReviewQuery} from './helpers/pose-sql-client.js';import {createReviewClient} from '../review/query-client.js';
import {poseRepository} from '../src/poseCycle/repository.js';import {newProject,newPlanItem,newReminder,projectFromTutorial,projectFromJournal} from '../src/poseCycle/model.js';
import {readFileSync} from 'node:fs';
test('Repository + real Postgres: create, reload, update, stale conflict, import idempotency and cascade delete',async()=>{
 const db=await setup();let actor=A;const client=createReviewClient(q=>executeReviewQuery(db,q,actor),()=>actor);const repo=poseRepository(client,{userId:A,workspaceId:WA});
 try{
  const project=await repo.create('projects',newProject({userId:A,workspaceId:WA}));assert.equal((await repo.get('projects',project.id)).title,project.title);
  const saved=await repo.save('projects',{...project,title:'Mon mariage'});assert.equal(saved.revision,2);await assert.rejects(repo.save('projects',{...project,title:'Écrasé'}),e=>e.code==='conflict');
  const plan=await repo.create('plan',newPlanItem(saved,{date:'2026-10-25'}));const reminder=await repo.create('reminders',newReminder(plan,{at:'2026-10-24T12:00:00Z'}));assert.equal((await repo.list('reminders')).length,1);
  await repo.save('reminders',{...reminder,enabled:false});await assert.rejects(repo.remove('reminders',reminder),e=>e.code==='conflict');
  const source=JSON.parse(readFileSync(new URL('./fixtures/tutorial-v1.json',import.meta.url))).sessions[0];const adapted=projectFromTutorial(source,{userId:A,workspaceId:WA});const imported=await repo.importLegacy(adapted);assert.equal((await repo.importLegacy({...adapted,id:crypto.randomUUID()})).id,imported.id);
  const fromJournal=projectFromJournal({id:'old',sessionId:source.id,date:'2026-09-28',title:'Journal'},{userId:A,workspaceId:WA});assert.equal((await repo.importLegacy(fromJournal)).id,imported.id);assert.equal((await repo.get('projects',imported.id)).status,'done');
  actor=B;await assert.rejects(repo.list('projects'),e=>e.code==='session');const other=poseRepository(client,{userId:B,workspaceId:WB});assert.equal(await other.get('projects',project.id),null);assert.equal((await other.list('plan')).length,0);
  actor=A;await repo.remove('projects',saved);assert.equal((await repo.list('plan')).length,0);assert.equal((await repo.list('reminders')).length,0);repo.close();await assert.rejects(repo.list('projects'),e=>e.code==='closed');
 }finally{await db.close();}
});
