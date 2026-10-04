import React from 'react';
import {Clock3, Sparkles, Ruler, Layers, Heart, ArrowUpRight} from 'lucide-react';
import MoodGlyph from '../MoodGlyph';
import ProfileNail from '../ProfileNail';
import {preferenceFields} from './onboarding';
import {choices} from '../profileOptions';

export function UniverseTiles({values=[]}) {
 return <div className="nmUniverseTiles">{values.map(v=><span className="nmUniverseTile" key={v}><MoodGlyph value={v}/><span>{v}</span></span>)}</div>;
}
export function PreferenceTiles({profile,onlyPresent=false}) {
 const icons={length:Ruler,level:Sparkles,duration:Clock3,technique:Layers};
 return <dl className="nmPreferenceSummary nmPreferenceTiles">{preferenceFields.filter(([k])=>!onlyPresent||profile[k]).map(([k,label])=>{const Icon=icons[k];const shape=choices.shape.values.find(([v])=>v===profile.shape)?.[2]||'almond';return <div key={k}>{k==='shape'?<ProfileNail variant={shape}/>:<Icon aria-hidden="true"/>}<dt>{label}</dt><dd>{profile[k]}</dd></div>;})}</dl>;
}
export function ProfileEmpty({children,onClick,action}) {return <div className="nmProfileEmpty"><Heart aria-hidden="true"/><p>{children}</p>{onClick&&<button className="nmButton nmButton-ghost" onClick={onClick}>{action}<ArrowUpRight size={16}/></button>}</div>;}
