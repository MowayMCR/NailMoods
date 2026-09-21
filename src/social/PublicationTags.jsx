import React,{useEffect,useState,useRef} from 'react';
import {TAXONOMY,TAG_LABELS,cleanTags,suggestTags} from './tags';
import {photoPalette} from '../colorAnalysis';
import './discovery.css';
export default function PublicationTags({source,value,onChange}){
 const edited=useRef(Boolean(value&&Object.values(value).some(v=>Array.isArray(v)&&v.length)));
 const [suggestions,setSuggestions]=useState(()=>suggestTags(source)),[notice,setNotice]=useState('');
 useEffect(()=>{let active=true;const next=suggestTags(source);setSuggestions(next);if(!edited.current)onChange(next);const photo=source.photo;
 if(typeof photo==='string'&&photo.startsWith('data:image/')){const img=new Image();img.onload=()=>{if(!active)return;try{const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,96,96);const next=suggestTags(source,photoPalette(ctx.getImageData(0,0,96,96),5));setSuggestions(next);if(!edited.current)onChange(next);}catch{}};img.src=photo;}
 return()=>{active=false;};},[source.photo,source.title]);
 const tags=cleanTags(value??suggestions);
 function toggle(key,v){edited.current=true;onChange({...tags,[key]:tags[key].includes(v)?tags[key].filter(t=>t!==v):[...tags[key],v].slice(0,8)});}
 return <section className="publicationTags"><h3>Les Moods de cette publication</h3><p>Suggestions à confirmer d’après ta pose et ses couleurs. La photo peut aussi contenir des couleurs de fond.</p><div className="tagChips">{tags.moods.map(v=><button type="button" aria-label={'Retirer '+v} key={v} aria-pressed="true" onClick={()=>toggle('moods',v)}>{v} ×</button>)}{!tags.moods.length&&<small>Choisis un Mood pour aider à retrouver ta publication.</small>}</div><details><summary>Choisir ou modifier les Moods</summary><div className="tagChips">{TAXONOMY.moods.map(v=><button type="button" key={v} aria-pressed={tags.moods.includes(v)} onClick={()=>toggle('moods',v)}>{v}</button>)}</div></details><details><summary>Autres tags · facultatifs</summary>{Object.entries(TAXONOMY).filter(([key])=>key!=='moods').map(([key,values])=><fieldset key={key}><legend>{TAG_LABELS[key]}</legend><div className="tagChips">{values.map(v=><button type="button" key={v} aria-pressed={tags[key].includes(v)} onClick={()=>toggle(key,v)}>{v}</button>)}</div></fieldset>)}<small>Confirme une technique seulement si tu la connais.</small></details><button type="button" className="quietButton" onClick={()=>{edited.current=true;onChange(suggestions);setNotice('Suggestions appliquées : ajuste-les avant de publier.');}}>Reprendre les suggestions</button>{notice&&<small role="status">{notice}</small>}</section>;
}
