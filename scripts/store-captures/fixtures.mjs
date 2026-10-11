// Only injected by the simulator capture workflow. Never imported by app sources.
import fs from 'node:fs';
import {createServer} from 'vite';
const server=await createServer({server:{middlewareMode:true}});
const {generateInspirations}=await server.ssrLoadModule('/src/freeInspiration.js');
const {profileDefaults}=await server.ssrLoadModule('/src/creationEngine.js');
const {snapshotIdea}=await server.ssrLoadModule('/src/inspirations.js');
const {defaultProfile}=await server.ssrLoadModule('/src/profileOptions.js');
const {newJournalEntryFromIdea}=await server.ssrLoadModule('/src/journal.js');
const {productRow,ideaRow,journalRow}=await server.ssrLoadModule('/src/cloud/mapping.js');
const uid='10000000-0000-4000-8000-000000000001',wid='20000000-0000-4000-8000-000000000001';
const profile={...defaultProfile,name:'Camille',styles:['Romantique','Floral','Cottagecore'],shape:'Amande',length:'Moyenne',level:'Intermédiaire',visualMood:'soft-glam',onboarding_completed:true,guide_completed:true};
const colors=[['Rose pétale','#d39ca7','Rose'],['Cassis velours','#813c60','Prune'],['Nude soyeux','#e9c6b5','Nude'],['Sauge tendre','#668878','Vert'],['Or lumineux','#cba358','Or'],['Blanc nacré','#f4eee7','Blanc'],['Terracotta','#b5644a','Orange'],['Bleu brume','#6674a2','Bleu'],['Prune douce','#583b65','Prune'],['Rose poudré','#bd7084','Rose'],['Brun ambré','#75462f','Brun'],['Pêche délicate','#e6b095','Orange']];
const products=colors.map(([name,color,family],i)=>({id:'demo-shade-'+i,name,brand:'Atelier Pétale',color,shade:color,confirmedColor:color,colorSource:'manual',family,type:'Vernis',finish:i===4?'Métallique':'Brillant',quantity:1,fav:i<3}));
const ideas=generateInspirations(products,profile,{...profileDefaults(profile),intent:'collection'},20261011,6).results.map(snapshotIdea);
const titles=['Éclat de pétales','Douceur de sauge','Reflets de cassis','Nuage de rose','French lumineuse','Jardin secret'];
ideas.forEach((idea,i)=>{idea.title=titles[i];idea.isProject=i<2;idea.publicationVisual='drawing';});
const entries=ideas.slice(0,4).map((idea,i)=>({...newJournalEntryFromIdea('demo-pose-'+i,idea,Date.UTC(2026,9,10-i*3)),title:titles[i],notes:'Une palette douce et un détail délicat.',feeling:'love',ease:'easy'}));
const user={id:uid,aud:'authenticated',role:'authenticated',email:'camille@example.invalid',email_confirmed_at:'2026-10-01T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{},created_at:'2026-10-01T00:00:00Z'};
const b64=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
const session={access_token:b64({alg:'HS256',typ:'JWT'})+'.'+b64({sub:uid,exp:4102444800,aud:'authenticated',role:'authenticated'})+'.fictional',refresh_token:'screenshot-only',expires_in:86400000,expires_at:4102444800,token_type:'bearer',user};
const stamp='2026-10-11T09:41:00Z',rows={profiles:[{id:uid,display_name:'Camille',username:'camille.demo',account_tier:'pro',discovery_visibility:'pros',preferences:{nailmoodsProfile:profile},updated_at:stamp}],workspace_members:[{workspace_id:wid,role:'owner'}],workspaces:[{id:wid,owner_user_id:uid,kind:'personal',name:'Mon univers'}],user_products:products.map((p,i)=>({id:'30000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),...productRow(p),workspace_id:wid,created_by:uid,created_at:stamp,updated_at:stamp})),user_stickers:[],user_equipment:[],inspirations:ideas.map((idea,i)=>({id:'40000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),...ideaRow(idea),workspace_id:wid,created_by:uid,updated_at:stamp})),journal_entries:entries.map((entry,i)=>({id:'50000000-0000-4000-8000-'+String(i+1).padStart(12,'0'),...journalRow(entry),workspace_id:wid,created_by:uid,updated_at:stamp})),favorites:[],user_notifications:[],user_consents:[{analytics_consent:false,privacy_version:'0.8'}]};
const space={id:'60000000-0000-4000-8000-000000000001',name:'Atelier Pétale',handle:'atelier.petale',professionalType:'nail_artist',organizationType:'solo',role:'owner',isPublic:true,fields:{bio:'Des créations délicates, inspirées des fleurs et des saisons.',city:'Lyon',country:'France',universes:['Romantique','Floral'],specialties:['Nail art']},visibility:{bio:'public',city:'public'},items:[],members:[],invitations:[],seats:{active:1,limit:1,extra:0},showProfile:true};
const data={user,session,rows,space,feed:ideas.map((idea,i)=>({id:rows.inspirations[i].id,kind:'inspiration',title:idea.title,handle:['lune.demo','sauge.demo','petale.demo'][i%3],preview:idea,tags:{themes:['Floral'],techniques:['Vernis classique']},saved:false}))};
function inject(data){
  const originalFetch=window.fetch.bind(window);window.__nmCaptureRequests=[];window.__nmCaptureErrors=[];window.addEventListener('error',e=>window.__nmCaptureErrors.push(e.message));window.addEventListener('unhandledrejection',e=>window.__nmCaptureErrors.push(String(e.reason)));
  localStorage.setItem('nailmoods-auth-v1',JSON.stringify(data.session));
  window.fetch=async(input,init={})=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(!url.hostname.endsWith('.supabase.co')){if(url.origin!==location.origin)throw new Error('External network blocked for screenshots');return originalFetch(input,init);}const path=url.pathname;let body={};try{body=JSON.parse(init.body||'{}');}catch{}window.__nmCaptureRequests.push({path,body});let result=[];
    if(path.includes('/auth/v1/user'))result=data.user;
    else if(path.includes('/auth/v1/token'))result=data.session;
    else if(path.includes('/rest/v1/rpc/')){const name=path.split('/').pop();const responses={nm_account_access:{suspended:false},nm_capabilities:{tier:'pro'},nm_pro_state:{professionalType:'nail_artist',spaces:[data.space],inbox:[]},nm_salon_state:{spaces:[],inbox:[]},nm_shelf_settings:{visibility:'hidden',workspaceId:null,workspaces:[]},nm_social:[],nm_pro_search:[],nm_pro_editorial:[],nm_discover:{items:data.feed,hasMore:false}};result=responses[name]??{};}
    else if(path.includes('/rest/v1/')){const table=path.split('/').pop();result=data.rows[table]||[];const headers=new Headers(init.headers||(typeof input==='object'?input.headers:undefined));if(headers.get('accept')?.includes('object+json'))result=result[0]||null;}
    else if(path.includes('/functions/v1/')){result={staff:false,status:'active',tier:'pro',ok:true};if(path.includes('media-read'))return new Response('',{status:404});}
    return new Response(JSON.stringify(result),{status:200,headers:{'Content-Type':'application/json','Content-Range':'0-0/0'}});
  };
}
fs.mkdirSync('scripts/store-captures/generated',{recursive:true});fs.writeFileSync('scripts/store-captures/generated/session.json',JSON.stringify(session));fs.writeFileSync('scripts/store-captures/generated/fixture.js','('+inject.toString()+')('+JSON.stringify(data)+');');
await server.close();console.log('Synthetic fixtures generated, with actual inspiration engine and row mapping.');
