import React,{useEffect,useRef,useState} from 'react';
import {BookOpen,Heart,Search,Star,X} from 'lucide-react';
import TapFavorite from '../TapFavorite.jsx';
import {poseTags,filterBook,swipeDirection,bookPage} from './model.js';
import './pose-book.css';
const art=import.meta.env.BASE_URL+'atelier/pose-book-v1/';
export default function PoseBook({entries=[],title='Mon livre de poses',subtitle='',renderVisual,onOpen,onFavorite,onFeature,personal=false,notice='',busy=false}){
 const [opened,setOpened]=useState(false),[query,setQuery]=useState(''),[tag,setTag]=useState(''),[index,setIndex]=useState(0),[wide,setWide]=useState(()=>typeof matchMedia!=='undefined'&&matchMedia('(min-width:700px)').matches),[turn,setTurn]=useState(0);
 const gesture=useRef(null),suppress=useRef(false),animation=useRef(null),region=useRef(null);
 useEffect(()=>{const m=matchMedia('(min-width:700px)'),change=()=>setWide(m.matches);m.addEventListener('change',change);return()=>{m.removeEventListener('change',change);clearTimeout(animation.current);};},[]);
 const filtered=filterBook(entries,query,tag),size=wide?2:1,page=bookPage(index,filtered.length,size),pages=Math.ceil(filtered.length/size),tags=[...new Set(entries.flatMap(poseTags))],visible=filtered.slice(page*size,(page+1)*size);
 useEffect(()=>setIndex(0),[query,tag,wide]);
 function move(direction){if(!opened){setOpened(true);return;}const next=bookPage(page+direction,filtered.length,size);if(next===page)return;setTurn(direction);setIndex(next);clearTimeout(animation.current);animation.current=setTimeout(()=>setTurn(0),380);}
 function down(e){if(!e.isPrimary||e.button!==0||e.target.closest('button,input,select,a'))return;gesture.current={id:e.pointerId,x:e.clientX,y:e.clientY};suppress.current=false;}
 function up(e){const g=gesture.current;gesture.current=null;if(!g||g.id!==e.pointerId)return;const direction=swipeDirection(e.clientX-g.x,e.clientY-g.y,region.current?.clientWidth||350);if(direction){suppress.current=Date.now()+150;move(direction);}}
 return <section className="nmPoseBook" aria-label={title}>
  <header className="nmBookHeading"><div><small>UN SOUVENIR APRÈS L’AUTRE</small><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}</div>{opened&&<button className="nmBookQuiet" onClick={()=>setOpened(false)} aria-label="Fermer le livre"><X size={19}/></button>}</header>
  {!opened?<button className="nmBookCover" onClick={()=>setOpened(true)} aria-label={'Ouvrir '+title}><img src={art+'cover.webp'} alt="Couverture dessinée rose et cassis"/><span><small>NAILMOODS</small><b>{title}</b><em>{entries.length} pose{entries.length===1?'':'s'}</em><i><BookOpen size={18}/>Ouvrir mon livre</i></span></button>:<>
   <div className="nmBookSearch"><label><Search size={18}/><input type="search" maxLength={80} aria-label="Rechercher dans le livre" placeholder="French, floral, une pose…" value={query} onChange={e=>setQuery(e.target.value)}/></label>{tags.length>0&&<label className="nmBookTagSelect"><span className="srOnly">Filtrer le livre par tag</span><select aria-label="Filtrer le livre par tag" value={tag} onChange={e=>setTag(e.target.value)}><option value="">Tous les tags</option>{tags.map(t=><option key={t}>{t}</option>)}</select></label>}</div>
   <p className="nmBookGesture">Glisse sur les pages pour feuilleter{onFavorite?' · Double tap pour '+(personal?'marquer « À refaire »':'un coup de cœur'):''}.</p>
   <div ref={region} className={'nmBookSpread'+(wide?' wide':'')+(turn?' turning':'')} style={{'--turn':turn}} tabIndex={0} role="group" aria-label="Pages du livre" onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();move(e.key==='ArrowRight'?1:-1);}}} onPointerDown={down} onPointerUp={up} onPointerCancel={()=>{gesture.current=null;}} onClickCapture={e=>{if(suppress.current&&Date.now()<suppress.current){e.preventDefault();e.stopPropagation();suppress.current=false;}}}>
    <img className="nmBookPaper" src={art+'open.webp'} alt="" aria-hidden="true"/>
    <div className="nmBookPages">{visible.map(entry=><article className="nmBookPage" key={entry.kind+entry.id}>
     {entry.featured&&<span className="nmBookRibbon"><Star size={13} fill="currentColor"/>À la une</span>}
     <TapFavorite className="nmBookPhoto" onOpen={()=>onOpen?.(entry)} onToggle={()=>onFavorite?.(entry)} saved={Boolean(entry.saved)} aria-label={'Ouvrir la pose '+(entry.title||'Ma pose')}>{renderVisual(entry)}</TapFavorite>
     <h4>{entry.title||'Ma pose'}</h4><p className="nmBookDate">{entry.date||entry.performedOn||''}</p>
     <div className="nmBookTags">{poseTags(entry).slice(0,4).map(t=><button key={t} onClick={()=>setTag(t)}>{t}</button>)}</div>
     <div className="nmBookActions">{onFavorite&&<button disabled={busy} aria-pressed={Boolean(entry.saved)} aria-label={(personal?'À refaire : ':'Coup de cœur : ')+(entry.title||'Ma pose')} onClick={()=>onFavorite(entry)}><Heart size={19} fill={entry.saved?'currentColor':'none'}/><span>{personal?'À refaire':'Coup de cœur'}</span></button>}{Number(entry.hearts)>0&&<small title="Coups de cœur reçus">♥ {entry.hearts}</small>}{onFeature&&entry.owner!==false&&<button disabled={busy} aria-pressed={Boolean(entry.featured)} aria-label={'Mettre à la une : '+(entry.title||'Ma pose')} onClick={()=>onFeature(entry)}><Star size={18} fill={entry.featured?'currentColor':'none'}/><span>À la une</span></button>}</div>
    </article>)}{!visible.length&&<div className="nmBookEmpty"><BookOpen size={32}/><h4>{entries.length?'Aucune pose avec ces tags':'Les premières pages t’attendent'}</h4><p>{entries.length?'Essaie un autre mot ou un autre tag.':'Les poses enregistrées apparaîtront ici.'}</p>{entries.length>0&&<button onClick={()=>{setQuery('');setTag('');}}>Voir toutes les poses</button>}</div>}{wide&&visible.length===1&&<div className="nmBookLastPage"><Heart size={24}/><p>La suite de l’histoire<br/>reste à créer.</p></div>}</div>
   </div>
   <div className="nmBookPagination"><span role="status">{pages?'Page '+(page+1)+' / '+pages:'Livre vide'}</span>{pages>1&&<label><span className="srOnly">Aller à une page du livre</span><input type="range" aria-label="Aller à une page du livre" min="0" max={pages-1} value={page} onChange={e=>setIndex(Number(e.target.value))}/></label>}</div>
  </>}{notice&&<p className="nmBookNotice" role="status">{notice}</p>}
 </section>;
}
