import {equipmentSeed} from '../equipmentSeed.js';
import {productKind} from '../productKinds.js';
import {isDecoration} from '../decorations.js';

export const DESK_KEY='nm-desk-v1';
export const deskSizes={compact:{label:'Compact',width:800,height:950},standard:{label:'Standard',width:1100,height:1250},large:{label:'Grand',width:1500,height:1650}};
const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const fallback={'Lampe UV / LED':'lampe-uv-led','Stickers / décalcomanies':'stickers',Pinceau:'pinceau-detail','Dotting tool':'dotting-tool','Lime / polissoir':'lime-ongles','Aimant cat-eye':'aimant-cat-eye',Stamping:'tampon-stamping','Strass / décorations':'strass','Capsules / chablons':'capsules','Outil de préparation':'repousse-cuticules','Ponceuse / embouts':'ponceuse',Éponge:'eponge',Spatule:'spatule',Pinces:'pinces-maintien',Palette:'palette','Autre matériel':'autre'};
export function toolAsset(item){
 const row=equipmentSeed.find(r=>r.slug===item.equipmentSlug)||equipmentSeed.find(r=>[r.name,...r.aliases].some(a=>norm(a)===norm(item.name)));
 return row?.slug||fallback[item.equipmentCategory]||'autre';
}
export const toolUses={
 'lime-ongles':['Ajuster la forme et la longueur des ongles.','Mise en forme'],buffer:['Lisser et uniformiser la surface selon le grain du bloc.','Préparation'],
 'repousse-cuticules':['Repousser délicatement les cuticules.','Préparation'], 'pince-cuticules':['Travailler les petites peaux avec un outil de précision.','Manucure'], 'ciseaux-cuticules':['Travailler les cuticules et petites peaux avec précision.','Manucure'],
 'brosse-poussiere':['Retirer les poussières après le limage.','Préparation'], 'brosse-ongles':['Nettoyer les ongles avec une brosse adaptée.','Manucure'],
 'lampe-uv':['Polymériser les produits compatibles avec une lampe UV.','Gel · Semi-permanent'], 'lampe-led':['Polymériser les produits compatibles avec une lampe LED.','Gel · Semi-permanent'], 'lampe-uv-led':['Polymériser les produits compatibles UV/LED.','Gel · Semi-permanent'],
 capsules:['Servir de support pour une extension ou une pose de capsules.','Extensions'], 'coupe-capsules':['Raccourcir les capsules avant la mise en forme.','Extensions'], chablons:['Servir de support temporaire pour construire une extension.','Construction'], 'dual-forms':['Mouler une extension avec un produit compatible.','Construction'], 'pinces-maintien':['Maintenir les formes ou supports pendant le travail.','Construction'],
 'pinceau-liner':['Tracer des lignes fines, des contours et des détails de French.','Lignes · French'], 'pinceau-detail':['Dessiner de petits motifs et leurs détails.','Fleurs · Motifs'], 'pinceau-plat':['Appliquer et répartir la matière, réaliser des motifs au pinceau plat.','Application · One stroke'], 'pinceau-degrade':['Fondre les transitions entre couleurs.','Dégradé'],
 'dotting-tool':['Déposer des points et créer des motifs à pois.','Pois · Fleurs'], eponge:['Tamponner les couleurs pour créer des dégradés.','Dégradé'], palette:['Préparer les couleurs et mélanges utilisés pour le nail art.','Nail art'], 'pince-precision':['Saisir et placer de petites décorations.','Décorations'], 'attrape-strass':['Saisir et placer des strass avec la pointe adaptée.','Strass'], 'aimant-cat-eye':['Orienter les particules d’un vernis magnétique compatible.','Cat Eye'],
 'tampon-stamping':['Transférer un motif gravé sur une plaque vers l’ongle.','Stamping'], 'plaques-stamping':['Fournir les motifs gravés à transférer avec un tampon.','Stamping'], 'raclette-stamping':['Retirer l’excédent de vernis sur la plaque avant le transfert.','Stamping'],
 ponceuse:['Travailler la préparation ou la dépose avec les embouts adaptés.','Préparation · Dépose'], 'embouts-ponceuse':['Adapter le travail de la ponceuse à la matière et à la zone.','Préparation · Dépose'], 'clips-depose':['Maintenir les supports utilisés pour une dépose compatible.','Dépose'], aspirateur:['Recueillir les poussières produites pendant le limage.','Équipement de poste'], 'repose-main':['Installer la main confortablement pendant la pose.','Équipement de poste'], tapis:['Protéger et organiser la surface de travail.','Équipement de poste'],
 spatule:['Prélever et répartir la matière avec l’embout adapté.','Acrygel · Construction'], stickers:['Ajouter des motifs prêts à poser.','Décorations'], strass:['Ajouter des détails décoratifs ou du relief.','Décorations'], autre:['Retrouve ici les informations et notes de ton matériel personnalisé.','Ton matériel']
};
export function initialDesk(value){
 const v=value&&typeof value==='object'&&!Array.isArray(value)?value:{};
 return {version:1,viewInitialized:v.viewInitialized===true,size:deskSizes[v.size]?v.size:'standard',zoom:Number.isFinite(v.zoom)?Math.min(1.5,Math.max(.2,v.zoom)):.35,groupBrushes:v.groupBrushes===true,positions:v.positions&&typeof v.positions==='object'?v.positions:{},hidden:Array.isArray(v.hidden)?v.hidden.filter(x=>typeof x==='string'):[],decorations:Array.isArray(v.decorations)?v.decorations.filter(x=>typeof x==='string'):['bouquet'],flowerVases:flowerVaseLinks(v.flowerVases),unlocked:Array.isArray(v.unlocked)?v.unlocked.filter(x=>typeof x==='string'):[],highWater:Number.isFinite(v.highWater)?Math.max(0,v.highWater):0,frameEntryId:typeof v.frameEntryId==='string'?v.frameEntryId:''};
}
export function progressFor(items=[],entries=[],library={}){
 const polishes=items.filter(p=>p.type!=='Matériel'&&Number(p.quantity??1)>0&&!isDecoration(p)&&productKind(p)==='Couleur');
 const count=new Set(polishes.map(p=>String(p.catalogId||p.provenance?.catalogId||[p.brand,p.reference||p.name].map(norm).join('|')))).size;
 const uses=new Map();for(const e of entries){for(const id of new Set((e.products||[]).filter(p=>p.type!=='Matériel').map(p=>String(p.id))))uses.set(id,(uses.get(id)||0)+1);}
 const technique=entries.some(e=>e.idea&&((e.idea.pattern&&e.idea.pattern!=='colors')||(e.idea.nails||[]).some(n=>n.drawing||n.decoration||n.drawingTechnique||(n.technique&&!['gloss','colors','cream'].includes(n.technique)))));
 const saved=[...(library.favorites||[]),...(library.projects||[]),...entries.map(e=>e.idea).filter(Boolean)];
 return {count,pose:entries.length>0,technique,reuse:[...uses.values()].some(n=>n>=3),composition:saved.some(i=>i.options?.manualSet||i.options?.proDrawing||i.options?.proCreation)};
}
export const decorations=[
 ...[['vase-rose','Vase rose',1],['vase-ivory','Vase ivoire',3],['vase-cassis','Vase cassis',5],['vase-glass','Vase en verre',8],['vase-round','Vase arrondi',12],['vase-pitcher','Vase fleuri',12]].map(([id,label,at])=>({id,label,at,rule:at+' vernis dans ta collection',kind:'vase'})),
 ...[['flower-rose','Rose',3],['flower-cosmos','Cosmos',5],['leaf-sage','Eucalyptus',8],['flower-dahlia','Dahlia',12],['leaf-rose','Feuillage rose',12],['flower-branch','Branche fleurie',12]].map(([id,label,at])=>({id,label,at,rule:at+' vernis dans ta collection',kind:'flower'})),
 ...[['frame-rose','Cadre rose'],['frame-ivory','Cadre ivoire'],['frame-gold','Cadre doré'],['frame-wide','Cadre paysage']].map(([id,label])=>({id,label,event:'pose',rule:'Ta première pose enregistrée',kind:'frame'})),
 {id:'reward-technique',label:'Fleur précieuse',event:'technique',rule:'Une pose enregistrée avec un motif ou une technique',kind:'reward'},
 {id:'reward-reuse',label:'Petit jardin',event:'reuse',rule:'Un même produit utilisé dans trois poses enregistrées',kind:'reward'},
 ...[['art-flowers','Illustration fleurie'],['art-leaves','Illustration cassis']].map(([id,label])=>({id,label,event:'composition',rule:'Une composition personnelle sauvegardée',kind:'art'}))
];
export function earnedDecorations(progress,state){const count=Math.max(progress.count,state.highWater||0);return [...new Set([...(state.unlocked||[]),...decorations.filter(d=>d.at?count>=d.at:progress[d.event]).map(d=>d.id)])];}
export function bouquetStage(count){return count>=12?'bouquet-full':count>=8?'bouquet-leaves':count>=5?'bouquet-two':count>=3?'bouquet-one':null;}
export function clampPosition(pos,size){const {width,height}=deskSizes[size]||deskSizes.standard;return {x:Math.max(.08,Math.min(.92,Number.isFinite(pos.x)?pos.x:.5)),y:Math.max(.34,Math.min(.87,Number.isFinite(pos.y)?pos.y:.6))};}
export function defaultPosition(index,total=1){const cols=total>18?6:total>8?4:3,rows=Math.ceil(total/cols);return {x:.16+(index%cols)*(.68/Math.max(1,cols-1)),y:.4+Math.floor(index/cols)*(.42/Math.max(1,rows-1))};}

// Keep the relationship separate from positions: moving or hiding a vase keeps its bouquet intact.
export function flowerVaseLinks(value){
 const flowers=new Set(decorations.filter(d=>d.kind==='flower').map(d=>d.id));
 const vases=new Set(['bouquet',...decorations.filter(d=>d.kind==='vase').map(d=>d.id)]);
 return Object.fromEntries(Object.entries(value&&typeof value==='object'&&!Array.isArray(value)?value:{}).filter(([flower,vase])=>flowers.has(flower)&&vases.has(vase)));
}
