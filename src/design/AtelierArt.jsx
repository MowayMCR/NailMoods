import React,{useId} from 'react';

// Editorial artwork from the approved Atelier board. Existing universe icons
// and product-colour renderers remain separate; these vignettes are decorative.
const cells={inspire:0,collection:1,scan:2,manual:3,outfit:4,trainer:5,atelier:6,photos:7,planning:8,journal:9,botanical:10};
export default function AtelierArt({source,className=''}) {
  const clip=useId().replace(/:/g,'');
  const index=cells[source];
  if(index===undefined)return null;
  const x=index%4*362,y=Math.floor(index/4)*362;
  const inset=index<4?65:index<8?20:15;
  const height=index<4?285:index<8?327:337;
  return <svg className={'nmAtelierArt nmAtelierArt--'+source+' '+className} viewBox={`${x} ${y+inset} 362 ${height}`} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet"><defs><clipPath id={clip}><rect x={x} y={y} width="362" height="362"/></clipPath></defs><image clipPath={`url(#${clip})`} href={import.meta.env.BASE_URL+'atelier/illustrations-v1.webp'} width="1448" height="1086"/></svg>;
}
