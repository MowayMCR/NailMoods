import React,{useEffect,useState} from 'react';
import { isNative,nativeServices,currentNativeNotice,nativeNotice } from './state.js';
// Loaded only in the native build from main.jsx.
import { recoveredMedia,reuseRecoveredMedia,discardRecoveredMedia } from './nativeMedia.js';
export default function MobileStatus(){
 const [message,setMessage]=useState(currentNativeNotice),[offline,setOffline]=useState(()=>document.documentElement.classList.contains('nm-offline')),[photo,setPhoto]=useState(()=>{const p=recoveredMedia();return p&&!p.delivered&&p.principal===nativeServices()?.principal?p:null;});
 useEffect(()=>{const notice=e=>setMessage(e.detail),network=e=>setOffline(!e.detail),media=()=>{const p=recoveredMedia();setPhoto(p&&!p.delivered&&p.principal===nativeServices()?.principal?p:null);};window.addEventListener('nm-native-notice',notice);window.addEventListener('nm-native-connectivity',network);window.addEventListener('nm-native-media',media);return()=>{window.removeEventListener('nm-native-notice',notice);window.removeEventListener('nm-native-connectivity',network);window.removeEventListener('nm-native-media',media);};},[]);
 if(!isNative()||(!message&&!offline&&!photo))return null;
 return <aside className="mobileStatus" aria-label="État de l’application"><div role="status">{offline&&<p>Connexion impossible. Tes données restent conservées ; réessaie au retour du réseau.</p>}{message&&<p>{message}</p>}{photo&&<p>{photo.delivered?'Photo transmise au formulaire. Tu peux retirer sa copie de récupération après l’enregistrement.':'Une photo a été récupérée après une interruption. Rouvre son formulaire pour la réutiliser.'}</p>}</div>{message&&<button onClick={()=>nativeNotice('')}>Fermer</button>}{photo&&<><button onClick={()=>void reuseRecoveredMedia()}>Réutiliser</button><button onClick={()=>void discardRecoveredMedia()}>Retirer la copie</button></>}</aside>;
}
