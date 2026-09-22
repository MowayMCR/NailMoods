import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {professionalLabel,professionalStatus,instituteRoleLabel} from '../src/workspaces/professionalProfile.js';
import {professionalService} from '../src/workspaces/professionalService.js';
import {instituteService} from '../src/workspaces/instituteService.js';

test('professional presentation types and institute roles stay explicit',()=>{
 assert.equal(professionalStatus('institute_owner'),'institute_owner');
 assert.equal(professionalStatus('independent'),'independent');
 assert.equal(professionalStatus('institute_associate'),'institute_associate');
 assert.equal(professionalStatus('owner'),'');
 assert.equal(professionalLabel('institute_owner'),'Propriétaire d’institut');
 assert.equal(professionalLabel('independent'),'Créatrice indépendante');
 assert.equal(professionalLabel('institute_associate'),'Collaboratrice d’institut');
 assert.equal(instituteRoleLabel('owner'),'Propriétaire');
 assert.equal(instituteRoleLabel('manager'),'Responsable');
 assert.equal(instituteRoleLabel('creator'),'Créatrice / PO');
 assert.equal(instituteRoleLabel('member'),'Collaboratrice');
});

test('professional changes use protected RPCs and never write a role from the browser',async()=>{
 const calls=[];
 const client={rpc:async(name,args)=>{calls.push([name,args]);return {data:{ok:true},error:null};}};
 const service=professionalService(client,'user-a');
 await service.setStatus('institute_owner');
 await service.create('institute','Institut Cassis');
 await service.saveWorkspace('workspace-a',{name:'Institut Cassis',handle:'@Institut.Cassis',bio:'Bio',city:'Chartres',isPublic:true});
 await service.close('workspace-a','Institut Cassis');
 await instituteService(client).setRole('workspace-a','user-b','creator');
 assert.deepEqual(calls.map(item=>item[0]),[
  'set_professional_status','create_professional_workspace','update_professional_workspace','close_institute','set_institute_member_role',
 ]);
 assert.equal(calls[2][1].p_handle,'institut.cassis');
 assert.equal(calls[4][1].p_role,'creator');
});

test('invalid professional handle is rejected before a network write',async()=>{
 let called=false;
 const service=professionalService({rpc:async()=>{called=true;return {data:null,error:null};}},'user-a');
 await assert.rejects(()=>service.saveWorkspace('workspace-a',{name:'Studio',handle:'bad handle',isPublic:true}),/invalid_handle/);
 assert.equal(called,false);
});

test('recipe migration keeps status separate from membership permissions',async()=>{
 const sql=await readFile(new URL('../phase12/pro-profile-institute-adaptation.sql',import.meta.url),'utf8');
 assert.match(sql,/professional_status/);
 assert.match(sql,/Workspace memberships remain the source of truth for permissions/);
 assert.match(sql,/set_institute_member_role/);
 assert.match(sql,/space\.owner_user_id<>actor/);
 assert.match(sql,/revoke update\(professional_status\)/);
 assert.match(sql,/p_role not in \('manager','creator','member'\)/);
});
test('professional profiles are keyed by workspace, not limited to one per user',()=>{
 const sql=readFileSync(new URL('../phase12/professional-workspace-alignment.sql',import.meta.url),'utf8');
 assert.match(sql,/drop constraint if exists pro_profiles_user_id_key/i);
 assert.doesNotMatch(sql,/unique\s*\(\s*user_id\s*\)/i);
});
test('professional and institute foreign keys keep covering indexes',()=>{
 const sql=readFileSync(new URL('../phase12/institute-performance-indexes.sql',import.meta.url),'utf8');
 for(const name of ['pro_profiles_user_id_idx','workspace_invitations_invited_by_idx','user_notifications_workspace_id_idx','user_notifications_invitation_id_idx']){
  assert.match(sql,new RegExp(`create index if not exists ${name}`,'i'));
 }
});

test('targeted mobile polish keeps sheets inside the viewport and labels above fields',async()=>{
 const [css,identity,professional]=await Promise.all([
  readFile(new URL('../src/finish.css',import.meta.url),'utf8'),
  readFile(new URL('../src/identity/IdentityPanel.jsx',import.meta.url),'utf8'),
  readFile(new URL('../src/workspaces/ProfessionalProfilePanel.jsx',import.meta.url),'utf8'),
 ]);
 assert.match(css,/width:min\(400px,calc\(100vw - 28px\)\)/);
 assert.match(css,/max-height:calc\(100dvh - 32px\)/);
 assert.match(css,/\.homeShortcuts>button::before/);
 assert.match(identity,/<label><span>Nom affiché<\/span><input/);
 assert.match(identity,/<ContentImage client=\{client\} kind="avatar"/);
 assert.match(professional,/Quel type de profil Pro êtes-vous \?/);
 assert.match(professional,/Voir mon profil comme les autres/);
});
