import React, { useId } from 'react';

// The same fingertip and cuticle baseline make lengths directly comparable.
export default function ProfileNail({ variant }) {
  const id = useId().replace(/:/g, '');
  const tops = { 'len-xs': 62, 'len-s': 52, 'len-m': 38, 'len-l': 23, 'len-xl': 9 };
  const top = tops[variant] ?? 24;
  const paths = {
    almond: 'M31 98C29 76 31 44 50 18C69 44 71 76 69 98C67 113 33 113 31 98Z',
    square: 'M30 98L30 29Q30 25 35 25H65Q70 25 70 29L70 98C68 113 32 113 30 98Z',
    oval: 'M30 97V53C30 12 70 12 70 53V97C68 113 32 113 30 97Z',
    round: 'M30 98V70C30 38 70 38 70 70V98C68 113 32 113 30 98Z',
    coffin: 'M30 98L35 24Q35 21 39 21H61Q65 21 65 24L70 98C68 113 32 113 30 98Z',
    stiletto: 'M30 98C29 76 43 27 50 9C57 27 71 76 70 98C68 113 32 113 30 98Z',
  };
  const path = paths[variant] || `M30 98V${top + 22}C30 ${top-5} 70 ${top-5} 70 ${top+22}V98C68 113 32 113 30 98Z`;
  return <svg className="profileNailArt" viewBox="0 0 100 140" aria-hidden="true">
    <defs>
      <linearGradient id={id+'skin'} x1="0" x2="1"><stop stopColor="#eec1b3"/><stop offset=".45" stopColor="#ffe6da"/><stop offset="1" stopColor="#e5ad9e"/></linearGradient>
      <linearGradient id={id+'pink'} x1="0" x2="1"><stop stopColor="#cd8098"/><stop offset=".22" stopColor="#efb2c1"/><stop offset=".48" stopColor="#f8cbd3"/><stop offset=".76" stopColor="#eaa6b8"/><stop offset="1" stopColor="#c77791"/></linearGradient>
      <linearGradient id={id+'fade'} x1="0" y1="0" x2="0" y2="1"><stop offset=".65" stopColor="white"/><stop offset="1" stopColor="black"/></linearGradient>
      <mask id={id+'mask'}><rect width="100" height="140" fill={'url(#'+id+'fade)'}/></mask>
      <clipPath id={id+'clip'}><path d={path}/></clipPath>
    </defs>
    <path d="M20 140V77C20 34 80 34 80 77V140Z" fill={'url(#'+id+'skin)'} mask={'url(#'+id+'mask)'}/>
    <path d={path} fill={'url(#'+id+'pink)'} stroke="#b9768a" strokeWidth=".65"/>
    <g clipPath={'url(#'+id+'clip)'}><path d="M40 21C35 41 35 72 36 92" fill="none" stroke="white" strokeOpacity=".55" strokeWidth="3" strokeLinecap="round"/><path d="M64 61Q68 87 63 99" fill="none" stroke="#fff0f3" strokeOpacity=".45" strokeWidth="1"/></g>
    <path d="M32 103Q50 116 68 103" fill="none" stroke="#fff3ec" strokeWidth="1.4"/>
  </svg>;
}
