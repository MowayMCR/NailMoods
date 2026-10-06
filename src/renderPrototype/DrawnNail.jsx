import React,{useId} from 'react';
import {nailPath,frenchPath,tint,randomPoints,techniques} from './material';

const ink='#73354e',cream='#fff6eb';
function Star({x,y,r=3,color=cream}){return <path d={`M${x} ${y-r} Q${x+.3} ${y-.3} ${x+r} ${y} Q${x+.3} ${y+.3} ${x} ${y+r} Q${x-.3} ${y+.3} ${x-r} ${y} Q${x-.3} ${y-.3} ${x} ${y-r}`} fill={color}/>;}
function Petal({color,angle=0,raised=false}){return <g transform={`rotate(${angle})`}><path d="M0 1 C-12 -4 -16 -19 -8 -22 C2 -24 4 -8 0 1Z" fill={color} stroke={ink} strokeOpacity={raised?.35:.22} strokeWidth=".6"/><path d="M-1 -1 Q-5 -10 -7 -18" fill="none" stroke={cream} strokeOpacity=".65" strokeWidth="1.5" strokeLinecap="round"/></g>;}
function Flower({x,y,r=1,color,raised=false}){return <g transform={`translate(${x} ${y}) scale(${r})`}>{raised&&<ellipse cx="2" cy="4" rx="22" ry="10" fill={ink} opacity=".12"/>}{[0,72,144,216,288].map(a=><Petal key={a} color={color} angle={a} raised={raised}/>)}<circle r="3" fill={raised?'#d1a364':ink} opacity=".85"/><circle cx="-.8" cy="-1" r="1" fill={cream}/></g>;}
function Branch({x=46,y=146,color,mirror=false}){return <g transform={`translate(${x} ${y}) scale(${mirror?-1:1} 1)`} stroke={color} strokeLinecap="round" strokeLinejoin="round"><path d="M0 0 C-8 -27 7 -52 -8 -93" strokeWidth="1.3" fill="none"/>{[-12,-30,-48,-66,-82].map((v,i)=>{const side=i%2===0?-1:1;return <g key={v}><path d={`M${i%2?0:-2} ${v} C${side*17} ${v-1} ${side*21} ${v-14} ${side*16} ${v-15} C${side*5} ${v-18} ${side*2} ${v-4} ${i%2?0:-2} ${v}Z`} fill={color} fillOpacity=".66" strokeWidth=".6"/><path d={`M0 ${v} Q${side*6} ${v-5} ${side*15} ${v-13}`} fill="none" strokeWidth=".55" stroke={cream} opacity=".55"/></g>;})}<path d="M-8 -93 Q-16 -106 -9 -111 Q0 -105 -8 -93Z" fill={color} fillOpacity=".8" strokeWidth=".55"/></g>;}
function Heart({x,y,r,color}){return <path transform={`translate(${x} ${y}) scale(${r}) rotate(-12)`} d="M0 7 C-18 -6 -7 -17 0 -9 C8 -18 18 -6 0 7Z" fill={color} stroke={ink} strokeOpacity=".3" strokeWidth=".7"/>;}
function Motif({technique,base,accent,id,seed,light,shape,withGlassMotif=true}){
 const points=randomPoints(170,seed),pale=tint(accent,cream,.48),deep=tint(base,ink,.58);
 if(technique.includes('french'))return <g><path d={frenchPath(technique)} fill={accent} fillOpacity=".9" stroke={tint(accent,ink,.2)} strokeWidth=".6"/>{technique==='double-french'&&<path d="M0 64 Q50 38 100 64" fill="none" stroke={accent} strokeWidth="3"/>}</g>;
 if(technique==='ombre')return <rect width="100" height="180" fill={`url(#${id}-ombre)`}/>;
 if(technique==='aura')return <ellipse cx="51" cy="90" rx="34" ry="61" fill={`url(#${id}-aura)`}/>;
 if(technique==='blooming')return <g>{[[31,45,1],[68,74,.8],[39,113,.95],[69,143,.6]].map(([x,y,s],i)=><g key={i} transform={`translate(${x} ${y}) scale(${s})`}><path d="M-5 -20 C3 -29 14 -19 13 -13 C25 -19 27 -3 18 4 C25 14 12 21 5 16 C-4 26 -18 18 -16 9 C-28 5 -22 -12 -13 -10 C-20 -21 -11 -26 -5 -20Z" fill={accent} opacity=".22" filter={`url(#${id}-bleed)`}/><path d="M-9 -14 C-1 -22 11 -13 8 -7 C22 -11 17 5 8 6 C10 19 -8 18 -9 6 C-22 5 -16 -9 -9 -14Z" fill={accent} opacity=".18" filter={`url(#${id}-water)`}/></g>)}</g>;
 if(technique==='half-moon')return <path d="M13 164 Q50 117 87 164 L87 180 H13Z" fill={accent} opacity=".85"/>;
 if(technique==='ruffian')return <path d="M7 140 Q50 180 93 140 V151 Q50 189 7 151Z" fill={accent} opacity=".85"/>;
 if(technique==='outline')return <path d={nailPath(shape)} transform="translate(4 6) scale(.92 .94)" fill="none" stroke={accent} strokeWidth="2"/>;
 if(technique==='color-block')return <path d="M0 55 L100 17 V122 L0 158Z" fill={accent} opacity=".75"/>;
 if(technique==='negative-space')return <path d="M34 42 Q50 64 66 42 V135 Q50 113 34 135Z" fill={cream} opacity=".8"/>;
 if(technique==='one-stroke')return <Flower x={50} y={97} r={.85} color={accent}/>;
 if(technique==='charms')return <g transform="translate(50 85)"><ellipse cx="2" cy="5" rx="17" ry="15" fill={ink} opacity=".15"/><path d="M0 -20 L5 -6 L20 -5 L9 5 L12 21 L0 13 L-13 21 L-9 5 L-20 -5 L-5 -6Z" fill={accent} stroke={ink} strokeWidth=".8"/><path d="M0 -17 L0 10 L-10 17 M-16 -5 L0 10 L16 -5" fill="none" stroke={cream} strokeWidth="1" opacity=".7"/></g>;
 if(technique==='stamping')return <g fill="none" stroke={accent} strokeWidth=".95">{[37,65,93,121,149].map(y=><g key={y}><path d={`M25 ${y} Q37 ${y-19} 50 ${y} Q63 ${y-19} 75 ${y} Q63 ${y+19} 50 ${y} Q37 ${y+19} 25 ${y}Z`}/><circle cx="50" cy={y} r="2" fill={accent}/></g>)}</g>;
 if(technique==='aurora-holographic')return <g opacity=".5" filter={`url(#${id}-bleed)`}><path d="M18 0 Q60 70 30 180 H55 Q84 65 45 0Z" fill="#b8dfe0"/><path d="M50 0 Q23 94 62 180 H85 Q50 81 76 0Z" fill="#e9bde9"/><path d="M0 56 Q48 71 100 113" stroke="#f3dab0" strokeWidth="15" fill="none"/></g>;
 if(technique==='cow')return <g fill={accent} opacity=".85">{randomPoints(12,seed).map((p,i)=><path key={i} transform={`translate(${p.x} ${p.y}) scale(${.6+p.r*.25})`} d="M-9 -3 C-8 -18 12 -14 12 -3 C18 6 8 15 -3 12 C-15 14 -16 4 -9 -3Z"/>)}</g>;
 if(technique==='zebra')return <g stroke={accent} fill="none" strokeLinecap="round">{[17,30,43,56,70,81].map((x,i)=><path key={x} d={`M${x} 9 Q${x+(i%2?15:-12)} 77 ${x-2} 175`} strokeWidth={i%2?3:5}/>)}</g>;
 if(technique==='crocodile'||technique==='snake')return <g fill="none" stroke={accent} strokeWidth="1.5" opacity=".85">{[29,53,77,101,125,149].map(y=><path key={y} d={technique==='snake'?`M8 ${y} L29 ${y-13} L50 ${y} L71 ${y-13} L92 ${y}`:`M8 ${y} Q28 ${y-15} 50 ${y} T92 ${y} M29 ${y-6} V${y+15} M71 ${y-6} V${y+15}`}/>)}</g>;
 if(technique==='line-simple')return <path d="M43 29 Q32 88 54 148" fill="none" stroke={accent} strokeWidth="1.8" strokeLinecap="round"/>;
 if(technique==='line')return <g><Branch color={accent} mirror={seed%2===0}/>{[0,1,2].map(i=><Flower key={i} x={seed%2?58:29} y={45+i*43} r={.23} color={pale}/>)}</g>;
 if(technique==='flowers')return <g>{[[42,49,.55],[60,107,.47],[36,144,.3]].map(([x,y,r],i)=><Flower key={i} x={x} y={y} r={r} color={accent}/>)}<path d="M34 142 Q47 97 43 47 M47 99 Q61 99 61 105" stroke={accent} strokeWidth=".85" fill="none"/></g>;
 if(technique==='hearts')return <g>{[[40,43,.72],[62,91,.57],[43,142,.65]].map(([x,y,r],i)=><Heart key={i} x={x} y={y} r={r} color={accent}/>)}<Heart x={62} y={122} r={.25} color={pale}/></g>;
 if(technique==='bow')return <g fill="none" stroke={accent} strokeWidth="1.7" strokeLinecap="round"><path d="M48 83 C15 77 19 51 35 61 C43 66 48 80 48 83 C60 62 79 63 76 76 C72 87 54 87 48 83 M47 85 Q46 101 36 125 M50 85 Q52 104 66 116"/><circle cx="49" cy="84" r="2.5" fill={accent}/></g>;
 if(technique==='dots')return <g>{randomPoints(20,seed).map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={p.r+1} fill={accent} opacity=".78"/>)}</g>;
 if(technique==='marble')return <g fill="none" strokeLinecap="round">{[0,1,2,3].map(i=><g key={i}><path d={`M${5+i*23} 0 C${80-i*12} 33 ${-12+i*20} 63 ${26+i*19} 91 S${81-i*11} 152 ${13+i*26} 186`} stroke={accent} strokeWidth="4" opacity=".18" filter={`url(#${id}-bleed)`}/><path d={`M${5+i*23} 0 C${80-i*12} 33 ${-12+i*20} 63 ${26+i*19} 91 S${81-i*11} 152 ${13+i*26} 186`} stroke={accent} strokeWidth=".9" opacity=".65"/></g>)}</g>;
 if(technique==='tortoise')return <g><rect width="100" height="180" fill={tint(accent,'#f5b766',.38)} opacity=".7"/>{randomPoints(18,seed).map((p,i)=><path key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.a*40}) scale(${.45+p.r*.32})`} d="M-11 -5 Q-3 -20 9 -12 Q22 -3 10 8 Q1 20 -12 7Z" fill={i%3===0?deep:base} opacity={i%3===0?.75:.48} filter={`url(#${id}-water)`}/>)}</g>;
 if(technique==='leopard')return <g>{randomPoints(16,seed).map((p,i)=><g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.a*30})`}><path d="M-5 2 Q-8 -6 -2 -7 M1 -7 Q9 -8 6 1 M5 5 Q1 10 -4 6" fill="none" stroke={accent} strokeWidth="2.7" strokeLinecap="round"/><ellipse cx="0" cy="0" rx="3" ry="4" fill={accent} opacity=".22"/></g>)}</g>;
 if(['cat-eye','velvet','glitter'].includes(technique))return <g>{technique==='cat-eye'&&<g transform={`rotate(${-22-light*12} 50 90)`}><rect x="30" y="-40" width="21" height="260" fill={`url(#${id}-beam)`} filter={`url(#${id}-bleed)`}/><path d="M39 17 Q43 84 37 165" stroke={pale} opacity=".28" strokeWidth="2" fill="none"/></g>}{points.slice(0,technique==='glitter'?140:technique==='velvet'?170:85).map((p,i)=><g key={i}>{technique==='glitter'?<path transform={`translate(${p.x} ${p.y}) rotate(${p.a*40})`} d={`M${-p.r} 0 L0 ${-p.r*1.5} L${p.r} 0 L0 ${p.r*1.5}Z`} fill={i%3===0?accent:pale} opacity=".8"/>:<circle cx={p.x} cy={p.y} r={p.r*(technique==='velvet'?.35:.45)} fill={pale} opacity=".7"/>}{i%(technique==='glitter'?28:technique==='velvet'?100:24)===0&&<Star x={p.x} y={p.y} r={technique==='velvet'?1.5:3} color={pale}/>}</g>)}</g>;
 if(technique==='chrome')return <g><rect width="100" height="180" fill={`url(#${id}-metal)`} opacity=".86"/><path d="M34 11 C12 55 34 113 24 164 M65 19 C50 63 76 126 61 166" fill="none" stroke={cream} strokeWidth="3" opacity=".47" strokeLinecap="round"/></g>;
 if(technique==='glazed')return <g><path d="M27 0 Q65 46 29 120 L55 190 H88 Q56 111 81 8Z" fill={`url(#${id}-pearl)`} opacity=".45" filter={`url(#${id}-bleed)`}/>{points.slice(0,13).map((p,i)=><circle key={i} cx={p.x} cy={p.y} r={p.r*.55} fill={pale} opacity=".65"/>)}</g>;
 if(technique==='jelly'||technique==='glass')return <g><path d="M12 144 Q52 117 89 146 L93 179 H8Z" fill={accent} opacity={technique==='glass'?.1:.17}/>{technique==='glass'&&withGlassMotif&&<g opacity=".28"><Branch color={accent} x={55} y={157}/></g>}<path d="M20 44 Q12 119 30 151 M77 38 Q87 108 77 137" fill="none" stroke={tint(base,cream,.7)} strokeWidth="2.5" opacity=".85" strokeLinecap="round"/></g>;
 if(technique==='foil'||technique==='flakes')return <g>{randomPoints(15,seed).map((p,i)=><g key={i} transform={`translate(${p.x} ${p.y}) rotate(${p.a*50}) scale(${.55+p.r*.36})`}><path d={technique==='foil'?'M-8 -12 L2 -10 L7 -4 L3 2 L8 7 L-2 13 L-7 5 L-5 1 L-9 -4Z':'M-7 -9 L2 -6 L6 2 L1 9 L-4 6 L-3 1 L-8 -3Z'} fill={technique==='foil'?accent:`url(#${id}-pearl)`} stroke={tint(accent,ink,.18)} strokeWidth=".45"/><path d="M-5 -6 L3 0 L-3 7 M-4 1 L1 4 M0 -7 L3 -2" fill="none" stroke={cream} opacity=".7" strokeWidth=".7"/></g>)}</g>;
 if(technique==='strass')return <g>{[[49,38,8],[41,62,4],[58,78,6],[46,105,4],[59,129,3]].map(([x,y,r],i)=><g key={i} transform={`translate(${x} ${y})`}><ellipse cx="1" cy="3" rx={r} ry={r*.8} fill={ink} opacity=".17"/><path d={`M0 ${-r} L${r*.75} ${-r*.4} L${r*.75} ${r*.4} L0 ${r} L${-r*.75} ${r*.4} L${-r*.75} ${-r*.4}Z`} fill={tint(accent,cream,.5)} stroke={ink} strokeWidth=".65"/><path d={`M0 ${-r} L${r*.35} 0 L0 ${r} L${-r*.35} 0Z`} fill={cream} opacity=".8"/><path d={`M${-r*.75} ${-r*.4} L${r*.35} 0 L${-r*.75} ${r*.4} M${r*.75} ${-r*.4} L${-r*.35} 0 L${r*.75} ${r*.4}`} fill="none" stroke={ink} opacity=".45" strokeWidth=".5"/></g>)}</g>;
 if(technique==='gel-3d')return <Flower x={51} y={92} r={1.08} color={tint(accent,cream,.25)} raised/>;
 return null;
}
// Existing decorations retain their motif and placement, using the same drawn vocabulary.
export function DrawnDecoration({motif,color,x=50,y=91}){
 if(motif==='flower')return <Flower x={x} y={y} r={.65} color={color}/>;
 if(motif==='leaf')return <g transform={`translate(${x-46} ${y-98}) scale(.8)`}><Branch color={color} x={46} y={143}/></g>;
 if(motif==='heart')return <Heart x={x} y={y} r={1} color={color}/>;
 if(motif==='star')return <g transform={`translate(${x} ${y})`}><path d="M0 -17 L5 -6 L17 -5 L8 4 L11 17 L0 10 L-12 17 L-8 4 L-17 -5 L-5 -6Z" fill={color} stroke={tint(color,ink,.3)} strokeWidth=".6"/><path d="M0 -15 L0 9 L-10 15 M-14 -5 L0 9 L14 -5" stroke={cream} strokeWidth=".8" opacity=".4" fill="none"/></g>;
 if(motif==='moon')return <path transform={`translate(${x} ${y})`} d="M7 -18 C-17 -24 -30 19 -3 22 Q11 24 18 11 C-8 22 -15 -11 7 -18Z" fill={color} stroke={tint(color,ink,.3)} strokeWidth=".6"/>;
 return null;
}
export default function DrawnNail({base,accent,shape='Amande',length='Moyenne',technique='gloss',light=0,seed=0,label,children,frenchVariant,tipTechnique,matte=false,style,ariaHidden=false,withGlassMotif=true}){
 const id='nm-draw-'+useId().replace(/[^a-zA-Z0-9-]/g,''),path=nailPath(shape),deep=tint(base,ink,.36),pale=tint(base,cream,.62);
 const transparent=['jelly','glass'].includes(technique),body=technique==='milky'?tint(base,cream,.56):transparent?tint(base,cream,technique==='glass'?.77:.43):base;
 const sy=length==='Courte'?.83:length==='Longue'?1.08:1,ty=180-173*sy,reflect=light*6;
 return <svg viewBox="0 0 100 190" role="img" aria-label={label||`${shape} · ${techniques.find(([k])=>k===technique)?.[1]||technique}`} data-technique={technique} data-base={base} data-accent={accent} className="rpDrawnNail" style={style} aria-hidden={ariaHidden||undefined}>
 <defs>
  <clipPath id={id+'-clip'}><path d={path}/></clipPath>
  {frenchVariant&&<clipPath id={id+'-tip'}><path d={frenchPath(frenchVariant)}/></clipPath>}
  <linearGradient id={id+'-wash'} x1="0" x2="1" y1=".1" y2=".75"><stop stopColor={pale}/><stop offset=".27" stopColor={body}/><stop offset=".73" stopColor={body}/><stop offset="1" stopColor={deep} stopOpacity={transparent?.32:.8}/></linearGradient>
  <linearGradient id={id+'-ombre'} x1="0" x2="0" y1="0" y2="1"><stop stopColor={accent}/><stop offset=".8" stopColor={accent} stopOpacity="0"/></linearGradient>
  <radialGradient id={id+'-aura'}><stop stopColor={accent} stopOpacity=".9"/><stop offset=".55" stopColor={accent} stopOpacity=".45"/><stop offset="1" stopColor={accent} stopOpacity="0"/></radialGradient>
  <linearGradient id={id+'-beam'}><stop stopColor={accent} stopOpacity="0"/><stop offset=".45" stopColor={tint(accent,cream,.55)} stopOpacity=".9"/><stop offset=".6" stopColor={accent} stopOpacity=".6"/><stop offset="1" stopColor={accent} stopOpacity="0"/></linearGradient>
  <linearGradient id={id+'-metal'} x1="0" x2="1" y1=".2" y2=".7"><stop stopColor={deep}/><stop offset=".25" stopColor={pale}/><stop offset=".38" stopColor={cream}/><stop offset=".6" stopColor={body}/><stop offset=".78" stopColor={pale}/><stop offset="1" stopColor={deep}/></linearGradient>
  <linearGradient id={id+'-pearl'} x1="0" x2="1" y1="0" y2="1"><stop stopColor={tint(accent,'#c4bddf',.35)}/><stop offset=".4" stopColor={cream}/><stop offset=".65" stopColor={tint(base,'#ebc5d8',.4)}/><stop offset="1" stopColor={tint(accent,'#c1d8d3',.4)}/></linearGradient>
  <filter id={id+'-water'} x="-15%" y="-15%" width="130%" height="130%"><feTurbulence type="fractalNoise" baseFrequency=".065" numOctaves="2" seed={seed+8} result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id={id+'-bleed'}><feGaussianBlur stdDeviation="2"/></filter>
  <filter id={id+'-grain'}><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="2" seed="12" result="n"/><feColorMatrix in="n" type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".15"/></feComponentTransfer><feComposite in2="SourceGraphic" operator="in"/></filter>
 </defs>
 <g transform={`translate(0 ${ty}) scale(1 ${sy})`}>
  <path d={path} fill={body} opacity={transparent?.5:1}/>
  <g clipPath={`url(#${id}-clip)`}>
   <path d={path} fill={`url(#${id}-wash)`} opacity={transparent?.65:1}/>
   <g opacity=".18" stroke={cream} strokeLinecap="round" fill="none" filter={`url(#${id}-water)`}><path d="M31 13 C18 48 22 125 37 162" strokeWidth="13"/><path d="M55 24 Q67 85 60 154" strokeWidth="7"/></g>
   <Motif technique={technique} base={base} accent={accent} id={id} seed={seed} light={light} shape={shape} withGlassMotif={withGlassMotif}/>
   {frenchVariant&&<g clipPath={`url(#${id}-tip)`}><Motif technique={frenchVariant} base={base} accent={accent} id={id} seed={seed} light={light} shape={shape} withGlassMotif={withGlassMotif}/>{tipTechnique&&<Motif technique={tipTechnique} base={accent} accent={base} id={id} seed={seed} light={light} shape={shape} withGlassMotif={withGlassMotif}/>}</g>}
   {children}
   <path d={path} fill={deep} opacity=".12" filter={`url(#${id}-grain)`}/>
   {!matte&&<g transform={`translate(${reflect} 0)`} fill={cream} opacity={technique==='velvet'?.37:.76}>
    <path d="M30 31 C23 47 24 69 25 84 C26 86 28 83 28 78 C27 55 32 40 33 34 Q33 29 30 31Z"/>
    <path d="M27 92 Q25 116 32 133 Q36 139 34 129 Q29 108 30 96 Q30 89 27 92Z" opacity=".55"/>
    <path d="M70 31 Q79 51 77 76 Q76 80 74 75 Q76 49 68 34Z" opacity=".2"/>
    <path d="M33 155 Q45 163 58 157 Q60 156 58 161 Q44 169 33 159Z" opacity=".38"/>
   </g>}
  </g>
  <path d={path} fill="none" stroke={tint(base,ink,.65)} strokeWidth="1.05" strokeLinejoin="round"/>
  <path d={path} fill="none" stroke={pale} strokeWidth=".75" transform="translate(2 0) scale(.96 1)" opacity=".55"/>
  <path d="M18 80 Q15 116 18 137 Q20 151 32 160 M82 93 Q87 143 71 159" fill="none" stroke={ink} strokeWidth=".45" opacity=".35" strokeLinecap="round"/>
 </g>
 </svg>;
}
