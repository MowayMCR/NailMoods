import React,{useId} from 'react';
import {shelfColor,shelfFinish} from './model.js';

// One vector bottle. Only the liquid uses the product colour; the mood never alters it.
export default function Bottle({product,className=''}){const id=useId().replace(/:/g,''),color=shelfColor(product),finish=shelfFinish(product);return <svg className={'nmBottle '+className} viewBox="0 0 120 180" aria-hidden="true" data-color={color||'unknown'} data-finish={finish}>
 <defs>
  <linearGradient id={id+'cap'} x1="0" x2="1"><stop stopColor="#17121b"/><stop offset=".3" stopColor="#605463"/><stop offset=".46" stopColor="#29202e"/><stop offset="1" stopColor="#100d14"/></linearGradient>
  <linearGradient id={id+'glass'} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff" stopOpacity=".78"/><stop offset=".4" stopColor="#fff" stopOpacity=".08"/><stop offset="1" stopColor="#fff" stopOpacity=".45"/></linearGradient>
  <linearGradient id={id+'shine'} x1="0" x2="1"><stop stopColor="#fff" stopOpacity=".52"/><stop offset=".24" stopColor="#fff" stopOpacity="0"/><stop offset=".8" stopColor="#1e1724" stopOpacity=".06"/><stop offset="1" stopColor="#fff" stopOpacity=".35"/></linearGradient>
  <linearGradient id={id+'metal'} x1="0" y1="0" x2="1" y2=".5"><stop stopColor="#17121b" stopOpacity=".3"/><stop offset=".25" stopColor="#fff" stopOpacity=".85"/><stop offset=".45" stopColor="#fff" stopOpacity="0"/><stop offset=".75" stopColor="#fff" stopOpacity=".65"/><stop offset="1" stopColor="#17121b" stopOpacity=".2"/></linearGradient>
  <linearGradient id={id+'cat'} x1="0" y1="0" x2="1" y2="1"><stop offset=".25" stopColor="#fff" stopOpacity="0"/><stop offset=".47" stopColor="#fff" stopOpacity=".15"/><stop offset=".52" stopColor="#fff" stopOpacity=".92"/><stop offset=".6" stopColor="#fff" stopOpacity=".12"/><stop offset=".8" stopColor="#fff" stopOpacity="0"/></linearGradient>
  <pattern id={id+'spark'} width="13" height="17" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1.1" fill="white" opacity=".85"/><circle cx="10" cy="12" r=".8" fill="#fff7d8" opacity=".75"/></pattern>
  <clipPath id={id+'liquid'}><path d="M29 91 Q60 88 91 91 L87 151 Q60 159 33 151Z"/></clipPath>
 </defs>
 <ellipse cx="60" cy="171" rx="39" ry="4" fill="#201222" opacity=".12"/>
 <path d="M46 68H74V86H46Z" fill="#f7e9e8" opacity=".75"/>
 <path d="M26 80Q60 74 94 80Q101 82 100 93L95 156Q94 165 82 167H38Q26 165 25 155L20 93Q19 83 26 80Z" fill={'url(#'+id+'glass)'} stroke="#b8a7b1" strokeOpacity=".7" strokeWidth="1.4"/>
 <path d="M29 91 Q60 88 91 91 L87 151 Q60 159 33 151Z" fill={color||'#f4f0ee'} fillOpacity={!color?'.12':finish==='jelly'?'.48':'.97'}/>
 <g clipPath={'url(#'+id+'liquid)'}>{color&&<><rect x="28" y="87" width="65" height="74" fill={'url(#'+id+'shine)'}/>{['chrome','shimmer'].includes(finish)&&<rect x="28" y="87" width="65" height="74" opacity={finish==='shimmer'?'.34':'.9'} fill={'url(#'+id+'metal)'}/>} {finish==='cat-eye'&&<rect x="28" y="87" width="65" height="74" fill={'url(#'+id+'cat)'}/>} {finish==='glitter'&&<rect x="28" y="87" width="65" height="74" fill={'url(#'+id+'spark)'}/>}</>}</g>
 <path d="M27 91L31 150Q32 155 38 156" stroke="white" strokeWidth="3" opacity=".65" fill="none" strokeLinecap="round"/><path d="M92 95L89 148" stroke="white" strokeWidth="1.5" opacity=".35"/>
 <path d="M40 17Q60 13 80 17L83 75Q60 79 37 75Z" fill={'url(#'+id+'cap)'} stroke="#29212d" strokeWidth="1"/><path d="M44 22L42 67" stroke="white" opacity=".17" strokeWidth="2" strokeLinecap="round"/>
 <path d="M54 128Q46 112 57 114L61 125Q63 111 70 117Q72 124 59 133Z" fill="white" opacity=".55"/>
 {!color&&<text x="60" y="110" textAnchor="middle" fontSize="17" fill="#635d68">?</text>}
 </svg>;}
