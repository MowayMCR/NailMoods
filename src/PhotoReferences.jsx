import React,{useEffect,useState} from 'react';
import {useStorage} from './StorageContext';
export function ReferenceImage({src,alt}){
 const storage=useStorage(),[url,setUrl]=useState('');
 useEffect(()=>{let active=true,object;setUrl('');
 if(src?.startsWith('data:image/')||src?.startsWith('blob:')){setUrl(src);return;}
 if(src&&storage.media)storage.media.download(src).then(blob=>{if(active){object=URL.createObjectURL(blob);setUrl(object);}}).catch(()=>{});
 return()=>{active=false;if(object)URL.revokeObjectURL(object);};},[src,storage]);
 return url?<img src={url} alt={alt}/>:<span>Référence en cours de chargement</span>;
}
export default function PhotoReferences({photos=[]}){return photos.length>0&&<section className="detailSection"><h2>Mes références privées</h2><div className="photoThumbs">{photos.map((p,i)=><ReferenceImage key={i} src={p.src} alt={'Référence '+(i+1)}/>)}</div></section>;}
