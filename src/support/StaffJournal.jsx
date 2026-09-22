import React,{useEffect,useState} from 'react';
import {ShieldCheck,RefreshCw,LogOut} from 'lucide-react';
import {TicketList} from './SupportPanel';
import {supportCall} from './service';
import './staff-journal.css';

// The staff account has one operational surface only. It never exposes the
// normal user product areas and it receives data solely through nm_support.
export default function StaffJournal({client,onSignOut}){
 const [checked,setChecked]=useState(false),[allowed,setAllowed]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{let active=true;setChecked(false);supportCall(client,'status').then(result=>{if(active){setAllowed(result?.staff===true);setChecked(true);}}).catch(()=>{if(active){setAllowed(false);setChecked(true);}});return()=>{active=false;};},[client,revision]);
 if(!checked)return <main className="staffJournal"><p role="status">Ouverture du journal staff…</p></main>;
 if(!allowed)return <main className="staffJournal"><h1>Accès staff indisponible</h1><p>Reconnecte-toi avec un compte habilité.</p><button onClick={onSignOut}>Se déconnecter</button></main>;
 return <main className="staffJournal">
  <header className="staffJournalHeader"><span className="staffJournalIcon"><ShieldCheck aria-hidden="true"/></span><div><small>NAILMOODS · ESPACE INTERNE</small><h1>Journal staff</h1><p>Signalements et demandes d’aide à traiter.</p></div><button className="staffRefresh" onClick={()=>setRevision(v=>v+1)} aria-label="Actualiser le journal staff"><RefreshCw size={18}/>Actualiser</button></header>
  <section className="staffJournalQueue"><p className="staffTargets">Objectifs bêta : support et compte sous 48 h ouvrées · signalement sous 24 h ouvrées · urgent dès lecture.</p><TicketList key={revision} client={client} staff showRefresh={false}/></section>
  <footer className="staffJournalFooter"><p>Accès limité aux dossiers reçus et aux éléments explicitement signalés. Les collections, journaux et conversations privées ne sont pas accessibles.</p><button onClick={onSignOut}><LogOut size={17}/>Se déconnecter</button></footer>
 </main>;
}
