import {requireActiveSession} from '../_shared/sessionGuard.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import { SignJWT, importPKCS8 } from 'npm:jose@5.10.0';
import { verifyAndPersist } from '../_shared/googlePlayCore.mjs';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const options = { auth: { persistSession: false, autoRefreshToken: false } };
let cachedToken: { value: string; until: number } | null = null;
async function googleAccessToken() {
  if (cachedToken && cachedToken.until > Date.now()) return cachedToken.value;
  const raw = Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON');
  if (!raw) throw new Error('billing_not_configured');
  const account = JSON.parse(raw);
  const key = await importPKCS8(account.private_key.replace(/\\n/g, '\n'), 'RS256');
  const assertion = await new SignJWT({ scope: 'https://www.googleapis.com/auth/androidpublisher' })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' }).setIssuer(account.client_email)
    .setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('1h').sign(key);
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', signal: AbortSignal.timeout(15000),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  if (!response.ok) throw new Error('google_oauth_unavailable');
  const payload = await response.json();
  if (!payload.access_token) throw new Error('google_oauth_unavailable');
  cachedToken = { value: payload.access_token, until: Date.now() + Math.min(Number(payload.expires_in) || 3600, 3600) * 1000 - 60000 };
  return cachedToken.value;
}
Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (Number(request.headers.get('content-length')) > 12000) return json({ error: 'request_too_large' }, 413);
  const url = Deno.env.get('SUPABASE_URL'), key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return json({ error: 'server_not_configured' }, 503);
  const admin = createClient(url, key, options);
  const rpc = async (name: string, args: Record<string, unknown> = {}) => {
    const { data, error } = await admin.rpc(name, args);
    if (error) throw new Error(error.message);
    return data;
  };
  let body;
  try { const raw = await request.text(); if (raw.length > 12000) return json({ error: 'request_too_large' }, 413); body = JSON.parse(raw); }
  catch { return json({ error: 'invalid_json' }, 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json({ error: 'invalid_request' }, 400);
  try {
    const schedulerKey = request.headers.get('x-nm-reconcile-key');
    let userId: string | null = null, context;
    if (schedulerKey) {
      // Custom scheduler authentication; this service-only RPC checks a random
      // database-owned secret. Client requests always require a verified Auth JWT.
      context = await rpc('google_play_scheduler_context', { p_secret: schedulerKey });
    } else {
      const bearer = request.headers.get('Authorization') || '';
      if (!bearer.startsWith('Bearer ')) return json({ error: 'authentication_required' }, 401);
      const { data: { user }, error } = await admin.auth.getUser(bearer.slice(7));
      if (error || !user || !user.email_confirmed_at) return json({ error: 'authentication_required' }, 401);
      await requireActiveSession(bearer);
      userId = user.id;
      context = await rpc('google_play_server_context', { p_user_id: userId, p_prepare: body.action === 'prepare' });
    }
    if (body.action === 'prepare' && !schedulerKey) {
      const configured = Boolean(Deno.env.get('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON')) &&
        Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME') === context.packageName;
      return json({ ...context, enabled: context.enabled && configured });
    }
    if (!context.enabled) return json({ error: 'billing_not_configured' }, 503);
    const configuredPackage = Deno.env.get('GOOGLE_PLAY_PACKAGE_NAME');
    if (!configuredPackage || configuredPackage !== context.packageName) return json({ error: 'billing_package_mismatch' }, 503);
    const accessToken = await googleAccessToken();
    const fetchGoogle = (target: string, init: RequestInit = {}) => fetch(target, { ...init, signal: AbortSignal.timeout(15000),
      headers: { ...init.headers, Authorization: `Bearer ${accessToken}` } });
    const verify = async (owner: string, purchaseToken: string, accountId: string, expectedProduct?: string) => verifyAndPersist({
      packageName: configuredPackage, purchaseToken, accountId, allowedPlans: context.allowedPlans, expectedProduct, fetchGoogle,
      persist: (record: unknown) => rpc('upsert_google_play_subscription', { p_user_id: owner, p_record: record }),
    });
    if (!schedulerKey && body.action !== 'refresh') return json(await verify(userId!, body.purchaseToken, context.accountId, body.productId));
    const tokens = schedulerKey ? context.tokens : await rpc('google_play_tokens_for_user', { p_user_id: userId });
    let checked = 0, failed = 0;
    for (const token of tokens) {
      try { await verify(token.userId, token.purchaseToken, token.accountId); checked++; }
      catch { failed++; } // Never log tokens, credentials, user IDs or Google payloads.
    }
    await rpc('google_play_refresh_profiles', { p_user_id: userId });
    return json({ ok: true, checked, failed });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const safe = ['purchase_account_mismatch', 'purchase_product_mismatch', 'unrecognized_product_or_plan', 'invalid_token',
      'billing_not_configured', 'billing_disabled', 'billing_ineligible', 'purchase_token_owned_by_another_account',
      'SESSION_REPLACED', 'authentication_required', 'rate_limit', 'invalid_scheduler_key', 'existing_subscription', 'manual_entitlement_active'];
    const code = safe.find(value => message.includes(value)) || 'verification_unavailable';
    return json({ error: code }, ['authentication_required', 'invalid_scheduler_key','SESSION_REPLACED'].includes(code) ? 401 : code === 'verification_unavailable' || code === 'billing_not_configured' ? 503 : 400);
  }
});
