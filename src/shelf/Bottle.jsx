import React, {useId} from 'react';
import {shelfColor, shelfFinish, shelfColorStatus} from './model.js';

// One outlined illustration for thumbnails, Pro shelves and animated product focus.
// Theme tokens dress the glass and cap; the saved product HEX alone fills the bottle.
export default function Bottle({product, className = ''}) {
  const id = useId().replace(/:/g, ''), color = shelfColor(product), finish = shelfFinish(product);
  const paint = name => `url(#${id}-${name})`;
  const art = import.meta.env.BASE_URL+'atelier/collection-v2/bottle.webp';
  const rgb=color ? [1,3,5].map(i=>parseInt(color.slice(i,i+2),16)/255) : [1,1,1];
  return <svg className={'nmBottle nmDrawnBottle '+className} viewBox="0 0 300 645" aria-hidden="true" focusable="false" data-color={color||'unknown'} data-finish={finish} data-color-status={shelfColorStatus(product)}>
    <defs>
      <clipPath id={id+'-pigment'}><path d="M58 312Q59 292 150 292Q241 292 242 312L231 554Q231 580 150 580Q69 580 69 554Z"/></clipPath>
      <filter id={id+'-tint'} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values={`${rgb[0]} 0 0 0 0 0 ${rgb[1]} 0 0 0 0 0 ${rgb[2]} 0 0 0 0 0 1 0`}/></filter>
      <pattern id={id+'-spark'} width="22" height="27" patternUnits="userSpaceOnUse"><circle cx="5" cy="8" r="1.5" fill="#fff4d0"/><circle cx="17" cy="21" r="1" fill="white"/></pattern>
      <linearGradient id={id+'-shine'}><stop stopColor="white" stopOpacity=".02"/><stop offset=".42" stopColor="white" stopOpacity=".5"/><stop offset=".55" stopColor="white" stopOpacity=".02"/><stop offset=".82" stopColor="white" stopOpacity=".35"/></linearGradient>
    </defs>
    <image href={art} width="300" height="645"/>
    {color&&<g clipPath={paint('pigment')}>
      <path className="nmBottlePigment" d="M50 285H250V590H50Z" fill={color}/>
      <image href={art} width="300" height="645" filter={paint('tint')} opacity={finish==='jelly'?.18:.38}/>
      <path d="M70 310Q88 299 93 314L87 519Q84 545 79 538Z" fill="white" opacity=".24"/>
      {['chrome','shimmer','cat-eye'].includes(finish)&&<path d="M50 285H250V590H50Z" fill={paint('shine')} opacity={finish==='shimmer'?.35:.7}/>}
      {finish==='glitter'&&<path d="M50 285H250V590H50Z" fill={paint('spark')} opacity=".7"/>}
    </g>}
  </svg>;
}
