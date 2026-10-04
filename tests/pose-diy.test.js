import test from 'node:test';import assert from 'node:assert/strict';
import {compareProduct,diyChecklist,diyColor} from '../src/poseCycle/diy.js';
import {outfitDirections} from '../src/poseCycle/outfit.js';
const product=(patch={})=>({id:'a',name:'Cassis',type:'Vernis',productKind:'Couleur',shade:'#703650',finish:'Brillant',quantity:1,...patch});
const idea=(index=0)=>outfitDirections({analysis:{colors:['#703650','#d1a0ab'],ambience:'Douce'}})[index].idea;
test('DIY exact reference present, depleted reference absent, changed snapshot flagged',()=>{
 const p=product();assert.equal(compareProduct(p,[p]).state,'owned');assert.equal(compareProduct(p,[{...p,quantity:0}]).state,'missing');assert.equal(compareProduct(p,[{...p,shade:'#ff0000'}]).state,'check');
});
test('DIY conceptual IDs cannot imply ownership; near colors remain visual only',()=>{
 const p=product({conceptual:true});const r=compareProduct(p,[product()]);assert.equal(r.state,'near');assert.equal(r.unknown.length,1);assert.ok(!JSON.stringify(r).includes('Compatibilité documentée'));
});
test('DIY a close color with different finish, family or opacity is excluded',()=>{
 for(const patch of [{finish:'Mat'},{type:'Gel'},{productKind:'Base coat'},{opacity:'Transparent'},{finish:''},{shade:'#ff0000'}])assert.equal(compareProduct(product({opacity:'Opaque'}),[product({id:'b',opacity:'Opaque',...patch})]).state,'missing');
});
test('DIY ranks near alternatives and preserves every product HEX',()=>{
 const p=product(),items=[product({id:'far',shade:'#783958',opacity:'Opaque'}),product({id:'near',shade:'#713650',opacity:'Opaque'})],before=JSON.stringify(items);
 const result=compareProduct({...p,opacity:'Opaque'},items);assert.deepEqual(result.matches.map(p=>p.id),['near','far']);assert.deepEqual(result.unknown,[]);assert.equal(JSON.stringify(items),before);
});
test('DIY exact catalog identity is reused, a name or brand alone never is',()=>{
 assert.equal(compareProduct(product({provenance:{catalogId:'cat1'}}),[product({id:'b',provenance:{catalogId:'cat1'}})]).state,'owned');
 assert.equal(compareProduct(product({brand:'X',reference:'Ref1'}),[product({id:'b',brand:'X',reference:'Ref1'})]).state,'owned');
 assert.notEqual(compareProduct(product(),[product({id:'b'})]).state,'owned');
});
test('DIY no visual matching from a family fallback or unknown finish',()=>{
 assert.equal(diyColor({family:'Cassis',color:'#622947'}),'');assert.equal(compareProduct(product({finish:''}),[product({id:'b'})]).state,'missing');
});
test('DIY French/dots reuse drawing needs without inventing a UV lamp for normal polish',()=>{
 const french=diyChecklist(idea(1)),dots=diyChecklist(idea(2));assert.ok(french.rows.some(r=>r.id==='tool:liner'));assert.ok(!french.rows.some(r=>r.id==='tool:lamp'));assert.ok(dots.rows.some(r=>r.id==='tool:dots'));assert.ok(!dots.rows.some(r=>r.id==='tool:detail'));
});
test('DIY equipment requires correct category and specificity, quantity is respected',()=>{
 const brush={id:'brush',name:'Pinceau large',type:'Matériel',equipmentCategory:'Pinceau',quantity:1};
 const row=items=>diyChecklist(idea(1),items).rows.find(r=>r.id==='tool:liner');
 assert.equal(row([brush]).state,'missing');assert.equal(row([{...brush,name:'Liner fin'}]).state,'owned');assert.equal(row([{...brush,name:'Liner fin',quantity:0}]).state,'missing');
});
test('DIY gel requires lamp without deriving a curing duration; advanced guide is explicit',()=>{
 const i=idea();i.palette[0].type='Gel';i.techniques=['Chrome'];const result=diyChecklist(i);assert.ok(result.rows.some(r=>r.id==='tool:lamp'));assert.deepEqual(result.partial,['chrome']);assert.ok(!result.steps.some(s=>s.duration===60));
});
test('DIY base/top are only listed when actually specified, no mutation/duplicate needs',()=>{
 const i=idea(1);i.requirements=[{name:'Pinceau liner',required:true}];const before=JSON.stringify(i),r=diyChecklist(i);assert.equal(r.rows.filter(r=>r.id==='tool:liner').length,1);assert.ok(!r.rows.some(r=>/base coat|top coat/i.test(r.label)));assert.equal(JSON.stringify(i),before);assert.throws(()=>diyChecklist(null),/recette/);
});
test('DIY ignores a Collection family palette promoted to a shade by legacy mapping',()=>{
 assert.equal(diyColor(product({colorSource:'palette',confirmedColor:'#703650'})),'');assert.equal(compareProduct(product(),[product({id:'b',colorSource:'palette',confirmedColor:'#703650'})]).state,'missing');
});
test('DIY stamping uses existing category and differentiates plate, stamp and scraper',()=>{
 const i=idea();i.techniques=['Stamping'];const r=diyChecklist(i,[{id:'plate',name:'Plaques stamping',type:'Matériel',equipmentCategory:'Stamping'}]);assert.equal(r.rows.find(x=>x.id==='tool:plates').state,'owned');assert.equal(r.rows.find(x=>x.id==='tool:stamp').state,'missing');assert.equal(r.rows.find(x=>x.id==='tool:scraper').state,'missing');
});
