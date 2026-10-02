import { AppStoreServerAPIClient, Environment, SignedDataVerifier } from 'npm:@apple/app-store-server-library@3.1.0';
import { Buffer } from 'node:buffer';
import { appleRecord } from './appleCore.mjs';

export function appleServer(environment: string) {
  if (!['Sandbox','Production'].includes(environment)) throw Error('invalid_environment');
  const allowed = (Deno.env.get('APPLE_ENVIRONMENTS') || 'Sandbox').split(',');
  if (!allowed.includes(environment)) throw Error('environment_not_enabled');
  const bundleId = Deno.env.get('APPLE_BUNDLE_ID');
  const privateKey = Deno.env.get('APPLE_PRIVATE_KEY_P8');
  const keyId = Deno.env.get('APPLE_KEY_ID'), issuerId = Deno.env.get('APPLE_ISSUER_ID');
  const appId = Number(Deno.env.get('APPLE_APP_ID'));
  const rootValues = JSON.parse(Deno.env.get('APPLE_ROOT_CERTIFICATES_BASE64_JSON') || '[]');
  if (!bundleId || !privateKey || !keyId || !issuerId || !rootValues.length || (environment==='Production' && !appId)) throw Error('billing_not_configured');
  const env = environment==='Sandbox' ? Environment.SANDBOX : Environment.PRODUCTION;
  // Trusted roots are installed from Apple PKI out of band, never taken from incoming x5c.
  // Online certificate revocation checks are enabled. Fail closed on verification errors.
  const verifier = new SignedDataVerifier(rootValues.map((v:string)=>Buffer.from(v,'base64')), true, env, bundleId, appId || undefined);
  const api = new AppStoreServerAPIClient(privateKey.replace(/\\n/g,'\n'), keyId, issuerId, bundleId, env);
  return { api, verifier, bundleId, environment };
}
export async function currentAppleRecords(server: ReturnType<typeof appleServer>, transactionId: string, token: string) {
  if (!/^\d{1,64}$/.test(transactionId)) throw Error('invalid_transaction');
  const info = await server.api.getTransactionInfo(transactionId);
  const initial = await server.verifier.verifyAndDecodeTransaction(info.signedTransactionInfo!);
  if (initial.appAccountToken?.toLowerCase() !== token.toLowerCase()) throw Error('purchase_account_mismatch');
  const states = await server.api.getAllSubscriptionStatuses(initial.originalTransactionId!);
  const records = [];
  for (const group of states.data || []) for (const state of group.lastTransactions || []) {
    const tx = await server.verifier.verifyAndDecodeTransaction(state.signedTransactionInfo!);
    if (tx.originalTransactionId !== initial.originalTransactionId) continue;
    const renewal = state.signedRenewalInfo ? await server.verifier.verifyAndDecodeRenewalInfo(state.signedRenewalInfo) : undefined;
    records.push(appleRecord(tx, renewal, state.status, {bundleId:server.bundleId, environment:server.environment, accountToken:token}));
  }
  if (!records.length) throw Error('subscription_not_found');
  // Store the newest Apple view, preventing late notifications from undoing an upgrade/refund.
  return records.sort((a,b)=>Date.parse(b.signedAt)-Date.parse(a.signedAt)).slice(0,1);
}
