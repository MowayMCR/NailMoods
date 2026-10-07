import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Flower2,SlidersHorizontal,Move,RotateCcw,ZoomIn,ZoomOut,Plus,LockKeyhole,Check,Trash2} from 'lucide-react';
import Sheet from '../Sheet.jsx';
import {useStorage} from '../StorageContext.jsx';
import {toolAsset,toolUses,deskSizes,decorations,bouquetStage,defaultPosition,clampPosition} from './model.js';
import './desk.css';
const art=name=>import.meta.env.BASE_URL+'atelier/desk-v1/'+name+'.webp';
const largeTools=new Set(['lampe-uv','lampe-led','lampe-uv-led','ponceuse','aspirateur','repose-main','tapis']);

function FramePhoto({entry,media}){
 const [url,setUrl]=useState('');
 useEffect(()=>{let active=true;setUrl('');if(!entry)return()=>{active=false;};if(entry.mediaPath&&media)media.signedUrl(entry.mediaPath).then(v=>{if(active)setUrl(v);}).catch(()=>{});else if(/^data:image\//.test(entry.photo||'')||/^https:\/\//.test(entry.photo||''))setUrl(entry.photo);return()=>{active=false;};},[entry?.id,entry?.photo,entry?.mediaPath,media]);
 return url?<img className="nmDeskFramePhoto" src={url} alt={'Photo de la pose '+(entry.title||'')}/>:null;
}

export default function Desk({items,state,onChange,entries=[],media,onAdd,onEdit,onCreate,onTutorials,error}){
 const storage=useStorage(),[focus,setFocus]=useState(null),[settings,setSettings]=useState(false),[decorate,setDecorate]=useState(false),[arrange,setArrange]=useState(false),[preview,setPreview]=useState(null),[moving,setMoving]=useState(''),[message,setMessage]=useState(''),[potOpen,setPotOpen]=useState(false),[selected,setSelected]=useState(null),[dragPoint,setDragPoint]=useState(null),[overTrash,setOverTrash]=useState(false),[undo,setUndo]=useState(null);
 const canvas=useRef(null),viewport=useRef(null),gesture=useRef(null),ignoreClick=useRef(0),trash=useRef(null);
 const size=deskSizes[state.size],owned=useMemo(()=>items.filter(p=>p.type==='Matériel'&&Number(p.quantity??1)>0),[items]);
 const unlocked=new Set(state.unlocked),hasVase=unlocked.has('vase-rose'),count=state.highWater;
 const visibleDecorations=state.decorations.filter(id=>id==='bouquet'?hasVase:unlocked.has(id));
 const selectedEntry=entries.find(e=>String(e.id)===state.frameEntryId)||entries.find(e=>e.mediaPath||e.photo);
 const brushes=owned.filter(p=>!state.hidden.includes(String(p.id))&&toolAsset(p).startsWith('pinceau-'));
 const objects=[...(state.groupBrushes&&brushes.length?[{id:'container:brushes',asset:'pot',label:'Mes pinceaux',container:true}]:[]),...owned.filter(p=>!state.hidden.includes(String(p.id))&&!(state.groupBrushes&&toolAsset(p).startsWith('pinceau-'))).map(item=>({id:String(item.id),asset:toolAsset(item),label:item.name,item})),...visibleDecorations.map(id=>({id:'decor:'+id,asset:id==='bouquet'?'vase-rose':id,label:id==='bouquet'?'Mon bouquet':decorations.find(d=>d.id===id)?.label||id,decor:true}))];
 function change(patch){return onChange({...state,...patch});}
 function position(object,index){return preview?.id===object.id?preview.pos:layoutPositions()[object.id];}
 function width(object){if(object.asset==='tapis')return 290;if(object.decor)return object.id==='decor:bouquet'?210:160;return largeTools.has(object.asset)?205:150;}
 function layoutPositions(){
  const result={...state.positions},placed=objects.filter(o=>result[o.id]).map(o=>result[o.id]);
  for(const [i,o] of objects.entries()){if(result[o.id])continue;let pos=defaultPosition(i,objects.length);const occupied=p=>placed.some(q=>Math.hypot(q.x-p.x,q.y-p.y)<.12);
   if(occupied(pos)){for(let slot=0;slot<Math.max(12,objects.length);slot++){const candidate=defaultPosition(slot,Math.max(12,objects.length));if(!occupied(candidate)){pos=candidate;break;}}}
   result[o.id]=pos;placed.push(pos);
  }return result;
 }
 function removeObject(object){
  const ids=object.container?brushes.map(b=>String(b.id)):[object.id];
  const patch=object.decor?{decorations:state.decorations.filter(id=>'decor:'+id!==object.id)}:{hidden:[...new Set([...state.hidden,...ids])]};
  if(change({...patch,positions:layoutPositions()})){setUndo({object,ids,wasHidden:state.hidden});setSelected(null);setMessage('Objet rangé. Sa fiche est conservée.');}
 }
 function restoreObject(){if(!undo)return;const patch=undo.object.decor?{decorations:[...new Set([...state.decorations,undo.object.id.slice(6)])]}:{hidden:state.hidden.filter(id=>!undo.ids.includes(id)||undo.wasHidden.includes(id))};if(change({...patch,positions:layoutPositions()})){setUndo(null);setMessage('Objet remis sur le bureau.');}}
 function inTrash(x,y){const r=trash.current?.getBoundingClientRect();return Boolean(r&&x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom);}
 function finishGesture(cancel=false,e){
  const g=gesture.current;if(!g||(e?.pointerId!=null&&e.pointerId!==g.pointer))return;
  clearTimeout(g.timer);gesture.current=null;setMoving('');setDragPoint(null);setOverTrash(false);
  if(g.active){ignoreClick.current=Date.now()+700;if(!cancel){if(g.pos&&inTrash(e?.clientX??g.clientX,e?.clientY??g.clientY))removeObject(g.object);else if(g.pos){const ok=change({positions:{...layoutPositions(),[g.id]:g.pos}});setMessage(ok?'Position enregistrée.':'La position n’a pas pu être enregistrée.');}}setPreview(null);}
  try{if(g.target.hasPointerCapture(g.pointer))g.target.releasePointerCapture(g.pointer);}catch{}
 }
 useEffect(()=>()=>{clearTimeout(gesture.current?.timer);},[]);
 // The window listeners also finish a gesture released outside the object or after interruption.
 useEffect(()=>{const up=e=>finishGesture(false,e),cancel=e=>finishGesture(true,e),blur=()=>finishGesture(true),hidden=()=>{if(document.hidden)blur();};window.addEventListener('pointerup',up);window.addEventListener('pointercancel',cancel);window.addEventListener('blur',blur);document.addEventListener('visibilitychange',hidden);return()=>{window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',cancel);window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',hidden);};});
 function activate(g){if(gesture.current!==g)return;clearTimeout(g.timer);g.active=true;setMoving(g.id);setSelected(g.object);setDragPoint({x:g.clientX,y:g.clientY,asset:g.object.asset});}
 function down(e,object,index){
  if(!e.isPrimary||e.button!==0)return;
  if(gesture.current)finishGesture(true);
  ignoreClick.current=0;
  const g={id:object.id,object,pointer:e.pointerId,target:e.currentTarget,startX:e.clientX,startY:e.clientY,clientX:e.clientX,clientY:e.clientY,original:position(object,index),active:false,pos:null};gesture.current=g;
  try{e.currentTarget.setPointerCapture(e.pointerId);}catch{}
  if(arrange)activate(g);else g.timer=setTimeout(()=>activate(g),300);
 }
 function move(e){
  const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;
  const dx=e.clientX-g.startX,dy=e.clientY-g.startY;g.clientX=e.clientX;g.clientY=e.clientY;
  // A natural swipe starts a drag immediately; it must not cancel the long-press gesture.
  if(!g.active&&Math.hypot(dx,dy)>=6)activate(g);
  if(!g.active)return;e.preventDefault();
  const rect=canvas.current.getBoundingClientRect();g.pos=clampPosition({x:g.original.x+dx/rect.width,y:g.original.y+dy/rect.height},state.size);
  setPreview({id:g.id,pos:g.pos});setDragPoint({x:e.clientX,y:e.clientY,asset:g.object.asset});setOverTrash(inTrash(e.clientX,e.clientY));
 }
 function keyboard(e,object,index){if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const pos=position(object,index),step=e.shiftKey?.04:.015;const next=clampPosition({x:pos.x+(e.key==='ArrowLeft'?-step:e.key==='ArrowRight'?step:0),y:pos.y+(e.key==='ArrowUp'?-step:e.key==='ArrowDown'?step:0)},state.size);change({positions:{...layoutPositions(),[object.id]:next}});setMessage('Position enregistrée.');}
 function toggleDecor(id){const active=state.decorations.includes(id);change({decorations:active?state.decorations.filter(d=>d!==id):[...state.decorations,id]});}
 function zoom(value){change({zoom:Math.max(.2,Math.min(1.5,value)),viewInitialized:true});}
 useEffect(()=>{if(!state.viewInitialized&&viewport.current)zoom((viewport.current.clientWidth-4)/size.width);},[state.viewInitialized,state.highWater,state.unlocked]);
 const focusedItem=focus&&owned.find(p=>String(p.id)===String(focus.id)),focusedAsset=focusedItem&&toolAsset(focusedItem),usage=toolUses[focusedAsset]||toolUses.autre;
 return <section className="nmDesk" aria-label="Mon bureau illustré">
  <div className="nmDeskToolbar"><button onClick={()=>setDecorate(true)}><Flower2 size={18}/>Décorer</button><button aria-label="Réglages du bureau" title="Réglages du bureau" onClick={()=>setSettings(true)}><SlidersHorizontal size={20}/></button><button aria-label="Déplacer les objets" aria-pressed={arrange} onClick={()=>setArrange(!arrange)}><Move size={20}/></button><span/><button aria-label="Réduire le zoom" disabled={state.zoom<=.2} onClick={()=>zoom(state.zoom-.1)}><ZoomOut size={20}/></button><button aria-label="Agrandir le zoom" disabled={state.zoom>=1.5} onClick={()=>zoom(state.zoom+.1)}><ZoomIn size={20}/></button></div>
  <div className="nmDeskViewport" style={{'--desk-height':(size.height*state.zoom)+'px'}} ref={viewport} tabIndex={0} aria-label="Bureau à parcourir horizontalement et verticalement">
   <div className="nmDeskExtent" style={{width:size.width*state.zoom,height:size.height*state.zoom}}>
    <div className="nmDeskCanvas" ref={canvas} style={{width:size.width,height:size.height,transform:`scale(${state.zoom})`,backgroundImage:`url(${art('desk')})`}}>
     {objects.map((object,index)=>{const pos=position(object,index);return <button key={object.id} type="button" className={'nmDeskObject '+(selected?.id===object.id?'isSelected ':'')+(moving===object.id?'isMoving':'')+(object.asset.startsWith('frame-')?' isFrame':'')} style={{left:(pos.x*100)+'%',top:(pos.y*100)+'%',width:width(object),zIndex:moving===object.id?1000:Math.round(pos.y*100)}} aria-label={object.label} aria-describedby="desk-gesture-help" data-tool={object.asset} onContextMenu={e=>e.preventDefault()} onPointerDown={e=>down(e,object,index)} onPointerMove={move} onPointerUp={e=>finishGesture(false,e)} onPointerCancel={e=>finishGesture(true,e)} onLostPointerCapture={e=>finishGesture(true,e)} onKeyDown={e=>keyboard(e,object,index)} onClick={()=>{if(Date.now()<ignoreClick.current)return;if(arrange){setSelected(object);return;}object.container?setPotOpen(true):object.decor?setDecorate(true):setFocus(object.item);}}>
       {object.container&&<div className="nmDeskPotBrushes">{brushes.slice(0,3).map((b,i)=><img key={b.id} style={{left:(i*23)+'%',transform:`rotate(${35+i*8}deg)`}} src={art(toolAsset(b))} alt="" draggable="false"/>)}</div>}
       {object.id==='decor:bouquet'&&bouquetStage(count)&&<img className="nmDeskBouquet" src={art(bouquetStage(count))} alt="" draggable="false"/>}
       {object.asset.startsWith('frame-')&&<FramePhoto entry={selectedEntry} media={media}/>}
       <img className="nmDeskObjectArt" src={art(object.asset)} alt="" draggable="false"/><span>{object.label}</span>
      </button>;})}
    </div>
   </div>
  </div>
  <p id="desk-gesture-help" className="nmDeskHint">{arrange?'Glisse un objet pour le déplacer ou dépose-le dans la corbeille.':'Touche un outil pour sa fiche. Glisse-le pour le déplacer.'}</p>
  <div className="nmDeskBottom"><button onClick={()=>zoom((viewport.current.clientWidth-4)/size.width)}>Tout voir</button><small>{owned.length} outil{owned.length>1?'s':''}</small><button onClick={onAdd}><Plus size={17}/>Ajouter du matériel</button></div>
  {!owned.length&&<p className="nmDeskHint">Ajoute le matériel que tu possèdes : il apparaîtra ici.</p>}
  {(arrange||moving)&&<div className="nmDeskArrangeDock">
   <button ref={trash} className={'nmDeskTrash '+(overTrash?'isOver':'')} aria-label="Ranger l’objet sélectionné" disabled={!selected} onClick={()=>{if(selected)removeObject(selected);}}><Trash2 size={24}/><span>{overTrash?'Relâche pour ranger':selected?'Ranger '+selected.label:'Glisser ici pour ranger'}</span></button>
   <button onClick={()=>{finishGesture(true);setArrange(false);setSelected(null);}}>Terminé</button>
  </div>}
  {dragPoint&&<img className="nmDeskDragGhost" style={{left:dragPoint.x,top:dragPoint.y}} src={art(dragPoint.asset)} alt="" draggable="false"/>}
  {undo&&<div className="nmDeskUndo" role="status"><span>Objet rangé</span><button onClick={restoreObject}>Annuler</button></div>}
  <span className="nmVisuallyHidden" role="status">{message}</span>{error&&<p role="alert" className="formError">{error}</p>}
  {potOpen&&<Sheet title="Mes pinceaux" onClose={()=>setPotOpen(false)}><div className="nmDeskPotList">{brushes.map(b=><button key={b.id} onClick={()=>{setPotOpen(false);setFocus(b);}}><img src={art(toolAsset(b))} alt=""/><span>{b.name}</span></button>)}</div></Sheet>}
  {focusedItem&&<Sheet title={focusedItem.name||'Mon outil'} eyebrow="MON MATÉRIEL" className="nmToolFocus" onClose={()=>setFocus(null)}>
   <div className="nmToolHero"><img src={art(focusedAsset)} alt={focusedItem.name}/></div><h3>À quoi ça sert ?</h3><p>{usage[0]}</p><div className="nmToolTechnique">{usage[1]}</div>
   <dl>{focusedItem.brand&&<><dt>Marque</dt><dd>{focusedItem.brand}</dd></>}{focusedItem.reference&&<><dt>Référence</dt><dd>{focusedItem.reference}</dd></>}<dt>Quantité</dt><dd>{focusedItem.quantity??1}</dd>{focusedItem.notes&&<><dt>Mes notes</dt><dd>{focusedItem.notes}</dd></>}</dl>
   {/^lampe-|ponceuse|embouts-/.test(focusedAsset)&&<p className="fieldHelp">L’usage précis dépend de ton modèle et du protocole de tes produits. Consulte leur notice.</p>}
   {focusedItem.photo&&<details><summary>Voir ma photo</summary><img className="nmToolOwnPhoto" src={focusedItem.photo} alt={'Ma photo de '+focusedItem.name}/></details>}
   <button className="detailPrimary" onClick={()=>{setFocus(null);onEdit(focusedItem);}}>Modifier ma fiche</button><button className="detailSecondary" onClick={()=>{removeObject({id:String(focusedItem.id),item:focusedItem});setFocus(null);}}><Trash2 size={18}/>Retirer du bureau</button><div className="nmToolLinks"><button onClick={()=>{setFocus(null);onCreate();}}>Créer une idée</button><button onClick={()=>{setFocus(null);onTutorials();}}>Mes tutoriels</button></div>
  </Sheet>}
  {settings&&<Sheet title="Mon bureau" eyebrow="RÉGLAGES" onClose={()=>setSettings(false)}>
   <label>Taille du bureau<select value={state.size} onChange={e=>change({size:e.target.value})}>{Object.entries(deskSizes).map(([id,s])=><option key={id} value={id}>{s.label}</option>)}</select></label>
   <p className="fieldHelp">Le grand bureau offre plus de place. Parcours la surface en faisant glisser la vue ; utilise les boutons de zoom pour garder les objets lisibles.</p>
   <button className="detailSecondary" onClick={()=>{if(change({positions:{},hidden:[]}))setMessage('Bureau réorganisé.');}}><RotateCcw size={18}/>Réorganiser automatiquement</button>
   <label className="nmDeskGroupChoice"><input type="checkbox" checked={state.groupBrushes} onChange={e=>change({groupBrushes:e.target.checked})}/>Ranger mes pinceaux dans un pot</label>
   <h3>Sur mon bureau</h3><div className="nmDeskVisibility">{owned.map(item=><label key={item.id}><input type="checkbox" checked={!state.hidden.includes(String(item.id))} onChange={e=>change({hidden:e.target.checked?state.hidden.filter(id=>id!==String(item.id)):[...state.hidden,String(item.id)]})}/>{item.name}</label>)}</div>
   <p className="fieldHelp">Ranger un objet conserve sa fiche dans ta collection.</p><p className="fieldHelp">{storage.accountScoped?'Ta disposition rejoint les préférences de ton compte.':'Ta disposition est conservée sur cet appareil.'}</p>{error&&<p role="alert">{error}</p>}
  </Sheet>}
  {decorate&&<Sheet title="Mes décorations" eyebrow="UN BUREAU À TON IMAGE" className="nmDeskDecorations" onClose={()=>setDecorate(false)}>
   <p className="fieldHelp">Des souvenirs de ta collection et de tes créations. Tu peux tout déplacer ou ranger.</p>
   <button className="nmBouquetChoice" aria-pressed={state.decorations.includes('bouquet')} disabled={!hasVase} onClick={()=>toggleDecor('bouquet')}><img src={art(bouquetStage(count)||'vase-rose')} alt=""/><span><b>Mon bouquet évolutif</b><small>{count<12?`Prochaine étape : ${[1,3,5,8,12].find(n=>n>count)} vernis`:'Ton bouquet est fleuri'}</small></span>{hasVase?<Check size={18}/>:<LockKeyhole size={18}/>}</button>
   {['vase','flower','frame','art','reward'].map(kind=><section key={kind}><h3>{{vase:'Vases',flower:'Fleurs et feuillages',frame:'Cadres photo',art:'Illustrations',reward:'Mes créations'}[kind]}</h3><div className="nmDeskDecorGrid">{decorations.filter(d=>d.kind===kind).map(d=>{const earned=unlocked.has(d.id),active=state.decorations.includes(d.id);return <button key={d.id} disabled={!earned} aria-pressed={active} onClick={()=>toggleDecor(d.id)}><img src={art(d.id)} alt="" loading="lazy"/><b>{d.label}</b><small>{earned?(active?'Sur mon bureau':'Disponible'):d.rule}</small>{earned?active&&<Check size={15}/>:<LockKeyhole size={15}/>}</button>;})}</div></section>)}
   {entries.length>0&&<label>Photo dans mes cadres<select value={selectedEntry?.id||''} onChange={e=>change({frameEntryId:e.target.value})}>{entries.map(e=><option key={e.id} value={e.id}>{e.title||'Ma pose'}{!e.photo&&!e.mediaPath?' · sans photo':''}</option>)}</select></label>}
   <p className="fieldHelp">Les décorations débloquées restent acquises. La taille du bureau est toujours libre.</p>{error&&<p role="alert">{error}</p>}
  </Sheet>}
 </section>;
}
