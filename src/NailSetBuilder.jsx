import React,{useMemo,useState} from 'react';
import {Copy,Layers3,Shuffle,Sparkles} from 'lucide-react';
import NailPreview from './NailPreview';
import {productColor} from './colorAnalysis';
import {colorItem,fallback,initialNailSet,setIdea} from './nailSetModel.js';

const fingers=['Pouce','Index','Majeur','Annulaire','Auriculaire'];
const techniques=['','french','aura','blooming','chrome','glazed','marble','leopard','tortoiseshell','gel-3d','dots','line'];
const labels={french:'French',aura:'Aura',blooming:'Blooming',chrome:'Chrome',glazed:'Glazed',marble:'Marbré',leopard:'Léopard',tortoiseshell:'Tortoise','gel-3d':'Gel 3D',dots:'Pois',line:'Line art'};
export default function NailSetBuilder({items,profile,options,onSave,onClose}){
 const colors=useMemo(()=>{const result=items.filter(item=>item.type!=='Matériel'&&productColor(item)).slice(0,18).map(colorItem);return result.length?result:fallback.map((color,index)=>({id:`inspiration-${index}`,name:'Couleur d’inspiration',color,productId:null}));},[items]);
 const [nails,setNails]=useState(()=>initialNailSet(items)),[active,setActive]=useState(0);
 const idea=setIdea(nails,profile,options),nail=nails[active];
 function patch(change){setNails(current=>current.map((item,index)=>index===active?{...item,...change,accentColor:change.color||item.accentColor}:item));}
 function applyAll(){setNails(current=>current.map(item=>({...item,...nail})));}
 function duplicate(){const source=nails[active];setNails(current=>current.map((item,index)=>index===active?item:{...item,...source,id:item.id}));}
 function alternate(){const first=nails[0],second=nails[1]||nails[0];setNails(current=>current.map((item,index)=>({...item,...(index%2?second:first),id:item.id})));}
 function accent(){setNails(current=>current.map((item,index)=>index===3?{...item,technique:nail.technique||'french',drawing:(nail.technique||'french')==='french'?'french':null}:{...item,technique:'',drawing:null}));}
 function suggest(){setNails(current=>current.map((item,index)=>({...item,technique:index===3?(options.techniques||[])[0]||'french':'',drawing:index===3&&((options.techniques||[])[0]||'french')==='french'?'french':null})));}
 return <section className="nailSetBuilder"><div className="nailSetHead"><div><small>COMPOSITION MANUELLE</small><h2>Ma pose, doigt par doigt</h2><p>Tu gardes la main ; « Générer une idée » reste disponible à tout moment.</p></div></div><NailPreview idea={idea} onSelect={setActive} selectedIndex={active} labels={fingers}/><div className="nailSetFingers">{fingers.map((name,index)=><button type="button" key={name} className={index===active?'selected':''} aria-pressed={index===active} onClick={()=>setActive(index)}>{name}</button>)}</div><section className="nailSetEditor"><h3>{fingers[active]}</h3><b>Couleur</b><div className="nailSetColors">{colors.map(choice=><button type="button" key={choice.id} className={choice.color===nail.color?'selected':''} aria-label={choice.name} onClick={()=>patch({color:choice.color,productId:choice.productId,accentColor:choice.color})}><i style={{background:choice.color}}/></button>)}</div><b>Technique <small>facultatif</small></b><div className="nailSetTechniques">{techniques.map(value=><button type="button" key={value||'none'} className={nail.technique===value?'selected':''} onClick={()=>patch({technique:value,drawing:value==='french'?'french':null})}>{value?labels[value]: 'Uni'}</button>)}</div></section><div className="nailSetShortcuts"><button type="button" onClick={duplicate}><Copy/>Dupliquer</button><button type="button" onClick={applyAll}><Layers3/>Appliquer à tous</button><button type="button" onClick={accent}><Sparkles/>Accent nail</button><button type="button" onClick={alternate}><Shuffle/>Alternance</button><button type="button" onClick={suggest}><Sparkles/>Proposition</button></div><div className="nailSetFooter"><button type="button" className="quietButton" onClick={onClose}>Revenir à Créer</button><button type="button" className="homePrimary" onClick={()=>onSave(idea)}>Enregistrer ma composition</button></div></section>;
}
