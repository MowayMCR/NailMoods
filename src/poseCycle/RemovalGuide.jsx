import {track} from '../analytics/analytics';
import React from 'react';
import {manufacturerProtocols} from './protocols';
export default function RemovalGuide({project}){
 const products=[...(project.details.composition?.palette||[]),...(project.details.composition?.resources||[])].filter(p=>p.type!=='Matériel');
 const unique=[...new Map(products.map(p=>[String(p.id),p])).values()];
 return <details className="followDates removalGuide" onToggle={e=>{if(e.currentTarget.open)track('pose_removal_guide_opened',{}, {screen:'pose'});}}><summary>Préparer ma dépose</summary><p>Une dépose adaptée aux références réellement utilisées. Aucun délai universel n’est imposé.</p>{unique.length?unique.map(p=>{const protocols=manufacturerProtocols(p,'removal');return <article key={p.id}><h3>{p.name}</h3><small>{[p.brand,p.range,p.type].filter(Boolean).join(' · ')}</small>{protocols.length?protocols.map(protocol=><div key={protocol.id}><b>{protocol.title}</b><ol>{protocol.steps.map((step,i)=><li key={i}>{step}</li>)}</ol><a href={protocol.sourceUrl} target="_blank" rel="noopener noreferrer">Protocole fabricant · vérifié le {protocol.verifiedOn}</a></div>):<p>Nous n’avons pas de protocole de dépose vérifié pour cette référence. Consulte les recommandations du fabricant ou ta professionnelle.</p>}</article>}):<p>Ajoute les références utilisées pour retrouver leurs indications. Sans protocole fiable, suis les recommandations du fabricant ou de ta professionnelle.</p>}<p>Si tu as remplacé un produit pendant ta pose, réfère-toi à la notice du produit réellement appliqué.</p></details>;
}
