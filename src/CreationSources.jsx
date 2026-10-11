import {InternalAIEntry} from './aiPlus/InternalLab';
import React from 'react';
import {AssistantEntry} from './assistant/Assistant';
import {ChevronRight} from 'lucide-react';
import AtelierArt from './design/AtelierArt';

export function CreateTile({id,title,subtitle,onChoose,onClick,secondary=false,badge}) {
  return <button type="button" className={'sourceCard sourceCard--'+id+(secondary?' sourceCard--secondary':'')} onClick={onClick||(()=>onChoose(id))}><AtelierArt source={id}/><b>{title}{badge&&<em className="nmTileBadge">{badge}</em>}</b>{subtitle&&<small>{subtitle}</small>}</button>;
}
export function CreateWideTile({id,title,subtitle,badge,onChoose}) {
  return <button type="button" className="sourceAtelier" onClick={()=>onChoose(id)}><AtelierArt source={id}/><span><span className="sourceAtelierTitle"><b>{title}</b>{badge&&<em>{badge}</em>}</span><small>{subtitle}</small></span><ChevronRight aria-hidden="true"/></button>;
}
export default function CreationSources({onChoose,onJournal,onOpenAI,outfit=false,onPlanning}) {
  const sources=[['photos','Photos d’inspiration','À partir d’une photo'],['inspire','Inspire-moi','Selon ton mood'],['collection','Avec ma collection','Mes produits, mes couleurs'],['scan','Scan & Génère','Un produit, des idées'],['manual','Composition manuelle','Ongle par ongle'],...(outfit?[['outfit','Ma tenue, mes nails','Un look complet']]:[]),['atelier','Dessin sur ongles','Dessine librement','PRO'],['trainer','Nail Art Trainer','Apprends et progresse']];
  return <div className="creationPage sourcePage creativeSources nmAtelierSources">
    <div className="sourceHeading nmIllustratedHeading"><AtelierArt source="manual"/><div><h1>Créer</h1><p>Imagine, explore, crée.</p></div></div>
    <div className="sourceCardGrid">{onOpenAI&&<AssistantEntry onOpen={onOpenAI}/>} {sources.map(([id,title,subtitle,badge])=><CreateTile key={id} id={id} title={title} subtitle={subtitle} badge={badge} onChoose={onChoose}/>)}<CreateTile id="journal" title="Mes poses" subtitle="Mes idées enregistrées" onClick={onJournal}/></div>
    <details className="nmCreateAdvanced"><summary>Outils avancés</summary><button className="nmQuiet" onClick={()=>onChoose('prototype')}>Prototype des rendus</button><InternalAIEntry/></details>
  </div>;
}
