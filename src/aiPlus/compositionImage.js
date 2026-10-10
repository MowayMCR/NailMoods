// Export only the five or ten illustrated nails. No photos, profile or project title.
export async function compositionImage(container){
 const nails=[...container.querySelectorAll('.illustratedNails > svg')];
 if(![5,10].includes(nails.length))throw Error('Choisis une composition de cinq ou dix ongles.');
 const ns='http://www.w3.org/2000/svg',root=document.createElementNS(ns,'svg');
 root.setAttribute('xmlns',ns);root.setAttribute('width','1024');root.setAttribute('height',nails.length===10?'1024':'512');
 const bg=document.createElementNS(ns,'rect');bg.setAttribute('width','1024');bg.setAttribute('height',nails.length===10?'1024':'512');bg.setAttribute('fill','#fffaf7');root.append(bg);
 nails.forEach((n,i)=>{const copy=n.cloneNode(true);copy.setAttribute('x',String(22+(i%5)*196));copy.setAttribute('y',String(65+Math.floor(i/5)*512));copy.setAttribute('width','196');copy.setAttribute('height','382');root.append(copy);});
 const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)],{type:'image/svg+xml'}));
 try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=nails.length===10?1024:512;canvas.getContext('2d').drawImage(image,0,0);return canvas.toDataURL('image/png');}finally{URL.revokeObjectURL(url);}
}

// Compress an already generated drawing for the next image edit, preserving its actual motifs.
export async function drawingReference(url){
 const image=new Image();image.crossOrigin='anonymous';image.src=url;await image.decode();
 for(const max of [768,512,384]){const scale=Math.min(1,max/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.round(image.naturalWidth*scale);canvas.height=Math.round(image.naturalHeight*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);const png=canvas.toDataURL('image/png');if(png.length<=1400000)return png;}
 throw Error('invalid_reference');
}
