import React,{useEffect,useState} from 'react';
import {Check,Plus,Search} from 'lucide-react';
import Sheet from './Sheet';
import {useStorage} from './StorageContext';
import {getCloudClient} from './cloud/client.js';
import {equipmentSeed} from './equipmentSeed.js';
import {loadEquipmentLibrary,ownedEquipment,searchEquipment} from './equipmentLibrary.js';
import {EquipmentVisual} from './equipment';
import './equipment-library.css';
export default function EquipmentLibrary({items,onSetOwned,onCustom,onClose}){
  const storage=useStorage(),[rows,setRows]=useState(equipmentSeed),[offline,setOffline]=useState(false),[query,setQuery]=useState(''),[category,setCategory]=useState(''),[error,setError]=useState('');
  useEffect(()=>{let active=true;loadEquipmentLibrary(getCloudClient(),storage).then(v=>{if(active){setRows(v.rows);setOffline(v.offline);}}).catch(()=>{if(active)setOffline(true);});return()=>{active=false;};},[storage]);
  return <Sheet title="Bibliothèque NailMoods" onClose={onClose} className="equipmentLibrary"><div className="search"><Search/><input type="search" aria-label="Rechercher du matériel" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Lime, lampe, pinceau…"/></div><label>Catégorie<select value={category} onChange={e=>setCategory(e.target.value)}><option value="">Toutes les catégories</option>{[...new Set(rows.map(r=>r.category))].map(c=><option key={c}>{c}</option>)}</select></label>{offline&&<p className="fieldHelp" role="status">Bibliothèque disponible sur cet appareil. Tes choix seront synchronisés à la reconnexion.</p>}{error&&<p role="alert">{error}</p>}<div className="equipmentLibraryRows">{searchEquipment(rows,query,category).map(row=>{const owned=ownedEquipment(items,row).length>0;return <button type="button" key={row.slug} aria-pressed={owned} onClick={()=>{setError('');if(!onSetOwned(row,!owned))setError('La modification n’a pas pu être enregistrée. Réessaie.');}}><EquipmentVisual item={{equipmentCategory:row.legacyCategory}}/><span><b>{row.name}</b><small>{row.category}</small></span><span>{owned?<><Check/>Je l’ai</>:<Plus/>}</span></button>;})}</div>{!searchEquipment(rows,query,category).length&&<p>Aucun matériel correspondant. Tu peux ajouter le tien.</p>}<button className="detailSecondary" onClick={onCustom}>+ Ajouter un autre matériel</button><p className="fieldHelp">Bases, top coats, vernis, gels, cleaner et primer se trouvent dans les produits.</p></Sheet>;
}
