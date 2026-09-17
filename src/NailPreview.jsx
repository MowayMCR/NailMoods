import React, { useId } from 'react';
import { normalize } from './creationEngine';

function Decor({ motif, color }) {
  if (motif === 'star') return <path d="m32 42 3 8 9 1-7 6 2 9-7-5-8 5 3-9-7-6 9-1Z" fill={color} />;
  if (motif === 'moon') return <path d="M38 44c-15-5-24 17-7 21 5 1 10-2 12-6-14 4-20-12-5-15Z" fill={color} />;
  if (motif === 'heart') return <path d="M32 64C8 48 25 38 32 48c8-10 24 0 0 16Z" fill={color} />;
  if (motif === 'leaf') return <g><path d="M22 67C13 47 24 35 44 34C47 54 36 65 22 67Z" fill={color} /><path d="m22 67 18-28m-13 22-4-11m9 4 10-4" fill="none" stroke="#63432c" strokeWidth="1.4" opacity=".7" /></g>;
  if (motif === 'stripe') return <g stroke={color} strokeWidth="2.2"><path d="m8 52 48-15M8 58l48-15" /></g>;
  if (motif === 'gem') return <g fill={color} stroke="#fff" strokeWidth=".7"><path d="m32 38 8 12-8 12-8-12Z" /><path d="m32 42 4 8-4 8-4-8Z" fill="#fff" opacity=".4" /></g>;
  if (motif === 'flower') return <g fill={color}>{[0, 72, 144, 216, 288].map(angle => <ellipse key={angle} cx="32" cy="46" rx="4" ry="7" transform={'rotate(' + angle + ' 32 54)'} />)}<circle cx="32" cy="54" r="3" fill="#fff8e8" /></g>;
  return <rect x="26" y="47" width="12" height="14" rx="3" fill={color} transform="rotate(-15 32 54)" />;
}

export default function NailPreview({ idea, onSelect, selectedIndex = 0, labels = [], highlightedIndices, compact = false }) {
  const id = useId().replace(/:/g, '');
  const shape = normalize(idea.shape);
  const path = shape.includes('stiletto') ? 'M12 83 32 7 52 83Q52 94 32 94T12 83Z'
    : /coffin|ballerine/.test(shape) ? 'M12 82 21 13H43L52 82Q52 94 32 94T12 82Z'
      : shape.includes('amande') ? 'M12 82V59C12 38 22 16 32 7C42 16 52 38 52 59V82Q52 94 32 94T12 82Z'
        : shape.includes('carre') ? 'M12 82V22Q12 15 19 15H45Q52 15 52 22V82Q52 94 32 94T12 82Z'
          : 'M12 82V38C12 8 52 8 52 38V82Q52 94 32 94T12 82Z';
  return <div className={'nailPreview ' + (/courte/.test(normalize(idea.length)) ? 'shortNails ' : '') + (compact ? 'compactNails ' : '') + (onSelect ? 'interactiveNails' : '')} role={onSelect ? 'group' : 'img'} aria-label={onSelect ? 'Choisir un ongle' : 'Aperçu schématique : ' + idea.description}>
    {idea.nails.map((nail, index) => {
      const nailSvg = <svg key={index} viewBox="0 0 64 104" aria-hidden="true" style={highlightedIndices ? { opacity: highlightedIndices.includes(index) ? 1 : 0.16 } : undefined}>
      <defs><clipPath id={id + index}><path d={path} /></clipPath></defs>
      <path d={path} fill={nail.color} stroke="#624d601a" />
      <g clipPath={'url(#' + id + index + ')'}>
        {nail.finish !== 'Mat' && <path d="M20 34Q17 46 19 62" stroke="#fff" opacity=".2" strokeWidth="4" fill="none" strokeLinecap="round" />}
        {/paillet|holograph|irise/.test(normalize(nail.finish + nail.effect)) && <g fill="#fff" opacity=".65">{[[27, 30], [43, 47], [22, 70], [38, 77], [32, 55]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="1.3" />)}</g>}
        {/cat.?eye|magnetique/.test(normalize(nail.finish + nail.effect)) && <path d="M8 80 60 20" stroke="#fff" opacity=".3" strokeWidth="6" />}
        {nail.drawing === 'french' && <path d="M0 0H64V26Q32 40 0 26Z" fill={nail.accentColor} />}
        {nail.drawing === 'line' && <path d="M31 23Q25 54 35 81" stroke={nail.accentColor} strokeWidth="3" fill="none" />}
        {nail.drawing === 'dots' && <g fill={nail.accentColor}>{[[28, 34], [37, 46], [28, 60], [37, 74]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" />)}</g>}
        {nail.decoration && <Decor {...nail.decoration} />}
      </g>
    </svg>;
      return onSelect ? <button key={index} aria-label={'Voir ' + labels[index]} aria-pressed={index === selectedIndex} onClick={() => onSelect(index)}>{nailSvg}<span>{labels[index]}</span></button> : nailSvg;
    })}
  </div>;
}
