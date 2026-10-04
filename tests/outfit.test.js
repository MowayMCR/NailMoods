import test from 'node:test';import assert from 'node:assert/strict';
import {outfitDirections,analyzeOutfitPixels,outfitProject,OUTFIT_MODES} from '../src/poseCycle/outfit.js';import {validIdea} from '../src/inspirations.js';import {tierCapabilities} from '../src/cloud/betaTier.js';
const analysis={colors:['#703650','#8d9871','#e7d5bf'],ambience:'Douce',contrast:25};
test('all five outfit choices produce three distinct valid compositions without inventing owned products',()=>{
 const product={id:'owned',name:'Mon cassis',type:'Vernis',color:'#703650',finish:'Brillant'},copy=JSON.stringify(product);
 for(const [mode] of OUTFIT_MODES){for(const collectionOnly of [false,true]){const ideas=outfitDirections({analysis,mode,collectionOnly,items:[product]});assert.equal(ideas.length,3);assert.equal(new Set(ideas.map(x=>x.idea.key)).size,3);for(const {idea} of ideas){assert.ok(validIdea(idea));if(collectionOnly){assert.equal(idea.palette[0].id,'owned');assert.equal(idea.palette[0].color,'#703650');assert.ok(idea.nails.every(n=>n.productId==='owned'));}}}}
 assert.equal(JSON.stringify(product),copy);assert.throws(()=>outfitDirections({analysis,collectionOnly:true,items:[]}),/Collection/);
});
test('outfit pixel analysis reports palette only, not fabric or medical or technique detection',()=>{const pixels={width:8,height:8,data:new Uint8ClampedArray(256)};for(let i=0;i<256;i+=4)pixels.data.set([112,54,80,255],i);const result=analyzeOutfitPixels(pixels);assert.ok(result.colors.length);assert.equal(result.confidence,'indicative');assert.equal(result.materials,undefined);assert.equal(result.probableTechniques,undefined);});
test('personal Journal explicitly Free; photo stays Plus/Pro independent of IA+',()=>{for(const tier of ['free','plus','pro'])assert.equal(tierCapabilities(tier).journal,true);assert.equal(tierCapabilities('free').photos,false);assert.equal(tierCapabilities('ai_plus').photos,false);assert.equal(tierCapabilities('plus').photos,true);});
