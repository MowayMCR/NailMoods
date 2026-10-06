import {InternalAIEntry} from './aiPlus/InternalLab';
import React from 'react';
import {ChevronRight} from 'lucide-react';
import AtelierArt from './design/AtelierArt';

export function CreateTile({id,title,subtitle,onChoose,onClick,secondary=false}) {
  return <button type="button" className={'sourceCard sourceCard--'+id+(secondary?' sourceCard--secondary':'')} onClick={onClick||(()=>onChoose(id))}><AtelierArt source={id}/><b>{title}</b>{subtitle&&<small>{subtitle}</small>}</button>;
}
export function CreateWideTile({id,title,subtitle,badge,onChoose}) {
  return <button type="button" className="sourceAtelier" onClick={()=>onChoose(id)}><AtelierArt source={id}/><span><span className="sourceAtelierTitle"><b>{title}</b>{badge&&<em>{badge}</em>}</span><small>{subtitle}</small></span><ChevronRight aria-hidden="true"/></button>;
}
export default function CreationSources({onChoose,onJournal,outfit=false,onPlanning}) {
  const sources=[['inspire','Inspire-moi','Des idées selon ton mood'],['collection','Avec ma collection','Tes produits, tes couleurs'],['scan','Scan & Génère','Un produit, des idées'],['manual','Composition manuelle','Choisis chaque ongle'],...(outfit?[['outfit','Ma tenue, mes nails','Un look complet']]:[]),['trainer','Nail Art Trainer','Apprends et progresse']];
  return <div className="creationPage sourcePage creativeSources nmAtelierSources">
    <div className="sourceHeading"><h1>Créer</h1><p>Imagine, explore, crée.</p></div>
    <div className="sourceCardGrid">{sources.map(([id,title,subtitle])=><CreateTile key={id} id={id} title={title} subtitle={subtitle} onChoose={onChoose}/>)}</div>
    <CreateWideTile id="atelier" title="Dessin sur ongles" subtitle="Dessine sur les 5 ongles" badge="PRO" onChoose={onChoose}/>
    <div className="sourceFollowGrid" role="group" aria-label="Inspirations et suivi">
      <CreateTile secondary id="photos" title="Photos d’inspiration" onChoose={onChoose}/>
      {outfit&&<CreateTile secondary id="planning" title="Mon calendrier" onClick={onPlanning}/>}
      <CreateTile secondary id="journal" title="Mes poses" onClick={onJournal}/>
    </div>
    <button type="button" className="nmPrototypeEntry" onClick={()=>onChoose('prototype')}><span><b>Prototype des rendus</b><small>Explore les formes, les teintes et les matières</small></span><ChevronRight aria-hidden="true"/></button>
    <InternalAIEntry/>
  </div>;
}
