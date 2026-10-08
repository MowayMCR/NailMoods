import test from 'node:test';import assert from 'node:assert/strict';
import {cleanScrapbook,scrapAssets,scrapBackgrounds,defaultScrapbook} from '../src/poseBook/scrapbook.js';
import {readJournal,putJournalEntry,newJournalEntry,JOURNAL_KEY} from '../src/journal.js';
test('all four moods are available and malformed scrapbook data stays bounded',()=>{
 assert.equal(scrapAssets.length,64);assert.equal(scrapBackgrounds.length,16);
 for(const mood of ['soft','dark','cottage','pop'])assert.equal(scrapAssets.filter(a=>a.mood===mood).length,12);
 const clean=cleanScrapbook({version:1,background:'bad',nodes:[{id:'one',type:'text',text:'a'.repeat(500),x:NaN,y:900,w:0,rotate:90,secret:'never store'},{id:'one',type:'text'},{id:'evil',type:'sticker',asset:'https://bad'},{id:'two',type:'tape',asset:'pop-8'}]});
 assert.equal(clean.nodes.length,2);assert.equal(clean.nodes[0].text.length,160);assert.equal(clean.nodes[0].x,50);assert.equal(clean.nodes[0].y,92);assert.equal(clean.nodes[0].w,10);assert.equal(clean.nodes[0].rotate,45);assert.equal('secret' in clean.nodes[0],false);
});
test('scrapbook follows existing journal storage without changing visibility or photos',()=>{
 const e=newJournalEntry('scrap-one');e.title='Souvenir';const design=defaultScrapbook(e);design.nodes.push({id:'sticker',type:'sticker',asset:'dark-0',x:30,y:40,w:20,rotate:12});
 const {store}=putJournalEntry({entries:[e],hiddenSessions:[]},{...e,scrapbook:design});const restored=readJournal({getItem:key=>key===JOURNAL_KEY?JSON.stringify(store):null});
 assert.deepEqual(restored.entries[0].scrapbook,cleanScrapbook(design));assert.equal(restored.entries[0].visibility,'private');assert.equal(restored.entries[0].photo,e.photo);
});
