import React from 'react';
import MoodGlyph from '../MoodGlyph';
import AtelierArt from './AtelierArt';
import {productColor} from '../colorAnalysis';

// All controls use the existing destinations; artwork is decorative.
export default function HomeBento({profile, items, onCreate, onNavigate, onScan}) {
  const universes=profile.styles || [];
  const colors=items.filter(p=>['Vernis','Semi-permanent','Gel'].includes(p.type)).slice(0,3);
  return <div className="nmHomeAtelier">
    <section className="nmHomeInspire" aria-labelledby="home-inspire-title"><AtelierArt source="inspire"/><h2 id="home-inspire-title">Inspire-moi</h2><p>Une nouvelle idée selon mon mood</p><button className="homePrimary" onClick={onCreate}>Créer une idée</button></section>
    <div className="nmHomeTileGrid" aria-label="Mes raccourcis">
      <button className="nmIllustratedTile" data-home="universes" onClick={()=>{window.location.hash='profil/preferences';}}><AtelierArt source="universes"/><b>Mes univers</b><small>Ce qui me ressemble</small>{universes.length>0&&<span className="nmHomeUniverses">{universes.slice(0,2).map(value=><MoodGlyph key={value} value={value}/>)}</span>}</button>
      <button className="nmIllustratedTile" data-home="collection" onClick={()=>onNavigate('collection')}><AtelierArt source="collection"/><b>Ma collection</b><small>Mes produits, mes couleurs</small>{colors.length>0&&<span className="nmHomeProductColors" aria-label="Quelques couleurs de ma collection">{colors.map(p=><i key={p.id} style={{background:productColor(p)}} data-product-hex={productColor(p)}/>)}</span>}</button>
      <button className="nmIllustratedTile" data-home="guides" onClick={()=>onNavigate('tutorials')}><AtelierArt source="guides"/><b>Mes guides</b><small>Un geste après l’autre</small></button>
      <button className="nmIllustratedTile" data-home="scan" onClick={onScan}><AtelierArt source="scan"/><b>Scan &amp; Génère</b><small>Une idée avec mes vernis</small></button>
    </div>
  </div>;
}
