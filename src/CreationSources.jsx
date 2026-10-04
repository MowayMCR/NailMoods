import React from 'react';
import {Sparkles, Library, Images, ScanLine, Palette, Brush, ArrowRight, ChevronRight, BookHeart,Shirt} from 'lucide-react';
import {DiscoveryShortcut} from './social/Discovery';

const sources = [
  ['collection', Library, 'Ma collection', 'Avec mes produits et mes couleurs'],
  ['photos', Images, 'Photos d’inspiration', 'Une pose ou une image à réinventer'],
  ['scan', ScanLine, 'Scan & Génère', 'Partir de tes vernis et de leurs couleurs'],
  ['manual', Palette, 'Composition manuelle', 'Choisir chaque ongle, un à un'],
];

export default function CreationSources({onChoose, onJournal,outfit=false,onPoseProjects}) {
  return <div className="creationPage sourcePage creativeSources">
    <div className="sourceHeading"><small>LE STUDIO CRÉATIF</small><h1>D’où part ton idée ?</h1><p>Une envie, une couleur, un dessin…<br/>Choisis ton point de départ.</p></div>
    <button className="sourceFree" onClick={()=>onChoose('inspire')}>
      <span className="sourceFreeIcon" aria-hidden="true"><Sparkles/></span>
      <span className="sourceFreeCopy"><b>Inspire-moi</b><small>Laisse venir les idées, avec ou sans collection.</small><span>Créer une idée <ArrowRight/></span></span>
    </button>
    <div className="sourceSectionLabel">OU AVEC CE QUI T’INSPIRE</div>
    <div className="sourceCardGrid">{(outfit?[["outfit",Shirt,"Ma tenue, mes nails","Ton look, jusqu’au bout des ongles · Plus / Pro"],...sources]:sources).map(([id,Icon,title,description])=><button className={'sourceCard sourceCard--'+id} key={id} onClick={()=>onChoose(id)}><span className="sourceCardIcon" aria-hidden="true"><Icon/></span><b>{title}</b><small>{description}</small><ChevronRight className="sourceCardArrow" aria-hidden="true"/></button>)}</div>
    <button className="sourceAtelier" onClick={()=>onChoose('atelier')}><span className="sourceAtelierIcon" aria-hidden="true"><Brush/></span><span><span className="sourceAtelierTitle"><b>Dessin sur ongles</b><em>PRO</em></span><small>Dessine sur les 5 ongles ou reprends un dessin de ton Atelier.</small></span><ChevronRight aria-hidden="true"/></button>
    {outfit&&<button className="sourceJournalLink" onClick={onPoseProjects}><BookHeart/><span>Mes projets de pose</span><ChevronRight/></button>}
    <DiscoveryShortcut featured/>
    <button className="sourceJournalLink" onClick={onJournal}><BookHeart/><span>Retrouver mes idées dans <b>Mes poses</b></span><ChevronRight/></button>
  </div>;
}
