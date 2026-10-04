import {imageCanvas} from '../recognition';
import {analyzeOutfitPixels} from './outfit.js';
export async function cropOutfit(source,{zoom=1,x=50,y=50}={}){
 const original=await imageCanvas(source,undefined,1400),width=original.width/zoom,height=original.height/zoom;
 const canvas=document.createElement('canvas');const scale=Math.min(1,1100/Math.max(width,height));canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
 const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx)throw Error('Cette photo ne peut pas être analysée.');
 ctx.drawImage(original,(original.width-width)*x/100,(original.height-height)*y/100,width,height,0,0,canvas.width,canvas.height);
 return {src:canvas.toDataURL('image/jpeg',.82),analysis:analyzeOutfitPixels(ctx.getImageData(0,0,canvas.width,canvas.height))};
}
