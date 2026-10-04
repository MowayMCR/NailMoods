import {snapshotIdea, validIdea, ideaAvailability} from '../inspirations.js';
import {validDate, localDate} from '../journal.js';
import {buildTutorial} from '../tutorial.js';

export const PROJECT_STATUSES = ['idea','planned','ready','in_progress','done','follow_up','removal_due','archived'];
export const PLAN_KINDS = ['pose','event','follow_up','maintenance','removal','prepare','personal'];
export const REMINDER_CATEGORIES = ['pose','follow_up','maintenance','removal','project'];
export const STATUS_LABELS = {idea:'Idée',planned:'Planifiée',ready:'Prête',in_progress:'En cours',done:'Réalisée',follow_up:'Suivi',removal_due:'Dépose prévue',archived:'Archivée'};
const copy = value => structuredClone(value);
function compositionForProject(idea) {
 // Reference images remain with their existing source until the media lot.
 const clean=value=>Array.isArray(value)?value.map(clean):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key,v])=>!(/^(photo|image|coverPhoto|mediaPath|publicMedia|signedUrl|referenceImages)/i.test(key)||typeof v==='string'&&/^(data:image\/|blob:)|[?&](token|X-Amz-Signature)=/i.test(v))).map(([k,v])=>[k,clean(v)])):value;
 return clean(snapshotIdea(idea));
}
const idOK = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const textOK = (v,max) => typeof v === 'string' && v.length<=max;
export class PoseError extends Error { constructor(code,message) {super(message);this.code=code;} }
const fail = (code,message) => {throw new PoseError(code,message);};
export function assertPrincipal({userId,workspaceId}) {if(!idOK(userId)||!idOK(workspaceId))fail('principal','Un compte et un espace personnel sont nécessaires.');}
export function timezoneValid(zone) {try {if(typeof zone!=='string'||!zone)return false;new Intl.DateTimeFormat('fr-FR',{timeZone:zone}).format();return true;}catch{return false;}}
export function zonedDate(instant,timezone) {const p=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant));const get=k=>p.find(v=>v.type===k).value;return `${get('year')}-${get('month')}-${get('day')}`;}
export function instantValid(value) {return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value)&&validDate(value.slice(0,10))&&Number.isFinite(Date.parse(value));}
function identity(row) {if(!idOK(row.id)||!idOK(row.user_id)||!idOK(row.workspace_id))fail('identity','Identité du projet invalide.');}
export function newProject({id=crypto.randomUUID(),userId,workspaceId,title='Mon projet de pose',idea=null,source='manual',now=new Date().toISOString()}) {
 assertPrincipal({userId,workspaceId});
 const row={id,user_id:userId,workspace_id:workspaceId,title,status:'idea',source_inspiration_id:null,journal_entry_id:null,legacy_key:null,revision:0,created_at:now,updated_at:now,
 details:{version:1,source,composition:idea?compositionForProject(idea):null,mood:null,universes:[],notes:'',referenceMedia:[],outfitMedia:null,occasion:null,realizedOn:null,tutorialSessionId:null,followUp:[],alternatives:[],protocolReferences:[],aiJobIds:[]}};
 return validateProject(row);
}
export function validateProject(row) {
 identity(row);const d=row.details;
 if(!textOK(row.title,120)||!row.title.trim()||!PROJECT_STATUSES.includes(row.status))fail('project','Titre ou statut invalide.');
 if(!d||d.version!==1||!['manual','inspiration','journal','collection','outfit','image','event','ai'].includes(d.source))fail('version','Format de projet non pris en charge.');
 if(d.composition!==null&&!validIdea(d.composition))fail('composition','La composition existante est invalide.');
 if(!Array.isArray(d.universes)||d.universes.length>100||!d.universes.every(v=>textOK(v,80))||!textOK(d.notes,4000))fail('details','Les informations du projet sont invalides.');
 if(d.realizedOn!==null&&(!validDate(d.realizedOn)||d.realizedOn>localDate()))fail('date','La date réalisée doit être aujourd’hui ou avant.');
 if(['done','follow_up','removal_due'].includes(row.status)&&!d.realizedOn)fail('date','Indique la date réelle avant de suivre cette pose.');
 for(const field of ['referenceMedia','followUp','alternatives','protocolReferences','aiJobIds'])if(!Array.isArray(d[field]))fail('details','Liste de projet invalide.');
 // References only. Outfit media is private and bound to this project.
 if(d.referenceMedia.length||d.followUp.length||d.aiJobIds.length)fail('future_media','Les médias de suivi et IA seront intégrés dans leurs lots dédiés.');
 if(d.outfitMedia!==null){const m=d.outfitMedia;if(d.source!=='outfit'||!m||m.bucket!=='nailmoods-private'||!['image/jpeg','image/png','image/webp'].includes(m.contentType)||!(m.bytes>0&&m.bytes<=5*1024*1024)||!['jpg','png','webp'].some(ext=>m.path===`${row.user_id}/${row.workspace_id}/pose/${row.id}.${ext}`))fail('media','Référence de tenue privée invalide.');}
 if(d.outfit!==undefined&&(!d.outfit||d.outfit.version!==1||!['match','contrast','quiet','bold','surprise'].includes(d.outfit.mode)||typeof d.outfit.collectionOnly!=='boolean'||!Array.isArray(d.outfit.colors)||d.outfit.colors.length<1||d.outfit.colors.length>5||!d.outfit.colors.every(c=>/^#[0-9a-f]{6}$/i.test(c))))fail('outfit','Analyse de tenue invalide.');
 for(const field of ['source_inspiration_id','journal_entry_id'])if(row[field]!==null&&!idOK(row[field]))fail('link','Référence distante invalide.');
 if(row.legacy_key!==null&&!textOK(row.legacy_key,240))fail('legacy','Référence historique invalide.');
 if(/data:image\/|blob:|[?&](token|X-Amz-Signature)=/i.test(JSON.stringify(d)))fail('future_media','Les médias restent attachés à leur source existante.');
 if(JSON.stringify(d).length>250000)fail('size','Ce projet dépasse la taille prise en charge.');
 return copy(row);
}
export function updateProject(project,patch) {
 const allowed=['title','status','details','source_inspiration_id','journal_entry_id'];
 if(Object.keys(patch).some(k=>!allowed.includes(k)))fail('immutable','Identité et révision non modifiables.');
 return validateProject({...project,...copy(patch),details:patch.details?{...project.details,...copy(patch.details)}:project.details});
}
export function projectFromIdea(idea,principal,remoteId=null) {
 if(!validIdea(idea))fail('composition','Inspiration indisponible.');
 const p=newProject({...principal,title:idea.title,idea,source:idea.intent==='photos'?'image':'inspiration'});
 p.source_inspiration_id=remoteId;p.legacy_key=`inspiration:${remoteId||idea.key}`;
 return validateProject(p);
}
export function projectFromJournal(entry,principal) {
 if(!entry?.id||!validDate(entry.date))fail('legacy','Cette fiche historique est invalide.');
 const p=newProject({...principal,title:entry.title||'Ma pose',idea:validIdea(entry.idea)?entry.idea:null,source:'journal'});
 p.status='done';p.details.realizedOn=entry.date;p.details.tutorialSessionId=entry.sessionId||null;
 p.journal_entry_id=idOK(entry.remoteId)?entry.remoteId:null;p.legacy_key=entry.sessionId?`session:${entry.sessionId}`:`journal:${entry.remoteId||entry.id}`;
 // Preserve legacy notes/photos/products in the Journal, linked rather than moved.
 return validateProject(p);
}
export function projectFromTutorial(session,principal) {
 if(!session?.id||!validIdea(session.idea))fail('legacy','Tutoriel indisponible.');
 const p=newProject({...principal,title:session.idea.title,idea:session.idea,source:'inspiration'});
 p.legacy_key=`session:${session.id}`;p.details.tutorialSessionId=session.id;
 p.status=session.status==='completed'?'done':session.status==='active'?'in_progress':'ready';
 if(p.status==='done')p.details.realizedOn=localDate(session.completedAt);
 return validateProject(p);
}
export function projectView(project,collection=[],plan=[]) {
 const idea=project.details.composition;
 return {shape:idea?.shape||null,length:idea?.length||null,palette:idea?.palette||[],resources:idea?.resources||[],estimatedMinutes:idea?.minutes??null,
 availability:idea?ideaAvailability(idea,collection):[],steps:idea?buildTutorial(idea):[],
 planned:plan.filter(p=>p.project_id===project.id&&p.kind==='pose'&&p.status==='scheduled').sort((a,b)=>a.scheduled_on.localeCompare(b.scheduled_on)),
 // No chemistry, cure duration or medical conclusions are derived here.
 visibility:'private'};
}
export function newPlanItem(project,{id=crypto.randomUUID(),title=project.title,kind='pose',date,timezone='Europe/Paris',startsAt=null,endsAt=null,location='',notes=''}) {
 return validatePlanItem({id,project_id:project.id,user_id:project.user_id,workspace_id:project.workspace_id,title,kind,scheduled_on:date,timezone,starts_at:startsAt,ends_at:endsAt,location,notes,status:'scheduled',revision:0});
}
export function validatePlanItem(row) {
 identity(row);if(!idOK(row.project_id)||!PLAN_KINDS.includes(row.kind)||!['scheduled','done','canceled'].includes(row.status)||!textOK(row.title,120)||!row.title.trim()||!textOK(row.location,240)||!textOK(row.notes,2000))fail('planning','Action planifiée invalide.');
 if(!validDate(row.scheduled_on)||!timezoneValid(row.timezone))fail('date','Choisis une date et un fuseau valides.');
 if(row.starts_at!==null&&(!instantValid(row.starts_at)||zonedDate(row.starts_at,row.timezone)!==row.scheduled_on))fail('time','L’heure doit correspondre au jour choisi dans ce fuseau.');
 if(row.ends_at!==null&&(!row.starts_at||!instantValid(row.ends_at)||Date.parse(row.ends_at)<=Date.parse(row.starts_at)))fail('time','La fin doit être après le début.');
 return copy(row);
}
export function newReminder(plan,{id=crypto.randomUUID(),at,category='pose',enabled=true}) {
 return validateReminder({id,plan_item_id:plan.id,user_id:plan.user_id,workspace_id:plan.workspace_id,scheduled_at:at,category,enabled,revision:0});
}
export function validateReminder(row) {identity(row);if(!idOK(row.plan_item_id)||!instantValid(row.scheduled_at)||!REMINDER_CATEGORIES.includes(row.category)||typeof row.enabled!=='boolean')fail('reminder','Rappel invalide.');return copy(row);}
export function planningGroups(items,{today=localDate()}={}) {
 if(!validDate(today))fail('date','Date de référence invalide.');
 const date=new Date(today+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+((7-date.getUTCDay())%7));const end=date.toISOString().slice(0,10);
 const groups={overdue:[],thisWeek:[],later:[]};
 for(const row of [...items].filter(i=>i.status==='scheduled').sort((a,b)=>a.scheduled_on.localeCompare(b.scheduled_on)||(a.starts_at||'').localeCompare(b.starts_at||'')||a.id.localeCompare(b.id)))groups[row.scheduled_on<today?'overdue':row.scheduled_on<=end?'thisWeek':'later'].push(row);
 return groups;
}
