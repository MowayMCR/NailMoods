import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'authentication_required' }, 401);
  const token = authHeader.slice(7);
  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data: auth, error: authError } = await userClient.auth.getUser(token);
  if (authError || !auth.user) return json({ error: 'authentication_required' }, 401);
  let confirmation = '';
  try { confirmation = String((await req.json())?.confirmation || ''); } catch { return json({ error: 'invalid_request' }, 400); }
  const { data: accountId, error: checkError } = await userClient.rpc('nm_account_deletion_check', { p_confirmation: confirmation });
  if (checkError || accountId !== auth.user.id) return json({ error: checkError?.message || 'authentication_required' }, 400);
  const groups = new Map<string, string[]>();
  const { data: list, error: listError } = await userClient.rpc('nm_account_deletion_objects', { p_confirmation: confirmation });
  if (listError) return json({ error: 'storage_cleanup_retry_available' }, 503);
  for (const item of list || []) {
    if (!groups.has(item.bucket)) groups.set(item.bucket, []);
    groups.get(item.bucket)!.push(item.object_path);
  }
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  for (const [bucket, paths] of groups) {
    for (let at = 0; at < paths.length; at += 100) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(at, at + 100));
      if (error) return json({ error: 'storage_cleanup_retry_available' }, 503);
    }
  }
  const { error: finalError } = await userClient.rpc('nm_account_deletion_finalize', { p_confirmation: confirmation });
  if (finalError) return json({ error: 'storage_cleanup_retry_available' }, 503);
  return json({ deleted: true });
});