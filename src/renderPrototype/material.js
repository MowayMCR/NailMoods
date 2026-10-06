// Isolated, deterministic prototype: colours are inputs, never baked into imagery.
export const shapes = ['Ovale', 'Ronde', 'Amande', 'Carrée', 'Ballerine', 'Stiletto'];
export const techniques = [
  ['gloss','Vernis brillant'],['french','French'],['micro-french','Micro French'],['reverse-french','Reverse French'],['double-french','Double French'],['v-french','V-French'],
  ['ombre','Dégradé'],['blooming','Blooming'],['aura','Aura'],['cat-eye','Cat Eye'],['velvet','Velvet'],['chrome','Chrome'],['glazed','Glazed'],['jelly','Jelly'],['glass','Glass'],['milky','Milky'],
  ['marble','Marbre'],['tortoise','Écaille'],['leopard','Léopard'],['foil','Foil'],['flakes','Flakes'],['glitter','Paillettes'],['strass','Strass'],['gel-3d','Gel 3D'],['line','Line art'],['dots','Dot art']
];
export const presets = [
  {name:'Rose magnétique',base:'#aa647c',accent:'#f2d5b3',nails:['cat-eye','cat-eye','french','cat-eye','cat-eye']},
  {name:'Lilas en lumière',base:'#89769c',accent:'#e9dae6',nails:['glazed','blooming','glazed','strass','glazed']},
  {name:'Matières précieuses',base:'#966950',accent:'#e9c991',nails:['tortoise','chrome','jelly','gel-3d','foil']}
];
export function rgb(hex) {
  if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error('Teinte hexadécimale invalide');
  return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
}
export function nailPath(shape='Amande') {
  // Free edge at y=6; cuticle at y=174. Symmetric paths in 100 × 180 units.
  switch(shape) {
    case 'Carrée':return 'M 16 6 Q 50 3 84 6 L 87 144 Q 86 174 50 174 Q 14 174 13 144 Z';
    case 'Ballerine':return 'M 31 6 L 69 6 Q 81 40 86 110 L 87 144 Q 86 174 50 174 Q 14 174 13 144 L 14 110 Q 19 40 31 6 Z';
    case 'Stiletto':return 'M 50 6 C 57 14 82 64 86 111 L 87 144 Q 86 174 50 174 Q 14 174 13 144 L 14 111 C 18 64 43 14 50 6 Z';
    case 'Ronde':return 'M 14 53 C 14 -9 86 -9 86 53 L 87 143 Q 86 174 50 174 Q 14 174 13 143 Z';
    case 'Ovale':return 'M 14 66 C 14 -14 86 -14 86 66 L 87 143 Q 86 174 50 174 Q 14 174 13 143 Z';
    default:return 'M 50 6 C 69 14 86 48 86 89 L 87 143 Q 86 174 50 174 Q 14 174 13 143 L 14 89 C 14 48 31 14 50 6 Z';
  }
}
const clamp=v=>Math.max(0,Math.min(1,v));
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*clamp(t));
const noise=(x,y,seed)=>{const n=Math.sin(x*127.1+y*311.7+seed*74.7)*43758.5453;return n-Math.floor(n);};
const blob=(u,v,x,y,r)=>Math.exp(-((u-x)**2+(v-y)**2)/(r*r));
export function surfaceColor({base,accent,baseRGB,accentRGB,technique,u,v,light=0,seed=0}) {
  const a=baseRGB||rgb(base),b=accentRGB||rgb(accent);let c=a;
  if(technique.includes('french')) {
    const smile=.26-.12*(1-(2*u-1)**2);
    const french=technique==='micro-french'?v<smile*.48:technique==='reverse-french'?v>.94-.09*(2*u-1)**2:technique==='v-french'?v<.2*Math.abs(2*u-1)+.04:v<smile;
    if(french||(technique==='double-french'&&Math.abs(v-smile-.06)<.014)) c=b;
  }
  if(technique==='ombre')c=mix(a,b,(1-v)**1.8);
  if(technique==='aura')c=mix(a,b,blob(u,v,.5,.47,.28)*.92);
  if(technique==='blooming') {
    const cloud=blob(u,v,.27,.28,.13)+blob(u,v,.74,.44,.15)+blob(u,v,.36,.66,.16)+blob(u,v,.7,.8,.11);
    c=mix(a,b,cloud*.84);
  }
  if(technique==='marble') {const wave=Math.sin(u*14+v*17+Math.sin(v*15)*2.8);c=mix(a,b,Math.exp(-wave*wave*65)*.85+Math.exp(-wave*wave*5)*.2);}
  if(technique==='tortoise') {
    const m=Math.sin(u*17+Math.sin(v*18))+Math.cos(v*24+Math.cos(u*12));
    c=mix(b,a,clamp((m+.4)*.8));c=mix(c,[35,21,18],clamp(m-.7)*.82);
  }
  if(technique==='leopard') {
    const x=(u*4+Math.sin(v*8)*.3)%1-.5,y=(v*7)%1-.5,r=Math.hypot(x,y);
    c=mix(b,a,r>.19&&r<.29&&Math.sin(x*12+y*7)>-.65?1:r<.21?.25:0);
  }
  if(technique==='milky')c=mix(a,[250,245,240],.38);
  if(technique==='jelly'||technique==='glass')c=mix(a,[250,237,232],technique==='glass'?.52:.22);
  if(technique==='cat-eye'||technique==='velvet') {
    const beam=Math.exp(-((u-.5-(v-.5)*(.7+light*.5))**2)/(technique==='velvet'?.05:.006));
    c=mix(a,b,beam*.85);c=mix(c,[255,248,228],beam*(technique==='velvet'?.13:.38));
  }
  if(technique==='chrome') {
    const stripe=.3+.6*Math.sin(u*14+light*2+v*.8)**2;
    c=mix(a,[246,237,221],stripe*.82);if(u>.64&&u<.77)c=mix(c,[34,27,32],.7);
  }
  if(technique==='glazed')c=mix(a,[238,220,243],.18+.2*Math.sin(u*7+v*2)**2);
  if(technique==='glitter'||technique==='velvet'||technique==='cat-eye') {
    const speck=noise(Math.floor(u*230),Math.floor(v*400),seed);
    if(speck>.96)c=mix(c,b,(speck-.96)*15);
  }
  if(technique==='foil'||technique==='flakes') {
    const n=noise(Math.floor(u*17+Math.sin(v*25)),Math.floor(v*23),seed);
    if(n>.74)c=mix(b,[255,242,186],.22+.6*Math.sin(u*80+v*42)**2);
  }
  if(technique==='line'&&Math.abs(u-.47-.13*Math.sin(v*6))<.018)c=b;
  if(technique==='dots'&&Math.hypot((u*4)%1-.5,(v*7)%1-.5)<.14)c=b;
  return c;
}

export function renderNail(canvas,{shape='Amande',length='Moyenne',base,accent,technique='gloss',light=0,seed=0}) {
  const w=200,h=360;canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const mask=document.createElement('canvas');mask.width=w;mask.height=h;const mc=mask.getContext('2d');
  const sy=length==='Courte'?1.38:length==='Longue'?1.96:1.7,top=h-174*sy-25;
  const path=new Path2D(nailPath(shape));mc.setTransform(1.9,0,0,sy,5,top);mc.fill(path);
  const data=mc.getImageData(0,0,w,h),pixels=data.data;
  const baseRGB=rgb(base),accentRGB=rgb(accent);
  for(let y=0;y<h;y++) {
    let left=w,right=0;for(let x=0;x<w;x++)if(pixels[(y*w+x)*4+3]>128){left=Math.min(left,x);right=Math.max(right,x);}
    for(let x=left;x<=right;x++) {
      const at=(y*w+x)*4;if(!pixels[at+3])continue;
      const u=(x-5)/190,v=clamp((y-top)/sy/180),nx=(x-(left+right)/2)/Math.max(1,(right-left)/2),nz=Math.sqrt(Math.max(0,1-nx*nx));
      let c=surfaceColor({baseRGB,accentRGB,technique,u,v,light,seed});
      const diffuse=.56+.42*nz-.1*nx;
      c=c.map(n=>n*diffuse);
      // Curved softbox reflection follows the convex nail surface and light angle.
      const strip=.28+light*.12+.055*Math.sin(v*3.5),spread=technique==='velvet'?.09:.026;
      const glint=Math.exp(-((u-strip)**2)/(spread*spread))*(Math.sin(Math.PI*clamp((v-.1)/.84))**.45)*.77;
      const broad=Math.exp(-((u-strip-.04)**2)/.02)*.1;
      const rim=(1-nz)**5*.2;
      c=mix(c,[255,252,249],glint+broad+rim);
      for(let k=0;k<3;k++)pixels[at+k]=Math.round(c[k]);
    }
  }
  ctx.putImageData(data,0,0);
  ctx.setTransform(1.9,0,0,sy,5,top);ctx.save();ctx.clip(path);
  if(technique==='strass')for(const [x,y,r] of [[51,42,7],[44,61,4],[59,74,3],[49,87,2]]){
    ctx.shadowColor='rgba(58,29,48,.45)';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
    ctx.beginPath();for(let i=0;i<8;i++){const t=i*Math.PI/4;ctx.lineTo(x+Math.cos(t)*r,y+Math.sin(t)*r);}ctx.closePath();ctx.fillStyle='#c3b7c9';ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    for(let i=0;i<8;i++){const t=i*Math.PI/4;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(t)*r,y+Math.sin(t)*r);ctx.lineTo(x+Math.cos(t+Math.PI/4)*r,y+Math.sin(t+Math.PI/4)*r);ctx.closePath();ctx.fillStyle=['#fff9fc','#c5c4d4','#8e819b','#efdfeb'][i%4];ctx.fill();}
  }
  if(technique==='gel-3d') {
    ctx.shadowColor='rgba(66,29,40,.3)';ctx.shadowBlur=3;ctx.shadowOffsetY=2;
    for(let i=0;i<5;i++){const angle=i*Math.PI*2/5;ctx.save();ctx.translate(50,80);ctx.rotate(angle);const g=ctx.createLinearGradient(-8,0,8,0);g.addColorStop(0,base);g.addColorStop(.5,accent);g.addColorStop(.68,'#fff2ea');g.addColorStop(1,base);ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,-14,8,18,0,0,Math.PI*2);ctx.fill();ctx.restore();}
    ctx.shadowBlur=0;ctx.fillStyle=accent;ctx.beginPath();ctx.arc(50,80,5,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();ctx.resetTransform();
}
