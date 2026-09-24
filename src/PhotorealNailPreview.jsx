import React, { useId } from 'react';
import { renderingForIdea } from './techniqueRendering';
import { realisticRenderProfile } from './realisticRendering';

const NAIL_PATH = 'M0-50C-18-50-28-34-28-12L-26 24C-24 42-15 50 0 50C16 50 25 40 27 22L28-13C28-35 17-50 0-50Z';
const PHOTO_VIEW = { x: 350, y: 0, width: 850, height: 620 };
const PLACEMENTS = [
  { x: 1084, y: 489, sx: 1.03, sy: 1.08, rotate: 30 }, // pouce
  { x: 902, y: 146, sx: 1.08, sy: .98, rotate: 4 },   // index
  { x: 752, y: 82, sx: 1.3, sy: 1.07, rotate: 0 },    // majeur
  { x: 610, y: 136, sx: 1.2, sy: 1.02, rotate: 1 },   // annulaire
  { x: 455, y: 286, sx: .92, sy: .86, rotate: -3 },   // auriculaire
];

const sparklePoints = [[-17,-33,1.6],[-4,-39,.9],[12,-31,2.2],[19,-15,1.2],[-12,-11,2.5],[3,-4,1.1],[16,7,1.8],[-18,15,1.2],[-3,21,2.2],[13,31,1],[-10,37,1.7]];

function rgb(value) {
  const source = /^#[0-9a-f]{3}$/i.test(value || '')
    ? '#' + value.slice(1).split('').map(part => part + part).join('')
    : /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#b88699';
  return [1, 3, 5].map(index => parseInt(source.slice(index, index + 2), 16));
}

function mix(value, target, amount) {
  const from = rgb(value), to = rgb(target);
  return '#' + from.map((channel, index) => Math.round(channel + (to[index] - channel) * amount).toString(16).padStart(2, '0')).join('');
}

function FacetedGem({ x, y, size = 7, tint = '#d7f4ff', filter }) {
  return <g filter={filter}>
    <path d={`M${x} ${y-size} ${x+size*.78} ${y-size*.28} ${x+size*.62} ${y+size*.66} ${x} ${y+size} ${x-size*.7} ${y+size*.42} ${x-size*.78} ${y-size*.3}Z`} fill={tint} stroke="#fff" strokeWidth="1" />
    <path d={`M${x} ${y-size} ${x+size*.25} ${y} ${x-size*.78} ${y-size*.3}Z`} fill="#fff" opacity=".82" />
    <path d={`M${x+size*.25} ${y} ${x+size*.62} ${y+size*.66} ${x} ${y+size}Z`} fill="#88b8d4" opacity=".56" />
    <circle cx={x-size*.2} cy={y-size*.28} r={size*.16} fill="#fff" />
  </g>;
}

function BaseGel({ color, opacity = .86 }) {
  return <>
    <path d={NAIL_PATH} fill={mix(color, '#170d15', .2)} opacity={opacity} style={{ mixBlendMode: 'multiply' }} />
    <path d={NAIL_PATH} fill={mix(color, '#ffffff', .2)} opacity=".42" style={{ mixBlendMode: 'color' }} />
  </>;
}

function TopCoat({ strong = false }) {
  return <>
    <path d="M-13-37C-18-18-17 5-13 22" fill="none" stroke="#fff" strokeWidth={strong ? 5.4 : 4.2} strokeLinecap="round" opacity={strong ? .58 : .43} />
    <path d="M-10-39C-13-25-13-15-11-7" fill="none" stroke="#fff" strokeWidth="1.35" strokeLinecap="round" opacity=".92" />
    <path d="M15 24C12 34 7 39 1 41" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity=".22" />
  </>;
}

function FrenchTip({ nail }) {
  const fill = nail.drawingTechnique === 'tortoiseshell' ? '#c88137' : nail.drawingTechnique === 'leopard' ? '#d8aa60' : nail.accentColor || nail.color;
  return <g><path d="M-28-50H28V-28C12-19-12-19-28-28Z" fill={fill} />
    {nail.drawingTechnique === 'leopard' && [[-15,-35,5],[2,-29,4],[16,-36,5]].map(([x,y,r],index)=><circle key={index} cx={x} cy={y} r={r} fill="none" stroke="#392218" strokeWidth="2.4" strokeDasharray="10 5" />)}
    {nail.drawingTechnique === 'tortoiseshell' && [[-15,-35,8],[5,-33,8],[18,-39,6]].map(([x,y,r],index)=><circle key={index} cx={x} cy={y} r={r} fill="#59301e" opacity=".72" />)}
  </g>;
}

function MaterialDefs({ ids, color, accent }) {
  const light = mix(color, '#ffffff', .72), dark = mix(color, '#09050b', .68);
  return <defs>
    <clipPath id={ids.clip}><path d={NAIL_PATH} /></clipPath>
    <linearGradient id={ids.depth} x1="-28" y1="-50" x2="28" y2="50" gradientUnits="userSpaceOnUse">
      <stop stopColor={light} /><stop offset=".24" stopColor={color} /><stop offset=".78" stopColor={dark} /><stop offset="1" stopColor={mix(color, '#ffffff', .2)} />
    </linearGradient>
    <radialGradient id={ids.aura} cx="50%" cy="45%" r="58%">
      <stop offset="0" stopColor={accent} stopOpacity=".98" /><stop offset=".34" stopColor={mix(accent, color, .24)} stopOpacity=".88" /><stop offset=".7" stopColor={color} stopOpacity=".34" /><stop offset="1" stopColor={mix(color, '#ffffff', .76)} stopOpacity="0" />
    </radialGradient>
    <radialGradient id={ids.magnetic} cx="50%" cy="50%" r="55%">
      <stop stopColor="#fff" stopOpacity=".88" /><stop offset=".16" stopColor={light} stopOpacity=".86" /><stop offset=".52" stopColor={color} stopOpacity=".27" /><stop offset="1" stopColor={dark} stopOpacity="0" />
    </radialGradient>
    <linearGradient id={ids.beam} x1="-30" x2="30" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop stopColor="#fff" stopOpacity="0" /><stop offset=".38" stopColor={light} stopOpacity=".15" /><stop offset=".48" stopColor="#fff" stopOpacity=".94" /><stop offset=".54" stopColor={light} stopOpacity=".62" /><stop offset=".7" stopColor={color} stopOpacity=".08" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
    </linearGradient>
    <linearGradient id={ids.chrome} x1="-30" x2="30" y1="0" y2="0" gradientUnits="userSpaceOnUse">
      <stop stopColor="#1d1720" /><stop offset=".09" stopColor="#fafcff" /><stop offset=".18" stopColor="#756f79" /><stop offset=".32" stopColor={light} /><stop offset=".43" stopColor="#ffffff" /><stop offset=".49" stopColor="#5f5964" /><stop offset=".66" stopColor="#17131a" /><stop offset=".82" stopColor="#f8fbff" /><stop offset=".91" stopColor={mix(color, '#ffffff', .55)} /><stop offset="1" stopColor="#29232d" />
    </linearGradient>
    <linearGradient id={ids.jelly} x1="0" y1="-50" x2="0" y2="50" gradientUnits="userSpaceOnUse">
      <stop stopColor={mix(color, '#ffffff', .55)} stopOpacity=".56" /><stop offset=".56" stopColor={color} stopOpacity=".42" /><stop offset="1" stopColor={mix(color, '#3a101f', .28)} stopOpacity=".7" />
    </linearGradient>
    <linearGradient id={ids.pearl} x1="-25" y1="-42" x2="24" y2="43" gradientUnits="userSpaceOnUse">
      <stop stopColor="#8bdcff" stopOpacity=".16" /><stop offset=".27" stopColor="#fff" stopOpacity=".75" /><stop offset=".48" stopColor="#ffc9ef" stopOpacity=".3" /><stop offset=".7" stopColor="#fff8b0" stopOpacity=".3" /><stop offset="1" stopColor="#8bcfff" stopOpacity=".18" />
    </linearGradient>
    <linearGradient id={ids.holo} x1="-28" y1="-45" x2="27" y2="45" gradientUnits="userSpaceOnUse">
      <stop stopColor="#ff5b78" stopOpacity=".16" /><stop offset=".18" stopColor="#ffc95f" stopOpacity=".7" /><stop offset=".38" stopColor="#7af5c8" stopOpacity=".2" /><stop offset=".56" stopColor="#62b8ff" stopOpacity=".78" /><stop offset=".78" stopColor="#c78aff" stopOpacity=".24" /><stop offset="1" stopColor="#ff80b9" stopOpacity=".62" />
    </linearGradient>
    <linearGradient id={ids.glass} x1="-27" y1="-45" x2="25" y2="48" gradientUnits="userSpaceOnUse">
      <stop stopColor="#fff" stopOpacity=".7" /><stop offset=".16" stopColor={light} stopOpacity=".2" /><stop offset=".5" stopColor={color} stopOpacity=".34" /><stop offset=".77" stopColor={dark} stopOpacity=".19" /><stop offset="1" stopColor="#fff" stopOpacity=".45" />
    </linearGradient>
    <linearGradient id={ids.gold} x1="-14" y1="-14" x2="14" y2="14" gradientUnits="userSpaceOnUse">
      <stop stopColor="#684313" /><stop offset=".24" stopColor="#fff3a8" /><stop offset=".49" stopColor="#b77a24" /><stop offset=".72" stopColor="#fff9c9" /><stop offset="1" stopColor="#7c511b" />
    </linearGradient>
    <filter id={ids.soft} x="-40%" y="-30%" width="180%" height="160%"><feGaussianBlur stdDeviation="3.2" /></filter>
    <filter id={ids.airbrush} x="-40%" y="-30%" width="180%" height="160%">
      <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="2" seed="7" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.2" />
      <feGaussianBlur stdDeviation="2.1" />
    </filter>
    <filter id={ids.relief} x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="2.4" dy="4" stdDeviation="2.1" floodColor="#291321" floodOpacity=".65" /><feSpecularLighting surfaceScale="3" specularConstant=".52" specularExponent="18" lightingColor="#fff" result="shine"><feDistantLight azimuth="225" elevation="48" /></feSpecularLighting><feComposite in="shine" in2="SourceAlpha" operator="in" result="shineClip"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/><feMergeNode in="shineClip"/></feMerge></filter>
    <filter id={ids.gemShadow} x="-70%" y="-70%" width="240%" height="240%"><feDropShadow dx="1.4" dy="2.8" stdDeviation="1.3" floodColor="#281724" floodOpacity=".72" /></filter>
  </defs>;
}

function MaterialLayer({ technique, nail, index, ids }) {
  const color = nail.color || '#b88699';
  const accent = nail.accentColor || mix(color, '#fff1f5', .62);
  const light = mix(color, '#ffffff', .76), dark = mix(color, '#0a050b', .72);
  const beamAngle = [-21, 13, -8, 18, -14][index];

  if (technique === 'aura') return <>
    <path d={NAIL_PATH} fill={mix(color, '#fff7f4', .73)} opacity=".95" />
    <ellipse cx="1" cy="-2" rx="23" ry="34" fill={`url(#${ids.aura})`} filter={`url(#${ids.airbrush})`} opacity=".82" />
    <ellipse cx="0" cy="0" rx="18" ry="29" fill={`url(#${ids.aura})`} opacity=".35" style={{ mixBlendMode: 'multiply' }} />
    <TopCoat strong />
  </>;
  if (technique === 'cat-eye') return <>
    <path d={NAIL_PATH} fill={dark} />
    <ellipse cx="0" cy="0" rx="29" ry="48" fill={`url(#${ids.magnetic})`} opacity=".54" transform={`rotate(${beamAngle})`} />
    <rect x="-34" y="-58" width="68" height="116" fill={`url(#${ids.beam})`} transform={`rotate(${beamAngle})`} filter={`url(#${ids.soft})`} />
    <rect x="-33" y="-58" width="66" height="116" fill={`url(#${ids.beam})`} transform={`rotate(${beamAngle})`} opacity=".92" />
    <TopCoat />
  </>;
  if (technique === 'velvet-magnetic') return <>
    <path d={NAIL_PATH} fill={dark} />
    <ellipse cx="0" cy="-2" rx="26" ry="42" fill={`url(#${ids.magnetic})`} opacity=".76" filter={`url(#${ids.soft})`} />
    {sparklePoints.map(([x,y,r], at) => <circle key={at} cx={x} cy={y} r={r*.48} fill={at%2 ? light : '#fff'} opacity=".5" />)}
    <TopCoat />
  </>;
  if (technique === 'chrome') return <>
    <rect x="-31" y="-55" width="62" height="110" fill={`url(#${ids.chrome})`} />
    <path d="M-4-52C8-25 5 22-7 50" fill="none" stroke="#fff" strokeWidth="8" opacity=".34" filter={`url(#${ids.soft})`} />
    <path d="M8-49C20-19 18 18 7 45" fill="none" stroke="#070609" strokeWidth="8" opacity=".3" filter={`url(#${ids.soft})`} />
    <path d="M-17-43C-21-13-19 11-14 31" fill="none" stroke="#fff" strokeWidth="2.3" opacity=".94" />
  </>;
  if (technique === 'jelly') return <>
    <path d={NAIL_PATH} fill={`url(#${ids.jelly})`} style={{ mixBlendMode: 'multiply' }} />
    <path d={NAIL_PATH} fill={color} opacity=".2" style={{ mixBlendMode: 'color' }} />
    <path d={NAIL_PATH} fill="none" stroke={light} strokeWidth="2.2" opacity=".5" />
    <TopCoat strong />
  </>;
  if (technique === 'glazed') return <>
    <BaseGel color={mix(color, '#fff6f1', .52)} opacity=".66" />
    <rect x="-31" y="-54" width="62" height="108" fill={`url(#${ids.pearl})`} opacity=".8" />
    <path d="M-6-49C8-21 7 22-5 49" fill="none" stroke="#f8fdff" strokeWidth="9" opacity=".25" filter={`url(#${ids.soft})`} />
    <TopCoat strong />
  </>;
  if (technique === 'gel-3d') return <>
    <BaseGel color={color} opacity=".76" />
    <g filter={`url(#${ids.relief})`}>
      {[0,72,144,216,288].map((angle, petal) => <ellipse key={angle} cx="0" cy="-13" rx="7.5" ry="17" transform={`rotate(${angle} 0 2)`} fill={petal % 2 ? light : accent} fillOpacity=".78" stroke="#fff" strokeOpacity=".72" strokeWidth="1.2" />)}
      <circle cx="0" cy="2" r="6" fill={mix(accent, '#fff', .38)} stroke="#fff" strokeOpacity=".8" />
      <circle cx="-2" cy="0" r="1.6" fill="#fff" opacity=".9" />
    </g>
    <TopCoat />
  </>;
  if (technique === 'glitter') return <>
    <BaseGel color={color} opacity=".86" />
    {sparklePoints.map(([x,y,r], at) => <g key={at} transform={`translate(${x + (index%2 ? 2 : -1)} ${y})`}>
      <circle r={r} fill={at%3===0 ? '#fff5ac' : at%3===1 ? '#f7d9ff' : '#fff'} opacity=".9" />
      {r > 1.5 && <path d="M-4 0H4M0-4V4" stroke="#fff" strokeWidth=".8" opacity=".9" />}
    </g>)}
    <TopCoat />
  </>;
  if (technique === 'rhinestones') return <>
    <BaseGel color={mix(color, '#fff', .28)} opacity=".72" />
    {(nail.decoration || index === 3) && <><FacetedGem x={0} y={-7} size={9} filter={`url(#${ids.gemShadow})`} /><FacetedGem x={-8} y={10} size={5} tint="#ffd5ef" filter={`url(#${ids.gemShadow})`} /><FacetedGem x={8} y={13} size={6} tint="#fff0a9" filter={`url(#${ids.gemShadow})`} /></>}
    <TopCoat />
  </>;
  if (technique === 'charms') return <>
    <BaseGel color={mix(color, '#fff', .28)} opacity=".72" />
    {(nail.decoration || index === 3) && <g filter={`url(#${ids.relief})`}>
      <circle cx="0" cy="2" r="14" fill={`url(#${ids.gold})`} stroke="#fff1a6" strokeWidth="1.5" />
      <path d="M0-9 3-2 11-1 5 4 7 12 0 8-7 12-5 4-11-1-3-2Z" fill="#fff4b4" stroke="#8b5a18" strokeWidth=".7" />
      <path d="M-6-5C-2-9 3-8 6-5" fill="none" stroke="#fff" strokeWidth="1.6" opacity=".8" />
    </g>}
    <TopCoat />
  </>;
  if (technique === 'glass-nails') return <>
    <path d={NAIL_PATH} fill={mix(color, '#fff', .68)} opacity=".22" />
    <path d={NAIL_PATH} fill={`url(#${ids.glass})`} opacity=".78" style={{ mixBlendMode: 'screen' }} />
    <path d="M-17-35C-2-25 4-8 20-4M-21 12C-5 4 7 13 21 27" fill="none" stroke={light} strokeWidth="5" opacity=".2" filter={`url(#${ids.soft})`} />
    <path d={NAIL_PATH} fill="none" stroke={light} strokeWidth="3" opacity=".76" />
    <path d="M12-40C20-20 19 9 12 32" fill="none" stroke="#fff" strokeWidth="4" opacity=".5" />
    <TopCoat strong />
  </>;
  if (technique === 'aurora-holographic') return <>
    <BaseGel color={mix(color, '#fff', .36)} opacity=".7" />
    <rect x="-31" y="-54" width="62" height="108" fill={`url(#${ids.holo})`} opacity=".72" style={{ mixBlendMode: 'screen' }} />
    <path d="M-22 30C-8 8 2-14 20-38" stroke="#a7f7ff" strokeWidth="11" opacity=".2" filter={`url(#${ids.soft})`} />
    {sparklePoints.filter((_, point) => point % 3 === index % 3).map(([x,y], point) => <path key={point} d={`M${x-3} ${y}H${x+3}M${x} ${y-3}V${y+3}`} stroke="#fff" strokeWidth=".8" opacity=".82" />)}
    <TopCoat strong />
  </>;
  if (technique === 'blooming') return <>
    <path d={NAIL_PATH} fill={mix(color, '#fff', .62)} />
    <g filter={`url(#${ids.airbrush})`} opacity=".85"><circle cx="-8" cy="-18" r="18" fill={color}/><circle cx="13" cy="2" r="20" fill={accent}/><circle cx="-7" cy="25" r="17" fill={mix(color, '#3c1732', .35)}/></g>
    <TopCoat />
  </>;
  if (technique === 'marble') return <>
    <path d={NAIL_PATH} fill={mix(color, '#fff', .62)} />
    <path d="M-27-32C-7-25-17-7 11-3C28 0 8 19 27 30" fill="none" stroke={dark} strokeWidth="7" opacity=".2" filter={`url(#${ids.soft})`} />
    <path d="M-27-32C-7-25-17-7 11-3C28 0 8 19 27 30" fill="none" stroke={color} strokeWidth="1.8" opacity=".76" />
    <path d="M-24 18C-8 7 5 22 23 8" fill="none" stroke="#fff" strokeWidth="2" opacity=".58" />
    <TopCoat />
  </>;
  if (technique === 'tortoiseshell') return <>
    <path d={NAIL_PATH} fill="#d28a3c" opacity=".9" />
    <g fill="#58301f" opacity=".76">{[[-14,-29,12],[12,-24,15],[-4,3,13],[16,22,11],[-17,29,9]].map(([x,y,r],at)=><circle key={at} cx={x} cy={y} r={r} />)}</g>
    <TopCoat strong />
  </>;
  if (technique === 'leopard') return <>
    <path d={NAIL_PATH} fill={mix(color, '#efc774', .56)} />
    <g fill="none" stroke="#392218" strokeWidth="3.1">{[[-13,-28,8],[13,-19,9],[-12,4,8],[12,20,8],[-2,35,6]].map(([x,y,r],at)=><circle key={at} cx={x} cy={y} r={r} strokeDasharray="13 6" />)}</g>
    <TopCoat strong />
  </>;
  if (technique === 'stamping') return <>
    <BaseGel color={color} />
    <g fill="none" stroke={accent} strokeWidth="1.2" opacity=".88">{[-30,-10,10,30].map(y => <g key={y}><circle cx="-8" cy={y} r="7"/><circle cx="8" cy={y} r="7"/><path d={`M-19 ${y}H19`}/></g>)}</g>
    <TopCoat />
  </>;
  if (technique === 'micro-french') return <>
    <path d={NAIL_PATH} fill="#e9c6c3" opacity=".54" />
    <path d="M-28-31V-55H28V-31C11-23-11-23-28-31Z" fill={nail.accentColor || color} />
    <TopCoat strong />
  </>;
  if (technique === 'stickers') return <>
    <BaseGel color={color} />
    {(nail.decoration || index === 3) && <path d="M0-12 4-3 14-2 7 5 9 15 0 10-9 15-7 5-14-2-4-3Z" fill={accent} stroke="#fff" strokeWidth="1" opacity=".92" />}
    <TopCoat />
  </>;
  return <><BaseGel color={color} /><TopCoat strong /></>;
}

function Nail({ placement, nail, index, technique, prefix, dimmed }) {
  const ids = Object.fromEntries(['clip','depth','aura','magnetic','beam','chrome','jelly','pearl','holo','glass','gold','soft','airbrush','relief','gemShadow'].map(name => [name, `${prefix}-${name}-${index}`]));
  const color = nail.color || '#b88699', accent = nail.accentColor || mix(color, '#ffffff', .62);
  return <g transform={`translate(${placement.x} ${placement.y}) rotate(${placement.rotate}) scale(${placement.sx} ${placement.sy})`} opacity={dimmed ? .16 : 1}>
    <MaterialDefs ids={ids} color={color} accent={accent} />
    <g clipPath={`url(#${ids.clip})`}><MaterialLayer technique={technique} nail={nail} index={index} ids={ids} />{nail.drawing === 'french' && <FrenchTip nail={nail} />}</g>
    <path d={NAIL_PATH} fill="none" stroke="#fff" strokeWidth="1.25" strokeOpacity=".32" />
  </g>;
}

export default function PhotorealNailPreview({ idea, onSelect, selectedIndex = 0, labels = [], highlightedIndices, compact = false }) {
  const prefix = useId().replace(/:/g, '');
  const rendering = renderingForIdea(idea);
  const profile = realisticRenderProfile(rendering.technique);
  const nails = Array.from({ length: 5 }, (_, index) => idea.nails?.[index] || idea.nails?.[0] || { color: '#b88699' });
  const source = `${import.meta.env.BASE_URL}nail-hand-mockup-v1.webp`;
  return <div className={'photorealNails' + (compact ? ' compactNails' : '')} role={onSelect ? 'group' : 'img'} aria-label={`Rendu photo réaliste ${rendering.label} : ${profile.signals.join(', ')}`}>
    <svg viewBox={`${PHOTO_VIEW.x} ${PHOTO_VIEW.y} ${PHOTO_VIEW.width} ${PHOTO_VIEW.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <image href={source} width="1536" height="1024" />
      {PLACEMENTS.map((placement, index) => <Nail key={index} placement={placement} nail={nails[index]} index={index} technique={nails[index].technique || rendering.technique} prefix={prefix} dimmed={highlightedIndices && !highlightedIndices.includes(index)} />)}
    </svg>
    <span className="photorealBadge">PHOTO · MATIÈRE</span>
    {onSelect && <div className="photorealHotspots" aria-label="Choisir un ongle">{PLACEMENTS.map((placement, index) => <button key={index} aria-label={'Voir ' + (labels[index] || `l’ongle ${index + 1}`)} aria-pressed={index === selectedIndex} onClick={() => onSelect(index)} style={{ left: `${(placement.x - PHOTO_VIEW.x) / PHOTO_VIEW.width * 100}%`, top: `${(placement.y - PHOTO_VIEW.y) / PHOTO_VIEW.height * 100}%`, transform: `translate(-50%, -50%) rotate(${placement.rotate}deg)` }} />)}</div>}
  </div>;
}
