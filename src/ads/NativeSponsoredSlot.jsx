import React,{useEffect,useState} from 'react';
import {Capacitor} from '@capacitor/core';
// Layout preparation only. No ad SDK or commercial impression.
export default function NativeSponsoredSlot({client}){
 const [allowed,setAllowed]=useState(false);
 useEffect(()=>{let alive=true;if(import.meta.env.VITE_ADMOB_NATIVE_PREVIEW==='true'&&Capacitor.isNativePlatform())client.rpc('nm_ad_state',{p_platform:Capacitor.getPlatform()}).then(({data,error})=>{if(alive)setAllowed(!error&&data?.rights?.effectiveTier==='free'&&data?.config?.enabled===true&&data?.config?.testOnly===true);});return()=>{alive=false;};},[client]);
 if(!allowed)return null;
 return <aside aria-label="Emplacement sponsorisé de démonstration" className="nmSponsoredPreview"><small>Sponsorisé · aperçu de validation</small><p>Emplacement publicitaire natif. Aucune annonce n’est chargée.</p></aside>;
}
