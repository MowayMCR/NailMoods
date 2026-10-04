// Parse only supported callback credential shapes; reject mixtures and incomplete tokens.
export function parseAuthCallback(value){
 let url;try{url=new URL(value);}catch{return null;}
 const q=url.searchParams,h=new URLSearchParams(url.hash.slice(1));
 const mode=q.get('auth')||(h.get('type')==='recovery'?'recovery':h.has('access_token')?'callback':null);
 if(!['callback','recovery'].includes(mode))return null;
 const error=q.get('error')||h.get('error'),code=q.get('code'),access=h.get('access_token'),refresh=h.get('refresh_token'),hash=q.get('token_hash'),type=q.get('type');
 const kinds=Number(Boolean(code))+Number(Boolean(access||refresh))+Number(Boolean(hash));
 if(!error&&(kinds!==1||((access||refresh)&&(!access||!refresh))||(hash&&!['email','signup','recovery'].includes(type))))return null;
 if(code&&url.hash)return null;
 const clean=new URL(url);for(const key of ['code','auth','token_hash','type','error','error_code','error_description','access_token','refresh_token'])clean.searchParams.delete(key);clean.hash='profil';
 return {mode:mode==='recovery'||type==='recovery'?'recovery':'callback',error,code,access,refresh,tokenHash:hash,type,cleanUrl:clean.href};
}
