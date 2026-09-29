import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import ProfileView from '../../../src/ProfileView';
import {ProfilePhotoProvider} from '../../../src/identity/ProfilePhotoContext';
import {defaultProfile} from '../../../src/profileOptions';
import {mediaPath} from '../../../src/cloud/mediaStorage';
import '../../../src/style.css';
import '../../../src/design-system.css';
import '../../../src/finish.css';
import '../../../src/workspaces/professional.css';
import '../../../src/profile-sheet.css';
const json=(key,fallback)=>JSON.parse(localStorage.getItem(key)||'null')||fallback;
const current=()=>json('qa-photo-row',{id:'avatar-qa',avatar_url:null});
const client={from(){let update,filters=[];const q={select(){return q},eq(k,v){filters.push([k,v]);return q},is(k,v){filters.push([k,v]);return q},update(v){update=v;return q},async single(){
 if(window.qaOffline)return{error:{message:'offline'}};
 const row=current();if(!filters.every(([k,v])=>row[k]===v))return{error:{code:'PGRST116'}};
 const data={...row,...update};if(update)localStorage.setItem('qa-photo-row',JSON.stringify(data));return{data};
 }};return q;}};
const toData=blob=>new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(blob);});
const media={async upload(args){if(window.qaOffline)throw new Error('Connexion indisponible.');const path=mediaPath({...args,contentType:args.file.type});localStorage.setItem('qa-object:'+path,await toData(args.file));return {path};},async download(path){if(window.qaOffline)throw new Error('offline');return (await fetch(localStorage.getItem('qa-object:'+path))).blob();}};
const store={get profile(){return current()},get profilePhoto(){return json('qa-photo-cache',null)},async cacheProfilePhoto(photo){localStorage.setItem('qa-photo-cache',JSON.stringify(photo));}};
function App(){
 const [shown,setShown]=useState(true),[profile,setProfile]=useState(()=>json('qa-profile',{...defaultProfile,name:'Profil test'}));
 const save=next=>{localStorage.setItem('qa-profile',JSON.stringify(next));setProfile(next);return true;};
 return <main className="app" style={{'--a':'#b44d76','--b':'#733451','--soft':'#f8e9ee','--paper':'#fdfaf7'}}><ProfilePhotoProvider client={client} store={store} media={media} userId="avatar-qa" workspaceId="workspace-qa"><button onClick={()=>setShown(v=>!v)}>{shown?'Autre onglet':'Retour profil'}</button>{shown&&<ProfileView route="profil" profile={profile} onChange={save} items={[]} extras={{}}/>}</ProfilePhotoProvider></main>;
}
createRoot(document.getElementById('root')).render(<App/>);
