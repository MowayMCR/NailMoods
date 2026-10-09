import {createClient} from 'npm:@supabase/supabase-js@2.116.0';
// JWT validation alone does not prove that this is still the active session.
// Run as the caller, never as service_role. Fail closed on missing RPC/network.
export async function requireActiveSession(authorization:string|null){
 if(!authorization?.startsWith('Bearer '))throw Error('authentication_required');
 const viewer=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:authorization}}});
 const {data,error}=await viewer.rpc('nm_session_check');
 if(error||!data?.active)throw Error(error?.message?.includes('SESSION_REPLACED')?'SESSION_REPLACED':'session_check_unavailable');
}

export function sessionGuardResponse(error:unknown,headers:Record<string,string>){
 const code=error instanceof Error?error.message:'';
 if(!['SESSION_REPLACED','session_check_unavailable','authentication_required'].includes(code))return null;
 return Response.json({error:code},{status:code==='session_check_unavailable'?503:401,headers:{...headers,'Cache-Control':'private, no-store'}});
}
