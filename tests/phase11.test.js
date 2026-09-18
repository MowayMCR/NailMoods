import test from 'node:test';
import assert from 'node:assert/strict';
import { polishFamilies, rememberColor, readRecentColors, collectionSwatches, RECENT_COLORS_KEY } from '../src/polishPalette.js';
import { feedbackReport, betaQuestions } from '../src/betaFeedback.js';
import { createSuggestions } from '../src/creationEngine.js';
import { generateScannedIdeas, confirmedScanProduct } from '../src/scanGenerate.js';
import { readCreationState } from '../src/creationState.js';
import { guides } from '../src/help.js';
import { chosenShadeChange, productColor, colorFamilyChange } from '../src/colorAnalysis.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)};};
test('manual and pipette corrections replace stale catalogue and confirmed colors without losing their HEX on reclassification',()=>{
 const original={catalogColorValidated:true,catalogColor:'#ffffff',confirmedColor:'#000000'};
 for(const source of ['manual','photo']){
  const changed={...original,...chosenShadeChange('#356A59',source)};
  assert.equal(productColor(changed),'#356a59');assert.equal(productColor({...changed,...colorFamilyChange(changed,'Rose')}),'#356a59');
 }
 assert.equal(original.catalogColorValidated,true);assert.equal(original.catalogColor,'#ffffff');
 assert.equal(chosenShadeChange('#9aa891').family,'Vert');
});
test('recent shades survive reload, deduplicate and never store an invalid or truncated HEX',()=>{
 const storage=memory();storage.setItem(RECENT_COLORS_KEY,'{"broken":true}');assert.deepEqual(readRecentColors(storage),[]);
 rememberColor(storage,'#813C60');rememberColor(storage,'#356a59');rememberColor(storage,'#813c60');rememberColor(storage,'#12');
 assert.deepEqual(readRecentColors(storage),['#813c60','#356a59']);
 for(let i=0;i<15;i++)rememberColor(storage,'#0000'+i.toString(16).padStart(2,'0'));
 assert.equal(readRecentColors(storage).length,10);
 assert.throws(()=>rememberColor({getItem:()=>null,setItem:()=>{throw Error('quota');}},'#813c60'));
});
test('collection palette uses real saved shades, excludes tools and missing colors, keeps input intact',()=>{
 const items=[{id:'a',name:'Rouge trompeur',type:'Vernis',color:'#ff0000',confirmedColor:'#356A59'}, {id:'b',name:'Autre',type:'Gel',shade:'#356a59'}, {type:'Matériel',color:'#ffffff'},{type:'Vernis',name:'Sans couleur'}, {type:'Vernis',color:'#000000',quantity:0}];
 const before=JSON.stringify(items);assert.deepEqual(collectionSwatches(items),[{name:'Rouge trompeur',color:'#356a59'}]);assert.equal(JSON.stringify(items),before);
});
test('every suggested palette shade remains the source color in quick generation without profile',()=>{
 for(const [,swatches] of polishFamilies)for(const [name,color] of swatches){
  const product=confirmedScanProduct({name,color,type:'Vernis'},'shade');
  const results=generateScannedIdeas([product],['Classique']);assert.ok(results.length);
  for(const idea of results)for(const nail of idea.nails)assert.ok(nail.color===color||idea.palette.find(p=>p.id===nail.productId)?.unpainted);
 }
});
test('fresh collection with one, two and three polishes generates exact shades without tools or stickers',()=>{
 for(const count of [1,2,3]){
  const state=readCreationState(memory(),{});const items=['#813c60','#356a59','#ddb9aa'].slice(0,count).map((color,i)=>({id:String(i),type:'Vernis',name:'Test '+i,confirmedColor:color,finish:'Brillant',usage:'Couleur seule'}));
  const report=createSuggestions(items,{}, {...state.options,polishCount:count});assert.ok(report.results.length);
  for(const idea of report.results)for(const nail of idea.nails)assert.equal(nail.color,items.find(p=>p.id===nail.productId).confirmedColor);
 }
});
test('beta questionnaire never invents answers and preserves explicit negative or untested responses',()=>{
 const blank=feedbackReport({surveyEnabled:true},'scan','test-date');
 for(const [,label] of betaQuestions)assert.ok(blank.includes(label+' : Non renseigné'));
 const filled=feedbackReport({severity:'blocking',surveyEnabled:true,survey:{firstProduct:'Non',scanRating:'Partiel mais utilisable',journal:'Non testé'}},'scan');
 assert.match(filled,/Impact : Bloquant/);assert.match(filled,/sans aide : Non/);assert.match(filled,/réouverture : Non testé/);assert.match(filled,/scan : Partiel mais utilisable/);
 assert.equal(guides.scan.slides.length,2);
});
