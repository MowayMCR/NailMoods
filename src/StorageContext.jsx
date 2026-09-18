import { createContext, useContext } from 'react';
import { browserStorage } from './storage.js';
export const StorageContext=createContext(browserStorage);
export const useStorage=()=>useContext(StorageContext);
