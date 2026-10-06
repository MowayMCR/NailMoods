import {InternalAIEntry} from './aiPlus/InternalLab';
import React from 'react';
import {Sparkles, Images, ScanLine, Brush, ChevronRight, BookHeart, Shirt, CalendarDays} from 'lucide-react';
import {DiscoveryShortcut} from './social/Discovery';
import MoodGlyph from './MoodGlyph';
import Bottle from './shelf/Bottle';

// Reuse the validated pictograms and Collection bottle, without changing routes.
function SourceIllustration({source,products=[]}) {
  if(source==='collection'||source==='scan')return <span className={'createIllustration createIllustration--'+source} aria-hidden="true">
    <Bottle product={products[0]||{}}/>{source==='collection'?<Bottle product={products[1]||products[0]||{}}/>:<ScanLine/>}
  </span>;
  const glyph={inspire:'Doux',manual:'Mix & match',trainer:'Freehand',atelier:'Freehand',outfit:'Élégant'}[source];
  return <span className={'createIllustration createIllustration--'+source} aria-hidden="true"><MoodGlyph value={glyph}/>{source==='outfit'?<Shirt/>:source==='inspire'?<Sparkles/>:source==='trainer'||source==='atelier'?<Brush/>:null}</span>;
}
export function CreateTile({id,title,subtitle,onChoose,products}) {
  return <button type="button" className={'sourceCard sourceCard--'+id} onClick={()=>onChoose(id)}><SourceIllustration source={id} products={products}/><b>{title}</b><small>{subtitle}</small></button>;
}
export function CreateWideTile({id,title,subtitle,badge,onChoose,products}) {
  return <button type="button" className="sourceAtelier" onClick={()=>onChoose(id)}><SourceIllustration source={id} products={products}/><span><span className="sourceAtelierTitle"><b>{title}</b>{badge&&<em>{badge}</em>}</span><small>{subtitle}</small></span><ChevronRight aria-hidden="true"/></button>;
}
export default function CreationSources({onChoose,onJournal,outfit=false,onPlanning,onPoseProjects,items=[]}) {
  const products=items.filter(p=>['Vernis','Semi-permanent','Gel'].includes(p.type));
  const sources=[['inspire','Inspire-moi','Des idées selon ton mood'],['collection','Avec ma collection','Tes produits, tes couleurs'],['scan','Scan & Génère','Un produit, des idées'],['manual','Composition manuelle','Choisis chaque ongle'],...(outfit?[['outfit','Ma tenue, mes nails','Un look complet']]:[]),['trainer','Nail Art Trainer','Apprends et progresse']];
  return <div className="creationPage sourcePage creativeSources">
    <div className="sourceHeading"><h1>Créer</h1><p>Imagine, explore, crée.</p></div>
    <div className="sourceCardGrid">{sources.map(([id,title,subtitle])=><CreateTile key={id} id={id} title={title} subtitle={subtitle} onChoose={onChoose} products={products}/>)}</div>
    <CreateWideTile id="atelier" title="Dessin sur ongles" subtitle="Dessine sur les 5 ongles" badge="PRO" onChoose={onChoose}/>
    <button type="button" className="sourceJournalLink sourcePhotos" onClick={()=>onChoose('photos')}><Images aria-hidden="true"/><span>Photos d’inspiration</span><ChevronRight aria-hidden="true"/></button>
    {outfit&&<button className="sourceJournalLink" onClick={onPlanning}><CalendarDays/><span>Mon Planning</span><ChevronRight/></button>}
    {outfit&&<button className="sourceJournalLink" onClick={onPoseProjects}><BookHeart/><span>Mes projets de pose</span><ChevronRight/></button>}
    <InternalAIEntry/><DiscoveryShortcut featured/>
    <button className="sourceJournalLink" onClick={onJournal}><BookHeart/><span>Retrouver mes idées dans <b>Mes poses</b></span><ChevronRight/></button>
  </div>;
}
