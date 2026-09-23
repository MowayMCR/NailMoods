import { createContext, useContext } from 'react';
import { browserStorage } from './storage.js';
export const StorageContext=createContext(browserStorage);
export const useStorage=()=>useContext(StorageContext);

export function StorageHint({guest,account}){return useStorage().accountScoped?account:guest;}

export function StorageStatus(){
  const storage=useStorage();
  return <p className="storageStatus" role="status">{storage.accountScoped?'Compte connecté · synchronisé':'Mode découverte · sauvegardé sur cet appareil'}</p>;
}
