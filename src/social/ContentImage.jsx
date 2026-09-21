import NailPreview from '../NailPreview';
import React,{useEffect,useState} from 'react';
import {Image as ImageIcon} from 'lucide-react';
export default function ContentImage({client,kind,id,title='',preview,onUnavailable}){
 const [src,setSrc]=useState('');
 useEffect(()=>{let active=true,objectUrl;const controller=new AbortController();setSrc('');
 (async()=>{const {data}=await client.auth.getSession();if(!data.session)return;
 const r=await fetch(`${client.supabaseUrl}/functions/v1/media-read?kind=${encodeURIComponent(kind)}&id=${encodeURIComponent(id)}`,{headers:{Authorization:`Bearer ${data.session.access_token}`},cache:'no-store',signal:controller.signal});
 if(!r.ok){if(active&&[401,403].includes(r.status))onUnavailable?.();return;}const blob=await r.blob();if(active){objectUrl=URL.createObjectURL(blob);setSrc(objectUrl);}})().catch(()=>{});
 return()=>{active=false;controller.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);};},[client,kind,id]);
 return src?<img src={src} alt={title} loading="lazy"/>:preview?.nails?.length===5?<NailPreview idea={preview} compact/>:<div className="discoveryNoPhoto"><ImageIcon/><span>Publication sans photo disponible</span></div>;
}
