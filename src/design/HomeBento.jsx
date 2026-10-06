import React from 'react';
import {ArrowUpRight, Heart, Play, Sparkles} from 'lucide-react';
import MoodGlyph from '../MoodGlyph';
import AtelierArt from './AtelierArt';
import Bottle from '../shelf/Bottle';
import {productColor} from '../colorAnalysis';
import {profileMood} from './themes';

// Home-only compositions. The data, destinations and validated icon atlas stay shared.
export default function HomeBento({profile, items, resume, onCreate, onNavigate}) {
  const mood=profileMood(profile);
  const universes=profile.styles || [];
  const colors=items.filter(p=>['Vernis','Semi-permanent','Gel'].includes(p.type)).slice(0,3);
  return <div className="nmHomeBento" aria-label="Ton inspiration du moment">
    <button className="nmUniverseCard" onClick={()=>{window.location.hash='profil/preferences';}}>
      <span className="nmEyebrow">TES UNIVERS</span>
      <b>Tout ce qui<br/><em>te ressemble.</em></b>
      <div className="nmUniverseArt">{universes.length ? universes.slice(0,2).map(v=><span key={v}><MoodGlyph value={v}/><span>{v}</span></span>) : <span className="nmUniverseEmpty"><Heart aria-hidden="true"/><span>À toi de choisir</span></span>}</div>
      <span className="nmBentoFoot"><span>{universes.length>2?`+ ${universes.length-2} autres univers`:'Composer mon univers'}</span><ArrowUpRight aria-hidden="true"/></span>
    </button>
    <button className="nmPaletteCard" onClick={onCreate}>
      <span className="nmEyebrow">INSPIRATION EXPRESS</span>
      <div className="nmMoodCollage"><AtelierArt source="inspire"/></div>
      <b>Place à ton mood</b><small>{mood.name}</small><span className="nmBentoFoot"><span>Une nouvelle idée</span><ArrowUpRight aria-hidden="true"/></span>
    </button>
    <button className="nmTutorialCard" onClick={()=>onNavigate('tutorials')}>
      <span className="nmEyebrow">POSES GUIDÉES</span>
      <div className="nmGuideArt"><AtelierArt source="trainer"/></div>
      <b>Un geste<br/>après l’autre</b><small>{resume?`${resume.completed.length} / ${resume.steps.length} étapes terminées`:'Préparer · créer · admirer'}</small>
      {resume && <progress value={resume.completed.length} max={resume.steps.length} aria-label="Progression de ma pose"/>}
      <span className="nmBentoFoot"><span>{resume?'Reprendre ma pose':'Voir mes guides'}</span><ArrowUpRight aria-hidden="true"/></span>
    </button>
    <button className="nmCollectionBento" onClick={()=>onNavigate('collection')}>
      <span className="nmCollectionCopy"><span className="nmEyebrow">MA COLLECTION</span><b>Mes petits<br/>trésors.</b><small>{items.length?`${items.length} produit${items.length>1?'s':''} à retrouver`:'Tes couleurs commencent ici'}</small><span className="nmBentoFoot"><span>{items.length?'Ouvrir ma collection':'Ajouter un produit'}</span><ArrowUpRight aria-hidden="true"/></span></span>
      <span className="nmCollectionStillLife" aria-label={colors.length?'Quelques couleurs de ta collection':'Ta future collection'}>{colors.length ? colors.map(p=><span className="nmMiniProduct" key={p.id} title={`${p.brand || ''} ${p.name}`}><Bottle product={p}/><i style={{background:productColor(p)}} data-product-hex={productColor(p)}/></span>) : <span className="nmCollectionEmpty"><AtelierArt source="collection"/><span>{items.length?'Vernis, matériel et accessoires':'À remplir de tes envies'}</span></span>}</span>
    </button>
  </div>;
}
