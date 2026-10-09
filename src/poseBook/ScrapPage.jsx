import MoodGlyph from '../MoodGlyph.jsx';
import React from 'react';
import ScrapFrame from './ScrapFrame.jsx';
import './scrapbook.css';
import TapFavorite from '../TapFavorite.jsx';
import {assetById,spriteStyle,scrapMoods,scrapBackgrounds} from './scrapbook.js';
export function ScrapSprite({asset,className=''}){if(asset.icon)return <span className="nmScrapTechnique"><MoodGlyph value={asset.icon}/></span>;return <span aria-hidden="true" className={'nmScrapSprite '+className} style={spriteStyle(asset)}/>;}
export function ScrapNode({node,entries,renderVisual,onOpen,onFavorite,editing=false}){
 if(node.type==='photo'){
 const entry=entries.find(e=>e.id===node.ref);if(!entry)return editing?<span className="nmScrapMissing">Pose indisponible</span>:null;
 const body=<><ScrapFrame className={'nmScrapFrame frame-'+node.frame} frame={node.frame}/><span className="nmScrapImage">{renderVisual(entry)}</span><span className="nmScrapCaption">{entry.title||'Ma pose'}</span></>;
 return editing?<div className="nmScrapPrint">{body}</div>:<TapFavorite className="nmScrapPrint" aria-label={'Ouvrir la pose '+(entry.title||'Ma pose')} onOpen={()=>onOpen?.(entry)} onToggle={()=>onFavorite?.(entry)} saved={Boolean(entry.saved)}>{body}</TapFavorite>;
 }
 if(node.type==='text')return <span className={'nmScrapText color-'+node.color}>{node.text}</span>;
 const asset=assetById(node.asset);return asset?<ScrapSprite asset={asset}/>:null;
}
export function pageStyle(background){const bg=scrapBackgrounds.find(b=>b.id===background)||scrapBackgrounds[0],m=scrapMoods.find(v=>v[0]===bg.mood);return {'--scrap-paper':m[2],'--scrap-ink':m[3],'--scrap-decor':`url(${import.meta.env.BASE_URL}atelier/scrapbook-v2/${bg.mood}-corners.svg)`};}
export function nodeStyle(node){return {left:node.x+'%',top:node.y+'%',width:node.w+'%',transform:`translate(-50%,-50%) rotate(${node.rotate}deg)`};}
export default function ScrapPage({design,entries,renderVisual,onOpen,onFavorite}){return <div className={'nmScrapCanvas background-'+design.background.split('-')[1]} style={pageStyle(design.background)}>{design.nodes.map(node=><div key={node.id} className={'nmScrapNode type-'+node.type} style={nodeStyle(node)}><ScrapNode {...{node,entries,renderVisual,onOpen,onFavorite}}/></div>)}</div>;}
