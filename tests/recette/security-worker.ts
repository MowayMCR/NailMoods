import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
const project='https://pueqkbwfwxgqzmkauxoz.supabase.co';
Deno.serve(async req=>{
 if(Deno.env.get('SUPABASE_URL')!==project||req.headers.get('x-test-nonce')!==Deno.env.get('SECURITY_RECETTE_TEST_NONCE'))return new Response('Forbidden',{status:403});
 const admin=createClient(project,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const users:any[]=[],results:any[]=[];let workspace:string|undefined,path:string|undefined;
 const check=(name:string,ok:boolean)=>{results.push({name,ok});if(!ok)throw Error(name);};
 const rpc=async(c:any,name:string,args:any={})=>{const r=await c.rpc(name,args);if(r.error)throw Error(r.error.message);return r.data;};
 const fixture=(action:string,extra:any={})=>rpc(admin,'nm_security_fixture',{p_users:users.map(u=>u.id),p_action:action,...extra});
 const viewer=()=>createClient(project,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const access=(u:any,action:string,data:any={},w:any=workspace)=>u.c.rpc('nm_institute_access',{p_action:action,p_workspace:w,p_data:data});
 try{
 for(let i=0;i<4;i++){
 const email='security-'+crypto.randomUUID()+'@nailmoods-recette.invalid',password=crypto.randomUUID()+crypto.randomUUID();
 const r=await admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{adult_confirmed:true,terms_accepted:true,terms_version:'0.6-beta',privacy_version:'0.8-beta'}});if(r.error)throw Error('create_test_account: '+r.error.message);users.push({id:r.data.user!.id,email,password,c:viewer()});
 }
 await fixture('prepare');await fixture('enable');
 for(const u of users)check('login_'+users.indexOf(u),!(await u.c.auth.signInWithPassword({email:u.email,password:u.password})).error);
 const [a,b,c,d]=users;const personal=(await a.c.from('workspaces').select('id').eq('kind','personal').eq('owner_user_id',a.id).single()).data.id;
 path=a.id+'/'+personal+'/journal/'+crypto.randomUUID()+'.png';
 const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6aJ0AAAAASUVORK5CYII='),x=>x.charCodeAt(0));
 check('private_upload_current',!(await a.c.storage.from('nailmoods-private').upload(path,bytes,{contentType:'image/png'})).error);
 check('private_entry_created',!(await a.c.from('journal_entries').insert({workspace_id:personal,created_by:a.id,media_path:path,performed_on:'2026-10-07'})).error);
 check('private_signed_url_blocked',Boolean((await a.c.storage.from('nailmoods-private').createSignedUrl(path,60)).error));
 const old=a.c;const next=viewer();check('replacement_login',!(await next.auth.signInWithPassword({email:a.email,password:a.password})).error);a.c=next;
 check('old_rpc_denied',String((await old.rpc('nm_session_check')).error?.message).includes('SESSION_REPLACED'));
 const oldData=await old.from('journal_entries').select('id');check('old_data_denied',!oldData.error&&oldData.data.length===0);
 check('old_write_denied',Boolean((await old.from('journal_entries').insert({workspace_id:personal,created_by:a.id})).error));
 check('old_private_media_denied',Boolean((await old.storage.from('nailmoods-private').download(path)).error));
 check('current_private_media_kept',!(await a.c.storage.from('nailmoods-private').download(path)).error);
 check('other_account_private_media_denied',Boolean((await b.c.storage.from('nailmoods-private').download(path)).error));
 const oldToken=(await old.auth.getSession()).data.session.access_token;
 check('old_auth_session_removed',Boolean((await old.auth.getUser()).error));
 const denied=await fetch(project+'/functions/v1/ai-internal',{method:'POST',headers:{Authorization:'Bearer '+oldToken,'Content-Type':'application/json'},body:'{}'});check('old_paid_edge_denied',denied.status===401&&['SESSION_REPLACED','authentication_required'].includes((await denied.json()).error));
 check('refresh_current_keeps_session',!(await a.c.auth.refreshSession()).error);check('refresh_current_check',(await rpc(a.c,'nm_session_check')).active===true);
 await rpc(a.c,'set_professional_status',{p_status:'institute_owner'});
 const space=await rpc(a.c,'create_professional_workspace',{p_kind:'institute',p_name:'Security test '+crypto.randomUUID()});workspace=space.id;check('institute_created',Boolean(workspace));await fixture('quota',{p_workspace:workspace});
 const code=await access(a,'rotate_code');check('common_code_created',Boolean(code.data?.code));
 check('common_code_requests_only',!(await access(b,'request',{code:code.data.code},null)).error);
 check('no_right_before_approval',(await rpc(b.c,'nm_capabilities')).tier==='free');
 const state=await access(a,'state');check('request_awaits_owner',state.data.requests.length===1);
 const ap=await access(a,'approve',{id:state.data.requests[0].id});if(ap.error)throw Error('approve_request: '+ap.error.message);check('approve_request',true);
 check('institute_right_after_approval',(await rpc(b.c,'nm_capabilities')).tier==='pro');
 await rpc(a.c,'institute_action',{p_action:'remove',p_workspace_id:workspace,p_target_user_id:b.id});
 check('remove_preserves_personal_account',(await rpc(b.c,'nm_capabilities')).tier==='free');
 const ib=await access(a,'invite_email',{email:b.email}),ic=await access(a,'invite_email',{email:c.email});check('individual_invitations_created',Boolean(ib.data.token&&ic.data.token));
 check('wrong_email_denied',(await access(d,'accept_invite',{token:ib.data.token},null)).data?.error==='invitation_unavailable');
 const pair=await Promise.all([access(b,'accept_invite',{token:ib.data.token},null),access(c,'accept_invite',{token:ic.data.token},null)]);
 check('concurrent_last_seat_one_winner',pair.filter(r=>!r.error&&!r.data?.error).length===1&&pair.some(r=>r.error?.message.includes('workspace_full')));
 const win=pair[0].error?c:b,token=win===b?ib.data.token:ic.data.token;
 check('invitation_one_use',(await access(win,'accept_invite',{token},null)).data?.error==='invitation_unavailable');
 check('member_cannot_manage',Boolean((await access(win,'rotate_code')).error));
 const id=await access(a,'invite_email',{email:d.email});await access(a,'revoke_invite',{id:id.data.id});check('revoked_invite_denied',(await access(d,'accept_invite',{token:id.data.token},null)).data?.error==='invitation_unavailable');
 const ie=await access(a,'invite_email',{email:d.email});await fixture('expire_invite',{p_workspace:workspace,p_invite:ie.data.id});check('expired_invite_denied',(await access(d,'accept_invite',{token:ie.data.token},null)).data?.error==='invitation_unavailable');
 await fixture('expire',{p_workspace:workspace});check('expired_institute_right_removed',(await rpc(win.c,'nm_capabilities')).tier==='free');check('manual_pro_preserved',(await rpc(a.c,'nm_capabilities')).tier==='pro');
 }catch(e){results.push({name:'stopped',ok:false,detail:String(e.message).slice(0,160)});}
 finally{
 if(users.length){try{await fixture('disable');}catch{results.push({name:'restore_guard_setting',ok:false});}}
 if(path)await admin.storage.from('nailmoods-private').remove([path]);
 if(workspace)try{await fixture('cleanup',{p_workspace:workspace});}catch{}
 for(const u of users){const r=await admin.auth.admin.deleteUser(u.id);if(r.error)results.push({name:'cleanup_account',ok:false});}
 }
 return Response.json({results});
});
