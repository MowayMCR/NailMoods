import test from 'node:test';
import assert from 'node:assert/strict';
import {socialEvent,SOCIAL_EVENTS} from '../src/social/events.js';
test('disabled social analytics never sends private payloads or bypasses consent',()=>{
 let calls=0;
 for(const event of SOCIAL_EVENTS)assert.equal(socialEvent(event,{transport:()=>calls++,consent:{analytics_consent:true},body:'secret'}),false);
 assert.equal(calls,0);
});
