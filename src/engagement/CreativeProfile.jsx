import React,{useMemo} from 'react';
import {Sparkles,Shuffle} from 'lucide-react';
import {creativeSummary} from './creativeSummary.js';
import './engagement.css';
export default function CreativeProfile({library,journal,profile,settings,onSettings,onExplore}) {
  const summary=useMemo(()=>creativeSummary({favorites:library?.favorites,entries:journal?.entries}),[library?.favorites,journal?.entries]);
  const enabled=settings?.enabled!==false;
  return <section className="nmBento nmCreativeProfile"><div className="nmSectionHead"><div><small className="nmEyebrow">MES ENVIES ÉVOLUENT</small><h2>Ton NailMoods</h2></div><Sparkles aria-hidden="true"/></div>
    <p>{!enabled?'La personnalisation est en pause. Tes choix du jour restent prioritaires.':summary.sample?'Quelques repères dans tes inspirations gardées et tes poses. Rien n’est figé.':'Tes goûts se dessinent au fil de tes envies. Aucun questionnaire à remplir.'}</p>
    {enabled&&summary.sample>0&&<><div className="nmCreativeTags">{summary.techniques.map(t=><span key={t}>{t}</span>)}{summary.modes.map(m=><span key={m}>{m}</span>)}{profile.shape&&<span>{profile.shape}</span>}</div>{summary.colors.length>0&&<div className="nmCreativePalette" aria-label="Couleurs de tes inspirations et poses">{summary.colors.map(c=><i key={c} style={{background:c}} aria-label={c} role="img"/>)}</div>}</>}
    <div className="nmEngagementActions"><button className="nmButton nmButton-secondary" onClick={onExplore}><Shuffle size={17}/>Sortir de ma bulle</button><button className="nmQuiet" onClick={onSettings}>Ce qui guide mes idées</button></div>
  </section>;
}
