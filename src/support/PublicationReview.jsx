import React,{useEffect,useState} from 'react';
const call=async(client,action,item={})=>{const {data,error}=await client.rpc('nm_publication_review',{p_action:action,p_kind:item.kind||null,p_id:item.id||null});if(error)throw error;return data;};
function Preview({client,item,onReady}){
 const [url,setUrl]=useState('');
 useEffect(()=>{let alive=true,current;const controller=new AbortController();(async()=>{try{
  const {data}=await client.auth.getSession();const response=await fetch(`${client.supabaseUrl}/functions/v1/moderation-preview?kind=${item.kind}&id=${item.id}`,{headers:{Authorization:`Bearer ${data.session.access_token}`},signal:controller.signal});
  if(!response.ok)return;current=URL.createObjectURL(await response.blob());if(alive)setUrl(current);
 }catch{}})();return()=>{alive=false;controller.abort();if(current)URL.revokeObjectURL(current);};},[client,item.kind,item.id]);
 return url?<img src={url} onLoad={()=>onReady(item.kind+item.id)} alt="Photo proposée à la publication" style={{maxWidth:'100%',maxHeight:320,objectFit:'contain'}}/>:<p>Photo indisponible : ne pas approuver sans la voir.</p>;
}
export default function PublicationReview({client,staff=false}){
 const [items,setItems]=useState([]),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[viewed,setViewed]=useState({});
 async function load(){try{setItems(await call(client,staff?'list':'mine'));}catch{setNotice('Les demandes de publication ne peuvent pas être chargées.');}}
 useEffect(()=>{void load();const listener=()=>void load();window.addEventListener('nm-publication-queued',listener);return()=>window.removeEventListener('nm-publication-queued',listener);},[client,staff]);
 async function decide(item,action){setBusy(true);try{await call(client,action,item);await load();setNotice(action==='approve'?'Publication approuvée.':'Photo maintenue privée.');}catch{setNotice('La décision n’a pas abouti. Actualise et vérifie la nouvelle version.');}finally{setBusy(false);}}
 return <section className="card"><h2>{staff?'Photos avant publication':'Mes publications'}</h2><p>Les photos proposées à Découvrir sont vérifiées avant leur diffusion. Les notes privées ne sont pas transmises au staff.</p><button onClick={load} disabled={busy}>Actualiser</button>{items.length===0?<p>Aucune demande à afficher.</p>:items.map(item=><article key={item.kind+item.id}><h3>{item.title||'Pose ou inspiration'}</h3>{staff?<><Preview client={client} item={item} onReady={key=>setViewed(v=>v[key]?v:{...v,[key]:true})}/><button disabled={busy||!viewed[item.kind+item.id]} onClick={()=>decide(item,'approve')}>Approuver</button><button disabled={busy} onClick={()=>decide(item,'reject')}>Refuser</button></>:<p>{({pending:'En attente de vérification',approved:'Approuvée',rejected:'Refusée : la photo reste privée',canceled:'Demande retirée'})[item.status]}</p>}</article>)}{notice&&<p role="status">{notice}</p>}</section>;
}
