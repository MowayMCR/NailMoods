import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
Deno.serve(async req=>{
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,x-client-info','Cache-Control':'no-store'};
 if(req.method==='OPTIONS')return new Response('ok',{headers});
 if(req.method!=='GET')return new Response('Method not allowed',{status:405,headers});
 try {
  const auth=req.headers.get('Authorization')||'',url=Deno.env.get('SUPABASE_URL')!;
  const viewer=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:auth}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error}=await viewer.auth.getUser();if(error||!user)return new Response('Unauthorized',{status:401,headers});
  const query=new URL(req.url).searchParams;
  const {data,error:denied}=await viewer.rpc('nm_publication_review',{p_action:'preview',p_kind:query.get('kind'),p_id:query.get('id')});
  if(denied||!data?.path)return new Response('Unavailable',{status:403,headers});
  const admin=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:file,error:missing}=await admin.storage.from(data.bucket).download(data.path);
  if(missing||!file)return new Response('Unavailable',{status:404,headers});
  return new Response(file,{headers:{...headers,'Content-Type':file.type,'X-Content-Type-Options':'nosniff'}});
 }catch{return new Response('Unavailable',{status:503,headers});}
});
