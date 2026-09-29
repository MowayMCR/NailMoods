import React,{createContext,useContext,useEffect,useState,useSyncExternalStore} from 'react';
import {createProfilePhoto} from './profilePhoto';

const PhotoContext=createContext(null);
export const useProfilePhoto=()=>useContext(PhotoContext);

export function ProfilePhotoProvider(props) {
  if(!props.userId || !props.store)return <PhotoContext.Provider value={null}>{props.children}</PhotoContext.Provider>;
  return <AccountPhotoProvider key={props.userId+':'+props.workspaceId} {...props}/>;
}
function AccountPhotoProvider({client,store,media,userId,workspaceId,children}) {
  const [controller]=useState(()=>createProfilePhoto({client,store,media,userId,workspaceId}));
  const state=useSyncExternalStore(controller.subscribe,controller.getSnapshot);
  useEffect(()=>{
    controller.activate();
    const refresh=()=>{if(document.visibilityState!=='hidden')void controller.refresh();};
    void controller.refresh();
    window.addEventListener('online',refresh);
    document.addEventListener('visibilitychange',refresh);
    return()=>{window.removeEventListener('online',refresh);document.removeEventListener('visibilitychange',refresh);controller.dispose();};
  },[controller]);
  return <PhotoContext.Provider value={{...state,...controller}}>{children}</PhotoContext.Provider>;
}
