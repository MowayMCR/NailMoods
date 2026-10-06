import React, {useId} from 'react';
import {shelfColor, shelfFinish, shelfColorStatus} from './model.js';

// The pigment follows the glass silhouette. The same drawing serves shelf and focus.
const glass = 'M25 77C40 72 80 72 95 77Q104 80 102 93L96 150Q94 164 81 167Q60 170 39 167Q26 164 24 150L18 93Q16 80 25 77Z';
const liquid = 'M25 85C25 80 43 78 60 78S95 80 95 85L90 148Q89 160 60 162Q31 160 30 148Z';

export default function Bottle({product, className = ''}) {
  const id = useId().replace(/:/g, ''), color = shelfColor(product), finish = shelfFinish(product);
  const paint = name => `url(#${id}-${name})`;
  return <svg className={'nmBottle '+className} viewBox="0 0 120 180" aria-hidden="true"
    data-color={color || 'unknown'} data-finish={finish} data-color-status={shelfColorStatus(product)}>
    <defs>
      <linearGradient id={id+'-cap'}>
        <stop stopColor="#18141c"/><stop offset=".16" stopColor="#514453"/>
        <stop offset=".28" stopColor="#28202e"/><stop offset=".76" stopColor="#211a27"/>
        <stop offset="1" stopColor="#100e15"/>
      </linearGradient>
      <linearGradient id={id+'-glass'} x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#fff" stopOpacity=".73"/><stop offset=".3" stopColor="#fff" stopOpacity=".08"/>
        <stop offset=".8" stopColor="#fff" stopOpacity=".12"/><stop offset="1" stopColor="#fff" stopOpacity=".64"/>
      </linearGradient>
      <linearGradient id={id+'-volume'}>
        <stop stopColor="#3a152a" stopOpacity=".28"/><stop offset=".16" stopColor="#fff" stopOpacity=".17"/>
        <stop offset=".37" stopColor="#fff" stopOpacity="0"/><stop offset=".73" stopColor="#fff" stopOpacity="0"/>
        <stop offset="1" stopColor="#351027" stopOpacity=".33"/>
      </linearGradient>
      <linearGradient id={id+'-base'} x1="0" y1="0" x2="0" y2="1">
        <stop offset=".5" stopColor="#351027" stopOpacity="0"/><stop offset="1" stopColor="#351027" stopOpacity=".17"/>
      </linearGradient>
      <linearGradient id={id+'-metal'} x1="0" y1="0" x2="1" y2=".18">
        <stop stopColor="#302332" stopOpacity=".38"/><stop offset=".3" stopColor="#fff" stopOpacity=".87"/>
        <stop offset=".45" stopColor="#fff" stopOpacity=".1"/><stop offset=".65" stopColor="#302332" stopOpacity=".22"/>
        <stop offset=".85" stopColor="#fff" stopOpacity=".62"/><stop offset="1" stopColor="#fff" stopOpacity="0"/>
      </linearGradient>
      <linearGradient id={id+'-cat'} x1="0" y1="0" x2="1" y2="1">
        <stop offset=".29" stopColor="#fff" stopOpacity="0"/><stop offset=".46" stopColor="#fff" stopOpacity=".07"/>
        <stop offset=".51" stopColor="#fff" stopOpacity=".86"/><stop offset=".58" stopColor="#fff" stopOpacity=".1"/>
        <stop offset=".75" stopColor="#fff" stopOpacity="0"/>
      </linearGradient>
      <radialGradient id={id+'-pearl'} cx=".3" cy=".25" r=".9">
        <stop stopColor="#fff4e2" stopOpacity=".55"/><stop offset=".35" stopColor="#f8e0ef" stopOpacity=".13"/>
        <stop offset=".7" stopColor="#dddfff" stopOpacity=".24"/><stop offset="1" stopColor="#fff" stopOpacity="0"/>
      </radialGradient>
      <pattern id={id+'-spark'} width="17" height="23" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="5" r=".8" fill="#fff" opacity=".8"/><circle cx="12" cy="17" r="1.1" fill="#ffedd3" opacity=".75"/>
        <circle cx="14" cy="4" r=".5" fill="#fff" opacity=".6"/>
      </pattern>
      <clipPath id={id+'-liquid'}><path d={liquid}/></clipPath>
    </defs>
    <ellipse cx="60" cy="172" rx="38" ry="4" fill="#281321" opacity=".16"/>
    <path d="M43 64H77V79H43Z" fill="#fff" opacity=".55"/>
    <path d={glass} fill={paint('glass')} stroke="#bfa4ac" strokeOpacity=".72" strokeWidth="1.2"/>
    {color && <g clipPath={paint('liquid')}>
      <path className="nmBottlePigment" d={liquid} fill={color} opacity={finish==='jelly' ? .58 : 1}/>
      <path d={liquid} fill={paint('volume')}/><path d={liquid} fill={paint('base')}/>
      {finish==='chrome' && <path d={liquid} fill={paint('metal')}/>}
      {finish==='shimmer' && <path d={liquid} fill={paint('pearl')}/>}
      {finish==='cat-eye' && <path d={liquid} fill={paint('cat')}/>}
      {finish==='glitter' && <path d={liquid} fill={paint('spark')}/>}
      <path d="M26 84Q60 88 94 84" fill="none" stroke="#fff" strokeWidth="1" opacity=".28"/>
    </g>}
    <path d="M25 83Q22 84 23 94L29 149Q30 157 38 160" fill="none" stroke="#fff" strokeWidth="2.2" opacity=".85" strokeLinecap="round"/>
    <path d="M33 86Q30 86 31 96L34 138" fill="none" stroke="#fff" strokeWidth="2.6" opacity=".48" strokeLinecap="round"/>
    <path d="M97 87L92 149Q91 159 83 162" fill="none" stroke="#fff" strokeWidth="1.4" opacity=".66" strokeLinecap="round"/>
    <path d="M36 164Q60 169 84 164" fill="none" stroke="#fff" strokeWidth="2.1" opacity=".75" strokeLinecap="round"/>
    <path d="M41 18Q60 14 79 18L82 70Q60 75 38 70Z" fill={paint('cap')} stroke="#251d2b" strokeWidth=".8"/>
    <ellipse cx="60" cy="18" rx="19" ry="2.8" fill="#463c48"/>
    <path d="M46 24L44 63" stroke="#fff" strokeWidth="1.8" opacity=".26" strokeLinecap="round"/>
    <path d="M40 70Q60 73 80 70" fill="none" stroke="#fff" opacity=".13" strokeWidth="1"/>
    {!color && <path d="M52 122H68" stroke="#92828d" strokeWidth="2" strokeLinecap="round" opacity=".7"/>}
  </svg>;
}
