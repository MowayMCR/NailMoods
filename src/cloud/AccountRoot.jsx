import React, { useEffect, useRef, useState } from 'react';
import Sheet from '../Sheet';
import { StorageContext } from '../StorageContext';
import { browserStorage } from '../storage';
import { getCloudClient } from './client';
import { createAuthService } from './auth';
import { personalWorkspace, repository } from './repository';
import { createAccountStore, readGuest, guestCount } from './store';
import './account.css';
import { recordCloudEvent } from './diagnostics';
import IdentityPanel from '../identity/IdentityPanel';
import PrivacyPanel, { LegalLinks } from '../privacy/PrivacyPanel';
import { readGuestConsent } from '../privacy/policy';
import { clearAccountCache } from '../privacy/service';

let client=null,configurationError=false;
try{client=getCloudClient();}catch{configurationError=true;}
const service=client?createAuthService(client,window.location.href):null;
function authMessage(error){
  const code=error?.code;
  if(code==='invalid_credentials')return 'Email ou mot de passe incorrect.';
  if(code==='email_not_confirmed')return 'Confirme ton adresse avec le lien reçu par email, puis connecte-toi.';
  if(code==='weak_password')return 'Choisis un mot de passe plus long et moins courant.';
  if(code==='over_email_send_rate_limit' || code==='over_request_rate_limit')return 'Trop de demandes rapprochées. Patiente avant de réessayer.';
  return 'La connexion n’a pas abouti. Vérifie ton réseau puis réessaie. Si le lien reçu a expiré, demande un nouvel email.';
}
export default function AccountRoot({App}){
  const [session,setSession]=useState(undefined),[loaded,setLoaded]=useState(null),[loadError,setLoadError]=useState('');
  const [status,setStatus]=useState({kind:'saved',pending:0}),[retry,setRetry]=useState(0),[revision,setRevision]=useState(0);
  const [open,setOpen]=useState(false),[mode,setMode]=useState('login'),[email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[authError,setAuthError]=useState(''),[guestOverride,setGuestOverride]=useState(false),[confirmRemote,setConfirmRemote]=useState(false);
  const [termsAccepted,setTermsAccepted]=useState(false);
  const active=useRef(null), mounted=useRef(true);
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
    active.current?.close();active.current=null;setLoaded(null);setLoadError('');
    if(!userId || guestOverride)return;
    (async()=>{
      try{
        const {data,error}=await client.auth.getUser();
        if(error || data.user?.id!==userId)throw new Error('La session n’a pas pu être vérifiée. Réessaie ou reconnecte-toi.');
        const workspace=await personalWorkspace(client,userId);if(cancelled)return;
        store=createAccountStore({storage:browserStorage,repo:repository(client,userId,workspace.id),userId,workspaceId:workspace.id,onStatus:next=>{if(!cancelled){setStatus(next);if(next.kind==='error'||next.kind==='saved')recordCloudEvent(browserStorage,'sync',next.kind==='saved');}}});
        active.current=store;
        try{await store.load();}catch(error){
          if(!store.hasCache)throw error;
          setStatus({kind:'error',pending:store.pending,message:'Les données distantes ne sont pas accessibles. Voici la copie de ce compte sur cet appareil. Réessaie pour synchroniser.'});
        }
        if(cancelled){store.close();return;}
        setLoaded({store,workspace,userId});
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
        else setMessage('Si cette adresse peut être inscrite, un email de confirmation va arriver. Ouvre le lien dans ce navigateur, puis connecte-toi.');
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
  async function logout(){setBusy(true);setAuthError('');try{await service.signOut();setSession(null);setPassword('');setOpen(false);setGuestOverride(false);}catch(error){setAuthError(authMessage(error));}finally{setBusy(false);}}
  async function migrate(){setBusy(true);setAuthError('');try{
    const guest=readGuest(browserStorage);
    const done=await loaded.store.migrate(guest);
    setRevision(v=>v+1);recordCloudEvent(browserStorage,'migration',done);setMessage(done?'Import terminé. La copie invitée est conservée sur cet appareil.':'Import conservé sur cet appareil, synchronisation à reprendre.');
  }catch(error){setAuthError(error.message || 'L’import n’a pas abouti. Les données invitées sont conservées.');}finally{setBusy(false);}}
  function exportDraft(){
    const blob=new Blob([JSON.stringify(loaded.store.exportDraft(),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='nailmoods-copie-locale.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  async function useRemote(){setBusy(true);setAuthError('');try{await loaded.store.load({useRemote:true});setConfirmRemote(false);setRevision(v=>v+1);setMessage('La version en ligne est chargée. La copie précédente reste conservée sur cet appareil.');}catch{setAuthError('Impossible de recharger. Ta copie locale reste conservée.');}finally{setBusy(false);}}
  async function accountDeleted(id){
    active.current?.close();active.current=null;setLoaded(null);
    clearAccountCache(window.localStorage,id);
    try{await service.signOut();}finally{setSession(null);setGuestOverride(false);setOpen(false);window.location.reload();}
  }
  let count=0,guestInvalid=false;try{count=guestCount(readGuest(browserStorage));}catch{guestInvalid=true;}
  const ready=loaded?.userId===userId && !guestOverride;
  const guest=!userId || guestOverride;
  const label=ready?(loaded.store.profile?.display_name || session.user.email || 'Mon compte'):'Mode invité';
  const accountAccess=<aside className="accountBar" aria-label="Compte et synchronisation">
    <button type="button" onClick={()=>{setMode(userId?'account':'login');setOpen(true);setAuthError('');setMessage('');}}>{label}<span>{ready?loaded.workspace.name || 'Espace personnel':userId?'Mon compte':'Se connecter'}</span></button>
    {ready && count>0 && !loaded.store.migrationDone && <button type="button" onClick={()=>{setMode('account');setOpen(true);}}>Importer mes données invitées</button>}
    {ready && <span role="status">{status.kind==='saving'?'Enregistrement…':status.kind==='error'?'À synchroniser':status.pending?'En attente':'Synchronisé'}</span>}
    {ready && status.kind==='error' && <div className="accountNotice" role="alert"><p>{status.message}</p><button onClick={()=>loaded.store.pending?void loaded.store.flush():setRetry(v=>v+1)}>Réessayer</button><button onClick={()=>{setMode('account');setOpen(true);}}>Mon compte</button></div>}
  </aside>;
  return <>
    {guestOverride || (session!==undefined && (guest || ready)) || !service ? <StorageContext.Provider value={ready?loaded.store.storage:browserStorage}><App key={ready?userId+':'+loaded.workspace.id+':'+revision:'guest'} accountAccess={service?accountAccess:null} profileExtras={<><IdentityPanel key={'identity:'+(userId || 'guest')} client={client} userId={userId} onSaved={()=>setRetry(v=>v+1)}/><PrivacyPanel key={userId || 'guest'} client={client} userId={userId} tier={loaded?.store.profile?.account_tier} guestStorage={browserStorage} localDraft={()=>loaded?.store.exportDraft() || readGuest(browserStorage)} onDeleted={accountDeleted}/></>}/></StorageContext.Provider> : <main className="accountLoading"><h1>NailMoods</h1><p role="status">{loadError || 'Ouverture de ton espace…'}</p>{loadError && <button onClick={()=>setRetry(v=>v+1)}>Réessayer</button>}<button onClick={()=>setGuestOverride(true)}>Continuer en mode invité</button>{userId && <button onClick={logout}>Se déconnecter</button>}</main>}
    {configurationError && <p role="alert">Le compte est temporairement indisponible. Le mode invité reste accessible.</p>}
    {open && service && <Sheet title={mode==='signup'?'Créer mon compte':mode==='recovery'?'Retrouver mon compte':mode==='password'?'Nouveau mot de passe':userId?'Mon compte':'Se connecter'} onClose={()=>{if(!busy){setOpen(false);setPassword('');}}} className="accountSheet">
      {mode==='account' && userId ? <>
        <p>{session.user.email}</p><p>{ready?loaded.workspace.name || 'Espace personnel':'Espace personnel'}</p>
        {guestOverride && <button onClick={()=>{setGuestOverride(false);setOpen(false);}}>Ouvrir mon espace connecté</button>}
        {ready && <>
          <p>Compte {loaded.store.profile?.account_tier || 'free'} · {status.pending?`${status.pending} modification(s) en attente`:'Données synchronisées'}</p>
          {count>0 && !loaded.store.migrationDone && <section className="accountImport"><h3>Importer mes données actuelles dans mon compte ?</h3><p>{count} élément(s) trouvé(s) dans le mode invité sur cet appareil. Les données déjà présentes dans ton compte seront conservées.</p><button disabled={busy} onClick={migrate}>Importer mes données</button><p>Tu peux aussi fermer cette fenêtre et le faire plus tard.</p></section>}
          {guestInvalid && <p role="alert">Certaines données invitées sont illisibles. Elles sont conservées ; l’import n’a pas été lancé.</p>}
          {loaded.store.migrationDone && <p>Les données invitées ont été importées. Leur copie locale est conservée.</p>}
          <button disabled={busy || status.pending>0} onClick={()=>{setRetry(v=>v+1);setOpen(false);}}>Actualiser depuis mon compte</button>
          {status.kind==='error' && <section><button disabled={busy} onClick={exportDraft}>Télécharger ma copie locale</button><button disabled={busy} onClick={()=>setConfirmRemote(true)}>Utiliser la version en ligne</button>{confirmRemote && <><p>Les changements en attente ne seront pas envoyés. Une sauvegarde locale sera conservée ; télécharge-la pour pouvoir la consulter.</p><button disabled={busy} onClick={useRemote}>Confirmer le rechargement</button><button onClick={()=>setConfirmRemote(false)}>Annuler</button></>}</section>}
          {status.pending>0 && <p>Les modifications en attente resteront sur cet appareil après déconnexion. Reconnecte-toi ici pour les synchroniser.</p>}
        </>}
        <button disabled={busy} onClick={()=>changeMode('password')}>Changer mon mot de passe</button><button disabled={busy} onClick={logout}>Se déconnecter</button>
      </> : <form onSubmit={submit}>
        <p>Retrouve ta collection, tes inspirations et ton journal sur tes appareils. Tu peux aussi continuer sans compte.</p>
        {mode!=='password' && <label>Email<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy}/></label>}
        {mode!=='recovery' && <label>Mot de passe<input type="password" autoComplete={mode==='login'?'current-password':'new-password'} minLength={mode==='login'?1:8} required value={password} onChange={e=>setPassword(e.target.value)} disabled={busy}/></label>}
        <LegalLinks/>
        {mode==='signup' && <label className="consentCheck"><input type="checkbox" required checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} disabled={busy}/>J’accepte les Conditions d’utilisation</label>}
        <button className="accountPrimary" disabled={busy || (mode==='signup' && !termsAccepted)}>{busy?'En cours…':mode==='signup'?'Créer mon compte':mode==='recovery'?'Recevoir un lien':mode==='password'?'Enregistrer le mot de passe':'Se connecter'}</button>
        {mode==='login' && <><button type="button" disabled={busy} onClick={()=>changeMode('signup')}>Créer mon compte</button><button type="button" disabled={busy} onClick={()=>changeMode('recovery')}>Mot de passe oublié</button></>}
        {(mode==='signup' || mode==='recovery') && <button type="button" disabled={busy} onClick={()=>changeMode('login')}>J’ai déjà un compte</button>}
        <button type="button" disabled={busy} onClick={()=>{setOpen(false);setPassword('');}}>Continuer à explorer</button>
      </form>}
      {message && <p role="status">{message}</p>}{authError && <p className="formError" role="alert">{authError}</p>}
    </Sheet>}
  </>;
}
