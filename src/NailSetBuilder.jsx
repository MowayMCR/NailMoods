import MoodGlyph from './MoodGlyph';
import React,{useMemo,useState} from 'react';
import {Copy,Layers3,Shuffle,Sparkles} from 'lucide-react';
import NailPreview from './NailPreview';
import {contrastingColor,decorColorLabel,hasDecorColor,initialNailSet,manualColors,manualTechniques,setIdea,suggestedTechnique,techniqueLabels,updateNail} from './nailSetModel.js';

const fingers=['Pouce','Index','Majeur','Annulaire','Auriculaire'];

function ColorChoices({label,colors,value,onChange}){
 return <fieldset className="nailSetColorGroup"><legend>{label}</legend><div className="nailSetColors">{colors.map(choice=><button type="button" key={choice.id} className={choice.color.toLowerCase()===value.toLowerCase()?'selected':''} aria-pressed={choice.color.toLowerCase()===value.toLowerCase()} aria-label={`${label} : ${choice.name} ${choice.color}`} title={choice.name} onClick={()=>onChange(choice)}><i style={{background:choice.color}}/></button>)}</div><label className="nailSetCustomColor"><input type="color" aria-label={`${label} personnalisée`} value={value} onChange={event=>onChange({color:event.target.value,productId:null,name:'Couleur personnalisée'})}/><span>Autre couleur</span><small>{value.toUpperCase()}</small></label></fieldset>;
}

export default function NailSetBuilder({items,profile,options,onSave,onClose}){
 const colors=useMemo(()=>manualColors(items),[items]);
 const [nails,setNails]=useState(()=>initialNailSet(items)),[active,setActive]=useState(0);
 const idea=useMemo(()=>setIdea(nails,profile,options),[nails,profile,options]),nail=nails[active];
 function patch(change){setNails(current=>current.map((item,index)=>index===active?updateNail(item,change,colors):item));}
 function chooseBase(choice){patch({color:choice.color,productId:choice.productId,colorName:choice.name});}
 function chooseDecor(choice){patch({accentColor:choice.color,accentProductId:choice.productId,accentName:choice.name});}
 function applyAll(){setNails(current=>current.map(item=>({...nail,id:item.id})));}
 function duplicate(){setNails(current=>current.map((item,index)=>index===active?item:{...nail,id:item.id}));}
 function alternate(){const first=nails[0],second=nails[1];setNails(current=>current.map((item,index)=>({...((index%2)?second:first),id:item.id})));}
 function accent(){setNails(current=>current.map((item,index)=>updateNail(index===3?{...nail,id:item.id}:item,{technique:index===3?nail.technique||'french':''},colors)));setActive(3);}
 function suggest(){setNails(current=>current.map((item,index)=>updateNail(item,{technique:index===3?suggestedTechnique(options):''},colors)));setActive(3);}
 const lowContrast=hasDecorColor(nail.technique)&&nail.color.toLowerCase()===nail.accentColor.toLowerCase();
 return <section className="nailSetBuilder">
  <div className="nailSetHead"><div><small>COMPOSITION MANUELLE</small><h2>Ma pose, doigt par doigt</h2><p>Choisis la base, la technique et la couleur du décor pour chaque ongle.</p></div></div>
  <NailPreview idea={idea} onSelect={setActive} selectedIndex={active} labels={fingers}/>
  <div className="nailSetFingers">{fingers.map((name,index)=><button type="button" key={name} className={index===active?'selected':''} aria-pressed={index===active} onClick={()=>setActive(index)}>{name}</button>)}</div>
  <section className="nailSetEditor"><h3>{fingers[active]}</h3>
   <ColorChoices label="Couleur de base" colors={colors} value={nail.color} onChange={chooseBase}/>
   <b>Technique <small>facultatif</small></b><div className="nailSetTechniques">{manualTechniques.map(value=><button type="button" key={value||'none'} className={nail.technique===value?'selected':''} aria-pressed={nail.technique===value} onClick={()=>patch({technique:value})}><MoodGlyph value={value || 'Uni'} />{techniqueLabels[value]||'Uni'}</button>)}</div>
   {hasDecorColor(nail.technique)&&<ColorChoices label={decorColorLabel(nail.technique)} colors={colors} value={nail.accentColor} onChange={chooseDecor}/>}
   {lowContrast&&<p className="nailSetContrast" role="status">La base et le décor ont la même couleur. <button type="button" onClick={()=>chooseDecor(contrastingColor(nail.color,colors))}>Choisir un décor contrasté</button></p>}
  </section>
  <div className="nailSetShortcuts"><button type="button" onClick={duplicate}><Copy/>Dupliquer</button><button type="button" onClick={applyAll}><Layers3/>Appliquer à tous</button><button type="button" onClick={accent}><Sparkles/>Accent nail</button><button type="button" onClick={alternate}><Shuffle/>Alternance</button><button type="button" onClick={suggest}><Sparkles/>Proposition</button></div>
  <div className="nailSetFooter"><button type="button" className="quietButton" onClick={onClose}>Revenir à Créer</button><button type="button" className="homePrimary" onClick={()=>onSave(idea)}>Enregistrer ma composition</button></div>
 </section>;
}
