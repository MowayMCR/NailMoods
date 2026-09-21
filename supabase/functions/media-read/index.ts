import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' } });

function serviceClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function requester(req: Request) {
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const auth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await auth.auth.getUser(token);
  return data.user ?? null;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (!['GET', 'HEAD'].includes(req.method)) return json({ error: 'method_not_allowed' }, 405);
  const url = new URL(req.url);
  const kind = url.searchParams.get('kind');
  const id = url.searchParams.get('id');
  if (!id || !['journal', 'inspiration', 'avatar'].includes(kind || '')) return json({ error: 'invalid_media_reference' }, 400);

  const admin = serviceClient();
  if (kind === 'avatar') {
    const handle = id.toLowerCase().replace(/^@/, '');
    const { data: profile } = await admin.from('profiles').select('id,avatar_url,username,discovery_visibility').eq('username', handle).maybeSingle();
    let path: string | null = null;
    if (profile?.avatar_url && profile.discovery_visibility === 'everyone' && profile.avatar_url.split('/')[0] === profile.id) path = profile.avatar_url;
    if (!path) {
      const { data: workspace } = await admin.from('workspaces').select('id,owner_user_id,public_handle').eq('public_handle', handle).maybeSingle();
      if (workspace) {
        const [{ data: professional }, { data: owner }] = await Promise.all([
          admin.from('pro_profiles').select('user_id,avatar_url,is_public').eq('workspace_id', workspace.id).maybeSingle(),
          admin.from('profiles').select('account_tier').eq('id', workspace.owner_user_id).maybeSingle(),
        ]);
        const candidate = professional?.avatar_url;
        if (professional?.is_public && owner?.account_tier === 'pro' && candidate
          && candidate.split('/')[0] === professional.user_id && candidate.split('/')[1] === workspace.id) path = candidate;
      }
    }
    if (!path) return json({ error: 'not_found' }, 404);
    const { data: file, error: avatarError } = await admin.storage.from('nailmoods-private').download(path);
    if (avatarError || !file) return json({ error: 'not_found' }, 404);
    return new Response(req.method === 'HEAD' ? null : file, { status: 200, headers: { ...cors, 'Content-Type': file.type || 'application/octet-stream', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  }
  const table = kind === 'journal' ? 'journal_entries' : 'inspirations';
  const columns = kind === 'journal' ? 'id,created_by,workspace_id,visibility,media_path,public_media_path' : 'id,created_by,workspace_id,is_public,media_path,public_media_path';
  const { data: row, error } = await admin.from(table).select(columns).eq('id', id).maybeSingle();
  if (error || !row) return json({ error: 'not_found' }, 404);
  const isPublic = kind === 'journal' ? row.visibility === 'public' : row.is_public === true;
  const user = await requester(req);
  if (!user) return json({ error: 'authentication_required' }, 401);
  const token=req.headers.get('Authorization')!;
  const viewer=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:token}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data: allowed,error: accessError}=await viewer.rpc('nm_media_access',{p_kind:kind,p_id:id});
  if(accessError||allowed!==true)return json({error:'content_unavailable'},403);
  const path = isPublic ? row.public_media_path : row.media_path;
  if (!path || typeof path !== 'string') return json({ error: 'media_unavailable' }, 404);
  if(path.split('/')[0]!==row.created_by || path.split('/')[1]!==row.workspace_id)return json({error:'not_found'},404);
  const bucket = isPublic ? 'nailmoods-public' : 'nailmoods-private';
  const { data: file, error: downloadError } = await admin.storage.from(bucket).download(path);
  if (downloadError || !file) return json({ error: 'media_unavailable' }, 404);
  return new Response(req.method === 'HEAD' ? null : file, { status: 200, headers: { ...cors, 'Content-Type': file.type || 'application/octet-stream', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
});
