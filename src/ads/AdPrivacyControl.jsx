import React,{useEffect,useRef,useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {demoRewardedAd,demoBannerAd,stopAds,withdrawAdConsent,declineAds,reconsiderAds} from './admob';
import './ads.css';
export default function AdPrivacyControl({client,tier}){
 const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false),[testingBanner,setTestingBanner]=useState(false);
 const dialog=useRef(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;void stopAds().catch(()=>{});};},[client,tier]);
 useEffect(()=>{
  if(!testingBanner)return;
  dialog.current?.showModal();
  const hide=()=>{if(document.hidden)setTestingBanner(false);};
  document.addEventListener('visibilitychange',hide);
  return()=>{document.removeEventListener('visibilitychange',hide);dialog.current?.close();void stopAds().catch(()=>{});};
 },[testingBanner]);
 if(!Capacitor.isNativePlatform())return null;
 const testEnabled=import.meta.env.VITE_ADMOB_TEST_ENABLED==='true'&&tier==='free';
 async function act(fn,message){
  if(busy)return;setBusy(true);
  try{await fn();if(alive.current)setNotice(message);}
  catch{if(alive.current){setNotice('Publicité indisponible ou refusée. Ton accès reste inchangé.');setTestingBanner(false);}}
  finally{if(alive.current)setBusy(false);}
 }
 return <section><h3>Choix publicitaires</h3><p>Les essais publicitaires sont facultatifs. Les offres Plus et Pro restent sans publicité.</p>
 {testEnabled&&<><p>Ces annonces de démonstration ne donnent aucun crédit.</p><button disabled={busy||testingBanner} onClick={()=>act(()=>demoRewardedAd(client),'Vidéo de démonstration terminée. Aucun crédit attribué.')}>Tester une vidéo facultative</button><button disabled={busy||testingBanner} onClick={()=>{setTestingBanner(true);void act(()=>demoBannerAd(client),'Bannière de démonstration demandée.');}}>Tester une bannière</button></>}
 <button disabled={busy} onClick={()=>act(declineAds,'Publicités refusées sur cet appareil. Ton accès reste inchangé.')}>Refuser les publicités</button>
 <button disabled={busy} onClick={()=>act(reconsiderAds,'Tu peux refaire un essai. Tes choix Google seront vérifiés avant tout chargement.')}>Revoir mon choix</button>
 <button disabled={busy} onClick={()=>act(withdrawAdConsent,'Publicités arrêtées sur cet appareil. Les options Google ont été proposées lorsqu’elles sont disponibles.')}>Gérer ou retirer mon consentement publicitaire</button>
 {notice&&<p role="status">{notice}</p>}
 {testingBanner&&<dialog ref={dialog} className="nmAdTestDialog" aria-labelledby="nmAdTestTitle" onCancel={()=>setTestingBanner(false)}><div className="nmAdTestContent"><h2 id="nmAdTestTitle">Bannière de démonstration</h2><p>L’annonce test apparaît en haut de l’écran si elle est disponible.</p><p>Aucune récompense n’est attribuée. Tu peux fermer cet essai à tout moment.</p><button autoFocus onClick={()=>setTestingBanner(false)}>Fermer l’essai</button></div></dialog>}
 </section>;
}
