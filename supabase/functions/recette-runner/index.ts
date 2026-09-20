import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.116.0';
const allowed='https://pueqkbwfwxgqzmkauxoz.supabase.co';
Deno.serve(async req=>{
 const url=Deno.env.get('SUPABASE_URL');
 if(url!==allowed)return new Response('wrong_environment',{status:403});
 const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 const secret=req.headers.get('x-recette-secret');
 if(!secret || (await admin.rpc('check_worker_secret',{p_name:'RECETTE_RUNNER_SECRET',p_value:secret})).data!==true)return new Response('forbidden',{status:403});
 const results:any[]=[];const sessions:any[]=[];
 const check=(name:string,ok:boolean,detail?:string)=>{results.push({name,status:ok?'PASS':'FAIL',...(detail?{detail}:{})});if(!ok)throw new Error(name);};
 const client=()=>createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 let id:string|undefined,path:string|undefined,pub:string|undefined,a:any,b:any,instituteId:string|undefined,instituteName:string|undefined;
 try{
  const users:any={};
  for(const label of ['A','B','C','D']){
   let saved=(await admin.rpc('read_recette_fixture',{p_label:label})).data;
   if(!saved){
    saved={email:`fixture-${label.toLowerCase()}-${crypto.randomUUID()}@nailmoods-recette.invalid`,password:crypto.randomUUID()+crypto.randomUUID()};
    const r=await admin.auth.admin.createUser({email:saved.email,password:saved.password,email_confirm:true,user_metadata:{adult_confirmed:true,terms_accepted:true,terms_version:'0.1-beta',privacy_version:'0.1-beta'}});
    check('create_'+label,!r.error,r.error?.message);
    saved.id=r.data.user!.id;
    const prep=await admin.rpc('prepare_recette_fixture',{p_label:label,p_user:saved.id,p_credentials:saved});check('prepare_'+label,!prep.error,prep.error?.message);
   }
   const c=client();const login=await c.auth.signInWithPassword({email:saved.email,password:saved.password});check('login_'+label,!login.error,login.error?.message);sessions.push(c);
   const w=await c.from('workspaces').select('id').eq('kind','personal').eq('owner_user_id',saved.id).single();check('provision_'+label,!w.error,w.error?.message);
   users[label]={c,id:saved.id,w:w.data!.id,credentials:saved};
  }
  a=users.A;b=users.B;
  for(const [label,tier] of [['A','plus'],['B','pro'],['C','free']]){const r=await users[label].c.rpc('apply_beta_tier',{p_tier:tier});check('tier_'+label,!r.error&&r.data.tier===tier,r.error?.message);}
  check('D_no_promotion',Boolean((await users.D.c.rpc('apply_beta_tier',{p_tier:'pro'})).error));
  const dOffer=await users.D.c.rpc('account_offer_state');check('D_offer_choice_available',!dOffer.error&&dOffer.data.canChoose===true&&dOffer.data.tier==='free',dOffer.error?.message);
  const dPlus=await users.D.c.rpc('choose_beta_account_tier',{p_tier:'plus'});check('D_controlled_choice_plus',!dPlus.error&&dPlus.data.tier==='plus'&&dPlus.data.source==='beta_self_selection',dPlus.error?.message);
  const dFree=await users.D.c.rpc('choose_beta_account_tier',{p_tier:'free'});check('D_controlled_choice_restore',!dFree.error&&dFree.data.tier==='free',dFree.error?.message);
  check('D_no_direct_tier_write',Boolean((await users.D.c.from('profiles').update({account_tier:'pro'}).eq('id',users.D.id)).error));
  check('C_no_product_write',Boolean((await users.C.c.from('user_products').insert({workspace_id:users.C.w,created_by:users.C.id,hex:'#553366'})).error));
  const identity=await a.c.rpc('set_nailmoods_identity',{p_handle:'recette.alpha',p_visibility:'everyone',p_display_name:'Recette Alpha'});check('identity',!identity.error,identity.error?.message);
  const proIdentity=await b.c.rpc('set_nailmoods_identity',{p_handle:'recette.pro',p_visibility:'everyone',p_display_name:'Recette B'});check('pro_personal_identity',!proIdentity.error,proIdentity.error?.message);
  const proFromPlus=await a.c.rpc('search_nailmoods',{p_query:'@recette.pro'});check('plus_finds_personal_pro',!proFromPlus.error&&proFromPlus.data.some((p:any)=>p.handle==='recette.pro'&&p.kind==='independent'),proFromPlus.error?.message);
  check('C_cannot_choose_pro_status',Boolean((await users.C.c.rpc('set_professional_status',{p_status:'independent'})).error));
  id=crypto.randomUUID();path=`${a.id}/${a.w}/journal/${id}.png`;pub=path;
  const bytes=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6aJ0AAAAASUVORK5CYII='),c=>c.charCodeAt(0));
  const image=new Blob([bytes],{type:'image/png'});
  check('private_upload',!(await a.c.storage.from('nailmoods-private').upload(path,image)).error);
  const entry=await a.c.from('journal_entries').insert({id,workspace_id:a.w,created_by:a.id,performed_on:'2026-09-19',media_path:path,snapshot:{id,title:'Pose recette',mood:'Douce',colors:['#553366']}});
  check('private_journal_insert',!entry.error,entry.error?.message);
  check('A_private_download',!(await a.c.storage.from('nailmoods-private').download(path)).error);
  check('B_private_download_denied',Boolean((await b.c.storage.from('nailmoods-private').download(path)).error));
  check('anon_private_download_denied',Boolean((await client().storage.from('nailmoods-private').download(path)).error));
  check('B_signed_url_denied',Boolean((await b.c.storage.from('nailmoods-private').createSignedUrl(path,60)).error));
  const rows=await b.c.from('journal_entries').select('id').eq('id',id);check('B_private_RLS',!rows.error&&rows.data.length===0);
  check('B_foreign_user_upload_denied',Boolean((await b.c.storage.from('nailmoods-private').upload(`${a.id}/${a.w}/journal/evil.png`,image)).error));
  check('B_foreign_workspace_upload_denied',Boolean((await b.c.storage.from('nailmoods-private').upload(`${b.id}/${a.w}/journal/evil.png`,image)).error));
  check('B_attach_A_media_denied',Boolean((await b.c.from('journal_entries').insert({workspace_id:b.w,created_by:b.id,media_path:path})).error));
  const second=client();sessions.push(second);check('second_session_login',!(await second.auth.signInWithPassword(a.credentials)).error);
  check('second_session_photo',!(await second.storage.from('nailmoods-private').download(path)).error);
  check('private_public_route_denied',(await fetch(`${url}/functions/v1/media-read?kind=journal&id=${id}`)).status===404);
  check('publish_copy',!(await a.c.storage.from('nailmoods-public').upload(pub,image)).error);
  check('publish_row',!(await a.c.from('journal_entries').update({visibility:'public',public_media_path:pub}).eq('id',id)).error);
  const exposed=await fetch(`${url}/functions/v1/media-read?kind=journal&id=${id}`);
  check('public_image',exposed.status===200);check('no_store',exposed.headers.get('cache-control')==='private, no-store');
  const profile=await b.c.rpc('get_public_profile',{p_handle:'recette.alpha'});check('B_public_profile',!profile.error&&profile.data.journal.some((j:any)=>j.id===id));
  check('privatize',!(await a.c.from('journal_entries').update({visibility:'private',public_media_path:null}).eq('id',id)).error);
  check('revocation_before_cleanup',(await fetch(`${url}/functions/v1/media-read?kind=journal&id=${id}`)).status===404);
  check('direct_public_url_denied',(await fetch(`${url}/storage/v1/object/public/nailmoods-public/${pub}`)).status!==200);
  check('A_original_retained',!(await a.c.storage.from('nailmoods-private').download(path)).error);
  const hidden=await b.c.rpc('get_public_profile',{p_handle:'recette.alpha'});check('B_public_profile_removed',!hidden.error&&!hidden.data.journal.some((j:any)=>j.id===id));
  const jobs=await admin.from('media_cleanup_jobs').select('id').eq('object_path',pub);check('cleanup_job_persisted',!jobs.error&&jobs.data.length>0);
  for(const tier of ['free','plus','pro','free','plus'])check('transition_'+tier,!(await a.c.rpc('apply_beta_tier',{p_tier:tier})).error);
  check('downgrade_journal_preserved',!(await a.c.from('journal_entries').select('id').eq('id',id).single()).error);
  await second.auth.signOut();check('relogin',!(await second.auth.signInWithPassword(a.credentials)).error);
  check('relogin_photo',!(await second.storage.from('nailmoods-private').download(path)).error);
  for(const query of ['@recette.alpha','recette.alpha','recette.al','RECETTE.ALPHA','Recette Alpha']){
   const search=await b.c.rpc('search_nailmoods',{p_query:query});check('search_'+query,!search.error&&search.data.some((p:any)=>p.handle==='recette.alpha'));
  }
  check('hide_identity',!(await a.c.rpc('set_nailmoods_identity',{p_handle:'recette.alpha',p_visibility:'nobody',p_display_name:'Recette Alpha'})).error);
  const invisible=await b.c.rpc('search_nailmoods',{p_query:'recette.alpha'});check('search_hidden',!invisible.error&&!invisible.data.some((p:any)=>p.handle==='recette.alpha'));
  await a.c.rpc('set_nailmoods_identity',{p_handle:'recette.alpha',p_visibility:'everyone',p_display_name:'Recette Alpha'});
  const avatar=`${a.id}/${a.w}/avatar/${crypto.randomUUID()}.png`;
  check('avatar_upload',!(await a.c.storage.from('nailmoods-private').upload(avatar,image)).error);
  check('avatar_attach',!(await a.c.from('profiles').update({avatar_url:avatar}).eq('id',a.id)).error);
  const avatarSearch=await b.c.rpc('search_nailmoods',{p_query:'@recette.alpha'});check('search_returns_public_avatar_reference',!avatarSearch.error&&avatarSearch.data.some((row:any)=>row.handle==='recette.alpha'&&row.avatar_url===avatar),avatarSearch.error?.message);
  check('avatar_second_session',!(await second.storage.from('nailmoods-private').download(avatar)).error);
  check('avatar_public',(await fetch(`${url}/functions/v1/media-read?kind=avatar&id=recette.alpha`)).status===200);
  check('avatar_private_original_denied',Boolean((await b.c.storage.from('nailmoods-private').download(avatar)).error));
  check('avatar_remove',!(await a.c.from('profiles').update({avatar_url:null}).eq('id',a.id)).error);
  check('avatar_revoked',(await fetch(`${url}/functions/v1/media-read?kind=avatar&id=recette.alpha`)).status===404);
  await a.c.storage.from('nailmoods-private').remove([avatar]);
  const proSpace=await b.c.from('workspaces').select('id').eq('kind','pro').single();
  check('B_pro_workspace',!proSpace.error);
  const existingPro=await b.c.from('pro_profiles').select('id').eq('workspace_id',proSpace.data.id).maybeSingle();
  const proValues={display_name:'Studio Recette B',bio:'Compte jetable',is_public:false};
  const proRow=existingPro.data ? await b.c.from('pro_profiles').update(proValues).eq('id',existingPro.data.id) : await b.c.from('pro_profiles').insert({workspace_id:proSpace.data.id,user_id:b.id,...proValues});
  check('B_pro_profile_write',!proRow.error,proRow.error?.message);
  check('B_cannot_self_verify',Boolean((await b.c.from('pro_profiles').update({is_verified:true}).eq('workspace_id',proSpace.data.id)).error));
  const oldInstitutes=await b.c.from('workspaces').select('id,name').eq('kind','institute').eq('owner_user_id',b.id);
  check('institute_preflight',!oldInstitutes.error,oldInstitutes.error?.message);
  for(const old of oldInstitutes.data||[])await b.c.rpc('close_institute',{p_workspace_id:old.id,p_confirmation:old.name});
  check('B_owner_status',!(await b.c.rpc('set_professional_status',{p_status:'institute_owner'})).error);
  instituteName='Institut Recette '+crypto.randomUUID().slice(0,8);
  const created=await b.c.rpc('create_professional_workspace',{p_kind:'institute',p_name:instituteName});
  check('B_create_institute',!created.error&&created.data.created===true,created.error?.message);instituteId=created.data.id;
  const publishedInstitute=await b.c.rpc('update_professional_workspace',{p_workspace_id:instituteId,p_name:instituteName,p_handle:'recette.institut.b',p_bio:'Institut jetable de recette',p_city:'Chartres',p_is_public:true});
  check('B_publishes_institute_profile',!publishedInstitute.error,publishedInstitute.error?.message);
  const ownerSearch=await a.c.rpc('search_nailmoods',{p_query:'@recette.pro',p_kind:'institute_owner'});
  check('A_sees_owner_profile_type',!ownerSearch.error&&ownerSearch.data.some((row:any)=>row.handle==='recette.pro'&&row.kind==='institute_owner'),ownerSearch.error?.message);
  const instituteSearch=await a.c.rpc('search_nailmoods',{p_query:'@recette.institut.b',p_kind:'institute'});
  check('A_sees_public_institute',!instituteSearch.error&&instituteSearch.data.some((row:any)=>row.handle==='recette.institut.b'&&row.kind==='institute'),instituteSearch.error?.message);
  check('A_promoted_for_associate_test',!(await a.c.rpc('apply_beta_tier',{p_tier:'pro'})).error);
  check('A_associate_status',!(await a.c.rpc('set_professional_status',{p_status:'institute_associate'})).error);
  const invite=await b.c.rpc('institute_action',{p_action:'invite',p_workspace_id:instituteId,p_handle:'recette.alpha'});check('B_invite_A',!invite.error,invite.error?.message);
  const inbox=await a.c.rpc('institute_inbox');const invitation=inbox.data?.find((row:any)=>row.workspace_id===instituteId);check('A_receives_invitation',!inbox.error&&Boolean(invitation),inbox.error?.message);
  check('A_accepts_invitation',!(await a.c.rpc('institute_action',{p_action:'accept',p_workspace_id:instituteId,p_invitation_id:invitation.id})).error);
  const ownerState=await b.c.rpc('institute_state',{p_workspace_id:instituteId});check('B_sees_A_member',!ownerState.error&&ownerState.data.members.some((row:any)=>row.user_id===a.id&&row.role==='member'),ownerState.error?.message);
  check('B_assigns_creator_role',!(await b.c.rpc('set_institute_member_role',{p_workspace_id:instituteId,p_target_user_id:a.id,p_role:'creator'})).error);
  const associateState=await a.c.rpc('institute_state',{p_workspace_id:instituteId});check('A_sees_creator_role',!associateState.error&&associateState.data.members.some((row:any)=>row.user_id===a.id&&row.role==='creator'),associateState.error?.message);
  check('A_cannot_assign_roles',Boolean((await a.c.rpc('set_institute_member_role',{p_workspace_id:instituteId,p_target_user_id:b.id,p_role:'member'})).error));
  check('A_leaves_institute',!(await a.c.rpc('institute_action',{p_action:'leave',p_workspace_id:instituteId})).error);
  check('A_reset_professional_status',!(await a.c.rpc('set_professional_status',{p_status:'independent'})).error);
  check('A_restored_plus',!(await a.c.rpc('apply_beta_tier',{p_tier:'plus'})).error);
  const afterLeave=await b.c.rpc('institute_state',{p_workspace_id:instituteId});check('A_removed_after_leave',!afterLeave.error&&!afterLeave.data.members.some((row:any)=>row.user_id===a.id));
  check('B_closes_institute',!(await b.c.rpc('close_institute',{p_workspace_id:instituteId,p_confirmation:instituteName})).error);
  const closed=await b.c.from('workspaces').select('id').eq('id',instituteId);check('closed_institute_removed',!closed.error&&closed.data.length===0);instituteId=undefined;
  check('B_returns_independent',!(await b.c.rpc('set_professional_status',{p_status:'independent'})).error);
 }catch(e){results.push({name:'stopped',status:'FAIL',detail:String(e.message).slice(0,200)});}
 finally{
  if(b&&instituteId&&instituteName)await b.c.rpc('close_institute',{p_workspace_id:instituteId,p_confirmation:instituteName});
  if(a&&id){await a.c.rpc('apply_beta_tier',{p_tier:'plus'});await a.c.from('journal_entries').delete().eq('id',id);if(path)await a.c.storage.from('nailmoods-private').remove([path]);}
  for(const s of sessions)await s.auth.signOut();
 }
 await admin.from('recette_test_runs').insert({results});
 return Response.json({results});
});
