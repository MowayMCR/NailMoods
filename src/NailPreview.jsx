import React, { useId } from 'react';
import { normalize } from './creationEngine';
import { renderingForIdea } from './techniqueRendering';
import DrawnNail,{DrawnDecoration} from './renderPrototype/DrawnNail';
import AtelierArt from './design/AtelierArt';
import {drawnNailSettings} from './renderPrototype/ideaDrawing';
import './renderPrototype/ideas.css';
import {ProNailArtwork} from './workspaces/ProNailArtwork';

function Decor({ motif, color }) {
  if(motif==='bat')return <path d="M12 42L24 49L29 41L32 47L35 41L40 49L53 42L49 61L38 58L32 66L26 58L16 61Z" fill={color}/>;
  if(motif==='fangs')return <g fill={color}><path d="M15 43L26 43L21 69Z"/><path d="M38 43L49 43L43 69Z"/></g>;
  if(motif==='blood-drop')return <path d="M32 38C30 47 20 53 24 63C30 75 44 66 40 57Z" fill={color}/>;
  if(motif==='goggles')return <g fill="none" stroke={color} strokeWidth="3"><path d="M8 53H15M49 53H56M29 53H35"/><circle cx="23" cy="53" r="9"/><circle cx="42" cy="53" r="9"/></g>;
  if(motif==='winged-orb')return <g fill={color} stroke={color} strokeWidth="1"><path d="M27 52Q16 39 7 44Q13 52 25 56M37 52Q48 39 57 44Q51 52 39 56"/><circle cx="32" cy="55" r="7"/><path d="M29 51Q32 48 35 51" fill="none" stroke="#fff8df" strokeWidth="1.5"/></g>;
  if(['flower','leaf','heart','star','moon'].includes(motif))return <g transform="scale(.64 .57777778)"><DrawnDecoration motif={motif} color={color} x={50} y={94}/></g>;
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

// The ambience owns the palette. The style is a small, repeatable graphic
// language laid over it, so choosing “Graphique” never forces unrelated
// colours into the pose.
function StyleLayer({ style, index, color }) {
  const accent = mix(color, '#ffffff', .68);
  if (style === 'graphique') return <g fill="none" stroke={accent} strokeWidth="2.1" opacity=".84"><path d={index % 2 ? 'M12 73 51 31M12 49 38 22' : 'M10 30 53 75M30 18 54 43'} /></g>;
  if (['witchy', 'celestial'].includes(style)) return index % 2 === 0 ? <Decor motif={style === 'witchy' ? 'moon' : 'star'} color={accent} /> : null;
  if (['girly', 'coquette', 'romantique'].includes(style)) return index === 2 ? <Decor motif="heart" color={accent} /> : null;
  if (['floral', 'nature', 'cottagecore'].includes(style)) return index === 2 ? <Decor motif={style === 'floral' ? 'flower' : 'leaf'} color={accent} /> : null;
  if (['goth', 'alternative'].includes(style)) return <path d={index % 2 ? 'M9 76 53 25' : 'M10 28 54 78'} stroke="#351d2a" strokeWidth="4" opacity=".72" />;
  if (style === 'y2k') return <g fill={accent} opacity=".82"><circle cx="21" cy="36" r="3"/><circle cx="42" cy="56" r="4"/><circle cx="25" cy="76" r="2.5"/></g>;
  return null;
}

// Kept deliberately graphic: this is the NailMoods illustrated preview, not
// the photo-material renderer. Every selected technique still has a legible
// signature on its own nail.
function IllustratedTechniqueLayer({ technique, nail, ids }) {
  const color = nail.color || '#b88699';
  const accent = nail.accentColor || mix(color, '#ffffff', .55);
  if (!technique) return null;
  if (technique === 'tortoiseshell') return <g fill={accent}>{[[18,28,12],[43,42,15],[24,67,14],[47,81,9]].map(([x,y,r],i)=><g key={i}><ellipse cx={x} cy={y} rx={r+3} ry={r} opacity=".3"/><ellipse cx={x+2} cy={y} rx={r-2} ry={r-3} opacity=".85"/></g>)}</g>;
  if (technique === 'leopard') return <g stroke={accent} strokeWidth="3.2" strokeLinecap="round">{[[20,30,8],[42,42,9],[23,64,8],[43,78,7]].map(([x,y,r],i)=><g key={i} transform={`rotate(${i%2?22:-18} ${x} ${y})`}><ellipse cx={x} cy={y} rx={r} ry={r*.75} fill={accent} fillOpacity=".2" strokeDasharray="12 6 8 5"/></g>)}<path d="M31 49l1 2M16 80l2 1M47 23l1 2"/></g>;
  if (technique === 'crocodile') return <g fill="none" stroke="#503424" strokeWidth="2.2" opacity=".9">{[24,40,56,72].map(y=><path key={y} d={`M5 ${y}Q18 ${y-10} 32 ${y}T59 ${y}`}/>)}</g>;
  if (technique === 'snake') return <g fill="none" stroke="#503424" strokeWidth="2">{[25,43,61,79].map(y=><path key={y} d={`M7 ${y}l12-9 13 9 13-9 12 9`}/>)}</g>;
  if (technique === 'cow') return <g fill="#4b3025" opacity=".88">{[[17,31,9],[43,42,12],[24,67,8],[47,80,9]].map(([x,y,r],i)=><path key={i} d={`M${x-r} ${y}q${r} -${r} ${r*2} 0t-${r/2} ${r*1.4}q-${r*1.6} ${r*.4}-${r*1.5}-${r*1.4}Z`}/>)}</g>;
  if (technique === 'zebra') return <g stroke="#2f2528" strokeWidth="4">{[8,21,35,49,62].map((x,i)=><path key={i} d={`M${x} 20Q${x+9} 48 ${x-2} 88`}/>)}</g>;
  if (technique === 'aura') return <ellipse cx="32" cy="54" rx="25" ry="35" fill={`url(#${ids.decorHalo})`} />;
  if (technique === 'blooming') return <g fill={`url(#${ids.decorHalo})`}><circle cx="23" cy="36" r="17"/><circle cx="42" cy="55" r="19"/><circle cx="24" cy="75" r="16"/></g>;
  if (technique === 'ombre') return <path d="M0 100V46Q32 66 64 22V100Z" fill={accent} opacity=".72"/>;
  if (technique === 'babyboomer') return <path d="M0 18Q32 48 64 18V0H0Z" fill="#fff9f3" opacity=".75"/>;
  if (technique === 'chrome') return <><path d="M13 82Q49 56 50 25" fill="none" stroke="#fff" strokeWidth="5" opacity=".7"/><path d="M17 80Q47 54 48 27" fill="none" stroke="#b9bdc7" strokeWidth="1.5" opacity=".9"/></>;
  if (technique === 'glazed') return <><path d="M13 82Q49 56 50 25" fill="none" stroke="#fff" strokeWidth="5" opacity=".55"/><path d="M17 80Q47 54 48 27" fill="none" stroke="#e6c9ef" strokeWidth="2" opacity=".85"/></>;
  if (technique === 'milky') return <rect width="64" height="104" fill="#fff8f1" opacity=".52"/>;
  if (technique === 'jelly') return <rect width="64" height="104" fill={color} opacity=".38"/>;
  if (technique === 'glass-nails') return <path d="M15 80V36Q17 16 32 16T49 36V80" fill="none" stroke="#fff" strokeWidth="3" opacity=".72"/>;
  if (['velvet-magnetic','cat-eye'].includes(technique)) return <><ellipse cx="32" cy="54" rx="24" ry="37" fill={`url(#${ids.decorHalo})`} opacity=".65"/><path d="M12 82 53 24" stroke="#fff" opacity=".58" strokeWidth="4"/></>;
  if (technique === 'marble') return <g fill="none" stroke={accent} strokeLinecap="round"><path d="M8 28C29 35 19 48 50 56S37 75 57 83" strokeWidth="8" opacity=".2"/><path d="M8 28C29 35 19 48 50 56S37 75 57 83" strokeWidth="2.7"/><path d="M5 60Q20 44 34 51M29 43Q37 35 53 38M37 73Q23 69 14 88" strokeWidth="1.4" opacity=".8"/></g>;
  if (['foil','flakes','glitter'].includes(technique)) return <g fill="#fff1ad">{[[20,31],[40,39],[24,60],[43,74],[33,86]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i%2?2.3:1.5}/>)}</g>;
  if (technique === 'rhinestones') return <g><Gem x={32} y={48} size={7}/><Gem x={24} y={62} size={4} color="#ffd9f7"/></g>;
  if (technique === 'charms') return <Decor motif="star" color="#d0aa58"/>;
  if (technique === 'gel-3d') return <g fill="none" strokeLinecap="round"><path d="M20 67C25 43 37 42 44 63" stroke={accent} strokeWidth="7"/><path d="M19 65C25 43 36 42 43 61" stroke="#fff" strokeWidth="1.5" opacity=".7"/></g>;
  if (technique === 'color-block') return <path d="M0 27 64 8V72L0 92Z" fill={accent} opacity=".72"/>;
  if (technique === 'negative-space') return <path d="M20 29Q32 47 44 29V76Q32 58 20 76Z" fill="#fff8f3" opacity=".8"/>;
  if (technique === 'half-moon') return <path d="M12 21Q32 45 52 21V10H12Z" fill={accent} opacity=".84"/>;
  if (technique === 'ruffian') return <path d="M10 22Q32 38 54 22V32Q32 48 10 32Z" fill={accent} opacity=".84"/>;
  if (technique === 'outline') return <path d="M15 82V38C15 12 49 12 49 38V82" fill="none" stroke={accent} strokeWidth="3"/>;
  if (technique === 'dots') return <g fill={accent}>{[[21,34],[42,45],[25,62],[43,76]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4"/>)}</g>;
  if (technique === 'line') return <path d="M20 78Q42 53 30 24" fill="none" stroke={accent} strokeWidth="3"/>;
  if (technique === 'one-stroke') return <path d="M19 68Q32 32 46 68Q32 78 19 68" fill={accent} opacity=".75"/>;
  return null;
}

function SingleHandPreview({idea,onSelect,selectedIndex=0,labels=[],highlightedIndices,compact=false,controls=false,renderAction}) {
 const id=useId().replace(/:/g,'');
 const rendering=renderingForIdea(idea);
 const preview=<div className={'nailPreview illustratedNails drawnNails '+(compact?'compactNails ':'')+(onSelect?'interactiveNails ':'')} role={onSelect?'group':'img'} aria-label={onSelect?'Choisir un ongle':'Inspiration dessinée : '+(idea.description||idea.title||'')}>
 {!compact&&!idea.options?.aiAssisted&&<span className="drawnPreviewBotanical"><AtelierArt source="botanical"/></span>}
 {idea.nails.map((nail,index)=>{
  const settings=drawnNailSettings(nail.art?{...nail,technique:'gloss',drawingTechnique:null,drawing:null}:nail.decoration?.motif==='winged-orb'&&nail.technique==='gel-3d'?{...nail,technique:'',drawingTechnique:null}:nail,idea),opacity=highlightedIndices?{opacity:highlightedIndices.includes(index)?1:.16}:undefined;
  const ids={decorHalo:id+'decorHalo'+index};
  const svg=nail.proDesign?<svg key={index} viewBox="0 0 64 104" aria-hidden="true" style={opacity}><g transform="scale(.64 .57777778)"><ProNailArtwork nail={nail.proDesign} shape={idea.shape} length={idea.length}/></g></svg>:
   <DrawnNail key={index} {...settings} style={opacity} seed={index} ariaHidden>
    <defs><radialGradient id={ids.decorHalo}><stop stopColor={settings.accent}/><stop offset="1" stopColor={settings.accent} stopOpacity="0"/></radialGradient></defs>
    <g transform="scale(1.5625 1.73076923)">
     {nail.art?.techniques.filter(t=>!['line','dots','one-stroke','gel-3d','charms','stamping'].includes(t)).map(t=><IllustratedTechniqueLayer key={t} technique={t} nail={nail} ids={ids}/>)}
     {settings.legacyTechnique&&<IllustratedTechniqueLayer technique={settings.legacyTechnique} nail={nail} ids={ids}/>}
     <StyleLayer style={nail.art?null:nail.visualStyle} index={index} color={settings.base}/>
     {nail.drawing==='line'&&nail.technique!=='line'&&<path d="M31 23Q25 54 35 81" stroke={settings.accent} strokeWidth="1.5" fill="none"/>}
     {nail.drawing==='dots'&&nail.technique!=='dots'&&<g fill={settings.accent}>{[[28,34],[37,46],[28,60],[37,74]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="2"/>)}</g>}
     {!nail.art&&nail.decoration&&<Decor {...nail.decoration} color={nail.decoration.color||settings.accent}/>}
     {nail.art?.motifs?.map((m,j)=>{const name=String(m.name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),motif=/chauve|bat/.test(name)?'bat':/croc|fang/.test(name)?'fangs':/sang|blood/.test(name)?'blood-drop':/lunette|goggle/.test(name)?'goggles':/fleur|flower|rose/.test(name)?'flower':/lune|moon/.test(name)?'moon':null;return <g key={j} transform={`translate(${m.x*.64} ${m.y*1.04}) scale(${m.size/45}) translate(-32 -54)`}>{motif?<Decor motif={motif} color={m.colors?.find(c=>c!==settings.base)||settings.accent}/>:<rect x="22" y="44" width="20" height="20" rx="4" stroke={settings.accent} fill="none" strokeDasharray="2 2"><title>{m.name}</title></rect>}</g>;})}

    </g>
   </DrawnNail>;
  return onSelect?<button key={index} type="button" aria-label={'Voir '+(labels[index]||'l’ongle '+(index+1))} aria-pressed={index===selectedIndex} onClick={()=>onSelect(index)}>{svg}<span>{labels[index]}</span></button>:svg;
 })}
 </div>;
 if(!controls)return preview;
 return <div className="renderPreview"><div className="renderPreviewHead"><span><b>{idea.options?.proDrawing?'Dessin · '+idea.proCreation.title:rendering.label}</b><small>{idea.options?.proDrawing?'Composition personnalisée':rendering.finish} · relief {rendering.relief}</small></span><div className="nmIdeaRenderModes"><span className="illustratedModeBadge" aria-label="Mode dessin validé">Dessin NailMoods</span>{renderAction}</div></div>{preview}</div>;
}

export default function NailPreview(props){
 if(!props.idea.secondHand)return <SingleHandPreview {...props}/>;
 const {idea,onSelect,selectedIndex=0,labels=[]}=props;
 return <div className="nmTwoHands">{['Main gauche','Main droite'].map((hand,i)=><section className="nmHandPreview" key={hand}><small>{hand}</small><SingleHandPreview {...props} renderAction={i?null:props.renderAction} idea={{...idea,secondHand:undefined,nails:i?idea.secondHand.nails:idea.nails}} onSelect={onSelect?index=>onSelect(index+i*5):undefined} selectedIndex={selectedIndex-i*5} labels={labels}/></section>)}</div>;
}
