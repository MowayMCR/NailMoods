import { Conversation } from './SocialHub';
import React, { useEffect, useMemo, useState } from 'react';
import { Check, Search, Send, Sparkles } from 'lucide-react';
import Sheet from '../Sheet';
import { useStorage } from '../StorageContext';
import { comparePoShare, poShareService, shareSnapshot } from './poShareService';
import './po-share.css';

export function ShareToPoSheet({ client, source, type, onClose }) {
  const service = useMemo(() => poShareService(client), [client]);
  const snapshot = useMemo(() => shareSnapshot(source, type), [source, type]);
  const [conversation,setConversation]=useState(null);
  const [query, setQuery] = useState(''), [results, setResults] = useState([]), [selected, setSelected] = useState(null), [busy, setBusy] = useState(false), [notice, setNotice] = useState('');
  async function search(event) { event.preventDefault(); setBusy(true); setNotice(''); try { const rows = await service.search(query); setResults(rows); if (!rows.length) setNotice('Aucune PO connectée trouvée. Ajoute d’abord ta PO dans Mes connexions.'); } catch { setNotice('La recherche n’est pas disponible pour le moment.'); } finally { setBusy(false); } }
  async function send() { if (!selected) return; setBusy(true); setNotice(''); try { await service.send(selected.entity_id, source.id || source.key, snapshot); setNotice('Envoyé à ta PO. Elle pourra comparer les couleurs et techniques à sa collection.');setConversation(selected); } catch { setNotice('L’envoi n’a pas abouti. Vérifie que vous utilisez toutes les deux un compte confirmé.'); } finally { setBusy(false); } }
  if(conversation)return <Conversation client={client} peer={conversation} onClose={onClose}/>;
  return <Sheet title="Envoyer à ma PO" eyebrow="PARTAGE PRIVÉ" onClose={onClose} className="poShareSheet">
    <p>Seuls la palette, les techniques et le matériel requis sont transmis. Tes notes et tes photos restent privées.</p>
    <div className="poShareSummary"><b>{snapshot.title}</b><div>{snapshot.colors.map(color => <i key={color} style={{ background: color }} />)}</div><small>{snapshot.techniques.join(' · ') || 'Composition couleur'}</small></div>
    <form onSubmit={search}><label>Choisir une PO connectée par son @identifiant<input value={query} onChange={event => setQuery(event.target.value)} placeholder="@ma-po" minLength="2" /></label><button disabled={busy || query.trim().length < 2}><Search />Rechercher</button></form>
    <div className="poSearchResults">{results.map(row => <button key={row.entity_id} aria-pressed={selected?.entity_id === row.entity_id} onClick={() => setSelected(row)}><span><b>{row.display_name}</b><small>@{row.handle}</small></span>{selected?.entity_id === row.entity_id && <Check />}</button>)}</div>
    {notice && <p className="poShareNotice" role="status">{notice}</p>}
    <button className="poSend" disabled={!selected || busy || notice.startsWith('Envoyé')} onClick={send}><Send />Envoyer cette fiche</button>
  </Sheet>;
}

export function PoReceivedShares({ client }) {
  const storage = useStorage();
  const items = useMemo(() => { try { return JSON.parse(storage.getItem('nm-collection-v2') || '[]'); } catch { return []; } }, [storage]);
  const service = useMemo(() => poShareService(client), [client]);
  const [shares, setShares] = useState([]), [notice, setNotice] = useState('');
  useEffect(() => { let active = true; service.received().then(rows => { if (active) setShares(rows || []); }).catch(() => { if (active) setNotice('Les demandes clientes ne sont pas accessibles pour le moment.'); }); return () => { active = false; }; }, [service]);
  return <section className="card poInbox"><small>ESPACE PO</small><h2>Demandes reçues</h2><p>Compare chaque inspiration à ta collection et à ton matériel.</p>{notice && <p className="formError">{notice}</p>}{!shares.length && !notice && <p>Aucune inspiration reçue pour le moment.</p>}{shares.map(share => { const comparison = comparePoShare(share.snapshot, items); return <article key={share.id}><div className="poInboxTitle"><Sparkles /><span><b>{share.snapshot.title}</b><small>Envoyé par @{share.sender_handle || 'cliente NailMoods'}</small></span></div><div className="poInboxColors">{share.snapshot.colors.map(color => <i key={color} style={{ background: color }} />)}</div><dl><div><dt>Couleurs disponibles</dt><dd>{comparison.owned.length}/{share.snapshot.colors.length}</dd></div><div><dt>Alternatives proches</dt><dd>{comparison.alternatives.length}</dd></div><div><dt>Matériel repéré</dt><dd>{comparison.techniqueChecks.length ? `${comparison.techniqueChecks.filter(item => item.available).length}/${comparison.techniqueChecks.length}` : "À vérifier"}</dd></div></dl><p>La faisabilité et la maîtrise de la technique restent à confirmer par la PO.</p>{comparison.owned.map((entry,index)=><p key={index}>Teinte proche : {entry.item.brand} {entry.item.name}</p>)}{comparison.missing.length > 0 && <p>À prévoir : {comparison.missing.map(item => item.name).join(' · ')}</p>}{comparison.techniqueChecks.some(item => !item.available) && <p>Matériel à vérifier : {comparison.techniqueChecks.filter(item => !item.available).map(item => item.name).join(' · ')}</p>}</article>; })}</section>;
}
