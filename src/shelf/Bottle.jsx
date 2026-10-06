import React, {useId} from 'react';
import {shelfColor, shelfFinish, shelfColorStatus} from './model.js';

// One outlined illustration for thumbnails, Pro shelves and animated product focus.
// Theme tokens dress the glass and cap; the saved product HEX alone fills the bottle.
const glass = 'M25 77C40 72 80 72 95 77Q104 80 102 93L96 150Q94 164 81 167Q60 170 39 167Q26 164 24 150L18 93Q16 80 25 77Z';
const liquid = 'M28 85Q29 81 60 81Q91 81 92 85L87 148Q86 158 60 160Q34 158 33 148Z';
const heart = 'M60 144C58 142 54 139 54 136.5C54 132.5 58 132 60 135C62 132 66 132.5 66 136.5C66 139 62 142 60 144Z';

export default function Bottle({product, className = ''}) {
  const id = useId().replace(/:/g, ''), color = shelfColor(product), finish = shelfFinish(product);
  const paint = name => `url(#${id}-${name})`;
  const lightPigment = color && [1,3,5].reduce((sum,i)=>sum+parseInt(color.slice(i,i+2),16)*({1:.2126,3:.7152,5:.0722})[i],0)>155;
  return <svg className={'nmBottle '+className} viewBox="0 0 120 180" aria-hidden="true" focusable="false"
    data-color={color || 'unknown'} data-finish={finish} data-color-status={shelfColorStatus(product)}>
    <defs>
      <linearGradient id={id+'-metal'} x1="0" y1="0" x2="1" y2=".18">
        <stop stopColor="#fff" stopOpacity="0"/><stop offset=".32" stopColor="#fff" stopOpacity=".45"/>
        <stop offset=".47" stopColor="#fff" stopOpacity=".06"/><stop offset=".7" stopColor="#fff" stopOpacity=".32"/>
        <stop offset="1" stopColor="#fff" stopOpacity="0"/>
      </linearGradient>
      <linearGradient id={id+'-cat'} x1="0" y1="0" x2="1" y2="1">
        <stop offset=".3" stopColor="#fff" stopOpacity="0"/><stop offset=".47" stopColor="#fff" stopOpacity=".1"/>
        <stop offset=".53" stopColor="#fff" stopOpacity=".68"/><stop offset=".6" stopColor="#fff" stopOpacity=".1"/>
        <stop offset=".76" stopColor="#fff" stopOpacity="0"/>
      </linearGradient>
      <radialGradient id={id+'-pearl'} cx=".3" cy=".25" r=".9">
        <stop stopColor="#fff4e2" stopOpacity=".36"/><stop offset=".4" stopColor="#f8e0ef" stopOpacity=".1"/>
        <stop offset=".75" stopColor="#dddfff" stopOpacity=".17"/><stop offset="1" stopColor="#fff" stopOpacity="0"/>
      </radialGradient>
      <pattern id={id+'-spark'} width="17" height="23" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="5" r=".8" fill="#fff" opacity=".65"/><circle cx="12" cy="17" r="1" fill="#ffedd3" opacity=".6"/>
        <path d="M13 3v3m-1.5-1.5h3" stroke="#fff" strokeWidth=".65" opacity=".55"/>
      </pattern>
      <clipPath id={id+'-liquid'}><path d={liquid}/></clipPath>
    </defs>
    <ellipse cx="60" cy="172" rx="43" ry="4.5" fill="var(--bottle-shadow, #d9b0ba)" opacity=".42"/>
    <path d="M43 66H77V79H43Z" fill="var(--bottle-rim, #fff3ed)" stroke="var(--bottle-ink, #713d57)" strokeWidth="1.4"/>
    <path d={glass} fill="var(--bottle-rim, #fff3ed)" fillOpacity=".9" stroke="var(--bottle-ink, #713d57)" strokeWidth="1.9"/>
    {color && <g clipPath={paint('liquid')}>
      <path className="nmBottlePigment" d={liquid} fill={color} opacity={finish==='jelly' ? .6 : 1}/>
      {finish==='chrome' && <path d={liquid} fill={paint('metal')}/>}
      {finish==='shimmer' && <path d={liquid} fill={paint('pearl')}/>}
      {finish==='cat-eye' && <path d={liquid} fill={paint('cat')}/>}
      {finish==='glitter' && <path d={liquid} fill={paint('spark')}/>}
      <path d="M82 84Q91 81 92 86L87 148Q86 158 60 160Q37 159 33 150Q54 158 72 153Q81 149 82 134Z" fill="var(--bottle-ink, #713d57)" opacity=".1"/>
      <path d="M34 87Q39 84 43 85L42 134Q42 143 39 146Q36 142 36 135Z" fill="#fff" opacity=".27"/>
      <path d="M30 85Q60 81 90 85" fill="none" stroke="#fff" strokeWidth="1.6" opacity=".3"/>
    </g>}
    <path d={liquid} fill="none" stroke="var(--bottle-ink, #713d57)" strokeOpacity={color?'.28':'.13'} strokeWidth="1.1"/>
    <path d="M25 84Q22 86 24 99L30 149Q31 158 39 161" fill="none" stroke="#fff" strokeWidth="2.5" opacity=".85" strokeLinecap="round"/>
    <path d="M96 87L91 149Q90 158 82 162M40 165Q60 168 80 165" fill="none" stroke="#fff" strokeWidth="1.5" opacity=".65" strokeLinecap="round"/>
    <path className="nmBottleCap" d="M40 18Q60 13 80 18L83 69Q60 76 37 69Z" fill="var(--bottle-cap, #713552)" stroke="var(--bottle-cap-line, #4e233b)" strokeWidth="1.9" strokeLinejoin="round"/>
    <path d="M43 23L48 23L45 65L40 66Z" fill="var(--bottle-cap-light, #c890ae)" opacity=".6"/>
    <path d="M74 22L78 23L80 67L74 69Z" fill="var(--bottle-cap-line, #4e233b)" opacity=".25"/>
    <ellipse cx="60" cy="18" rx="20" ry="3.5" fill="var(--bottle-cap-light, #c890ae)" fillOpacity=".5" stroke="var(--bottle-cap-line, #4e233b)" strokeWidth="1.7"/>
    {color ? <path className="nmBottleSignature" d={heart} fill="none" stroke={lightPigment?'var(--bottle-ink, #713d57)':'#fff3f5'} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity=".85"/> :
      <path d="M52 122H68" stroke="var(--bottle-ink, #713d57)" strokeWidth="1.7" strokeLinecap="round" opacity=".5"/>}
  </svg>;
}
