import React,{useState} from 'react';
import {Capacitor} from '@capacitor/core';
import {demoRewardedAd,withdrawAdConsent,declineAds,reconsiderAds} from './admob';
export default function AdPrivacyControl({client,tier}){
 const [notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 if(import.meta.env.VITE_ADMOB_TEST_ENABLED!=='true'||tier!=='free'||!Capacitor.isNativePlatform())return null;
 async function act(fn){setBusy(true);try{await fn();setNotice('Annonce de démonstration : aucun crédit payant ni impression commerciale.');}catch{setNotice('Publicité indisponible ou refusée. Free reste accessible.');}finally{setBusy(false);}}
 return <section><h3>Publicité · validation uniquement</h3><p>Les annonces sont facultatives. Refuser le suivi ne change pas ton accès Free.</p><button disabled={busy} onClick={()=>act(()=>demoRewardedAd(client))}>Tester une vidéo facultative</button><button disabled={busy} onClick={async()=>{await declineAds();setNotice('Publicité refusée. Free reste accessible.');}}>Refuser les publicités</button><button disabled={busy} onClick={async()=>{await reconsiderAds();setNotice('Ton choix est réouvert. Le consentement sera vérifié avant tout test vidéo.');}}>Revoir mon choix</button><button disabled={busy} onClick={()=>act(withdrawAdConsent)}>Retirer mon consentement publicitaire</button>{notice&&<p role="status">{notice}</p>}</section>;
}
