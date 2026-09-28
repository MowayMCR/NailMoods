const number=(value,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const round=value=>Math.round(value*100)/100;
const point=value=>({x:round(Math.max(0,Math.min(100,number(value?.x)))),y:round(Math.max(0,Math.min(160,number(value?.y))))});
export const validDesignColor=(value,fallback='#f4d8d0')=>/^#[0-9a-f]{6}$/i.test(value||'')?value.toLowerCase():fallback;
export const PRO_NAIL_SHAPES=['Ronde','Ovale','Amande','Carrée','Coffin / Ballerine','Stiletto'];
export const PRO_NAIL_LENGTHS=['Très courte','Courte','Moyenne','Longue','XL'];
export const PRO_FINGERS=['Pouce','Index','Majeur','Annulaire','Auriculaire'];
export const EMPTY_PRO_NAIL_DESIGN=Object.freeze({version:1,strokes:[]});
const finger=value=>Math.max(0,Math.min(4,Math.trunc(number(value,3))));

function cleanStrokes(value){
 const strokes=(Array.isArray(value)?value:[]).slice(-80).map(stroke=>({points:Array.isArray(stroke?.points)?stroke.points.slice(0,240).map(point):[],color:validDesignColor(stroke?.color,'#813c60'),size:Math.max(1,Math.min(14,number(stroke?.size,4))),mode:stroke?.mode==='erase'?'erase':'draw'})).filter(stroke=>stroke.points.length);
 const total=strokes.reduce((sum,stroke)=>sum+stroke.points.length,0);
 if(total<=1000)return strokes;
 // Keep complete paths, their endpoints and every dot within the JSON budget.
 return strokes.map(stroke=>{const count=Math.max(Math.min(2,stroke.points.length),Math.floor(stroke.points.length*1000/total));return {...stroke,points:Array.from({length:count},(_,index)=>stroke.points[Math.round(index*(stroke.points.length-1)/Math.max(1,count-1))])};});
}

export function normaliseProNailDesign(value){
 if(value?.version!==2)return {version:1,strokes:cleanStrokes(value?.strokes)};
 return {version:2,shape:PRO_NAIL_SHAPES.includes(value.shape)?value.shape:'Ronde',length:PRO_NAIL_LENGTHS.includes(value.length)?value.length:'Longue',scope:value.scope==='set'?'set':'single',focalFinger:finger(value.focalFinger),nails:Array.from({length:5},(_,index)=>({base:validDesignColor(value.nails?.[index]?.base),strokes:cleanStrokes(value.nails?.[index]?.strokes)}))};
}

export function editableProNailDesign(value,defaults={}){
 const clean=normaliseProNailDesign(value);
 if(clean.version===2)return clean;
 const legacy=clean.strokes.length>0;
 return normaliseProNailDesign({version:2,shape:legacy?'Ronde':defaults.shape,length:legacy?'Longue':defaults.length,scope:'single',focalFinger:3,nails:Array.from({length:5},(_,index)=>({base:validDesignColor(defaults.base),strokes:index===3?clean.strokes:[]}))});
}
export function designStrokeCount(value){const clean=normaliseProNailDesign(value);return clean.version===2?clean.nails.reduce((sum,nail)=>sum+nail.strokes.length,0):clean.strokes.length;}
export function updateDesignNail(value,index,patch){const design=editableProNailDesign(value);return normaliseProNailDesign({...design,scope:index!==design.focalFinger?'set':design.scope,nails:design.nails.map((nail,i)=>i===index?{...nail,...patch}:nail)});}
export function strokePath(stroke){const points=stroke?.points||[];if(!points.length)return '';if(points.length===1)return `M ${points[0].x} ${points[0].y} l .01 .01`;return points.map((p,index)=>`${index?'L':'M'} ${p.x} ${p.y}`).join(' ');}
export function addStroke(design,stroke,index){const next=normaliseProNailDesign(design),cleaned=cleanStrokes([stroke])[0];if(!cleaned)return next;if(next.version===2){const target=index??next.focalFinger;return updateDesignNail(next,target,{strokes:[...next.nails[target].strokes,cleaned]});}return normaliseProNailDesign({...next,strokes:[...next.strokes,cleaned]});}

export function proNailGeometry(shape='Ronde',length='Longue'){
 const paths={
  Ronde:'M50 5C26 5 17 23 17 45v76c0 23 12 34 33 34s33-11 33-34V45C83 23 74 5 50 5Z',
  Ovale:'M50 5C29 5 17 35 17 58v63c0 23 12 34 33 34s33-11 33-34V58C83 35 71 5 50 5Z',
  Amande:'M17 121C16 76 28 26 50 5C72 26 84 76 83 121C83 144 71 155 50 155S17 144 17 121Z',
  Carrée:'M17 121V12Q17 5 24 5H76Q83 5 83 12V121C83 144 71 155 50 155S17 144 17 121Z',
  'Coffin / Ballerine':'M17 121L29 10Q30 5 35 5H65Q70 5 71 10L83 121C83 144 71 155 50 155S17 144 17 121Z',
  Stiletto:'M17 121C17 88 39 31 50 3C61 31 83 88 83 121C83 144 71 155 50 155S17 144 17 121Z',
 };
 const scale=({'Très courte':.55,Courte:.67,Moyenne:.83,Longue:1,XL:1.12})[length]||1;
 return {path:paths[shape]||paths.Ronde,transform:`translate(0 ${round(175-155*scale)}) scale(1 ${scale})`,scale};
}
