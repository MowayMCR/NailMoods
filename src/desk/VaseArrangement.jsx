import React from 'react';

// Geometry follows the actual illustrated openings and stem tips, not the image centres.
const vases={
 'vase-rose':{ratio:236/297,x:50,y:3,lip:6.5,left:28,right:73},
 'vase-ivory':{ratio:233/297,x:50,y:3,lip:6.5,left:27,right:73},
 'vase-cassis':{ratio:242/299,x:49,y:3,lip:6.5,left:27,right:72},
 'vase-glass':{ratio:232/300,x:50,y:3.5,lip:8.5,left:20,right:79},
 'vase-round':{ratio:300/271,x:50,y:4,lip:9,left:25,right:74},
 'vase-pitcher':{ratio:248/291,x:40,y:8,lip:14,left:13,right:65}
};
const stems={
 'flower-rose':{x:35.5,y:98,lean:-14},
 'flower-cosmos':{x:29,y:98,lean:-16},
 'flower-dahlia':{x:34,y:98,lean:-15},
 'leaf-sage':{x:21,y:98,lean:-24},
 'leaf-rose':{x:20,y:98,lean:-25},
 'flower-branch':{x:2,y:98,lean:-39}
};

export default function VaseArrangement({asset,flowers=[],stage,art}){
 const vase=vases[asset]||vases['vase-rose'];
 const parts=flowers.length?[...flowers].sort((a,b)=>Number(!a.startsWith('leaf-'))-Number(!b.startsWith('leaf-'))):stage?[stage]:[];
 const glass=asset==='vase-glass';
 const front=`polygon(0 ${vase.y}%, ${vase.left}% ${vase.y}%, ${vase.x}% ${vase.lip}%, ${vase.right}% ${vase.y}%, 100% ${vase.y}%, 100% ${glass?12:100}%, 0 ${glass?12:100}%)`;
 return <div className="nmDeskVaseArrangement" style={{maxWidth:220*vase.ratio, '--vase-mouth-x':vase.x+'%','--vase-mouth-y':vase.y+'%','--vase-front':vase.lip+'%'}}>
  <img className="nmDeskObjectArt nmDeskVaseBack" src={art(asset)} alt="" draggable="false"/>
  {parts.length>0&&<>
   <i className="nmDeskVaseMouth" style={{width:(vase.right-vase.left-8)+'%',height:(vase.lip-vase.y+2)+'%'}}/>
   {glass&&<svg className="nmDeskGlassStems" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{parts.map((id,i)=><path key={id} d={`M ${49+i-parts.length/2} 7 Q ${45+i*2} 42 ${43+i*3} 88`}/>)}</svg>}
   <div className="nmDeskVaseFlowers">{parts.map((id,i)=>{
    const tip=stems[id]||{x:48,y:92,lean:0};
    const angle=tip.lean+(parts.length>1?(i-(parts.length-1)/2)*13:0);
    return <img key={id} data-flower={stems[id]?id:undefined} src={art(id)} alt="" draggable="false" style={{width:stems[id]?'82%':'110%',left:`calc(${vase.x}% + ${(i-(parts.length-1)/2)*2}px)`,top:(vase.lip+1)+'%',transformOrigin:`${tip.x}% ${tip.y}%`,transform:`translate(${-tip.x}%, ${-tip.y}%) rotate(${angle}deg)`}}/>;
   })}</div>
   <img className="nmDeskVaseFront" style={{clipPath:front}} src={art(asset)} alt="" draggable="false"/>
  </>}
 </div>;
}
