import React,{useId,useEffect,useState} from 'react';

// Editorial artwork from the approved Atelier board. Existing universe icons
// and product-colour renderers remain separate; these vignettes are decorative.
const cells={inspire:0,collection:1,scan:2,manual:3,outfit:4,trainer:5,atelier:6,photos:7,planning:8,journal:9,botanical:10};
const navigationCells={universes:0,guides:1,messages:2,projects:3};
export default function AtelierArt({source,className=''}) {
  const clip=useId().replace(/:/g,'');
  const [mood,setMood]=useState(()=>globalThis.document?.documentElement.dataset.mood||'soft-glam');
  useEffect(()=>{const root=document.documentElement;const update=()=>setMood(root.dataset.mood||'soft-glam');update();const observer=new MutationObserver(update);observer.observe(root,{attributes:true,attributeFilter:['data-mood']});return()=>observer.disconnect();},[]);
  const theme={'soft-glam':'soft','dark-feminine':'dark',cottagecore:'cottage','pop-pastel':'pop'}[mood]||'soft';
  const individual={ai:'create',inspire:'inspiration',universes:'inspiration',collection:'collection',manual:'create',atelier:'create',photos:'poses',journal:'poses',planning:'planning',guides:'planning',preferences:'preferences',fil:'fil',scan:'scan',projects:'poses',messages:'fil',profile:'inspiration',po:'po',connections:'connections',outfit:'inspiration',trainer:'create'}[source];
  if(individual)return <img className={'nmAtelierArt nmAtelierArt--'+source+' '+className} src={import.meta.env.BASE_URL+'atelier/moods-v2/'+theme+'-'+individual+'.webp'} alt="" aria-hidden="true" loading="lazy" width="512" height="512"/>;
  const navigation=navigationCells[source]!==undefined;
  const index=navigation?navigationCells[source]:cells[source];
  if(index===undefined)return null;
  const cell=navigation?640:362;
  const x=index%(navigation?2:4)*cell,y=Math.floor(index/(navigation?2:4))*cell;
  const inset=navigation?45:index<4?65:index<8?20:15;
  const height=navigation?550:index<4?285:index<8?327:337;
  return <svg className={'nmAtelierArt nmAtelierArt--'+source+' '+className} viewBox={`${x} ${y+inset} ${cell} ${height}`} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet"><defs><clipPath id={clip}><rect x={x} y={y} width={cell} height={cell}/></clipPath></defs><image clipPath={`url(#${clip})`} href={import.meta.env.BASE_URL+'atelier/'+(navigation?'navigation-v1.webp':'illustrations-v1.webp')} width={navigation?1280:1448} height={navigation?1280:1086}/></svg>;
}
