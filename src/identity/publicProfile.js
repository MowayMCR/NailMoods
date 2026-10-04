// Missing additive RPC falls back to the established projection; denied access never does.
export async function readPublicProfile(client,handle){let result=await client.rpc('nm_public_profile_v2',{p_handle:handle});if(result.error?.code==='PGRST202')result=await client.rpc('get_public_profile',{p_handle:handle});return result;}
