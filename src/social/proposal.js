import {snapshotIdea} from '../inspirations.js';
export function proposalIdea(snapshot,id){
 const visual=snapshot.preview;
 if(visual?.nails?.length!==5)throw new Error('Composition indisponible');
 const colors=[...new Set(visual.nails.map(n=>n.color))];
 const palette=colors.map((color,i)=>({...(snapshot.products||[]).find(p=>p.color===color),id:'shared-'+i,color,name:(snapshot.products||[]).find(p=>p.color===color)?.name||'Teinte partagée',type:'Vernis',conceptual:true}));
 return snapshotIdea({title:snapshot.title||'Proposition de ma PO',description:'Composition proposée par ma PO. La faisabilité et les produits restent à confirmer.',shape:visual.shape||'Amande',length:visual.length||'Moyen',palette,resources:[],nails:visual.nails.map(n=>({...n,productId:palette.find(p=>p.color===n.color).id})),rank:0,minutes:30,reasons:['Proposition privée enregistrée avec l’accord de la PO'],intent:'shared',options:{mood:snapshot.mood},sharedSource:id,isPublic:false});
}
