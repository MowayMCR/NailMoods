import test from 'node:test';
import assert from 'node:assert/strict';
import {TAXONOMY} from '../src/social/tagTaxonomy.js';
import {generateInspirations,stylePalette} from '../src/freeInspiration.js';
import {moodDirections,moodPolicy,moodPalette,harmoniousPalette} from '../src/moodPalettes.js';
import {techniqueRule,eligibleTechniques,surpriseTechniques,compatibleTechniques,updateTechniqueChoice,techniqueWarnings} from '../src/techniqueRules.js';
const norm=v=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
test('every real mood and technique has a policy without expanding the taxonomy',()=>{
 for(const mood of [...TAXONOMY.moods,'Douce','Mystérieuse','Chic','Joyeuse','Audacieuse','Au calme'])assert.ok(moodDirections.has(norm(mood)),mood);
 for(const label of TAXONOMY.techniques)assert.ok(techniqueRule(label),label);
});
test('10 successive runs of each mood remain coherent and vary actual colour combinations',()=>{
 for(const mood of ['Douce','Romantique','Audacieuse','Chic','Naturel','Witchy','Lumineux']){
 const palettes=new Set();for(let seed=1;seed<=10;seed++){const report=generateInspirations([],{}, {intent:'inspire',mood,polishCount:3,level:0,duration:30},seed);
 assert.ok(report.results.length,mood);for(const idea of report.results){assert.ok(harmoniousPalette(idea.palette,mood));assert.ok(idea.minutes<=30);assert.equal(idea.palette.length,3);}
 palettes.add(report.results[0].palette.map(p=>p.color).sort().join(','));}
 assert.ok(palettes.size>=6,mood+': '+palettes.size);
 }
 assert.equal(moodPolicy('Douce').contrast,'faible');assert.equal(moodPolicy('Audacieuse').contrast,'marqué');
 const soft=moodPalette('Romantique');assert.ok(soft.every(p=>{const c=[1,3,5].map(i=>parseInt(p.color.slice(i,i+2),16));return (Math.max(...c)+Math.min(...c))/510>.7;}));
});
test('explicitly picked colours survive a different mood and every generated card',()=>{
 const colors=[stylePalette[3],stylePalette[5],stylePalette[7]];
 for(const mood of ['Douce','Mystérieuse','Audacieuse']){const report=generateInspirations([],{}, {intent:'inspire',mood,inspirationPalette:colors,duration:30});assert.ok(report.results.length);for(const idea of report.results)assert.deepEqual(idea.palette.map(p=>p.id).sort(),colors.map(p=>p.id).sort());}
});
test('random choices are eligible before drawing, compatible and possible at every level',()=>{
 for(const level of [0,1,2]){const history=[],seen=new Set();const options={level,duration:90};
 for(let seed=1;seed<=300;seed++){const chosen=surpriseTechniques(options,[],history,seed);history.push(chosen);assert.ok(chosen.length>=1&&chosen.length<=(level===0?1:level===1?2:3));assert.ok(compatibleTechniques(chosen));for(const label of chosen){assert.ok(techniqueRule(label).difficulty_min<=level);seen.add(techniqueRule(label).id);}}
 for(const row of eligibleTechniques(options))assert.ok(seen.has(row.id),row.label);
 if(level===2)assert.ok(seen.has('gel-3d'));
 }
});
test('successive surprise clicks vary, allow single techniques and controlled combinations',()=>{
 const history=[];for(let seed=1;seed<=30;seed++)history.push(surpriseTechniques({level:2,duration:90},[],history,seed));
 assert.ok(new Set(history.map(r=>r.join('+'))).size>=15);assert.ok(history.some(r=>r.length===1));assert.ok(history.some(r=>r.length>1));
 for(const combo of [['French','Aura nails'],['French','Line art'],['French','Strass'],['Aura nails','Chrome powder'],['3D gel','French']])assert.ok(compatibleTechniques(combo));
 for(const combo of [['French','Double French'],['Velvet nails','Cat-eye magnetic'],['Blooming gel','Crocodile']])assert.equal(compatibleTechniques(combo),false);
});
test('advanced to beginner recalculates automatic choices while preserving manual ones with warning',()=>{
 const automatic=updateTechniqueChoice({techniques:['3D gel','French'],techniquesSource:'auto',level:2,duration:90},{level:0},[],[],4);
 assert.ok(automatic.techniques.length);assert.ok(automatic.techniques.every(t=>techniqueRule(t).difficulty_min===0));
 const manual=updateTechniqueChoice({techniques:['3D gel'],techniquesSource:'manual',level:2,duration:90},{level:0});assert.deepEqual(manual.techniques,['3D gel']);assert.ok(techniqueWarnings(manual).length);
 assert.equal(generateInspirations([],{}, {...manual,intent:'inspire'}).results.length,0);
});
test('bold beginner with 30 minutes stays bold without advanced techniques or extra time',()=>{
 for(let seed=1;seed<=30;seed++){const options={level:0,duration:30,mood:'Audacieuse',intent:'inspire'},techniques=surpriseTechniques(options,[],[],seed);
 const report=generateInspirations([],{}, {...options,techniques,techniquesSource:'auto'},seed);assert.ok(report.results.length);
 for(const idea of report.results){assert.ok(idea.rank===0);assert.ok(idea.minutes<=30);assert.ok(harmoniousPalette(idea.palette,'Audacieuse'));}
 }
});
test('owned-equipment and no-lamp/drawing filters are applied before random selection',()=>{
 const rows=eligibleTechniques({level:2,duration:30,constraints:['noLamp','noDrawing'],useOwnedEquipment:true},[]);
 assert.ok(rows.length);assert.ok(rows.every(r=>r.requirements.length===0&&r.minutes<=15&&!['french','drawing','wet','magnetic','sculpture'].includes(r.group)));
});
