import useTranslation from '../i18n/useTranslation.js';
import React from 'react';
import {outfitEnabled} from '../poseCycle/OutfitFlow';
import MoodGlyph from '../MoodGlyph';
import AtelierArt from './AtelierArt';
import {productColor} from '../colorAnalysis';

// All controls use the existing destinations; artwork is decorative.
export default function HomeBento({profile, items, onCreate, onNavigate, onScan}) {
  const {t}=useTranslation();
  const universes=profile.styles || [];
  const colors=items.filter(p=>['Vernis','Semi-permanent','Gel'].includes(p.type)).slice(0,3);
  return <div className="nmHomeAtelier">
    <section className="nmHomeInspire" aria-labelledby="home-inspire-title"><AtelierArt source="inspire"/><h2 id="home-inspire-title">{t("home.inspire")}</h2><p>{t("home.mood")}</p><button className="homePrimary" onClick={onCreate}>{t("home.create")}</button></section>
    <div className="nmHomeTileGrid" aria-label={t("home.shortcuts")}>
      <button className="nmIllustratedTile" data-home="universes" onClick={()=>{window.location.hash='profil/preferences';}}><AtelierArt source="universes"/><b>{t("home.universes")}</b><small>{t("home.myStyle")}</small>{universes.length>0&&<span className="nmHomeUniverses">{universes.slice(0,2).map(value=><MoodGlyph key={value} value={value}/>)}</span>}</button>
      <button className="nmIllustratedTile" data-home="collection" onClick={()=>onNavigate('collection')}><AtelierArt source="collection"/><b>{t("home.collection")}</b><small>{t("home.products")}</small>{colors.length>0&&<span className="nmHomeProductColors" aria-label={t("home.colors")}>{colors.map(p=><i key={p.id} style={{background:productColor(p)}} data-product-hex={productColor(p)}/>)}</span>}</button>
      <button className="nmIllustratedTile" data-home="guides" onClick={()=>onNavigate('tutorials')}><AtelierArt source="guides"/><b>{t("home.guides")}</b><small>{t("home.steps")}</small></button>
      <button className="nmIllustratedTile" data-home="scan" onClick={onScan}><AtelierArt source="scan"/><b>{t("home.scan")}</b><small>{t("home.polishes")}</small></button>
      {outfitEnabled()&&<button className="nmIllustratedTile" data-home="planning" onClick={()=>{window.location.hash='creer/planning?from=accueil';}}><AtelierArt source="planning"/><b>{t("home.calendar")}</b><small>{t("home.next")}</small></button>}
    </div>
  </div>;
}
