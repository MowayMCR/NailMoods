import { createContext, useContext } from 'react';
import { browserStorage } from './storage.js';
export const StorageContext=createContext(browserStorage);
export const useStorage=()=>useContext(StorageContext);

export function StorageHint({guest,account}){return useStorage().accountScoped?account:guest;}
