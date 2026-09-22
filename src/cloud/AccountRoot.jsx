import { createAnalytics, setActiveAnalytics, track } from '../analytics/analytics';
import { PRIVACY_VERSION } from '../privacy/policy';
import Discovery from '../social/Discovery';
import SocialHub from '../social/SocialHub';
import { SocialProvider } from '../social/SocialContext';
import AccountAvatar from '../identity/AccountAvatar';
import React, { useEffect, useRef, useState } from 'react';
import Sheet from '../Sheet';
import { StorageContext } from '../StorageContext';
import { browserStorage } from '../storage';
import { getCloudClient } from './client';
import { createAuthService } from './auth';
import { personalWorkspace, repository } from './repository';
import { createAccountStore, readGuest, guestCount } from './store';
import { createMediaStorage } from './mediaStorage';
import './account.css';
import { recordCloudEvent } from './diagnostics';
import {cacheError} from './cache/index';
import ProfessionalProfilePanel from '../workspaces/ProfessionalProfilePanel';
import IdentityPanel from '../identity/IdentityPanel';
import PrivacyPanel, { LegalLinks } from '../privacy/PrivacyPanel';
import { readGuestConsent } from '../privacy/policy';
import { clearAccountCache } from '../privacy/service';
import AccountOfferPanel from './AccountOfferPanel';
import { PoReceivedShares, ShareToPoSheet } from '../social/PoShare';
import StaffJournal from '../support/StaffJournal';
import {supportCall} from '../support/service';
import {accountOfferService,clearPendingAccountOffer,pendingAccountOffer} from './betaTier';

let client=null,configurationError=false;
try{client=getCloudClient();}catch{configurationError=true;}
const service=client?createAuthService(client,window.location.href):null;
function authMessage(error){
  const code=error?.code;
  if(error?.message?.includes('accessible à partir de 15 ans'))return error.message;
  if(code==='invalid_credentials')return 'Email ou mot de passe incorrect.';
  if(code==='email_not_confirmed')return 'Confirme ton adresse avec le lien reçu par email, puis connecte-toi.';
  if(code==='weak_password')return 'Choisis un mot de passe plus long et moins courant.';
  if(['over_email_send_rate_limit','over_request_rate_limit','email_rate_limit_exceeded'].includes(code))return 'Un email a déjà été demandé récemment. Patiente une minute avant de réessayer et vérifie aussi les courriers indésirables.';
  if(['email_exists','user_already_exists'].includes(code))return 'Un compte existe déjà avec cette adresse. Connecte-toi ou renvoie le mail de confirmation.';
  if(code==='signup_disabled')return 'La création de compte est temporairement désactivée.';
  if(error?.name==='AuthRetryableFetchError' || error?.status===0)return 'Le service d’inscription est momentanément inaccessible. Réessaie dans quelques instants.';
  return 'La demande n’a pas abouti. Réessaie dans quelques instants.';
}
export default function AccountRoot({App}){
  const [themeStyle,setThemeStyle]=useState({});
  const [session,setSession]=useState(undefined),[loaded,setLoaded]=useState(null),[loadError,setLoadError]=useState('');
  const [status,setStatus]=useState({kind:'saved',pending:0}),[retry,setRetry]=useState(0),[revision,setRevision]=useState(0),[mediaMigration,setMediaMigration]=useState(null);
  const [open,setOpen]=useState(false),[mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [accountSection,setAccountSection]=useState('summary');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[authError,setAuthError]=useState(''),[guestOverride,setGuestOverride]=useState(false),[confirmRemote,setConfirmRemote]=useState(false);
  const [confirmCacheClear,setConfirmCacheClear]=useState(false);
  const [shareRequest,setShareRequest]=useState(null);
  const [staffMode,setStaffMode]=useState(false),[staffEligible,setStaffEligible]=useState(false);
  const [suspension,setSuspension]=useState(false);
  const [termsAccepted,setTermsAccepted]=useState(false);
  const active=useRef(null), mounted=useRef(true), analytics=useRef(null);
  const userId=session?.user?.id || null;
  useEffect(()=>{
    mounted.current=true;
    if(!service){setSession(null);return;}
    let cancelled=false,booting=true;
    const unsubscribe=service.subscribe((event,next)=>{
      if(cancelled || booting)return;
      if(event==='PASSWORD_RECOVERY'){setMode('password');setOpen(true);}
      setSession(next);
    });
    (async()=>{
      try{
        const callback=await service.completeCallback(window.location.href);
        if(cancelled)return;
        if(callback){window.history.replaceState(null,'',callback.cleanUrl);if(callback.recovery){setMode('password');setOpen(true);}}
        const restored=await service.restore();if(!cancelled)setSession(restored.session);
      }catch(error){if(!cancelled){setSession(null);setAuthError(authMessage(error));setOpen(true);}}
      finally{booting=false;}
    })();
    return ()=>{cancelled=true;mounted.current=false;unsubscribe();active.current?.close();};
  },[]);
  useEffect(()=>{
    let cancelled=false,store;
    active.current?.close();active.current=null;setLoaded(null);setLoadError('');setMediaMigration(null);setSuspension(false);
    if(!userId || guestOverride)return;
    (async()=>{
      try{
        const {data,error}=await client.auth.getUser();
        if(error || data.user?.id!==userId)throw new Error('La session n’a pas pu être vérifiée. Réessaie ou reconnecte-toi.');
        const access=await client.rpc('nm_account_access');
        if(access.error)throw access.error;
        if(access.data?.suspended){if(!cancelled)setSuspension(true);return;}
        const workspace=await personalWorkspace(client,userId);if(cancelled)return;
        const media=createMediaStorage(client,{userId});
        store=createAccountStore({storage:browserStorage,repo:repository(client,userId,workspace.id),userId,workspaceId:workspace.id,media,onStatus:next=>{if(!cancelled){setStatus(next);if(next.kind==='error'||next.kind==='saved')recordCloudEvent(browserStorage,'sync',next.kind==='saved');}}});
        active.current=store;
        try{await store.load();const mediaStats=await store.migrateMedia();if(!cancelled)setMediaMigration(mediaStats);}catch(error){
          if(!store.hasCache)throw error;
          setStatus({kind:'error',pending:store.pending,message:'Les données distantes ne sont pas accessibles. Voici la copie de ce compte sur cet appareil. Réessaie pour synchroniser.'});
        }
        if(cancelled){store.close();return;}
        setLoaded({store,workspace,userId,media});
        if(store.pending)void store.flush();
      }catch(error){if(!cancelled)setLoadError(error.message || 'Ton espace n’a pas pu être chargé. Réessaie.');}
    })();
    return ()=>{cancelled=true;store?.close();};
  },[userId,retry,guestOverride]);
  useEffect(()=>{
    if(!loaded)return;
    const online=()=>void loaded.store.flush();window.addEventListener('online',online);
    return ()=>window.removeEventListener('online',online);
  },[loaded]);
  function changeMode(next){setTermsAccepted(false);setMode(next);setMessage('');setAuthError('');setPassword('');}
  async function submit(event){
    event.preventDefault();setBusy(true);setMessage('');setAuthError('');
    try{
      if(mode==='signup'){
        const data=await service.signUp(email,password,termsAccepted,readGuestConsent(browserStorage) || {});setPassword('');
        if(data.session){setSession(data.session);setGuestOverride(false);setOpen(false);}
        else {setMode('confirm');setMessage('Email de confirmation demandé. Vérifie ta boîte de réception et les courriers indésirables, puis ouvre le lien dans ce navigateur.');}
      }else if(mode==='confirm'){
        await service.resendSignupConfirmation(email);setMessage('Un nouveau mail de confirmation a été demandé. Vérifie ta boîte de réception et les courriers indésirables.');
      }else if(mode==='recovery'){
        await service.requestRecovery(email);setMessage('Si un compte correspond à cette adresse, tu recevras un lien pour choisir un nouveau mot de passe. Ouvre-le dans ce navigateur.');
      }else if(mode==='password'){
        await service.updatePassword(password);setPassword('');setMessage('Ton mot de passe a été mis à jour.');setMode('account');
      }else{
        const data=await service.signIn(email,password);setPassword('');setSession(data.session);setGuestOverride(false);setOpen(false);
      }
    recordCloudEvent(browserStorage,mode,true);
    }catch(error){recordCloudEvent(browserStorage,mode,false);setAuthError(authMessage(error));}finally{if(mounted.current)setBusy(false);}
  }
  async function logout(){setBusy(true);setAuthError('');try{track('logout');void analytics.current?.flush();await active.current?.ensureDurable();await service.signOut();setSession(null);setPassword('');setOpen(false);setGuestOverride(false);}catch(error){setAuthError(error.code==='quota'||error.code==='cache_unavailable'?cacheError(error).message:authMessage(error));}finally{setBusy(false);}}
  async function migrate(){setBusy(true);setAuthError('');try{
    if(import.meta.env.VITE_BETA_ACCOUNT_TIERS==='true' && loaded.store.profile?.account_tier==='free')throw new Error('L’import dans la collection est disponible avec Plus. Ta copie invitée reste conservée.');
    const guest=readGuest(browserStorage);
    const done=await loaded.store.migrate(guest);
    setRevision(v=>v+1);recordCloudEvent(browserStorage,'migration',done);setMessage(done?'Import terminé. La copie invitée est conservée sur cet appareil.':'La synchronisation de l’import reste à reprendre. La copie invitée est conservée.');
  }catch(error){setAuthError(error.message || 'L’import n’a pas abouti. Les données invitées sont conservées.');}finally{setBusy(false);}}
  async function migrateMediaNow(){setBusy(true);setAuthError('');try{const stats=await loaded.store.migrateMedia();setMediaMigration(stats);setMessage(stats.remaining===0?'Les médias historiques sont à jour.':'La migration média reste à terminer ; aucune ancienne donnée n’a été supprimée.');}catch(error){setAuthError(error.message || 'La migration média n’a pas abouti. Les anciennes données sont conservées.');}finally{setBusy(false);}}
  function exportDraft(){
    const blob=new Blob([JSON.stringify(loaded.store.exportDraft(),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='nailmoods-copie-locale.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function useRemote(){setBusy(true);setAuthError('');try{await loaded.store.load({useRemote:true});setConfirmRemote(false);setRevision(v=>v+1);setMessage('La version en ligne est chargée. La copie précédente reste conservée sur cet appareil.');}catch{setAuthError('Impossible de recharger. Ta copie locale reste conservée.');}finally{setBusy(false);}}
  async function clearCache(){setBusy(true);setAuthError('');try{await loaded.store.clearCache();setConfirmCacheClear(false);setMessage('Le cache de ce compte est nettoyé. Les données en ligne et la copie invitée sont conservées.');}catch(error){setAuthError(error.message);}finally{setBusy(false);}}
  useEffect(()=>{
    if(!status.pending && status.kind!=='saving')return;
    const warn=event=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);
    return ()=>window.removeEventListener('beforeunload',warn);
  },[status.pending,status.kind]);
  async function accountDeleted(id){
    active.current?.close();active.current=null;setLoaded(null);
    clearAccountCache(window.localStorage,id);
    try{await service.signOut();}finally{setSession(null);setGuestOverride(false);setOpen(false);window.location.reload();}
  }
  let count=0,guestInvalid=false;try{count=guestCount(readGuest(browserStorage));}catch{guestInvalid=true;}
  const ready=loaded?.userId===userId && !guestOverride;
  const guest=!userId || guestOverride;
  useEffect(()=>{
    let cancelled=false;
    if(!ready||!client||!userId){setStaffMode(false);setStaffEligible(false);return;}
    supportCall(client,'status').then(result=>{if(!cancelled)setStaffEligible(result?.staff===true);}).catch(()=>{if(!cancelled)setStaffEligible(false);});
    return()=>{cancelled=true;};
  },[ready,client,userId]);
  useEffect(()=>{const changed=()=>setRetry(v=>v+1);window.addEventListener('nm-consent-changed',changed);return()=>window.removeEventListener('nm-consent-changed',changed);},[]);
  useEffect(()=>{
    let cancelled=false;analytics.current?.stop();analytics.current=null;setActiveAnalytics(null);
    if(!ready||!client||!userId)return;
    (async()=>{const {data}=await client.from('user_consents').select('analytics_consent,privacy_version').eq('user_id',userId).order('event_id',{ascending:false}).limit(1).maybeSingle();
      if(cancelled)return;const enabled=data?.analytics_consent===true&&data?.privacy_version===PRIVACY_VERSION;
      analytics.current=createAnalytics({client,enabled,workspaceType:loaded.workspace?.kind||'personal',appVersion:import.meta.env.VITE_APP_VERSION||'0.1.0'});setActiveAnalytics(analytics.current);
    })();return()=>{cancelled=true;analytics.current?.stop();analytics.current=null;setActiveAnalytics(null);};
  },[ready,userId,loaded?.workspace?.id,retry]);
  useEffect(()=>{
    if(!ready||!userId)return;
    const pending=pendingAccountOffer(browserStorage,userId);if(!pending)return;
    let cancelled=false;
    (async()=>{try{
      await accountOfferService(client).choose(pending.tier);
      clearPendingAccountOffer(browserStorage);
      if(cancelled)return;
      await loaded.store.load();setRevision(value=>value+1);
    }catch{/* Le choix reste disponible dans Profil → Mon offre. */}})();
    return()=>{cancelled=true;};
  },[ready,userId,loaded?.workspace?.id]);
  const label=ready?(loaded.store.profile?.display_name || session.user.email || 'Mon compte'):'Mode invité';
  const syncNotice=ready && status.kind==='error' && <div className="accountNotice" role="alert"><p>{status.message}</p><button onClick={()=>(loaded.store.pending || ['quota','cache_unavailable'].includes(status.code))?void loaded.store.flush():setRetry(v=>v+1)}>Réessayer</button><button onClick={()=>{setMode('account');setOpen(true);}}>Mon compte</button></div>;
  const accountAccess=<aside className="accountBar accountProfileCard" aria-label="Compte et synchronisation">
    <div className="accountProfileIntro"><small>MON COMPTE</small><h2>{label}</h2><p>{ready ? (loaded.workspace.name || 'Espace personnel') : userId ? 'Ton compte est connecté. Retrouve ton espace personnel.' : 'Explore librement. Connecte-toi pour retrouver tes données sur tes appareils.'}</p></div>
    <button className="accountConnect" type="button" onClick={()=>{setMode(userId?'account':'login');setAccountSection('summary');setOpen(true);setAuthError('');setMessage('');}}>{ready?'Gérer mon compte':userId?'Ouvrir mon compte':'Se connecter'}</button>
    {ready && count>0 && !loaded.store.migrationDone && <button type="button" onClick={()=>{setMode('account');setOpen(true);}}>Importer mes données invitées</button>}
    {ready && <span role="status">{status.kind==='saving'?'Enregistrement…':status.kind==='error'?'À synchroniser':status.pending?'En attente':'Synchronisé'}</span>}
    {syncNotice}
  </aside>;
  const staffSwitch=ready&&staffEligible&&<section className="accountStaffSwitch"><small>ESPACE INTERNE</small><h3>Journal staff</h3><p>Traite les demandes de support et les signalements, puis reviens à ton profil pour continuer tes tests utilisatrice.</p><button type="button" onClick={()=>setStaffMode(true)}>Ouvrir le Journal staff</button></section>;
  return <div className="accountTheme" style={themeStyle}>
    {suspension?<main className="accountLoading"><h1>Compte suspendu</h1><p>Ton accès à NailMoods est temporairement suspendu. Si tu penses qu’il s’agit d’une erreur, contacte l’équipe à contact@nailmoods.com.</p><button onClick={logout}>Se déconnecter</button></main>:<>
    {guestOverride || (session!==undefined && (guest || ready)) || !service ? <StorageContext.Provider value={ready?loaded.store.storage:browserStorage}><SocialProvider key={ready?userId:"guest"} client={ready?client:null} userId={ready?userId:null} tier={ready?loaded.store.profile?.account_tier:"free"}>{staffMode?<StaffJournal client={client} onExit={()=>setStaffMode(false)} onSignOut={logout}/>:<><App onThemeChange={setThemeStyle} key={ready?userId+':'+loaded.workspace.id+':'+revision:'guest'} accountAccess={service?accountAccess:null} appearanceExtras={ready?<AccountAvatar client={client} userId={userId} workspaceId={loaded?.workspace.id}/>:null} syncNotice={syncNotice} media={ready?loaded.media:null} onShareToPro={ready && ['plus','pro'].includes(loaded.store.profile?.account_tier) ? request=>setShareRequest(request) : null} identityExtras={ready?<IdentityPanel key={'identity:'+(userId || 'guest')} client={client} userId={userId} onSaved={()=>setRetry(v=>v+1)}/>:null} profileExtras={<>{ready&&<AccountOfferPanel key={'offer:'+userId} client={client} userId={userId} store={loaded.store} onApplied={async()=>{await loaded.store.load();setRevision(v=>v+1);}}/>}{ready&&<SocialHub client={client}/>} {staffSwitch}<ProfessionalProfilePanel key={'professional:'+(userId || 'guest')} client={client} userId={userId} tier={loaded?.store.profile?.account_tier}/>{ready&&loaded?.store.profile?.account_tier==='pro'&&<PoReceivedShares client={client}/>}<PrivacyPanel key={userId || 'guest'} client={client} userId={userId} tier={loaded?.store.profile?.account_tier} guestStorage={browserStorage} localDraft={()=>loaded?.store.exportDraft() || readGuest(browserStorage)} onDeleted={accountDeleted}/></>}/>{shareRequest&&<ShareToPoSheet client={client} media={loaded.media} userId={userId} workspaceId={loaded.workspace.id} source={shareRequest.source} type={shareRequest.type} onClose={()=>setShareRequest(null)}/>}</>}</SocialProvider></StorageContext.Provider> : <main className="accountLoading"><h1>NailMoods</h1><p role="status">{loadError || 'Ouverture de ton espace…'}</p>{loadError && <button onClick={()=>setRetry(v=>v+1)}>Réessayer</button>}<button onClick={()=>setGuestOverride(true)}>Continuer en mode invité</button>{userId && <button onClick={logout}>Se déconnecter</button>}</main>}
    {configurationError && <p role="alert">Le compte est temporairement indisponible. Le mode invité reste accessible.</p>}
    {open && service && <Sheet title={mode==='signup'?'Créer mon compte':mode==='confirm'?'Confirmer mon adresse':mode==='recovery'?'Retrouver mon compte':mode==='password'?'Nouveau mot de passe':userId?'Mon compte':'Se connecter'} onClose={()=>{if(!busy){setOpen(false);setPassword('');}}} className="accountSheet">
      {mode==='account' && userId ? accountSection==='privacy' ? <PrivacyPanel embedded client={client} userId={userId} tier={loaded?.store.profile?.account_tier} guestStorage={browserStorage} localDraft={()=>loaded?.store.exportDraft() || readGuest(browserStorage)} onDeleted={accountDeleted} onBack={()=>setAccountSection('summary')}/> : <>
        <p>{session.user.email}</p><p>{ready?loaded.workspace.name || 'Espace personnel':'Espace personnel'}</p>
        {guestOverride && <button onClick={()=>{setGuestOverride(false);setOpen(false);}}>Ouvrir mon espace connecté</button>}
        {ready && <>
          <p>Compte {loaded.store.profile?.account_tier || 'free'} · {status.kind==='error'?'À synchroniser':status.pending?`${status.pending} modification(s) en attente`:'Données synchronisées'}</p>
          <button onClick={()=>{setOpen(false);setTimeout(()=>document.getElementById('account-offer')?.scrollIntoView({behavior:'smooth',block:'start'}),50);}}>Voir ou changer mon offre</button>
          {count>0 && !loaded.store.migrationDone && <section className="accountImport"><h3>Importer mes données actuelles dans mon compte ?</h3><p>{count} élément(s) trouvé(s) dans le mode invité sur cet appareil. Les données déjà présentes dans ton compte seront conservées.</p><button disabled={busy} onClick={migrate}>Importer mes données</button><p>Tu peux aussi fermer cette fenêtre et le faire plus tard.</p></section>}
          {guestInvalid && <p role="alert">Certaines données invitées sont illisibles. Elles sont conservées ; l’import n’a pas été lancé.</p>}
          {loaded.store.migrationDone && <p>Les données invitées ont été importées. Leur copie locale est conservée.</p>}
          {mediaMigration && <section className="accountImport" aria-label="Migration des médias historiques"><h3>Médias historiques</h3><p>Détectés : {mediaMigration.detected} · Migrés : {mediaMigration.migrated} · Échecs : {mediaMigration.failed} · Restants : {mediaMigration.remaining}</p>{mediaMigration.remaining>0 && <button disabled={busy} onClick={migrateMediaNow}>Relancer la migration média</button>}</section>}
          <button disabled={busy || status.pending>0} onClick={()=>{setRetry(v=>v+1);setOpen(false);}}>Actualiser depuis mon compte</button>
          {status.kind==='error' && <section><button disabled={busy || status.pending>0} onClick={()=>setConfirmCacheClear(true)}>Nettoyer le cache local</button>{confirmCacheClear && <><p>Nettoyer uniquement le cache reconstituable de ce compte ? Tes données en ligne, ta copie invitée et tes sauvegardes restent conservées.</p><button disabled={busy} onClick={clearCache}>Confirmer le nettoyage</button><button onClick={()=>setConfirmCacheClear(false)}>Annuler</button></>}<button disabled={busy} onClick={exportDraft}>Télécharger ma copie locale</button><button disabled={busy} onClick={()=>setConfirmRemote(true)}>Utiliser la version en ligne</button>{confirmRemote && <><p>Les changements en attente ne seront pas envoyés. Une sauvegarde locale sera conservée ; télécharge-la pour pouvoir la consulter.</p><button disabled={busy} onClick={useRemote}>Confirmer le rechargement</button><button onClick={()=>setConfirmRemote(false)}>Annuler</button></>}</section>}
          {status.pending>0 && <p>Les modifications en attente resteront sur cet appareil après déconnexion. Reconnecte-toi ici pour les synchroniser.</p>}
        </>}
        <button disabled={busy} onClick={()=>setAccountSection('privacy')}>Confidentialité et mes données</button><button disabled={busy} onClick={()=>changeMode('password')}>Changer mon mot de passe</button><button disabled={busy} onClick={logout}>Se déconnecter</button>
      </> : <form onSubmit={submit}>
        <p>Retrouve ta collection, tes inspirations et ton journal sur tes appareils. Tu peux aussi continuer sans compte.</p>
        {mode!=='password' && <label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label>}
        {!['recovery','confirm'].includes(mode) && <label>Mot de passe<input type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='login'?1:8} required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>}
        {mode==='signup'&&<p className="accountHelp">Ton compte démarre en Free. Tu pourras choisir Plus ou Pro plus tard dans Profil → Mon offre, après confirmation de ton statut d’âge. Aucun paiement n’est demandé pendant la bêta.</p>}
        <LegalLinks/>
        {mode==='signup' && <><label className="consentCheck"><input type="checkbox" required checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} disabled={busy}/>J’accepte les Conditions d’utilisation</label><small>Les comptes Plus et Pro sont réservés aux personnes de 18 ans ou plus. Aucun paiement n’est actif pendant cette bêta.</small></>}
        <button className="accountPrimary" disabled={busy || (mode==='signup' && !termsAccepted)}>{busy?'En cours…':mode==='signup'?'Créer mon compte':mode==='confirm'?'Renvoyer le mail de confirmation':mode==='recovery'?'Recevoir un lien':mode==='password'?'Enregistrer le mot de passe':'Se connecter'}</button>
        {mode==='login' && <><button type="button" disabled={busy} onClick={()=>changeMode('signup')}>Créer mon compte</button><button type="button" disabled={busy} onClick={()=>changeMode('recovery')}>Mot de passe oublié</button></>}
        {['signup','recovery','confirm'].includes(mode) && <button type="button" disabled={busy} onClick={()=>changeMode('login')}>J’ai déjà un compte</button>}
        <button type="button" disabled={busy} onClick={()=>{setOpen(false);setPassword('');}}>Continuer à explorer</button>
      </form>}
      {message && <p role="status">{message}</p>}{authError && <p className="formError" role="alert">{authError}</p>}
    </Sheet>}</>}
  </div>;
}
