import {localDate,validDate} from '../journal.js';
export const FOLLOW_FEELINGS={comfortable:'Confortable',sensitive:'Sensible',other:'Autre ressenti'};
export const FOLLOW_STATES={intact:'Intacte',growth:'Repousse visible',chipped:'Écaillée',lifting:'Décollement observé',other:'Autre observation'};
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
export function dayAge(start,end=localDate()){if(!validDate(start)||!validDate(end)||end<start)return null;return Math.round((Date.parse(end+'T12:00:00Z')-Date.parse(start+'T12:00:00Z'))/86400000);}
export function poseAge(project,today=localDate()){return dayAge(project.details.realizedOn,project.details.removedOn||today);}
export function validateFollowUp(row){
 const d=row.details,fail=message=>{throw Error(message);};
 if(d.removedOn!=null&&(!validDate(d.removedOn)||!d.realizedOn||d.removedOn<d.realizedOn||d.removedOn>localDate()))fail('Choisis une date de dépose entre la réalisation et aujourd’hui.');
 if(!Array.isArray(d.followUp)||d.followUp.length>200)fail('Le suivi est limité à 200 observations par pose.');
 const seen=new Set();
 for(const e of d.followUp){
  if(!e||Object.keys(e).some(k=>!['id','date','note','feeling','state','media'].includes(k))||!uuid(e.id)||seen.has(e.id))fail('Observation de suivi invalide.');seen.add(e.id);
  if(!d.realizedOn||!validDate(e.date)||e.date<d.realizedOn||e.date>localDate())fail('L’observation doit dater de la réalisation ou d’après, jusqu’à aujourd’hui.');
  if(typeof e.note!=='string'||e.note.length>2000||!['',...Object.keys(FOLLOW_FEELINGS)].includes(e.feeling)||!['',...Object.keys(FOLLOW_STATES)].includes(e.state))fail('Note ou ressenti invalide.');
  if(e.media!==null){const m=e.media;if(!m||m.bucket!=='nailmoods-private'||!['image/jpeg','image/png','image/webp'].includes(m.contentType)||!Number.isInteger(m.bytes)||m.bytes<1||m.bytes>5242880||!(typeof m.path==='string'&&m.path.startsWith(`${row.user_id}/${row.workspace_id}/followup/${row.id}-${e.id}-`)&&/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(m.path.slice(`${row.user_id}/${row.workspace_id}/followup/${row.id}-${e.id}-`.length))))fail('Photo privée de suivi invalide.');}
  if(!e.note.trim()&&!e.feeling&&!e.state&&!e.media)fail('Ajoute une photo, une note ou une observation.');
 }
 return row;
}
export function recordObservation(project,entry){const rows=project.details.followUp.filter(x=>x.id!==entry.id);return {...project,status:project.details.removedOn?'archived':'follow_up',details:{...project.details,followUp:[...rows,entry].sort((a,b)=>a.date.localeCompare(b.date)||a.id.localeCompare(b.id))}};}
