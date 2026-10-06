import React,{useState} from 'react';
import {ArrowLeft,RotateCcw,Sparkles,Sun} from 'lucide-react';
import {preciseShade} from '../colorAnalysis';
import {presets,shapes,techniques,fingerColours} from './material';
import DrawnNail from './DrawnNail';
import AtelierArt from '../design/AtelierArt';
import './prototype.css';

function Nail({settings,index}) {
  return <DrawnNail {...settings} {...fingerColours(settings,index)} technique={settings.nails[index]} seed={index} label={`${['Pouce','Index','Majeur','Annulaire','Auriculaire'][index]} : ${techniques.find(([id])=>id===settings.nails[index])?.[1]}`} />;
}
export default function RenderPrototype({items=[],profile={},onBack}) {
  const [settings,setSettings]=useState({...presets[0],shape:'Amande',length:'Moyenne',light:0});
  const [finger,setFinger]=useState('all');
  const update=patch=>setSettings(old=>({...old,...patch}));
  const polishes=items.map(item=>({...item,prototypeShade:preciseShade(item)})).filter(item=>item.prototypeShade);
  const technique= finger==='all'?(new Set(settings.nails).size===1?settings.nails[0]:'mixed'):settings.nails[Number(finger)];
  const changeTechnique=id=>update({nails:settings.nails.map((old,i)=>finger==='all'||i===Number(finger)?id:old)});
  return <div className="creationPage nmRenderPrototype">
    <button className="rpBack" onClick={onBack}><ArrowLeft size={16}/> Créer</button>
    <header><span className="rpEyebrow">L’ATELIER DES IDÉES</span><h1>Tes idées, en dessin.</h1><p>Des couleurs à toi. Une signature dessinée.</p></header>
    <div className="rpLayout">
      <section className="rpIdea" aria-label="Aperçu de la composition">
        <div className="rpCardTop"><span><Sparkles size={16}/> MON ESSAI</span><small>Style dessin · essai interactif</small></div>
        <div className="rpStage"><AtelierArt source="botanical" className="rpBotanical"/><div className="rpNails">{settings.nails.map((_,i)=><Nail key={i} settings={settings} index={i}/>)}</div><span>{settings.shape} · {settings.length.toLowerCase()}</span></div>
        <div className="rpIdeaText"><h2>{settings.name}</h2><p>Contours délicats, reflets peints et motifs à composer.</p>
          <div className="rpSwatches">{[['Base',settings.base],['Accent',settings.accent]].map(([name,color])=><span key={name}><i style={{background:color}}/>{name} <small>{color.toUpperCase()}</small></span>)}</div>
          <div className="rpTechList">{[...new Set(settings.nails)].map(id=><span key={id}>{techniques.find(([key])=>key===id)?.[1]}</span>)}</div>
          <p className="rpNote">Les matières sont interprétées en dessin. Les pastilles conservent les teintes choisies pour tes vernis.</p>
        </div>
      </section>
      <section className="rpControls" aria-label="Personnaliser le rendu">
        <div className="rpControlHeading"><h2>À ton image</h2><button aria-label="Réinitialiser le prototype" onClick={()=>{setSettings({...presets[0],shape:'Amande',length:'Moyenne',light:0});setFinger('all');}}><RotateCcw size={17}/></button></div>
        <fieldset><legend>Les couleurs</legend><div className="rpColors">{[['base','Base'],['accent','Accent']].map(([key,label])=><label key={key}>{label}<div><input type="color" aria-label={`Couleur ${label.toLowerCase()}`} value={settings[key]} onChange={e=>update({[key]:e.target.value})}/><span>{settings[key].toUpperCase()}</span></div>
          {polishes.length>0&&<select aria-label={`Vernis ${label.toLowerCase()} de ma collection`} value="" onChange={e=>{const p=polishes.find(p=>String(p.id)===e.target.value);if(p)update({[key]:p.prototypeShade});}}><option value="">Choisir mon vernis</option>{polishes.map(p=><option key={p.id} value={String(p.id)}>{[p.brand,p.name||p.reference||'Mon vernis'].filter(Boolean).join(' · ')}</option>)}</select>}
        </label>)}</div>{polishes.length===0&&<small className="rpHint">Les vernis dont la teinte est renseignée apparaîtront ici. Tu peux déjà choisir tes couleurs.</small>}</fieldset>
        <fieldset><legend>La silhouette</legend><div className="rpSelectRow"><label>Forme<select aria-label="Forme" value={settings.shape} onChange={e=>update({shape:e.target.value})}>{shapes.map(s=><option key={s}>{s}</option>)}</select></label><label>Longueur<select aria-label="Longueur" value={settings.length} onChange={e=>update({length:e.target.value})}>{['Courte','Moyenne','Longue'].map(s=><option key={s}>{s}</option>)}</select></label></div></fieldset>
        <fieldset><legend>La technique</legend><label>Appliquer sur<select aria-label="Ongles à modifier" value={finger} onChange={e=>setFinger(e.target.value)}><option value="all">Les cinq ongles</option>{['Pouce','Index','Majeur','Annulaire','Auriculaire'].map((s,i)=><option key={s} value={i}>{s}</option>)}</select></label>{finger!=='all'&&<label>Couleur de cet ongle<select aria-label="Couleur de cet ongle" value={settings.colors?.[Number(finger)]||'base'} onChange={e=>update({colors:settings.nails.map((_,i)=>i===Number(finger)?e.target.value:settings.colors?.[i]||'base')})}><option value="base">Base</option><option value="accent">Accent</option></select></label>}<label>Effet ou motif<select aria-label="Technique du rendu" value={technique} onChange={e=>changeTechnique(e.target.value)}>{technique==='mixed'&&<option value="mixed" disabled>Plusieurs techniques</option>}{techniques.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label></fieldset>
        <label className="rpLight"><span><Sun size={16}/> Position des reflets peints</span><input aria-label="Angle de lumière" type="range" min="-1" max="1" step=".05" value={settings.light} onChange={e=>update({light:Number(e.target.value)})}/></label>
      </section>
    </div>
    <section className="rpPresets" aria-label="Compositions à essayer"><h2>Trois envies à explorer</h2><div>{presets.map((preset,i)=><button key={preset.name} onClick={()=>{update(preset);setFinger('all');}}><span className="rpPresetDrawing" aria-hidden="true">{preset.nails.map((_,index)=><Nail key={index} index={index} settings={{...preset,shape:settings.shape,length:settings.length,light:0}}/>)}</span><span><small>ENVIE 0{i+1}</small><b>{preset.name}</b><em>{[...new Set(preset.nails)].map(id=>techniques.find(([key])=>key===id)?.[1]).join(' · ')}</em></span></button>)}</div></section>
    <p className="rpFooter">Direction dessin issue des planches validées. Cet essai permet de vérifier son adaptation aux teintes, aux formes et aux techniques avant de l’étendre à tes idées.</p>
  </div>;
}
