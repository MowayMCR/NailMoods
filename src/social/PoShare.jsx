import {poLoopEnabled} from './poLoop';
import PeopleSearch from '../identity/PeopleSearch';
import {useSocial} from './SocialContext';
import {messageId} from './messageState';
import {ShareDetails} from './ShareCard';
import {ReferenceImage} from '../PhotoReferences';
import {track} from '../analytics/analytics';
import { Conversation } from './SocialHub';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Send, Sparkles } from 'lucide-react';
import ContentImage from './ContentImage';
import Sheet from '../Sheet';
import { useStorage } from '../StorageContext';
import { comparePoShare, poShareService, shareSnapshot,prepareShareImages,shareImages,filterRecipients } from './poShareService';
import {readInspirations,saveProject,INSPIRATIONS_KEY} from '../inspirations';
import {receivedShareIdea} from './receivedShare';
import './po-share.css';

export function ShareToPoSheet({ client, media,userId,workspaceId,source, type, proposalRecipient=null,publicPublication=null,onClose }) {
  const social=useSocial();
  const [finding,setFinding]=useState(false);
  const service = useMemo(() => poShareService(client), [client]);
  const [canSave,setCanSave]=useState(false);
  const [includeNotes,setIncludeNotes]=useState(false),[includeImages,setIncludeImages]=useState(false);
  const snapshot = useMemo(() => shareSnapshot(source||{},type,{includeNotes,includeImages}),[source,type,includeNotes,includeImages]);
  useEffect(()=>{if(!publicPublication)track('share_to_pro_started',{});},[]);
  const attempt=useRef(null);
  const [conversation,setConversation]=useState(null);
  const [query,setQuery]=useState(''),[results,setResults]=useState([]),[selected,setSelected]=useState(proposalRecipient);
  const [step,setStep]=useState(proposalRecipient?'preview':'select'),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[notice,setNotice]=useState(''),[loadError,setLoadError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{
    if(proposalRecipient){setLoading(false);return;}
    let active=true;setLoading(true);setLoadError('');
    service.recipients({professionalsOnly:!publicPublication}).then(rows=>{if(active)setResults(rows);})
      .catch(()=>{if(active)setLoadError('Tes connexions ne sont pas accessibles pour le moment. Réessaie.');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[service,proposalRecipient,!!publicPublication,revision]);
  const visible=filterRecipients(results,query);
  async function send() {
    if (!selected||busy||step!=='preview') return;
    setBusy(true);setNotice('');
    try {
      const key=JSON.stringify([selected.user_id,selected.entity_id,publicPublication||snapshot,canSave]);
      if(attempt.current?.key!==key)attempt.current={key,id:messageId()};
      const clientId=attempt.current.id;
      if(publicPublication)await service.sharePublication(selected.user_id,publicPublication,clientId);
      else {
        const prepared=await prepareShareImages(snapshot,{media,userId,workspaceId});
        if(proposalRecipient)await service.proposal(selected.user_id,source.id||source.key,{...prepared,client_id:clientId,can_save:canSave});
        else await service.send(selected.entity_id,source.id||source.key,{...prepared,client_id:clientId});
      }
      setConversation(selected);
    } catch {setNotice('La fiche n’a pas été envoyée. Réessaie ; si votre connexion ou les droits ont changé, choisis une autre destinataire.');}
    finally {setBusy(false);}
  }
  if(finding)return <Sheet title={publicPublication?'Trouver une personne':'Trouver ma PO'} onClose={()=>{setFinding(false);setRevision(v=>v+1);}}><PeopleSearch client={client}/><button className="detailSecondary" onClick={()=>{setFinding(false);setRevision(v=>v+1);}}>Reprendre mon partage</button></Sheet>;
  if(conversation)return <Conversation client={client} peer={conversation} onClose={onClose}/>;
  const title=publicPublication?'Partager une publication':proposalRecipient?'Envoyer ma proposition':'Envoyer à ma PO';
  return <Sheet title={title} eyebrow="PARTAGE PRIVÉ" onClose={busy?()=>{}:onClose} className="poShareSheet">
    {step==='select'?<>
      <p>{publicPublication?'Choisis une personne parmi tes connexions acceptées.':'Choisis une PO parmi tes connexions acceptées.'}</p>
      <label className="poRecipientFilter">Filtrer mes connexions<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Nom ou @NailMoodsID" autoComplete="off"/></label>
      {loading?<p role="status">Chargement de tes connexions…</p>:loadError?<div role="alert"><p>{loadError}</p><button className="poSend" onClick={()=>setRevision(v=>v+1)}>Réessayer</button></div>:<>
        {!results.length?<div className="socialEmpty"><p>{publicPublication?'Aucune connexion acceptée pour le moment.':'Aucune PO disponible dans tes connexions acceptées.'}</p><button className="detailPrimary" onClick={()=>setFinding(true)}>{publicPublication?'Trouver une personne':'Trouver ma PO'}</button><button className="nmQuiet" onClick={()=>social?.setView('received')}>Voir mes invitations</button><button className="nmQuiet" onClick={()=>setRevision(v=>v+1)}>Actualiser mes connexions</button></div>:!visible.length?<p role="status">Aucune connexion ne correspond à ce filtre.</p>:<div className="poSearchResults" aria-label="Connexions acceptées">{visible.map(row=><button key={row.entity_id||row.user_id} onClick={()=>{setSelected(row);setNotice('');setStep('preview');}}><RecipientIdentity client={client} row={row}/><Check aria-hidden="true"/></button>)}</div>}
      </>}
    </>:<>
      <p>À</p><div className="poSelectedRecipient"><RecipientIdentity client={client} row={selected}/></div>
      {!proposalRecipient&&<button className="poChangeRecipient" disabled={busy} onClick={()=>{setStep('select');setNotice('');setRevision(v=>v+1);}}>Changer de destinataire</button>}
      <p>Vérifie l’aperçu, puis confirme l’envoi dans votre conversation privée.</p>
      {publicPublication?<><h3>{publicPublication.title||'Publication NailMoods'}</h3><ContentImage client={client} kind={publicPublication.kind} id={publicPublication.id} title={publicPublication.title} preview={publicPublication.preview}/><p>Le lien reste soumis aux droits de la publication. Si elle devient privée, elle ne sera plus accessible.</p></>:<>
        <label className="consentCheck"><input type="checkbox" disabled={busy} checked={includeNotes} onChange={e=>setIncludeNotes(e.target.checked)}/>Joindre mes notes privées</label>
        <label className="consentCheck"><input type="checkbox" disabled={busy} checked={includeImages} onChange={e=>setIncludeImages(e.target.checked)}/>Joindre mes photos de référence ({shareImages(source,type).length})</label>
        <ShareDetails client={client} snapshot={snapshot}/>
        {includeImages&&<div className="photoThumbs">{snapshot.images.map((p,i)=><ReferenceImage key={i} src={p.src} alt={'Photo qui sera jointe '+(i+1)}/>)}</div>}
        {proposalRecipient&&<label className="consentCheck"><input type="checkbox" disabled={busy} checked={canSave} onChange={e=>setCanSave(e.target.checked)}/>Autoriser l’enregistrement de cette composition dans ses projets</label>}
      </>}
      {notice&&<p className="poShareNotice" role="alert">{notice}</p>}
      <button className="poSend" disabled={busy} onClick={send}><Send/>{busy?'Envoi…':notice?'Réessayer l’envoi':'Confirmer et envoyer'}</button>
    </>}
  </Sheet>;
}
export function RecipientIdentity({client,row}) {
  return <span className="poRecipientIdentity">
    <span className="poRecipientAvatar" aria-hidden="true">{row.avatar_handle?<ContentImage client={client} kind="avatar" id={row.avatar_handle} title="Avatar"/>:null}<span>{(row.display_name||row.handle||'?')[0]}</span></span>
    <span className="poRecipientText"><b>{row.display_name||row.handle||'Connexion NailMoods'}</b><small>{row.handle?'@'+row.handle:'Identifiant non renseigné'}</small>{row.pro_handle&&<small>{row.workspace_name} · @{row.pro_handle}</small>}<strong className={'poProfileType '+(row.account_tier==='pro'?'professional':'')}>{row.profile_type||(row.account_tier==='pro'?'Pro':'Plus')}</strong></span>
  </span>;
}

export function PoReceivedShares({ client, shareIds }) {
  const storage = useStorage();
  const items = useMemo(() => { try { return JSON.parse(storage.getItem('nm-collection-v2') || '[]'); } catch { return []; } }, [storage]);
  const service = useMemo(() => poShareService(client), [client]);
  const [reply,setReply]=useState(null),[projectKeys,setProjectKeys]=useState({}),[libraryRevision,setLibraryRevision]=useState(0);
  const projects=useMemo(()=>{const lib=readInspirations(storage);return [...new Map([...(lib.projects||[]),...(lib.favorites||[])].map(i=>[i.key,i])).values()];},[storage,libraryRevision]);
  const [shares, setShares] = useState([]), [notice, setNotice] = useState('');
  useEffect(() => { let active = true; service.received().then(rows => { if (active) setShares(rows || []); }).catch(() => { if (active) setNotice('Les demandes clientes ne sont pas accessibles pour le moment.'); }); return () => { active = false; }; }, [service]);
  const visibleShares=shareIds?shares.filter(share=>shareIds.includes(share.id)):shares;
  if(reply)return <ShareToPoSheet client={client} media={storage.media} userId={storage.userId} workspaceId={storage.workspaceId} source={reply.source} type="inspiration" proposalRecipient={reply.peer} onClose={()=>setReply(null)}/>;
  function saveRequest(share){
    try{
      const saved=receivedShareIdea(share.snapshot,share.id);
      storage.setItem(INSPIRATIONS_KEY,JSON.stringify(saveProject(readInspirations(storage),saved)));
      window.dispatchEvent(new Event('nm-library-updated'));
      setProjectKeys(keys=>({...keys,[share.id]:saved.key}));setLibraryRevision(value=>value+1);
      setNotice('Demande enregistrée dans Mes poses → En cours. Elle reste privée dans ton espace PO.');
    }catch{setNotice('La demande ne peut pas être enregistrée pour le moment. Réessaie.');}
  }
  return <section className="card poInbox"><small>ESPACE PO</small><h2>Projets reçus</h2><p>Compare chaque inspiration à ta collection et à ton matériel.</p>{notice && <p className="formError" role="status">{notice}</p>}{!visibleShares.length && !notice && <p>Aucune inspiration reçue pour le moment.</p>}{visibleShares.map(share => { const comparison = comparePoShare(share.snapshot, items),projectKey=projectKeys[share.id]||''; return <article key={share.id}><div className="poInboxTitle"><Sparkles /><span><b>{share.snapshot.title}</b><small>Envoyé par @{share.sender_handle || 'cliente NailMoods'}</small></span></div><ShareDetails client={client} snapshot={share.snapshot} id={share.id}/><div className="poInboxColors">{share.snapshot.colors.map(color => <i key={color} style={{ background: color }} />)}</div><dl><div><dt>Disponible · référence identique</dt><dd>{comparison.available.length}</dd></div><div><dt>Alternatives proches</dt><dd>{comparison.alternatives.length}</dd></div><div><dt>Manquant</dt><dd>{comparison.missing.length}</dd></div><div><dt>À vérifier</dt><dd>{comparison.verify.length}</dd></div></dl><p>La faisabilité et la maîtrise de la technique restent à confirmer par la PO.</p>{comparison.owned.map((entry,index)=><p key={index}>Référence disponible : {entry.item.brand} {entry.item.name}</p>)}{comparison.alternatives.map((entry,index)=><p key={'alt'+index}>Alternative proche : {entry.item.brand} {entry.item.name} · compatibilité à confirmer</p>)}{comparison.verify.map((entry,index)=><p key={'verify'+index}>À vérifier : {entry.name}</p>)}{comparison.missing.length > 0 && <p>À prévoir : {comparison.missing.map(item => item.name).join(' · ')}</p>}{comparison.techniqueChecks.some(item => !item.available) && <p>Matériel à vérifier : {comparison.techniqueChecks.filter(item => !item.available).map(item => item.name).join(' · ')}</p>}{!poLoopEnabled()&&<><button className="poSaveRequest" onClick={()=>saveRequest(share)}>Enregistrer la demande</button><p className="poRequestHint">Enregistre-la d’abord pour répondre avec une proposition privée.</p><label>Ma proposition privée<select value={projectKey} onChange={e=>setProjectKeys(keys=>({...keys,[share.id]:e.target.value}))}><option value="">Choisir un projet ou favori</option>{projects.map(p=><option key={p.key} value={p.key}>{p.title}</option>)}</select></label><button className="poSend" disabled={!projects.some(p=>p.key===projectKey)} onClick={async()=>{try{setReply({source:projects.find(p=>p.key===projectKey),peer:await service.peer(share.id)});}catch{setNotice('Cette connexion n’est plus disponible.');}}}>Préparer une réponse</button></>}</article>; })}</section>;
}
