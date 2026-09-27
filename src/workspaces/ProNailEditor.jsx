import React,{useMemo,useRef,useState} from 'react';
import {Brush,ChevronLeft,Delete,Download,Eraser,Redo2,Undo2} from 'lucide-react';
import {addStroke,normaliseProNailDesign,strokePath} from './proNailEditorModel.js';

const fallbackColors=['#f4d8d0','#813c60','#c99073','#d7ae58','#718d82','#6279ad'];
const nailPath='M50 5C26 5 17 23 17 45v76c0 23 12 34 33 34s33-11 33-34V45C83 23 74 5 50 5Z';

function colorsFrom(roles,collection){
 const source=[...(roles||[]).map(item=>({color:item.color,label:item.role})),...(collection||[]).map(item=>({color:item.hex,label:item.shade_name||'Ma collection'})),...fallbackColors.map(color=>({color,label:'Couleur NailMoods'}))];
 return [...new Map(source.filter(item=>/^#[0-9a-f]{6}$/i.test(item.color||'')).map(item=>[item.color.toLowerCase(),{...item,color:item.color.toLowerCase()}])).values()].slice(0,18);
}

export default function ProNailEditor({design,colorRoles,collectionColors,onSave,onClose}){
 const initial=useMemo(()=>normaliseProNailDesign(design),[design]);
 const [history,setHistory]=useState([initial]),[cursor,setCursor]=useState(0),[tool,setTool]=useState('brush'),[color,setColor]=useState((colorRoles||[]).find(item=>item.role==='principale')?.color||'#813c60'),[size,setSize]=useState(4),[active,setActive]=useState(null);
 const svg=useRef(null);
 const current=history[cursor],palette=colorsFrom(colorRoles,collectionColors),base=(colorRoles||[]).find(item=>item.role==='base')?.color||'#f4d8d0';
 function commit(next){const clean=normaliseProNailDesign(next);setHistory(value=>[...value.slice(0,cursor+1),clean].slice(-31));setCursor(value=>Math.min(value+1,30));}
 function location(event){const rect=svg.current?.getBoundingClientRect();if(!rect)return null;return {x:Math.max(0,Math.min(100,(event.clientX-rect.left)*100/rect.width)),y:Math.max(0,Math.min(160,(event.clientY-rect.top)*160/rect.height))};}
 function begin(event){if(event.pointerType==='mouse'&&event.button!==0)return;const p=location(event);if(!p)return;event.currentTarget.setPointerCapture?.(event.pointerId);setActive({points:[p],color:tool==='erase'?base:color,size:tool==='erase'?Math.max(10,size*2):size,mode:tool==='erase'?'erase':'draw'});}
 function move(event){if(!active)return;const p=location(event);if(!p)return;setActive(value=>value?{...value,points:[...value.points,p].slice(-240)}:value);}
 function finish(){if(!active)return;commit(addStroke(current,active));setActive(null);}
 function undo(){if(cursor>0)setCursor(cursor-1);}
 function redo(){if(cursor<history.length-1)setCursor(cursor+1);}
 function clear(){commit({...current,strokes:[]});}
 const preview=active?addStroke(current,active):current;
 return <section className="proNailEditor" aria-label="Éditeur de nail art"><header className="proEditorHeader"><button type="button" className="round" onClick={onClose} aria-label="Retour à la création"><ChevronLeft/></button><div><small>ÉDITEUR PRO</small><h3>Mon nail art</h3></div><button type="button" className="editorSave" onClick={()=>onSave(normaliseProNailDesign(current))}><Download/>Enregistrer</button></header><p className="proEditorIntro">Dessine simplement le motif central. Il servira de repère créatif, pas de collage dans les futures idées.</p>
  <div className="proEditorCanvas"><svg ref={svg} viewBox="0 0 100 160" role="img" aria-label="Silhouette d’ongle à dessiner" onPointerDown={begin} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} onPointerLeave={event=>{if(event.buttons===0)finish();}}><defs><clipPath id="pro-nail-clip"><path d={nailPath}/></clipPath></defs><path d={nailPath} fill={base} stroke="#d5bdc5" strokeWidth="1.5"/>{preview.strokes.map((stroke,index)=><path key={index} d={strokePath(stroke)} fill="none" stroke={stroke.color} strokeWidth={stroke.size} strokeLinecap="round" strokeLinejoin="round" clipPath="url(#pro-nail-clip)"/>)}<path d="M29 22Q38 13 49 15" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7"/></svg></div>
  <div className="proEditorTools"><div className="proEditorActions"><button type="button" className={tool==='brush'?'selected':''} aria-pressed={tool==='brush'} onClick={()=>setTool('brush')}><Brush/>Pinceau</button><button type="button" className={tool==='erase'?'selected':''} aria-pressed={tool==='erase'} onClick={()=>setTool('erase')}><Eraser/>Gomme</button><button type="button" disabled={cursor===0} onClick={undo}><Undo2/>Annuler</button><button type="button" disabled={cursor===history.length-1} onClick={redo}><Redo2/>Rétablir</button><button type="button" className="dangerText" disabled={!current.strokes.length} onClick={clear}><Delete/>Effacer</button></div><label className="proEditorSize"><span>Épaisseur</span><input type="range" min="1" max="14" value={size} onChange={event=>setSize(Number(event.target.value))}/><b>{size}</b></label><div className="proEditorPalette"><b>Couleurs</b><div>{palette.map(item=><button type="button" key={item.color} title={item.label} aria-label={item.label} className={color.toLowerCase()===item.color?'selected':''} onClick={()=>{setColor(item.color);setTool('brush');}}><i style={{background:item.color}}/></button>)}</div>{collectionColors?.length>0&&<small>Les premières teintes viennent de ta Collection.</small>}</div></div>
 </section>;
}
