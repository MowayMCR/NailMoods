import React from 'react';import {createRoot} from 'react-dom/client';
import App from '../../src/main.jsx';
import {StorageContext} from '../../src/StorageContext.jsx';
import {SocialProvider} from '../../src/social/SocialContext.jsx';
const params=new URLSearchParams(location.search),tier=params.get('tier')||'plus',userId='10000000-0000-4000-8000-000000000001',workspaceId='20000000-0000-4000-8000-000000000001';
const storage={accountScoped:true,accountTier:tier,userId,workspaceId,getItem:k=>localStorage.getItem(k),setItem:(k,v)=>localStorage.setItem(k,v),removeItem:k=>localStorage.removeItem(k)};
const client={storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:null}}),list:async()=>({data:[]})})},auth:{getUser:async()=>({data:{user:{id:userId}}}),getSession:async()=>({data:{session:null}})},rpc:async(name)=>({data:name==='nm_social'?[]:{handle:'marie.demo',displayName:'Marie'}}),from(table){
 const q={table,action:'select',fields:'*',filters:[],limit:100,offset:0};
 const chain={select(v='*'){q.fields=v;return chain;},eq(k,v){q.filters.push([k,v]);return chain;},is(){return chain;},order(k){q.order=k;return chain;},range(a,b){q.offset=a;q.limit=b-a+1;return chain;},limit(n){q.limit=n;return chain;},insert(v){q.action='insert';q.values=v;return chain;},update(v){q.action='update';q.values=v;return chain;},delete(){q.action='delete';return chain;},single(){q.single=true;return chain;},maybeSingle(){q.single=true;return chain;},then(ok,fail){if(!table.startsWith('pose_'))return Promise.resolve({data:table==='profiles'?{username:'marie.demo',display_name:'Marie',discovery_visibility:'everyone'}:[],count:0}).then(ok,fail);return fetch('/__engagement_query',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(q)}).then(r=>r.json()).then(ok,fail);}};return chain;
 }};
createRoot(document.getElementById('root')).render(<StorageContext.Provider value={storage}><SocialProvider client={client} userId={userId} tier={tier}><App accountAccess={<p>Compte de validation</p>}/></SocialProvider></StorageContext.Provider>);
