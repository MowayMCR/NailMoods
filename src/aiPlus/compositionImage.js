// Export only the five illustrated nails. No photos, profile or project title.
export async function compositionImage(container){
 const nails=[...container.querySelectorAll('.illustratedNails > svg')];
 if(nails.length!==5)throw Error('Choisis une composition de cinq ongles.');
 const ns='http://www.w3.org/2000/svg',root=document.createElementNS(ns,'svg');
 root.setAttribute('xmlns',ns);root.setAttribute('width','1024');root.setAttribute('height','512');
 const bg=document.createElementNS(ns,'rect');bg.setAttribute('width','1024');bg.setAttribute('height','512');bg.setAttribute('fill','#fffaf7');root.append(bg);
 nails.forEach((n,i)=>{const copy=n.cloneNode(true);copy.setAttribute('x',String(22+i*196));copy.setAttribute('y','65');copy.setAttribute('width','196');copy.setAttribute('height','382');root.append(copy);});
 const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)],{type:'image/svg+xml'}));
 try{const image=new Image();image.src=url;await image.decode();const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;canvas.getContext('2d').drawImage(image,0,0);return canvas.toDataURL('image/png');}finally{URL.revokeObjectURL(url);}
}
