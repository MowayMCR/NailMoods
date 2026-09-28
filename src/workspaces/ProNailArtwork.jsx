import React,{useId} from 'react';
import {editableProNailDesign,proNailGeometry,PRO_FINGERS,strokePath} from './proNailEditorModel.js';

// One geometry and stroke renderer for the editor, library and generated poses.
export function ProNailArtwork({nail,shape,length,surfaceRef}){
 const id=useId().replace(/:/g,'')+'pro-art',geometry=proNailGeometry(shape,length),base=nail?.base||'#f4d8d0';
 return <g transform={geometry.transform} ref={surfaceRef}><defs><clipPath id={id}><path d={geometry.path}/></clipPath></defs><path d={geometry.path} fill={base} stroke="#d5bdc5" strokeWidth="1.5"/><g clipPath={`url(#${id})`}>{(nail?.strokes||[]).map((stroke,index)=><path data-drawn-stroke key={index} d={strokePath(stroke)} fill="none" stroke={stroke.mode==='erase'?base:stroke.color} strokeWidth={stroke.size} strokeLinecap="round" strokeLinejoin="round"/>)}</g></g>;
}
export default function ProDesignPreview({design,base,title='Composition vue de dessus',onSelect,selectedIndex=3}){
 const value=editableProNailDesign(design,{base});
 return <div className={'proDesignOverview'+(onSelect?' interactive':'')} role={onSelect?'group':'img'} aria-label={title}>{value.nails.map((nail,index)=>{
  const art=<><svg viewBox="0 0 100 180" aria-hidden="true"><ProNailArtwork nail={nail} shape={value.shape} length={value.length}/></svg><span>{PRO_FINGERS[index]}</span></>;
  return onSelect?<button type="button" key={index} aria-label={`Dessiner sur ${PRO_FINGERS[index]}`} aria-pressed={index===selectedIndex} className={index===selectedIndex?'selected':''} onClick={()=>onSelect(index)}>{art}</button>:<div key={index}>{art}</div>;
 })}</div>;
}
