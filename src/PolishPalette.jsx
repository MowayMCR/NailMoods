import React, { useId, useState } from 'react';
import { Check } from 'lucide-react';
import { validHex } from './colorAnalysis';
import { polishFamilies, collectionSwatches, readRecentColors, rememberColor } from './polishPalette';
import { browserStorage } from './storage';
import './polishPalette.css';

export default function PolishPalette({value='',onChange,items=[]}) {
  const id=useId();
  const [group,setGroup]=useState('Nudes & roses');
  const [recent,setRecent]=useState(()=>readRecentColors(browserStorage));
  const [notice,setNotice]=useState('');
  const owned=collectionSwatches(items);
  const options=group==='Récentes'?recent.map(color=>({name:color.toUpperCase(),color})):group==='Ma collection'?owned:(polishFamilies.find(([name])=>name===group)?.[1]||[]).map(([name,color])=>({name,color}));
  function remember(color){if(!validHex(color))return;try{setRecent(rememberColor(browserStorage,color));setNotice('');}catch{setNotice('La couleur est sélectionnée, mais les couleurs récentes ne peuvent pas être conservées sur cet appareil.');}}
  function choose(color){onChange(color);remember(color);}
  return <div className="polishPalette">
    <div className="polishFamilies" role="group" aria-label="Familles du nuancier">{[...polishFamilies.map(([name])=>name),'Récentes','Ma collection'].map(name=><button type="button" key={name} aria-pressed={group===name} onClick={()=>setGroup(name)}>{name}</button>)}</div>
    <div className="polishSwatches" role="group" aria-label={group}>{options.map(({name,color})=><button type="button" key={color} aria-label={'Choisir '+name} aria-pressed={value.toLowerCase()===color} onClick={()=>choose(color)}><span style={{background:color}}>{value.toLowerCase()===color&&<Check size={16}/>}</span><small>{name}</small></button>)}</div>
    {!options.length&&<p className="fieldHelp">{group==='Ma collection'?'Tes couleurs enregistrées apparaîtront ici. Tu peux déjà choisir dans le nuancier.':'Les prochaines couleurs choisies apparaîtront ici.'}</p>}
    {group==='Métalliques'&&<p className="fieldHelp">Ces pastilles représentent la couleur de base. Choisis la finition métallique séparément.</p>}
    <div className="polishCustom"><label>Sélecteur libre<input type="color" aria-label="Choisir une couleur libre" value={validHex(value)?value:'#813c60'} onChange={e=>onChange(e.target.value)} onBlur={()=>remember(value)}/></label><label htmlFor={id}>Code HEX<input id={id} aria-label="Code couleur" value={value} placeholder="#813c60" spellCheck={false} autoComplete="off" maxLength={7} aria-invalid={!validHex(value)} aria-describedby={!validHex(value)?id+'-error':undefined} onChange={e=>onChange(e.target.value)} onBlur={()=>remember(value)}/></label></div>
    {!validHex(value)&&<p id={id+'-error'} className="fieldHelp">Choisis une pastille ou saisis un code complet, par exemple #813c60.</p>}
    {notice&&<p role="status" className="fieldHelp">{notice}</p>}
  </div>;
}
