import test from 'node:test';
import assert from 'node:assert/strict';
import {mergeMessages,notificationLabel} from '../src/social/messageState.js';
test('polling preserves older pages and deduplicates existing messages',()=>{
 const old=[{id:'b',created_at:'2026-09-21T10:00:00Z'},{id:'a',created_at:'2026-09-20T10:00:00Z'}];
 const incoming=[{id:'c',created_at:'2026-09-21T11:00:00Z'},{id:'b',created_at:'2026-09-21T10:00:00Z',body:'updated'}];
 const result=mergeMessages(old,incoming);assert.deepEqual(result.map(m=>m.id),['c','b','a']);assert.equal(result[1].body,'updated');assert.equal(old.length,2);
});
test('equal timestamps retain deterministic server ordering',()=>{assert.deepEqual(mergeMessages([],[{id:'a',created_at:'same'},{id:'b',created_at:'same'}]).map(m=>m.id),['b','a']);});
test('historical notices are not misrepresented as new invitations',()=>{assert.notEqual(notificationLabel('message_request'),notificationLabel('connection_request'));assert.equal(notificationLabel('connection_accepted'),'Connexion acceptée');});
test('message id supports browsers without randomUUID while preserving UUID v4 bits',async()=>{const {messageId}=await import('../src/social/messageState.js');const id=messageId({getRandomValues:bytes=>bytes.fill(255)});assert.match(id,/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/);});
