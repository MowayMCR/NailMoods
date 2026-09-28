import {snapshotIdea} from '../inspirations.js';

// A PO may keep a received request in her own private projects before replying.
// Deliberately use only the explicit share snapshot: no customer notes or images
// are copied into the PO library.
export function receivedShareIdea(snapshot={}, shareId='') {
  const visual=snapshot.preview||{};
  const colors=[...new Set([
    ...(visual.nails||[]).map(n=>n.color),
    ...(snapshot.colors||[]),
  ].filter(color=>/^#[0-9a-f]{6}$/i.test(color)))].slice(0,5);
  const palette=(colors.length?colors:['#B58FA0']).map((color,index)=>{
    const product=(snapshot.products||[]).find(item=>String(item.color||'').toLowerCase()===color.toLowerCase())||{};
    return {...product,id:'received-'+shareId+'-'+index,color,name:product.name||'Teinte demandée',type:'Vernis',conceptual:true};
  });
  const nails=visual.nails?.length===5
    ? visual.nails.map((n,index)=>({...n,productId:palette.find(p=>p.color===n.color)?.id||palette[index%palette.length].id}))
    : Array.from({length:5},(_,index)=>({color:palette[index%palette.length].color,productId:palette[index%palette.length].id}));
  return snapshotIdea({
    title:snapshot.title||'Demande cliente',
    description:'Demande reçue dans l’espace PO. La faisabilité et les produits restent à confirmer.',
    shape:visual.shape||'Amande',length:visual.length||'Moyen',palette,resources:[],nails,
    rank:0,minutes:30,reasons:['Demande reçue dans NailMoods'],intent:'received-share',
    options:{mood:snapshot.mood||''},receivedShareId:String(shareId||''),isPublic:false,
  });
}
