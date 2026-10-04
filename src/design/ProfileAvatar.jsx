import React,{useEffect,useState} from 'react';
import {useSocial} from '../social/SocialContext';
import ContentImage from '../social/ContentImage';
import {avatars} from '../profileOptions';
export default function ProfileAvatar({profile,big=false}){
 const social=useSocial(),[photo,setPhoto]=useState(false);
 useEffect(()=>{if(!social?.client||!social.userId)return;let active=true;const refresh=()=>social.client.from('profiles').select('avatar_url').eq('id',social.userId).single().then(({data,error})=>{if(active&&!error)setPhoto(Boolean(data?.avatar_url));}).catch(()=>{});refresh();window.addEventListener('nm-avatar-updated',refresh);return()=>{active=false;window.removeEventListener('nm-avatar-updated',refresh);};},[social?.client,social?.userId]);
 return <div className={'avatar '+(big?'big ':'')+(profile.avatarMode==='avatar'?'avatarArt':'')}>{photo&&social?.identity?.username?<ContentImage client={social.client} kind="avatar" id={social.identity.username} title="Mon avatar"/>:profile.avatarMode==='avatar'?avatars.find(a=>a[0]===profile.avatar)?.[2]:(profile.name||'N')[0]}</div>;
}
