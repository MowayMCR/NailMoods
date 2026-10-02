import React,{useEffect,useRef} from 'react';
import GooglePlayBillingSync from './GooglePlayBillingSync';
import {isAppleIOS,AppleBilling,reconcileApple} from './appleBilling';
function AppleSync({client,userId,onChanged}) {
  const callback=useRef(onChanged);callback.current=onChanged;
  useEffect(()=>{
    if(!client||!userId)return;
    let alive=true,running=false,queued=false,listener,last=0;
    async function sync(force=false){if(!alive)return;if(running){if(force)queued=true;return;}if(!force&&Date.now()-last<30000)return;running=true;last=Date.now();try{await reconcileApple(client);if(alive)await callback.current?.();}catch{}finally{running=false;if(queued&&alive){queued=false;void sync(true);}}}
    const resume=e=>{if(e.detail?.isActive)void sync();};window.addEventListener('nm-native-state',resume);
    AppleBilling.addListener('transactionsUpdated',()=>void sync(true)).then(h=>{if(alive)listener=h;else h.remove();}).catch(()=>{});void sync();
    return()=>{alive=false;window.removeEventListener('nm-native-state',resume);listener?.remove();};
  },[client,userId]);return null;
}
export default function BillingSync(props){return isAppleIOS()?<AppleSync {...props}/>:<GooglePlayBillingSync {...props}/>;}
