import React from 'react';
import {Heart, Package, Check, Palette, Table2} from 'lucide-react';
import Bottle from './Bottle.jsx';
import {toneOf, shelfSorts, toneGroups} from './model.js';
import './shelf.css';

function ShelfIcon() {
  return <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 19h18M4 19v2m16-2v2M5 9h5v10H5zM6 5h3v4H6zM14 11h5v8h-5zM15 7h3v4h-3z"/></svg>;
}
export function ViewSwitch({value, onChange}) {
  return <div className="nmShelfSwitch" role="group" aria-label="Affichage de la collection">
    {[['shelf','Vue étagère',ShelfIcon],['desk','Vue bureau',Table2],['photos','Vue photos',Package]].map(([id,label,Icon]) =>
      <button key={id} aria-label={label} title={id==='photos'?'Produits · Vue photos':label} aria-pressed={value===id} onClick={()=>onChange(id)}><Icon size={22} aria-hidden="true"/></button>)}
  </div>;
}
export function ShelfSort({value,onChange}) {
  return <label className="nmShelfSort"><span className="nmVisuallyHidden">Ranger par</span>
    <select aria-label="Ranger par" value={value} onChange={e=>onChange(e.target.value)}>
      {shelfSorts.map(([id,label])=><option key={id} value={id}>{label}</option>)}
    </select>
  </label>;
}
const toneSwatches = ['#d5b6a0','#e6a2b6','#e19b79','#a94053','#906193','#6d87b0','#8b9a80','#d7ba65','#3c343d',null];
export function ShelfToneFilter({items, value, onChange}) {
  return <div className="nmShelfToneFilter" aria-label="Familles de teintes">
    <button className="nmToneAll" aria-label="Toutes les teintes" title="Toutes les teintes" aria-pressed={!value} onClick={()=>onChange('')}><Palette size={19}/></button>
    {toneGroups.map((tone,index)=>items.some(p=>p.type!=='Matériel'&&toneOf(p)===tone)&&
      <button key={tone} title={tone} aria-label={tone} aria-pressed={value===tone} onClick={()=>onChange(tone)}>
        <i className={toneSwatches[index]?'':'nmToneUnknown'} style={{background:toneSwatches[index]||'transparent'}}/>
      </button>)}
  </div>;
}
export function ShelfDecor() {
  return <svg className="nmShelfDecor" viewBox="0 0 80 110" aria-hidden="true">
    <path d="M68 102Q40 71 32 5M48 67Q19 55 10 30" stroke="var(--shelf-leaf)" strokeWidth="1.4" fill="none"/>
    {[[34,19,-25],[27,40,-62],[41,54,-25],[52,79,-25],[57,62,34],[47,34,38],[17,38,-40]].map(([x,y,r],i)=>
      <ellipse key={i} cx={x} cy={y} rx="5.2" ry="12" transform={`rotate(${r} ${x} ${y})`} fill="var(--shelf-leaf)" opacity={.4+(i%4)*.12}/>)}
  </svg>;
}
const shortLabel = p => p.reference && String(p.reference).length<=10 ? p.reference :
  String(p.name||'Mon produit').replace(/\s*[-–·]\s*(gel|led|nail|vernis|polish).*$/i,'');

export default function Shelf({items=[], onSelect, selectedId, mini=false, variant='open', commonIds=new Set()}) {
  const rows=Array.from({length:Math.ceil(items.length/5)},(_,i)=>items.slice(i*5,i*5+5));
  if(!rows.length)return null;
  return <div className={'nmShelf '+(mini?'nmShelfMini':'')} data-testid="illustrated-shelf">
    <div className="nmShelfNiche" data-variant={mini?'open':variant}>
      {!mini&&variant==='botanical'&&<img className="nmDrawnFrame" src={import.meta.env.BASE_URL+'atelier/collection-v2/frame.webp'} alt=""/>}
      {!mini&&variant!=='botanical'&&<img className="nmDrawnShelfDecor" src={import.meta.env.BASE_URL+'atelier/collection-v2/'+(variant==='botanical'?'flowers':'sage')+'.webp'} alt=""/>}
      {rows.map((row,index)=><div className="nmShelfRow" key={index} role="group" aria-label={'Étagère '+(index+1)}>
        <img className="nmDrawnPlank" src={import.meta.env.BASE_URL+'atelier/collection-v2/plank.webp'} alt=""/><div className="nmShelfBottles">{row.map(p=>{
          const shared=commonIds.has(String(p.id)),label='Voir '+p.name+(p.brand?' · '+p.brand:'');
          return <button className={'nmShelfProduct '+(String(p.id)===String(selectedId)?'isSelected':'')}
            key={p.id} title={p.name+(p.brand?' · '+p.brand:'')} tabIndex={mini?-1:0}
            onClick={e=>onSelect?.(p,e.currentTarget.querySelector('.nmBottle'),e.currentTarget)}
            aria-label={label+(shared?' · Tu possèdes aussi ce vernis':'')}>
            <Bottle product={p}/><span className="nmShelfProductLabel"><b>{shortLabel(p)}</b></span>
            {p.fav&&<Heart className="nmShelfFavorite" size={11} fill="currentColor"/>}
            {shared&&<span className="nmShelfCommon" title="Tu possèdes aussi ce vernis"><Check size={11}/></span>}
          </button>;
        })}</div>
      </div>)}
    </div>
  </div>;
}
