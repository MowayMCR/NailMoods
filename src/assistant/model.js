import {CONCEPT_COLORS,SHAPES,LENGTHS,TECHNIQUES,validatePlan} from '../../supabase/functions/nailmoods-ai/contract.mjs';
import {productColor} from '../colorAnalysis.js';
import {snapshotIdea,validIdea} from '../inspirations.js';
import {EXERCISES} from '../trainer/model.js';
import {buildTutorial} from '../tutorial.js';
import {techniqueRule} from '../techniqueRules.js';
export const assistantEnabled=env=>env.VITE_NAILMOODS_AI_ENABLED==='true';
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function productContext(items=[]){return items.filter(p=>['Vernis','Semi-permanent','Gel'].includes(p.type)&&Number(p.quantity??1)>0).slice(0,100).map(p=>({id:String(p.id),name:p.name,brand:p.brand||'',reference:p.reference||'',color:productColor(p),verified:p.catalogColorValidated===true,conceptual:false}));}
export function localPlan(prompt,{items=[],profile={},collectionOnly=false,current=null}={}){
 const text=norm(prompt);collectionOnly=collectionOnly||/uniquement mes|mes vernis|ma collection/.test(text);const products=[...productContext(items),...(collectionOnly?[]:CONCEPT_COLORS)];
 const result={action:'chat',message:'',title:'Mon inspiration',shape:SHAPES.includes(profile.shape)?profile.shape:'Amande',length:LENGTHS.includes(profile.length)?profile.length:'Courte',level:/debut|simple|facile/.test(text)?0:1,collectionOnly,editFinger:null,nails:[]};
 if(/tendance|hiver|actualite/.test(text))return {...result,message:'Les tendances actuelles nécessitent une recherche Internet. Choisis « Tendances sourcées » lorsque l’IA sera activée.'};
 if(/envoi|envoie|partag|\bpo\b/.test(text))return {...result,action:'share',message:'Ouvre le partage de cette inspiration pour choisir ta PO et confirmer l’envoi.'};
 if(/etape|tutoriel|comment faire|explique/.test(text))return {...result,action:'tutorial',message:'Le guide de ta composition est inclus. Les effets avancés demandent aussi le protocole de tes produits.'};
 if(/realiste/.test(text))return {...result,message:'Choisis « Rendu réaliste » pour cette composition lorsque la génération distante sera activée.'};
 if(!products.length)return {...result,message:'Ta collection est vide. Ajoute tes vernis ou désactive « Uniquement mes vernis » pour explorer des couleurs d’inspiration.'};
 const fingerNames=['pouce','index','majeur','annulaire','auriculaire'];
 const target=fingerNames.findIndex(f=>text.includes(f));
 if(/change|remplace|garde|reprend/.test(text)&&!current)return {...result,message:'Choisis d’abord une composition à modifier.'};
 const pool=collectionOnly?products:products.filter(p=>p.conceptual);
 const choose=(pattern,fallback=0)=>pool.find(p=>pattern.test(norm(p.name+' '+p.reference)))||pool[fallback%pool.length];
 const base=choose(/bordeaux|cassis|plum/),accent=choose(/dore|gold|or\b/,1);
 const technique=TECHNIQUES.filter(Boolean).find(t=>text.includes(norm(t).replace('-',' ')))||(/french/.test(text)?'french':/leopard/.test(text)?'leopard':'');
 const motif=/fleur/.test(text)?'flower':/halloween|disney/.test(text)?'star':'';
 const nails=(current&&target>=0?[target]:[0,1,2,3,4]).map(finger=>({finger,productId:String((finger%2?choose(/nude|rose/,1):base).id),accentProductId:String(accent.id),technique,drawingTechnique:technique.includes('french')&&/leopard/.test(text)?'leopard':'',motif:motif&&(finger===3||finger===1)?motif:''}));
 return {...result,action:current&&target>=0?'edit':'compose',editFinger:current&&target>=0?target:null,nails,title:prompt.slice(0,70),message:'Proposition locale à partir de mots-clés, sans appel IA. Tu peux l’adapter dans le moteur de création.'};
}
export function ideaFromPlan(raw,{products=[],items=[],profile={},current=null,collectionOnly=false}={}){
 const plan=validatePlan(raw,products,{collectionOnly});if(!['compose','edit'].includes(plan.action))return null;
 if(plan.action==='edit'&&!validIdea(current))throw Error('composition_required');
 const map=new Map(products.map(p=>[String(p.id),p]));
 const product=id=>{const p=map.get(id);if(!p?.color)throw Error('color_confirmation_required');const owned=items.find(i=>String(i.id)===id);return {...(owned||p),id,name:owned?.name||p.name,color:p.color,conceptual:p.conceptual===true,type:owned?.type||'Vernis',colorSource:p.verified?'catalog-confirmed':p.conceptual?'inspiration':'user-unverified'};};
 const nails=plan.action==='edit'?current.nails.map(n=>structuredClone(n)):Array(5);
 const palette=new Map((plan.action==='edit'?current.palette:[]).map(p=>[String(p.id),p]));
 for(const n of plan.nails){const p=product(n.productId),a=n.accentProductId?product(n.accentProductId):null;palette.set(String(p.id),p);if(a)palette.set(String(a.id),a);
 nails[n.finger]={...(nails[n.finger]||{}),productId:p.id,color:p.color,finish:p.finish||'Brillant',technique:n.technique||null,techniques:[n.technique,n.drawingTechnique].filter(Boolean),drawingTechnique:n.drawingTechnique||null,drawing:n.technique.includes('french')?n.technique:['line','dots'].includes(n.technique)?n.technique:null,accentProductId:a?.id||null,accentColor:a?.color||p.color,decoration:n.motif?{motif:n.motif,color:a?.color||p.color}:null};}
 const used=new Set(nails.flatMap(n=>[String(n.productId),String(n.accentProductId)]));
 const techniques=[...new Set(nails.flatMap(n=>n.techniques||[]))];
 const requirements=techniques.flatMap(t=>techniqueRule(t)?.requirements||[]).map(name=>({name,required:true}));
 const idea={...(plan.action==='edit'?current:{}),id:crypto.randomUUID(),title:plan.title||'Ma création NailMoods',shape:plan.action==='edit'?current.shape:plan.shape||profile.shape||'Amande',length:plan.action==='edit'?current.length:plan.length||profile.length||'Courte',nails,palette:[...palette.values()].filter(p=>used.has(String(p.id))),resources:plan.action==='edit'?current.resources:items.filter(p=>p.type==='Matériel').slice(0,30),requirements,techniques,rank:plan.level,minutes:45,description:'Composition à valider avec tes produits. Durée indicative ; couleurs affichées approximatives.',reasons:['Tutoriel inclus','Aperçu illustré local'],options:{...(current?.options||{}),manualSet:true,intent:plan.collectionOnly?'collection':'inspire',aiAssisted:true},ai:{renderMode:'local',tutorialIncluded:true}};
 const saved=snapshotIdea(idea);if(!validIdea(saved))throw Error('invalid_composition');return saved;
}
export function tutorialFor(idea){
 const steps=buildTutorial(idea).map(s=>s.kind==='sticker'&&!idea.resources.some(r=>/sticker|decal/i.test(r.equipmentCategory||''))?{...s,title:'Dessine les motifs',body:EXERCISES.find(x=>x.id==='flowers')?.hint+' Vérifie le placement indiqué dans ton aperçu et adapte le motif à ton niveau.'}:s);
 const tips=(idea.techniques||[]).filter(t=>!['french','line','dots'].includes(t)).map(t=>({id:'technique-'+t,title:'Technique · '+t,body:EXERCISES.find(x=>x.id===t)?.hint||'Le guide générique ne suffit pas à valider cette technique. Utilise le protocole de tes produits et le matériel indiqué ; entraîne-toi sur une capsule avant réalisation.'}));
 return [...steps.slice(0,2),...tips,...steps.slice(2)];
}
export function minimalComposition(idea){if(!idea)return undefined;return {shape:idea.shape,length:idea.length,nails:idea.nails.map(n=>({productId:String(n.productId),color:n.color,accentProductId:n.accentProductId==null?null:String(n.accentProductId),accentColor:n.accentColor,technique:n.technique,drawing:n.drawing,finish:n.finish,decoration:n.decoration}))};}
export const AI_MESSAGES={queue_full:'La file est pleine. Réessaie dans quelques minutes.',account_busy:'Deux demandes sont déjà en cours sur ton compte.',account_budget_exceeded:'Ton plafond IA est atteint.',operation_quota_exceeded:'Le quota de cette fonction est atteint.',provider_circuit_open:'Le service IA fait une pause après plusieurs erreurs. Réessaie dans cinq minutes.',queue_expired:'La demande en attente a expiré sans génération. Tes jetons ont été libérés.',worker_interrupted:'La génération a été interrompue. Aucun nouvel appel automatique ne sera effectué.',provider_busy:'OpenAI est momentanément saturé. Réessaie plus tard.',provider_disabled:'L’IA distante n’est pas encore activée. La composition locale reste disponible.',ai_disabled:'L’accès à l’IA n’est pas activé pour ce compte.',capability_disabled:'Cette fonction n’est pas encore activée.',insufficient_credits:'Aucun jeton disponible pour cette opération. Aucun achat n’a été effectué.',daily_quota_exceeded:'Le quota du jour est atteint.',budget_exceeded:'La limite de dépense a été atteinte. Réessaie après sa révision.',conversation_busy:'Une demande est déjà en cours dans cette conversation.',provider_interrupted:'Le service a été interrompu. Consulte l’historique avant de relancer.',invalid_response:'La réponse reçue ne permet pas une création fiable. Aucun jeton n’est consommé.',color_confirmation_required:'Une couleur doit être confirmée dans la collection avant de dessiner.',operation_budget_exceeded:'Cette demande dépasse la limite configurée.',composition_required:'Choisis une composition de cinq ongles.',media_deletion_pending:'Le texte est supprimé. La suppression des images doit être relancée.'};
