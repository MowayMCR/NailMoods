import {messageId} from './messageState';
import {ShareDetails} from './ShareCard';
import {ReferenceImage} from '../PhotoReferences';
import {track} from '../analytics/analytics';
import { Conversation } from './SocialHub';
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search, Send, Sparkles } from 'lucide-react';
import Sheet from '../Sheet';
import { useStorage } from '../StorageContext';
import { comparePoShare, poShareService, shareSnapshot,prepareShareImages,shareImages } from './poShareService';
import './po-share.css';

export function ShareToPoSheet({ client, media,userId,workspaceId,source, type, proposalRecipient=null,onClose }) {
  const service = useMemo(() => poShareService(client), [client]);
  const [canSave,setCanSave]=useState(false);
  const [includeNotes,setIncludeNotes]=useState(false),[includeImages,setIncludeImages]=useState(false);
  const snapshot = useMemo(() => shareSnapshot(source,type,{includeNotes,includeImages}),[source,type,includeNotes,includeImages]);
  useEffect(()=>{track('share_to_pro_started',{});},[]);
  const [clientId]=useState(()=>messageId());
  const [conversation,setConversation]=useState(null);
  const [query, setQuery] = useState(''), [results, setResults] = useState([]), [selected, setSelected] = useState(proposalRecipient), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  async function search(event) { event.preventDefault(); setBusy(true); setNotice(''); try { const rows = await service.search(query); setResults(rows); if (!rows.length) setNotice('Aucune PO connectée trouvée. Ajoute d’abord ta PO dans Mes connexions.'); } catch { setNotice('La recherche n’est pas disponible pour le moment.'); } finally { setBusy(false); } }
  async function send() { if (!selected) return; setBusy(true); setNotice(''); try { const prepared=await prepareShareImages(snapshot,{media,userId,workspaceId});if(proposalRecipient)await service.proposal(selected.user_id,source.id||source.key,{...prepared,client_id:clientId,can_save:canSave});else await service.send(selected.entity_id, source.id || source.key, {...prepared,client_id:clientId}); setNotice('Envoyé à ta PO. Elle pourra comparer les couleurs et techniques à sa collection.');setConversation(selected); } catch { setNotice('L’envoi n’a pas abouti. Vérifie que vous utilisez toutes les deux un compte confirmé.'); } finally { setBusy(false); } }
  if(conversation)return <Conversation client={client} peer={conversation} onClose={onClose}/>;
  return <Sheet title={proposalRecipient?'Envoyer ma proposition':'Envoyer à ma PO'} eyebrow="PARTAGE PRIVÉ" onClose={onClose} className="poShareSheet">
    <p>Vérifie la fiche avant de l’envoyer. Ce partage reste privé entre vous.</p>
    <label className="consentCheck"><input type="checkbox" checked={includeNotes} onChange={e=>setIncludeNotes(e.target.checked)}/>Joindre mes notes privées</label>
    <label className="consentCheck"><input type="checkbox" checked={includeImages} onChange={e=>setIncludeImages(e.target.checked)}/>Joindre mes photos de référence ({shareImages(source,type).length})</label>
    <ShareDetails client={client} snapshot={snapshot}/>
    {includeImages&&<div className="photoThumbs">{snapshot.images.map((p,i)=><ReferenceImage key={i} src={p.src} alt={'Photo qui sera jointe '+(i+1)}/>)}</div>}
    {proposalRecipient?<><p>À @{proposalRecipient.handle}</p><label className="consentCheck"><input type="checkbox" checked={canSave} onChange={e=>setCanSave(e.target.checked)}/>Autoriser l’enregistrement de cette composition dans ses projets</label></>:<form onSubmit={search}><label>Choisir une PO connectée par son @identifiant<input value={query} onChange={event => setQuery(event.target.value)} placeholder="@ma-po" minLength="2" /></label><button disabled={busy || query.trim().length < 2}><Search />Rechercher</button></form>}
    <div className="poSearchResults">{results.map(row => <button key={row.entity_id} aria-pressed={selected?.entity_id === row.entity_id} onClick={() => setSelected(row)}><span><b>{row.display_name}</b><small>@{row.handle}</small></span>{selected?.entity_id === row.entity_id && <Check />}</button>)}</div>
    {notice && <p className="poShareNotice" role="status">{notice}</p>}
    <button className="poSend" disabled={!selected || busy || notice.startsWith('Envoyé')} onClick={send}><Send />Envoyer cette fiche</button>
  </Sheet>;
}

export function PoReceivedShares({ client }) {
  const storage = useStorage();
  const items = useMemo(() => { try { return JSON.parse(storage.getItem('nm-collection-v2') || '[]'); } catch { return []; } }, [storage]);
  const service = useMemo(() => poShareService(client), [client]);
  const [reply,setReply]=useState(null),[projectKey,setProjectKey]=useState('');
  let projects=[];try{const lib=JSON.parse(storage.getItem('nm-inspirations-v1')||'{}');projects=[...new Map([...(lib.projects||[]),...(lib.favorites||[])].map(i=>[i.key,i])).values()];}catch{}
  const [shares, setShares] = useState([]), [notice, setNotice] = useState('');
  useEffect(() => { let active = true; service.received().then(rows => { if (active) setShares(rows || []); }).catch(() => { if (active) setNotice('Les demandes clientes ne sont pas accessibles pour le moment.'); }); return () => { active = false; }; }, [service]);
  if(reply)return <ShareToPoSheet client={client} media={storage.media} userId={storage.userId} workspaceId={storage.workspaceId} source={reply.source} type="inspiration" proposalRecipient={reply.peer} onClose={()=>setReply(null)}/>;
  return <section className="card poInbox"><small>ESPACE PO</small><h2>Demandes reçues</h2><p>Compare chaque inspiration à ta collection et à ton matériel.</p>{notice && <p className="formError">{notice}</p>}{!shares.length && !notice && <p>Aucune inspiration reçue pour le moment.</p>}{shares.map(share => { const comparison = comparePoShare(share.snapshot, items); return <article key={share.id}><div className="poInboxTitle"><Sparkles /><span><b>{share.snapshot.title}</b><small>Envoyé par @{share.sender_handle || 'cliente NailMoods'}</small></span></div><ShareDetails client={client} snapshot={share.snapshot} id={share.id}/><div className="poInboxColors">{share.snapshot.colors.map(color => <i key={color} style={{ background: color }} />)}</div><dl><div><dt>Disponible · référence identique</dt><dd>{comparison.available.length}</dd></div><div><dt>Alternatives proches</dt><dd>{comparison.alternatives.length}</dd></div><div><dt>Manquant</dt><dd>{comparison.missing.length}</dd></div><div><dt>À vérifier</dt><dd>{comparison.verify.length}</dd></div></dl><p>La faisabilité et la maîtrise de la technique restent à confirmer par la PO.</p>{comparison.owned.map((entry,index)=><p key={index}>Référence disponible : {entry.item.brand} {entry.item.name}</p>)}{comparison.alternatives.map((entry,index)=><p key={'alt'+index}>Alternative proche : {entry.item.brand} {entry.item.name} · compatibilité à confirmer</p>)}{comparison.verify.map((entry,index)=><p key={'verify'+index}>À vérifier : {entry.name}</p>)}{comparison.missing.length > 0 && <p>À prévoir : {comparison.missing.map(item => item.name).join(' · ')}</p>}{comparison.techniqueChecks.some(item => !item.available) && <p>Matériel à vérifier : {comparison.techniqueChecks.filter(item => !item.available).map(item => item.name).join(' · ')}</p>}<label>Ma proposition privée<select value={projectKey} onChange={e=>setProjectKey(e.target.value)}><option value="">Choisir un projet ou favori</option>{projects.map(p=><option key={p.key} value={p.key}>{p.title}</option>)}</select></label><button className="poSend" disabled={!projects.some(p=>p.key===projectKey)} onClick={async()=>{try{setReply({source:projects.find(p=>p.key===projectKey),peer:await service.peer(share.id)});}catch{setNotice('Cette connexion n’est plus disponible.');}}}>Préparer une proposition</button>{!projects.length&&<p>Enregistre d’abord une inspiration ou un projet dans ton espace.</p>}</article>; })}</section>;
}
