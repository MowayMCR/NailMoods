// Operator-only CLI. No schedule. Default is read-only, even with credentials.
// Secrets must come from an external environment, never from source or arguments.
import {createClient} from '@supabase/supabase-js';
import {pathToFileURL} from 'node:url';
export async function retentionRun(client, {apply=false, expectedProject='', project=''}={}) {
  const call=async(action, args={})=>{const {data,error}=await client.rpc('nm_support_retention',{p_action:action,...args});if(error)throw new Error('retention_rpc_failed');return data;};
  const plan=await call('dry_run');
  if(!apply)return plan;
  if(!expectedProject||expectedProject!==project||!plan.enabled||!plan.approved_at)throw new Error('approval_and_exact_project_required');
  const stats={completed:0,failed:0,skipped:0};
  const pending=await call('pending');
  const candidates=await call('candidates');
  const ids=new Set(pending.map(x=>x.id));
  for(const c of candidates){const j=await call('claim',{p_kind:c.kind,p_item:c.item_id});if(j.id)ids.add(j.id);else stats.skipped++;}
  for(const id of ids){
    let stage='network_unconfirmed';
    try{
      const object=await call('object',{p_job:id});
      if(object.state==='done'){stats.skipped++;continue;}
      if(object.path&&!object.already_absent){
        if(object.bucket!=='nailmoods-private')throw new Error('unexpected_bucket');
        stage='storage_remove_failed';
        const {error}=await client.storage.from(object.bucket).remove([object.path]);
        if(error)throw new Error('storage_remove_failed');
      }
      stage='finalize_failed';await call('finish',{p_job:id});stats.completed++;
    }catch{
      stats.failed++;
      // Never log paths, user IDs, provider errors, request bodies or credentials.
      try{await call('error',{p_job:id,p_error:stage});}catch{/* claim stays protected for operator recovery */}
    }
  }
  return stats;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const url=process.env.NM_RETENTION_SUPABASE_URL;
  const key=process.env.NM_RETENTION_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error('external_credentials_required');
  const project=new URL(url).hostname.split('.')[0];
  const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
  const result=await retentionRun(client,{apply:process.argv.includes('--apply-approved'),expectedProject:process.env.NM_RETENTION_APPROVED_PROJECT,project});
  console.log(JSON.stringify(result));
 }catch{console.error('Retention stopped. Check approval, environment and private job status. No private details logged.');process.exitCode=1;}
}
