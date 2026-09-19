import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';

const headers = { 'Content-Type': 'application/json' };
Deno.serve(async req => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers });
  const expected = Deno.env.get('MEDIA_CLEANUP_SECRET');
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const supplied=req.headers.get('x-cleanup-secret');
  const valid=expected ? supplied===expected : supplied && (await admin.rpc('check_worker_secret',{p_name:'MEDIA_CLEANUP_SECRET',p_value:supplied})).data===true;
  if(!valid)return new Response(JSON.stringify({error:'forbidden'}),{status:403,headers});
  const { data: jobs, error } = await admin.rpc('claim_media_cleanup');
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
  const results = [];
  for (const job of jobs || []) {
    const used=await admin.rpc('media_cleanup_in_use',{p_bucket:job.bucket,p_path:job.object_path});
    const removed = used.error || used.data===true ? {error:{message:used.error?'reference_check_failed':'object_still_referenced'}} : await admin.storage.from(job.bucket).remove([job.object_path]);
    if (!removed.error) {
      await admin.from('media_cleanup_jobs').update({ status: 'done', updated_at: new Date().toISOString(), last_error: null }).eq('id', job.id);
      results.push({ id: job.id, status: 'done' });
    } else {
      const attempts = job.attempts;
      const exhausted = attempts >= 5;
      await admin.from('media_cleanup_jobs').update({ status: exhausted ? 'failed' : 'pending', next_attempt_at: new Date(Date.now() + Math.min(2 ** attempts * 60_000, 86_400_000)).toISOString(), last_error: removed.error.message, updated_at: new Date().toISOString() }).eq('id', job.id);
      results.push({ id: job.id, status: exhausted ? 'failed' : 'pending' });
    }
  }
  return new Response(JSON.stringify({ processed: results.length, results }), { headers });
});
