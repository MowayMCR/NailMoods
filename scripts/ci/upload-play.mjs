import {readFileSync,writeFileSync} from 'node:fs';import {createSign} from 'node:crypto';
export function validateTrack(track){if(!['internal','alpha','beta'].includes(track))throw Error('Public release is forbidden in the beta workflow');return track;}
export function playRelease({versionCode,sha}){if(!/^\d+$/.test(String(versionCode))||!/^[a-f0-9]{40}$/.test(sha))throw Error('Invalid provenance');return {name:'NailMoods '+sha.slice(0,8),versionCodes:[String(versionCode)],status:'completed'};}
export async function uploadPlay({aab,credentials,track,sha,expectedBuild,fetchImpl=fetch}){
 validateTrack(track);if(!/^[a-f0-9]{40}$/.test(sha)||!Number.isSafeInteger(Number(expectedBuild))||Number(expectedBuild)<1)throw Error('Invalid provenance');const pkg='com.nailmoods.app';const b64=x=>Buffer.from(typeof x==='string'?x:JSON.stringify(x)).toString('base64url'),now=Math.floor(Date.now()/1000);
 const raw=b64({alg:'RS256',typ:'JWT'})+'.'+b64({iss:credentials.client_email,scope:'https://www.googleapis.com/auth/androidpublisher',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600});
 const signature=createSign('RSA-SHA256').update(raw).sign(credentials.private_key,'base64url');
 const oauth=await fetchImpl('https://oauth2.googleapis.com/token',{method:'POST',signal:AbortSignal.timeout(30000),body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:raw+'.'+signature})});if(!oauth.ok)throw Error('Publisher authentication failed');
 const {access_token}=await oauth.json();if(!access_token)throw Error('Missing publisher token');
 const api='https://androidpublisher.googleapis.com/androidpublisher/v3/applications/'+pkg+'/edits';
 const request=async(url,init={})=>{const r=await fetchImpl(url,{...init,signal:AbortSignal.timeout(120000),headers:{Authorization:'Bearer '+access_token,...init.headers}});if(!r.ok)throw Error('Google publisher request failed: '+r.status);return r.status===204?{}:r.json();};
 const edit=await request(api,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
 try{
 if(!/^[a-f0-9]{40}$/.test(sha))throw Error('Invalid source commit');
 const bundle=await request('https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/'+pkg+'/edits/'+edit.id+'/bundles?uploadType=media',{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:aab});
 if(Number(bundle.versionCode)!==Number(expectedBuild))throw Error('Bundle build differs from requested provenance');
 await request(api+'/'+edit.id+'/tracks/'+track,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({track,releases:[playRelease({versionCode:bundle.versionCode,sha})]})});
 await request(api+'/'+edit.id+':validate',{method:'POST'});await request(api+'/'+edit.id+':commit',{method:'POST'});
 return {sourceCommit:sha,versionCode:bundle.versionCode,track,status:'upload_and_edit_accepted',availability:'Check Play Console: processing/review/availability are separate'};
 }catch(e){try{await request(api+'/'+edit.id,{method:'DELETE'});}catch{}throw e;}
}
if(process.argv[1]?.endsWith('upload-play.mjs')){
 const result=await uploadPlay({aab:readFileSync(process.argv[2]),credentials:JSON.parse(process.env.GOOGLE_PLAY_PUBLISHER_JSON||'{}'),track:process.env.PLAY_TRACK,sha:process.env.SOURCE_SHA,expectedBuild:process.env.NAILMOODS_ANDROID_BUILD_NUMBER});writeFileSync('artifacts/android/play-upload.json',JSON.stringify(result,null,2));console.log(result);
}
