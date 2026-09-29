import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfilePhoto,profileAvatarMode} from '../src/identity/profilePhoto.js';
import {mediaPath} from '../src/cloud/mediaStorage.js';
const image='data:image/png;base64,iVBORw0KGgo=';
const old='A/W/avatar/old.png';
const clone=x=>JSON.parse(JSON.stringify(x));
function setup({path=null,preview='',draft=null}={}) {
 let row={id:'A',avatar_url:path},cache={path,preview,draft},offline=false,zero=false,cacheFails=false,responseLost=false;
 const objects=new Map(path?[[path,new Blob(['old'],{type:'image/png'})]]:[]),calls=[];
 const client={from(table){assert.equal(table,'profiles');let patch,filters=[];const q={select(){return q},update(value){patch=value;return q},eq(k,v){filters.push([k,v]);return q},is(k,v){filters.push([k,v]);return q},async single(){
  if(offline)return {error:{message:'offline'}};
  if(!filters.every(([k,v])=>row[k]===v)||zero&&patch)return {error:{code:'PGRST116'}};
  if(patch){calls.push('update');row={...row,...patch};if(responseLost){responseLost=false;return{error:{message:'lost response'}};}}
  return {data:clone(row)};
 }};return q;}};
 const media={async upload(args){if(offline)throw new Error('offline');calls.push('upload');const path=mediaPath({...args,contentType:args.file.type});objects.set(path,args.file);return {path};},async download(path){if(offline)throw new Error('offline');calls.push('download');return objects.get(path);}};
 const store={get profile(){return clone(row)},get profilePhoto(){return clone(cache)},async cacheProfilePhoto(v){if(cacheFails)throw new Error('cache unavailable');cache=clone(v);calls.push('checkpoint');}};
 const create=()=>createProfilePhoto({client,media,store,userId:'A',workspaceId:'W',uuid:()=>String(calls.length)});
 return {create,client,store,media,calls,objects,get row(){return row},get cache(){return cache},set offline(v){offline=v},set zero(v){zero=v},set cacheFails(v){cacheFails=v},set responseLost(v){responseLost=v},remote(path){row.avatar_url=path}};
}
test('uploaded photo becomes the avatar; explicit choices survive until a new photo',()=>{
 assert.equal(profileAvatarMode({avatarMode:'initials'},old),'photo');
 assert.equal(profileAvatarMode({avatarMode:'avatar'},old),'photo');
 assert.equal(profileAvatarMode({avatarMode:'initials',avatarChoicePath:old},old),'initials');
 assert.equal(profileAvatarMode({avatarMode:'avatar',avatarChoicePath:old},old),'avatar');
 assert.equal(profileAvatarMode({avatarMode:'avatar',avatarChoicePath:old},'A/W/avatar/new.png'),'photo');
 assert.equal(profileAvatarMode({avatarMode:'photo'},null),'initials');
});
test('upload is checkpointed, confirmed remotely, and restored across controller restart',async()=>{
 const f=setup(),a=f.create();assert.equal(await a.change(image),true);
 assert.equal(f.calls[0],'checkpoint');assert.match(f.row.avatar_url,/A\/W\/avatar\//);
 assert.equal(a.getSnapshot().url,image);assert.equal(f.cache.draft,null);
 a.dispose();const b=f.create();assert.equal(b.getSnapshot().url,image);
 await b.refresh();assert.equal(b.getSnapshot().path,f.row.avatar_url);assert.equal(b.getSnapshot().url,image);
});
test('zero-row updates cannot report success or erase the previous photo',async()=>{
 const f=setup({path:old,preview:image}),a=f.create();f.zero=true;
 assert.equal(await a.change(image),false);assert.equal(a.getSnapshot().path,old);
 assert.equal(a.getSnapshot().notice,'');assert.ok(a.getSnapshot().draft);assert.equal(f.row.avatar_url,old);
});
test('failed save preserves a durable draft for retry after reopening',async()=>{
 const f=setup({path:old,preview:image}),a=f.create();f.offline=true;
 assert.equal(await a.change(image),false);const id=f.cache.draft.id;a.dispose();
 const b=f.create();assert.equal(b.getSnapshot().url,image);assert.equal(b.getSnapshot().draft.id,id);
 f.offline=false;assert.equal(await b.resume(),true);assert.equal(b.getSnapshot().draft,null);
 assert.equal(f.row.avatar_url,`A/W/avatar/${id}.png`);
});
test('lost write response is reconciled on retry without uploading a second object',async()=>{
 const f=setup(),a=f.create();f.responseLost=true;
 assert.equal(await a.change(image),false);const saved=f.row.avatar_url;
 a.dispose();const b=f.create();assert.equal(await b.resume(),true);
 assert.equal(f.row.avatar_url,saved);assert.equal(f.calls.filter(c=>c==='upload').length,1);
});
test('refresh errors keep the last known photo; confirmed removal clears it',async()=>{
 const f=setup({path:old,preview:image}),a=f.create();f.offline=true;
 await a.refresh();assert.equal(a.getSnapshot().url,image);assert.equal(a.getSnapshot().path,old);assert.ok(a.getSnapshot().error);
 f.offline=false;f.remote(null);await a.refresh();assert.equal(a.getSnapshot().url,'');assert.equal(a.getSnapshot().path,null);
});
test('an interrupted draft cannot overwrite another device’s newer photo',async()=>{
 const f=setup({path:old,preview:image}),a=f.create();f.offline=true;await a.change(image);
 f.offline=false;f.remote('A/W/avatar/another.png');assert.equal(await a.resume(),false);
 assert.equal(f.row.avatar_url,'A/W/avatar/another.png');assert.match(a.getSnapshot().error,/autre appareil/);
});
test('no upload starts if the local draft cannot be made durable',async()=>{
 const f=setup(),a=f.create();f.cacheFails=true;assert.equal(await a.change(image),false);
 assert.equal(f.calls.includes('upload'),false);assert.equal(f.row.avatar_url,null);
});
test('photo deletion clears account reference and does not delete potentially shared storage',async()=>{
 const f=setup({path:old,preview:image}),a=f.create();assert.equal(await a.change(null),true);
 assert.equal(f.row.avatar_url,null);assert.equal(a.getSnapshot().url,'');assert.ok(f.objects.has(old));
});
test('a foreign-account path is rejected and never downloaded',async()=>{
 const f=setup(),a=f.create();f.remote('B/W/avatar/private.png');await a.refresh();
 assert.equal(f.calls.includes('download'),false);assert.equal(a.getSnapshot().url,'');assert.ok(a.getSnapshot().error);
});
test('a closed controller cannot mutate the next session',async()=>{
 const f=setup(),a=f.create();a.dispose();assert.equal(await a.change(image),false);assert.equal(f.row.avatar_url,null);
});
