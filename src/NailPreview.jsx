import React, { useEffect, useId, useState } from 'react';
import { normalize } from './creationEngine';
import { renderingForIdea } from './techniqueRendering';
import PhotorealNailPreview from './PhotorealNailPreview';

function Decor({ motif, color }) {
  if (motif === 'star') return <path d="m32 42 3 8 9 1-7 6 2 9-7-5-8 5 3-9-7-6 9-1Z" fill={color} />;
  if (motif === 'moon') return <path d="M38 44c-15-5-24 17-7 21 5 1 10-2 12-6-14 4-20-12-5-15Z" fill={color} />;
  if (motif === 'heart') return <path d="M32 64C8 48 25 38 32 48c8-10 24 0 0 16Z" fill={color} />;
  if (motif === 'leaf') return <g><path d="M22 67C13 47 24 35 44 34C47 54 36 65 22 67Z" fill={color} /><path d="m22 67 18-28m-13 22-4-11m9 4 10-4" fill="none" stroke="#63432c" strokeWidth="1.4" opacity=".7" /></g>;
  if (motif === 'stripe') return <g stroke={color} strokeWidth="2.2"><path d="m8 52 48-15M8 58l48-15" /></g>;
  if (motif === 'gem') return <Gem x={32} y={52} color={color} />;
  if (motif === 'flower') return <g fill={color}>{[0, 72, 144, 216, 288].map(angle => <ellipse key={angle} cx="32" cy="46" rx="4" ry="7" transform={'rotate(' + angle + ' 32 54)'} />)}<circle cx="32" cy="54" r="3" fill="#fff8e8" /></g>;
  return <rect x="26" y="47" width="12" height="14" rx="3" fill={color} transform="rotate(-15 32 54)" />;
}

function colorChannels(value) {
  const hex = /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#b88699';
  return [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
}

function mix(value, target, amount) {
  const from = colorChannels(value), to = colorChannels(target);
  return '#' + from.map((channel, index) => Math.round(channel + (to[index] - channel) * amount).toString(16).padStart(2, '0')).join('');
}

function Gem({ x, y, color = '#d8f6ff', size = 6 }) {
  return <g><path d={`M${x} ${y-size} ${x+size} ${y} ${x} ${y+size} ${x-size} ${y}Z`} fill={color} stroke="#fff" strokeWidth=".8" /><path d={`M${x} ${y-size+2} ${x+size-2} ${y} ${x} ${y+1} ${x-size+2} ${y}Z`} fill="#fff" opacity=".55" /></g>;
}

function FrenchTip({ nail }) {
  const fill = nail.drawingTechnique === 'tortoiseshell' ? '#c88235' : nail.drawingTechnique === 'leopard' ? '#d7aa5f' : nail.accentColor;
  return <g><path d="M0 0H64V26Q32 40 0 26Z" fill={fill} />
    {nail.drawingTechnique === 'leopard' && [[15,14,5],[32,20,4],[49,14,5],[25,30,3]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r} fill="none" stroke="#3a2418" strokeWidth="2" />)}
    {nail.drawingTechnique === 'tortoiseshell' && [[16,15,8],[38,16,9],[28,28,7]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r} fill="#5b2d1c" opacity=".72" />)}
  </g>;
}

function MaterialLayer({ technique, nail, index, ids }) {
  const color = nail.color || '#b88699';
  const light = mix(color, '#ffffff', .7), dark = mix(color, '#120914', .55);
  if (technique === 'cat-eye') return <>
    <rect width="64" height="104" fill={`url(#${ids.depth})`} />
    <ellipse cx={index % 2 ? 38 : 29} cy="53" rx="23" ry="48" fill={`url(#${ids.halo})`} transform={index % 2 ? 'rotate(-18 32 52)' : 'rotate(18 32 52)'} />
    <path d={index % 2 ? 'M5 88 58 13' : 'M9 15 56 91'} stroke={light} opacity=".72" strokeWidth="5.5" filter={`url(#${ids.blur})`} />
    <path d={index % 2 ? 'M8 91 58 20' : 'M12 18 55 91'} stroke="#fff" opacity=".65" strokeWidth="1.25" />
  </>;
  if (technique === 'velvet-magnetic') return <><rect width="64" height="104" fill={`url(#${ids.depth})`} /><ellipse cx="32" cy="49" rx="25" ry="45" fill={`url(#${ids.velvet})`} /><g fill={light} opacity=".5">{[[22,30],[39,35],[27,48],[43,56],[20,66],[35,74]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r=".75" />)}</g></>;
  if (technique === 'chrome') return <rect width="64" height="104" fill={`url(#${ids.chrome})`} />;
  if (technique === 'jelly') return <><rect width="64" height="104" fill={`url(#${ids.natural})`} /><rect width="64" height="104" fill={color} opacity=".58" /><path d="M19 30Q16 52 20 73" stroke="#fff" opacity=".52" strokeWidth="4" fill="none" strokeLinecap="round" /></>;
  if (technique === 'glazed') return <><rect width="64" height="104" fill={`url(#${ids.depth})`} /><rect width="64" height="104" fill={`url(#${ids.pearl})`} opacity=".68" /><path d="M20 29Q16 49 20 70" stroke="#fff" opacity=".5" strokeWidth="4" fill="none" strokeLinecap="round" /></>;
  if (technique === 'aurora-holographic') return <><rect width="64" height="104" fill={`url(#${ids.depth})`} /><rect width="64" height="104" fill={`url(#${ids.holo})`} opacity=".58" /><g>{[[21,32],[42,44],[28,61],[38,76]].map(([x,y],i)=><path key={i} d={`M${x-2} ${y}h4M${x} ${y-2}v4`} stroke="#fff" strokeWidth=".9" opacity=".85" />)}</g></>;
  if (technique === 'glitter') return <><rect width="64" height="104" fill={`url(#${ids.depth})`} /><g>{[[19,29,2],[32,25,1],[43,36,2.5],[25,45,1.6],[38,53,1.2],[19,61,2.2],[46,68,1.5],[30,76,2.6],[40,84,1]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r} fill={i%3===0?'#fff6be':i%3===1?'#fff':'#f6bfff'} opacity=".86" />)}</g></>;
  if (technique === 'aura') return <><rect width="64" height="104" fill={dark} /><ellipse cx="32" cy="50" rx="28" ry="38" fill={`url(#${ids.aura})`} /></>;
  if (technique === 'blooming') return <><rect width="64" height="104" fill={mix(color,'#ffffff',.42)} /><g filter={`url(#${ids.blur})`} opacity=".8"><circle cx="24" cy="38" r="16" fill={color}/><circle cx="42" cy="54" r="18" fill={light}/><circle cx="25" cy="72" r="15" fill={dark}/></g></>;
  if (technique === 'marble') return <><rect width="64" height="104" fill={mix(color,'#ffffff',.55)} /><path d="M7 24C26 30 18 42 49 47S37 67 58 80" fill="none" stroke={dark} strokeWidth="5" opacity=".3" filter={`url(#${ids.blur})`} /><path d="M5 23C26 30 17 41 50 47S38 67 59 79" fill="none" stroke={mix(color,'#ffffff',.1)} strokeWidth="1.6" /><path d="M11 67c18-12 25 4 41-8" fill="none" stroke="#fff" strokeWidth="2" opacity=".55" /></>;
  if (technique === 'tortoiseshell') return <><rect width="64" height="104" fill="#d38b3c" opacity=".88" /><g fill="#59301e" opacity=".78">{[[18,31,13],[43,38,16],[26,61,15],[47,75,12],[14,82,10]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r} />)}</g><path d="M18 30Q15 49 19 67" stroke="#fff3c2" opacity=".45" strokeWidth="4" fill="none" strokeLinecap="round" /></>;
  if (technique === 'leopard') return <><rect width="64" height="104" fill={mix(color,'#f4cf85',.55)} /><g fill="none" stroke="#3a2418" strokeWidth="3">{[[20,30,8],[42,42,9],[23,63,8],[43,77,8],[34,89,5]].map(([x,y,r],i)=><circle key={i} cx={x} cy={y} r={r} strokeDasharray="12 6" />)}</g><g fill="#5a3020">{[[26,33],[36,48],[19,71],[47,69],[34,86]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2" />)}</g></>;
  if (technique === 'gel-3d') return <><rect width="64" height="104" fill={`url(#${ids.depth})`} /><g filter={`url(#${ids.relief})`}><path d="M15 68C22 51 20 34 31 29c11 8 7 22 18 31-4 13-13 21-22 19-7-1-11-5-12-11Z" fill={light} opacity=".8" stroke="#fff" strokeOpacity=".55" strokeWidth="1.2" /><path d="M23 63c5-9 3-20 9-25 6 7 4 17 10 23" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" /></g></>;
  if (technique === 'rhinestones') return <><rect width="64" height="104" fill={`url(#${ids.depth})`} /><Gem x={32} y={42} size={7}/><Gem x={25} y={57} color="#ffd9f7" size={4}/><Gem x={39} y={62} color="#fff2ba" size={5}/></>;
  if (technique === 'charms') return <><rect width="64" height="104" fill={`url(#${ids.depth})`} /><g filter={`url(#${ids.relief})`}><circle cx="32" cy="53" r="12" fill={`url(#${ids.gold})`} stroke="#fff3bf" strokeWidth="1"/><path d="m32 44 2.5 6 6.5.5-5 4 1.5 6.5-5.5-3.5-5.5 3.5 1.5-6.5-5-4 6.5-.5Z" fill="#fff1bd"/></g></>;
  if (technique === 'glass-nails') return <><rect width="64" height="104" fill={`url(#${ids.natural})`} /><rect width="64" height="104" fill={color} opacity=".22" /><path d="M16 83V39C16 16 48 16 48 39V83" fill="none" stroke="#fff" strokeWidth="2" opacity=".65" /><path d="M22 30Q17 50 21 68" stroke="#fff" strokeWidth="4" opacity=".45" fill="none" strokeLinecap="round" /></>;
  if (technique === 'stamping') return <><rect width="64" height="104" fill={color} /><g fill="none" stroke={nail.accentColor || light} strokeWidth="1.2" opacity=".9">{[31,47,63,79].map(y=><g key={y}><circle cx="25" cy={y} r="6"/><circle cx="39" cy={y} r="6"/><path d={`M19 ${y}h26`}/></g>)}</g></>;
  return <><rect width="64" height="104" fill={`url(#${ids.depth})`} /><path d="M20 34Q17 46 19 62" stroke="#fff" opacity=".3" strokeWidth="4" fill="none" strokeLinecap="round" /></>;
}

export default function NailPreview({ idea, onSelect, selectedIndex = 0, labels = [], highlightedIndices, compact = false, controls = false }) {
  const id = useId().replace(/:/g, '');
  const rendering = renderingForIdea(idea);
  const [mode, setMode] = useState('illustrated');
  useEffect(() => setMode('illustrated'), [idea.id, idea.key]);
  const shape = normalize(idea.shape);
  const path = shape.includes('stiletto') ? 'M12 83 32 7 52 83Q52 94 32 94T12 83Z'
    : /coffin|ballerine/.test(shape) ? 'M12 82 21 13H43L52 82Q52 94 32 94T12 82Z'
      : shape.includes('amande') ? 'M15 81C13 56 19 25 32 14C45 25 51 56 49 81C48 96 16 96 15 81Z'
        : shape.includes('carre') ? 'M12 82V22Q12 15 19 15H45Q52 15 52 22V82Q52 94 32 94T12 82Z'
          : 'M12 82V38C12 8 52 8 52 38V82Q52 94 32 94T12 82Z';
  const illustratedPreview = <div className={'nailPreview illustratedNails ' + (/courte/.test(normalize(idea.length)) ? 'shortNails ' : '') + (compact ? 'compactNails ' : '') + (onSelect ? 'interactiveNails ' : '')} role={onSelect ? 'group' : 'img'} aria-label={onSelect ? 'Choisir un ongle' : 'Inspiration illustrée : ' + idea.description}>
    {idea.nails.map((nail, index) => {
      const color = nail.color || '#b88699', light = mix(color, '#ffffff', .45), dark = mix(color, '#100711', .18);
      const ids = { clip: id+'clip'+index, depth:id+'depth'+index, halo:id+'halo'+index, velvet:id+'velvet'+index, chrome:id+'chrome'+index, natural:id+'natural'+index, pearl:id+'pearl'+index, holo:id+'holo'+index, aura:id+'aura'+index, gold:id+'gold'+index, blur:id+'blur'+index, relief:id+'relief'+index };
      const nailSvg = <svg key={index} viewBox="0 0 64 104" aria-hidden="true" style={highlightedIndices ? { opacity: highlightedIndices.includes(index) ? 1 : 0.16 } : undefined}>
        <defs>
          <clipPath id={ids.clip}><path d={path} /></clipPath>
          <linearGradient id={ids.depth} x1="0" y1="0" x2="1" y2="1"><stop stopColor={light}/><stop offset=".22" stopColor={color}/><stop offset=".65" stopColor={color}/><stop offset=".9" stopColor={dark}/><stop offset="1" stopColor={mix(color,'#ffffff',.25)}/></linearGradient>
          <radialGradient id={ids.halo}><stop stopColor="#fff" stopOpacity=".78"/><stop offset=".2" stopColor={light} stopOpacity=".65"/><stop offset=".58" stopColor={color} stopOpacity=".2"/><stop offset="1" stopColor={dark} stopOpacity="0"/></radialGradient>
          <radialGradient id={ids.velvet}><stop stopColor="#fff" stopOpacity=".72"/><stop offset=".35" stopColor={light} stopOpacity=".48"/><stop offset="1" stopColor={color} stopOpacity="0"/></radialGradient>
          <linearGradient id={ids.chrome} x1="0" y1="0" x2="1" y2="0"><stop stopColor={dark}/><stop offset=".18" stopColor="#fff"/><stop offset=".36" stopColor={light}/><stop offset=".57" stopColor={dark}/><stop offset=".78" stopColor="#fff"/><stop offset="1" stopColor={color}/></linearGradient>
          <linearGradient id={ids.natural} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f8e9e6"/><stop offset="1" stopColor="#d9b8b5"/></linearGradient>
          <linearGradient id={ids.pearl} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#a9e9ff" stopOpacity=".28"/><stop offset=".35" stopColor="#fff" stopOpacity=".65"/><stop offset=".7" stopColor="#f3b5ff" stopOpacity=".32"/><stop offset="1" stopColor="#fff8c9" stopOpacity=".25"/></linearGradient>
          <linearGradient id={ids.holo} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ff6d8e"/><stop offset=".25" stopColor="#ffe26c"/><stop offset=".5" stopColor="#65e7c5"/><stop offset=".72" stopColor="#67a9ff"/><stop offset="1" stopColor="#e57aff"/></linearGradient>
          <radialGradient id={ids.aura}><stop stopColor={light}/><stop offset=".35" stopColor={color}/><stop offset="1" stopColor={dark}/></radialGradient>
          <linearGradient id={ids.gold}><stop stopColor="#79551d"/><stop offset=".3" stopColor="#fff0a2"/><stop offset=".58" stopColor="#b77a27"/><stop offset="1" stopColor="#fff5bc"/></linearGradient>
          <filter id={ids.blur}><feGaussianBlur stdDeviation="4"/></filter>
          <filter id={ids.relief} x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="1.5" dy="3" stdDeviation="2" floodColor="#25111d" floodOpacity=".55"/></filter>
        </defs>
        <path d={path} fill={mode === 'realistic' ? dark : `url(#${ids.depth})`} stroke={mix(color, '#381728', .42)} strokeOpacity=".38" strokeWidth=".9" />
        <g clipPath={'url(#' + ids.clip + ')'}>
          {mode === 'realistic' ? <MaterialLayer technique={nail.technique || rendering.technique} nail={nail} index={index} ids={ids} /> : <>
            {nail.finish !== 'Mat' && <><path d="M20 31Q16 46 19 64" stroke="#fff" opacity=".52" strokeWidth="4.2" fill="none" strokeLinecap="round" /><path d="M23 27Q20 36 21 43" stroke="#fff" opacity=".75" strokeWidth="1.4" fill="none" strokeLinecap="round" /></>}
            {/paillet|holograph|irise/.test(normalize(nail.finish + nail.effect)) && <g fill="#fff" opacity=".65">{[[27, 30], [43, 47], [22, 70], [38, 77], [32, 55]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.3" />)}</g>}
            {/cat.?eye|magnetique/.test(normalize(nail.finish + nail.effect)) && <path d="M8 80 60 20" stroke="#fff" opacity=".3" strokeWidth="6" />}
          </>}
          {nail.drawing === 'french' && <FrenchTip nail={nail} />}
          {nail.drawing === 'line' && <path d="M31 23Q25 54 35 81" stroke={nail.accentColor} strokeWidth="3" fill="none" />}
          {nail.drawing === 'dots' && <g fill={nail.accentColor}>{[[28, 34], [37, 46], [28, 60], [37, 74]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" />)}</g>}
          {nail.decoration && <Decor {...nail.decoration} />}
        </g>
        {mode === 'realistic' && <path d={path} fill="none" stroke="#fff" strokeOpacity=".26" strokeWidth="1.2" />}
      </svg>;
      return onSelect ? <button key={index} aria-label={'Voir ' + labels[index]} aria-pressed={index === selectedIndex} onClick={() => onSelect(index)}>{nailSvg}<span>{labels[index]}</span></button> : nailSvg;
    })}
  </div>;
  const preview = mode === 'realistic'
    ? <PhotorealNailPreview idea={idea} onSelect={onSelect} selectedIndex={selectedIndex} labels={labels} highlightedIndices={highlightedIndices} compact={compact} />
    : illustratedPreview;
  if (!controls) return preview;
  return <div className="renderPreview">
    <div className="renderPreviewHead"><span><b>{rendering.label}</b><small>{rendering.finish} · relief {rendering.relief}</small></span><div className="illustratedModeBadge" aria-label="Mode illustré validé">Illustration NailMoods</div></div>
    {preview}
  </div>;
}
